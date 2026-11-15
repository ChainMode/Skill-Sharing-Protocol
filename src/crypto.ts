/**
 * SSP 1.0 Cryptographic Trust Root (ADR 0001 + ADR 0002)
 *
 * Pure node:crypto implementation of:
 * - RFC 8785 JSON Canonicalization Scheme (JCS)
 * - RFC 7515 Appendix F / RFC 8037 Detached Ed25519 JWS ("alg": "EdDSA")
 * - Origin <-> FayID bidirectional binding verification
 * - Default-Deny consumer policy gate for automatic remote skill invocation
 */

import {
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  sign as cryptoSign,
  verify as cryptoVerify,
  type KeyObject,
} from "node:crypto";
import type {
  SkillDescriptor,
  SkillIndex,
  SkillProof,
  FayIdVerificationKey,
  FayIdWellKnownDocument,
} from "../schema/draft/schema.js";

// ASN.1 PKCS#8 v1 prefix for a 32-byte raw Ed25519 private seed (OID 1.3.101.112)
const ED25519_PKCS8_PREFIX = Buffer.from(
  "302e020100300506032b657004220420",
  "hex"
);

// ASN.1 SPKI prefix for a 32-byte raw Ed25519 public key (OID 1.3.101.112)
const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

const PROVIDER_FAY_ID_REGEX = /^(ifay_[a-z2-7]+|cofay_[a-z2-7]+|org_[a-z0-9-]+)$/;

export type TrustFailureReason =
  | "MISSING_PROOF"
  | "MISSING_PROVIDER_FAY_ID"
  | "INVALID_PROVIDER_FAY_ID"
  | "KID_PROVIDER_MISMATCH"
  | "MISSING_FAYID_DOCUMENT"
  | "FAYID_SUBJECT_MISMATCH"
  | "KEY_NOT_FOUND"
  | "KEY_REVOKED"
  | "KEY_EXPIRED"
  | "INVALID_TIMESTAMPS"
  | "PROOF_NOT_YET_VALID"
  | "PROOF_EXPIRED"
  | "ORIGIN_MISMATCH"
  | "MALFORMED_JWS"
  | "INVALID_JWS_HEADER"
  | "INVALID_JWS_SIGNATURE";

export interface SkillVerificationResult {
  verified: boolean;
  trust_status: "verified" | "unverified";
  provider_fay_id?: string;
  kid?: string;
  origin?: string;
  reason?: TrustFailureReason;
  detail?: string;
}

export interface InvocationTrustGateDecision {
  allowed: boolean;
  trust_status: "verified" | "unverified";
  requires_human_prime_confirmation: boolean;
  reason?: TrustFailureReason;
  detail?: string;
}

export interface SignSkillResourceOptions {
  kid: string;
  privateKey: KeyObject;
  issuedAt?: string;
  expiresAt?: string;
  ttlMs?: number;
}

export interface VerifySkillResourceOptions {
  fayIdDocument?: FayIdWellKnownDocument | null;
  expectedOrigin?: string;
  now?: string | Date;
}

export interface TrustGateOptions {
  /** Explicit confirmation granted by Human Prime through Faying Protocol */
  humanPrimeConfirmed?: boolean;
  /** Faying Protocol confirmation reference for auditability */
  fayingConfirmationRef?: string;
}

function assertNoLoneSurrogates(str: string): void {
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = str.charCodeAt(i + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) {
        throw new TypeError("RFC 8785 JCS forbids unpaired high surrogate code units");
      }
      i++;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      throw new TypeError("RFC 8785 JCS forbids unpaired low surrogate code units");
    }
  }
}

/**
 * RFC 8785 JSON Canonicalization Scheme (JCS) serializer.
 */
