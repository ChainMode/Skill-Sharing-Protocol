/**
 * SSP 1.0 `ssp-publisher` One-Click Middleware & Bidirectional MCP / OpenAPI Bridge
 *
 * Capabilities:
 *  1. `convertMcpToolsToSkillDescriptors` / `convertSkillDescriptorsToMcpTools`:
 *     Bidirectional lossless/schema-preserving bridge between MCP `tools/list` + `tools/call`
 *     and signed SSP 1.0 `SkillDescriptor`s.
 *  2. `convertOpenApiToSkillDescriptors`:
 *     One-step conversion of OpenAPI 3.x JSON specifications into signed SSP 1.0 `SkillDescriptor`s.
 *  3. `createSspWellKnownHandler({ provider, skills, signer })`:
 *     3-line Node HTTP / Express / Next.js middleware automatically serving:
 *       - `GET /.well-known/fayid`
 *       - `GET /.well-known/skill-sharing` (supporting `?type=` filtering and enforcing
 *         `public` / `restricted` / `private` visibility — hiding `private` skills from
 *         unauthenticated callers!)
 *       - `GET /skills/:id` (serving signed individual descriptors with 401/403 access gates)
 *       - `POST /skills/:id/invoke` & `GET /invocations/:id` (live SSP skill execution)
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { randomUUID, type KeyObject } from "node:crypto";
import {
  SSP_PROTOCOL_VERSION,
  SSP_SUPPORTED_VERSIONS_HEADER,
  formatProtocolToken,
  selectCompatibleVersion,
} from "./version.js";
import { filterByCapabilityType } from "./discovery.js";
import {
  createAuthRequiredError,
  createInvocationTimeoutError,
  createPermissionDeniedError,
  createSkillNotFoundError,
  createValidationError,
  createVersionIncompatibleError,
  validateInvocationRequest,
  type ErrorResponse,
} from "./invocation.js";
import {
  exportFayIdVerificationKey,
  generateEd25519KeyPair,
  generateEd25519KeyPairFromSeed,
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
import type { AuthenticatedPrincipal } from "./http-provider.js";
import type { SspHttpConsumer } from "./http-consumer.js";

export interface SspSignerConfig {
  kid: string;
  privateKey: KeyObject;
  publicKey: KeyObject;
  revoked?: boolean;
}

export interface McpToolDefinition {
  name: string;
  description?: string;
  inputSchema?: {
    type?: string;
    properties?: Record<string, Record<string, unknown>>;
    required?: string[];
    [key: string]: unknown;
  };
  outputSchema?: Record<string, unknown>;
  annotations?: {
    title?: string;
    sspAccess?: AccessPolicy;
    sspCapabilityType?: CapabilityType;
    sspAuth?: AuthConfig;
    sspVersion?: string;
    sspTags?: string[];
    sspRequiredScopes?: string[];
    [key: string]: unknown;
  };
}

export interface McpToolsListPayload {
  tools: McpToolDefinition[];
}

export interface ConvertToSspOptions {
  provider: {
    name: string;
    fay_id: string;
    url: string;
    contact?: string;
  };
  signer?: SspSignerConfig;
  defaultCapabilityType?: CapabilityType;
  defaultAccess?: AccessPolicy;
  defaultAuth?: AuthConfig;
  defaultSkillVersion?: string;
  protocolVersion?: string;
  issuedAt?: string;
  ttlMs?: number;
}

export interface OpenApiOperationObject {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: Array<{
    name: string;
    in: string;
    required?: boolean;
    description?: string;
    schema?: Record<string, unknown>;
  }>;
  requestBody?: {
    required?: boolean;
    content?: Record<
      string,
      {
        schema?: {
          type?: string;
          properties?: Record<string, Record<string, unknown>>;
          required?: string[];
          [key: string]: unknown;
        };
      }
    >;
  };
  responses?: Record<
    string,
    {
      description?: string;
      content?: Record<string, { schema?: Record<string, unknown> }>;
    }
  >;
  security?: Array<Record<string, string[]>>;
  "x-ssp-access"?: AccessPolicy;
  "x-ssp-capability-type"?: CapabilityType;
}

export interface OpenApiDocument {
  openapi?: string;
  info?: {
    title?: string;
    version?: string;
    description?: string;
  };
  servers?: Array<{ url: string }>;
  components?: {
    securitySchemes?: Record<
      string,
      {
        type?: string;
        name?: string;
        in?: string;
        flows?: {
          authorizationCode?: {
            authorizationUrl?: string;
            tokenUrl?: string;
            scopes?: Record<string, string>;
          };
        };
      }
    >;
  };
  paths?: Record<string, Record<string, OpenApiOperationObject>>;
}

export interface PublishableSkillInput {
  descriptor?: Omit<SkillDescriptor, "proof"> | SkillDescriptor;
  id?: string;
  name?: string;
  version?: string;
  capability_type?: CapabilityType;
  execution_mode?: ExecutionMode;
  description?: string;
  inputs?: ParameterDefinition[];
  output?: OutputDefinition;
  auth?: AuthConfig;
  access?: AccessPolicy;
  tags?: string[];
  documentation_url?: string;
  timeoutMs?: number;
  requiredScopes?: string[];
  handler?: (
    request: InvocationRequest,
    context: { executionId: string; callerFayId: string }
  ) => Promise<unknown> | unknown;
}

export interface SspWellKnownMiddlewareOptions {
  provider: {
    name: string;
    fay_id: string;
    url?: string;
    contact?: string;
  };
  skills: Array<SkillDescriptor | PublishableSkillInput>;
  signer?: SspSignerConfig;
  protocolVersion?: string;
  proofTtlMs?: number;
  tokens?: Record<string, AuthenticatedPrincipal>;
  apiKeys?: Record<string, AuthenticatedPrincipal>;
}

export interface SspWellKnownHandler {
  (req: IncomingMessage, res: ServerResponse, next?: (err?: unknown) => void): Promise<boolean>;
  signer: SspSignerConfig;
  buildSignedDescriptors(origin: string): SkillDescriptor[];
}

export function createDeterministicSigner(
  fayId: string,
  seedBytes?: Uint8Array,
  keyFragment = "key-1"
): SspSignerConfig {
  const pair = seedBytes
    ? generateEd25519KeyPairFromSeed(seedBytes)
    : generateEd25519KeyPair();
  return {
    kid: `${fayId}#${keyFragment}`,
    privateKey: pair.privateKey,
    publicKey: pair.publicKey,
  };
}

function normalizeSemVer(rawVersion?: string): string {
  if (!rawVersion) return "1.0.0";
  if (/^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$/.test(rawVersion)) {
    return rawVersion;
  }
  if (/^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/.test(rawVersion)) {
    return `${rawVersion}.0`;
  }
  return "1.0.0";
}

function jsonSchemaPropertiesToParameters(
  schema?: {
    properties?: Record<string, Record<string, unknown>>;
    required?: string[];
  }
): ParameterDefinition[] {
  if (!schema || !schema.properties || typeof schema.properties !== "object") {
    return [];
  }
  const reqSet = new Set(Array.isArray(schema.required) ? schema.required : []);
  const params: ParameterDefinition[] = [];
  for (const [propName, propDef] of Object.entries(schema.properties)) {
    const rawType = typeof propDef?.type === "string" ? propDef.type : "object";
    const desc =
      typeof propDef?.description === "string" && propDef.description.length > 0
        ? propDef.description
        : `Input parameter ${propName}`;
    const nestedSchema =
      rawType === "object" || rawType === "array" || propDef?.enum || propDef?.properties
        ? { ...propDef }
        : undefined;
    params.push({
      name: propName,
      type: rawType,
      description: desc,
      required: reqSet.has(propName),
      ...(propDef?.default !== undefined ? { default: propDef.default } : {}),
      ...(nestedSchema ? { schema: nestedSchema } : {}),
    });
  }
  return params;
}

/**
 * Convert MCP `tools/list` definitions into SSP 1.0 `SkillDescriptor`s (signed if `options.signer` is given).
 */
