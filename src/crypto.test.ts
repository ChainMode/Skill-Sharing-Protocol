import { describe, it, expect } from "vitest";
import {
  canonicalizeJcs,
  generateEd25519KeyPairFromSeed,
  exportFayIdVerificationKey,
  signSkillResource,
  verifySkillResource,
  evaluateInvocationTrustGate,
} from "./crypto.js";
import type {
  SkillDescriptor,
  SkillIndex,
  FayIdWellKnownDocument,
} from "../schema/draft/schema.js";

describe("RFC 8785 JCS canonicalization", () => {
  it("sorts object keys by UTF-16 code units, normalizes -0, and preserves array order", () => {
    const input = {
      z: 1,
      a: -0,
      nested: { b: true, a: null, ignored: undefined },
      arr: [3, 2, 1],
    };
    expect(canonicalizeJcs(input)).toBe(
      '{"a":0,"arr":[3,2,1],"nested":{"a":null,"b":true},"z":1}'
    );
  });

  it("produces identical canonical output regardless of property insertion order", () => {
    const a = { b: { y: "hello", x: 10 }, a: [1, { d: false, c: true }] };
    const b = { a: [1, { c: true, d: false }], b: { x: 10, y: "hello" } };
    expect(canonicalizeJcs(a)).toBe(canonicalizeJcs(b));
  });

  it("rejects non-finite numbers", () => {
    expect(() => canonicalizeJcs({ bad: Number.NaN })).toThrow(TypeError);
    expect(() => canonicalizeJcs({ bad: Number.POSITIVE_INFINITY })).toThrow(TypeError);
  });
});