export function canonicalizeJcs(value: unknown): string {
  if (value === null) {
    return "null";
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError("RFC 8785 JCS cannot serialize NaN or Infinity");
    }
    return Object.is(value, -0) ? "0" : JSON.stringify(value);
  }
  if (typeof value === "string") {
    assertNoLoneSurrogates(value);
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    const elements = value.map((item) =>
      canonicalizeJcs(item === undefined ? null : item)
    );
    return `[${elements.join(",")}]`;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record)
      .filter((k) => record[k] !== undefined)
      .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

    const props = keys.map((k) => {
      assertNoLoneSurrogates(k);
      return `${JSON.stringify(k)}:${canonicalizeJcs(record[k])}`;
    });
    return `{${props.join(",")}}`;
  }
  throw new TypeError(`Unsupported value type in JCS canonicalization: ${typeof value}`);
}

/**
 * Strip top-level `proof` and `signature` fields and return UTF-8 RFC 8785 JCS bytes.
 */
export function canonicalizeSkillPayload(
  resource: SkillDescriptor | SkillIndex | Record<string, unknown>
): Buffer {
  const clone: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(resource)) {
    if (key === "proof" || key === "signature") {
      continue;
    }
    clone[key] = val;
  }
  return Buffer.from(canonicalizeJcs(clone), "utf-8");
}

function toBase64Url(buf: Uint8Array): string {
  return Buffer.from(buf).toString("base64url");
}

function fromBase64Url(input: string): Buffer {
  if (!/^[A-Za-z0-9_-]+$/.test(input)) {
    throw new Error("Invalid base64url characters");
  }
  return Buffer.from(input, "base64url");
}

/**
 * Generate a fresh Ed25519 key pair using pure node:crypto.
 */
export function generateEd25519KeyPair(): {
  privateKey: KeyObject;
  publicKey: KeyObject;
} {
  return generateKeyPairSync("ed25519");
}

/**
 * Deterministically derive an Ed25519 key pair from a 32-byte seed (for reproducible test vectors).
 */
export function generateEd25519KeyPairFromSeed(seed32: Uint8Array): {
  privateKey: KeyObject;
  publicKey: KeyObject;
} {
  if (seed32.length !== 32) {
    throw new RangeError(`Expected 32-byte Ed25519 seed, received ${seed32.length} bytes`);
  }
  const pkcs8Der = Buffer.concat([ED25519_PKCS8_PREFIX, Buffer.from(seed32)]);
  const privateKey = createPrivateKey({
    key: pkcs8Der,
    format: "der",
    type: "pkcs8",
  });
  const publicKey = createPublicKey(privateKey);
  return { privateKey, publicKey };
}

/**
 * Export a node:crypto Ed25519 public key into a FayID OKP verification key entry.
 */
export function exportFayIdVerificationKey(
  kid: string,
  publicKey: KeyObject,
  options?: { revoked?: boolean; expires_at?: string }
): FayIdVerificationKey {
  const spki = publicKey.export({ format: "der", type: "spki" }) as Buffer;
  const rawPub = spki.subarray(ED25519_SPKI_PREFIX.length);
  if (rawPub.length !== 32) {
    throw new Error("Unexpected Ed25519 SPKI public key length");
  }
  return {
    kid,
    kty: "OKP",
    crv: "Ed25519",
    x: toBase64Url(rawPub),
    ...(options?.revoked !== undefined ? { revoked: options.revoked } : {}),
    ...(options?.expires_at !== undefined ? { expires_at: options.expires_at } : {}),
  };
}

/**
 * Import a FayID OKP verification key entry into a node:crypto Ed25519 KeyObject.
 */
export function importFayIdVerificationKey(entry: FayIdVerificationKey): KeyObject {
  if (entry.kty !== "OKP" || entry.crv !== "Ed25519") {
    throw new Error(`Unsupported verification key type: ${entry.kty}/${entry.crv}`);
  }
  const rawPub = fromBase64Url(entry.x);
  if (rawPub.length !== 32) {
    throw new Error(`Invalid Ed25519 raw public key length: ${rawPub.length}`);
  }
  const spkiDer = Buffer.concat([ED25519_SPKI_PREFIX, rawPub]);
  return createPublicKey({
    key: spkiDer,
    format: "der",
    type: "spki",
  });
}

