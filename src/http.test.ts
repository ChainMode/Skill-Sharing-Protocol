import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { generateEd25519KeyPairFromSeed, signSkillResource } from "./crypto.js";
import { SspHttpProvider, SkillRegistryMirror } from "./http-provider.js";
import { SspHttpConsumer, SspProtocolError } from "./http-consumer.js";
import type { SkillDescriptor } from "../schema/draft/schema.js";

describe("SSP 1.0 Loopback HTTP Reference Stack (Provider + Consumer + Registry Mirror)", () => {
  let provider: SspHttpProvider;
  let mirror: SkillRegistryMirror;
  const providerFayId = "cofay_provider2345";
  const providerKid = `${providerFayId}#key-1`;
  const keyPair = generateEd25519KeyPairFromSeed(new Uint8Array(32).fill(11));

  beforeEach(async () => {
    provider = new SspHttpProvider({
      provider: {
        name: "Reference Cooperative Provider",
        fay_id: providerFayId,
        contact: "ops@example.org",
      },
      signingKey: {
        kid: providerKid,
        privateKey: keyPair.privateKey,
        publicKey: keyPair.publicKey,
      },
      tokens: {
        ssp_tok_alice_full: {
          callerFayId: "ifay_alice234567",
          scopes: ["skill:read", "skill:invoke", "private:vault"],
        },
        ssp_tok_bob_limited: {
          callerFayId: "ifay_bob234567",
          scopes: ["skill:read"],
        },
      },
      apiKeys: {
        ssp_example_placeholder_key_ops: {
          callerFayId: "cofay_opsagent2345",
          scopes: ["skill:read", "skill:invoke", "private:vault"],
        },
      },
      skills: [
        {
          id: "com.example.public-echo",
          name: "Public Echo API",
          version: "1.0.0",
          capability_type: "api",
          description: "Echoes structured input back to caller.",
          inputs: [
            {
              name: "message",
              type: "string",
              description: "Input message",
              required: true,
            },
          ],
          output: { content_type: "application/json" },
          auth: { type: "none" },
          access: "public",
          handler: async (req) => ({
            echoed: req.inputs.message,
            mandate_ref: req.mandate_ref ?? null,
          }),
        },
        {
          id: "com.example.restricted-translate",
          name: "Restricted Translator",
          version: "1.2.0",
          capability_type: "plugin",
          description: "Requires OAuth2 bearer token with skill:invoke scope.",
          inputs: [
            {
              name: "text",
              type: "string",
              description: "Source text",
              required: true,
            },
          ],
          output: { content_type: "application/json" },
          auth: {
            type: "oauth2",
            oauth2: {
              authorization_url: "https://auth.example.org/authorize",
              token_url: "https://auth.example.org/token",
              scopes: { "skill:invoke": "Invoke restricted translator" },
            },
          },
          access: "restricted",
          requiredScopes: ["skill:invoke"],
          handler: async (req) => ({
            translated: `[zh-CN] ${String(req.inputs.text)}`,
          }),
        },
        {
          id: "com.example.private-vault",
          name: "Private Vault Knowledge",
          version: "2.0.0",
          capability_type: "knowledge",
          description: "Hidden from unauthenticated index AND protected at endpoints.",
          inputs: [
            {
              name: "doc_id",
              type: "string",
              description: "Vault document ID",
              required: true,
            },
          ],
          output: { content_type: "application/json" },
          auth: {
            type: "api_key",
            header: "X-API-Key",
          },
          access: "private",
          requiredScopes: ["private:vault"],
          handler: async (req) => ({
            doc_id: req.inputs.doc_id,
            classification: "private-verified",
          }),
        },
        {
          id: "com.example.human-pickup-task",
          name: "Warehouse Pickup Task",
          version: "1.1.0",
          capability_type: "task",
          execution_mode: "human_in_the_loop",
          description:
            "Asynchronous human-assisted warehouse pickup with non-monetary status polling.",
          inputs: [
            {
              name: "parcel_ref",
              type: "string",
              description: "Parcel identifier",
              required: true,
            },
          ],
          output: { content_type: "application/json" },
          auth: { type: "none" },
          access: "public",
          pollsBeforeCompletion: 2,
          handler: async (req) => ({
            parcel_ref: req.inputs.parcel_ref,
            handled_by: "human_operator_dispatch",
            settlement: "non_monetary_ssp_1_0",
          }),
        },
        {
          id: "com.example.slow-skill",
          name: "Slow Skill",
          version: "1.0.0",
          capability_type: "api",
          description: "Simulates execution exceeding caller timeout.",
          inputs: [],
          output: { content_type: "application/json" },
          auth: { type: "none" },
          access: "public",
          timeoutMs: 80,
          handler: async () => {
            await new Promise((r) => setTimeout(r, 250));
            return { ok: true };
          },
        },
      ],
    });

    await provider.start();
    mirror = new SkillRegistryMirror();
    await mirror.start();
  });

  afterEach(async () => {
    await mirror.stop();
    await provider.stop();
  });

  it("discovers signed SkillIndex via /.well-known/skill-sharing, hides private skills when unauthenticated, and invokes public skill", async () => {
    const consumer = new SspHttpConsumer({
      caller: { id: "ifay_alice234567", type: "ifay" },
      allowHttpLoopback: true,
    });

    const discovery = await consumer.discoverOrigin(provider.origin);
    expect(discovery.trust_status).toBe("verified");
    const ids = discovery.index.skills.map((s) => s.id);
    expect(ids).toContain("com.example.public-echo");
    expect(ids).toContain("com.example.restricted-translate");
    expect(ids).not.toContain("com.example.private-vault");

    const descResult = await consumer.fetchDescriptor(
      `${provider.origin}/skills/com.example.public-echo`
    );
    expect(descResult.trust_status).toBe("verified");

    const invocation = await consumer.invokeSkill(
      descResult.descriptor,
      { message: "hello ssp 1.0" },
      { mandateRef: "mandate_fap_2026_101" }
    );
    expect(invocation.status).toBe("completed");
    expect(invocation.output).toEqual({
      echoed: "hello ssp 1.0",
      mandate_ref: "mandate_fap_2026_101",
    });
  });

  it("enforces mandatory 401/403 endpoint auth on BOTH private and restricted skills (never index-hiding alone)", async () => {
    const anonConsumer = new SspHttpConsumer({
      caller: { id: "ifay_alice234567", type: "ifay" },
      allowHttpLoopback: true,
    });

    // Direct URL guess on private descriptor MUST fail with 401 AUTH_REQUIRED
    await expect(
      anonConsumer.fetchDescriptor(
        `${provider.origin}/skills/com.example.private-vault`
      )
    ).rejects.toMatchObject({
      httpStatus: 401,
      errorResponse: {
        error: { code: "AUTH_REQUIRED" },
      },
    });

    // Direct URL fetch on restricted descriptor without credentials MUST fail with 401 AUTH_REQUIRED
    await expect(
      anonConsumer.fetchDescriptor(
        `${provider.origin}/skills/com.example.restricted-translate`
      )
    ).rejects.toMatchObject({
      httpStatus: 401,
      errorResponse: {
        error: {
          code: "AUTH_REQUIRED",
          details: expect.objectContaining({
            required_auth_type: "oauth2",
            authorization_url: "https://auth.example.org/authorize",
          }),
        },
      },
    });

    // Limited scope token (bob lacks skill:invoke) -> 403 PERMISSION_DENIED on restricted descriptor/invoke
    const bobConsumer = new SspHttpConsumer({
      caller: { id: "ifay_bob234567", type: "ifay" },
      allowHttpLoopback: true,
    });
    await expect(
      bobConsumer.fetchDescriptor(
        `${provider.origin}/skills/com.example.restricted-translate`,
        { credentials: { bearerToken: "ssp_tok_bob_limited" } }
      )
    ).rejects.toMatchObject({
      httpStatus: 403,
      errorResponse: {
        error: { code: "PERMISSION_DENIED" },
      },
    });

    // Authorized Bearer token + matching FayID -> 200 descriptor & 202->completed invocation
    const aliceDesc = await anonConsumer.fetchDescriptor(
      `${provider.origin}/skills/com.example.restricted-translate`,
      { credentials: { bearerToken: "ssp_tok_alice_full" } }
    );
    expect(aliceDesc.trust_status).toBe("verified");
    const translated = await anonConsumer.invokeSkill(
      aliceDesc.descriptor,
      { text: "Good morning" },
      { credentials: { bearerToken: "ssp_tok_alice_full" } }
    );
    expect(translated.status).toBe("completed");
    expect(translated.output).toEqual({ translated: "[zh-CN] Good morning" });

    // Authorized API Key + coFay caller with organization_id accesses private skill
    const cofayConsumer = new SspHttpConsumer({
      caller: {
        id: "cofay_opsagent2345",
        type: "cofay",
        organization_id: "org_ifay-ops",
      },
      allowHttpLoopback: true,
    });
    const authDiscovery = await cofayConsumer.discoverOrigin(provider.origin, {
      credentials: { apiKey: "ssp_example_placeholder_key_ops", apiKeyHeader: "X-API-Key" },
    });
    expect(authDiscovery.index.skills.map((s) => s.id)).toContain(
      "com.example.private-vault"
    );

    const vaultDesc = await cofayConsumer.fetchDescriptor(
      `${provider.origin}/skills/com.example.private-vault`,
      { credentials: { apiKey: "ssp_example_placeholder_key_ops", apiKeyHeader: "X-API-Key" } }
    );
    const vaultRes = await cofayConsumer.invokeSkill(
      vaultDesc.descriptor,
      { doc_id: "doc-42" },
      { credentials: { apiKey: "ssp_example_placeholder_key_ops", apiKeyHeader: "X-API-Key" } }
    );
    expect(vaultRes.status).toBe("completed");
    expect(vaultRes.output).toEqual({
      doc_id: "doc-42",
      classification: "private-verified",
    });

    // Anti-spoofing: Alice's token used by a consumer claiming Bob's FayID -> 403 PERMISSION_DENIED
    const spoofingConsumer = new SspHttpConsumer({
      caller: { id: "ifay_bob234567", type: "ifay" },
      allowHttpLoopback: true,
    });
    await expect(
      spoofingConsumer.invokeSkill(
        aliceDesc.descriptor,
        { text: "Spoof" },
        { credentials: { bearerToken: "ssp_tok_alice_full" } }
      )
    ).rejects.toMatchObject({
      httpStatus: 403,
      errorResponse: { error: { code: "PERMISSION_DENIED" } },
    });
  });

  it("supports asynchronous status polling for task capability without monetary settlement", async () => {
    const consumer = new SspHttpConsumer({
      caller: { id: "ifay_alice234567", type: "ifay" },
      allowHttpLoopback: true,
    });

    const taskDiscovery = await consumer.discoverOrigin(provider.origin, {
      capabilityType: "task",
    });
    expect(taskDiscovery.index.skills).toHaveLength(1);
    expect(taskDiscovery.index.skills[0].id).toBe("com.example.human-pickup-task");

    const { descriptor } = await consumer.fetchDescriptor(
      taskDiscovery.index.skills[0].descriptor_url
    );
    expect(descriptor.execution_mode).toBe("human_in_the_loop");

    // Step-by-step non-blocking submission + status polling
    const accepted = await consumer.invokeSkill(
      descriptor,
      { parcel_ref: "PKG-900" },
      { pollUntilTerminal: false }
    );
    expect(accepted.status).toBe("accepted");

    const poll1 = await consumer.pollInvocationStatus(
      descriptor,
      accepted.execution_id
    );
    expect(poll1.status).toBe("running");

    const poll2 = await consumer.pollInvocationStatus(
      descriptor,
      accepted.execution_id
    );
    expect(poll2.status).toBe("completed");
    expect(poll2.output).toEqual({
      parcel_ref: "PKG-900",
      handled_by: "human_operator_dispatch",
      settlement: "non_monetary_ssp_1_0",
    });
  });

  it("enforces same-MAJOR version compatibility and SSP-Supported-Versions negotiation", async () => {
    const v2Consumer = new SspHttpConsumer({
      consumerVersion: "2.0",
      caller: { id: "ifay_alice234567", type: "ifay" },
      allowHttpLoopback: true,
    });

    await expect(v2Consumer.discoverOrigin(provider.origin)).rejects.toMatchObject({
      httpStatus: 422,
      errorResponse: { error: { code: "VERSION_INCOMPATIBLE" } },
    });

    // Minor forward compatibility: 1.2 provider descriptor accepted by 1.0 consumer
    const minorProvider = new SspHttpProvider({
      protocolVersion: "1.2",
      provider: { name: "Minor Upgrade Provider", fay_id: providerFayId },
      signingKey: {
        kid: providerKid,
        privateKey: keyPair.privateKey,
        publicKey: keyPair.publicKey,
      },
      skills: [
        {
          id: "com.example.minor-1-2",
          name: "Minor 1.2 Skill",
          version: "1.0.0",
          capability_type: "api",
          description: "Forward compatible 1.2 descriptor",
          inputs: [],
          output: { content_type: "application/json" },
          auth: { type: "none" },
          access: "public",
          handler: async () => ({ version_ok: true }),
        },
      ],
    });
    await minorProvider.start();
    try {
      const v1Consumer = new SspHttpConsumer({
        consumerVersion: "1.0",
        caller: { id: "ifay_alice234567", type: "ifay" },
        allowHttpLoopback: true,
      });
      const disc = await v1Consumer.discoverOrigin(minorProvider.origin);
      expect(disc.index.protocol.version).toBe("1.2");
      const { descriptor } = await v1Consumer.fetchDescriptor(
        disc.index.skills[0].descriptor_url
      );
      const res = await v1Consumer.invokeSkill(descriptor, {});
      expect(res.status).toBe("completed");
      expect(res.output).toEqual({ version_ok: true });
    } finally {
      await minorProvider.stop();
    }
  });

  it("verifies provider JWS end-to-end across SkillRegistryMirror and blocks tampered mirror entries", async () => {
    const consumer = new SspHttpConsumer({
      caller: { id: "ifay_alice234567", type: "ifay" },
      allowHttpLoopback: true,
    });

    const { descriptor } = await consumer.fetchDescriptor(
      `${provider.origin}/skills/com.example.public-echo`
    );
    mirror.publishDescriptor(descriptor);

    // 1. Intact pass-through mirror: end-to-end JWS verification succeeds
    const mirrored = await consumer.discoverFromRegistry(mirror.origin, {
      capabilityType: "api",
    });
    expect(mirrored).toHaveLength(1);
    expect(mirrored[0].trust_status).toBe("verified");
    const invoked = await consumer.invokeSkill(mirrored[0].descriptor, {
      message: "via registry mirror",
    });
    expect(invoked.output).toEqual({
      echoed: "via registry mirror",
      mandate_ref: null,
    });

    // 2. Compromised mirror mutates cached descriptor -> JWS verification fails & Default-Deny blocks invoke
    mirror.tamperDescriptor("com.example.public-echo", (d) => ({
      ...d,
      description: "Silent registry injection",
    }));
    const tamperedResults = await consumer.discoverFromRegistry(mirror.origin);
    expect(tamperedResults[0].trust_status).toBe("unverified");
    expect(tamperedResults[0].verification.reason).toBe("INVALID_JWS_SIGNATURE");

    await expect(
      consumer.invokeSkill(tamperedResults[0].descriptor, { message: "blocked" })
    ).rejects.toBeInstanceOf(SspProtocolError);
  });

  it("handles execution timeout and unreachable endpoints with structured SSP errors", async () => {
    const consumer = new SspHttpConsumer({
      caller: { id: "ifay_alice234567", type: "ifay" },
      allowHttpLoopback: true,
      retryBackoffMs: 10,
      maxRetries: 2,
    });

    const { descriptor: slowDesc } = await consumer.fetchDescriptor(
      `${provider.origin}/skills/com.example.slow-skill`
    );
    const timedOut = await consumer.invokeSkill(
      slowDesc,
      {},
      { timeoutMs: 50, pollIntervalMs: 25 }
    );
    expect(timedOut.status).toBe("timeout");
    expect(timedOut.error?.code).toBe("INVOCATION_TIMEOUT");
    expect(timedOut.error?.retry).toBeDefined();

    // Unreachable port
    const unsignedDeadDescriptor: SkillDescriptor = {
      ...slowDesc,
      provider: {
        name: "Dead Provider",
        fay_id: providerFayId,
        url: "http://127.0.0.1:1",
      },
      endpoint: {
        url: "http://127.0.0.1:1/skills/dead/invoke",
        method: "POST",
      },
    };
    const signedDead = signSkillResource(unsignedDeadDescriptor, {
      kid: providerKid,
      privateKey: keyPair.privateKey,
    });

    await expect(
      consumer.fetchDescriptor("http://127.0.0.1:1/skills/dead")
    ).rejects.toMatchObject({
      errorResponse: {
        error: { code: "ENDPOINT_UNREACHABLE" },
      },
    });

    // Also verify Default-Deny blocks unsigned descriptor before network call
    const unsignedCopy: SkillDescriptor = { ...signedDead };
    delete unsignedCopy.proof;
    await expect(consumer.invokeSkill(unsignedCopy, {})).rejects.toMatchObject({
      errorResponse: {
        error: { code: "PERMISSION_DENIED" },
      },
    });
  });
});