export function convertMcpToolsToSkillDescriptors(
  mcpInput: McpToolsListPayload | McpToolDefinition[],
  options: ConvertToSspOptions
): SkillDescriptor[] {
  const tools = Array.isArray(mcpInput) ? mcpInput : mcpInput.tools ?? [];
  const baseOrigin = new URL(options.provider.url).origin;
  const protocolVersion = options.protocolVersion ?? SSP_PROTOCOL_VERSION;

  return tools.map((tool) => {
    const skillId = tool.name.replace(/[^A-Za-z0-9._-]/g, "-");
    const encodedId = encodeURIComponent(skillId);
    const access: AccessPolicy =
      tool.annotations?.sspAccess ?? options.defaultAccess ?? "public";
    const defaultAuthForAccess: AuthConfig =
      access === "public"
        ? { type: "none" }
        : { type: "api_key", header: "X-API-Key", description: "API Key or Bearer token" };

    const unsigned: SkillDescriptor = {
      protocol: { version: protocolVersion },
      id: skillId,
      name: tool.annotations?.title ?? tool.name,
      version: normalizeSemVer(tool.annotations?.sspVersion ?? options.defaultSkillVersion),
      capability_type:
        tool.annotations?.sspCapabilityType ?? options.defaultCapabilityType ?? "plugin",
      description:
        tool.description && tool.description.trim().length > 0
          ? tool.description.trim()
          : `MCP bridged tool ${tool.name}`,
      provider: {
        name: options.provider.name,
        fay_id: options.provider.fay_id,
        url: baseOrigin,
        ...(options.provider.contact ? { contact: options.provider.contact } : {}),
      },
      endpoint: {
        url: `${baseOrigin}/skills/${encodedId}/invoke`,
        method: "POST",
        content_type: "application/json",
        status_url: `${baseOrigin}/invocations/{execution_id}`,
        result_url: `${baseOrigin}/invocations/{execution_id}`,
      },
      inputs: jsonSchemaPropertiesToParameters(tool.inputSchema),
      output: {
        content_type: "application/json",
        ...(tool.outputSchema ? { schema: tool.outputSchema } : { schema: { type: "object" } }),
        description: `MCP tool result for ${tool.name}`,
      },
      auth: tool.annotations?.sspAuth ?? options.defaultAuth ?? defaultAuthForAccess,
      access,
      execution_mode: "automated",
      tags: Array.from(new Set(["mcp-bridge", ...(tool.annotations?.sspTags ?? [])])),
    };

    if (options.signer) {
      return signSkillResource(unsigned, {
        kid: options.signer.kid,
        privateKey: options.signer.privateKey,
        issuedAt: options.issuedAt,
        ttlMs: options.ttlMs,
      });
    }
    return unsigned;
  });
}