/**
 * Sign a SkillDescriptor or SkillIndex using JCS (RFC 8785) + Detached Ed25519 JWS (RFC 7515 Appendix F / RFC 8037).
 */
export function signSkillResource<T extends SkillDescriptor | SkillIndex>(
  resource: T,
  options: SignSkillResourceOptions
): T & { proof: SkillProof } {
  const nowMs = Date.now();
  const issuedAt = options.issuedAt ?? new Date(nowMs).toISOString();
  const expiresAt =
    options.expiresAt ??
    new Date(Date.parse(issuedAt) + (options.ttlMs ?? 3600_000)).toISOString();

  if (!resource.provider?.fay_id || !PROVIDER_FAY_ID_REGEX.test(resource.provider.fay_id)) {
    throw new Error(
      "Cannot sign skill resource without a canonical provider.fay_id (ifay_ / cofay_ / org_)"
    );
  }
  if (!options.kid.startsWith(`${resource.provider.fay_id}#`)) {
    throw new Error(
      `Signing kid "${options.kid}" must belong to provider.fay_id "${resource.provider.fay_id}"`
    );
  }

  const protectedHeader = canonicalizeJcs({
    alg: "EdDSA",
    kid: options.kid,
  });
  const encodedHeader = toBase64Url(Buffer.from(protectedHeader, "utf-8"));
  const canonicalPayload = canonicalizeSkillPayload(
    resource as unknown as Record<string, unknown>
  );
  const encodedPayload = toBase64Url(canonicalPayload);
  const signingInput = Buffer.from(`${encodedHeader}.${encodedPayload}`, "ascii");

  const signature = cryptoSign(null, signingInput, options.privateKey);
  const detachedJws = `${encodedHeader}..${toBase64Url(signature)}`;

  const proof: SkillProof = {
    alg: "EdDSA",
    kid: options.kid,
    issued_at: issuedAt,
    expires_at: expiresAt,
    jws: detachedJws,
  };

  return {
    ...resource,
    proof,
  };
}

export function normalizeOrigin(urlString: string): string {
  const parsed = new URL(urlString);
  return parsed.origin;
}

function resolveTemplateUrlOrigin(templateUrl: string): string {
  const ConcreteSample = templateUrl.replace(/\{execution_id\}/g, "exec-probe");
  return new URL(ConcreteSample).origin;
}

/**
 * Verify Origin <-> Provider/Endpoint binding for a SkillDescriptor or SkillIndex.
 */
