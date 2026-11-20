#!/usr/bin/env node
/**
 * `ssp-publisher` CLI — One-Command MCP & OpenAPI to Signed SSP 1.0 Publisher
 */

import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import {
  convertMcpToolsToSkillDescriptors,
  convertOpenApiToSkillDescriptors,
  convertSkillDescriptorsToMcpTools,
  createDeterministicSigner,
  createSspWellKnownHandler,
  type McpToolsListPayload,
  type OpenApiDocument,
} from "./publisher.js";
import { runSspPublisherDemo } from "./demo.js";
import type { SkillDescriptor } from "../schema/draft/schema.js";

const USAGE = `Usage:
  ssp-publisher demo
  ssp-publisher from-mcp     --input <mcp-tools.json> [--fay-id <id>] [--origin <url>] [--seed <secret>] [--out <file.json>]
  ssp-publisher from-openapi --input <openapi.json>   [--fay-id <id>] [--origin <url>] [--seed <secret>] [--out <file.json>]
  ssp-publisher to-mcp       --input <ssp-skills.json> [--out <file.json>]
  ssp-publisher serve        --from-mcp <mcp-tools.json> [--port <port>] [--fay-id <id>] [--seed <secret>]
`;

function getFlag(argv: string[], flag: string): string | undefined {
  const idx = argv.indexOf(flag);
  if (idx >= 0 && idx + 1 < argv.length) {
    return argv[idx + 1];
  }
  return undefined;
}

export async function runSspPublisherCli(
  argv: string[] = process.argv.slice(2)
): Promise<number> {
  const cmd = argv[0];
  if (!cmd || cmd === "help" || cmd === "--help" || cmd === "-h") {
    console.log(USAGE);
    return 0;
  }

  if (cmd === "demo") {
    await runSspPublisherDemo();
    return 0;
  }

  const fayId = getFlag(argv, "--fay-id") ?? "cofay_ssppublishercli23456";
  const origin = getFlag(argv, "--origin") ?? "https://skills.example.com";
  const seedStr = getFlag(argv, "--seed") ?? "default-ssp-publisher-cli-seed";
  const seedBytes = createHash("sha256").update(seedStr, "utf-8").digest();
  const signer = createDeterministicSigner(fayId, seedBytes, "key-1");

  if (cmd === "from-mcp") {
    const inputPath = getFlag(argv, "--input");
    if (!inputPath) {
      console.error("Error: --input <mcp-tools.json> is required");
      return 1;
    }
    const raw = JSON.parse(readFileSync(inputPath, "utf-8")) as McpToolsListPayload;
    const descriptors = convertMcpToolsToSkillDescriptors(raw, {
      provider: { name: "SSP MCP Publisher", fay_id: fayId, url: origin },
      signer,
    });
    const outJson = JSON.stringify(descriptors, null, 2);
    const outPath = getFlag(argv, "--out");
    if (outPath) {
      writeFileSync(outPath, outJson, "utf-8");
    } else {
      console.log(outJson);
    }
    return 0;
  }

  if (cmd === "from-openapi") {
    const inputPath = getFlag(argv, "--input");
    if (!inputPath) {
      console.error("Error: --input <openapi.json> is required");
      return 1;
    }
    const raw = JSON.parse(readFileSync(inputPath, "utf-8")) as OpenApiDocument;
    const descriptors = convertOpenApiToSkillDescriptors(raw, {
      provider: {
        name: raw.info?.title ?? "SSP OpenAPI Publisher",
        fay_id: fayId,
        url: origin,
      },
      signer,
    });
    const outJson = JSON.stringify(descriptors, null, 2);
    const outPath = getFlag(argv, "--out");
    if (outPath) {
      writeFileSync(outPath, outJson, "utf-8");
    } else {
      console.log(outJson);
    }
    return 0;
  }

  if (cmd === "to-mcp") {
    const inputPath = getFlag(argv, "--input");
    if (!inputPath) {
      console.error("Error: --input <ssp-skills.json> is required");
      return 1;
    }
    const parsed = JSON.parse(readFileSync(inputPath, "utf-8")) as
      | SkillDescriptor
      | SkillDescriptor[];
    const list = Array.isArray(parsed) ? parsed : [parsed];
    const mcp = convertSkillDescriptorsToMcpTools(list);
    const outJson = JSON.stringify(mcp, null, 2);
    const outPath = getFlag(argv, "--out");
    if (outPath) {
      writeFileSync(outPath, outJson, "utf-8");
    } else {
      console.log(outJson);
    }
    return 0;
  }

  if (cmd === "serve") {
    const mcpPath = getFlag(argv, "--from-mcp");
    if (!mcpPath) {
      console.error("Error: --from-mcp <mcp-tools.json> is required");
      return 1;
    }
    const port = Number(getFlag(argv, "--port") ?? "0");
    const rawMcp = JSON.parse(readFileSync(mcpPath, "utf-8")) as McpToolsListPayload;

    let activeHandler: ReturnType<typeof createSspWellKnownHandler> | null = null;
    const srv = createServer((req, res) => {
      if (activeHandler) void activeHandler(req, res);
    });
    await new Promise<void>((resolvePromise, rejectPromise) => {
      srv.once("error", rejectPromise);
      srv.listen(port, "127.0.0.1", () => resolvePromise());
    });
    const addr = srv.address() as AddressInfo;
    const boundOrigin = `http://127.0.0.1:${addr.port}`;
    const descriptors = convertMcpToolsToSkillDescriptors(rawMcp, {
      provider: { name: "SSP Live Server", fay_id: fayId, url: boundOrigin },
      signer,
    });
    activeHandler = createSspWellKnownHandler({
      provider: { name: "SSP Live Server", fay_id: fayId, url: boundOrigin },
      skills: descriptors,
      signer,
    });
    console.log(
      JSON.stringify({
        status: "listening",
        origin: boundOrigin,
        wellKnownUrl: `${boundOrigin}/.well-known/skill-sharing`,
        skillCount: descriptors.length,
      })
    );
    process.on("SIGINT", () => {
      srv.close(() => process.exit(0));
    });
    return 0;
  }

  console.error(`Unknown command: ${cmd}`);
  console.error(USAGE);
  return 1;
}

const isMain =
  process.argv[1] &&
  (process.argv[1].endsWith("ssp-publisher-cli.js") ||
    process.argv[1].endsWith("ssp-publisher"));

if (isMain) {
  runSspPublisherCli().then(
    (code) => {
      if (code !== 0) process.exitCode = code;
    },
    (err) => {
      console.error(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  );
}