/**
 * Reverse MCP Bridge: Convert SSP 1.0 `SkillDescriptor`s into an MCP `tools/list` payload
 * so legacy MCP hosts/clients can discover and call SSP skills seamlessly.
 */
export function convertSkillDescriptorsToMcpTools(
  descriptors: SkillDescriptor[]
): McpToolsListPayload {
  const tools: McpToolDefinition[] = descriptors.map((desc) => {
    const properties: Record<string, Record<string, unknown>> = {};
    const required: string[] = [];

    for (const param of desc.inputs) {
      properties[param.name] = param.schema
        ? { ...param.schema, description: param.description }
        : {
            type: param.type,
            description: param.description,
            ...(param.default !== undefined ? { default: param.default } : {}),
          };
      if (param.required) {
        required.push(param.name);
      }
    }

    return {
      name: desc.id,
      description: desc.description,
      inputSchema: {
        type: "object",
        properties,
        ...(required.length > 0 ? { required } : {}),
      },
      ...(desc.output.schema ? { outputSchema: desc.output.schema } : {}),
      annotations: {
        title: desc.name,
        sspAccess: desc.access,
        sspCapabilityType: desc.capability_type,
        sspVersion: desc.version,
        sspProviderFayId: desc.provider.fay_id,
        sspEndpointUrl: desc.endpoint.url,
        sspVerifiedProof: Boolean(desc.proof),
      },
    };
  });

  return { tools };
}

/**
 * Bidirectional Runtime Execution Bridge (MCP `tools/call` -> SSP `invokeSkill`).
 */
export async function bridgeMcpCallToolToSspInvocation(
  mcpCall: { name: string; arguments?: Record<string, unknown> },
  consumer: SspHttpConsumer,
  descriptorsById: Map<string, SkillDescriptor> | Record<string, SkillDescriptor>,
  invokeOptions?: Parameters<SspHttpConsumer["invokeSkill"]>[2]
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  structuredContent: unknown;
  isError: boolean;
  sspExecutionId: string;
}> {
  const descriptor =
    descriptorsById instanceof Map
      ? descriptorsById.get(mcpCall.name)
      : descriptorsById[mcpCall.name];
  if (!descriptor) {
    throw new Error(`MCP->SSP bridge: unknown skill "${mcpCall.name}"`);
  }
  const resp = await consumer.invokeSkill(
    descriptor,
    mcpCall.arguments ?? {},
    invokeOptions
  );
  const isError = resp.status !== "completed";
  const payload = isError ? resp.error : resp.output;
  return {
    content: [{ type: "text", text: JSON.stringify(payload) }],
    structuredContent: payload,
    isError,
    sspExecutionId: resp.execution_id,
  };
}

/**
 * Bidirectional Runtime Execution Bridge (SSP `InvocationRequest` -> local MCP tool handler).
 */
export async function bridgeSspInvocationToMcpCallTool(
  request: InvocationRequest,
  mcpCallExecutor: (params: {
    name: string;
    arguments: Record<string, unknown>;
  }) => Promise<unknown> | unknown
): Promise<unknown> {
  return mcpCallExecutor({
    name: request.skill_id,
    arguments: request.inputs,
  });
}

/**
 * Convert an OpenAPI 3.x JSON specification into signed SSP 1.0 `SkillDescriptor`s.
 */