export function verifyOriginBinding(
  resource: SkillDescriptor | SkillIndex,
  options?: { expectedOrigin?: string; fayIdDocument?: FayIdWellKnownDocument | null }
): { ok: boolean; origin?: string; detail?: string } {
  if (!resource.provider?.url) {
    return {
      ok: false,
      detail: "provider.url is required for Origin <-> FayID binding verification",
    };
  }

  let declaredOrigin: string;
  try {
    declaredOrigin = normalizeOrigin(resource.provider.url);
  } catch {
    return { ok: false, detail: `Invalid provider.url: "${resource.provider.url}"` };
  }

  if (options?.expectedOrigin) {
    let expectedNorm: string;
    try {
      expectedNorm = normalizeOrigin(options.expectedOrigin);
    } catch {
      return {
        ok: false,
        detail: `Invalid expectedOrigin: "${options.expectedOrigin}"`,
      };
    }
    if (declaredOrigin !== expectedNorm) {
      return {
        ok: false,
        detail: `Declared provider origin "${declaredOrigin}" does not match expected discovery origin "${expectedNorm}"`,
      };
    }
  }

  if (options?.fayIdDocument) {
    let docOrigin: string;
    try {
      docOrigin = normalizeOrigin(options.fayIdDocument.origin);
    } catch {
      return {
        ok: false,
        detail: `Invalid FayID document origin: "${options.fayIdDocument.origin}"`,
      };
    }
    if (docOrigin !== declaredOrigin) {
      return {
        ok: false,
        detail: `FayID document origin "${docOrigin}" does not match provider origin "${declaredOrigin}"`,
      };
    }
  }

  if ("endpoint" in resource) {
    try {
      const endpointOrigin = normalizeOrigin(resource.endpoint.url);
      if (endpointOrigin !== declaredOrigin) {
        return {
          ok: false,
          detail: `endpoint.url origin "${endpointOrigin}" does not match provider origin "${declaredOrigin}"`,
        };
      }
      if (resource.endpoint.status_url) {
        const statusOrigin = resolveTemplateUrlOrigin(resource.endpoint.status_url);
        if (statusOrigin !== declaredOrigin) {
          return {
            ok: false,
            detail: `endpoint.status_url origin "${statusOrigin}" does not match provider origin "${declaredOrigin}"`,
          };
        }
      }
      if (resource.endpoint.result_url) {
        const resultOrigin = resolveTemplateUrlOrigin(resource.endpoint.result_url);
        if (resultOrigin !== declaredOrigin) {
          return {
            ok: false,
            detail: `endpoint.result_url origin "${resultOrigin}" does not match provider origin "${declaredOrigin}"`,
          };
        }
      }
    } catch {
      return { ok: false, detail: "Invalid endpoint URL in SkillDescriptor" };
    }
  } else if ("skills" in resource) {
    for (const entry of resource.skills) {
      try {
        const entryOrigin = normalizeOrigin(entry.descriptor_url);
        if (entryOrigin !== declaredOrigin) {
          return {
            ok: false,
            detail: `SkillIndex entry "${entry.id}" descriptor_url origin "${entryOrigin}" does not match provider origin "${declaredOrigin}"`,
          };
        }
      } catch {
        return {
          ok: false,
          detail: `Invalid descriptor_url for SkillIndex entry "${entry.id}"`,
        };
      }
    }
  }

  return { ok: true, origin: declaredOrigin };
}

/**
 * Verify a SkillDescriptor or SkillIndex against its Detached Ed25519 JWS SkillProof,
 * finite validity window, FayID verification key status, and Origin <-> FayID binding.
 */
