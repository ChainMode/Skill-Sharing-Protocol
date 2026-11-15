import { describe, it, expect } from "vitest";
import { validate, validateSkillIndex, parse, serialize } from "./validator.js";
import type { SkillDescriptor, SkillIndex } from "../schema/draft/schema.js";

function createValidDescriptor(
  overrides?: Partial<SkillDescriptor>
): SkillDescriptor {
  return {
    protocol: { version: "1.0" },
    id: "com.example.test-skill",
    name: "Test Skill",
    version: "1.0.0",
    capability_type: "api",
    description: "A test skill for SSP 1.0 validation",
    provider: {
      name: "Test Provider",
      fay_id: "cofay_testprov2345",
      url: "https://skills.example.com",
    },
    endpoint: {
      url: "https://skills.example.com/skills/com.example.test-skill/invoke",
      method: "POST",
    },
    inputs: [
      {
        name: "query",
        type: "string",
        description: "Search query",
        required: true,
      },
    ],
    output: { content_type: "application/json" },
    auth: { type: "none" },
    access: "public",
    ...overrides,
  };
}

describe("validate (SkillDescriptor SSP 1.0)", () => {
  it("returns valid for a minimal SSP 1.0 SkillDescriptor", () => {
    const doc = createValidDescriptor();
    const result = validate(doc);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("returns valid for a signed SkillDescriptor with SkillProof and optional fields", () => {
    const doc = createValidDescriptor({
      execution_mode: "human_in_the_loop",
      capability_type: "task",
      tags: ["search", "task"],
      documentation_url: "https://skills.example.com/docs",
      created_at: "2026-11-15T00:00:00Z",
      updated_at: "2026-11-16T00:00:00Z",
      proof: {
        alg: "EdDSA",
        kid: "cofay_testprov2345#key-1",
        issued_at: "2026-11-15T00:00:00Z",
        expires_at: "2026-12-15T00:00:00Z",
        jws: "eyJhbGciOiJFZERTQSJ9..c2lnbmF0dXJl",
      },
    });
    const result = validate(doc);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("rejects legacy 3-segment SemVer in protocol.version", () => {
    const doc = createValidDescriptor({
      protocol: { version: "1.0.0" },
    });
    const result = validate(doc);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === "/protocol/version")).toBe(true);
  });

  it("rejects invalid provider.fay_id format", () => {
    const doc = createValidDescriptor({
      provider: { name: "Bad Provider", fay_id: "user_UPPERCASE_999" },
    });
    const result = validate(doc);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === "/provider/fay_id")).toBe(true);
  });

  it("returns errors for missing required fields", () => {
    const doc = { protocol: { version: "1.0" } };
    const result = validate(doc);
    expect(result.valid).toBe(false);
    const paths = result.errors.map((e) => e.path);
    expect(paths).toContain("/id");
    expect(paths).toContain("/name");
  });

  it("returns errors for invalid capability_type enum", () => {
    const doc = createValidDescriptor();
    (doc as unknown as Record<string, unknown>).capability_type = "invalid_type";
    const result = validate(doc);
    expect(result.valid).toBe(false);
    const capError = result.errors.find((e) => e.path === "/capability_type");
    expect(capError).toBeDefined();
    expect(capError!.expected).toEqual(["plugin", "api", "knowledge", "task"]);
    expect(capError!.actual).toBe("invalid_type");
  });

  it("returns errors for invalid access enum", () => {
    const doc = createValidDescriptor();
    (doc as unknown as Record<string, unknown>).access = "open";
    const result = validate(doc);
    expect(result.valid).toBe(false);
    const accessError = result.errors.find((e) => e.path === "/access");
    expect(accessError).toBeDefined();
    expect(accessError!.expected).toEqual(["public", "restricted", "private"]);
  });

  it("returns errors for invalid auth.type enum", () => {
    const doc = createValidDescriptor();
    (doc as unknown as Record<string, unknown>).auth = { type: "bearer" };
    const result = validate(doc);
    expect(result.valid).toBe(false);
    const authError = result.errors.find((e) => e.path === "/auth/type");
    expect(authError).toBeDefined();
    expect(authError!.expected).toEqual(["api_key", "oauth2", "custom", "none"]);
  });

  it("returns error when auth.type is oauth2 without oauth2 block", () => {
    const doc = createValidDescriptor({ auth: { type: "oauth2" } });
    const result = validate(doc);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === "/auth/oauth2")).toBe(true);
  });

  it("returns error with JSON Pointer path for nested field", () => {
    const doc = createValidDescriptor();
    (doc as unknown as Record<string, unknown>).endpoint = {
      url: "https://skills.example.com",
    };
    const result = validate(doc);
    expect(result.valid).toBe(false);
    const endpointError = result.errors.find((e) => e.path === "/endpoint/method");
    expect(endpointError).toBeDefined();
  });

  it("rejects additional properties", () => {
    const doc = {
      ...createValidDescriptor(),
      unknown_field: "should not be here",
    };
    const result = validate(doc);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === "/unknown_field")).toBe(true);
  });

  it("rejects non-object and null inputs", () => {
    expect(validate("not an object").valid).toBe(false);
    expect(validate(null).valid).toBe(false);
  });
});

describe("validateSkillIndex", () => {
  it("validates a well-formed SkillIndex and rejects duplicate IDs", () => {
    const validIndex: SkillIndex = {
      protocol: { version: "1.0" },
      provider: {
        name: "Example Provider",
        fay_id: "cofay_testprov2345",
        url: "https://skills.example.com",
      },
      skills: [
        {
          id: "skill-a",
          name: "Skill A",
          capability_type: "api",
          description: "Desc A",
          descriptor_url: "https://skills.example.com/skills/skill-a",
          access: "public",
          version: "1.0.0",
        },
      ],
    };
    expect(validateSkillIndex(validIndex).valid).toBe(true);

    const dupIndex: SkillIndex = {
      ...validIndex,
      skills: [validIndex.skills[0], { ...validIndex.skills[0] }],
    };
    const dupRes = validateSkillIndex(dupIndex);
    expect(dupRes.valid).toBe(false);
    expect(dupRes.errors.some((e) => e.path === "/skills")).toBe(true);
  });
});

describe("parse & serialize", () => {
  it("parses valid input and throws with JSON Pointer details on invalid input", () => {
    const doc = createValidDescriptor();
    const descriptor = parse(doc);
    expect(descriptor.id).toBe("com.example.test-skill");
    expect(() => parse({})).toThrow("Invalid SkillDescriptor document");
  });

  it("produces 2-space pretty-printed round-trippable JSON", () => {
    const descriptor = createValidDescriptor({
      tags: ["test"],
      documentation_url: "https://skills.example.com/docs",
    });
    const json = serialize(descriptor);
    expect(json).toBe(JSON.stringify(descriptor, null, 2));
    expect(parse(JSON.parse(json))).toEqual(descriptor);
  });
});
