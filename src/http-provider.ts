/**
 * SSP 1.0 HTTP Reference Provider & Optional Pass-Through Registry Mirror
 *
 * Pure node:http implementation serving:
 * - GET /.well-known/fayid
 * - GET /.well-known/skill-sharing
 * - GET /skills/:id
 * - POST /skills/:id/invoke
 * - GET /invocations/:id
 *
 * Enforces mandatory endpoint-level authentication & authorization (401/403 structured SSP errors)
 * on BOTH descriptor fetch and invocation/polling endpoints for `private` and `restricted` skills
 * (never relying on index-hiding alone).
 */

import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { randomUUID, type KeyObject } from "node:crypto";
import type { AddressInfo } from "node:net";
import {
  SSP_PROTOCOL_VERSION,
  SSP_SUPPORTED_VERSIONS_HEADER,
  formatProtocolToken,
  selectCompatibleVersion,
} from "./version.js";
import { filterByCapabilityType } from "./discovery.js";
import {
  validateInvocationRequest,
  createValidationError,
  createAuthRequiredError,
  createPermissionDeniedError,
  createSkillNotFoundError,
  createInvocationTimeoutError,
  createVersionIncompatibleError,
  type ErrorResponse,
} from "./invocation.js";
import {
  exportFayIdVerificationKey,
  signSkillResource,
} from "./crypto.js";
import type {
  AccessPolicy,
  AuthConfig,
  CapabilityType,
  ExecutionMode,
  FayIdWellKnownDocument,
  InvocationRequest,
  InvocationResponse,
  OutputDefinition,
  ParameterDefinition,
  SkillDescriptor,
  SkillIndex,
  SkillIndexEntry,
} from "../schema/draft/schema.js";

export interface AuthenticatedPrincipal {
  callerFayId: string;
  scopes: string[];
}

export interface RegisteredSkillConfig {
  id: string;
  name: string;
  version: string;
  capability_type: CapabilityType;
  execution_mode?: ExecutionMode;
  description: string;
  inputs: ParameterDefinition[];
  output: OutputDefinition;
  auth: AuthConfig;
  access: AccessPolicy;
  tags?: string[];
  documentation_url?: string;
  timeoutMs?: number;
  requiredScopes?: string[];
  /** Optional number of status polls returning "running" before returning terminal status (e.g. async task simulation) */
  pollsBeforeCompletion?: number;
  handler: (
    request: InvocationRequest,
    context: { executionId: string; callerFayId: string }
  ) => Promise<unknown> | unknown;
}

export interface SspHttpProviderOptions {
  protocolVersion?: string;
  host?: string;
  port?: number;
  proofTtlMs?: number;
  provider: {
    name: string;
    fay_id: string;
    contact?: string;
  };
  signingKey: {
    kid: string;
    privateKey: KeyObject;
    publicKey: KeyObject;
    revoked?: boolean;
  };
  tokens?: Record<string, AuthenticatedPrincipal>;
  apiKeys?: Record<string, AuthenticatedPrincipal>;
  skills: RegisteredSkillConfig[];
}

interface ExecutionRecord {
  executionId: string;
  skillId: string;
  callerFayId: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  status: "accepted" | "running" | "completed" | "failed" | "timeout";
  output?: unknown;
  error?: InvocationResponse["error"];
  pollsRemaining: number;
  resolvedOutput?: unknown;
  resolvedError?: InvocationResponse["error"];
  settled: boolean;
}

function sendJson(
  res: ServerResponse,
  statusCode: number,
  body: unknown,
  protocolVersion: string
): void {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "ssp-version": formatProtocolToken(protocolVersion),
    "content-length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString("utf-8");
  if (!raw.trim()) {
    return undefined;
  }
  return JSON.parse(raw);
}

const VALID_CAPABILITY_TYPES = new Set<CapabilityType>([
  "plugin",
  "api",
  "knowledge",
  "task",
]);

export class SspHttpProvider {
  private readonly options: SspHttpProviderOptions;
  private readonly protocolVersion: string;
  private readonly skills = new Map<string, RegisteredSkillConfig>();
  private readonly executions = new Map<string, ExecutionRecord>();
  private server: Server | null = null;
  private boundOrigin = "";

  constructor(options: SspHttpProviderOptions) {
    this.options = options;
    this.protocolVersion = options.protocolVersion ?? SSP_PROTOCOL_VERSION;
    for (const skill of options.skills) {
      if (this.skills.has(skill.id)) {
        throw new Error(`Duplicate skill id registered on provider: "${skill.id}"`);
      }
      this.skills.set(skill.id, skill);
    }
  }

