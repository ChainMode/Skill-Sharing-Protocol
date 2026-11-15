import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  validate,
  validateSkillIndex,
  validateFayIdWellKnown,
} from "./validator.js";
import {
  validateInvocationRequest,
  validateInvocationResponse,
  createVersionIncompatibleError,
} from "./invocation.js";
import { isCompatible, parseProtocolVersion } from "./version.js";
import {
  verifySkillResource,
  evaluateInvocationTrustGate,
  generateEd25519KeyPairFromSeed,
} from "./crypto.js";
import { SspHttpProvider } from "./http-provider.js";
import { SspHttpConsumer, SspProtocolError } from "./http-consumer.js";
import type {
  FayIdWellKnownDocument,
  InvocationRequest,
  SkillDescriptor,
  SkillIndex,
} from "../schema/draft/schema.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ConformanceVector {
  id: string;
  category: string;
  polarity: "positive" | "negative";
  title: string;
  input: Record<string, unknown>;
  expected: Record<string, unknown>;
}

interface ConformanceSuite {
  suite: string;
  protocol_version: string;
  edition: string;
  evaluation_time: string;
  trust_anchor: FayIdWellKnownDocument;
  vectors: ConformanceVector[];
}

const suitePath = resolve(__dirname, "..", "vectors", "ssp-1.0-conformance.json");
const suite = JSON.parse(readFileSync(suitePath, "utf-8")) as ConformanceSuite;

function getVector(id: string): ConformanceVector {
  const vec = suite.vectors.find((v) => v.id === id);
  if (!vec) {
    throw new Error(`Missing conformance vector ${id}`);
  }
  return vec;
}

