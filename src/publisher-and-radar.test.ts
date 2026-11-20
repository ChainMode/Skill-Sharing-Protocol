import { describe, it, expect } from "vitest";
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import {
  bridgeSspInvocationToMcpCallTool,
  convertMcpToolsToSkillDescriptors,
  convertOpenApiToSkillDescriptors,
  convertSkillDescriptorsToMcpTools,
  createDeterministicSigner,
  createSspWellKnownHandler,
  exportFayIdVerificationKey,
  runSspPublisherDemo,
  runSspRadar,
  validate,
  verifySkillResource,
} from "./index.js";
import { runSspPublisherCli } from "./ssp-publisher-cli.js";
import { runSspRadarCli } from "./ssp-radar-cli.js";

describe("SSP 1.0 One-Click Publisher, MCP/OpenAPI Bridge & Skill Radar", () => {
  it("converts OpenAPI 3.1 JSON into schema-valid & Ed25519 JWS-verified SSP 1.0 SkillDescriptors", () => {
    const fayId = "cofay_openapiprovider23456";
    const origin = "https://travel.ifay.ai";
    const signer = createDeterministicSigner(
      fayId,
      createHash("sha256").update("openapi-seed").digest(),
      "key-1"
    );

    const openApiDoc = {
      openapi: "3.1.0",
      info: { title: "Flight Search API", version: "2.1.0" },
      components: {
        securitySchemes: {
          PartnerKey: { type: "apiKey", name: "X-Partner-Key", in: "header" },
        },
      },
      paths: {
        "/v1/flights/search": {
          post: {
            operationId: "search_flights",
            summary: "Search available flights",
            parameters: [
              {
                name: "cabin",
                in: "query",
                required: false,
                schema: { type: "string" },
              },
            ],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      origin_iata: { type: "string", description: "Origin airport" },
                      dest_iata: { type: "string", description: "Destination airport" },
                    },
                    required: ["origin_iata", "dest_iata"],
                  },
                },
              },
            },
            responses: {
              "200": {
                description: "Flight quotes",
                content: {
                  "application/json": {
                    schema: { type: "object", properties: { quotes: { type: "array" } } },
                  },
                },
              },
            },
          },
        },
        "/v1/flights/hold": {
          post: {
            operationId: "hold_booking",
            summary: "Hold itinerary seat",
            security: [{ PartnerKey: [] }],
            responses: { "200": { description: "Hold receipt" } },
          },
        },
      },
    };

    const descriptors = convertOpenApiToSkillDescriptors(openApiDoc, {
      provider: { name: "Flight Search API", fay_id: fayId, url: origin },
      signer,
    });

    expect(descriptors).toHaveLength(2);
    for (const desc of descriptors) {
      expect(validate(desc).valid).toBe(true);
      const verification = verifySkillResource(desc, {
        expectedOrigin: origin,
        fayIdDocument: {
          fay_id: fayId,
          origin,
          keys: [exportFayIdVerificationKey(signer.kid, signer.publicKey)],
          updated_at: new Date().toISOString(),
        },
      });
      expect(verification.verified).toBe(true);
    }

    expect(descriptors[0].access).toBe("public");
    expect(descriptors[0].inputs.map((i) => i.name)).toEqual([
      "cabin",
      "origin_iata",
      "dest_iata",
    ]);
    expect(descriptors[1].access).toBe("restricted");
    expect(descriptors[1].auth.type).toBe("api_key");
    expect(descriptors[1].auth.header).toBe("X-Partner-Key");
  });

  it("converts MCP tools <-> SSP SkillDescriptors bidirectionally and bridges invocations", async () => {
    const fayId = "ifay_mcpbidirectional23456";
    const origin = "https://mcp.ifay.ai";
    const signer = createDeterministicSigner(
      fayId,
      createHash("sha256").update("mcp-seed").digest()
    );

    const mcpTools = [
      {
        name: "calendar_free_busy",
        description: "Check free/busy blocks on calendar",
        inputSchema: {
          type: "object",
          properties: {
            date: { type: "string", description: "ISO date" },
          },
          required: ["date"],
        },
      },
    ];

    const sspList = convertMcpToolsToSkillDescriptors(mcpTools, {
      provider: { name: "Calendar MCP", fay_id: fayId, url: origin },
      signer,
    });
    expect(sspList).toHaveLength(1);
    expect(validate(sspList[0]).valid).toBe(true);

    const roundTripMcp = convertSkillDescriptorsToMcpTools(sspList);
    expect(roundTripMcp.tools).toHaveLength(1);
    expect(roundTripMcp.tools[0].name).toBe("calendar_free_busy");
    expect(roundTripMcp.tools[0].inputSchema?.required).toEqual(["date"]);

    const bridgedOut = await bridgeSspInvocationToMcpCallTool(
      {
        caller: { id: "ifay_caller234567890123", type: "ifay" },
        skill_id: "calendar_free_busy",
        inputs: { date: "2026-11-21" },
      },
      async ({ name, arguments: args }) => ({ tool: name, busySlots: 1, date: args.date })
    );
    expect(bridgedOut).toEqual({
      tool: "calendar_free_busy",
      busySlots: 1,
      date: "2026-11-21",
    });
  });

  it("createSspWellKnownHandler enforces ?type= filter, hides private skills when unauthenticated, delegates non-SSP routes via next(), and integrates with ssp-radar", async () => {
    let middleware: ReturnType<typeof createSspWellKnownHandler> | null = null;
    const server = createServer((req, res) => {
      if (!middleware) return;
      void middleware(req, res, () => {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ appRoute: req.url }));
      });
    });

    await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
    try {
      const port = (server.address() as AddressInfo).port;
      const origin = `http://127.0.0.1:${port}`;
      const fayId = "cofay_middlewaretest234567";

      middleware = createSspWellKnownHandler({
        provider: { name: "Express/Next Host", fay_id: fayId, url: origin },
        apiKeys: {
          "valid-key-123": {
            callerFayId: "ifay_partnercaller234567",
            scopes: ["secret:read"],
          },
        },
        skills: [
          {
            id: "doc_lookup",
            name: "Knowledge Lookup",
            capability_type: "knowledge",
            description: "Public docs lookup",
            access: "public",
            inputs: [
              { name: "query", type: "string", description: "Search query", required: true },
            ],
            handler: ({ inputs }) => ({ hits: [`Result for ${String(inputs.query)}`] }),
          },
          {
            id: "public_ping",
            name: "Public API Ping",
            capability_type: "api",
            description: "Public ping skill",
            access: "public",
          },
          {
            id: "internal_ledger",
            name: "Private Ledger",
            capability_type: "plugin",
            description: "Private ledger skill",
            access: "private",
            requiredScopes: ["secret:read"],
          },
        ],
      });

      // Non-SSP host route passes through via next()
      const passthroughRes = await fetch(`${origin}/healthz`);
      expect(await passthroughRes.json()).toEqual({ appRoute: "/healthz" });

      // Unauthenticated radar: sees 2 public skills, `internal_ledger` is hidden!
      const unauthRadar = await runSspRadar(origin, {
        capabilityType: "knowledge",
        invokeSkillId: "doc_lookup",
        invokeInputs: { query: "SSP 1.0" },
      });
      expect(unauthRadar.indexTrustStatus).toBe("verified");
      expect(unauthRadar.skills.map((s) => s.id)).toEqual(["doc_lookup"]);
      expect(unauthRadar.invocation?.output).toEqual({
        hits: ["Result for SSP 1.0"],
      });

      // Unauthenticated direct GET /skills/internal_ledger returns 401 (not index-hiding alone!)
      const directPrivate = await fetch(`${origin}/skills/internal_ledger`);
      expect(directPrivate.status).toBe(401);

      // Authenticated radar with X-API-Key sees all 3 skills including `internal_ledger`!
      const authRadar = await runSspRadar(origin, {
        callerId: "ifay_partnercaller234567",
        credentials: { apiKey: "valid-key-123" },
      });
      expect(authRadar.skills.map((s) => s.id).sort()).toEqual([
        "doc_lookup",
        "internal_ledger",
        "public_ping",
      ]);

      // CLI radar check against live server
      const radarExit = await runSspRadarCli([origin]);
      expect(radarExit).toBe(0);
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });

  it("ssp-publisher CLI converts MCP & OpenAPI files and runs E2E demo cleanly", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "ssp-cli-test-"));
    try {
      const mcpIn = join(tmp, "mcp.json");
      const sspOut = join(tmp, "ssp.json");
      const mcpBackOut = join(tmp, "mcp-back.json");

      writeFileSync(
        mcpIn,
        JSON.stringify({
          tools: [
            {
              name: "translate_snippet",
              description: "Translate snippet",
              inputSchema: {
                type: "object",
                properties: { text: { type: "string" } },
                required: ["text"],
              },
            },
          ],
        }),
        "utf-8"
      );

      expect(
        await runSspPublisherCli([
          "from-mcp",
          "--input",
          mcpIn,
          "--origin",
          "https://cli.ifay.ai",
          "--out",
          sspOut,
        ])
      ).toBe(0);

      const generated = JSON.parse(readFileSync(sspOut, "utf-8"));
      expect(generated).toHaveLength(1);
      expect(validate(generated[0]).valid).toBe(true);
      expect(generated[0].proof?.alg).toBe("EdDSA");

      expect(
        await runSspPublisherCli(["to-mcp", "--input", sspOut, "--out", mcpBackOut])
      ).toBe(0);
      const backMcp = JSON.parse(readFileSync(mcpBackOut, "utf-8"));
      expect(backMcp.tools[0].name).toBe("translate_snippet");

      const demoReport = await runSspPublisherDemo({ silent: true });
      expect(demoReport.unauthenticatedRadar.indexVerified).toBe(true);
      expect(demoReport.unauthenticatedRadar.privateSkillHidden).toBe(true);
      expect(demoReport.unauthenticatedRadar.restrictedSkillStatus).toBe("auth_locked");
      expect(demoReport.authenticatedRadar.visibleSkillIds).toContain("vault_audit_export");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
