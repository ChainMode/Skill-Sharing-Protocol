/**
 * Decentralized Skill Radar (`ssp-radar`) — Discovery, JWS Verification & Invocation Engine
 */

import {
  SspHttpConsumer,
  SspProtocolError,
  type ConsumerCredentials,
} from "./http-consumer.js";
import type {
  CallerType,
  CapabilityType,
  InvocationResponse,
  SkillDescriptor,
} from "../schema/draft/schema.js";
import type { SkillVerificationResult } from "./crypto.js";

export interface RadarSkillEntryReport {
  id: string;
  name: string;
  version: string;
  capability_type: CapabilityType;
  access: "public" | "restricted" | "private";
  descriptor_url: string;
  descriptorFetched: boolean;
  trust_status: "verified" | "unverified" | "auth_locked";
  verification?: SkillVerificationResult;
  authErrorCode?: string;
}

export interface SspRadarOptions {
  callerId?: string;
  callerType?: CallerType;
  capabilityType?: CapabilityType;
  credentials?: ConsumerCredentials;
  allowHttpLoopback?: boolean;
  invokeSkillId?: string;
  invokeInputs?: Record<string, unknown>;
}

export interface SspRadarReport {
  origin: string;
  provider: {
    name: string;
    fay_id?: string;
    url?: string;
  };
  indexTrustStatus: "verified" | "unverified";
  indexVerification: SkillVerificationResult;
  discoveredCount: number;
  skills: RadarSkillEntryReport[];
  descriptors: Record<string, SkillDescriptor>;
  invocation?: InvocationResponse;
}

/**
 * Discover, JWS-verify, and optionally invoke skills published at any `/.well-known/skill-sharing` origin.
 */
export async function runSspRadar(
  targetUrl: string,
  options: SspRadarOptions = {}
): Promise<SspRadarReport> {
  const parsedUrl = new URL(targetUrl);
  const isLoopback =
    parsedUrl.hostname === "127.0.0.1" ||
    parsedUrl.hostname === "localhost" ||
    parsedUrl.hostname === "[::1]";

  const consumer = new SspHttpConsumer({
    caller: {
      id: options.callerId ?? "ifay_radarexplorer234567",
      type: options.callerType ?? "ifay",
    },
    allowHttpLoopback: options.allowHttpLoopback ?? isLoopback,
  });

  const discovery = await consumer.discoverOrigin(parsedUrl.origin, {
    capabilityType: options.capabilityType,
    credentials: options.credentials,
  });

  const skills: RadarSkillEntryReport[] = [];
  const descriptors: Record<string, SkillDescriptor> = {};

  for (const entry of discovery.index.skills) {
    try {
      const descRes = await consumer.fetchDescriptor(entry.descriptor_url, {
        credentials: options.credentials,
        expectedOrigin: parsedUrl.origin,
      });
      descriptors[entry.id] = descRes.descriptor;
      skills.push({
        id: entry.id,
        name: entry.name,
        version: entry.version,
        capability_type: entry.capability_type,
        access: entry.access,
        descriptor_url: entry.descriptor_url,
        descriptorFetched: true,
        trust_status: descRes.trust_status,
        verification: descRes.verification,
      });
    } catch (err) {
      if (
        err instanceof SspProtocolError &&
        (err.httpStatus === 401 || err.httpStatus === 403)
      ) {
        skills.push({
          id: entry.id,
          name: entry.name,
          version: entry.version,
          capability_type: entry.capability_type,
          access: entry.access,
          descriptor_url: entry.descriptor_url,
          descriptorFetched: false,
          trust_status: "auth_locked",
          authErrorCode: err.errorResponse.error.code,
        });
      } else {
        throw err;
      }
    }
  }

  let invocation: InvocationResponse | undefined;
  if (options.invokeSkillId) {
    let targetDescriptor = descriptors[options.invokeSkillId];
    if (!targetDescriptor) {
      const directRes = await consumer.fetchDescriptor(
        `${parsedUrl.origin}/skills/${encodeURIComponent(options.invokeSkillId)}`,
        {
          credentials: options.credentials,
          expectedOrigin: parsedUrl.origin,
        }
      );
      targetDescriptor = directRes.descriptor;
      descriptors[options.invokeSkillId] = targetDescriptor;
    }
    invocation = await consumer.invokeSkill(
      targetDescriptor,
      options.invokeInputs ?? {},
      { credentials: options.credentials }
    );
  }

  return {
    origin: parsedUrl.origin,
    provider: discovery.index.provider,
    indexTrustStatus: discovery.trust_status,
    indexVerification: discovery.verification,
    discoveredCount: skills.length,
    skills,
    descriptors,
    ...(invocation ? { invocation } : {}),
  };
}