  get origin(): string {
    if (!this.boundOrigin) {
      throw new Error("SspHttpProvider has not been started yet");
    }
    return this.boundOrigin;
  }

  async start(): Promise<string> {
    if (this.server) {
      return this.boundOrigin;
    }
    const host = this.options.host ?? "127.0.0.1";
    const port = this.options.port ?? 0;

    this.server = createServer((req, res) => {
      void this.handleRequest(req, res);
    });

    await new Promise<void>((resolvePromise, rejectPromise) => {
      this.server!.once("error", rejectPromise);
      this.server!.listen(port, host, () => {
        this.server!.off("error", rejectPromise);
        resolvePromise();
      });
    });

    const address = this.server.address() as AddressInfo;
    this.boundOrigin = `http://${host}:${address.port}`;
    return this.boundOrigin;
  }

  async stop(): Promise<void> {
    if (!this.server) {
      return;
    }
    const srv = this.server;
    this.server = null;
    await new Promise<void>((resolvePromise, rejectPromise) => {
      srv.close((err) => (err ? rejectPromise(err) : resolvePromise()));
    });
  }

  private buildAuthDetails(auth: AuthConfig): Record<string, unknown> {
    return {
      required_auth_type: auth.type,
      ...(auth.header ? { header: auth.header } : {}),
      ...(auth.oauth2
        ? {
            authorization_url: auth.oauth2.authorization_url,
            token_url: auth.oauth2.token_url,
            scopes: Object.keys(auth.oauth2.scopes),
          }
        : {}),
      ...(auth.custom ? { instructions: auth.custom.instructions } : {}),
    };
  }

  private extractPrincipal(
    req: IncomingMessage,
    expectedAuth?: AuthConfig
  ): {
    presented: boolean;
    valid: boolean;
    principal?: AuthenticatedPrincipal;
  } {
    const authHeader = req.headers.authorization;
    if (typeof authHeader === "string" && authHeader.trim().length > 0) {
      const match = authHeader.match(/^Bearer\s+(.+)$/i);
      if (!match) {
        return { presented: true, valid: false };
      }
      const token = match[1].trim();
      const principal = this.options.tokens?.[token];
      if (!principal) {
        return { presented: true, valid: false };
      }
      return { presented: true, valid: true, principal };
    }

    const customHeaderName = (expectedAuth?.header ?? "x-api-key").toLowerCase();
    const apiKeyVal = req.headers[customHeaderName];
    if (typeof apiKeyVal === "string" && apiKeyVal.trim().length > 0) {
      const principal = this.options.apiKeys?.[apiKeyVal.trim()];
      if (!principal) {
        return { presented: true, valid: false };
      }
      return { presented: true, valid: true, principal };
    }

    return { presented: false, valid: false };
  }

  private authorizeForSkill(
    req: IncomingMessage,
    skill: RegisteredSkillConfig
  ):
    | { ok: true; principal?: AuthenticatedPrincipal }
    | { ok: false; status: number; error: ErrorResponse } {
    const requiresAuth =
      skill.access === "private" ||
      skill.access === "restricted" ||
      skill.auth.type !== "none";

    const authState = this.extractPrincipal(req, skill.auth);
    if (!requiresAuth) {
      if (authState.presented && !authState.valid) {
        return {
          ok: false,
          status: 401,
          error: createAuthRequiredError(
            "Invalid authentication credentials supplied",
            this.buildAuthDetails(skill.auth)
          ),
        };
      }
      return { ok: true, principal: authState.principal };
    }

    if (!authState.presented || !authState.valid || !authState.principal) {
      return {
        ok: false,
        status: 401,
        error: createAuthRequiredError(
          `Authentication is required to access ${skill.access} skill "${skill.id}"`,
          this.buildAuthDetails(skill.auth)
        ),
      };
    }

    const neededScopes = skill.requiredScopes ?? [];
    const missingScopes = neededScopes.filter(
      (s) => !authState.principal!.scopes.includes(s)
    );
    if (missingScopes.length > 0) {
      return {
        ok: false,
        status: 403,
        error: createPermissionDeniedError(
          `Caller "${authState.principal.callerFayId}" lacks required permissions for skill "${skill.id}"`,
          {
            required_scopes: neededScopes,
            missing_scopes: missingScopes,
            caller_fay_id: authState.principal.callerFayId,
          }
        ),
      };
    }

    return { ok: true, principal: authState.principal };
  }

