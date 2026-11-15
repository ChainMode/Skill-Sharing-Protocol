import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Ajv2020 } from "ajv/dist/2020.js";
import {
  validate,
  validateSkillIndex,
  parse,
  serialize,
} from "./validator.js";
import {
  filterByAccess,
  filterByCapabilityType,
  validateUniqueIds,
} from "./discovery.js";
import {
  validateInvocationRequest,
  validateInvocationResponse,
  createVersionIncompatibleError,
} from "./invocation.js";
import {
  parseProtocolVersion,
  isCompatible,
  formatBareProtocolVersion,
  formatProtocolToken,
} from "./version.js";
import {
  generateEd25519KeyPairFromSeed,
  signSkillResource,
} from "./crypto.js";
import type {
  AccessPolicy,
  AuthConfig,
  AuthType,
  CapabilityType,
  ExecutionMode,
  InvocationEndpoint,
  InvocationRequest,
  InvocationResponse,
  ParameterDefinition,
  SkillDescriptor,
  SkillIndex,
  SkillIndexEntry,
} from "../schema/draft/schema.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Deterministic keypair for optional signed descriptor generation in property tests
const propSeed = new Uint8Array(32);
for (let i = 0; i < 32; i++) propSeed[i] = (i * 7 + 3) & 0xff;
const propKeys = generateEd25519KeyPairFromSeed(propSeed);

// Arbitraries matching SSP 1.0 canonical domain grammars
const arbKebabId = fc
  .tuple(
    fc.stringMatching(/^[a-z][a-z0-9]{1,8}$/),
    fc.array(fc.stringMatching(/^[a-z0-9]{1,6}$/), { minLength: 0, maxLength: 2 })
  )
  .map(([head, tail]) => [head, ...tail].join("-"));

const arbIfayId = fc
  .stringMatching(/^[a-z2-7]{16,28}$/)
  .map((b32) => `ifay_${b32}`);

const arbCofayId = fc
  .stringMatching(/^[a-z2-7]{16,28}$/)
  .map((b32) => `cofay_${b32}`);

const arbOrgId = arbKebabId.map((slug) => `org_${slug}`);

const arbProviderFayId = fc.oneof(arbIfayId, arbCofayId, arbOrgId);

const arbTwoSegmentVersion = fc
  .tuple(fc.integer({ min: 0, max: 9 }), fc.integer({ min: 0, max: 30 }))
  .map(([maj, min]) => `${maj}.${min}`);

const arbSkillSemVer = fc
  .tuple(
    fc.integer({ min: 0, max: 9 }),
    fc.integer({ min: 0, max: 20 }),
    fc.integer({ min: 0, max: 50 })
  )
  .map(([maj, min, pat]) => `${maj}.${min}.${pat}`);

const arbCapabilityType = fc.constantFrom<CapabilityType>(
  "plugin",
  "api",
  "knowledge",
  "task"
);

const arbAccessPolicy = fc.constantFrom<AccessPolicy>(
  "public",
  "restricted",
  "private"
);

const arbHttpMethod = fc.constantFrom<InvocationEndpoint["method"]>(
  "GET",
  "POST",
  "PUT",
  "DELETE"
);

const arbParamDef: fc.Arbitrary<ParameterDefinition> = fc.record({
  name: fc.stringMatching(/^[a-z][a-z0-9_]{1,12}$/),
  type: fc.constantFrom("string", "number", "boolean", "object", "array"),
  required: fc.boolean(),
  description: fc.stringMatching(/^[A-Za-z0-9 _-]{3,40}$/),
});

const arbAuthConfig: fc.Arbitrary<AuthConfig> = fc.oneof(
  fc.constant<AuthConfig>({ type: "none" }),
  fc
    .constantFrom("X-API-Key", "X-SSP-Key", "X-Skill-Token")
    .map((header): AuthConfig => ({ type: "api_key", header })),
  fc.constant<AuthConfig>({
    type: "oauth2",
    oauth2: {
      authorization_url: "https://auth.ifay.example/authorize",
      token_url: "https://auth.ifay.example/token",
      scopes: { "skills:invoke": "Invoke authorized skills" },
    },
  }),
  fc
    .tuple(
      fc.stringMatching(/^[A-Za-z0-9 ,.-]{5,40}$/),
      fc.array(arbParamDef, { minLength: 0, maxLength: 2 })
    )
    .map(([instructions, parameters]): AuthConfig => ({
      type: "custom",
      custom: { instructions, parameters },
    }))
);

