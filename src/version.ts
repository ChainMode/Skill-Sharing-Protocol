/**
 * Protocol Version Management (SSP 1.0)
 *
 * Implements two-segment protocol version parsing (MAJOR.MINOR and ssp/MAJOR.MINOR),
 * same-MAJOR compatibility checking (descriptor.major === consumer.major),
 * and stateless SSP-Supported-Versions HTTP header evaluation.
 */

export const SSP_PROTOCOL_TOKEN = "ssp";
export const SSP_PROTOCOL_VERSION = "1.0";
export const SSP_PROTOCOL_WIRE_TOKEN = `${SSP_PROTOCOL_TOKEN}/${SSP_PROTOCOL_VERSION}`;
export const SSP_SUPPORTED_VERSIONS_HEADER = "ssp-supported-versions";

const BARE_PROTOCOL_VERSION_REGEX = /^(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const SKILL_SEMVER_REGEX =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/;

export interface ProtocolVersionParts {
  major: number;
  minor: number;
}

export interface ParseProtocolVersionOptions {
  /** Require explicit "ssp/" prefix (e.g. HTTP wire token) */
  requirePrefix?: boolean;
  /** Allow optional "ssp/" prefix (default: true) */
  allowPrefix?: boolean;
}

export interface SkillSemVer {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  build?: string;
}

/**
 * Parse a two-segment SSP protocol version ("MAJOR.MINOR" or "ssp/MAJOR.MINOR").
 * Strictly rejects 3-segment SemVer PATCH format and leading zeros.
 */
export function parseProtocolVersion(
  version: string,
  options: ParseProtocolVersionOptions = {}
): ProtocolVersionParts {
  const { requirePrefix = false, allowPrefix = true } = options;
  if (typeof version !== "string" || version.length === 0) {
    throw new Error(
      `Invalid SSP protocol version: "${version}". Expected format: MAJOR.MINOR or ssp/MAJOR.MINOR (no PATCH)`
    );
  }

  let raw = version;
  const slashIdx = version.indexOf("/");
  if (slashIdx !== -1) {
    if (!allowPrefix) {
      throw new Error(
        `Invalid SSP protocol version: "${version}". Bare MAJOR.MINOR required without prefix`
      );
    }
    const token = version.slice(0, slashIdx);
    if (token !== SSP_PROTOCOL_TOKEN) {
      throw new Error(
        `Invalid SSP protocol version: "${version}". Unknown protocol token "${token}" (expected "${SSP_PROTOCOL_TOKEN}")`
      );
    }
    raw = version.slice(slashIdx + 1);
  } else if (requirePrefix) {
    throw new Error(
      `Invalid SSP protocol version: "${version}". Expected wire token "${SSP_PROTOCOL_TOKEN}/MAJOR.MINOR"`
    );
  }

  const match = raw.match(BARE_PROTOCOL_VERSION_REGEX);
  if (!match) {
    throw new Error(
      `Invalid SSP protocol version: "${version}". Expected two-segment MAJOR.MINOR without PATCH or leading zeros`
    );
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
  };
}

/**
 * Format a version into canonical SSP wire token ("ssp/MAJOR.MINOR").
 */
export function formatProtocolToken(
  version: ProtocolVersionParts | string
): string {
  const parts =
    typeof version === "string" ? parseProtocolVersion(version) : version;
  return `${SSP_PROTOCOL_TOKEN}/${parts.major}.${parts.minor}`;
}

/**
 * Format a version into canonical bare JSON field string ("MAJOR.MINOR").
 */
export function formatBareProtocolVersion(
  version: ProtocolVersionParts | string
): string {
  const parts =
    typeof version === "string" ? parseProtocolVersion(version) : version;
  return `${parts.major}.${parts.minor}`;
}

/**
 * Check same-MAJOR compatibility between a descriptor/index protocol version and a consumer version.
 *
 * Per SSP 1.0 (ADR 0002, OQ-SSP-2):
 *   compatible <=> descriptor.major === consumer.major (A === X)
 */
export function isCompatible(
  descriptorVersion: string,
  consumerVersion: string
): boolean {
  const descriptor = parseProtocolVersion(descriptorVersion);
  const consumer = parseProtocolVersion(consumerVersion);
  return descriptor.major === consumer.major;
}

/**
 * Parse an optional SSP-Supported-Versions HTTP header value (comma-separated non-empty list).
 */
export function parseSupportedVersionsHeader(
  headerValue: string
): ProtocolVersionParts[] {
  const tokens = headerValue
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (tokens.length === 0) {
    throw new Error(
      "Invalid SSP-Supported-Versions header: version set must not be empty"
    );
  }

  return tokens.map((token) => parseProtocolVersion(token));
}

/**
 * Select the mutually compatible version between a provider's protocol version
 * and a client's SSP-Supported-Versions header.
 * Returns null if no shared MAJOR exists.
 */
export function selectCompatibleVersion(
  providerVersion: string,
  supportedVersionsHeader: string
): ProtocolVersionParts | null {
  const provider = parseProtocolVersion(providerVersion);
  const clientVersions = parseSupportedVersionsHeader(supportedVersionsHeader);
  const sameMajor = clientVersions.filter((v) => v.major === provider.major);
  if (sameMajor.length === 0) {
    return null;
  }
  const highestClientMinor = Math.max(...sameMajor.map((v) => v.minor));
  return {
    major: provider.major,
    minor: Math.min(provider.minor, highestClientMinor),
  };
}

/**
 * Parse a 3-segment SemVer string used for SkillDescriptor.version (the skill's own version,
 * strictly orthogonal to the two-segment SSP protocol.version).
 */
export function parseSkillSemVer(version: string): SkillSemVer {
  const match = version.match(SKILL_SEMVER_REGEX);
  if (!match) {
    throw new Error(
      `Invalid skill SemVer version: "${version}". Expected MAJOR.MINOR.PATCH`
    );
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    ...(match[4] ? { prerelease: match[4] } : {}),
    ...(match[5] ? { build: match[5] } : {}),
  };
}