  private checkSupportedVersionsHeader(req: IncomingMessage): ErrorResponse | null {
    const headerVal = req.headers[SSP_SUPPORTED_VERSIONS_HEADER];
    if (headerVal === undefined) {
      return null;
    }
    const normalized = Array.isArray(headerVal) ? headerVal.join(",") : headerVal;
    try {
      const selected = selectCompatibleVersion(this.protocolVersion, normalized);
      if (!selected) {
        return createVersionIncompatibleError(
          `No compatible MAJOR version between provider (${this.protocolVersion}) and client (${normalized})`,
          {
            provider_version: this.protocolVersion,
            client_supported_versions: normalized,
          }
        );
      }
      return null;
    } catch (err) {
      return createVersionIncompatibleError(
        err instanceof Error ? err.message : "Invalid SSP-Supported-Versions header",
        {
          provider_version: this.protocolVersion,
          client_supported_versions: normalized,
        }
      );
    }
  }

  public buildSignedDescriptor(skill: RegisteredSkillConfig): SkillDescriptor {
    const encodedId = encodeURIComponent(skill.id);
    const unsigned: SkillDescriptor = {
      protocol: { version: this.protocolVersion },
      id: skill.id,
      name: skill.name,
      version: skill.version,
      capability_type: skill.capability_type,
      description: skill.description,
      provider: {
        name: this.options.provider.name,
        fay_id: this.options.provider.fay_id,
        url: this.boundOrigin,
        ...(this.options.provider.contact
          ? { contact: this.options.provider.contact }
          : {}),
      },
      endpoint: {
        url: `${this.boundOrigin}/skills/${encodedId}/invoke`,
        method: "POST",
        content_type: "application/json",
        status_url: `${this.boundOrigin}/invocations/{execution_id}`,
        result_url: `${this.boundOrigin}/invocations/{execution_id}`,
        ...(skill.timeoutMs ? { timeout_ms: skill.timeoutMs } : {}),
      },
      inputs: skill.inputs,
      output: skill.output,
      auth: skill.auth,
      access: skill.access,
      ...(skill.execution_mode ? { execution_mode: skill.execution_mode } : {}),
      ...(skill.tags ? { tags: skill.tags } : {}),
      ...(skill.documentation_url
        ? { documentation_url: skill.documentation_url }
        : {}),
    };

    return signSkillResource(unsigned, {
      kid: this.options.signingKey.kid,
      privateKey: this.options.signingKey.privateKey,
      ttlMs: this.options.proofTtlMs ?? 3600_000,
    });
  }

  private buildWellKnownFayId(): FayIdWellKnownDocument {
    return {
      fay_id: this.options.provider.fay_id,
      origin: this.boundOrigin,
      keys: [
        exportFayIdVerificationKey(
          this.options.signingKey.kid,
          this.options.signingKey.publicKey,
          this.options.signingKey.revoked !== undefined
            ? { revoked: this.options.signingKey.revoked }
            : undefined
        ),
      ],
      updated_at: new Date().toISOString(),
    };
  }

