import { describe, it, expect } from "vitest";
import {
  validateInvocationRequest,
  validateInvocationResponse,
  createValidationError,
  createAuthRequiredError,
  createPermissionDeniedError,
  createSkillNotFoundError,
  createInvocationTimeoutError,
  createEndpointUnreachableError,
  createVersionIncompatibleError,
  type ErrorResponse,
} from "./invocation.js";
import type { InvocationRequest, InvocationResponse } from "../schema/draft/schema.js";

function createValidRequest(overrides?: Partial<InvocationRequest>): InvocationRequest {
  return {
    caller: { id: "ifay_alice234567", type: "ifay" },
    skill_id: "skill-001",
    inputs: { query: "hello" },
    ...overrides,
  };
}

function createValidResponse(overrides?: Partial<InvocationResponse>): InvocationResponse {
  return {
    execution_id: "exec-001",
    status: "completed",
    skill_id: "skill-001",
    timestamps: {
      created_at: "2026-11-16T00:00:00Z",
      updated_at: "2026-11-16T00:01:00Z",
    },
    ...overrides,
  };
}

describe("validateInvocationRequest (SSP 1.0 FayID + mandate_ref)", () => {
  it("accepts a valid iFay caller request", () => {
    const result = validateInvocationRequest(createValidRequest());
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("accepts a valid coFay caller request with organization_id and mandate_ref", () => {
    const req = createValidRequest({
      caller: {
        id: "cofay_dispatch2345",
        type: "cofay",
        organization_id: "org_logistics-coop",
        credentials: { token: "ssp_tok_valid" },
      },
      mandate_ref: "mandate_fap_2026_001",
      context: { trace_id: "t-1", priority: "high", timeout_ms: 5000 },
    });
    const result = validateInvocationRequest(req);
    expect(result.valid).toBe(true);
  });

  it("rejects non-canonical caller.id formats", () => {
    const badCaller = {
      caller: { id: "caller-1", type: "ifay" },
      skill_id: "skill-001",
      inputs: {},
    };
    const result = validateInvocationRequest(badCaller);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === "/caller/id")).toBe(true);
  });

  it("rejects mismatched caller.id prefix and caller.type", () => {
    const mismatch = {
      caller: { id: "cofay_dispatch2345", type: "ifay" },
      skill_id: "skill-001",
      inputs: {},
    };
    const result = validateInvocationRequest(mismatch);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === "/caller/id")).toBe(true);
  });

  it("rejects requests missing caller, skill_id, inputs, or caller.id", () => {
    expect(
      validateInvocationRequest({ skill_id: "s", inputs: {} }).errors.map((e) => e.path)
    ).toContain("/caller");
    expect(
      validateInvocationRequest({
        caller: { id: "ifay_abc234", type: "ifay" },
        inputs: {},
      }).errors.map((e) => e.path)
    ).toContain("/skill_id");
    expect(
      validateInvocationRequest({
        caller: { id: "ifay_abc234", type: "ifay" },
        skill_id: "s",
      }).errors.map((e) => e.path)
    ).toContain("/inputs");
    expect(
      validateInvocationRequest({
        caller: { type: "ifay" },
        skill_id: "s",
        inputs: {},
      }).errors.map((e) => e.path)
    ).toContain("/caller/id");
  });

  it("rejects non-object, null, and additional properties", () => {
    expect(validateInvocationRequest("not an object").valid).toBe(false);
    expect(validateInvocationRequest(null).valid).toBe(false);
    const req = { ...createValidRequest(), extra_field: "nope" };
    const result = validateInvocationRequest(req);
    expect(result.valid).toBe(false);
    expect(result.errors.map((e) => e.path)).toContain("/extra_field");
  });
});

describe("validateInvocationResponse", () => {
  it("accepts minimal, output, failed, and timeout responses", () => {
    expect(validateInvocationResponse(createValidResponse()).valid).toBe(true);
    expect(
      validateInvocationResponse(createValidResponse({ output: { data: [1, 2, 3] } })).valid
    ).toBe(true);
    expect(
      validateInvocationResponse(
        createValidResponse({
          status: "failed",
          error: { code: "AUTH_REQUIRED", message: "Need auth" },
        })
      ).valid
    ).toBe(true);
    expect(
      validateInvocationResponse(
        createValidResponse({
          status: "timeout",
          error: {
            code: "INVOCATION_TIMEOUT",
            message: "Timed out",
            retry: { suggested_delay_ms: 1000, max_attempts: 3 },
          },
        })
      ).valid
    ).toBe(true);
  });

  it("rejects missing required fields and invalid status enum", () => {
    expect(
      validateInvocationResponse({
        status: "completed",
        skill_id: "s",
        timestamps: { created_at: "t", updated_at: "t" },
      }).errors.map((e) => e.path)
    ).toContain("/execution_id");

    const invalidStatus = { ...createValidResponse(), status: "unknown_status" };
    const res = validateInvocationResponse(invalidStatus);
    expect(res.valid).toBe(false);
    expect(res.errors.find((e) => e.path === "/status")?.expected).toEqual([
      "accepted",
      "running",
      "completed",
      "failed",
      "timeout",
    ]);
  });
});

describe("error response constructors", () => {
  it("produces all 7 distinct SSP error responses in unified format", () => {
    const responses: ErrorResponse[] = [
      createValidationError("Invalid input", { field: "/name" }),
      createAuthRequiredError("Auth needed", { required_auth_type: "oauth2" }),
      createPermissionDeniedError("Forbidden"),
      createSkillNotFoundError("Skill xyz not found", { skill_id: "xyz" }),
      createInvocationTimeoutError("Timed out"),
      createEndpointUnreachableError("Cannot connect"),
      createVersionIncompatibleError("Version mismatch", {
        required: "2.0",
        supported: "1.0",
      }),
    ];

    expect(new Set(responses.map((r) => r.error.code)).size).toBe(7);
    for (const resp of responses) {
      expect(typeof resp.error.code).toBe("string");
      expect(typeof resp.error.message).toBe("string");
    }
  });
});
