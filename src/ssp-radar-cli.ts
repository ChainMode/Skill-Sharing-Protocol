#!/usr/bin/env node
/**
 * `ssp-radar <url>` CLI — Decentralized SSP 1.0 Discovery, JWS Verifier & Invoker
 */

import { runSspRadar } from "./radar.js";
import type { CapabilityType } from "../schema/draft/schema.js";

const USAGE = `Usage:
  ssp-radar <origin-or-well-known-url> [--type <plugin|api|knowledge|task>] [--token <bearer>] [--api-key <key>] [--caller <fay_id>] [--invoke <skill_id>] [--inputs '<json>']
`;

function getFlag(argv: string[], flag: string): string | undefined {
  const idx = argv.indexOf(flag);
  if (idx >= 0 && idx + 1 < argv.length) {
    return argv[idx + 1];
  }
  return undefined;
}

export async function runSspRadarCli(
  argv: string[] = process.argv.slice(2)
): Promise<number> {
  const target = argv[0];
  if (!target || target === "--help" || target === "-h" || target === "help") {
    console.log(USAGE);
    return 0;
  }

  const typeFilter = getFlag(argv, "--type") as CapabilityType | undefined;
  const bearerToken = getFlag(argv, "--token");
  const apiKey = getFlag(argv, "--api-key");
  const callerId = getFlag(argv, "--caller");
  const invokeSkillId = getFlag(argv, "--invoke");
  const rawInputs = getFlag(argv, "--inputs");
  const invokeInputs = rawInputs
    ? (JSON.parse(rawInputs) as Record<string, unknown>)
    : undefined;

  const report = await runSspRadar(target, {
    callerId,
    capabilityType: typeFilter,
    credentials:
      bearerToken || apiKey
        ? {
            ...(bearerToken ? { bearerToken } : {}),
            ...(apiKey ? { apiKey } : {}),
          }
        : undefined,
    invokeSkillId,
    invokeInputs,
  });

  console.log(
    JSON.stringify(
      {
        origin: report.origin,
        provider: report.provider,
        indexTrustStatus: report.indexTrustStatus,
        discoveredCount: report.discoveredCount,
        skills: report.skills,
        ...(report.invocation ? { invocation: report.invocation } : {}),
      },
      null,
      2
    )
  );
  return report.indexTrustStatus === "verified" ? 0 : 2;
}

const isMain =
  process.argv[1] &&
  (process.argv[1].endsWith("ssp-radar-cli.js") ||
    process.argv[1].endsWith("ssp-radar"));

if (isMain) {
  runSspRadarCli().then(
    (code) => {
      if (code !== 0) process.exitCode = code;
    },
    (err) => {
      console.error(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  );
}