  private async handleRequest(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    try {
      const url = new URL(req.url ?? "/", this.boundOrigin);
      const method = req.method ?? "GET";

      if (method === "GET" && url.pathname === "/.well-known/fayid") {
        sendJson(res, 200, this.buildWellKnownFayId(), this.protocolVersion);
        return;
      }

      const versionErr = this.checkSupportedVersionsHeader(req);
      if (versionErr) {
        sendJson(res, 422, versionErr, this.protocolVersion);
        return;
      }

      if (method === "GET" && url.pathname === "/.well-known/skill-sharing") {
        const authState = this.extractPrincipal(req);
        if (authState.presented && !authState.valid) {
          sendJson(
            res,
            401,
            createAuthRequiredError("Invalid discovery authentication credentials"),
            this.protocolVersion
          );
          return;
        }

        let entries: SkillIndexEntry[] = [];
        for (const skill of this.skills.values()) {
          if (skill.access === "private") {
            if (!authState.valid || !authState.principal) {
              continue;
            }
            const needed = skill.requiredScopes ?? [];
            if (!needed.every((s) => authState.principal!.scopes.includes(s))) {
              continue;
            }
          }
          const encodedId = encodeURIComponent(skill.id);
          entries.push({
            id: skill.id,
            name: skill.name,
            capability_type: skill.capability_type,
            description: skill.description,
            descriptor_url: `${this.boundOrigin}/skills/${encodedId}`,
            access: skill.access,
            version: skill.version,
          });
        }

        const typeFilter = url.searchParams.get("type");
        if (typeFilter !== null) {
          if (!VALID_CAPABILITY_TYPES.has(typeFilter as CapabilityType)) {
            sendJson(
              res,
              400,
              createValidationError(`Invalid capability_type filter: "${typeFilter}"`),
              this.protocolVersion
            );
            return;
          }
          entries = filterByCapabilityType(entries, typeFilter as CapabilityType);
        }

        const unsignedIndex: SkillIndex = {
          protocol: { version: this.protocolVersion },
          provider: {
            name: this.options.provider.name,
            fay_id: this.options.provider.fay_id,
            url: this.boundOrigin,
          },
          skills: entries,
        };
        const signedIndex = signSkillResource(unsignedIndex, {
          kid: this.options.signingKey.kid,
          privateKey: this.options.signingKey.privateKey,
          ttlMs: this.options.proofTtlMs ?? 3600_000,
        });
        sendJson(res, 200, signedIndex, this.protocolVersion);
        return;
      }

      const invokeMatch = url.pathname.match(/^\/skills\/([^/]+)\/invoke$/);
      if (method === "POST" && invokeMatch) {
        const skillId = decodeURIComponent(invokeMatch[1]);
        const skill = this.skills.get(skillId);
        if (!skill) {
          sendJson(
            res,
            404,
            createSkillNotFoundError(`Skill "${skillId}" not found`, {
              skill_id: skillId,
            }),
            this.protocolVersion
          );
          return;
        }

        const authDecision = this.authorizeForSkill(req, skill);
        if (!authDecision.ok) {
          sendJson(res, authDecision.status, authDecision.error, this.protocolVersion);
          return;
        }

        let body: unknown;
        try {
          body = await readJsonBody(req);
        } catch {
          sendJson(
            res,
            400,
            createValidationError("Malformed JSON request body"),
            this.protocolVersion
          );
          return;
        }

        const reqValidation = validateInvocationRequest(body);
        if (!reqValidation.valid) {
          sendJson(
            res,
            400,
            createValidationError(
              "Invalid InvocationRequest payload",
              reqValidation.errors
            ),
            this.protocolVersion
          );
          return;
        }

        const invocationReq = body as InvocationRequest;
        if (invocationReq.skill_id !== skill.id) {
          sendJson(
            res,
            400,
            createValidationError(
              `Request skill_id "${invocationReq.skill_id}" does not match endpoint skill "${skill.id}"`,
              [{ path: "/skill_id", expected: skill.id, actual: invocationReq.skill_id }]
            ),
            this.protocolVersion
          );
          return;
        }

        if (
          authDecision.principal &&
          authDecision.principal.callerFayId !== invocationReq.caller.id
        ) {
          sendJson(
            res,
            403,
            createPermissionDeniedError(
              `Authenticated principal "${authDecision.principal.callerFayId}" cannot spoof caller.id "${invocationReq.caller.id}"`
            ),
            this.protocolVersion
          );
          return;
        }

        const missingInputs = skill.inputs
          .filter((param) => param.required && !(param.name in invocationReq.inputs))
          .map((param) => param.name);
        if (missingInputs.length > 0) {
          sendJson(
            res,
            400,
            createValidationError(
              `Missing required skill input parameters: ${missingInputs.join(", ")}`,
              missingInputs.map((name) => ({
                path: `/inputs/${name}`,
                expected: "defined",
                actual: "undefined",
              }))
            ),
            this.protocolVersion
          );
          return;
        }

        const nowIso = new Date().toISOString();
        const executionId = `exec_${randomUUID().replace(/-/g, "")}`;
        const record: ExecutionRecord = {
          executionId,
          skillId: skill.id,
          callerFayId: invocationReq.caller.id,
          createdAt: nowIso,
          updatedAt: nowIso,
          status: "accepted",
          pollsRemaining: Math.max(0, (skill.pollsBeforeCompletion ?? 1) - 1),
          settled: false,
        };
        this.executions.set(executionId, record);

        const effectiveTimeoutMs =
          invocationReq.context?.timeout_ms ?? skill.timeoutMs ?? 30_000;

        this.runAsyncSkill(skill, invocationReq, record, effectiveTimeoutMs);

        const acceptedResp: InvocationResponse = {
          execution_id: executionId,
          status: "accepted",
          skill_id: skill.id,
          timestamps: {
            created_at: nowIso,
            updated_at: nowIso,
          },
        };
        sendJson(res, 202, acceptedResp, this.protocolVersion);
        return;
      }

      const skillGetMatch = url.pathname.match(/^\/skills\/([^/]+)$/);
      if (method === "GET" && skillGetMatch) {
        const skillId = decodeURIComponent(skillGetMatch[1]);
        const skill = this.skills.get(skillId);
        if (!skill) {
          sendJson(
            res,
            404,
            createSkillNotFoundError(`Skill "${skillId}" not found`, {
              skill_id: skillId,
            }),
            this.protocolVersion
          );
          return;
        }

        const authDecision = this.authorizeForSkill(req, skill);
        if (!authDecision.ok) {
          sendJson(res, authDecision.status, authDecision.error, this.protocolVersion);
          return;
        }

        sendJson(
          res,
          200,
          this.buildSignedDescriptor(skill),
          this.protocolVersion
        );
        return;
      }

      const invocationPollMatch = url.pathname.match(/^\/invocations\/([^/]+)$/);
      if (method === "GET" && invocationPollMatch) {
        const executionId = decodeURIComponent(invocationPollMatch[1]);
        const record = this.executions.get(executionId);
        if (!record) {
          sendJson(
            res,
            404,
            createSkillNotFoundError(`Execution "${executionId}" not found`, {
              execution_id: executionId,
            }),
            this.protocolVersion
          );
          return;
        }

        const skill = this.skills.get(record.skillId)!;
        const authDecision = this.authorizeForSkill(req, skill);
        if (!authDecision.ok) {
          sendJson(res, authDecision.status, authDecision.error, this.protocolVersion);
          return;
        }
        if (
          authDecision.principal &&
          authDecision.principal.callerFayId !== record.callerFayId
        ) {
          sendJson(
            res,
            403,
            createPermissionDeniedError(
              "Caller is not authorized to inspect another principal's execution"
            ),
            this.protocolVersion
          );
          return;
        }

        if (record.settled && record.pollsRemaining > 0) {
          record.pollsRemaining -= 1;
          record.status = "running";
          record.updatedAt = new Date().toISOString();
        } else if (record.settled && record.pollsRemaining === 0 && record.status !== "completed" && record.status !== "failed" && record.status !== "timeout") {
          const doneIso = new Date().toISOString();
          record.updatedAt = doneIso;
          record.completedAt = doneIso;
          if (record.resolvedError) {
            record.status =
              record.resolvedError.code === "INVOCATION_TIMEOUT"
                ? "timeout"
                : "failed";
            record.error = record.resolvedError;
          } else {
            record.status = "completed";
            record.output = record.resolvedOutput;
          }
        }

        const pollResp: InvocationResponse = {
          execution_id: record.executionId,
          status: record.status,
          skill_id: record.skillId,
          ...(record.status === "completed" ? { output: record.output } : {}),
          ...(record.status === "failed" || record.status === "timeout"
            ? { error: record.error }
            : {}),
          timestamps: {
            created_at: record.createdAt,
            updated_at: record.updatedAt,
            ...(record.completedAt ? { completed_at: record.completedAt } : {}),
          },
        };
        sendJson(res, 200, pollResp, this.protocolVersion);
        return;
      }

      sendJson(
        res,
        404,
        createSkillNotFoundError(`Unknown route: ${method} ${url.pathname}`),
        this.protocolVersion
      );
    } catch (err) {
      sendJson(
        res,
        500,
        createValidationError(
          err instanceof Error ? err.message : "Internal provider error"
        ),
        this.protocolVersion
      );
    }
  }