describe("SSP 1.0 Conformance Vector Suite (vectors/ssp-1.0-conformance.json)", () => {
  let provider: SspHttpProvider;
  let origin: string;

  const tokenMap: Record<string, string> = {
    authorized_auditor: "ssp_ref_tok_auditor_full",
    underscoped_caller: "ssp_ref_tok_caller_basic",
  };

  beforeAll(async () => {
    const seed = new Uint8Array(32);
    for (let i = 0; i < 32; i++) seed[i] = i + 1;
    const { privateKey, publicKey } = generateEd25519KeyPairFromSeed(seed);

    provider = new SspHttpProvider({
      provider: {
        name: "iFay Protocol Reference Lab",
        fay_id: "org_ifay-labs",
      },
      signingKey: {
        kid: "org_ifay-labs#key-ed25519-1",
        privateKey,
        publicKey,
      },
      tokens: {
        [tokenMap.authorized_auditor]: {
          callerFayId: "cofay_7k3m5p2q4r6s7t2v4w6x5y2z4a",
          scopes: ["skills:restricted:audit", "skills:private:ops"],
        },
        [tokenMap.underscoped_caller]: {
          callerFayId: "cofay_3b5d7f2a2c4e6g7i2k4m6n7p2q",
          scopes: ["skills:public:read"],
        },
      },
      skills: [
        {
          id: "doc-summarize",
          name: "Document Summarizer",
          version: "1.0.0",
          capability_type: "api",
          execution_mode: "automated",
          description: "Summarizes structured Markdown documents.",
          inputs: [
            {
              name: "content",
              type: "string",
              required: true,
              description: "Markdown text",
            },
          ],
          output: { content_type: "application/json", description: "Summary output" },
          auth: { type: "none" },
          access: "public",
          handler: (req) => ({ summary: String(req.inputs.content).slice(0, 32) }),
        },
        {
          id: "internal-ledger-sync",
          name: "Internal Ledger Sync",
          version: "1.0.0",
          capability_type: "api",
          execution_mode: "automated",
          description: "Private internal operational skill.",
          inputs: [
            {
              name: "namespace",
              type: "string",
              required: true,
              description: "Target namespace",
            },
          ],
          output: { content_type: "application/json", description: "Sync result" },
          auth: {
            type: "oauth2",
            oauth2: {
              authorization_url: "https://auth.ifay.example/authorize",
              token_url: "https://auth.ifay.example/token",
              scopes: { "skills:private:ops": "Private operational sync" },
            },
          },
          access: "private",
          requiredScopes: ["skills:private:ops"],
          handler: (req) => ({ synced_namespace: req.inputs.namespace }),
        },
        {
          id: "compliance-audit",
          name: "Compliance Audit Skill",
          version: "1.0.0",
          capability_type: "plugin",
          execution_mode: "automated",
          description: "Restricted governance compliance verifier.",
          inputs: [
            {
              name: "report_id",
              type: "string",
              required: true,
              description: "Report identifier",
            },
          ],
          output: { content_type: "application/json", description: "Audit result" },
          auth: {
            type: "oauth2",
            oauth2: {
              authorization_url: "https://auth.ifay.example/authorize",
              token_url: "https://auth.ifay.example/token",
              scopes: { "skills:restricted:audit": "Invoke compliance audit" },
            },
          },
          access: "restricted",
          requiredScopes: ["skills:restricted:audit"],
          handler: (req) => ({
            audited_report: req.inputs.report_id,
            mandate_ref: req.mandate_ref ?? null,
          }),
        },
        {
          id: "knowledge-reindex-task",
          name: "Knowledge Reindex Task",
          version: "1.0.0",
          capability_type: "task",
          execution_mode: "human_in_the_loop",
          description: "Asynchronous non-monetary indexing task.",
          inputs: [
            {
              name: "corpus",
              type: "string",
              required: true,
              description: "Corpus identifier",
            },
          ],
          output: { content_type: "application/json", description: "Indexing report" },
          auth: { type: "none" },
          access: "public",
          pollsBeforeCompletion: 2,
          handler: async (req) => ({
            indexed_corpus: req.inputs.corpus,
            documents_processed: 42,
          }),
        },
      ],
    });

    origin = await provider.start();
  });

  afterAll(async () => {
    await provider.stop();
  });

  it("contains >= 16 deterministic positive and negative conformance vectors and a valid trust anchor", () => {
    expect(suite.suite).toBe("ssp-1.0-conformance");
    expect(suite.protocol_version).toBe("1.0");
    expect(suite.vectors.length).toBeGreaterThanOrEqual(16);
    expect(validateFayIdWellKnown(suite.trust_anchor).valid).toBe(true);
  });

  it("SSP-VEC-001: verifies valid JCS + Detached Ed25519 JWS signed SkillDescriptor", () => {
    const vec = getVector("SSP-VEC-001");
    const descriptor = vec.input.descriptor as SkillDescriptor;
    expect(validate(descriptor).valid).toBe(vec.expected.schema_valid);

    const res = verifySkillResource(descriptor, {
      fayIdDocument: suite.trust_anchor,
      expectedOrigin: vec.input.expected_origin as string,
      now: suite.evaluation_time,
    });
    expect(res.verified).toBe(vec.expected.verified);
    expect(res.trust_status).toBe(vec.expected.trust_status);

    const gate = evaluateInvocationTrustGate(res);
    expect(gate.allowed).toBe(vec.expected.auto_invocation_allowed);
  });

  it("SSP-VEC-002: verifies valid JCS + Detached Ed25519 JWS signed SkillIndex", () => {
    const vec = getVector("SSP-VEC-002");
    const index = vec.input.skill_index as SkillIndex;
    expect(validateSkillIndex(index).valid).toBe(vec.expected.schema_valid);

    const res = verifySkillResource(index, {
      fayIdDocument: suite.trust_anchor,
      expectedOrigin: vec.input.expected_origin as string,
      now: suite.evaluation_time,
    });
    expect(res.verified).toBe(vec.expected.verified);
    expect(res.trust_status).toBe(vec.expected.trust_status);
  });

  it("SSP-VEC-003: detects tampered SkillDescriptor payload via JWS failure and blocks even manual override", () => {
    const vec = getVector("SSP-VEC-003");
    const descriptor = vec.input.descriptor as SkillDescriptor;
    expect(validate(descriptor).valid).toBe(vec.expected.schema_valid);

    const res = verifySkillResource(descriptor, {
      fayIdDocument: suite.trust_anchor,
      expectedOrigin: vec.input.expected_origin as string,
      now: suite.evaluation_time,
    });
    expect(res.verified).toBe(false);
    expect(res.reason).toBe(vec.expected.failure_reason);

    expect(evaluateInvocationTrustGate(res).allowed).toBe(false);
    expect(
      evaluateInvocationTrustGate(res, {
        humanPrimeConfirmed: true,
        fayingConfirmationRef: "faying_confirm_attempt",
      }).allowed
    ).toBe(vec.expected.manual_override_allowed);
  });

  it("SSP-VEC-004: rejects expired SkillProof outside validity window", () => {
    const vec = getVector("SSP-VEC-004");
    const descriptor = vec.input.descriptor as SkillDescriptor;
    expect(validate(descriptor).valid).toBe(true);

    const res = verifySkillResource(descriptor, {
      fayIdDocument: suite.trust_anchor,
      expectedOrigin: vec.input.expected_origin as string,
      now: suite.evaluation_time,
    });
    expect(res.verified).toBe(false);
    expect(res.reason).toBe(vec.expected.failure_reason);
    expect(evaluateInvocationTrustGate(res).allowed).toBe(false);
  });

  it("SSP-VEC-005: rejects Origin <-> endpoint mismatch against FayID authorized origin", () => {
    const vec = getVector("SSP-VEC-005");
    const descriptor = vec.input.descriptor as SkillDescriptor;
    expect(validate(descriptor).valid).toBe(true);

    const res = verifySkillResource(descriptor, {
      fayIdDocument: suite.trust_anchor,
      expectedOrigin: vec.input.expected_origin as string,
      now: suite.evaluation_time,
    });
    expect(res.verified).toBe(false);
    expect(res.reason).toBe(vec.expected.failure_reason);
    expect(
      evaluateInvocationTrustGate(res, {
        humanPrimeConfirmed: true,
        fayingConfirmationRef: "faying_confirm_attempt",
      }).allowed
    ).toBe(vec.expected.manual_override_allowed);
  });

  it("SSP-VEC-006: enforces Default-Deny on unsigned SkillDescriptor unless Human Prime explicitly confirms", () => {
    const vec = getVector("SSP-VEC-006");
    const descriptor = vec.input.descriptor as SkillDescriptor;
    expect(validate(descriptor).valid).toBe(true);

    const res = verifySkillResource(descriptor, {
      fayIdDocument: suite.trust_anchor,
      expectedOrigin: vec.input.expected_origin as string,
      now: suite.evaluation_time,
    });
    expect(res.verified).toBe(false);
    expect(res.reason).toBe(vec.expected.failure_reason);

    const autoGate = evaluateInvocationTrustGate(res);
    expect(autoGate.allowed).toBe(false);
    expect(autoGate.requires_human_prime_confirmation).toBe(true);

    const confirmedGate = evaluateInvocationTrustGate(res, {
      humanPrimeConfirmed: true,
      fayingConfirmationRef: vec.input.faying_confirmation_ref as string,
    });
    expect(confirmedGate.allowed).toBe(
      vec.expected.manual_override_with_human_prime_confirmation_allowed
    );
  });

  it("SSP-VEC-007 & SSP-VEC-008 & SSP-VEC-009: enforces same-MAJOR compatibility and MINOR forward compatibility", () => {
    const vec7 = getVector("SSP-VEC-007");
    const d7 = vec7.input.descriptor as SkillDescriptor;
    expect(validate(d7).valid).toBe(true);
    expect(isCompatible(d7.protocol.version, vec7.input.consumer_version as string)).toBe(
      false
    );
    expect(
      createVersionIncompatibleError("Major mismatch").error.code
    ).toBe(vec7.expected.error_code);

    const vec8 = getVector("SSP-VEC-008");
    const d8 = vec8.input.descriptor as SkillDescriptor;
    expect(isCompatible(d8.protocol.version, vec8.input.consumer_version as string)).toBe(
      false
    );

    const vec9 = getVector("SSP-VEC-009");
    const d9 = vec9.input.descriptor as SkillDescriptor;
    expect(validate(d9).valid).toBe(true);
    expect(isCompatible(d9.protocol.version, vec9.input.consumer_version as string)).toBe(
      true
    );
  });

  it("SSP-VEC-010: rejects legacy three-segment SemVer protocol.version (1.0.0)", () => {
    const vec = getVector("SSP-VEC-010");
    const descriptor = vec.input.descriptor as Record<string, unknown>;
    const validation = validate(descriptor);
    expect(validation.valid).toBe(false);
    expect(validation.errors.some((e) => e.path === vec.expected.violation_path)).toBe(true);
    expect(() => parseProtocolVersion("1.0.0")).toThrow();
  });

  it("SSP-VEC-011: enforces HTTP 401 AUTH_REQUIRED on private skill endpoints as well as index filtering", async () => {
    const vec = getVector("SSP-VEC-011");
    const skillId = vec.input.skill_id as string;
    const consumer = new SspHttpConsumer({
      caller: { id: "cofay_7k3m5p2q4r6s7t2v4w6x5y2z4a", type: "cofay" },
      allowHttpLoopback: true,
    });

    const discovered = await consumer.discoverOrigin(origin);
    expect(discovered.index.skills.some((s) => s.id === skillId)).toBe(
      vec.expected.listed_in_unauthenticated_index
    );

    await expect(
      consumer.fetchDescriptor(`${origin}/skills/${skillId}`)
    ).rejects.toMatchObject({
      httpStatus: vec.expected.descriptor_http_status,
      errorResponse: { error: { code: vec.expected.error_code } },
    });

    const directRes = await fetch(`${origin}/skills/${skillId}/invoke`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(vec.input.invocation_request),
    });
    expect(directRes.status).toBe(vec.expected.invoke_http_status);
    const errBody = (await directRes.json()) as { error: { code: string } };
    expect(errBody.error.code).toBe(vec.expected.error_code);
  });

  it("SSP-VEC-012 & SSP-VEC-013: enforces 401/403 on restricted skills and succeeds with authorized Bearer + Faying mandate_ref", async () => {
    const vec12 = getVector("SSP-VEC-012");
    const vec13 = getVector("SSP-VEC-013");
    const skillId = vec12.input.skill_id as string;

    const unauthConsumer = new SspHttpConsumer({
      caller: { id: "cofay_3b5d7f2a2c4e6g7i2k4m6n7p2q", type: "cofay" },
      allowHttpLoopback: true,
    });

    const discovered = await unauthConsumer.discoverOrigin(origin);
    expect(discovered.index.skills.some((s) => s.id === skillId)).toBe(true);

    // Unauthenticated descriptor fetch -> 401 AUTH_REQUIRED
    await expect(
      unauthConsumer.fetchDescriptor(`${origin}/skills/${skillId}`)
    ).rejects.toMatchObject({
      httpStatus: vec12.expected.unauthenticated_http_status,
      errorResponse: { error: { code: vec12.expected.unauthenticated_error_code } },
    });

    // Under-scoped token -> 403 PERMISSION_DENIED
    await expect(
      unauthConsumer.fetchDescriptor(`${origin}/skills/${skillId}`, {
        credentials: {
          bearerToken: tokenMap[vec12.input.underscoped_token_id as string],
        },
      })
    ).rejects.toMatchObject({
      httpStatus: vec12.expected.underscoped_http_status,
      errorResponse: { error: { code: vec12.expected.underscoped_error_code } },
    });

    // Authorized token + canonical FayID + mandate_ref -> 200 completed
    const req13 = vec13.input.invocation_request as InvocationRequest;
    expect(validateInvocationRequest(req13).valid).toBe(true);

    const authConsumer = new SspHttpConsumer({
      caller: req13.caller,
      allowHttpLoopback: true,
    });
    const { descriptor } = await authConsumer.fetchDescriptor(
      `${origin}/skills/${skillId}`,
      {
        credentials: {
          bearerToken: tokenMap[vec13.input.authorized_token_id as string],
        },
      }
    );
    const invoked = await authConsumer.invokeSkill(descriptor, req13.inputs, {
      credentials: {
        bearerToken: tokenMap[vec13.input.authorized_token_id as string],
      },
      mandateRef: req13.mandate_ref,
      traceId: req13.context?.trace_id,
      priority: req13.context?.priority,
    });
    expect(invoked.status).toBe(vec13.expected.response_status);
    expect(invoked.output).toEqual({
      audited_report: "rep-2026-11",
      mandate_ref: "faying_mandate_20261116_001",
    });
  });

  it("SSP-VEC-014: rejects non-canonical caller.id and caller.type prefix mismatches", async () => {
    const vec = getVector("SSP-VEC-014");
    const nonFayIdRes = validateInvocationRequest(vec.input.non_fayid_request);
    expect(nonFayIdRes.valid).toBe(false);
    expect(nonFayIdRes.errors.some((e) => e.path === "/caller/id")).toBe(true);

    const mismatchRes = validateInvocationRequest(
      vec.input.prefix_type_mismatch_request
    );
    expect(mismatchRes.valid).toBe(false);
    expect(mismatchRes.errors.some((e) => e.path === "/caller/id")).toBe(true);

    // Verify live HTTP provider rejects invalid caller.id with 400 VALIDATION_ERROR
    const res = await fetch(`${origin}/skills/doc-summarize/invoke`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(vec.input.non_fayid_request),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("SSP-VEC-015: executes async task capability with status polling and zero monetary settlement fields", async () => {
    const vec = getVector("SSP-VEC-015");
    const reqPayload = vec.input.invocation_request as InvocationRequest;
    const consumer = new SspHttpConsumer({
      caller: reqPayload.caller,
      allowHttpLoopback: true,
    });

    const { descriptor } = await consumer.fetchDescriptor(
      `${origin}/skills/${vec.input.skill_id as string}`
    );
    expect(descriptor.capability_type).toBe("task");
    expect(descriptor.execution_mode).toBe("human_in_the_loop");

    const initial = await consumer.invokeSkill(descriptor, reqPayload.inputs, {
      mandateRef: reqPayload.mandate_ref,
      pollUntilTerminal: false,
    });
    expect(initial.status).toBe(vec.expected.initial_status);
    expect(validateInvocationResponse(initial).valid).toBe(true);

    // Poll 1 returns running, Poll 2 returns completed
    const poll1 = await consumer.pollInvocationStatus(
      descriptor,
      initial.execution_id
    );
    expect(poll1.status).toBe(vec.expected.intermediate_status);
    const poll2 = await consumer.pollInvocationStatus(
      descriptor,
      initial.execution_id
    );
    expect(poll2.status).toBe(vec.expected.terminal_status);
    expect(poll2.output).toEqual({
      indexed_corpus: "ssp-1.0-spec",
      documents_processed: 42,
    });

    const rawKeys = Object.keys(poll2);
    const hasMonetary = rawKeys.some((k) =>
      /price|payment|fee|settlement|currency|cost/i.test(k)
    );
    expect(hasMonetary).toBe(false);
  });

  it("SSP-VEC-016 & SSP-VEC-017 & SSP-VEC-018: validates minimal boundaries, rejects invalid enums/extra properties, and rejects duplicate SkillIndex IDs", () => {
    const vec16 = getVector("SSP-VEC-016");
    const minDesc = vec16.input.descriptor as SkillDescriptor;
    const emptyIdx = vec16.input.empty_index as SkillIndex;
    expect(validate(minDesc).valid).toBe(true);
    expect(
      verifySkillResource(minDesc, {
        fayIdDocument: suite.trust_anchor,
        expectedOrigin: vec16.input.expected_origin as string,
        now: suite.evaluation_time,
      }).verified
    ).toBe(true);
    expect(validateSkillIndex(emptyIdx).valid).toBe(true);
    expect(
      verifySkillResource(emptyIdx, {
        fayIdDocument: suite.trust_anchor,
        expectedOrigin: vec16.input.expected_origin as string,
        now: suite.evaluation_time,
      }).verified
    ).toBe(true);

    const vec17 = getVector("SSP-VEC-017");
    const enumRes = validate(vec17.input.invalid_enum_descriptor);
    expect(enumRes.valid).toBe(false);
    expect(enumRes.errors.some((e) => e.path === vec17.expected.invalid_enum_path)).toBe(true);

    const extraRes = validate(vec17.input.undeclared_property_descriptor);
    expect(extraRes.valid).toBe(false);
    expect(
      extraRes.errors.some((e) => e.path === vec17.expected.undeclared_property_path)
    ).toBe(true);

    const vec18 = getVector("SSP-VEC-018");
    const dupRes = validateSkillIndex(vec18.input.duplicate_index);
    expect(dupRes.valid).toBe(false);
    expect(dupRes.errors.some((e) => e.path === vec18.expected.violation_path)).toBe(true);
    expect(SspProtocolError).toBeDefined();
  });
});
