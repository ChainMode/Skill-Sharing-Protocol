/**
 * Discovery - 技能索引过滤与访问控制逻辑
 *
 * 职责：
 * - 按认证状态过滤技能索引（未认证时排除 private 技能）
 * - 按能力类型过滤技能索引
 * - 验证技能 ID 唯一性
 */

import type { SkillIndexEntry, CapabilityType } from "../schema/draft/schema.js";

/**
 * 按访问控制策略过滤技能索引
 *
 * 未认证时排除 access 为 "private" 的技能；认证时返回所有技能。
 *
 * @param skills - 技能索引条目数组
 * @param authenticated - 是否已认证
 * @returns 过滤后的技能索引条目数组
 */
export function filterByAccess(
  skills: SkillIndexEntry[],
  authenticated: boolean
): SkillIndexEntry[] {
  if (authenticated) {
    return skills;
  }
  return skills.filter((skill) => skill.access !== "private");
}

/**
 * 按能力类型过滤技能索引
 *
 * @param skills - 技能索引条目数组
 * @param type - 目标能力类型
 * @returns 匹配指定能力类型的技能索引条目数组
 */
export function filterByCapabilityType(
  skills: SkillIndexEntry[],
  type: CapabilityType
): SkillIndexEntry[] {
  return skills.filter((skill) => skill.capability_type === type);
}

/**
 * 验证技能索引中所有技能 ID 是否唯一
 *
 * @param skills - 技能索引条目数组
 * @returns true 如果所有 ID 唯一，false 如果存在重复
 */
export function validateUniqueIds(skills: SkillIndexEntry[]): boolean {
  const ids = new Set<string>();
  for (const skill of skills) {
    if (ids.has(skill.id)) {
      return false;
    }
    ids.add(skill.id);
  }
  return true;
}