  private runAsyncSkill(
    skill: RegisteredSkillConfig,
    request: InvocationRequest,
    record: ExecutionRecord,
    timeoutMs: number
  ): void {
    record.status = "running";
    let finished = false;

    const timer = setTimeout(() => {
      if (finished) return;
      finished = true;
      const timeoutErr = createInvocationTimeoutError(
        `Skill "${skill.id}" timed out after ${timeoutMs}ms`,
        { timeout_ms: timeoutMs, execution_id: record.executionId }
      );
      record.resolvedError = timeoutErr.error;
      record.pollsRemaining = 0;
      record.settled = true;
      record.status = "timeout";
      record.error = timeoutErr.error;
      const iso = new Date().toISOString();
      record.updatedAt = iso;
      record.completedAt = iso;
    }, timeoutMs);
    (timer as unknown as { unref?: () => void }).unref?.();

    Promise.resolve()
      .then(() =>
        skill.handler(request, {
          executionId: record.executionId,
          callerFayId: request.caller.id,
        })
      )
      .then((output) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        record.resolvedOutput = output;
        record.settled = true;
        if (record.pollsRemaining === 0) {
          const iso = new Date().toISOString();
          record.status = "completed";
          record.output = output;
          record.updatedAt = iso;
          record.completedAt = iso;
        }
      })
      .catch((err) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        record.resolvedError = {
          code: "VALIDATION_ERROR",
          message: err instanceof Error ? err.message : "Skill execution failed",
        };
        record.pollsRemaining = 0;
        record.settled = true;
        record.status = "failed";
        record.error = record.resolvedError;
        const iso = new Date().toISOString();
        record.updatedAt = iso;
        record.completedAt = iso;
      });
  }
}