export function verifySkillResource(
  resource: SkillDescriptor | SkillIndex,
  options: VerifySkillResourceOptions = {}
): SkillVerificationResult {
  const proof = resource.proof;
  if (!proof) {
    return {
      verified: false,
      trust_status: "unverified",
      reason: "MISSING_PROOF",
      detail: "Resource has no SkillProof; classified as unverified under Default-Deny",
    };
  }

  const providerFayId = resource.provider?.fay_id;
  if (!providerFayId) {
    return {
      verified: false,
      trust_status: "unverified",
      kid: proof.kid,
      reason: "MISSING_PROVIDER_FAY_ID",
      detail: "Signed resource is missing provider.fay_id",
    };
  }

  if (!PROVIDER_FAY_ID_REGEX.test(providerFayId)) {
    return {
      verified: false,
      trust_status: "unverified",
      provider_fay_id: providerFayId,
      kid: proof.kid,
      reason: "INVALID_PROVIDER_FAY_ID",
      detail: `Invalid canonical provider.fay_id: "${providerFayId}"`,
    };
  }

  if (!proof.kid.startsWith(`${providerFayId}#`)) {
    return {
      verified: false,
      trust_status: "unverified",
      provider_fay_id: providerFayId,
      kid: proof.kid,
      reason: "KID_PROVIDER_MISMATCH",
      detail: `proof.kid "${proof.kid}" does not match provider.fay_id "${providerFayId}"`,
    };
  }

  const nowMs =
    options.now instanceof Date
      ? options.now.getTime()
      : options.now
        ? Date.parse(options.now)
        : Date.now();
  const issuedMs = Date.parse(proof.issued_at);
  const expiresMs = Date.parse(proof.expires_at);

  if (
    Number.isNaN(nowMs) ||
    Number.isNaN(issuedMs) ||
    Number.isNaN(expiresMs) ||
    issuedMs >= expiresMs
  ) {
    return {
      verified: false,
      trust_status: "unverified",
      provider_fay_id: providerFayId,
      kid: proof.kid,
      reason: "INVALID_TIMESTAMPS",
      detail: "SkillProof issued_at / expires_at timestamps are malformed or non-positive window",
    };
  }

  if (nowMs < issuedMs) {
    return {
      verified: false,
      trust_status: "unverified",
      provider_fay_id: providerFayId,
      kid: proof.kid,
      reason: "PROOF_NOT_YET_VALID",
      detail: `SkillProof issued_at (${proof.issued_at}) is in the future`,
    };
  }

  if (nowMs >= expiresMs) {
    return {
      verified: false,
      trust_status: "unverified",
      provider_fay_id: providerFayId,
      kid: proof.kid,
      reason: "PROOF_EXPIRED",
      detail: `SkillProof expired at ${proof.expires_at}`,
    };
  }

  const fayIdDoc = options.fayIdDocument;
  if (!fayIdDoc) {
    return {
      verified: false,
      trust_status: "unverified",
      provider_fay_id: providerFayId,
      kid: proof.kid,
      reason: "MISSING_FAYID_DOCUMENT",
      detail: "No anchored or same-origin /.well-known/fayid document available",
    };
  }

  if (fayIdDoc.fay_id !== providerFayId) {
    return {
      verified: false,
      trust_status: "unverified",
      provider_fay_id: providerFayId,
      kid: proof.kid,
      reason: "FAYID_SUBJECT_MISMATCH",
      detail: `FayID document subject "${fayIdDoc.fay_id}" does not match provider "${providerFayId}"`,
    };
  }

  const originCheck = verifyOriginBinding(resource, {
    expectedOrigin: options.expectedOrigin,
    fayIdDocument: fayIdDoc,
  });
  if (!originCheck.ok) {
    return {
      verified: false,
      trust_status: "unverified",
      provider_fay_id: providerFayId,
      kid: proof.kid,
      reason: "ORIGIN_MISMATCH",
      detail: originCheck.detail,
    };
  }

  const keyEntry = fayIdDoc.keys.find((k) => k.kid === proof.kid);
  if (!keyEntry) {
    return {
      verified: false,
      trust_status: "unverified",
      provider_fay_id: providerFayId,
      kid: proof.kid,
      origin: originCheck.origin,
      reason: "KEY_NOT_FOUND",
      detail: `Verification key "${proof.kid}" not found in FayID document`,
    };
  }

  if (keyEntry.revoked) {
    return {
      verified: false,
      trust_status: "unverified",
      provider_fay_id: providerFayId,
      kid: proof.kid,
      origin: originCheck.origin,
      reason: "KEY_REVOKED",
      detail: `Verification key "${proof.kid}" has been revoked`,
    };
  }

  if (keyEntry.expires_at && nowMs >= Date.parse(keyEntry.expires_at)) {
    return {
      verified: false,
      trust_status: "unverified",
      provider_fay_id: providerFayId,
      kid: proof.kid,
      origin: originCheck.origin,
      reason: "KEY_EXPIRED",
      detail: `Verification key "${proof.kid}" expired at ${keyEntry.expires_at}`,
    };
  }

  const jwsParts = proof.jws.split(".");
  if (jwsParts.length !== 3 || jwsParts[1] !== "" || !jwsParts[0] || !jwsParts[2]) {
    return {
      verified: false,
      trust_status: "unverified",
      provider_fay_id: providerFayId,
      kid: proof.kid,
      origin: originCheck.origin,
      reason: "MALFORMED_JWS",
      detail: "Expected compact detached JWS (<header>..<signature>)",
    };
  }

  const [encodedHeader, , encodedSignature] = jwsParts;
  let parsedHeader: Record<string, unknown>;
  try {
    parsedHeader = JSON.parse(fromBase64Url(encodedHeader).toString("utf-8")) as Record<
      string,
      unknown
    >;
  } catch {
    return {
      verified: false,
      trust_status: "unverified",
      provider_fay_id: providerFayId,
      kid: proof.kid,
      origin: originCheck.origin,
      reason: "INVALID_JWS_HEADER",
      detail: "Unable to decode protected JWS header JSON",
    };
  }

  if (
    parsedHeader.alg !== "EdDSA" ||
    parsedHeader.kid !== proof.kid ||
    proof.alg !== "EdDSA"
  ) {
    return {
      verified: false,
      trust_status: "unverified",
      provider_fay_id: providerFayId,
      kid: proof.kid,
      origin: originCheck.origin,
      reason: "INVALID_JWS_HEADER",
      detail: "JWS header alg/kid does not match SkillProof EdDSA contract",
    };
  }

  try {
    const publicKey = importFayIdVerificationKey(keyEntry);
    const canonicalPayload = canonicalizeSkillPayload(
      resource as unknown as Record<string, unknown>
    );
    const encodedPayload = toBase64Url(canonicalPayload);
    const signingInput = Buffer.from(`${encodedHeader}.${encodedPayload}`, "ascii");
    const signatureBytes = fromBase64Url(encodedSignature);

    const validSig = cryptoVerify(null, signingInput, publicKey, signatureBytes);
    if (!validSig) {
      return {
        verified: false,
        trust_status: "unverified",
        provider_fay_id: providerFayId,
        kid: proof.kid,
        origin: originCheck.origin,
        reason: "INVALID_JWS_SIGNATURE",
        detail: "Ed25519 Detached JWS signature verification failed",
      };
    }
  } catch (err) {
    return {
      verified: false,
      trust_status: "unverified",
      provider_fay_id: providerFayId,
      kid: proof.kid,
      origin: originCheck.origin,
      reason: "INVALID_JWS_SIGNATURE",
      detail: err instanceof Error ? err.message : "Cryptographic verification error",
    };
  }

  return {
    verified: true,
    trust_status: "verified",
    provider_fay_id: providerFayId,
    kid: proof.kid,
    origin: originCheck.origin,
  };
}

