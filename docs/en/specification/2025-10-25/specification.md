# Skill Sharing Protocol Specification

**Status:** Final  
**Version:** 1.0.0  
**Date:** 2025-10-25  
**Schema:** [`schema/draft/schema.json`](../../../../schema/draft/schema.json), [`schema/draft/schema.ts`](../../../../schema/draft/schema.ts)

---

## Table of Contents

1. [Protocol Overview](#1-protocol-overview)
2. [Terminology](#2-terminology)
3. [Skill Descriptor Specification](#3-skill-descriptor-specification)
4. [Discovery Mechanism Specification](#4-discovery-mechanism-specification)
5. [Invocation Protocol Specification](#5-invocation-protocol-specification)
6. [Version Management Specification](#6-version-management-specification)
7. [Security and Authentication Specification](#7-security-and-authentication-specification)
8. [Error Handling Specification](#8-error-handling-specification)
9. [Schema Reference](#9-schema-reference)
10. [Appendix: Complete Examples](#10-appendix-complete-examples)

---

## 1. Protocol Overview

### 1.1 Purpose

The Skill Sharing Protocol defines a decentralized mechanism for discovering, declaring, and invoking skills across the internet. It enables skill providers to expose their capabilities without relying on a centralized platform, and allows skill consumers (primarily iFay instances) to autonomously discover and remotely invoke those skills.

#### Real-World Scenarios

To illustrate the breadth of the protocol, consider these concrete examples:

> **Drone Control Handoff:** A human-operated drone needs to transfer control to an iFay instance. The drone manufacturer exposes a `"drone-control"` skill via the protocol, allowing iFay to discover and invoke it for autonomous flight operations — including takeoff, navigation, and landing — without any proprietary SDK integration.

> **Smart Home Orchestration:** A home automation company exposes skills like `"adjust-thermostat"`, `"lock-doors"`, and `"monitor-cameras"` under their domain. Any iFay instance can discover these skills and orchestrate them — for example, lowering the temperature, locking all doors, and arming cameras when the user says "goodnight" — without being tied to a specific platform.

> **Medical Knowledge Base:** A hospital publishes a `"medical-diagnosis-assist"` knowledge skill. iFay instances used by doctors can discover and query it for diagnostic suggestions based on patient symptoms, with access restricted to authenticated medical professionals via OAuth 2.0.

> **Human Task Delegation:** A logistics company exposes a `"warehouse-pickup"` task skill that can be executed by human workers. iFay discovers this skill and delegates physical pickup tasks to available workers, tracking execution status through the same asynchronous polling mechanism used for automated skills.

### 1.2 Design Principles

- **Decentralized Discovery:** Skill providers declare skills under their own domain. Consumers discover skills via Well-Known URIs and direct URLs — no central registry is required.
- **Self-Describing:** Each skill is fully described by a standardized Skill Descriptor document containing its capabilities, interface, and invocation method.
- **Protocol as Specification:** The deliverables are protocol documents and schema definition files, not a software application.

### 1.3 Architecture

The protocol follows a decentralized Provider-Consumer architecture, analogous to the web's hyperlink discovery model and P2P network node discovery.

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

### 1.4 Protocol Interaction Flow

1. **Discovery Phase:** The consumer sends `GET /.well-known/skill-sharing` to the provider domain and receives a Skill Index containing references to all declared skills.
2. **Validation Phase:** The consumer validates each Skill Descriptor against the protocol schema using a Schema Validator.
3. **Invocation Phase:** The consumer sends a POST request to the skill's invocation endpoint, receives an execution ID, and polls for status and results.

### 1.5 Deliverables

| Deliverable | Description |
|---|---|
| Protocol Specification Documents | Available in 9 languages under `docs/{lang}/specification/` |
| JSON Schema | `schema/{version}/schema.json` — JSON Schema Draft 2020-12 |
| TypeScript Type Definitions | `schema/{version}/schema.ts` — Strict TypeScript interfaces |
| MDX Documentation | `schema/{version}/schema.mdx` — Interactive schema documentation |

---

## 2. Terminology

| Term | Definition |
|---|---|
| **iFay** | An intelligent cognitive companion system; the primary consumer of the Skill Sharing Protocol, capable of discovering and invoking skills to augment its own capabilities. |
| **Skill** | A callable unit of capability declared according to this protocol, including but not limited to plugins, APIs, knowledge packs, and task execution capabilities. |
| **Skill Provider** | An entity (individual, organization, or automated system) that declares and exposes skills on the internet. |
| **Skill Consumer** | An entity that discovers and invokes skills; primarily iFay instances. |
| **Skill Descriptor** | A metadata document conforming to the protocol schema that describes a skill's capabilities, interface, and invocation method. |
| **Discovery Mechanism** | The methods and processes by which a skill consumer locates and discovers Skill Descriptors in a decentralized network. |
| **Protocol Schema** | The formal specification defining the structure of Skill Descriptors, including JSON Schema, TypeScript types, and MDX documentation. |
| **Skill Registry** | An optional skill index service used to accelerate skill discovery; not required for protocol operation. |
| **Invocation Endpoint** | The remote invocation entry point declared in a Skill Descriptor. |
| **Capability Type** | A classification identifier for skills: `plugin`, `api`, `knowledge`, or `task`. |
| **Schema Validator** | A tool or component that validates Skill Descriptor compliance against the Protocol Schema. |
| **Protocol Version** | The version identifier of the protocol specification, following Semantic Versioning. |
| **Well-Known URI** | The standardized discovery path `/.well-known/skill-sharing` used to locate a domain's Skill Index. |

---

## 3. Skill Descriptor Specification

### 3.1 Overview

A Skill Descriptor is the core data structure of the protocol. It is a JSON document that fully describes a single skill's identity, capabilities, interface, invocation method, and access control policy.

Every Skill Descriptor MUST be validated against the protocol's JSON Schema (`schema/draft/schema.json`) before being considered valid.

### 3.2 Required Fields

A valid Skill Descriptor MUST contain all of the following fields:

| Field | Type | Description |
|---|---|---|
| `protocol` | `ProtocolVersion` | The protocol version this descriptor conforms to. |
| `id` | `string` | A globally unique identifier for the skill. |
| `name` | `string` | A human-readable name for the skill. |
| `version` | `string` | The skill's version in SemVer format (e.g., `"1.0.0"`). |
| `capability_type` | `CapabilityType` | The skill's capability classification. |
| `description` | `string` | A human-readable description of what the skill does. |
| `provider` | `object` | Information about the skill provider (MUST contain `name`). |
| `endpoint` | `InvocationEndpoint` | The invocation endpoint configuration. |
| `inputs` | `ParameterDefinition[]` | An array of input parameter definitions. |
| `output` | `OutputDefinition` | The output format definition. |
| `auth` | `AuthConfig` | The authentication configuration. |
| `access` | `AccessPolicy` | The access control policy. |

### 3.3 Optional Fields

| Field | Type | Description |
|---|---|---|
| `tags` | `string[]` | Tags for search and categorization. |
| `documentation_url` | `string` | URL to the skill's documentation. |
| `created_at` | `string` | Creation timestamp in ISO 8601 format. |
| `updated_at` | `string` | Last update timestamp in ISO 8601 format. |

### 3.4 Enumeration Types

#### 3.4.1 CapabilityType

Defines the classification of a skill's capability. Valid values:

| Value | Description |
|---|---|
| `"plugin"` | A plugin that extends functionality. |
| `"api"` | An API service endpoint. |
| `"knowledge"` | A knowledge pack or data source. |
| `"task"` | A task execution capability (human or automated). |

> **Concrete examples for each type:**
>
> - `"plugin"` — A browser extension that adds real-time translation overlay to any webpage. iFay discovers and activates it to help users read foreign-language content without leaving the page.
> - `"api"` — A weather forecasting service that accepts location coordinates and returns 7-day forecasts. iFay invokes it to plan outdoor activities for users, combining results with calendar data.
> - `"knowledge"` — A legal regulations database that iFay queries to help users understand compliance requirements for their business in different jurisdictions.
> - `"task"` — A drone delivery service where iFay requests a physical package delivery from point A to point B, executed by an autonomous drone or a human courier, with real-time status tracking.

#### 3.4.2 AccessPolicy

Defines the access control policy for a skill. Valid values:

| Value | Description |
|---|---|
| `"public"` | Accessible to all consumers without restriction. |
| `"restricted"` | Accessible only to authenticated consumers with appropriate permissions. |
| `"private"` | Hidden from unauthenticated discovery requests; requires authentication for both discovery and invocation. |

> **Concrete examples for each policy:**
>
> - `"public"` — A public weather API that anyone can query without authentication. Any iFay instance that discovers it can immediately invoke it to retrieve forecasts.
> - `"restricted"` — A company's internal document search skill — visible to everyone during discovery, but only employees with valid corporate credentials can actually invoke it. An outside iFay would see the skill listed but receive a `403 Permission Denied` when attempting to use it.
> - `"private"` — A military-grade satellite imagery skill that is completely hidden from public discovery and requires top-secret clearance for both discovery and invocation. Unauthenticated requests to the Well-Known URI will not even reveal that this skill exists.

#### 3.4.3 AuthType

Defines the authentication method required to invoke a skill. Valid values:

| Value | Description |
|---|---|
| `"api_key"` | API key-based authentication. |
| `"oauth2"` | OAuth 2.0 authentication. |
| `"custom"` | A custom authentication mechanism. |
| `"none"` | No authentication required. |

#### 3.4.4 ExecutionStatus

Defines the execution status of a skill invocation. Valid values:

| Value | Description |
|---|---|
| `"accepted"` | The invocation request has been accepted. |
| `"running"` | The skill is currently executing. |
| `"completed"` | Execution completed successfully. |
| `"failed"` | Execution failed. |
| `"timeout"` | Execution timed out. |

### 3.5 Sub-Structure Definitions

#### 3.5.1 ProtocolVersion

| Field | Type | Required | Description |
|---|---|---|---|
| `version` | `string` | Yes | SemVer format version string (e.g., `"1.0.0"`). |
| `changelog_url` | `string` | No | URL to the version changelog. |

#### 3.5.2 ParameterDefinition

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | Yes | Parameter name. |
| `type` | `string` | Yes | JSON Schema type (e.g., `"string"`, `"number"`, `"object"`). |
| `description` | `string` | Yes | Human-readable description of the parameter. |
| `required` | `boolean` | Yes | Whether this parameter is required. |
| `default` | `any` | No | Default value if the parameter is not provided. |
| `schema` | `object` | No | Nested JSON Schema for complex types. |

#### 3.5.3 InvocationEndpoint

| Field | Type | Required | Description |
|---|---|---|---|
| `url` | `string` | Yes | The invocation URL. |
| `method` | `string` | Yes | HTTP method. One of: `"GET"`, `"POST"`, `"PUT"`, `"DELETE"`. |
| `content_type` | `string` | No | Request content type. Defaults to `"application/json"`. |
| `status_url` | `string` | No | Status query endpoint template containing `{execution_id}` placeholder. |
| `result_url` | `string` | No | Result retrieval endpoint template. |
| `timeout_ms` | `number` | No | Invocation timeout in milliseconds. |
| `retry` | `object` | No | Retry configuration with `max_attempts` and `backoff_ms`. |

#### 3.5.4 OutputDefinition

| Field | Type | Required | Description |
|---|---|---|---|
| `content_type` | `string` | Yes | MIME type of the output (e.g., `"application/json"`). |
| `schema` | `object` | No | JSON Schema describing the output structure. |
| `description` | `string` | No | Human-readable description of the output. |

#### 3.5.5 AuthConfig

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `AuthType` | Yes | The authentication type. |
| `description` | `string` | No | Human-readable description of the authentication requirements. |
| `header` | `string` | No | Header name for API key authentication. |
| `oauth2` | `object` | No | OAuth 2.0 configuration (required when `type` is `"oauth2"`). |
| `custom` | `object` | No | Custom authentication configuration (required when `type` is `"custom"`). |

**OAuth2 Configuration:**

| Field | Type | Required | Description |
|---|---|---|---|
| `authorization_url` | `string` | Yes | The OAuth 2.0 authorization URL. |
| `token_url` | `string` | Yes | The OAuth 2.0 token URL. |
| `scopes` | `Record<string, string>` | Yes | Available scopes as key-value pairs (scope name → description). |

**Custom Authentication Configuration:**

| Field | Type | Required | Description |
|---|---|---|---|
| `instructions` | `string` | Yes | Human-readable instructions for the custom authentication flow. |
| `parameters` | `ParameterDefinition[]` | Yes | Parameters required for the custom authentication. |

### 3.6 Example: Valid Skill Descriptor

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

## 4. Discovery Mechanism Specification

### 4.1 Overview

The Discovery Mechanism defines how skill consumers locate Skill Descriptors in a decentralized network. Three discovery paths are supported, with the Well-Known URI being the primary method.

> **Analogy:** Think of the Well-Known URI as a "business card" that any domain can publish to advertise its available skills. Just as web browsers discover RSS feeds via `<link rel="alternate">` tags in HTML, or Bitcoin nodes discover peers through DNS seed nodes and `addr` messages, the `/.well-known/skill-sharing` path provides a standardized, predictable location where any iFay instance can look to find what skills a domain offers — no prior knowledge or central directory required.

### 4.2 Discovery Paths

| Path | Method | Description |
|---|---|---|
| **Well-Known URI** | `GET /.well-known/skill-sharing` | Primary discovery method. Returns a Skill Index for the domain. |
| **Direct URL** | `GET {skill_descriptor_url}` | Retrieves a specific Skill Descriptor when its URL is already known. |
| **Registry Query** | `GET {registry_url}/skills?type={capability_type}` | Optional. Queries a Skill Registry for batch skill retrieval. |

### 4.3 Well-Known URI

#### 4.3.1 Path

```
/.well-known/skill-sharing
```

Skill providers MUST serve a Skill Index document at this path. The response MUST have a `Content-Type` of `application/json`.

#### 4.3.2 Skill Index Structure

The Skill Index is a JSON document listing all skills declared by a provider domain.

| Field | Type | Required | Description |
|---|---|---|---|
| `protocol` | `ProtocolVersion` | Yes | The protocol version. |
| `provider` | `object` | Yes | Provider information (MUST contain `name`; MAY contain `url`). |
| `skills` | `SkillIndexEntry[]` | Yes | Array of skill index entries. |

#### 4.3.3 SkillIndexEntry Structure

Each entry in the Skill Index contains summary information about a skill:

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | Yes | The skill's unique identifier. |
| `name` | `string` | Yes | The skill's human-readable name. |
| `capability_type` | `CapabilityType` | Yes | The skill's capability classification. |
| `description` | `string` | Yes | A brief description of the skill. |
| `descriptor_url` | `string` | Yes | The full URL to the skill's complete Skill Descriptor. |
| `access` | `AccessPolicy` | Yes | The skill's access control policy. |
| `version` | `string` | Yes | The skill's version. |

#### 4.3.4 Skill ID Uniqueness

All skill IDs within a single Skill Index MUST be unique. A Skill Index containing duplicate IDs is considered invalid.

### 4.4 Access Control in Discovery

When an **unauthenticated** request is made to the Well-Known URI:
- Skills with `access: "private"` MUST be excluded from the response.
- Skills with `access: "public"` or `access: "restricted"` MUST be included.

When an **authenticated** request is made:
- All skills (including `private`) MAY be included, subject to the provider's authorization logic.

### 4.5 Capability Type Filtering

Consumers MAY filter the Skill Index by `capability_type`. When filtering:
- The result MUST contain only entries whose `capability_type` matches the filter value.
- All entries in the original index matching the filter value MUST appear in the result.

### 4.6 Example: Skill Index

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

> **Note:** In an unauthenticated discovery request, the `"internal-analytics"` entry (with `access: "private"`) would be excluded from the response.

---

## 5. Invocation Protocol Specification

### 5.1 Overview

The Invocation Protocol defines how a skill consumer remotely invokes a discovered skill. The protocol follows an asynchronous request-response pattern with status polling.

> **End-to-End Scenario — Restaurant Booking:**
>
> Imagine iFay needs to book a restaurant for a user. Here is how the full flow works:
>
> 1. **Discovery:** iFay sends `GET /.well-known/skill-sharing` to `opentable.example.com` and receives a Skill Index listing a `"restaurant-booking"` skill with `capability_type: "task"` and `access: "restricted"`.
> 2. **Descriptor Retrieval:** iFay fetches the full Skill Descriptor from the `descriptor_url` and validates it against the protocol schema.
> 3. **Authentication:** The descriptor specifies `auth.type: "oauth2"`. iFay completes the OAuth 2.0 flow to obtain an access token with the `"book:reservation"` scope.
> 4. **Invocation:** iFay sends a POST request to the invocation endpoint with inputs: `{ "cuisine": "Italian", "date": "2025-08-15", "time": "19:00", "party_size": 4, "city": "San Francisco" }`.
> 5. **Accepted:** The provider responds with `status: "accepted"` and an `execution_id` of `"exec-r3s7v9"`.
> 6. **Polling:** iFay polls the `status_url` and sees `status: "running"` as the system searches for available tables.
> 7. **Completion:** On the next poll, the status is `"completed"` with output: `{ "restaurant": "Trattoria Roma", "confirmation_code": "TR-20250815-042", "time": "19:00", "address": "123 Columbus Ave, SF" }`.
> 8. iFay presents the reservation confirmation to the user.

### 5.2 Invocation Flow

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

### 5.3 Invocation Request

An InvocationRequest is sent by the consumer to initiate skill execution.

| Field | Type | Required | Description |
|---|---|---|---|
| `caller` | `object` | Yes | Caller identity information. |
| `caller.id` | `string` | Yes | Unique identifier of the caller. |
| `caller.type` | `string` | Yes | Caller type (e.g., `"ifay"`, `"service"`, `"user"`). |
| `caller.credentials` | `object` | No | Authentication credentials. |
| `skill_id` | `string` | Yes | The target skill's unique identifier. |
| `inputs` | `Record<string, unknown>` | Yes | Input parameters as key-value pairs. |
| `context` | `object` | No | Invocation context. |
| `context.trace_id` | `string` | No | Distributed tracing identifier. |
| `context.priority` | `string` | No | Execution priority: `"low"`, `"normal"`, or `"high"`. |
| `context.timeout_ms` | `number` | No | Client-side timeout in milliseconds. |

#### Example: Invocation Request

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

### 5.4 Invocation Response

An InvocationResponse is returned by the provider at each stage of execution.

| Field | Type | Required | Description |
|---|---|---|---|
| `execution_id` | `string` | Yes | Unique identifier for this execution. |
| `status` | `ExecutionStatus` | Yes | Current execution status. |
| `skill_id` | `string` | Yes | The target skill's identifier. |
| `output` | `any` | No | Output data (present when `status` is `"completed"`). |
| `error` | `object` | No | Error information (present when `status` is `"failed"` or `"timeout"`). |
| `error.code` | `string` | Yes* | Error code. |
| `error.message` | `string` | Yes* | Human-readable error message. |
| `error.details` | `any` | No | Additional error details. |
| `error.retry` | `object` | No | Retry suggestion with `suggested_delay_ms` and `max_attempts`. |
| `timestamps` | `object` | Yes | Execution timestamps. |
| `timestamps.created_at` | `string` | Yes | When the execution was created (ISO 8601). |
| `timestamps.updated_at` | `string` | Yes | When the execution was last updated (ISO 8601). |
| `timestamps.completed_at` | `string` | No | When the execution completed (ISO 8601). |

> \* Required when the `error` object is present.

#### Example: Invocation Response (Completed)

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

### 5.5 Invocation Endpoints

The Skill Descriptor's `endpoint` field defines three URL templates:

| Endpoint | Purpose | Template Variable |
|---|---|---|
| `url` | Submit invocation request | — |
| `status_url` | Query execution status | `{execution_id}` |
| `result_url` | Retrieve execution result | `{execution_id}` |

Consumers MUST replace `{execution_id}` with the actual execution ID returned in the initial response.

---

## 6. Version Management Specification

### 6.1 Semantic Versioning

The Skill Sharing Protocol follows [Semantic Versioning 2.0.0](https://semver.org/) (SemVer). All version strings MUST conform to the `MAJOR.MINOR.PATCH` format, where:

- **MAJOR** — A non-negative integer. Incremented for incompatible protocol changes.
- **MINOR** — A non-negative integer. Incremented for backward-compatible additions.
- **PATCH** — A non-negative integer. Incremented for backward-compatible bug fixes.

Examples of valid version strings: `"1.0.0"`, `"2.3.1"`, `"0.1.0"`.

### 6.2 Version Declaration

Every Skill Descriptor MUST declare the protocol version it conforms to in the `protocol.version` field:

```json
{
  "protocol": {
    "version": "1.0.0",
    "changelog_url": "https://example.com/protocol/changelog"
  }
}
```

The optional `changelog_url` field provides a reference to the version changelog.

### 6.3 Compatibility Rules

| Condition | Result |
|---|---|
| Descriptor MAJOR > Consumer MAJOR | **Incompatible.** The consumer cannot handle a newer major version. |
| Descriptor MAJOR = Consumer MAJOR | **Compatible.** Minor and patch differences are backward-compatible. |
| Descriptor MAJOR < Consumer MAJOR | **Compatible.** The consumer can handle older major versions. |

### 6.4 Incompatibility Handling

When a consumer encounters a Skill Descriptor with an incompatible protocol version:

1. The consumer MUST NOT attempt to invoke the skill.
2. The consumer SHOULD return a `VERSION_INCOMPATIBLE` error (see [Section 8](#8-error-handling-specification)).
3. The error response SHOULD include the consumer's supported version range and the descriptor's required version.

### 6.5 Schema Versioning

Schema definition files are maintained in versioned directories:

```
schema/
├── draft/              # Current working draft
│   ├── schema.json
│   ├── schema.ts
│   └── schema.mdx
└── 2025-10-25/         # Released version (date-based)
    ├── schema.json
    ├── schema.ts
    └── schema.mdx
```

When a new protocol version is released, the draft schemas are copied to a new date-stamped directory.

---

## 7. Security and Authentication Specification

### 7.1 Overview

The Skill Sharing Protocol provides a flexible authentication and access control framework. Skill providers declare their security requirements in the Skill Descriptor, and consumers are responsible for satisfying those requirements before invocation.

### 7.2 Authentication Types

#### 7.2.1 API Key (`api_key`)

The simplest authentication method. The consumer provides an API key in a specified HTTP header.

```json
{
  "auth": {
    "type": "api_key",
    "description": "Include your API key in the X-API-Key header.",
    "header": "X-API-Key"
  }
}
```

#### 7.2.2 OAuth 2.0 (`oauth2`)

Standard OAuth 2.0 authentication flow. The Skill Descriptor provides the authorization and token URLs along with available scopes.

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

#### 7.2.3 Custom (`custom`)

For authentication methods not covered by API key or OAuth 2.0. The descriptor provides human-readable instructions and required parameters.

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

#### 7.2.4 None (`none`)

No authentication is required. The skill is freely accessible.

```json
{
  "auth": {
    "type": "none"
  }
}
```

### 7.3 Access Control Policies

Access control is declared at the Skill Descriptor level via the `access` field:

| Policy | Discovery Behavior | Invocation Behavior |
|---|---|---|
| `"public"` | Visible in all discovery responses. | No authentication required (unless `auth.type` is not `"none"`). |
| `"restricted"` | Visible in all discovery responses. | Authentication required; only authorized consumers may invoke. |
| `"private"` | Hidden from unauthenticated discovery requests. | Authentication required; only authorized consumers may invoke. |

### 7.4 Authentication Flow

1. The consumer retrieves the Skill Descriptor.
2. The consumer inspects the `auth` field to determine the required authentication method.
3. The consumer attaches the appropriate credentials to the invocation request.
4. If credentials are missing or invalid, the provider returns a `401` error with details about the required authentication method.
5. If credentials are valid but insufficient permissions exist, the provider returns a `403` error.

---

## 8. Error Handling Specification

### 8.1 Error Categories

The protocol defines seven error categories:

| Error Category | Code | HTTP Status | Scenario |
|---|---|---|---|
| Validation Error | `VALIDATION_ERROR` | N/A (local) | Schema Validator detects an invalid Skill Descriptor. |
| Authentication Required | `AUTH_REQUIRED` | 401 | Valid credentials were not provided when invoking a protected skill. |
| Permission Denied | `PERMISSION_DENIED` | 403 | Credentials are valid but lack sufficient permissions. |
| Skill Not Found | `SKILL_NOT_FOUND` | 404 | The requested skill ID or descriptor URL does not exist. |
| Invocation Timeout | `INVOCATION_TIMEOUT` | 408 / 504 | Skill execution exceeded the configured timeout. |
| Endpoint Unreachable | `ENDPOINT_UNREACHABLE` | 502 / 503 | The invocation endpoint could not be reached. |
| Version Incompatible | `VERSION_INCOMPATIBLE` | 422 | The Skill Descriptor's protocol version is incompatible with the consumer. |

### 8.2 Unified Error Response Format

All error responses MUST conform to the following structure:

```json
{
  "error": {
    "code": "<ErrorCode>",
    "message": "<human-readable message>",
    "details": {},
    "retry": {
      "suggested_delay_ms": 0,
      "max_attempts": 0
    }
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `error.code` | `string` | Yes | One of the seven error codes listed above. |
| `error.message` | `string` | Yes | A human-readable error message. |
| `error.details` | `any` | No | Additional context-specific error details. |
| `error.retry` | `object` | No | Retry suggestion. |
| `error.retry.suggested_delay_ms` | `number` | Yes* | Suggested delay before retrying (milliseconds). |
| `error.retry.max_attempts` | `number` | Yes* | Maximum number of retry attempts. |

> \* Required when the `retry` object is present.

### 8.3 Error Handling Strategies

#### 8.3.1 Validation Error

Returned locally by the Schema Validator when a Skill Descriptor fails validation. The `details` field SHOULD contain an array of validation errors, each with:

- `path` — The JSON Pointer path to the invalid field.
- `message` — A description of the validation failure.
- `expected` — The expected value or type.
- `actual` — The actual value or type found.

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

#### 8.3.2 Authentication Required

Returned when the consumer fails to provide valid credentials. The `details` field SHOULD describe the required authentication method to help the consumer complete authentication automatically.

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

#### 8.3.3 Permission Denied

Returned when credentials are valid but the consumer lacks the required permissions.

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

#### 8.3.4 Skill Not Found

Returned when the requested skill ID or descriptor URL does not exist.

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

#### 8.3.5 Invocation Timeout

Returned when skill execution exceeds the configured timeout. The `retry` field provides guidance for retry attempts.

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

#### 8.3.6 Endpoint Unreachable

Returned when the invocation endpoint cannot be reached. Consumers SHOULD implement exponential backoff retry strategies.

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

#### 8.3.7 Version Incompatible

Returned when the Skill Descriptor's protocol version is incompatible with the consumer. The `details` field SHOULD include both the consumer's supported version range and the descriptor's required version.

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

## 9. Schema Reference

### 9.1 JSON Schema

The authoritative schema definition is maintained as a JSON Schema (Draft 2020-12) file:

- **Draft:** [`schema/draft/schema.json`](../../../../schema/draft/schema.json)
- **Schema ID:** `https://ifay.org/schema/draft/skill-sharing-protocol.json`

The schema defines the following top-level types via `$defs`:

| Definition | Description |
|---|---|
| `SkillDescriptor` (root) | The complete Skill Descriptor structure. |
| `SkillIndex` | The Well-Known URI response containing a list of skills. |
| `SkillIndexEntry` | A single entry in the Skill Index. |
| `InvocationRequest` | The skill invocation request structure. |
| `InvocationResponse` | The skill invocation response structure. |
| `ProtocolVersion` | Protocol version information. |
| `CapabilityType` | Capability type enumeration. |
| `AccessPolicy` | Access control policy enumeration. |
| `AuthType` | Authentication type enumeration. |
| `ExecutionStatus` | Execution status enumeration. |
| `ParameterDefinition` | Input/output parameter definition. |
| `AuthConfig` | Authentication configuration. |
| `InvocationEndpoint` | Invocation endpoint configuration. |
| `OutputDefinition` | Output format definition. |

### 9.2 TypeScript Type Definitions

TypeScript interfaces are provided for type-safe development:

- **Draft:** [`schema/draft/schema.ts`](../../../../schema/draft/schema.ts)

All TypeScript types are exported and maintain semantic equivalence with the JSON Schema definitions. The mapping rules are:

| TypeScript | JSON Schema |
|---|---|
| `string` | `{ "type": "string" }` |
| `number` | `{ "type": "number" }` |
| `boolean` | `{ "type": "boolean" }` |
| Union type `"a" \| "b"` | `{ "enum": ["a", "b"] }` |
| `interface` | `{ "type": "object", "properties": {...} }` |
| Optional field `field?` | Not in `required` array |
| `Record<string, T>` | `{ "type": "object", "additionalProperties": {...} }` |
| `unknown` | `{}` (unconstrained) |

### 9.3 Schema Validation

Implementations SHOULD use the JSON Schema file (`schema.json`) with a JSON Schema Draft 2020-12 compliant validator (e.g., [Ajv](https://ajv.js.org/)) to validate Skill Descriptors.

The Schema Validator provides three core operations:

| Operation | Description |
|---|---|
| `validate(document)` | Validates a document against the schema. Returns a result with `valid` (boolean) and `errors` (array of validation errors). |
| `parse(document)` | Validates and parses a document into a typed `SkillDescriptor` object. Throws on invalid input. |
| `serialize(descriptor)` | Serializes a `SkillDescriptor` object to pretty-printed JSON (2-space indentation). |

---

## 10. Appendix: Complete Examples

### 10.1 Full Discovery and Invocation Workflow

**Step 1: Discover skills via Well-Known URI**

```http
GET /.well-known/skill-sharing HTTP/1.1
Host: skills.example.com
Accept: application/json
```

**Response:**

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

**Step 2: Retrieve the full Skill Descriptor**

```http
GET /skills/text-summarizer.json HTTP/1.1
Host: skills.example.com
Accept: application/json
```

**Response:** A complete Skill Descriptor document (see [Section 3.6](#36-example-valid-skill-descriptor) for the full structure).

**Step 3: Validate the Skill Descriptor**

The consumer validates the retrieved document against `schema/draft/schema.json` using a Schema Validator. If validation fails, the consumer MUST NOT invoke the skill.

**Step 4: Invoke the skill**

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

**Response (Accepted):**

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

**Step 5: Poll for status**

```http
GET /api/v1/status/exec-f5e4d3c2 HTTP/1.1
Host: skills.example.com
```

**Response (Completed):**

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

### 10.2 Error Response Example

**Invoking a skill without authentication:**

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

**Response (401):**

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

## License

This specification is part of the Skill Sharing Protocol project. See the [LICENSE](../../../../LICENSE) file for details.
