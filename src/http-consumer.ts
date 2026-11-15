/**
 * SSP 1.0 HTTP Reference Consumer
 *
 * Implements:
 * - Well-Known URI discovery (`GET /.well-known/skill-sharing`)
 * - Direct SkillDescriptor retrieval (`GET /skills/:id`)
 * - Optional SkillRegistryMirror discovery with independent end-to-end JWS verification
 * - Stateless same-MAJOR version evaluation + `SSP-Supported-Versions` header advertisement
 * - Default-Deny trust gate prior to remote invocation
 * - Remote invocation (`POST {endpoint.url}`) + async status polling + timeout & exponential backoff
 */

import {
  SSP_PROTOCOL_VERSION,
  formatProtocolToken,
  isCompatible,
} from "./version.js";
import { filterByCapabilityType } from "./discovery.js";
import {
  validate,
  validateSkillIndex,
  validateFayIdWellKnown,
} from "./validator.js";
import {
  validateInvocationRequest,
  validateInvocationResponse,
  validateErrorResponse,
  createValidationError,
  createPermissionDeniedError,
  createInvocationTimeoutError,
  createEndpointUnreachableError,
  createVersionIncompatibleError,
  type ErrorResponse,
} from "./invocation.js";
import {
  evaluateInvocationTrustGate,
  normalizeOrigin,
  verifySkillResource,
  type SkillVerificationResult,
  type TrustGateOptions,
} from "./crypto.js";
import type {
  CallerType,
  CapabilityType,
  FayIdWellKnownDocument,
  InvocationRequest,
  InvocationResponse,
  SkillDescriptor,
  SkillIndex,
} from "../schema/draft/schema.js";

export interface ConsumerCredentials {
  bearerToken?: string;
  apiKey?: string;
  apiKeyHeader?: string;
  customHeaders?: Record<string, string>;
}

export interface SspHttpConsumerOptions {
  consumerVersion?: string;
  caller: {
    id: string;
    type: CallerType;
    organization_id?: string;
  };
  /** Custom anchored FayID resolver; defaults to fetching `${providerOrigin}/.well-known/fayid` */
  fayIdResolver?: (
    providerFayId: string,
    providerOrigin: string
  ) => Promise<FayIdWellKnownDocument | null>;
  /** Permit http://127.0.0.1 and http://localhost for local loopback testing */
  allowHttpLoopback?: boolean;
  defaultTimeoutMs?: number;
  maxRetries?: number;
  retryBackoffMs?: number;
  now?: () => Date;
}

export interface DiscoverOptions {
  credentials?: ConsumerCredentials;
  capabilityType?: CapabilityType;
}

export interface FetchDescriptorOptions {
  credentials?: ConsumerCredentials;
  expectedOrigin?: string;
}

export interface InvokeSkillOptions {
  credentials?: ConsumerCredentials;
  mandateRef?: string;
  traceId?: string;
  priority?: "low" | "normal" | "high";
  timeoutMs?: number;
  pollUntilTerminal?: boolean;
  pollIntervalMs?: number;
  trustGate?: TrustGateOptions;
}

export class SspProtocolError extends Error {
  public readonly errorResponse: ErrorResponse;
  public readonly httpStatus?: number;

  constructor(errorResponse: ErrorResponse, httpStatus?: number) {
    super(`[${errorResponse.error.code}] ${errorResponse.error.message}`);
    this.name = "SspProtocolError";
    this.errorResponse = errorResponse;
    this.httpStatus = httpStatus;
  }
}

