import { describe, it, expect } from "vitest";
import {
  SSP_PROTOCOL_TOKEN,
  SSP_PROTOCOL_VERSION,
  parseProtocolVersion,
  formatProtocolToken,
  parseSupportedVersionsHeader,
  selectCompatibleVersion,
  isCompatible,
  parseSkillSemVer,
} from "./version.js";

describe("parseProtocolVersion (SSP 1.0 two-segment MAJOR.MINOR)", () => {
  it("exposes canonical ssp/1.0 constants", () => {
    expect(SSP_PROTOCOL_TOKEN).toBe("ssp");
    expect(SSP_PROTOCOL_VERSION).toBe("1.0");
    expect(formatProtocolToken({ major: 1, minor: 0 })).toBe("ssp/1.0");
    expect(formatProtocolToken("1.2")).toBe("ssp/1.2");
  });

  it("parses valid bare MAJOR.MINOR strings", () => {
    expect(parseProtocolVersion("1.0")).toEqual({ major: 1, minor: 0 });
    expect(parseProtocolVersion("0.0")).toEqual({ major: 0, minor: 0 });
    expect(parseProtocolVersion("12.34")).toEqual({ major: 12, minor: 34 });
  });

  it("parses valid ssp/MAJOR.MINOR wire tokens", () => {
    expect(parseProtocolVersion("ssp/1.0")).toEqual({ major: 1, minor: 0 });
    expect(parseProtocolVersion("ssp/2.5")).toEqual({ major: 2, minor: 5 });
  });

  it("rejects bare token when requirePrefix is true", () => {
    expect(() => parseProtocolVersion("1.0", { requirePrefix: true })).toThrow(
      "Invalid SSP protocol version"
    );
    expect(parseProtocolVersion("ssp/1.0", { requirePrefix: true })).toEqual({
      major: 1,
      minor: 0,
    });
  });

  it("rejects prefixed token when allowPrefix is false", () => {
    expect(() => parseProtocolVersion("ssp/1.0", { allowPrefix: false })).toThrow(
      "Invalid SSP protocol version"
    );
  });

  it("strictly rejects 3-segment SemVer PATCH format", () => {
    expect(() => parseProtocolVersion("1.0.0")).toThrow("Invalid SSP protocol version");
    expect(() => parseProtocolVersion("ssp/1.0.0")).toThrow("Invalid SSP protocol version");
  });

  it("rejects leading zeros, empty strings, foreign tokens, and pre-release tags", () => {
    expect(() => parseProtocolVersion("")).toThrow("Invalid SSP protocol version");
    expect(() => parseProtocolVersion("1")).toThrow("Invalid SSP protocol version");
    expect(() => parseProtocolVersion("01.0")).toThrow("Invalid SSP protocol version");
    expect(() => parseProtocolVersion("1.01")).toThrow("Invalid SSP protocol version");
    expect(() => parseProtocolVersion("-1.0")).toThrow("Invalid SSP protocol version");
    expect(() => parseProtocolVersion("1.0-draft")).toThrow("Invalid SSP protocol version");
    expect(() => parseProtocolVersion("http/1.0")).toThrow("Invalid SSP protocol version");
  });
});

describe("isCompatible (same-MAJOR A === X rule)", () => {
  it("returns true when versions are identical", () => {
    expect(isCompatible("1.0", "1.0")).toBe(true);
    expect(isCompatible("ssp/1.0", "1.0")).toBe(true);
  });

  it("returns true when MAJOR is equal and MINOR differs in either direction", () => {
    expect(isCompatible("1.2", "1.0")).toBe(true);
    expect(isCompatible("1.0", "1.5")).toBe(true);
  });

  it("returns false when descriptor MAJOR > consumer MAJOR", () => {
    expect(isCompatible("2.0", "1.0")).toBe(false);
  });

  it("returns false when descriptor MAJOR < consumer MAJOR (no silent cross-major acceptance)", () => {
    expect(isCompatible("1.0", "2.0")).toBe(false);
  });

  it("throws on malformed version strings", () => {
    expect(() => isCompatible("1.0.0", "1.0")).toThrow("Invalid SSP protocol version");
    expect(() => isCompatible("1.0", "bad")).toThrow("Invalid SSP protocol version");
  });
});

describe("SSP-Supported-Versions header negotiation", () => {
  it("parses comma-separated SSP-Supported-Versions header and picks highest shared MAJOR/MINOR", () => {
    const parsed = parseSupportedVersionsHeader("ssp/1.0, ssp/1.2");
    expect(parsed).toEqual([
      { major: 1, minor: 0 },
      { major: 1, minor: 2 },
    ]);
    expect(selectCompatibleVersion("1.1", "ssp/1.0, ssp/1.2")).toEqual({
      major: 1,
      minor: 1,
    });
  });

  it("returns null when no shared MAJOR exists", () => {
    expect(selectCompatibleVersion("1.0", "ssp/2.0, ssp/3.1")).toBeNull();
  });

  it("throws when SSP-Supported-Versions header is empty or malformed", () => {
    expect(() => parseSupportedVersionsHeader("   ")).toThrow(
      "SSP-Supported-Versions"
    );
    expect(() => parseSupportedVersionsHeader("ssp/1.0.0")).toThrow(
      "Invalid SSP protocol version"
    );
  });
});

describe("parseSkillSemVer (skill implementation version)", () => {
  it("parses 3-segment skill version independently of protocol version", () => {
    expect(parseSkillSemVer("2.1.0")).toEqual({ major: 2, minor: 1, patch: 0 });
  });
});
