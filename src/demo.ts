/**
 * Live E2E Demo for `ssp-publisher` & `ssp-radar`:
 *  1. Converts MCP `tools/list` definitions (including `public`, `restricted`, and `private` tools)
 *     into SSP 1.0 `SkillDescriptor`s in 1 call.
 *  2. Spins up an ephemeral HTTP server mounting the 3-line `createSspWellKnownHandler` middleware
 *     to serve `/.well-known/fayid`, `/.well-known/skill-sharing`, `/skills/:id`, and `/skills/:id/invoke`.
 *  3. Runs `ssp-radar` both unauthenticated (verifying JWS proofs & confirming `private` skills are
 *     hidden while `restricted` skills are auth-locked) and authenticated (discovering + invoking!).
 *  4. Demonstrates reverse MCP `tools/list` + `tools/call` bridge round-trip.
 */

import { createServer } from "node:http";
import { createHash } from "node:crypto";
import type { AddressInfo } from "node:net";
import {
  bridgeMcpCallToolToSspInvocation,
  convertMcpToolsToSkillDescriptors,
  convertSkillDescriptorsToMcpTools,
  createDeterministicSigner,
  createSspWellKnownHandler,
  type McpToolsListPayload,
} from "./publisher.js";
import { runSspRadar } from "./radar.js";
import { SspHttpConsumer } from "./http-consumer.js";

export interface SspPublisherDemoReport {
  origin: string;
  providerFayId: string;
  unauthenticatedRadar: {
    indexVerified: boolean;
    visibleSkillIds: string[];
    privateSkillHidden: boolean;
    restrictedSkillStatus: string | undefined;
    publicInvocationOutput: unknown;
  };
  authenticatedRadar: {
    visibleSkillIds: string[];
    privateInvocationOutput: unknown;
  };
  reverseMcpBridge: {
    exportedMcpToolNames: string[];
    mcpCallResult: unknown;
  };
}

