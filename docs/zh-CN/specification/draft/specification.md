# 技能共享协议规范

**状态：** 草稿  
**版本：** 1.0.0  
**日期：** 2025-01-01  
**Schema：** [`schema/draft/schema.json`](../../../../schema/draft/schema.json)、[`schema/draft/schema.ts`](../../../../schema/draft/schema.ts)

---

## 目录

1. [协议概述](#1-协议概述)
2. [术语定义](#2-术语定义)
3. [技能描述符规范](#3-技能描述符规范)
4. [发现机制规范](#4-发现机制规范)
5. [调用协议规范](#5-调用协议规范)
6. [版本管理规范](#6-版本管理规范)
7. [安全与认证规范](#7-安全与认证规范)
8. [错误处理规范](#8-错误处理规范)
9. [Schema 参考](#9-schema-参考)
10. [附录：完整示例](#10-附录完整示例)

---

## 1. 协议概述

### 1.1 目的

技能共享协议定义了一套去中心化的机制，用于在互联网上发现、声明和调用技能。它使技能提供者无需依赖中心化平台即可暴露自身能力，并允许技能消费者（主要是 iFay 实例）自主发现和远程调用这些技能。

#### 现实场景

为了展示协议的广泛适用性，请参考以下具体示例：

> **无人机控制权交接：** 一架由人类操控的无人机需要将控制权移交给 iFay 实例。无人机制造商通过协议暴露 `"drone-control"` 技能，使 iFay 能够发现并调用该技能以执行自主飞行操作——包括起飞、导航和降落——无需任何专有 SDK 集成。

> **智能家居编排：** 一家智能家居公司在其域名下暴露 `"adjust-thermostat"`、`"lock-doors"` 和 `"monitor-cameras"` 等技能。任何 iFay 实例都可以发现这些技能并进行编排——例如，当用户说"晚安"时，自动降低温度、锁定所有门并启动摄像头监控——无需绑定特定平台。

> **医疗知识库：** 一家医院发布了 `"medical-diagnosis-assist"` 知识技能。医生使用的 iFay 实例可以发现并查询该技能，根据患者症状获取诊断建议，访问权限通过 OAuth 2.0 限制为经过认证的医疗专业人员。

> **人工任务委派：** 一家物流公司暴露了 `"warehouse-pickup"` 任务技能，可由人工执行。iFay 发现该技能后将实际取货任务委派给可用的工人，并通过与自动化技能相同的异步轮询机制跟踪执行状态。

### 1.2 设计原则

- **去中心化发现：** 技能提供者在自己的域名下声明技能。消费者通过 Well-Known URI 和直接 URL 发现技能——无需中心化注册表。
- **自描述性：** 每个技能通过标准化的 Skill Descriptor 文档完整描述自身的能力、接口和调用方式。
- **协议即规范：** 交付物是协议文档和 Schema 定义文件，而非软件应用。

### 1.3 架构

协议采用去中心化的 Provider-Consumer 架构，类似于 Web 的超链接发现模型和 P2P 网络的节点发现机制。

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

### 1.4 协议交互流程

1. **发现阶段：** 消费者向提供者域名发送 `GET /.well-known/skill-sharing` 请求，接收包含所有已声明技能引用的 Skill Index。
2. **验证阶段：** 消费者使用 Schema Validator 对每个 Skill Descriptor 进行协议 Schema 验证。
3. **调用阶段：** 消费者向技能的调用端点发送 POST 请求，接收执行 ID，并轮询执行状态和结果。

### 1.5 交付物

| 交付物 | 描述 |
|---|---|
| 协议规范文档 | 提供 9 种语言版本，位于 `docs/{lang}/specification/` |
| JSON Schema | `schema/{version}/schema.json` — JSON Schema Draft 2020-12 |
| TypeScript 类型定义 | `schema/{version}/schema.ts` — 严格的 TypeScript 接口 |
| MDX 文档 | `schema/{version}/schema.mdx` — 交互式 Schema 文档 |

---

## 2. 术语定义

| 术语 | 定义 |
|---|---|
| **iFay** | 智能认知伙伴系统；技能共享协议的主要消费者，能够发现和调用技能以增强自身能力。 |
| **Skill（技能）** | 遵循本协议声明的可调用能力单元，包括但不限于插件、API、知识包和任务执行能力。 |
| **Skill Provider（技能提供者）** | 在互联网上声明和暴露技能的实体（个人、组织或自动化系统）。 |
| **Skill Consumer（技能消费者）** | 发现并调用技能的实体；主要为 iFay 实例。 |
| **Skill Descriptor（技能描述符）** | 遵循协议 Schema 的元数据文档，描述技能的能力、接口和调用方式。 |
| **Discovery Mechanism（发现机制）** | 技能消费者在去中心化网络中定位和发现 Skill Descriptor 的方法和流程。 |
| **Protocol Schema（协议 Schema）** | 定义 Skill Descriptor 结构的形式化规范，包含 JSON Schema、TypeScript 类型和 MDX 文档。 |
| **Skill Registry（技能注册表）** | 可选的技能索引服务，用于加速技能发现；非协议运行的必要条件。 |
| **Invocation Endpoint（调用端点）** | Skill Descriptor 中声明的远程调用入口地址。 |
| **Capability Type（能力类型）** | 技能的分类标识：`plugin`、`api`、`knowledge` 或 `task`。 |
| **Schema Validator（Schema 验证器）** | 根据 Protocol Schema 验证 Skill Descriptor 合规性的工具或组件。 |
| **Protocol Version（协议版本）** | 协议规范的版本标识，遵循语义化版本控制。 |
| **Well-Known URI** | 标准化的发现路径 `/.well-known/skill-sharing`，用于定位域名的 Skill Index。 |

---

## 3. 技能描述符规范

### 3.1 概述

Skill Descriptor 是协议的核心数据结构。它是一个 JSON 文档，完整描述单个技能的身份标识、能力、接口、调用方式和访问控制策略。

每个 Skill Descriptor 在被视为有效之前，必须（MUST）通过协议的 JSON Schema（`schema/draft/schema.json`）验证。

### 3.2 必需字段

有效的 Skill Descriptor 必须（MUST）包含以下所有字段：

| 字段 | 类型 | 描述 |
|---|---|---|
| `protocol` | `ProtocolVersion` | 该描述符所遵循的协议版本。 |
| `id` | `string` | 技能的全局唯一标识符。 |
| `name` | `string` | 技能的人类可读名称。 |
| `version` | `string` | 技能版本，SemVer 格式（如 `"1.0.0"`）。 |
| `capability_type` | `CapabilityType` | 技能的能力分类。 |
| `description` | `string` | 技能功能的人类可读描述。 |
| `provider` | `object` | 技能提供者信息（必须包含 `name`）。 |
| `endpoint` | `InvocationEndpoint` | 调用端点配置。 |
| `inputs` | `ParameterDefinition[]` | 输入参数定义数组。 |
| `output` | `OutputDefinition` | 输出格式定义。 |
| `auth` | `AuthConfig` | 认证配置。 |
| `access` | `AccessPolicy` | 访问控制策略。 |

### 3.3 可选字段

| 字段 | 类型 | 描述 |
|---|---|---|
| `tags` | `string[]` | 用于搜索和分类的标签。 |
| `documentation_url` | `string` | 技能文档的 URL。 |
| `created_at` | `string` | 创建时间戳，ISO 8601 格式。 |
| `updated_at` | `string` | 最后更新时间戳，ISO 8601 格式。 |

### 3.4 枚举类型

#### 3.4.1 CapabilityType

定义技能能力的分类。有效值：

| 值 | 描述 |
|---|---|
| `"plugin"` | 扩展功能的插件。 |
| `"api"` | API 服务端点。 |
| `"knowledge"` | 知识包或数据源。 |
| `"task"` | 任务执行能力（人类或自动化）。 |

> **各类型的具体示例：**
>
> - `"plugin"` — 一个浏览器扩展，可在任何网页上添加实时翻译覆盖层。iFay 发现并激活它，帮助用户无需离开页面即可阅读外语内容。
> - `"api"` — 一个天气预报服务，接受位置坐标并返回 7 天预报。iFay 调用它为用户规划户外活动，并将结果与日历数据结合。
> - `"knowledge"` — 一个法律法规数据库，iFay 查询它以帮助用户了解其业务在不同司法管辖区的合规要求。
> - `"task"` — 一个无人机配送服务，iFay 请求将包裹从 A 点运送到 B 点，由自主无人机或人工快递员执行，并提供实时状态跟踪。

#### 3.4.2 AccessPolicy

定义技能的访问控制策略。有效值：

| 值 | 描述 |
|---|---|
| `"public"` | 所有消费者均可无限制访问。 |
| `"restricted"` | 仅经过认证且具有适当权限的消费者可访问。 |
| `"private"` | 在未认证的发现请求中隐藏；发现和调用均需认证。 |

> **各策略的具体示例：**
>
> - `"public"` — 一个公开的天气 API，任何人无需认证即可查询。任何发现它的 iFay 实例都可以立即调用以获取天气预报。
> - `"restricted"` — 一个公司内部的文档搜索技能——在发现阶段对所有人可见，但只有持有有效企业凭据的员工才能实际调用。外部 iFay 可以看到该技能的列表，但在尝试使用时会收到 `403 Permission Denied` 错误。
> - `"private"` — 一个军事级别的卫星影像技能，完全隐藏于公开发现之外，发现和调用均需最高机密级别的安全许可。未认证的 Well-Known URI 请求甚至不会显示该技能的存在。

#### 3.4.3 AuthType

定义调用技能所需的认证方式。有效值：

| 值 | 描述 |
|---|---|
| `"api_key"` | 基于 API Key 的认证。 |
| `"oauth2"` | OAuth 2.0 认证。 |
| `"custom"` | 自定义认证机制。 |
| `"none"` | 无需认证。 |

#### 3.4.4 ExecutionStatus

定义技能调用的执行状态。有效值：

| 值 | 描述 |
|---|---|
| `"accepted"` | 调用请求已被接受。 |
| `"running"` | 技能正在执行中。 |
| `"completed"` | 执行成功完成。 |
| `"failed"` | 执行失败。 |
| `"timeout"` | 执行超时。 |

### 3.5 子结构定义

#### 3.5.1 ProtocolVersion

| 字段 | 类型 | 必需 | 描述 |
|---|---|---|---|
| `version` | `string` | 是 | SemVer 格式的版本字符串（如 `"1.0.0"`）。 |
| `changelog_url` | `string` | 否 | 版本变更日志的 URL。 |

#### 3.5.2 ParameterDefinition

| 字段 | 类型 | 必需 | 描述 |
|---|---|---|---|
| `name` | `string` | 是 | 参数名称。 |
| `type` | `string` | 是 | JSON Schema 类型（如 `"string"`、`"number"`、`"object"`）。 |
| `description` | `string` | 是 | 参数的人类可读描述。 |
| `required` | `boolean` | 是 | 该参数是否为必需。 |
| `default` | `any` | 否 | 未提供参数时的默认值。 |
| `schema` | `object` | 否 | 复杂类型的嵌套 JSON Schema。 |

#### 3.5.3 InvocationEndpoint

| 字段 | 类型 | 必需 | 描述 |
|---|---|---|---|
| `url` | `string` | 是 | 调用 URL。 |
| `method` | `string` | 是 | HTTP 方法。取值：`"GET"`、`"POST"`、`"PUT"`、`"DELETE"`。 |
| `content_type` | `string` | 否 | 请求内容类型。默认为 `"application/json"`。 |
| `status_url` | `string` | 否 | 状态查询端点模板，包含 `{execution_id}` 占位符。 |
| `result_url` | `string` | 否 | 结果获取端点模板。 |
| `timeout_ms` | `number` | 否 | 调用超时时间（毫秒）。 |
| `retry` | `object` | 否 | 重试配置，包含 `max_attempts` 和 `backoff_ms`。 |

#### 3.5.4 OutputDefinition

| 字段 | 类型 | 必需 | 描述 |
|---|---|---|---|
| `content_type` | `string` | 是 | 输出的 MIME 类型（如 `"application/json"`）。 |
| `schema` | `object` | 否 | 描述输出结构的 JSON Schema。 |
| `description` | `string` | 否 | 输出的人类可读描述。 |

#### 3.5.5 AuthConfig

| 字段 | 类型 | 必需 | 描述 |
|---|---|---|---|
| `type` | `AuthType` | 是 | 认证类型。 |
| `description` | `string` | 否 | 认证要求的人类可读描述。 |
| `header` | `string` | 否 | API Key 认证的 Header 名称。 |
| `oauth2` | `object` | 否 | OAuth 2.0 配置（当 `type` 为 `"oauth2"` 时必需）。 |
| `custom` | `object` | 否 | 自定义认证配置（当 `type` 为 `"custom"` 时必需）。 |

**OAuth2 配置：**

| 字段 | 类型 | 必需 | 描述 |
|---|---|---|---|
| `authorization_url` | `string` | 是 | OAuth 2.0 授权 URL。 |
| `token_url` | `string` | 是 | OAuth 2.0 令牌 URL。 |
| `scopes` | `Record<string, string>` | 是 | 可用的权限范围，以键值对形式表示（范围名称 → 描述）。 |

**自定义认证配置：**

| 字段 | 类型 | 必需 | 描述 |
|---|---|---|---|
| `instructions` | `string` | 是 | 自定义认证流程的人类可读说明。 |
| `parameters` | `ParameterDefinition[]` | 是 | 自定义认证所需的参数。 |

### 3.6 示例：有效的 Skill Descriptor

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

## 4. 发现机制规范

### 4.1 概述

发现机制定义了技能消费者如何在去中心化网络中定位 Skill Descriptor。支持三种发现路径，其中 Well-Known URI 为主要方式。

> **类比：** 可以将 Well-Known URI 想象为一张"名片"，任何域名都可以发布它来宣传其可用技能。正如 Web 浏览器通过 HTML 中的 `<link rel="alternate">` 标签发现 RSS 订阅源，或比特币节点通过 DNS 种子节点和 `addr` 消息发现对等节点一样，`/.well-known/skill-sharing` 路径提供了一个标准化的、可预测的位置，任何 iFay 实例都可以在此查找域名提供的技能——无需预先了解或中心化目录。

### 4.2 发现路径

| 路径 | 方法 | 描述 |
|---|---|---|
| **Well-Known URI** | `GET /.well-known/skill-sharing` | 主要发现方式。返回该域名的 Skill Index。 |
| **直接 URL** | `GET {skill_descriptor_url}` | 已知 URL 时直接获取特定的 Skill Descriptor。 |
| **注册表查询** | `GET {registry_url}/skills?type={capability_type}` | 可选。通过 Skill Registry 进行批量技能检索。 |

### 4.3 Well-Known URI

#### 4.3.1 路径

```
/.well-known/skill-sharing
```

技能提供者必须（MUST）在此路径提供 Skill Index 文档。响应的 `Content-Type` 必须（MUST）为 `application/json`。

#### 4.3.2 Skill Index 结构

Skill Index 是一个 JSON 文档，列出提供者域名下声明的所有技能。

| 字段 | 类型 | 必需 | 描述 |
|---|---|---|---|
| `protocol` | `ProtocolVersion` | 是 | 协议版本。 |
| `provider` | `object` | 是 | 提供者信息（必须包含 `name`；可包含 `url`）。 |
| `skills` | `SkillIndexEntry[]` | 是 | 技能索引条目数组。 |

#### 4.3.3 SkillIndexEntry 结构

Skill Index 中的每个条目包含技能的摘要信息：

| 字段 | 类型 | 必需 | 描述 |
|---|---|---|---|
| `id` | `string` | 是 | 技能的唯一标识符。 |
| `name` | `string` | 是 | 技能的人类可读名称。 |
| `capability_type` | `CapabilityType` | 是 | 技能的能力分类。 |
| `description` | `string` | 是 | 技能的简短描述。 |
| `descriptor_url` | `string` | 是 | 技能完整 Skill Descriptor 的 URL。 |
| `access` | `AccessPolicy` | 是 | 技能的访问控制策略。 |
| `version` | `string` | 是 | 技能版本。 |

#### 4.3.4 Skill ID 唯一性

单个 Skill Index 中的所有技能 ID 必须（MUST）唯一。包含重复 ID 的 Skill Index 被视为无效。

### 4.4 发现中的访问控制

当向 Well-Known URI 发起**未认证**请求时：
- `access: "private"` 的技能必须（MUST）从响应中排除。
- `access: "public"` 或 `access: "restricted"` 的技能必须（MUST）包含在响应中。

当发起**已认证**请求时：
- 所有技能（包括 `private`）均可（MAY）包含在响应中，取决于提供者的授权逻辑。

### 4.5 能力类型过滤

消费者可（MAY）按 `capability_type` 过滤 Skill Index。过滤时：
- 结果必须（MUST）仅包含 `capability_type` 与过滤值匹配的条目。
- 原始索引中所有匹配过滤值的条目必须（MUST）出现在结果中。

### 4.6 示例：Skill Index

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

> **注意：** 在未认证的发现请求中，`"internal-analytics"` 条目（`access: "private"`）将从响应中排除。

---

## 5. 调用协议规范

### 5.1 概述

调用协议定义了技能消费者如何远程调用已发现的技能。协议采用异步请求-响应模式，支持状态轮询。

> **端到端场景 — 餐厅预订：**
>
> 假设 iFay 需要为用户预订一家餐厅。以下是完整流程的工作方式：
>
> 1. **发现：** iFay 向 `opentable.example.com` 发送 `GET /.well-known/skill-sharing` 请求，收到一个 Skill Index，其中列出了一个 `"restaurant-booking"` 技能，`capability_type: "task"`，`access: "restricted"`。
> 2. **描述符获取：** iFay 从 `descriptor_url` 获取完整的 Skill Descriptor，并根据协议 Schema 进行验证。
> 3. **认证：** 描述符指定 `auth.type: "oauth2"`。iFay 完成 OAuth 2.0 流程，获取具有 `"book:reservation"` 权限范围的访问令牌。
> 4. **调用：** iFay 向调用端点发送 POST 请求，输入参数为：`{ "cuisine": "Italian", "date": "2025-08-15", "time": "19:00", "party_size": 4, "city": "San Francisco" }`。
> 5. **已接受：** 提供者响应 `status: "accepted"` 和 `execution_id` 为 `"exec-r3s7v9"`。
> 6. **轮询：** iFay 轮询 `status_url`，看到 `status: "running"`，表示系统正在搜索可用餐桌。
> 7. **完成：** 下一次轮询时，状态为 `"completed"`，输出为：`{ "restaurant": "Trattoria Roma", "confirmation_code": "TR-20250815-042", "time": "19:00", "address": "123 Columbus Ave, SF" }`。
> 8. iFay 将预订确认信息呈现给用户。

### 5.2 调用流程

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

### 5.3 调用请求

InvocationRequest 由消费者发送以发起技能执行。

| 字段 | 类型 | 必需 | 描述 |
|---|---|---|---|
| `caller` | `object` | 是 | 调用者身份信息。 |
| `caller.id` | `string` | 是 | 调用者的唯一标识符。 |
| `caller.type` | `string` | 是 | 调用者类型（如 `"ifay"`、`"service"`、`"user"`）。 |
| `caller.credentials` | `object` | 否 | 认证凭据。 |
| `skill_id` | `string` | 是 | 目标技能的唯一标识符。 |
| `inputs` | `Record<string, unknown>` | 是 | 以键值对形式表示的输入参数。 |
| `context` | `object` | 否 | 调用上下文。 |
| `context.trace_id` | `string` | 否 | 分布式追踪标识符。 |
| `context.priority` | `string` | 否 | 执行优先级：`"low"`、`"normal"` 或 `"high"`。 |
| `context.timeout_ms` | `number` | 否 | 客户端超时时间（毫秒）。 |

#### 示例：调用请求

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

### 5.4 调用响应

InvocationResponse 由提供者在执行的每个阶段返回。

| 字段 | 类型 | 必需 | 描述 |
|---|---|---|---|
| `execution_id` | `string` | 是 | 本次执行的唯一标识符。 |
| `status` | `ExecutionStatus` | 是 | 当前执行状态。 |
| `skill_id` | `string` | 是 | 目标技能的标识符。 |
| `output` | `any` | 否 | 输出数据（当 `status` 为 `"completed"` 时存在）。 |
| `error` | `object` | 否 | 错误信息（当 `status` 为 `"failed"` 或 `"timeout"` 时存在）。 |
| `error.code` | `string` | 是* | 错误代码。 |
| `error.message` | `string` | 是* | 人类可读的错误消息。 |
| `error.details` | `any` | 否 | 附加错误详情。 |
| `error.retry` | `object` | 否 | 重试建议，包含 `suggested_delay_ms` 和 `max_attempts`。 |
| `timestamps` | `object` | 是 | 执行时间戳。 |
| `timestamps.created_at` | `string` | 是 | 执行创建时间（ISO 8601）。 |
| `timestamps.updated_at` | `string` | 是 | 执行最后更新时间（ISO 8601）。 |
| `timestamps.completed_at` | `string` | 否 | 执行完成时间（ISO 8601）。 |

> \* 当 `error` 对象存在时为必需。

#### 示例：调用响应（已完成）

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

### 5.5 调用端点

Skill Descriptor 的 `endpoint` 字段定义了三个 URL 模板：

| 端点 | 用途 | 模板变量 |
|---|---|---|
| `url` | 提交调用请求 | — |
| `status_url` | 查询执行状态 | `{execution_id}` |
| `result_url` | 获取执行结果 | `{execution_id}` |

消费者必须（MUST）将 `{execution_id}` 替换为初始响应中返回的实际执行 ID。

---

## 6. 版本管理规范

### 6.1 语义化版本控制

技能共享协议遵循 [Semantic Versioning 2.0.0](https://semver.org/)（SemVer）。所有版本字符串必须（MUST）符合 `MAJOR.MINOR.PATCH` 格式，其中：

- **MAJOR** — 非负整数。当协议发生不兼容变更时递增。
- **MINOR** — 非负整数。当新增向后兼容的功能时递增。
- **PATCH** — 非负整数。当进行向后兼容的缺陷修复时递增。

有效版本字符串示例：`"1.0.0"`、`"2.3.1"`、`"0.1.0"`。

### 6.2 版本声明

每个 Skill Descriptor 必须（MUST）在 `protocol.version` 字段中声明其所遵循的协议版本：

```json
{
  "protocol": {
    "version": "1.0.0",
    "changelog_url": "https://example.com/protocol/changelog"
  }
}
```

可选的 `changelog_url` 字段提供版本变更日志的引用。

### 6.3 兼容性规则

| 条件 | 结果 |
|---|---|
| 描述符 MAJOR > 消费者 MAJOR | **不兼容。** 消费者无法处理更高的主版本号。 |
| 描述符 MAJOR = 消费者 MAJOR | **兼容。** 次版本号和补丁版本号的差异是向后兼容的。 |
| 描述符 MAJOR < 消费者 MAJOR | **兼容。** 消费者可以处理较低的主版本号。 |

### 6.4 不兼容处理

当消费者遇到协议版本不兼容的 Skill Descriptor 时：

1. 消费者不得（MUST NOT）尝试调用该技能。
2. 消费者应当（SHOULD）返回 `VERSION_INCOMPATIBLE` 错误（参见[第 8 节](#8-错误处理规范)）。
3. 错误响应应当（SHOULD）包含消费者支持的版本范围和描述符要求的版本。

### 6.5 Schema 版本化

Schema 定义文件在版本化目录中维护：

```
schema/
├── draft/              # 当前工作草稿
│   ├── schema.json
│   ├── schema.ts
│   └── schema.mdx
└── 2025-10-25/         # 已发布版本（基于日期）
    ├── schema.json
    ├── schema.ts
    └── schema.mdx
```

当新的协议版本发布时，草稿 Schema 将被复制到新的日期标记目录中。

---

## 7. 安全与认证规范

### 7.1 概述

技能共享协议提供灵活的认证和访问控制框架。技能提供者在 Skill Descriptor 中声明安全要求，消费者负责在调用前满足这些要求。

### 7.2 认证类型

#### 7.2.1 API Key（`api_key`）

最简单的认证方式。消费者在指定的 HTTP Header 中提供 API Key。

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

标准 OAuth 2.0 认证流程。Skill Descriptor 提供授权和令牌 URL 以及可用的权限范围。

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

#### 7.2.3 自定义认证（`custom`）

用于 API Key 和 OAuth 2.0 未涵盖的认证方式。描述符提供人类可读的说明和所需参数。

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

#### 7.2.4 无认证（`none`）

无需认证。技能可自由访问。

```json
{
  "auth": {
    "type": "none"
  }
}
```

### 7.3 访问控制策略

访问控制通过 Skill Descriptor 的 `access` 字段在描述符级别声明：

| 策略 | 发现行为 | 调用行为 |
|---|---|---|
| `"public"` | 在所有发现响应中可见。 | 无需认证（除非 `auth.type` 不为 `"none"`）。 |
| `"restricted"` | 在所有发现响应中可见。 | 需要认证；仅授权的消费者可调用。 |
| `"private"` | 在未认证的发现请求中隐藏。 | 需要认证；仅授权的消费者可调用。 |

### 7.4 认证流程

1. 消费者获取 Skill Descriptor。
2. 消费者检查 `auth` 字段以确定所需的认证方式。
3. 消费者在调用请求中附加相应的凭据。
4. 如果凭据缺失或无效，提供者返回 `401` 错误，并附带所需认证方式的详细信息。
5. 如果凭据有效但权限不足，提供者返回 `403` 错误。

---

## 8. 错误处理规范

### 8.1 错误类别

协议定义了七种错误类别：

| 错误类别 | 代码 | HTTP 状态码 | 场景 |
|---|---|---|---|
| 验证错误 | `VALIDATION_ERROR` | N/A（本地） | Schema Validator 检测到无效的 Skill Descriptor。 |
| 需要认证 | `AUTH_REQUIRED` | 401 | 调用受保护技能时未提供有效凭据。 |
| 权限不足 | `PERMISSION_DENIED` | 403 | 凭据有效但缺少足够的权限。 |
| 技能未找到 | `SKILL_NOT_FOUND` | 404 | 请求的技能 ID 或描述符 URL 不存在。 |
| 调用超时 | `INVOCATION_TIMEOUT` | 408 / 504 | 技能执行超过配置的超时时间。 |
| 端点不可达 | `ENDPOINT_UNREACHABLE` | 502 / 503 | 调用端点无法连接。 |
| 版本不兼容 | `VERSION_INCOMPATIBLE` | 422 | Skill Descriptor 的协议版本与消费者不兼容。 |

### 8.2 统一错误响应格式

所有错误响应必须（MUST）遵循以下结构：

```json
{
  "error": {
    "code": "<ErrorCode>",
    "message": "<人类可读的错误消息>",
    "details": {},
    "retry": {
      "suggested_delay_ms": 0,
      "max_attempts": 0
    }
  }
}
```

| 字段 | 类型 | 必需 | 描述 |
|---|---|---|---|
| `error.code` | `string` | 是 | 上述七种错误代码之一。 |
| `error.message` | `string` | 是 | 人类可读的错误消息。 |
| `error.details` | `any` | 否 | 附加的上下文相关错误详情。 |
| `error.retry` | `object` | 否 | 重试建议。 |
| `error.retry.suggested_delay_ms` | `number` | 是* | 建议的重试延迟时间（毫秒）。 |
| `error.retry.max_attempts` | `number` | 是* | 最大重试次数。 |

> \* 当 `retry` 对象存在时为必需。

### 8.3 错误处理策略

#### 8.3.1 验证错误

当 Schema Validator 验证 Skill Descriptor 失败时在本地返回。`details` 字段应当（SHOULD）包含一个数组，每个条目包含：

- `path` — 无效字段的 JSON Pointer 路径。
- `message` — 验证失败的描述。
- `expected` — 期望的值或类型。
- `actual` — 实际发现的值或类型。

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

#### 8.3.2 需要认证

当消费者未提供有效凭据时返回。`details` 字段应当（SHOULD）描述所需的认证方式，以帮助消费者自动完成认证。

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

#### 8.3.3 权限不足

当凭据有效但消费者缺少所需权限时返回。

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

当请求的技能 ID 或描述符 URL 不存在时返回。

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

#### 8.3.5 调用超时

当技能执行超过配置的超时时间时返回。`retry` 字段提供重试指导。

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

#### 8.3.6 端点不可达

当调用端点无法连接时返回。消费者应当（SHOULD）实现指数退避重试策略。

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

#### 8.3.7 版本不兼容

当 Skill Descriptor 的协议版本与消费者不兼容时返回。`details` 字段应当（SHOULD）包含消费者支持的版本范围和描述符要求的版本。

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

## 9. Schema 参考

### 9.1 JSON Schema

权威 Schema 定义以 JSON Schema（Draft 2020-12）文件形式维护：

- **草稿：** [`schema/draft/schema.json`](../../../../schema/draft/schema.json)
- **Schema ID：** `https://ifay.org/schema/draft/skill-sharing-protocol.json`

Schema 通过 `$defs` 定义了以下顶层类型：

| 定义 | 描述 |
|---|---|
| `SkillDescriptor`（根） | 完整的 Skill Descriptor 结构。 |
| `SkillIndex` | Well-Known URI 响应，包含技能列表。 |
| `SkillIndexEntry` | Skill Index 中的单个条目。 |
| `InvocationRequest` | 技能调用请求结构。 |
| `InvocationResponse` | 技能调用响应结构。 |
| `ProtocolVersion` | 协议版本信息。 |
| `CapabilityType` | 能力类型枚举。 |
| `AccessPolicy` | 访问控制策略枚举。 |
| `AuthType` | 认证类型枚举。 |
| `ExecutionStatus` | 执行状态枚举。 |
| `ParameterDefinition` | 输入/输出参数定义。 |
| `AuthConfig` | 认证配置。 |
| `InvocationEndpoint` | 调用端点配置。 |
| `OutputDefinition` | 输出格式定义。 |

### 9.2 TypeScript 类型定义

提供 TypeScript 接口用于类型安全的开发：

- **草稿：** [`schema/draft/schema.ts`](../../../../schema/draft/schema.ts)

所有 TypeScript 类型均已导出，并与 JSON Schema 定义保持语义等价。映射规则如下：

| TypeScript | JSON Schema |
|---|---|
| `string` | `{ "type": "string" }` |
| `number` | `{ "type": "number" }` |
| `boolean` | `{ "type": "boolean" }` |
| 联合类型 `"a" \| "b"` | `{ "enum": ["a", "b"] }` |
| `interface` | `{ "type": "object", "properties": {...} }` |
| 可选字段 `field?` | 不在 `required` 数组中 |
| `Record<string, T>` | `{ "type": "object", "additionalProperties": {...} }` |
| `unknown` | `{}`（无约束） |

### 9.3 Schema 验证

实现方应当（SHOULD）使用 JSON Schema 文件（`schema.json`）配合符合 JSON Schema Draft 2020-12 的验证器（如 [Ajv](https://ajv.js.org/)）来验证 Skill Descriptor。

Schema Validator 提供三个核心操作：

| 操作 | 描述 |
|---|---|
| `validate(document)` | 根据 Schema 验证文档。返回包含 `valid`（布尔值）和 `errors`（验证错误数组）的结果。 |
| `parse(document)` | 验证并将文档解析为类型化的 `SkillDescriptor` 对象。输入无效时抛出异常。 |
| `serialize(descriptor)` | 将 `SkillDescriptor` 对象序列化为格式化的 JSON（2 空格缩进）。 |

---

## 10. 附录：完整示例

### 10.1 完整的发现与调用工作流

**步骤 1：通过 Well-Known URI 发现技能**

```http
GET /.well-known/skill-sharing HTTP/1.1
Host: skills.example.com
Accept: application/json
```

**响应：**

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

**步骤 2：获取完整的 Skill Descriptor**

```http
GET /skills/text-summarizer.json HTTP/1.1
Host: skills.example.com
Accept: application/json
```

**响应：** 完整的 Skill Descriptor 文档（完整结构参见[第 3.6 节](#36-示例有效的-skill-descriptor)）。

**步骤 3：验证 Skill Descriptor**

消费者使用 Schema Validator 根据 `schema/draft/schema.json` 验证获取的文档。如果验证失败，消费者不得（MUST NOT）调用该技能。

**步骤 4：调用技能**

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

**响应（已接受）：**

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

**步骤 5：轮询状态**

```http
GET /api/v1/status/exec-f5e4d3c2 HTTP/1.1
Host: skills.example.com
```

**响应（已完成）：**

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

### 10.2 错误响应示例

**未经认证调用技能：**

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

**响应（401）：**

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

## 许可证

本规范是技能共享协议项目的一部分。详情请参阅 [LICENSE](../../../../LICENSE) 文件。