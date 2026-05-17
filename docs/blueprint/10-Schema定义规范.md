# 第十章：Schema 定义规范

## 10.1 概述

协议通过三种格式的 Schema 定义文件为开发者提供机器可读的规范，支持自动化验证和代码生成。

## 10.2 交付物

| 文件 | 格式 | 用途 |
|------|------|------|
| `schema.json` | JSON Schema Draft 2020-12 | 自动化验证、代码生成 |
| `schema.ts` | TypeScript 类型定义 | 开发时类型检查、IDE 支持 |
| `schema.mdx` | MDX 交互式文档 | 人类可读文档、交互式示例 |

## 10.3 JSON Schema 规范

### 基本结构

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://skill-sharing.org/schema/draft/schema.json",
  "title": "Skill Sharing Protocol Schema",
  "description": "技能共享协议的完整 Schema 定义",
  "$defs": {
    "CapabilityType": { ... },
    "AccessPolicy": { ... },
    "AuthType": { ... },
    "ParameterDefinition": { ... },
    "SkillDescriptor": { ... },
    "SkillIndex": { ... },
    "InvocationRequest": { ... },
    "InvocationResponse": { ... }
  }
}
```

### TypeScript 到 JSON Schema 映射规则

| TypeScript | JSON Schema |
|-----------|-------------|
| `string` | `{ "type": "string" }` |
| `number` | `{ "type": "number" }` |
| `boolean` | `{ "type": "boolean" }` |
| 联合类型 `"a" \| "b"` | `{ "enum": ["a", "b"] }` |
| `interface` | `{ "type": "object", "properties": {...} }` |
| 可选字段 `field?` | 不在 `required` 数组中 |
| `Record<string, T>` | `{ "type": "object", "additionalProperties": {...} }` |
| `unknown` | `{}` (无约束) |

## 10.4 TypeScript 类型定义

TypeScript 类型定义文件（`schema.ts`）与 JSON Schema 保持语义一致，提供：

- 所有枚举类型定义
- 所有接口定义
- 完整的类型导出
- JSDoc 注释说明

## 10.5 MDX 交互式文档

MDX 文档（`schema.mdx`）包含：

- Schema 概述和使用指南
- 各数据模型的字段说明表
- 有效描述符示例
- 无效描述符示例（展示常见错误）
- JSON Schema 与 TypeScript 类型的对照表

## 10.6 版本化目录结构

```
schema/
├── draft/                    # 开发中的草稿版本
│   ├── schema.json
│   ├── schema.ts
│   └── schema.mdx
└── 2025-10-25/              # 已发布的稳定版本
    ├── schema.json
    ├── schema.ts
    └── schema.mdx
```

规则：
- `draft/` 目录始终包含最新的开发版本
- 发布新版本时，将 draft 内容复制到以日期命名的版本目录
- JSON Schema 更新时，必须同步更新 TypeScript 类型定义和 MDX 文档

## 10.7 Schema 验证器

Schema 验证器基于 `schema.json` 对任意技能描述符文档进行合规性验证：

- 使用 ajv 库加载 JSON Schema
- 验证文档结构完整性
- 检查枚举字段值域
- 返回详细的错误信息（字段路径、期望值、实际值）
- 支持解析（JSON → 对象）和序列化（对象 → Pretty Print JSON）