const arbSkillDescriptor: fc.Arbitrary<SkillDescriptor> = fc
  .record({
    protocolVersion: arbTwoSegmentVersion,
    id: arbKebabId,
    name: fc.stringMatching(/^[A-Za-z][A-Za-z0-9 -]{2,30}$/),
    version: arbSkillSemVer,
    capability_type: arbCapabilityType,
    includeExecMode: fc.boolean(),
    execution_mode: fc.constantFrom<ExecutionMode>(
      "automated",
      "human_in_the_loop"
    ),
    description: fc.stringMatching(/^[A-Za-z0-9 ,._-]{5,60}$/),
    providerName: fc.stringMatching(/^[A-Za-z][A-Za-z0-9 -]{2,25}$/),
    providerFayId: arbProviderFayId,
    inputs: fc.array(arbParamDef, { minLength: 0, maxLength: 3 }),
    outputMime: fc.constantFrom(
      "application/json",
      "text/markdown",
      "text/plain"
    ),
    outputDesc: fc.stringMatching(/^[A-Za-z0-9 ,._-]{4,40}$/),
    method: arbHttpMethod,
    auth: arbAuthConfig,
    access: arbAccessPolicy,
    withProof: fc.boolean(),
  })
  .map((raw) => {
    const base: SkillDescriptor = {
      protocol: {
        version: raw.protocolVersion,
      },
      id: raw.id,
      name: raw.name,
      version: raw.version,
      capability_type: raw.capability_type,
      ...(raw.includeExecMode ? { execution_mode: raw.execution_mode } : {}),
      description: raw.description,
      provider: {
        name: raw.providerName,
        fay_id: raw.providerFayId,
        url: "https://skills.ifay.example",
      },
      inputs: raw.inputs,
      output: {
        content_type: raw.outputMime,
        description: raw.outputDesc,
      },
      endpoint: {
        url: `https://skills.ifay.example/skills/${raw.id}/invoke`,
        method: raw.method,
      },
      auth: raw.auth,
      access: raw.access,
    };

    if (!raw.withProof) {
      return base;
    }

    return signSkillResource(base, {
      kid: `${raw.providerFayId}#key-1`,
      privateKey: propKeys.privateKey,
      issuedAt: "2026-11-16T00:00:00.000Z",
      expiresAt: "2026-11-16T12:00:00.000Z",
    });
  });

const arbSkillIndexEntry: fc.Arbitrary<SkillIndexEntry> = fc
  .record({
    id: arbKebabId,
    name: fc.stringMatching(/^[A-Za-z][A-Za-z0-9 -]{2,24}$/),
    version: arbSkillSemVer,
    capability_type: arbCapabilityType,
    description: fc.stringMatching(/^[A-Za-z0-9 ,._-]{4,40}$/),
    access: arbAccessPolicy,
  })
  .map((raw) => ({
    ...raw,
    descriptor_url: `https://skills.ifay.example/skills/${raw.id}`,
  }));

