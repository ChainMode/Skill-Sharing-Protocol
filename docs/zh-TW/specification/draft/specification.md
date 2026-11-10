# 技能共享協定規範

**狀態：** 草稿  
**版本：** 1.0.0  
**日期：** 2025-01-01  
**Schema：** [`schema/draft/schema.json`](../../../../schema/draft/schema.json)、[`schema/draft/schema.ts`](../../../../schema/draft/schema.ts)

---

## 目錄

1. [協定概述](#1-協定概述)
2. [術語定義](#2-術語定義)
3. [技能描述符規範](#3-技能描述符規範)
4. [發現機制規範](#4-發現機制規範)
5. [呼叫協定規範](#5-呼叫協定規範)
6. [版本管理規範](#6-版本管理規範)
7. [安全與認證規範](#7-安全與認證規範)
8. [錯誤處理規範](#8-錯誤處理規範)
9. [Schema 參考](#9-schema-參考)
10. [附錄：完整範例](#10-附錄完整範例)

---

## 1. 協定概述

### 1.1 目的

技能共享協定定義了一套去中心化的機制，用於在網際網路上發現、宣告和呼叫技能。它使技能提供者無需依賴中心化平台即可公開自身能力，並允許技能消費者（主要是 iFay 實例）自主發現和遠端呼叫這些技能。

### 1.2 設計原則

- **去中心化發現：** 技能提供者在自己的網域下宣告技能。消費者透過 Well-Known URI 和直接 URL 發現技能——無需中心化註冊表。
- **自描述性：** 每個技能透過標準化的 Skill Descriptor 文件完整描述自身的能力、介面和呼叫方式。
- **協定即規範：** 交付物是協定文件和 Schema 定義檔，而非軟體應用程式。

### 1.3 架構

協定採用去中心化的 Provider-Consumer 架構，類似於 Web 的超連結發現模型和 P2P 網路的節點發現機制。

```
┌─────────────────────────────────────────────────────┐
│              Skill Provider Domain                   │
│                                                     │
│  /.well-known/skill-sharing  ──► Skill Index        │
│       │                                             │
│       ├──► Skill Descriptor A ──► Invocation EP A   │
│       └──► Skill Descriptor B ──► Invocation EP B   │
└─────────────────────────────────────────────────────┘
        ▲                              ▲
        │ 1. Discovery                 │ 2. Invocation
        │                              │
┌───────┴──────────────────────────────┴──────────────┐
│              Skill Consumer (iFay)                    │
│                                                     │
│  Discovery Client ──► Schema Validator ──► Invoker  │
└─────────────────────────────────────────────────────┘
```

### 1.4 協定互動流程

1. **發現階段：** 消費者向提供者網域發送 `GET /.well-known/skill-sharing` 請求，接收包含所有已宣告技能參照的 Skill Index。
2. **驗證階段：** 消費者使用 Schema Validator 對每個 Skill Descriptor 進行協定 Schema 驗證。
3. **呼叫階段：** 消費者向技能的呼叫端點發送 POST 請求，接收執行 ID，並輪詢執行狀態和結果。

### 1.5 交付物

| 交付物 | 描述 |
|---|---|
| 協定規範文件 | 提供 9 種語言版本，位於 `docs/{lang}/specification/` |
| JSON Schema | `schema/{version}/schema.json` — JSON Schema Draft 2020-12 |
| TypeScript 型別定義 | `schema/{version}/schema.ts` — 嚴格的 TypeScript 介面 |
| MDX 文件 | `schema/{version}/schema.mdx` — 互動式 Schema 文件 |

---

## 2. 術語定義

| 術語 | 定義 |
|---|---|
| **iFay** | 智慧認知夥伴系統；技能共享協定的主要消費者，能夠發現和呼叫技能以增強自身能力。 |
| **Skill（技能）** | 遵循本協定宣告的可呼叫能力單元，包括但不限於外掛程式、API、知識包和任務執行能力。 |
| **Skill Provider（技能提供者）** | 在網際網路上宣告和公開技能的實體（個人、組織或自動化系統）。 |
| **Skill Consumer（技能消費者）** | 發現並呼叫技能的實體；主要為 iFay 實例。 |
| **Skill Descriptor（技能描述符）** | 遵循協定 Schema 的中繼資料文件，描述技能的能力、介面和呼叫方式。 |
| **Discovery Mechanism（發現機制）** | 技能消費者在去中心化網路中定位和發現 Skill Descriptor 的方法和流程。 |
| **Protocol Schema（協定 Schema）** | 定義 Skill Descriptor 結構的形式化規範，包含 JSON Schema、TypeScript 型別和 MDX 文件。 |
| **Skill Registry（技能註冊表）** | 選用的技能索引服務，用於加速技能發現；非協定運作的必要條件。 |
| **Invocation Endpoint（呼叫端點）** | Skill Descriptor 中宣告的遠端呼叫入口位址。 |
| **Capability Type（能力類型）** | 技能的分類識別碼：`plugin`、`api`、`knowledge` 或 `task`。 |
| **Schema Validator（Schema 驗證器）** | 根據 Protocol Schema 驗證 Skill Descriptor 合規性的工具或元件。 |
| **Protocol Version（協定版本）** | 協定規範的版本識別碼，遵循語意化版本控制。 |
| **Well-Known URI** | 標準化的發現路徑 `/.well-known/skill-sharing`，用於定位網域的 Skill Index。 |

---

## 3. 技能描述符規範

### 3.1 概述

Skill Descriptor 是協定的核心資料結構。它是一個 JSON 文件，完整描述單一技能的身分識別、能力、介面、呼叫方式和存取控制策略。

每個 Skill Descriptor 在被視為有效之前，必須（MUST）通過協定的 JSON Schema（`schema/draft/schema.json`）驗證。

### 3.2 必要欄位

有效的 Skill Descriptor 必須（MUST）包含以下所有欄位：

| 欄位 | 型別 | 描述 |
|---|---|---|
| `protocol` | `ProtocolVersion` | 該描述符所遵循的協定版本。 |
| `id` | `string` | 技能的全域唯一識別碼。 |
| `name` | `string` | 技能的人類可讀名稱。 |
| `version` | `string` | 技能版本，SemVer 格式（如 `"1.0.0"`）。 |
| `capability_type` | `CapabilityType` | 技能的能力分類。 |
| `description` | `string` | 技能功能的人類可讀描述。 |
| `provider` | `object` | 技能提供者資訊（必須包含 `name`）。 |
| `endpoint` | `InvocationEndpoint` | 呼叫端點設定。 |
| `inputs` | `ParameterDefinition[]` | 輸入參數定義陣列。 |
| `output` | `OutputDefinition` | 輸出格式定義。 |
| `auth` | `AuthConfig` | 認證設定。 |
| `access` | `AccessPolicy` | 存取控制策略。 |

### 3.3 選用欄位

| 欄位 | 型別 | 描述 |
|---|---|---|
| `tags` | `string[]` | 用於搜尋和分類的標籤。 |
| `documentation_url` | `string` | 技能文件的 URL。 |
| `created_at` | `string` | 建立時間戳記，ISO 8601 格式。 |
| `updated_at` | `string` | 最後更新時間戳記，ISO 8601 格式。 |

### 3.4 列舉型別

#### 3.4.1 CapabilityType

定義技能能力的分類。有效值：

| 值 | 描述 |
|---|---|
| `"plugin"` | 擴充功能的外掛程式。 |
| `"api"` | API 服務端點。 |
| `"knowledge"` | 知識包或資料來源。 |
| `"task"` | 任務執行能力（人工或自動化）。 |

#### 3.4.2 AccessPolicy

定義技能的存取控制策略。有效值：

| 值 | 描述 |
|---|---|
| `"public"` | 所有消費者均可無限制存取。 |
| `"restricted"` | 僅經過認證且具有適當權限的消費者可存取。 |
| `"private"` | 在未認證的發現請求中隱藏；發現和呼叫均需認證。 |

#### 3.4.3 AuthType

定義呼叫技能所需的認證方式。有效值：

| 值 | 描述 |
|---|---|
| `"api_key"` | 基於 API Key 的認證。 |
| `"oauth2"` | OAuth 2.0 認證。 |
| `"custom"` | 自訂認證機制。 |
| `"none"` | 無需認證。 |

#### 3.4.4 ExecutionStatus

定義技能呼叫的執行狀態。有效值：

| 值 | 描述 |
|---|---|
| `"accepted"` | 呼叫請求已被接受。 |
| `"running"` | 技能正在執行中。 |
| `"completed"` | 執行成功完成。 |
| `"failed"` | 執行失敗。 |
| `"timeout"` | 執行逾時。 |

### 3.5 子結構定義

#### 3.5.1 ProtocolVersion

| 欄位 | 型別 | 必要 | 描述 |
|---|---|---|---|
| `version` | `string` | 是 | SemVer 格式的版本字串（如 `"1.0.0"`）。 |
| `changelog_url` | `string` | 否 | 版本變更日誌的 URL。 |

#### 3.5.2 ParameterDefinition

| 欄位 | 型別 | 必要 | 描述 |
|---|---|---|---|
| `name` | `string` | 是 | 參數名稱。 |
| `type` | `string` | 是 | JSON Schema 型別（如 `"string"`、`"number"`、`"object"`）。 |
| `description` | `string` | 是 | 參數的人類可讀描述。 |
| `required` | `boolean` | 是 | 該參數是否為必要。 |
| `default` | `any` | 否 | 未提供參數時的預設值。 |
| `schema` | `object` | 否 | 複雜型別的巢狀 JSON Schema。 |

#### 3.5.3 InvocationEndpoint

| 欄位 | 型別 | 必要 | 描述 |
|---|---|---|---|
| `url` | `string` | 是 | 呼叫 URL。 |
| `method` | `string` | 是 | HTTP 方法。取值：`"GET"`、`"POST"`、`"PUT"`、`"DELETE"`。 |
| `content_type` | `string` | 否 | 請求內容型別。預設為 `"application/json"`。 |
| `status_url` | `string` | 否 | 狀態查詢端點範本，包含 `{execution_id}` 預留位置。 |
| `result_url` | `string` | 否 | 結果取得端點範本。 |
| `timeout_ms` | `number` | 否 | 呼叫逾時時間（毫秒）。 |
| `retry` | `object` | 否 | 重試設定，包含 `max_attempts` 和 `backoff_ms`。 |

#### 3.5.4 OutputDefinition

| 欄位 | 型別 | 必要 | 描述 |
|---|---|---|---|
| `content_type` | `string` | 是 | 輸出的 MIME 型別（如 `"application/json"`）。 |
| `schema` | `object` | 否 | 描述輸出結構的 JSON Schema。 |
| `description` | `string` | 否 | 輸出的人類可讀描述。 |

#### 3.5.5 AuthConfig

| 欄位 | 型別 | 必要 | 描述 |
|---|---|---|---|
| `type` | `AuthType` | 是 | 認證型別。 |
| `description` | `string` | 否 | 認證要求的人類可讀描述。 |
| `header` | `string` | 否 | API Key 認證的 Header 名稱。 |
| `oauth2` | `object` | 否 | OAuth 2.0 設定（當 `type` 為 `"oauth2"` 時必要）。 |
| `custom` | `object` | 否 | 自訂認證設定（當 `type` 為 `"custom"` 時必要）。 |

**OAuth2 設定：**

| 欄位 | 型別 | 必要 | 描述 |
|---|---|---|---|
| `authorization_url` | `string` | 是 | OAuth 2.0 授權 URL。 |
| `token_url` | `string` | 是 | OAuth 2.0 權杖 URL。 |
| `scopes` | `Record<string, string>` | 是 | 可用的權限範圍，以鍵值對形式表示（範圍名稱 → 描述）。 |

**自訂認證設定：**

| 欄位 | 型別 | 必要 | 描述 |
|---|---|---|---|
| `instructions` | `string` | 是 | 自訂認證流程的人類可讀說明。 |
| `parameters` | `ParameterDefinition[]` | 是 | 自訂認證所需的參數。 |

### 3.6 範例：有效的 Skill Descriptor

```json
{
  "protocol": {
    "version": "1.0.0",
    "changelog_url": "https://example.com/changelog"
  },
  "id": "example-provider/weather-forecast",
  "name": "Weather Forecast",
  "version": "2.1.0",
  "capability_type": "api",
  "description": "Provides weather forecast data for a given location and date range.",
  "provider": {
    "name": "Example Weather Co.",
    "url": "https://weather.example.com",
    "contact": "api-support@example.com"
  },
  "endpoint": {
    "url": "https://api.weather.example.com/v2/forecast",
    "method": "POST",
    "content_type": "application/json",
    "status_url": "https://api.weather.example.com/v2/status/{execution_id}",
    "result_url": "https://api.weather.example.com/v2/result/{execution_id}",
    "timeout_ms": 30000,
    "retry": {
      "max_attempts": 3,
      "backoff_ms": 1000
    }
  },
  "inputs": [
    {
      "name": "location",
      "type": "string",
      "description": "City name or coordinates (lat,lon).",
      "required": true
    },
    {
      "name": "days",
      "type": "number",
      "description": "Number of forecast days (1-14).",
      "required": false,
      "default": 7
    }
  ],
  "output": {
    "content_type": "application/json",
    "description": "JSON object containing forecast data.",
    "schema": {
      "type": "object",
      "properties": {
        "location": { "type": "string" },
        "forecasts": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "date": { "type": "string" },
              "high": { "type": "number" },
              "low": { "type": "number" },
              "condition": { "type": "string" }
            }
          }
        }
      }
    }
  },
  "auth": {
    "type": "api_key",
    "description": "Provide your API key in the X-API-Key header.",
    "header": "X-API-Key"
  },
  "access": "public",
  "tags": ["weather", "forecast", "meteorology"],
  "documentation_url": "https://weather.example.com/docs/api",
  "created_at": "2025-01-15T08:00:00Z",
  "updated_at": "2025-06-20T14:30:00Z"
}
```

---

## 4. 發現機制規範

### 4.1 概述

發現機制定義了技能消費者如何在去中心化網路中定位 Skill Descriptor。支援三種發現路徑，其中 Well-Known URI 為主要方式。

### 4.2 發現路徑

| 路徑 | 方法 | 描述 |
|---|---|---|
| **Well-Known URI** | `GET /.well-known/skill-sharing` | 主要發現方式。回傳該網域的 Skill Index。 |
| **直接 URL** | `GET {skill_descriptor_url}` | 已知 URL 時直接取得特定的 Skill Descriptor。 |
| **註冊表查詢** | `GET {registry_url}/skills?type={capability_type}` | 選用。透過 Skill Registry 進行批次技能檢索。 |

### 4.3 Well-Known URI

#### 4.3.1 路徑

```
/.well-known/skill-sharing
```

技能提供者必須（MUST）在此路徑提供 Skill Index 文件。回應的 `Content-Type` 必須（MUST）為 `application/json`。

#### 4.3.2 Skill Index 結構

Skill Index 是一個 JSON 文件，列出提供者網域下宣告的所有技能。

| 欄位 | 型別 | 必要 | 描述 |
|---|---|---|---|
| `protocol` | `ProtocolVersion` | 是 | 協定版本。 |
| `provider` | `object` | 是 | 提供者資訊（必須包含 `name`；可包含 `url`）。 |
| `skills` | `SkillIndexEntry[]` | 是 | 技能索引項目陣列。 |

#### 4.3.3 SkillIndexEntry 結構

Skill Index 中的每個項目包含技能的摘要資訊：

| 欄位 | 型別 | 必要 | 描述 |
|---|---|---|---|
| `id` | `string` | 是 | 技能的唯一識別碼。 |
| `name` | `string` | 是 | 技能的人類可讀名稱。 |
| `capability_type` | `CapabilityType` | 是 | 技能的能力分類。 |
| `description` | `string` | 是 | 技能的簡短描述。 |
| `descriptor_url` | `string` | 是 | 技能完整 Skill Descriptor 的 URL。 |
| `access` | `AccessPolicy` | 是 | 技能的存取控制策略。 |
| `version` | `string` | 是 | 技能版本。 |

#### 4.3.4 Skill ID 唯一性

單一 Skill Index 中的所有技能 ID 必須（MUST）唯一。包含重複 ID 的 Skill Index 被視為無效。

### 4.4 發現中的存取控制

當向 Well-Known URI 發起**未認證**請求時：
- `access: "private"` 的技能必須（MUST）從回應中排除。
- `access: "public"` 或 `access: "restricted"` 的技能必須（MUST）包含在回應中。

當發起**已認證**請求時：
- 所有技能（包括 `private`）均可（MAY）包含在回應中，取決於提供者的授權邏輯。

### 4.5 能力類型篩選

消費者可（MAY）按 `capability_type` 篩選 Skill Index。篩選時：
- 結果必須（MUST）僅包含 `capability_type` 與篩選值相符的項目。
- 原始索引中所有符合篩選值的項目必須（MUST）出現在結果中。

### 4.6 範例：Skill Index

```json
{
  "protocol": {
    "version": "1.0.0"
  },
  "provider": {
    "name": "Example Corp",
    "url": "https://example.com"
  },
  "skills": [
    {
      "id": "example-corp/weather-forecast",
      "name": "Weather Forecast",
      "capability_type": "api",
      "description": "Provides weather forecast data.",
      "descriptor_url": "https://example.com/skills/weather-forecast.json",
      "access": "public",
      "version": "2.1.0"
    },
    {
      "id": "example-corp/document-translator",
      "name": "Document Translator",
      "capability_type": "task",
      "description": "Translates documents between languages.",
      "descriptor_url": "https://example.com/skills/document-translator.json",
      "access": "restricted",
      "version": "1.3.0"
    },
    {
      "id": "example-corp/internal-analytics",
      "name": "Internal Analytics",
      "capability_type": "plugin",
      "description": "Internal analytics dashboard plugin.",
      "descriptor_url": "https://example.com/skills/internal-analytics.json",
      "access": "private",
      "version": "0.9.0"
    }
  ]
}
```

> **注意：** 在未認證的發現請求中，`"internal-analytics"` 項目（`access: "private"`）將從回應中排除。

---

## 5. 呼叫協定規範

### 5.1 概述

呼叫協定定義了技能消費者如何遠端呼叫已發現的技能。協定採用非同步請求-回應模式，支援狀態輪詢。

### 5.2 呼叫流程

```
Consumer                          Provider
   │                                 │
   │  POST {invocation_endpoint}     │
   │  (InvocationRequest)            │
   │────────────────────────────────►│
   │                                 │
   │  202 Accepted                   │
   │  (InvocationResponse:accepted)  │
   │◄────────────────────────────────│
   │                                 │
   │  GET {status_url}/{exec_id}     │
   │────────────────────────────────►│
   │                                 │
   │  200 OK                         │
   │  (InvocationResponse:running)   │
   │◄────────────────────────────────│
   │                                 │
   │  GET {result_url}/{exec_id}     │
   │────────────────────────────────►│
   │                                 │
   │  200 OK                         │
   │  (InvocationResponse:completed) │
   │◄────────────────────────────────│
```

### 5.3 呼叫請求

InvocationRequest 由消費者發送以發起技能執行。

| 欄位 | 型別 | 必要 | 描述 |
|---|---|---|---|
| `caller` | `object` | 是 | 呼叫者身分資訊。 |
| `caller.id` | `string` | 是 | 呼叫者的唯一識別碼。 |
| `caller.type` | `string` | 是 | 呼叫者型別（如 `"ifay"`、`"service"`、`"user"`）。 |
| `caller.credentials` | `object` | 否 | 認證憑證。 |
| `skill_id` | `string` | 是 | 目標技能的唯一識別碼。 |
| `inputs` | `Record<string, unknown>` | 是 | 以鍵值對形式表示的輸入參數。 |
| `context` | `object` | 否 | 呼叫上下文。 |
| `context.trace_id` | `string` | 否 | 分散式追蹤識別碼。 |
| `context.priority` | `string` | 否 | 執行優先順序：`"low"`、`"normal"` 或 `"high"`。 |
| `context.timeout_ms` | `number` | 否 | 用戶端逾時時間（毫秒）。 |

#### 範例：呼叫請求

```json
{
  "caller": {
    "id": "ifay-instance-001",
    "type": "ifay",
    "credentials": {
      "api_key": "sk-abc123..."
    }
  },
  "skill_id": "example-corp/weather-forecast",
  "inputs": {
    "location": "Tokyo",
    "days": 5
  },
  "context": {
    "trace_id": "trace-7f3a9b2c",
    "priority": "normal",
    "timeout_ms": 30000
  }
}
```

### 5.4 呼叫回應

InvocationResponse 由提供者在執行的每個階段回傳。

| 欄位 | 型別 | 必要 | 描述 |
|---|---|---|---|
| `execution_id` | `string` | 是 | 本次執行的唯一識別碼。 |
| `status` | `ExecutionStatus` | 是 | 目前執行狀態。 |
| `skill_id` | `string` | 是 | 目標技能的識別碼。 |
| `output` | `any` | 否 | 輸出資料（當 `status` 為 `"completed"` 時存在）。 |
| `error` | `object` | 否 | 錯誤資訊（當 `status` 為 `"failed"` 或 `"timeout"` 時存在）。 |
| `error.code` | `string` | 是* | 錯誤代碼。 |
| `error.message` | `string` | 是* | 人類可讀的錯誤訊息。 |
| `error.details` | `any` | 否 | 附加錯誤詳情。 |
| `error.retry` | `object` | 否 | 重試建議，包含 `suggested_delay_ms` 和 `max_attempts`。 |
| `timestamps` | `object` | 是 | 執行時間戳記。 |
| `timestamps.created_at` | `string` | 是 | 執行建立時間（ISO 8601）。 |
| `timestamps.updated_at` | `string` | 是 | 執行最後更新時間（ISO 8601）。 |
| `timestamps.completed_at` | `string` | 否 | 執行完成時間（ISO 8601）。 |

> \* 當 `error` 物件存在時為必要。

#### 範例：呼叫回應（已完成）

```json
{
  "execution_id": "exec-a1b2c3d4",
  "status": "completed",
  "skill_id": "example-corp/weather-forecast",
  "output": {
    "location": "Tokyo",
    "forecasts": [
      {
        "date": "2025-07-01",
        "high": 31,
        "low": 24,
        "condition": "Partly Cloudy"
      },
      {
        "date": "2025-07-02",
        "high": 29,
        "low": 22,
        "condition": "Rain"
      }
    ]
  },
  "timestamps": {
    "created_at": "2025-07-01T10:00:00Z",
    "updated_at": "2025-07-01T10:00:05Z",
    "completed_at": "2025-07-01T10:00:05Z"
  }
}
```

### 5.5 呼叫端點

Skill Descriptor 的 `endpoint` 欄位定義了三個 URL 範本：

| 端點 | 用途 | 範本變數 |
|---|---|---|
| `url` | 提交呼叫請求 | — |
| `status_url` | 查詢執行狀態 | `{execution_id}` |
| `result_url` | 取得執行結果 | `{execution_id}` |

消費者必須（MUST）將 `{execution_id}` 替換為初始回應中回傳的實際執行 ID。

---

## 6. 版本管理規範

### 6.1 語意化版本控制

技能共享協定遵循 [Semantic Versioning 2.0.0](https://semver.org/)（SemVer）。所有版本字串必須（MUST）符合 `MAJOR.MINOR.PATCH` 格式，其中：

- **MAJOR** — 非負整數。當協定發生不相容變更時遞增。
- **MINOR** — 非負整數。當新增向後相容的功能時遞增。
- **PATCH** — 非負整數。當進行向後相容的缺陷修復時遞增。

有效版本字串範例：`"1.0.0"`、`"2.3.1"`、`"0.1.0"`。

### 6.2 版本宣告

每個 Skill Descriptor 必須（MUST）在 `protocol.version` 欄位中宣告其所遵循的協定版本：

```json
{
  "protocol": {
    "version": "1.0.0",
    "changelog_url": "https://example.com/protocol/changelog"
  }
}
```

選用的 `changelog_url` 欄位提供版本變更日誌的參照。

### 6.3 相容性規則

| 條件 | 結果 |
|---|---|
| 描述符 MAJOR > 消費者 MAJOR | **不相容。** 消費者無法處理更高的主版本號。 |
| 描述符 MAJOR = 消費者 MAJOR | **相容。** 次版本號和修補版本號的差異是向後相容的。 |
| 描述符 MAJOR < 消費者 MAJOR | **相容。** 消費者可以處理較低的主版本號。 |

### 6.4 不相容處理

當消費者遇到協定版本不相容的 Skill Descriptor 時：

1. 消費者不得（MUST NOT）嘗試呼叫該技能。
2. 消費者應當（SHOULD）回傳 `VERSION_INCOMPATIBLE` 錯誤（參見[第 8 節](#8-錯誤處理規範)）。
3. 錯誤回應應當（SHOULD）包含消費者支援的版本範圍和描述符要求的版本。

### 6.5 Schema 版本化

Schema 定義檔在版本化目錄中維護：

```
schema/
├── draft/              # 目前工作草稿
│   ├── schema.json
│   ├── schema.ts
│   └── schema.mdx
└── 2025-10-25/         # 已發佈版本（基於日期）
    ├── schema.json
    ├── schema.ts
    └── schema.mdx
```

當新的協定版本發佈時，草稿 Schema 將被複製到新的日期標記目錄中。

---

## 7. 安全與認證規範

### 7.1 概述

技能共享協定提供彈性的認證和存取控制框架。技能提供者在 Skill Descriptor 中宣告安全需求，消費者負責在呼叫前滿足這些需求。

### 7.2 認證類型

#### 7.2.1 API Key（`api_key`）

最簡單的認證方式。消費者在指定的 HTTP Header 中提供 API Key。

```json
{
  "auth": {
    "type": "api_key",
    "description": "Include your API key in the X-API-Key header.",
    "header": "X-API-Key"
  }
}
```

#### 7.2.2 OAuth 2.0（`oauth2`）

標準 OAuth 2.0 認證流程。Skill Descriptor 提供授權和權杖 URL 以及可用的權限範圍。

```json
{
  "auth": {
    "type": "oauth2",
    "description": "OAuth 2.0 authentication required.",
    "oauth2": {
      "authorization_url": "https://auth.example.com/authorize",
      "token_url": "https://auth.example.com/token",
      "scopes": {
        "read:forecast": "Read forecast data",
        "write:preferences": "Update user preferences"
      }
    }
  }
}
```

#### 7.2.3 自訂認證（`custom`）

用於 API Key 和 OAuth 2.0 未涵蓋的認證方式。描述符提供人類可讀的說明和所需參數。

```json
{
  "auth": {
    "type": "custom",
    "description": "HMAC-SHA256 signed requests.",
    "custom": {
      "instructions": "Sign the request body with your secret key using HMAC-SHA256 and include the signature in the X-Signature header.",
      "parameters": [
        {
          "name": "secret_key",
          "type": "string",
          "description": "Your HMAC secret key.",
          "required": true
        }
      ]
    }
  }
}
```

#### 7.2.4 無認證（`none`）

無需認證。技能可自由存取。

```json
{
  "auth": {
    "type": "none"
  }
}
```

### 7.3 存取控制策略

存取控制透過 Skill Descriptor 的 `access` 欄位在描述符層級宣告：

| 策略 | 發現行為 | 呼叫行為 |
|---|---|---|
| `"public"` | 在所有發現回應中可見。 | 無需認證（除非 `auth.type` 不為 `"none"`）。 |
| `"restricted"` | 在所有發現回應中可見。 | 需要認證；僅授權的消費者可呼叫。 |
| `"private"` | 在未認證的發現請求中隱藏。 | 需要認證；僅授權的消費者可呼叫。 |

### 7.4 認證流程

1. 消費者取得 Skill Descriptor。
2. 消費者檢查 `auth` 欄位以確定所需的認證方式。
3. 消費者在呼叫請求中附加相應的憑證。
4. 如果憑證缺失或無效，提供者回傳 `401` 錯誤，並附帶所需認證方式的詳細資訊。
5. 如果憑證有效但權限不足，提供者回傳 `403` 錯誤。

---

## 8. 錯誤處理規範

### 8.1 錯誤類別

協定定義了七種錯誤類別：

| 錯誤類別 | 代碼 | HTTP 狀態碼 | 情境 |
|---|---|---|---|
| 驗證錯誤 | `VALIDATION_ERROR` | N/A（本機） | Schema Validator 偵測到無效的 Skill Descriptor。 |
| 需要認證 | `AUTH_REQUIRED` | 401 | 呼叫受保護技能時未提供有效憑證。 |
| 權限不足 | `PERMISSION_DENIED` | 403 | 憑證有效但缺少足夠的權限。 |
| 技能未找到 | `SKILL_NOT_FOUND` | 404 | 請求的技能 ID 或描述符 URL 不存在。 |
| 呼叫逾時 | `INVOCATION_TIMEOUT` | 408 / 504 | 技能執行超過設定的逾時時間。 |
| 端點不可達 | `ENDPOINT_UNREACHABLE` | 502 / 503 | 呼叫端點無法連線。 |
| 版本不相容 | `VERSION_INCOMPATIBLE` | 422 | Skill Descriptor 的協定版本與消費者不相容。 |

### 8.2 統一錯誤回應格式

所有錯誤回應必須（MUST）遵循以下結構：

```json
{
  "error": {
    "code": "<ErrorCode>",
    "message": "<人類可讀的錯誤訊息>",
    "details": {},
    "retry": {
      "suggested_delay_ms": 0,
      "max_attempts": 0
    }
  }
}
```

| 欄位 | 型別 | 必要 | 描述 |
|---|---|---|---|
| `error.code` | `string` | 是 | 上述七種錯誤代碼之一。 |
| `error.message` | `string` | 是 | 人類可讀的錯誤訊息。 |
| `error.details` | `any` | 否 | 附加的上下文相關錯誤詳情。 |
| `error.retry` | `object` | 否 | 重試建議。 |
| `error.retry.suggested_delay_ms` | `number` | 是* | 建議的重試延遲時間（毫秒）。 |
| `error.retry.max_attempts` | `number` | 是* | 最大重試次數。 |

> \* 當 `retry` 物件存在時為必要。

### 8.3 錯誤處理策略

#### 8.3.1 驗證錯誤

當 Schema Validator 驗證 Skill Descriptor 失敗時在本機回傳。`details` 欄位應當（SHOULD）包含一個陣列，每個項目包含：

- `path` — 無效欄位的 JSON Pointer 路徑。
- `message` — 驗證失敗的描述。
- `expected` — 期望的值或型別。
- `actual` — 實際發現的值或型別。

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid SkillDescriptor document",
    "details": [
      {
        "path": "/capability_type",
        "message": "must be equal to one of the allowed values",
        "expected": ["plugin", "api", "knowledge", "task"],
        "actual": "invalid_type"
      },
      {
        "path": "/endpoint/method",
        "message": "must be equal to one of the allowed values",
        "expected": ["GET", "POST", "PUT", "DELETE"],
        "actual": "PATCH"
      }
    ]
  }
}
```

#### 8.3.2 需要認證

當消費者未提供有效憑證時回傳。`details` 欄位應當（SHOULD）描述所需的認證方式，以協助消費者自動完成認證。

```json
{
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "Authentication is required to invoke this skill",
    "details": {
      "required_auth_type": "oauth2",
      "authorization_url": "https://auth.example.com/authorize"
    },
    "retry": {
      "suggested_delay_ms": 0,
      "max_attempts": 1
    }
  }
}
```

#### 8.3.3 權限不足

當憑證有效但消費者缺少所需權限時回傳。

```json
{
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "Insufficient permissions to invoke this skill",
    "details": {
      "required_scopes": ["read:forecast"],
      "granted_scopes": []
    }
  }
}
```

#### 8.3.4 技能未找到

當請求的技能 ID 或描述符 URL 不存在時回傳。

```json
{
  "error": {
    "code": "SKILL_NOT_FOUND",
    "message": "Skill 'example-corp/nonexistent' was not found",
    "details": {
      "skill_id": "example-corp/nonexistent"
    }
  }
}
```

#### 8.3.5 呼叫逾時

當技能執行超過設定的逾時時間時回傳。`retry` 欄位提供重試指引。

```json
{
  "error": {
    "code": "INVOCATION_TIMEOUT",
    "message": "Skill execution timed out after 30000ms",
    "details": {
      "timeout_ms": 30000,
      "execution_id": "exec-a1b2c3d4"
    },
    "retry": {
      "suggested_delay_ms": 1000,
      "max_attempts": 3
    }
  }
}
```

#### 8.3.6 端點不可達

當呼叫端點無法連線時回傳。消費者應當（SHOULD）實作指數退避重試策略。

```json
{
  "error": {
    "code": "ENDPOINT_UNREACHABLE",
    "message": "Failed to connect to invocation endpoint",
    "details": {
      "url": "https://api.weather.example.com/v2/forecast",
      "reason": "Connection refused"
    },
    "retry": {
      "suggested_delay_ms": 2000,
      "max_attempts": 3
    }
  }
}
```

#### 8.3.7 版本不相容

當 Skill Descriptor 的協定版本與消費者不相容時回傳。`details` 欄位應當（SHOULD）包含消費者支援的版本範圍和描述符要求的版本。

```json
{
  "error": {
    "code": "VERSION_INCOMPATIBLE",
    "message": "Protocol version 2.0.0 is not compatible with consumer version 1.5.0",
    "details": {
      "descriptor_version": "2.0.0",
      "consumer_version": "1.5.0",
      "supported_major": 1
    }
  }
}
```

---

## 9. Schema 參考

### 9.1 JSON Schema

權威 Schema 定義以 JSON Schema（Draft 2020-12）檔案形式維護：

- **草稿：** [`schema/draft/schema.json`](../../../../schema/draft/schema.json)
- **Schema ID：** `https://ifay.org/schema/draft/skill-sharing-protocol.json`

Schema 透過 `$defs` 定義了以下頂層型別：

| 定義 | 描述 |
|---|---|
| `SkillDescriptor`（根） | 完整的 Skill Descriptor 結構。 |
| `SkillIndex` | Well-Known URI 回應，包含技能清單。 |
| `SkillIndexEntry` | Skill Index 中的單一項目。 |
| `InvocationRequest` | 技能呼叫請求結構。 |
| `InvocationResponse` | 技能呼叫回應結構。 |
| `ProtocolVersion` | 協定版本資訊。 |
| `CapabilityType` | 能力類型列舉。 |
| `AccessPolicy` | 存取控制策略列舉。 |
| `AuthType` | 認證類型列舉。 |
| `ExecutionStatus` | 執行狀態列舉。 |
| `ParameterDefinition` | 輸入/輸出參數定義。 |
| `AuthConfig` | 認證設定。 |
| `InvocationEndpoint` | 呼叫端點設定。 |
| `OutputDefinition` | 輸出格式定義。 |

### 9.2 TypeScript 型別定義

提供 TypeScript 介面用於型別安全的開發：

- **草稿：** [`schema/draft/schema.ts`](../../../../schema/draft/schema.ts)

所有 TypeScript 型別均已匯出，並與 JSON Schema 定義保持語意等價。對應規則如下：

| TypeScript | JSON Schema |
|---|---|
| `string` | `{ "type": "string" }` |
| `number` | `{ "type": "number" }` |
| `boolean` | `{ "type": "boolean" }` |
| 聯合型別 `"a" \| "b"` | `{ "enum": ["a", "b"] }` |
| `interface` | `{ "type": "object", "properties": {...} }` |
| 選用欄位 `field?` | 不在 `required` 陣列中 |
| `Record<string, T>` | `{ "type": "object", "additionalProperties": {...} }` |
| `unknown` | `{}`（無約束） |

### 9.3 Schema 驗證

實作方應當（SHOULD）使用 JSON Schema 檔案（`schema.json`）搭配符合 JSON Schema Draft 2020-12 的驗證器（如 [Ajv](https://ajv.js.org/)）來驗證 Skill Descriptor。

Schema Validator 提供三個核心操作：

| 操作 | 描述 |
|---|---|
| `validate(document)` | 根據 Schema 驗證文件。回傳包含 `valid`（布林值）和 `errors`（驗證錯誤陣列）的結果。 |
| `parse(document)` | 驗證並將文件解析為型別化的 `SkillDescriptor` 物件。輸入無效時擲出例外。 |
| `serialize(descriptor)` | 將 `SkillDescriptor` 物件序列化為格式化的 JSON（2 空格縮排）。 |

---

## 10. 附錄：完整範例

### 10.1 完整的發現與呼叫工作流程

**步驟 1：透過 Well-Known URI 發現技能**

```http
GET /.well-known/skill-sharing HTTP/1.1
Host: skills.example.com
Accept: application/json
```

**回應：**

```json
{
  "protocol": { "version": "1.0.0" },
  "provider": {
    "name": "Example Skills Provider",
    "url": "https://skills.example.com"
  },
  "skills": [
    {
      "id": "example/text-summarizer",
      "name": "Text Summarizer",
      "capability_type": "api",
      "description": "Summarizes long text into concise paragraphs.",
      "descriptor_url": "https://skills.example.com/skills/text-summarizer.json",
      "access": "public",
      "version": "1.2.0"
    }
  ]
}
```

**步驟 2：取得完整的 Skill Descriptor**

```http
GET /skills/text-summarizer.json HTTP/1.1
Host: skills.example.com
Accept: application/json
```

**回應：** 完整的 Skill Descriptor 文件（完整結構參見[第 3.6 節](#36-範例有效的-skill-descriptor)）。

**步驟 3：驗證 Skill Descriptor**

消費者使用 Schema Validator 根據 `schema/draft/schema.json` 驗證取得的文件。如果驗證失敗，消費者不得（MUST NOT）呼叫該技能。

**步驟 4：呼叫技能**

```http
POST /api/v1/summarize HTTP/1.1
Host: skills.example.com
Content-Type: application/json

{
  "caller": {
    "id": "ifay-instance-042",
    "type": "ifay"
  },
  "skill_id": "example/text-summarizer",
  "inputs": {
    "text": "The Skill Sharing Protocol defines a decentralized mechanism...",
    "max_length": 100
  },
  "context": {
    "trace_id": "trace-9e8d7c6b",
    "priority": "normal"
  }
}
```

**回應（已接受）：**

```json
{
  "execution_id": "exec-f5e4d3c2",
  "status": "accepted",
  "skill_id": "example/text-summarizer",
  "timestamps": {
    "created_at": "2025-07-01T12:00:00Z",
    "updated_at": "2025-07-01T12:00:00Z"
  }
}
```

**步驟 5：輪詢狀態**

```http
GET /api/v1/status/exec-f5e4d3c2 HTTP/1.1
Host: skills.example.com
```

**回應（已完成）：**

```json
{
  "execution_id": "exec-f5e4d3c2",
  "status": "completed",
  "skill_id": "example/text-summarizer",
  "output": {
    "summary": "The Skill Sharing Protocol enables decentralized skill discovery and invocation across the internet."
  },
  "timestamps": {
    "created_at": "2025-07-01T12:00:00Z",
    "updated_at": "2025-07-01T12:00:02Z",
    "completed_at": "2025-07-01T12:00:02Z"
  }
}
```

### 10.2 錯誤回應範例

**未經認證呼叫技能：**

```http
POST /api/v1/forecast HTTP/1.1
Host: api.weather.example.com
Content-Type: application/json

{
  "caller": { "id": "ifay-001", "type": "ifay" },
  "skill_id": "example-corp/weather-forecast",
  "inputs": { "location": "Berlin" }
}
```

**回應（401）：**

```json
{
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "Authentication is required to invoke this skill",
    "details": {
      "required_auth_type": "api_key",
      "header": "X-API-Key"
    },
    "retry": {
      "suggested_delay_ms": 0,
      "max_attempts": 1
    }
  }
}
```

---

## 授權條款

本規範是技能共享協定專案的一部分。詳情請參閱 [LICENSE](../../../../LICENSE) 檔案。
