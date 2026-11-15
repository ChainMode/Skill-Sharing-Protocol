import { describe, it, expect } from "vitest";
import { filterByAccess, filterByCapabilityType, validateUniqueIds } from "./discovery.js";
import type { SkillIndexEntry } from "../schema/draft/schema.js";

function createEntry(overrides?: Partial<SkillIndexEntry>): SkillIndexEntry {
  return {
    id: "skill-001",
    name: "Test Skill",
    capability_type: "api",
    description: "A test skill",
    descriptor_url: "https://example.com/skills/001",
    access: "public",
    version: "1.0.0",
    ...overrides,
  };
}

describe("filterByAccess", () => {
  const skills: SkillIndexEntry[] = [
    createEntry({ id: "pub-1", access: "public" }),
    createEntry({ id: "res-1", access: "restricted" }),
    createEntry({ id: "priv-1", access: "private" }),
    createEntry({ id: "pub-2", access: "public" }),
    createEntry({ id: "priv-2", access: "private" }),
  ];

  it("should return all skills when authenticated", () => {
    const result = filterByAccess(skills, true);
    expect(result).toEqual(skills);
    expect(result).toHaveLength(5);
  });

  it("should exclude private skills when not authenticated", () => {
    const result = filterByAccess(skills, false);
    expect(result).toHaveLength(3);
    expect(result.every((s) => s.access !== "private")).toBe(true);
  });

  it("should keep public and restricted skills when not authenticated", () => {
    const result = filterByAccess(skills, false);
    const ids = result.map((s) => s.id);
    expect(ids).toContain("pub-1");
    expect(ids).toContain("res-1");
    expect(ids).toContain("pub-2");
  });

  it("should return empty array for empty input", () => {
    expect(filterByAccess([], true)).toEqual([]);
    expect(filterByAccess([], false)).toEqual([]);
  });

  it("should return empty array when all skills are private and not authenticated", () => {
    const allPrivate = [
      createEntry({ id: "p1", access: "private" }),
      createEntry({ id: "p2", access: "private" }),
    ];
    expect(filterByAccess(allPrivate, false)).toEqual([]);
  });
});

describe("filterByCapabilityType", () => {
  const skills: SkillIndexEntry[] = [
    createEntry({ id: "s1", capability_type: "api" }),
    createEntry({ id: "s2", capability_type: "plugin" }),
    createEntry({ id: "s3", capability_type: "api" }),
    createEntry({ id: "s4", capability_type: "knowledge" }),
    createEntry({ id: "s5", capability_type: "task" }),
  ];

  it("should return only skills matching the given type", () => {
    const result = filterByCapabilityType(skills, "api");
    expect(result).toHaveLength(2);
    expect(result.every((s) => s.capability_type === "api")).toBe(true);
  });

  it("should return single match for unique type", () => {
    const result = filterByCapabilityType(skills, "knowledge");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("s4");
  });

  it("should return empty array when no skills match", () => {
    const apiOnly = [createEntry({ id: "a1", capability_type: "api" })];
    expect(filterByCapabilityType(apiOnly, "task")).toEqual([]);
  });

  it("should return empty array for empty input", () => {
    expect(filterByCapabilityType([], "api")).toEqual([]);
  });
});

describe("validateUniqueIds", () => {
  it("should return true when all IDs are unique", () => {
    const skills = [
      createEntry({ id: "a" }),
      createEntry({ id: "b" }),
      createEntry({ id: "c" }),
    ];
    expect(validateUniqueIds(skills)).toBe(true);
  });

  it("should return false when duplicate IDs exist", () => {
    const skills = [
      createEntry({ id: "a" }),
      createEntry({ id: "b" }),
      createEntry({ id: "a" }),
    ];
    expect(validateUniqueIds(skills)).toBe(false);
  });

  it("should return true for empty array", () => {
    expect(validateUniqueIds([])).toBe(true);
  });

  it("should return true for single element", () => {
    expect(validateUniqueIds([createEntry({ id: "only" })])).toBe(true);
  });
});