export async function runSspPublisherDemo(options?: {
  silent?: boolean;
}): Promise<SspPublisherDemoReport> {
  const providerFayId = "cofay_sspdemoprovider23456";
  const seed = createHash("sha256").update("ssp-publisher-demo-seed").digest();
  const signer = createDeterministicSigner(providerFayId, seed, "key-1");

  const mcpTools: McpToolsListPayload = {
    tools: [
      {
        name: "weather_forecast",
        description: "Fetch real-time localized weather forecast for an itinerary stop",
        inputSchema: {
          type: "object",
          properties: {
            city: { type: "string", description: "Target city name" },
          },
          required: ["city"],
        },
        annotations: {
          title: "Weather Forecast",
          sspAccess: "public",
          sspCapabilityType: "api",
        },
      },
      {
        name: "partner_inventory_check",
        description: "Check partner warehouse inventory (restricted to registered callers)",
        inputSchema: {
          type: "object",
          properties: {
            sku: { type: "string", description: "Warehouse SKU" },
          },
          required: ["sku"],
        },
        annotations: {
          title: "Partner Inventory Check",
          sspAccess: "restricted",
          sspCapabilityType: "api",
        },
      },
      {
        name: "vault_audit_export",
        description: "Internal private compliance export hidden from unauthenticated radar",
        inputSchema: {
          type: "object",
          properties: {
            epoch: { type: "number", description: "Audit epoch number" },
          },
          required: ["epoch"],
        },
        annotations: {
          title: "Vault Audit Export",
          sspAccess: "private",
          sspCapabilityType: "plugin",
        },
      },
    ],
  };

  // Start ephemeral HTTP server first to bind dynamic port, then attach 3-line middleware
  let activeHandler: ReturnType<typeof createSspWellKnownHandler> | null = null;
  const server = createServer((req, res) => {
    if (activeHandler) {
      void activeHandler(req, res);
    }
  });

  await new Promise<void>((resolvePromise, rejectPromise) => {
    server.once("error", rejectPromise);
    server.listen(0, "127.0.0.1", () => resolvePromise());
  });

  try {
    const addr = server.address() as AddressInfo;
    const origin = `http://127.0.0.1:${addr.port}`;

    const convertedDescriptors = convertMcpToolsToSkillDescriptors(mcpTools, {
      provider: {
        name: "iFay Ecosystem MCP Bridge",
        fay_id: providerFayId,
        url: origin,
      },
      signer,
    });

    activeHandler = createSspWellKnownHandler({
      provider: {
        name: "iFay Ecosystem MCP Bridge",
        fay_id: providerFayId,
        url: origin,
      },
      signer,
      tokens: {
        "steward-secret-token": {
          callerFayId: "ifay_authorizedsteward234",
          scopes: ["vault:audit", "partner:inventory"],
        },
      },
      skills: convertedDescriptors.map((descriptor) => ({
        descriptor,
        requiredScopes:
          descriptor.id === "vault_audit_export"
            ? ["vault:audit"]
            : descriptor.id === "partner_inventory_check"
              ? ["partner:inventory"]
              : [],
        handler: async (req) => {
          if (req.skill_id === "weather_forecast") {
            return {
              city: req.inputs.city,
              condition: "clear_sky",
              temperature_c: 22,
            };
          }
          if (req.skill_id === "vault_audit_export") {
            return {
              epoch: req.inputs.epoch,
              records_verified: 42,
            };
          }
          return { sku: req.inputs.sku, in_stock: true };
        },
      })),
    });

    // 1. Unauthenticated ssp-radar scan + public skill invocation
    const unauthReport = await runSspRadar(origin, {
      callerId: "ifay_publicvisitor234567",
      invokeSkillId: "weather_forecast",
      invokeInputs: { city: "Shanghai" },
    });

    // 2. Authenticated ssp-radar scan + private skill invocation
    const authReport = await runSspRadar(origin, {
      callerId: "ifay_authorizedsteward234",
      credentials: { bearerToken: "steward-secret-token" },
      invokeSkillId: "vault_audit_export",
      invokeInputs: { epoch: 7 },
    });

    // 3. Reverse MCP Bridge (`tools/list` + `tools/call` -> SSP invocation)
    const reverseMcpList = convertSkillDescriptorsToMcpTools(
      Object.values(unauthReport.descriptors)
    );
    const mcpConsumer = new SspHttpConsumer({
      caller: { id: "ifay_mcpbridgeclient23456", type: "ifay" },
      allowHttpLoopback: true,
    });
    const mcpCallRes = await bridgeMcpCallToolToSspInvocation(
      { name: "weather_forecast", arguments: { city: "Hangzhou" } },
      mcpConsumer,
      unauthReport.descriptors
    );

    const report: SspPublisherDemoReport = {
      origin,
      providerFayId,
      unauthenticatedRadar: {
        indexVerified: unauthReport.indexVerification.verified,
        visibleSkillIds: unauthReport.skills.map((s) => s.id),
        privateSkillHidden: !unauthReport.skills.some(
          (s) => s.id === "vault_audit_export"
        ),
        restrictedSkillStatus: unauthReport.skills.find(
          (s) => s.id === "partner_inventory_check"
        )?.trust_status,
        publicInvocationOutput: unauthReport.invocation?.output,
      },
      authenticatedRadar: {
        visibleSkillIds: authReport.skills.map((s) => s.id),
        privateInvocationOutput: authReport.invocation?.output,
      },
      reverseMcpBridge: {
        exportedMcpToolNames: reverseMcpList.tools.map((t) => t.name),
        mcpCallResult: mcpCallRes.structuredContent,
      },
    };

    if (!options?.silent) {
      console.log("=== SSP 1.0 One-Click Publisher, MCP Bridge & Skill Radar Demo ===");
      console.log(JSON.stringify(report, null, 2));
    }

    return report;
  } finally {
    await new Promise<void>((resolvePromise) => server.close(() => resolvePromise()));
  }
}