/**
 * Optional SkillRegistryMirror (ADR 0001 §5):
 * Zero gatekeeping authority; caches and forwards raw signed SkillDescriptor payloads verbatim
 * so consumers independently verify the provider's JCS + Ed25519 JWS proof end-to-end.
 */
export class SkillRegistryMirror {
  private readonly descriptors = new Map<string, SkillDescriptor>();
  private readonly protocolVersion: string;
  private server: Server | null = null;
  private boundOrigin = "";

  constructor(options?: { protocolVersion?: string }) {
    this.protocolVersion = options?.protocolVersion ?? SSP_PROTOCOL_VERSION;
  }

  get origin(): string {
    if (!this.boundOrigin) {
      throw new Error("SkillRegistryMirror has not been started yet");
    }
    return this.boundOrigin;
  }

  publishDescriptor(descriptor: SkillDescriptor): void {
    this.descriptors.set(descriptor.id, structuredClone(descriptor));
  }

  /** Test helper to simulate an untrusted/compromised mirror mutating a cached descriptor */
  tamperDescriptor(
    skillId: string,
    mutator: (descriptor: SkillDescriptor) => SkillDescriptor
  ): void {
    const existing = this.descriptors.get(skillId);
    if (!existing) {
      throw new Error(`Skill "${skillId}" not cached in mirror`);
    }
    this.descriptors.set(skillId, mutator(structuredClone(existing)));
  }

  async start(host = "127.0.0.1", port = 0): Promise<string> {
    if (this.server) {
      return this.boundOrigin;
    }
    this.server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", "http://localhost");
      if (req.method === "GET" && url.pathname === "/skills") {
        const typeParam = url.searchParams.get("type");
        let list = Array.from(this.descriptors.values());
        if (typeParam) {
          list = list.filter((d) => d.capability_type === typeParam);
        }
        sendJson(
          res,
          200,
          {
            protocol: { version: this.protocolVersion },
            descriptors: list,
          },
          this.protocolVersion
        );
        return;
      }

      const itemMatch = url.pathname.match(/^\/skills\/([^/]+)$/);
      if (req.method === "GET" && itemMatch) {
        const id = decodeURIComponent(itemMatch[1]);
        const found = this.descriptors.get(id);
        if (!found) {
          sendJson(
            res,
            404,
            createSkillNotFoundError(`Cached descriptor "${id}" not found`),
            this.protocolVersion
          );
          return;
        }
        sendJson(res, 200, found, this.protocolVersion);
        return;
      }

      sendJson(
        res,
        404,
        createSkillNotFoundError(`Unknown registry route: ${url.pathname}`),
        this.protocolVersion
      );
    });

    await new Promise<void>((resolvePromise, rejectPromise) => {
      this.server!.once("error", rejectPromise);
      this.server!.listen(port, host, () => {
        this.server!.off("error", rejectPromise);
        resolvePromise();
      });
    });

    const address = this.server.address() as AddressInfo;
    this.boundOrigin = `http://${host}:${address.port}`;
    return this.boundOrigin;
  }

  async stop(): Promise<void> {
    if (!this.server) {
      return;
    }
    const srv = this.server;
    this.server = null;
    await new Promise<void>((resolvePromise, rejectPromise) => {
      srv.close((err) => (err ? rejectPromise(err) : resolvePromise()));
    });
  }
}
