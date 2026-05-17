# 第十章：Schema 定義規範

## 10.1 概述

協定透過三種格式的 Schema 定義檔為開發者提供機器可讀的規範，支援自動化驗證和程式碼產生。

## 10.2 交付物

| 檔案 | 格式 | 用途 |
|------|------|------|
| `schema.json` | JSON Schema Draft 2020-12 | 自動化驗證、程式碼產生 |
| `schema.ts` | TypeScript 型別定義 | 開發時型別檢查、IDE 支援 |
| `schema.mdx` | MDX 互動式文件 | 人類可讀文件、互動式範例 |

## 10.3 JSON Schema 規範

### 基本結構

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://skill-sharing.org/schema/draft/schema.json",
  "title": "Skill Sharing Protocol Schema",
  "description": "技能共享協定的完整 Schema 定義",
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

### TypeScript 到 JSON Schema 對應規則

| TypeScript | JSON Schema |
|-----------|-------------|
| `string` | `{ "type": "string" }` |
| `number` | `{ "type": "number" }` |
| `boolean` | `{ "type": "boolean" }` |
| 聯合型別 `"a" \| "b"` | `{ "enum": ["a", "b"] }` |
| `interface` | `{ "type": "object", "properties": {...} }` |
| 選用欄位 `field?` | 不在 `required` 陣列中 |
| `Record<string, T>` | `{ "type": "object", "additionalProperties": {...} }` |
| `unknown` | `{}` (無約束) |

## 10.4 TypeScript 型別定義

TypeScript 型別定義檔（`schema.ts`）與 JSON Schema 保持語意一致，提供：

- 所有列舉型別定義
- 所有介面定義
- 完整的型別匯出
- JSDoc 註解說明

## 10.5 MDX 互動式文件

MDX 文件（`schema.mdx`）包含：

- Schema 概述和使用指南
- 各資料模型的欄位說明表
- 有效描述符範例
- 無效描述符範例（展示常見錯誤）
- JSON Schema 與 TypeScript 型別的對照表

## 10.6 版本化目錄結構

```
schema/
├── draft/                    # 開發中的草稿版本
│   ├── schema.json
│   ├── schema.ts
│   └── schema.mdx
└── 2025-10-25/              # 已發佈的穩定版本
    ├── schema.json
    ├── schema.ts
    └── schema.mdx
```

規則：
- `draft/` 目錄始終包含最新的開發版本
- 發佈新版本時，將 draft 內容複製到以日期命名的版本目錄
- JSON Schema 更新時，必須同步更新 TypeScript 型別定義和 MDX 文件

## 10.7 Schema 驗證器

Schema 驗證器基於 `schema.json` 對任意技能描述符文件進行合規性驗證：

- 使用 ajv 函式庫載入 JSON Schema
- 驗證文件結構完整性
- 檢查列舉欄位值域
- 回傳詳細的錯誤資訊（欄位路徑、期望值、實際值）
- 支援解析（JSON → 物件）和序列化（物件 → Pretty Print JSON）