describe("SSP 1.0 Property-Based Correctness Suite (11 Properties, fast-check)", () => {
  it("Property 1: SkillDescriptor structural completeness (12 required fields)", () => {
    // Feature: skill-sharing-protocol, Property 1: SkillDescriptor 结构完整性
    const requiredFields: ReadonlyArray<keyof SkillDescriptor> = [
      "protocol",
      "id",
      "name",
      "version",
      "capability_type",
      "description",
      "provider",
      "inputs",
      "output",
      "endpoint",
      "auth",
      "access",
    ];

    fc.assert(
      fc.property(
        arbSkillDescriptor,
        fc.constantFrom(...requiredFields),
        (descriptor, omittedField) => {
          expect(validate(descriptor).valid).toBe(true);
          for (const field of requiredFields) {
            expect(descriptor[field]).toBeDefined();
          }

          const mutated = { ...(descriptor as unknown as Record<string, unknown>) };
          delete mutated[omittedField];
          const res = validate(mutated);
          expect(res.valid).toBe(false);
          expect(res.errors.some((e) => e.path === `/${omittedField}`)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 2: Enum field domain constraints (capability_type, access, auth.type, endpoint.method)", () => {
    // Feature: skill-sharing-protocol, Property 2: 枚举字段值域约束
    const invalidToken = fc
      .stringMatching(/^[a-z_]{3,14}$/)
      .filter(
        (s) =>
          ![
            "plugin",
            "api",
            "knowledge",
            "task",
            "public",
            "restricted",
            "private",
            "none",
            "api_key",
            "oauth2",
            "custom",
            "GET",
            "POST",
            "PUT",
            "DELETE",
          ].includes(s)
      );

    fc.assert(
      fc.property(
        arbSkillDescriptor,
        invalidToken,
        fc.constantFrom("capability_type", "access", "auth.type", "endpoint.method"),
        (descriptor, badValue, targetField) => {
          expect(validate(descriptor).valid).toBe(true);

          const copy = structuredClone(descriptor) as unknown as Record<string, unknown>;
          if (targetField === "capability_type") {
            copy.capability_type = badValue;
            const res = validate(copy);
            expect(res.valid).toBe(false);
            expect(res.errors.some((e) => e.path === "/capability_type")).toBe(true);
          } else if (targetField === "access") {
            copy.access = badValue;
            const res = validate(copy);
            expect(res.valid).toBe(false);
            expect(res.errors.some((e) => e.path === "/access")).toBe(true);
          } else if (targetField === "auth.type") {
            copy.auth = { type: badValue as AuthType };
            const res = validate(copy);
            expect(res.valid).toBe(false);
            expect(res.errors.some((e) => e.path === "/auth/type")).toBe(true);
          } else {
            copy.endpoint = {
              ...(copy.endpoint as Record<string, unknown>),
              method: badValue,
            };
            const res = validate(copy);
            expect(res.valid).toBe(false);
            expect(res.errors.some((e) => e.path === "/endpoint/method")).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 3: SkillDescriptor serialize -> parse round-trip equivalence", () => {
    // Feature: skill-sharing-protocol, Property 3: SkillDescriptor 序列化往返一致性
    fc.assert(
      fc.property(arbSkillDescriptor, (descriptor) => {
        const json = serialize(descriptor);
        const restored = parse(json);
        expect(restored).toEqual(descriptor);
      }),
      { numRuns: 100 }
    );
  });

  it("Property 4: Schema validator correctness & JSON Pointer violation reporting", () => {
    // Feature: skill-sharing-protocol, Property 4: Schema 验证器正确性
    fc.assert(
      fc.property(
        arbSkillDescriptor,
        fc.constantFrom("bad_type_inputs", "extra_root_prop", "empty_id"),
        (descriptor, corruptionKind) => {
          const ok = validate(descriptor);
          expect(ok.valid).toBe(true);
          expect(ok.errors).toHaveLength(0);

          const broken = structuredClone(descriptor) as unknown as Record<string, unknown>;
          if (corruptionKind === "bad_type_inputs") {
            broken.inputs = "not-an-array";
            const res = validate(broken);
            expect(res.valid).toBe(false);
            expect(res.errors.some((e) => e.path === "/inputs")).toBe(true);
          } else if (corruptionKind === "extra_root_prop") {
            broken.undeclared_ext_field = 123;
            const res = validate(broken);
            expect(res.valid).toBe(false);
            expect(
              res.errors.some((e) => e.path === "/undeclared_ext_field")
            ).toBe(true);
          } else {
            broken.id = "";
            const res = validate(broken);
            expect(res.valid).toBe(false);
            expect(res.errors.some((e) => e.path === "/id")).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 5: Skill identifier uniqueness within SkillIndex", () => {
    // Feature: skill-sharing-protocol, Property 5: 技能标识符唯一性
    fc.assert(
      fc.property(
        fc.uniqueArray(arbSkillIndexEntry, {
          selector: (e) => e.id,
          minLength: 1,
          maxLength: 8,
        }),
        arbProviderFayId,
        (uniqueEntries, providerFayId) => {
          expect(validateUniqueIds(uniqueEntries)).toBe(true);

          const validIndex: SkillIndex = {
            protocol: { version: "1.0" },
            provider: { name: "Reference Provider", fay_id: providerFayId },
            skills: uniqueEntries,
          };
          expect(validateSkillIndex(validIndex).valid).toBe(true);

          const duplicateEntries = [...uniqueEntries, { ...uniqueEntries[0] }];
          expect(validateUniqueIds(duplicateEntries)).toBe(false);

          const dupIndex: SkillIndex = {
            ...validIndex,
            skills: duplicateEntries,
          };
          const dupRes = validateSkillIndex(dupIndex);
          expect(dupRes.valid).toBe(false);
          expect(dupRes.errors.some((e) => e.path === "/skills")).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 6: Discovery access control filtering & valid descriptor_url", () => {
    // Feature: skill-sharing-protocol, Property 6: 技能发现访问控制过滤
    fc.assert(
      fc.property(
        fc.uniqueArray(arbSkillIndexEntry, {
          selector: (e) => e.id,
          minLength: 0,
          maxLength: 12,
        }),
        (entries) => {
          const unauthList = filterByAccess(entries, false);
          expect(unauthList.every((e) => e.access !== "private")).toBe(true);
          expect(unauthList).toEqual(entries.filter((e) => e.access !== "private"));

          for (const item of unauthList) {
            const parsedUrl = new URL(item.descriptor_url);
            expect(["http:", "https:"]).toContain(parsedUrl.protocol);
          }

          const authList = filterByAccess(entries, true);
          expect(authList).toEqual(entries);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 7: CapabilityType filtering soundness and completeness", () => {
    // Feature: skill-sharing-protocol, Property 7: 按能力类型过滤正确性
    fc.assert(
      fc.property(
        fc.uniqueArray(arbSkillIndexEntry, {
          selector: (e) => e.id,
          minLength: 0,
          maxLength: 12,
        }),
        arbCapabilityType,
        (entries, targetType) => {
          const filtered = filterByCapabilityType(entries, targetType);
          // Soundness: every returned entry has capability_type === targetType
          expect(
            filtered.every((e) => e.capability_type === targetType)
          ).toBe(true);
          // Completeness: every matching entry from input is preserved in order
          const expectedIds = entries
            .filter((e) => e.capability_type === targetType)
            .map((e) => e.id);
          expect(filtered.map((e) => e.id)).toEqual(expectedIds);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 8: InvocationRequest (canonical FayID + mandate_ref) & InvocationResponse structural completeness", () => {
    // Feature: skill-sharing-protocol, Property 8: 调用消息结构完整性
    const arbCaller = fc.oneof(
      arbIfayId.map((id) => ({ id, type: "ifay" as const })),
      fc
        .tuple(arbCofayId, arbOrgId)
        .map(([id, organization_id]) => ({
          id,
          type: "cofay" as const,
          organization_id,
        }))
    );

    const arbRequest: fc.Arbitrary<InvocationRequest> = fc.record({
      skill_id: arbKebabId,
      inputs: fc.dictionary(
        fc.stringMatching(/^[a-z][a-z0-9_]{1,8}$/),
        fc.oneof(fc.string({ maxLength: 20 }), fc.integer(), fc.boolean()),
        { maxKeys: 4 }
      ),
      caller: arbCaller,
      mandate_ref: fc.stringMatching(/^faying_mandate_[a-z0-9_]{4,16}$/),
      context: fc.record({
        trace_id: fc.stringMatching(/^trace-[a-z0-9]{4,12}$/),
        priority: fc.constantFrom<"low" | "normal" | "high">(
          "low",
          "normal",
          "high"
        ),
        timeout_ms: fc.integer({ min: 100, max: 30_000 }),
      }),
    });

    const arbResponse: fc.Arbitrary<InvocationResponse> = fc.oneof(
      arbKebabId.map(
        (exec): InvocationResponse => ({
          execution_id: `exec-${exec}`,
          skill_id: exec,
          status: "completed",
          output: { ok: true },
          timestamps: {
            created_at: "2026-11-16T00:00:00Z",
            updated_at: "2026-11-16T00:00:01Z",
            completed_at: "2026-11-16T00:00:01Z",
          },
        })
      ),
      arbKebabId.map(
        (exec): InvocationResponse => ({
          execution_id: `exec-${exec}`,
          skill_id: exec,
          status: "running",
          timestamps: {
            created_at: "2026-11-16T00:00:00Z",
            updated_at: "2026-11-16T00:00:01Z",
          },
        })
      ),
      arbKebabId.map(
        (exec): InvocationResponse => ({
          execution_id: `exec-${exec}`,
          skill_id: exec,
          status: "failed",
          error: { code: "EXEC_ERR", message: "Execution failed" },
          timestamps: {
            created_at: "2026-11-16T00:00:00Z",
            updated_at: "2026-11-16T00:00:01Z",
            completed_at: "2026-11-16T00:00:01Z",
          },
        })
      )
    );

    fc.assert(
      fc.property(arbRequest, arbResponse, (req, res) => {
        expect(validateInvocationRequest(req).valid).toBe(true);
        expect(validateInvocationResponse(res).valid).toBe(true);

        // Missing caller fails InvocationRequest
        const missingCaller = { ...req } as Record<string, unknown>;
        delete missingCaller.caller;
        expect(validateInvocationRequest(missingCaller).valid).toBe(false);

        // Missing timestamps fails InvocationResponse
        const missingTimestamps = { ...res } as Record<string, unknown>;
        delete missingTimestamps.timestamps;
        expect(validateInvocationResponse(missingTimestamps).valid).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it("Property 9: Two-segment SSP protocol version format constraint (MAJOR.MINOR / ssp/MAJOR.MINOR)", () => {
    // Feature: skill-sharing-protocol, Property 9: 版本号格式约束
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 50 }),
        fc.integer({ min: 0, max: 200 }),
        fc.integer({ min: 0, max: 20 }),
        (major, minor, patch) => {
          const v = formatBareProtocolVersion({ major, minor });
          const tok = formatProtocolToken({ major, minor });
          expect(parseProtocolVersion(v)).toEqual({ major, minor });
          expect(parseProtocolVersion(tok)).toEqual({ major, minor });

          // Three-segment SemVer MUST be rejected for protocol version
          expect(() => parseProtocolVersion(`${major}.${minor}.${patch}`)).toThrow();
          // Leading zero MUST be rejected when major > 0
          expect(() => parseProtocolVersion(`0${major + 1}.${minor}`)).toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 10: Same-MAJOR protocol compatibility detection", () => {
    // Feature: skill-sharing-protocol, Property 10: 主版本不兼容检测
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 8 }),
        fc.integer({ min: 0, max: 25 }),
        fc.integer({ min: 0, max: 8 }),
        fc.integer({ min: 0, max: 25 }),
        (descMajor, descMinor, consMajor, consMinor) => {
          const descVer = `${descMajor}.${descMinor}`;
          const consVer = `${consMajor}.${consMinor}`;
          const expectedCompat = descMajor === consMajor;

          expect(isCompatible(descVer, consVer)).toBe(expectedCompat);
          if (!expectedCompat) {
            const err = createVersionIncompatibleError(
              `Incompatible protocol major version: ${descVer} vs ${consVer}`
            );
            expect(err.error.code).toBe("VERSION_INCOMPATIBLE");
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 11: TypeScript types and canonical JSON Schemas (schemas/ssp-1.0.json, schema/2025-10-25, schema/draft) bidirectional equivalence", () => {
    // Feature: skill-sharing-protocol, Property 11: TypeScript 类型与 JSON Schema 等价性
    const canonicalSchemaText = readFileSync(
      resolve(__dirname, "..", "schemas", "ssp-1.0.json"),
      "utf-8"
    );
    const editionSchemaText = readFileSync(
      resolve(__dirname, "..", "schema", "2025-10-25", "schema.json"),
      "utf-8"
    );
    const draftSchemaText = readFileSync(
      resolve(__dirname, "..", "schema", "draft", "schema.json"),
      "utf-8"
    );

    // All three schema artifacts MUST stay strictly synchronized
    expect(editionSchemaText).toBe(canonicalSchemaText);
    expect(draftSchemaText).toBe(canonicalSchemaText);

    const parsedSchema = JSON.parse(canonicalSchemaText);
    const ajv = new Ajv2020({ allErrors: true, verbose: true });
    const rawValidate = ajv.compile(parsedSchema);

    fc.assert(
      fc.property(arbSkillDescriptor, (descriptor) => {
        expect(rawValidate(descriptor)).toBe(true);
        expect(validate(descriptor).valid).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});