export function convertOpenApiToSkillDescriptors(
  openApiDoc: OpenApiDocument,
  options: ConvertToSspOptions
): SkillDescriptor[] {
  const baseOrigin = new URL(options.provider.url).origin;
  const protocolVersion = options.protocolVersion ?? SSP_PROTOCOL_VERSION;
  const docSemVer = normalizeSemVer(openApiDoc.info?.version ?? options.defaultSkillVersion);
  const descriptors: SkillDescriptor[] = [];

  const securitySchemes = openApiDoc.components?.securitySchemes ?? {};
  const allowedMethods = new Set(["get", "post", "put", "delete"]);

  for (const [routePath, pathItem] of Object.entries(openApiDoc.paths ?? {})) {
    for (const [rawMethod, op] of Object.entries(pathItem ?? {})) {
      const lowerMethod = rawMethod.toLowerCase();
      if (!allowedMethods.has(lowerMethod) || !op || typeof op !== "object") {
        continue;
      }

      const rawOpId =
        op.operationId ??
        `${lowerMethod}-${routePath.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
      const skillId = rawOpId.replace(/[^A-Za-z0-9._-]/g, "-");
      const encodedId = encodeURIComponent(skillId);

      const inputs: ParameterDefinition[] = [];
      for (const p of op.parameters ?? []) {
        inputs.push({
          name: p.name,
          type: typeof p.schema?.type === "string" ? p.schema.type : "string",
          description: p.description ?? `${p.in} parameter ${p.name}`,
          required: Boolean(p.required),
          ...(p.schema ? { schema: p.schema } : {}),
        });
      }

      const bodySchema = op.requestBody?.content?.["application/json"]?.schema;
      if (bodySchema) {
        inputs.push(...jsonSchemaPropertiesToParameters(bodySchema));
      }

      const okResp = op.responses?.["200"] ?? op.responses?.["201"] ?? op.responses?.["202"];
      const outputSchema =
        okResp?.content?.["application/json"]?.schema ?? { type: "object" };

      let resolvedAuth: AuthConfig = options.defaultAuth ?? { type: "none" };
      if (Array.isArray(op.security) && op.security.length > 0) {
        const firstSecName = Object.keys(op.security[0])[0];
        const scheme = firstSecName ? securitySchemes[firstSecName] : undefined;
        if (scheme?.type === "apiKey") {
          resolvedAuth = {
            type: "api_key",
            header: scheme.name ?? "X-API-Key",
          };
        } else if (scheme?.type === "oauth2" && scheme.flows?.authorizationCode) {
          const flow = scheme.flows.authorizationCode;
          resolvedAuth = {
            type: "oauth2",
            oauth2: {
              authorization_url: flow.authorizationUrl ?? `${baseOrigin}/oauth/authorize`,
              token_url: flow.tokenUrl ?? `${baseOrigin}/oauth/token`,
              scopes: flow.scopes ?? {},
            },
          };
        } else {
          resolvedAuth = {
            type: "api_key",
            header: "Authorization",
          };
        }
      }

      const access: AccessPolicy =
        op["x-ssp-access"] ??
        options.defaultAccess ??
        (resolvedAuth.type === "none" ? "public" : "restricted");

      const unsigned: SkillDescriptor = {
        protocol: { version: protocolVersion },
        id: skillId,
        name: op.summary ?? rawOpId,
        version: docSemVer,
        capability_type:
          op["x-ssp-capability-type"] ?? options.defaultCapabilityType ?? "api",
        description:
          op.description ?? op.summary ?? `OpenAPI ${lowerMethod.toUpperCase()} ${routePath}`,
        provider: {
          name: options.provider.name,
          fay_id: options.provider.fay_id,
          url: baseOrigin,
          ...(options.provider.contact ? { contact: options.provider.contact } : {}),
        },
        endpoint: {
          url: `${baseOrigin}/skills/${encodedId}/invoke`,
          method: "POST",
          content_type: "application/json",
          status_url: `${baseOrigin}/invocations/{execution_id}`,
          result_url: `${baseOrigin}/invocations/{execution_id}`,
        },
        inputs,
        output: {
          content_type: "application/json",
          schema: outputSchema,
          description: okResp?.description ?? "OpenAPI JSON response",
        },
        auth: resolvedAuth,
        access,
        execution_mode: "automated",
        tags: Array.from(new Set(["openapi-bridge", ...(op.tags ?? [])])),
      };

      if (options.signer) {
        descriptors.push(
          signSkillResource(unsigned, {
            kid: options.signer.kid,
            privateKey: options.signer.privateKey,
            issuedAt: options.issuedAt,
            ttlMs: options.ttlMs,
          })
        );
      } else {
        descriptors.push(unsigned);
      }
    }
  }

  return descriptors;
}

interface InternalMiddlewareSkill {
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
  requiredScopes: string[];
  handler?: PublishableSkillInput["handler"];
}

function sendMiddlewareJson(
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

async function readIncomingJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString("utf-8");
  return raw.trim().length > 0 ? JSON.parse(raw) : undefined;
}

const VALID_CAPABILITY_TYPES = new Set<CapabilityType>([
  "plugin",
  "api",
  "knowledge",
  "task",
]);

function isSkillDescriptorLike(
  item: SkillDescriptor | PublishableSkillInput
): item is SkillDescriptor {
  return "protocol" in item && "endpoint" in item && "provider" in item;
}

/**
 * 3-line Node HTTP / Express / Next.js middleware exposing:
 *   - `GET /.well-known/fayid`
 *   - `GET /.well-known/skill-sharing` (`?type=` filtering + `public`/`restricted`/`private` visibility)
 *   - `GET /skills/:id` (signed individual `SkillDescriptor` with 401/403 enforcement)
 *   - `POST /skills/:id/invoke` & `GET /invocations/:id`
 */
export function createSspWellKnownHandler(
  options: SspWellKnownMiddlewareOptions
): SspWellKnownHandler {
  const protocolVersion = options.protocolVersion ?? SSP_PROTOCOL_VERSION;
  const proofTtlMs = options.proofTtlMs ?? 3_600_000;
  const signer =
    options.signer ?? createDeterministicSigner(options.provider.fay_id);

  const skillsMap = new Map<string, InternalMiddlewareSkill>();
  const executions = new Map<string, InvocationResponse>();

  for (const raw of options.skills) {
    let normalized: InternalMiddlewareSkill;
    if (isSkillDescriptorLike(raw)) {
      normalized = {
        id: raw.id,
        name: raw.name,
        version: raw.version,
        capability_type: raw.capability_type,
        execution_mode: raw.execution_mode,
        description: raw.description,
        inputs: raw.inputs,
        output: raw.output,
        auth: raw.auth,
        access: raw.access,
        tags: raw.tags,
        documentation_url: raw.documentation_url,
        timeoutMs: raw.endpoint.timeout_ms,
        requiredScopes: [],
      };
    } else {
      const base = raw.descriptor;
      const id = raw.id ?? base?.id;
      if (!id) {
        throw new Error("Each skill passed to createSspWellKnownHandler must specify an `id`");
      }
      const access = raw.access ?? base?.access ?? "public";
      normalized = {
        id,
        name: raw.name ?? base?.name ?? id,
        version: normalizeSemVer(raw.version ?? base?.version),
        capability_type: raw.capability_type ?? base?.capability_type ?? "plugin",
        execution_mode: raw.execution_mode ?? base?.execution_mode ?? "automated",
        description:
          raw.description ?? base?.description ?? `Published SSP skill ${id}`,
        inputs: raw.inputs ?? base?.inputs ?? [],
        output: raw.output ??
          base?.output ?? {
            content_type: "application/json",
            schema: { type: "object" },
          },
        auth:
          raw.auth ??
          base?.auth ??
          (access === "public"
            ? { type: "none" }
            : { type: "api_key", header: "X-API-Key" }),
        access,
        tags: raw.tags ?? base?.tags,
        documentation_url: raw.documentation_url ?? base?.documentation_url,
        timeoutMs: raw.timeoutMs ?? base?.endpoint?.timeout_ms,
        requiredScopes: raw.requiredScopes ?? [],
        handler: raw.handler,
      };
    }
    if (skillsMap.has(normalized.id)) {
      throw new Error(`Duplicate skill id "${normalized.id}" in createSspWellKnownHandler`);
    }
    skillsMap.set(normalized.id, normalized);
  }

  function resolveRequestOrigin(req: IncomingMessage): string {
    if (options.provider.url) {
      return new URL(options.provider.url).origin;
    }
    const protoHeader = req.headers["x-forwarded-proto"];
    const proto = typeof protoHeader === "string" ? protoHeader.split(",")[0].trim() : "http";
    const hostHeader = req.headers.host ?? "127.0.0.1";
    return `${proto}://${hostHeader}`;
  }

  function extractPrincipal(
    req: IncomingMessage,
    expectedAuth?: AuthConfig
  ): {
    presented: boolean;
    valid: boolean;
    principal?: AuthenticatedPrincipal;
  } {
    const authHeader = req.headers.authorization;
    if (typeof authHeader === "string" && authHeader.trim().length > 0) {
      const m = authHeader.match(/^Bearer\s+(.+)$/i);
      if (!m) return { presented: true, valid: false };
      const principal = options.tokens?.[m[1].trim()];
      return principal
        ? { presented: true, valid: true, principal }
        : { presented: true, valid: false };
    }

    const customHeader = (expectedAuth?.header ?? "x-api-key").toLowerCase();
    const keyVal = req.headers[customHeader];
    if (typeof keyVal === "string" && keyVal.trim().length > 0) {
      const principal = options.apiKeys?.[keyVal.trim()];
      return principal
        ? { presented: true, valid: true, principal }
        : { presented: true, valid: false };
    }

    return { presented: false, valid: false };
  }

  function authorizeSkill(
    req: IncomingMessage,
    skill: InternalMiddlewareSkill
  ):
    | { ok: true; principal?: AuthenticatedPrincipal }
    | { ok: false; status: number; error: ErrorResponse } {
    const requiresAuth =
      skill.access === "private" ||
      skill.access === "restricted" ||
      skill.auth.type !== "none";
    const authState = extractPrincipal(req, skill.auth);

    if (!requiresAuth) {
      if (authState.presented && !authState.valid) {
        return {
          ok: false,
          status: 401,
          error: createAuthRequiredError("Invalid authentication credentials supplied"),
        };
      }
      return { ok: true, principal: authState.principal };
    }

    if (!authState.presented || !authState.valid || !authState.principal) {
      return {
        ok: false,
        status: 401,
        error: createAuthRequiredError(
          `Authentication required for ${skill.access} skill "${skill.id}"`,
          { required_auth_type: skill.auth.type, header: skill.auth.header }
        ),
      };
    }

    const missing = skill.requiredScopes.filter(
      (s) => !authState.principal!.scopes.includes(s)
    );
    if (missing.length > 0) {
      return {
        ok: false,
        status: 403,
        error: createPermissionDeniedError(
          `Caller "${authState.principal.callerFayId}" lacks scopes for "${skill.id}"`,
          { required_scopes: skill.requiredScopes, missing_scopes: missing }
        ),
      };
    }

    return { ok: true, principal: authState.principal };
  }

  function buildSignedDescriptorForSkill(
    skill: InternalMiddlewareSkill,
    origin: string
  ): SkillDescriptor {
    const encodedId = encodeURIComponent(skill.id);
    const unsigned: SkillDescriptor = {
      protocol: { version: protocolVersion },
      id: skill.id,
      name: skill.name,
      version: skill.version,
      capability_type: skill.capability_type,
      description: skill.description,
      provider: {
        name: options.provider.name,
        fay_id: options.provider.fay_id,
        url: origin,
        ...(options.provider.contact ? { contact: options.provider.contact } : {}),
      },
      endpoint: {
        url: `${origin}/skills/${encodedId}/invoke`,
        method: "POST",
        content_type: "application/json",
        status_url: `${origin}/invocations/{execution_id}`,
        result_url: `${origin}/invocations/{execution_id}`,
        ...(skill.timeoutMs ? { timeout_ms: skill.timeoutMs } : {}),
      },
      inputs: skill.inputs,
      output: skill.output,
      auth: skill.auth,
      access: skill.access,
      ...(skill.execution_mode ? { execution_mode: skill.execution_mode } : {}),
      ...(skill.tags ? { tags: skill.tags } : {}),
      ...(skill.documentation_url ? { documentation_url: skill.documentation_url } : {}),
    };

    return signSkillResource(unsigned, {
      kid: signer.kid,
      privateKey: signer.privateKey,
      ttlMs: proofTtlMs,
    });
  }

  const middleware = async (
    req: IncomingMessage,
    res: ServerResponse,
    next?: (err?: unknown) => void
  ): Promise<boolean> => {
    const origin = resolveRequestOrigin(req);
    const url = new URL(req.url ?? "/", origin);
    const method = req.method ?? "GET";

    const isSspRoute =
      url.pathname === "/.well-known/fayid" ||
      url.pathname === "/.well-known/skill-sharing" ||
      url.pathname.startsWith("/skills/") ||
      url.pathname.startsWith("/invocations/");

    if (!isSspRoute) {
      if (next) next();
      return false;
    }

    const supportedHdr = req.headers[SSP_SUPPORTED_VERSIONS_HEADER];
    if (supportedHdr !== undefined && url.pathname !== "/.well-known/fayid") {
      const normHdr = Array.isArray(supportedHdr) ? supportedHdr.join(",") : supportedHdr;
      try {
        if (!selectCompatibleVersion(protocolVersion, normHdr)) {
          sendMiddlewareJson(
            res,
            422,
            createVersionIncompatibleError(
              `Incompatible SSP-Supported-Versions "${normHdr}" for provider "${protocolVersion}"`
            ),
            protocolVersion
          );
          return true;
        }
      } catch (err) {
        sendMiddlewareJson(
          res,
          422,
          createVersionIncompatibleError(
            err instanceof Error ? err.message : "Malformed SSP-Supported-Versions"
          ),
          protocolVersion
        );
        return true;
      }
    }

    if (method === "GET" && url.pathname === "/.well-known/fayid") {
      const doc: FayIdWellKnownDocument = {
        fay_id: options.provider.fay_id,
        origin,
        keys: [
          exportFayIdVerificationKey(
            signer.kid,
            signer.publicKey,
            signer.revoked !== undefined ? { revoked: signer.revoked } : undefined
          ),
        ],
        updated_at: new Date().toISOString(),
      };
      sendMiddlewareJson(res, 200, doc, protocolVersion);
      return true;
    }

    if (method === "GET" && url.pathname === "/.well-known/skill-sharing") {
      const authState = extractPrincipal(req);
      if (authState.presented && !authState.valid) {
        sendMiddlewareJson(
          res,
          401,
          createAuthRequiredError("Invalid discovery credentials"),
          protocolVersion
        );
        return true;
      }

      let entries: SkillIndexEntry[] = [];
      for (const skill of skillsMap.values()) {
        // Hide `private` skills from unauthenticated callers or callers missing required scopes
        if (skill.access === "private") {
          if (!authState.valid || !authState.principal) {
            continue;
          }
          if (!skill.requiredScopes.every((s) => authState.principal!.scopes.includes(s))) {
            continue;
          }
        }
        const encodedId = encodeURIComponent(skill.id);
        entries.push({
          id: skill.id,
          name: skill.name,
          capability_type: skill.capability_type,
          description: skill.description,
          descriptor_url: `${origin}/skills/${encodedId}`,
          access: skill.access,
          version: skill.version,
        });
      }

      const typeFilter = url.searchParams.get("type");
      if (typeFilter !== null) {
        if (!VALID_CAPABILITY_TYPES.has(typeFilter as CapabilityType)) {
          sendMiddlewareJson(
            res,
            400,
            createValidationError(`Invalid capability_type filter: "${typeFilter}"`),
            protocolVersion
          );
          return true;
        }
        entries = filterByCapabilityType(entries, typeFilter as CapabilityType);
      }

      const unsignedIndex: SkillIndex = {
        protocol: { version: protocolVersion },
        provider: {
          name: options.provider.name,
          fay_id: options.provider.fay_id,
          url: origin,
        },
        skills: entries,
      };
      const signedIndex = signSkillResource(unsignedIndex, {
        kid: signer.kid,
        privateKey: signer.privateKey,
        ttlMs: proofTtlMs,
      });
      sendMiddlewareJson(res, 200, signedIndex, protocolVersion);
      return true;
    }

    const invokeMatch = url.pathname.match(/^\/skills\/([^/]+)\/invoke$/);
    if (method === "POST" && invokeMatch) {
      const skillId = decodeURIComponent(invokeMatch[1]);
      const skill = skillsMap.get(skillId);
      if (!skill) {
        sendMiddlewareJson(
          res,
          404,
          createSkillNotFoundError(`Skill "${skillId}" not found`),
          protocolVersion
        );
        return true;
      }

      const authDecision = authorizeSkill(req, skill);
      if (!authDecision.ok) {
        sendMiddlewareJson(res, authDecision.status, authDecision.error, protocolVersion);
        return true;
      }

      let body: unknown;
      try {
        body = await readIncomingJson(req);
      } catch {
        sendMiddlewareJson(
          res,
          400,
          createValidationError("Malformed JSON request body"),
          protocolVersion
        );
        return true;
      }

      const validReq = validateInvocationRequest(body);
      if (!validReq.valid) {
        sendMiddlewareJson(
          res,
          400,
          createValidationError("Invalid InvocationRequest", validReq.errors),
          protocolVersion
        );
        return true;
      }

      const invReq = body as InvocationRequest;
      if (invReq.skill_id !== skill.id) {
        sendMiddlewareJson(
          res,
          400,
          createValidationError(
            `InvocationRequest skill_id "${invReq.skill_id}" does not match "${skill.id}"`
          ),
          protocolVersion
        );
        return true;
      }

      if (authDecision.principal && authDecision.principal.callerFayId !== invReq.caller.id) {
        sendMiddlewareJson(
          res,
          403,
          createPermissionDeniedError(
            `Authenticated principal "${authDecision.principal.callerFayId}" cannot spoof "${invReq.caller.id}"`
          ),
          protocolVersion
        );
        return true;
      }

      const missingParams = skill.inputs
        .filter((p) => p.required && !(p.name in invReq.inputs))
        .map((p) => p.name);
      if (missingParams.length > 0) {
        sendMiddlewareJson(
          res,
          400,
          createValidationError(
            `Missing required parameters: ${missingParams.join(", ")}`
          ),
          protocolVersion
        );
        return true;
      }

      const executionId = `exec_${randomUUID().replace(/-/g, "")}`;
      const createdAt = new Date().toISOString();
      const timeoutMs = invReq.context?.timeout_ms ?? skill.timeoutMs ?? 15_000;

      if (!skill.handler) {
        const completedIso = new Date().toISOString();
        const dryResp: InvocationResponse = {
          execution_id: executionId,
          status: "completed",
          skill_id: skill.id,
          output: {
            acknowledged: true,
            skill_id: skill.id,
            received_inputs: invReq.inputs,
          },
          timestamps: {
            created_at: createdAt,
            updated_at: completedIso,
            completed_at: completedIso,
          },
        };
        executions.set(executionId, dryResp);
        sendMiddlewareJson(res, 200, dryResp, protocolVersion);
        return true;
      }

      let timeoutTimer: ReturnType<typeof setTimeout> | null = null;
      try {
        const result = await Promise.race([
          Promise.resolve(
            skill.handler(invReq, {
              executionId,
              callerFayId: invReq.caller.id,
            })
          ),
          new Promise<never>((_, reject) => {
            timeoutTimer = setTimeout(
              () => reject(new Error("__SSP_TIMEOUT__")),
              timeoutMs
            );
            (timeoutTimer as unknown as { unref?: () => void }).unref?.();
          }),
        ]);
        if (timeoutTimer) clearTimeout(timeoutTimer);
        const completedIso = new Date().toISOString();
        const invResp: InvocationResponse = {
          execution_id: executionId,
          status: "completed",
          skill_id: skill.id,
          output: result,
          timestamps: {
            created_at: createdAt,
            updated_at: completedIso,
            completed_at: completedIso,
          },
        };
        executions.set(executionId, invResp);
        sendMiddlewareJson(res, 200, invResp, protocolVersion);
      } catch (err) {
        if (timeoutTimer) clearTimeout(timeoutTimer);
        const doneIso = new Date().toISOString();
        const isTimeout = err instanceof Error && err.message === "__SSP_TIMEOUT__";
        const errEnv = isTimeout
          ? createInvocationTimeoutError(`Skill "${skill.id}" timed out after ${timeoutMs}ms`)
          : createValidationError(err instanceof Error ? err.message : "Skill execution failed");
        const failResp: InvocationResponse = {
          execution_id: executionId,
          status: isTimeout ? "timeout" : "failed",
          skill_id: skill.id,
          error: errEnv.error,
          timestamps: {
            created_at: createdAt,
            updated_at: doneIso,
            completed_at: doneIso,
          },
        };
        executions.set(executionId, failResp);
        sendMiddlewareJson(res, 200, failResp, protocolVersion);
      }
      return true;
    }

    const getSkillMatch = url.pathname.match(/^\/skills\/([^/]+)$/);
    if (method === "GET" && getSkillMatch) {
      const skillId = decodeURIComponent(getSkillMatch[1]);
      const skill = skillsMap.get(skillId);
      if (!skill) {
        sendMiddlewareJson(
          res,
          404,
          createSkillNotFoundError(`Skill "${skillId}" not found`),
          protocolVersion
        );
        return true;
      }

      const authDecision = authorizeSkill(req, skill);
      if (!authDecision.ok) {
        sendMiddlewareJson(res, authDecision.status, authDecision.error, protocolVersion);
        return true;
      }

      sendMiddlewareJson(
        res,
        200,
        buildSignedDescriptorForSkill(skill, origin),
        protocolVersion
      );
      return true;
    }

    const pollMatch = url.pathname.match(/^\/invocations\/([^/]+)$/);
    if (method === "GET" && pollMatch) {
      const executionId = decodeURIComponent(pollMatch[1]);
      const record = executions.get(executionId);
      if (!record) {
        sendMiddlewareJson(
          res,
          404,
          createSkillNotFoundError(`Execution "${executionId}" not found`),
          protocolVersion
        );
        return true;
      }
      const skill = skillsMap.get(record.skill_id)!;
      const authDecision = authorizeSkill(req, skill);
      if (!authDecision.ok) {
        sendMiddlewareJson(res, authDecision.status, authDecision.error, protocolVersion);
        return true;
      }
      sendMiddlewareJson(res, 200, record, protocolVersion);
      return true;
    }

    sendMiddlewareJson(
      res,
      404,
      createSkillNotFoundError(`Unknown SSP route: ${method} ${url.pathname}`),
      protocolVersion
    );
    return true;
  };

  return Object.assign(middleware, {
    signer,
    buildSignedDescriptors(origin: string): SkillDescriptor[] {
      const normOrigin = new URL(origin).origin;
      return Array.from(skillsMap.values()).map((s) =>
        buildSignedDescriptorForSkill(s, normOrigin)
      );
    },
  });
}