function isAllowedTransportUrl(urlString: string, allowLoopback: boolean): boolean {
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol === "https:") {
      return true;
    }
    if (
      allowLoopback &&
      parsed.protocol === "http:" &&
      (parsed.hostname === "127.0.0.1" ||
        parsed.hostname === "localhost" ||
        parsed.hostname === "[::1]")
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

export class SspHttpConsumer {
  private readonly consumerVersion: string;
  private readonly caller: SspHttpConsumerOptions["caller"];
  private readonly allowHttpLoopback: boolean;
  private readonly defaultTimeoutMs: number;
  private readonly maxRetries: number;
  private readonly retryBackoffMs: number;
  private readonly fayIdResolver?: SspHttpConsumerOptions["fayIdResolver"];
  private readonly nowFn: () => Date;

  constructor(options: SspHttpConsumerOptions) {
    this.consumerVersion = options.consumerVersion ?? SSP_PROTOCOL_VERSION;
    this.caller = options.caller;
    this.allowHttpLoopback = options.allowHttpLoopback ?? false;
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? 10_000;
    this.maxRetries = options.maxRetries ?? 2;
    this.retryBackoffMs = options.retryBackoffMs ?? 100;
    this.fayIdResolver = options.fayIdResolver;
    this.nowFn = options.now ?? (() => new Date());
  }

  private buildHeaders(credentials?: ConsumerCredentials): Record<string, string> {
    const headers: Record<string, string> = {
      accept: "application/json",
      "ssp-supported-versions": formatProtocolToken(this.consumerVersion),
    };
    if (credentials?.bearerToken) {
      headers.authorization = `Bearer ${credentials.bearerToken}`;
    }
    if (credentials?.apiKey) {
      const headerName = (credentials.apiKeyHeader ?? "X-API-Key").toLowerCase();
      headers[headerName] = credentials.apiKey;
    }
    if (credentials?.customHeaders) {
      for (const [k, v] of Object.entries(credentials.customHeaders)) {
        headers[k.toLowerCase()] = v;
      }
    }
    return headers;
  }

  private async requestJson(
    url: string,
    init: {
      method: string;
      headers: Record<string, string>;
      body?: string;
      timeoutMs?: number;
      retryOnUnreachable?: boolean;
    }
  ): Promise<{ status: number; data: unknown }> {
    if (!isAllowedTransportUrl(url, this.allowHttpLoopback)) {
      throw new SspProtocolError(
        createValidationError(
          `Transport URL disallowed (HTTPS required unless loopback is enabled): "${url}"`
        )
      );
    }

    const attempts = init.retryOnUnreachable === false ? 1 : Math.max(1, this.maxRetries);
    const timeoutMs = init.timeoutMs ?? this.defaultTimeoutMs;
    let lastNetworkError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      (timer as unknown as { unref?: () => void }).unref?.();

      try {
        const response = await fetch(url, {
          method: init.method,
          headers: init.headers,
          body: init.body,
          signal: controller.signal,
        });
        clearTimeout(timer);

        const text = await response.text();
        const data = text.trim().length > 0 ? (JSON.parse(text) as unknown) : null;

        if (!response.ok) {
          if (validateErrorResponse(data).valid) {
            throw new SspProtocolError(data as ErrorResponse, response.status);
          }
          throw new SspProtocolError(
            createValidationError(
              `HTTP ${response.status} error from ${url}`,
              data
            ),
            response.status
          );
        }

        return { status: response.status, data };
      } catch (err) {
        clearTimeout(timer);
        if (err instanceof SspProtocolError) {
          throw err;
        }
        if (err instanceof Error && err.name === "AbortError") {
          throw new SspProtocolError(
            createInvocationTimeoutError(
              `HTTP request to ${url} timed out after ${timeoutMs}ms`,
              { url, timeout_ms: timeoutMs }
            ),
            408
          );
        }
        lastNetworkError = err;
        if (attempt < attempts) {
          const delay = this.retryBackoffMs * Math.pow(2, attempt - 1);
          await sleep(delay);
        }
      }
    }

    throw new SspProtocolError(
      createEndpointUnreachableError(
        `Failed to connect to endpoint ${url}`,
        {
          url,
          reason:
            lastNetworkError instanceof Error
              ? lastNetworkError.message
              : "Connection failed",
        },
        {
          suggested_delay_ms: this.retryBackoffMs,
          max_attempts: attempts,
        }
      ),
      503
    );
  }

  private async resolveFayIdDocument(
    providerFayId: string | undefined,
    providerUrl: string | undefined
  ): Promise<FayIdWellKnownDocument | null> {
    if (!providerFayId || !providerUrl) {
      return null;
    }
    let providerOrigin: string;
    try {
      providerOrigin = normalizeOrigin(providerUrl);
    } catch {
      return null;
    }

    if (this.fayIdResolver) {
      return this.fayIdResolver(providerFayId, providerOrigin);
    }

    try {
      const { data } = await this.requestJson(
        `${providerOrigin}/.well-known/fayid`,
        {
          method: "GET",
          headers: { accept: "application/json" },
          retryOnUnreachable: false,
        }
      );
      if (!validateFayIdWellKnown(data).valid) {
        return null;
      }
      return data as FayIdWellKnownDocument;
    } catch {
      return null;
    }
  }

  private assertProtocolCompatible(descriptorOrIndexVersion: string): void {
    let compatible = false;
    try {
      compatible = isCompatible(descriptorOrIndexVersion, this.consumerVersion);
    } catch (err) {
      throw new SspProtocolError(
        createValidationError(
          err instanceof Error ? err.message : "Invalid protocol version"
        )
      );
    }

    if (!compatible) {
      throw new SspProtocolError(
        createVersionIncompatibleError(
          `Protocol version "${descriptorOrIndexVersion}" is incompatible with consumer "${this.consumerVersion}"`,
          {
            descriptor_version: descriptorOrIndexVersion,
            consumer_version: this.consumerVersion,
          }
        ),
        422
      );
    }
  }

  /**
   * Discover a provider's SkillIndex via `GET /.well-known/skill-sharing`.
   */
  async discoverOrigin(
    originUrl: string,
    options: DiscoverOptions = {}
  ): Promise<{
    index: SkillIndex;
    trust_status: "verified" | "unverified";
    verification: SkillVerificationResult;
  }> {
    const origin = normalizeOrigin(originUrl);
    const query = options.capabilityType
      ? `?type=${encodeURIComponent(options.capabilityType)}`
      : "";
    const { data } = await this.requestJson(
      `${origin}/.well-known/skill-sharing${query}`,
      {
        method: "GET",
        headers: this.buildHeaders(options.credentials),
      }
    );

    const validation = validateSkillIndex(data);
    if (!validation.valid) {
      throw new SspProtocolError(
        createValidationError("Invalid SkillIndex document", validation.errors)
      );
    }

    const index = data as SkillIndex;
    this.assertProtocolCompatible(index.protocol.version);

    const fayIdDoc = await this.resolveFayIdDocument(
      index.provider.fay_id,
      index.provider.url ?? origin
    );
    const verification = verifySkillResource(index, {
      fayIdDocument: fayIdDoc,
      expectedOrigin: origin,
      now: this.nowFn(),
    });

    const filteredIndex: SkillIndex = options.capabilityType
      ? {
          ...index,
          skills: filterByCapabilityType(index.skills, options.capabilityType),
        }
      : index;

    return {
      index: filteredIndex,
      trust_status: verification.trust_status,
      verification,
    };
  }

  /**
   * Fetch and verify a SkillDescriptor from a known URL.
   */
  async fetchDescriptor(
    descriptorUrl: string,
    options: FetchDescriptorOptions = {}
  ): Promise<{
    descriptor: SkillDescriptor;
    trust_status: "verified" | "unverified";
    verification: SkillVerificationResult;
  }> {
    const expectedOrigin = options.expectedOrigin ?? normalizeOrigin(descriptorUrl);
    const { data } = await this.requestJson(descriptorUrl, {
      method: "GET",
      headers: this.buildHeaders(options.credentials),
    });

    const validation = validate(data);
    if (!validation.valid) {
      throw new SspProtocolError(
        createValidationError("Invalid SkillDescriptor document", validation.errors)
      );
    }

    const descriptor = data as SkillDescriptor;
    this.assertProtocolCompatible(descriptor.protocol.version);

    const fayIdDoc = await this.resolveFayIdDocument(
      descriptor.provider.fay_id,
      descriptor.provider.url
    );
    const verification = verifySkillResource(descriptor, {
      fayIdDocument: fayIdDoc,
      expectedOrigin,
      now: this.nowFn(),
    });

    return {
      descriptor,
      trust_status: verification.trust_status,
      verification,
    };
  }

  /**
   * Discover cached descriptors from an optional SkillRegistryMirror and independently
   * verify each provider's JWS proof and Origin <-> FayID binding end-to-end.
   */
  async discoverFromRegistry(
    registryUrl: string,
    options: { capabilityType?: CapabilityType } = {}
  ): Promise<
    Array<{
      descriptor: SkillDescriptor;
      trust_status: "verified" | "unverified";
      verification: SkillVerificationResult;
    }>
  > {
    const regOrigin = normalizeOrigin(registryUrl);
    const query = options.capabilityType
      ? `?type=${encodeURIComponent(options.capabilityType)}`
      : "";
    const { data } = await this.requestJson(`${regOrigin}/skills${query}`, {
      method: "GET",
      headers: this.buildHeaders(),
    });

    const envelope = data as { descriptors?: unknown[] };
    if (!envelope || !Array.isArray(envelope.descriptors)) {
      throw new SspProtocolError(
        createValidationError("Invalid registry response payload")
      );
    }

    const results: Array<{
      descriptor: SkillDescriptor;
      trust_status: "verified" | "unverified";
      verification: SkillVerificationResult;
    }> = [];

    for (const raw of envelope.descriptors) {
      const validation = validate(raw);
      if (!validation.valid) {
        continue;
      }
      const descriptor = raw as SkillDescriptor;
      if (!isCompatible(descriptor.protocol.version, this.consumerVersion)) {
        continue;
      }
      const fayIdDoc = await this.resolveFayIdDocument(
        descriptor.provider.fay_id,
        descriptor.provider.url
      );
      const verification = verifySkillResource(descriptor, {
        fayIdDocument: fayIdDoc,
        expectedOrigin: descriptor.provider.url,
        now: this.nowFn(),
      });
      results.push({
        descriptor,
        trust_status: verification.trust_status,
        verification,
      });
    }

    return results;
  }

  /**
   * Invoke a skill after enforcing schema validity, same-MAJOR version compatibility,
   * and the Default-Deny cryptographic trust gate.
   */
  async invokeSkill(
    descriptor: SkillDescriptor,
    inputs: Record<string, unknown>,
    options: InvokeSkillOptions = {}
  ): Promise<InvocationResponse> {
    const descValidation = validate(descriptor);
    if (!descValidation.valid) {
      throw new SspProtocolError(
        createValidationError(
          "Cannot invoke invalid SkillDescriptor",
          descValidation.errors
        )
      );
    }

    this.assertProtocolCompatible(descriptor.protocol.version);

    const fayIdDoc = await this.resolveFayIdDocument(
      descriptor.provider.fay_id,
      descriptor.provider.url
    );
    const verification = verifySkillResource(descriptor, {
      fayIdDocument: fayIdDoc,
      expectedOrigin: descriptor.provider.url,
      now: this.nowFn(),
    });

    const gateDecision = evaluateInvocationTrustGate(
      verification,
      options.trustGate
    );
    if (!gateDecision.allowed) {
      throw new SspProtocolError(
        createPermissionDeniedError(
          `Default-Deny blocked automatic invocation of unverified skill "${descriptor.id}"`,
          {
            trust_status: gateDecision.trust_status,
            reason: gateDecision.reason,
            requires_human_prime_confirmation:
              gateDecision.requires_human_prime_confirmation,
          }
        ),
        403
      );
    }

    const effectiveTimeoutMs =
      options.timeoutMs ?? descriptor.endpoint.timeout_ms ?? this.defaultTimeoutMs;

    const reqPayload: InvocationRequest = {
      caller: {
        id: this.caller.id,
        type: this.caller.type,
        ...(this.caller.organization_id
          ? { organization_id: this.caller.organization_id }
          : {}),
      },
      skill_id: descriptor.id,
      inputs,
      ...(options.mandateRef ? { mandate_ref: options.mandateRef } : {}),
      context: {
        ...(options.traceId ? { trace_id: options.traceId } : {}),
        ...(options.priority ? { priority: options.priority } : {}),
        timeout_ms: effectiveTimeoutMs,
      },
    };

    const reqValidation = validateInvocationRequest(reqPayload);
    if (!reqValidation.valid) {
      throw new SspProtocolError(
        createValidationError(
          "Constructed InvocationRequest failed schema validation",
          reqValidation.errors
        )
      );
    }

    const headers = {
      ...this.buildHeaders(options.credentials),
      "content-type": descriptor.endpoint.content_type ?? "application/json",
    };

    const { data } = await this.requestJson(descriptor.endpoint.url, {
      method: descriptor.endpoint.method,
      headers,
      body: JSON.stringify(reqPayload),
      timeoutMs: effectiveTimeoutMs,
      retryOnUnreachable: true,
    });

    const resValidation = validateInvocationResponse(data);
    if (!resValidation.valid) {
      throw new SspProtocolError(
        createValidationError(
          "Provider returned invalid InvocationResponse",
          resValidation.errors
        )
      );
    }

    let current = data as InvocationResponse;
    if (
      options.pollUntilTerminal === false ||
      !descriptor.endpoint.status_url ||
      (current.status !== "accepted" && current.status !== "running")
    ) {
      return current;
    }

    const deadline = Date.now() + effectiveTimeoutMs;
    let pollDelay = options.pollIntervalMs ?? 20;

    while (current.status === "accepted" || current.status === "running") {
      if (Date.now() >= deadline) {
        const nowIso = new Date().toISOString();
        const timeoutErr = createInvocationTimeoutError(
          `Polling execution "${current.execution_id}" timed out after ${effectiveTimeoutMs}ms`,
          { execution_id: current.execution_id, timeout_ms: effectiveTimeoutMs }
        );
        return {
          execution_id: current.execution_id,
          status: "timeout",
          skill_id: descriptor.id,
          error: timeoutErr.error,
          timestamps: {
            created_at: current.timestamps.created_at,
            updated_at: nowIso,
            completed_at: nowIso,
          },
        };
      }

      await sleep(pollDelay);
      pollDelay = Math.min(pollDelay * 2, 500);
      current = await this.pollInvocationStatus(descriptor, current.execution_id, {
        credentials: options.credentials,
        timeoutMs: effectiveTimeoutMs,
      });
    }

    return current;
  }

  /**
   * Poll execution status via `descriptor.endpoint.status_url`.
   */
  async pollInvocationStatus(
    descriptor: SkillDescriptor,
    executionId: string,
    options: { credentials?: ConsumerCredentials; timeoutMs?: number } = {}
  ): Promise<InvocationResponse> {
    if (!descriptor.endpoint.status_url) {
      throw new SspProtocolError(
        createValidationError(
          `Skill "${descriptor.id}" does not declare endpoint.status_url`
        )
      );
    }

    const statusUrl = descriptor.endpoint.status_url.replace(
      "{execution_id}",
      encodeURIComponent(executionId)
    );
    const { data } = await this.requestJson(statusUrl, {
      method: "GET",
      headers: this.buildHeaders(options.credentials),
      timeoutMs: options.timeoutMs ?? this.defaultTimeoutMs,
      retryOnUnreachable: false,
    });

    const validation = validateInvocationResponse(data);
    if (!validation.valid) {
      throw new SspProtocolError(
        createValidationError(
          "Invalid InvocationResponse during status poll",
          validation.errors
        )
      );
    }

    return data as InvocationResponse;
  }
}
