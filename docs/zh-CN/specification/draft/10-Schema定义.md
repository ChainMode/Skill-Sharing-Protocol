# 10. Schema 定义

## 10.1 交付物

本协议提供三种格式的 Schema 定义文件，分为**规范源**（Normative）与**便利产物**（Informative）：

| 文件 | 性质 | 格式 | 用途 |
|------|------|------|------|
| `schema.json` | **规范源（Normative）** | JSON Schema Draft 2020-12 | 所有合规性判断的最终依据 |
| `schema.ts` | 便利产物（Informative） | TypeScript 类型定义 | 为 TypeScript 生态提供等价类型定义 |
| `schema.mdx` | 便利产物（Informative） | MDX 交互式文档 | 为人类阅读提供的交互式文档 |

**规范源唯一性原则**：当规范源（`schema.json`）与便利产物之间存在任何不一致时，**MUST** 以 `schema.json` 为准。便利产物仅为开发体验服务，不构成规范的一部分。

## 10.2 JSON Schema 基本结构

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://skill-sharing.org/schema/draft/schema.json",
  "title": "Skill Sharing Protocol Schema",
  "$defs": {
    "CapabilityType": { "enum": ["plugin", "api", "knowledge", "task"] },
    "AccessPolicy": { "enum": ["public", "restricted", "private"] },
    "AuthType": { "enum": ["none", "api_key", "oauth2", "custom"] },
    "ExecutionStatus": { "enum": ["accepted", "running", "completed", "failed", "timeout"] },
    "ProtocolVersion": { "...": "..." },
    "SkillDescriptor": { "...": "..." },
    "SkillIndex": { "...": "..." },
    "InvocationRequest": { "...": "..." },
    "InvocationResponse": { "...": "..." }
  }
}
```

完整定义见 [`schema/draft/schema.json`](../../../../schema/draft/schema.json)。

## 10.3 TypeScript 与 JSON Schema 一致性

TypeScript 类型定义（`schema.ts`）与 JSON Schema（`schema.json`）**MUST** 保持语义一致。当其中一方更新时，另一方 **MUST** 同步更新。

如发生分歧，以 `schema.json`（规范源）为准。

## 10.4 验证器要求

兼容本协议的 Schema Validator **MUST**：

1. 加载 `schema.json` 进行结构验证
2. 对无效文档返回包含字段路径（JSON Pointer）、期望值、实际值的错误信息
3. 支持解析（JSON → 结构化对象）
4. 支持序列化（结构化对象 → 格式化 JSON）