describe("Ed25519 Detached JWS + Origin <-> FayID Binding + Default-Deny", () => {
  const seed = new Uint8Array(32).fill(7);
  const keyPair = generateEd25519KeyPairFromSeed(seed);
  const providerFayId = "cofay_weather2345";
  const kid = `${providerFayId}#key-1`;
  const origin = "https://skills.example.com";

  const wellKnownDoc: FayIdWellKnownDocument = {
    fay_id: providerFayId,
    origin,
    keys: [exportFayIdVerificationKey(kid, keyPair.publicKey)],
    updated_at: "2026-11-15T00:00:00Z",
  };

  function createUnsignedDescriptor(): SkillDescriptor {
    return {
      protocol: { version: "1.0" },
      id: "com.example.weather",
      name: "Weather API",
      version: "1.0.0",
      capability_type: "api",
      description: "Forecast service",
      provider: {
        name: "Example Weather Cooperative",
        fay_id: providerFayId,
        url: origin,
      },
      endpoint: {
        url: `${origin}/skills/com.example.weather/invoke`,
        method: "POST",
        status_url: `${origin}/invocations/{execution_id}`,
      },
      inputs: [],
      output: { content_type: "application/json" },
      auth: { type: "none" },
      access: "public",
    };
  }

  it("signs and verifies both SkillDescriptor and SkillIndex", () => {
    const signedDescriptor = signSkillResource(createUnsignedDescriptor(), {
      kid,
      privateKey: keyPair.privateKey,
      issuedAt: "2026-11-15T00:00:00Z",
      expiresAt: "2026-12-15T00:00:00Z",
    });

    expect(signedDescriptor.proof.alg).toBe("EdDSA");
    expect(signedDescriptor.proof.jws).toMatch(/^[A-Za-z0-9_-]+\.\.[A-Za-z0-9_-]+$/);

    const verification = verifySkillResource(signedDescriptor, {
      fayIdDocument: wellKnownDoc,
      expectedOrigin: origin,
      now: "2026-11-16T00:00:00Z",
    });
    expect(verification.verified).toBe(true);
    expect(verification.trust_status).toBe("verified");

    const gate = evaluateInvocationTrustGate(verification);
    expect(gate.allowed).toBe(true);

    const unsignedIndex: SkillIndex = {
      protocol: { version: "1.0" },
      provider: { name: "Example Weather Cooperative", fay_id: providerFayId, url: origin },
      skills: [
        {
          id: "com.example.weather",
          name: "Weather API",
          capability_type: "api",
          description: "Forecast service",
          descriptor_url: `${origin}/skills/com.example.weather`,
          access: "public",
          version: "1.0.0",
        },
      ],
    };
    const signedIndex = signSkillResource(unsignedIndex, {
      kid,
      privateKey: keyPair.privateKey,
      issuedAt: "2026-11-15T00:00:00Z",
      expiresAt: "2026-12-15T00:00:00Z",
    });
    expect(
      verifySkillResource(signedIndex, {
        fayIdDocument: wellKnownDoc,
        expectedOrigin: origin,
        now: "2026-11-16T00:00:00Z",
      }).verified
    ).toBe(true);
  });

  it("rejects tampered payload after JWS signing", () => {
    const signed = signSkillResource(createUnsignedDescriptor(), {
      kid,
      privateKey: keyPair.privateKey,
      issuedAt: "2026-11-15T00:00:00Z",
      expiresAt: "2026-12-15T00:00:00Z",
    });
    const tampered: SkillDescriptor = {
      ...signed,
      description: "Tampered malicious description",
    };

    const verification = verifySkillResource(tampered, {
      fayIdDocument: wellKnownDoc,
      expectedOrigin: origin,
      now: "2026-11-16T00:00:00Z",
    });
    expect(verification.verified).toBe(false);
    expect(verification.reason).toBe("INVALID_JWS_SIGNATURE");
    expect(evaluateInvocationTrustGate(verification).allowed).toBe(false);
  });

  it("rejects expired SkillProof", () => {
    const signed = signSkillResource(createUnsignedDescriptor(), {
      kid,
      privateKey: keyPair.privateKey,
      issuedAt: "2026-09-01T00:00:00Z",
      expiresAt: "2026-10-01T00:00:00Z",
    });

    const verification = verifySkillResource(signed, {
      fayIdDocument: wellKnownDoc,
      expectedOrigin: origin,
      now: "2026-11-16T00:00:00Z",
    });
    expect(verification.verified).toBe(false);
    expect(verification.reason).toBe("PROOF_EXPIRED");
  });

  it("rejects revoked verification key", () => {
    const signed = signSkillResource(createUnsignedDescriptor(), {
      kid,
      privateKey: keyPair.privateKey,
      issuedAt: "2026-11-15T00:00:00Z",
      expiresAt: "2026-12-15T00:00:00Z",
    });
    const revokedDoc: FayIdWellKnownDocument = {
      ...wellKnownDoc,
      keys: [{ ...wellKnownDoc.keys[0], revoked: true }],
    };

    const verification = verifySkillResource(signed, {
      fayIdDocument: revokedDoc,
      expectedOrigin: origin,
      now: "2026-11-16T00:00:00Z",
    });
    expect(verification.verified).toBe(false);
    expect(verification.reason).toBe("KEY_REVOKED");
  });

  it("rejects Origin <-> endpoint mismatch (anti-phishing)", () => {
    const phishing = createUnsignedDescriptor();
    phishing.endpoint.url = "https://phishing.example.net/invoke";
    const signed = signSkillResource(phishing, {
      kid,
      privateKey: keyPair.privateKey,
      issuedAt: "2026-11-15T00:00:00Z",
      expiresAt: "2026-12-15T00:00:00Z",
    });

    const verification = verifySkillResource(signed, {
      fayIdDocument: wellKnownDoc,
      expectedOrigin: origin,
      now: "2026-11-16T00:00:00Z",
    });
    expect(verification.verified).toBe(false);
    expect(verification.reason).toBe("ORIGIN_MISMATCH");
  });

  it("enforces Default-Deny on unsigned descriptors unless Human Prime explicitly confirms via Faying", () => {
    const unsigned = createUnsignedDescriptor();
    const verification = verifySkillResource(unsigned, {
      fayIdDocument: wellKnownDoc,
      expectedOrigin: origin,
      now: "2026-11-16T00:00:00Z",
    });
    expect(verification.verified).toBe(false);
    expect(verification.trust_status).toBe("unverified");
    expect(verification.reason).toBe("MISSING_PROOF");

    const defaultGate = evaluateInvocationTrustGate(verification);
    expect(defaultGate.allowed).toBe(false);
    expect(defaultGate.requires_human_prime_confirmation).toBe(true);

    const confirmedGate = evaluateInvocationTrustGate(verification, {
      humanPrimeConfirmed: true,
      fayingConfirmationRef: "fap_confirm_trial_001",
    });
    expect(confirmedGate.allowed).toBe(true);
    expect(confirmedGate.trust_status).toBe("unverified");
  });
});