/**
 * Consumer Default-Deny policy gate (ADR 0001 §4):
 * - Verified skills are allowed for automatic invocation.
 * - Unverified skills MUST NOT be automatically invoked; only when Human Prime
 *   explicitly confirms a diagnostic trial via Faying Protocol (`humanPrimeConfirmed` +
 *   `fayingConfirmationRef`) and the resource was not actively forged/tampered/revoked
 *   can a manual trial proceed.
 */
export function evaluateInvocationTrustGate(
  verification: SkillVerificationResult,
  options: TrustGateOptions = {}
): InvocationTrustGateDecision {
  if (verification.verified) {
    return {
      allowed: true,
      trust_status: "verified",
      requires_human_prime_confirmation: false,
    };
  }

  const hardTamperReasons: ReadonlySet<TrustFailureReason> = new Set([
    "INVALID_JWS_SIGNATURE",
    "KEY_REVOKED",
    "ORIGIN_MISMATCH",
    "KID_PROVIDER_MISMATCH",
    "FAYID_SUBJECT_MISMATCH",
  ]);

  if (
    options.humanPrimeConfirmed === true &&
    typeof options.fayingConfirmationRef === "string" &&
    options.fayingConfirmationRef.trim().length > 0 &&
    (!verification.reason || !hardTamperReasons.has(verification.reason))
  ) {
    return {
      allowed: true,
      trust_status: "unverified",
      requires_human_prime_confirmation: true,
      reason: verification.reason,
      detail: verification.detail,
    };
  }

  return {
    allowed: false,
    trust_status: "unverified",
    requires_human_prime_confirmation: true,
    reason: verification.reason,
    detail:
      verification.detail ??
      "Default-Deny blocked automatic invocation of unverified external skill",
  };
}
