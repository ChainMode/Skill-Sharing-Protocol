# Chapter 3: Architecture

## 3.1 Overall Architecture

The protocol adopts a decentralized Provider-Consumer architecture, similar to the Web's hyperlink discovery model and P2P network node discovery mechanisms.

```
┌─────────────────────────────────────────────────────────┐
│              Skill Provider Domain                        │
│                                                         │
│  ┌──────────────────────────┐                           │
│  │ /.well-known/skill-sharing│                           │
│  └────────┬─────────────────┘                           │
│           │                                             │
│     ┌─────┴─────┐                                       │
│     ▼           ▼                                       │
│  ┌──────┐   ┌──────┐                                   │
│  │Desc A│   │Desc B│                                   │
│  └──┬───┘   └──┬───┘                                   │
│     ▼           ▼                                       │
│  ┌──────┐   ┌──────┐                                   │
│  │Endpt A│   │Endpt B│                                   │
│  └──────┘   └──────┘                                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              Skill Consumer (iFay)                        │
│                                                         │
│  ┌────────────┐  ┌──────────────┐  ┌────────────┐      │
│  │Discovery   │→ │Schema        │→ │Invocation  │      │
│  │Client      │  │Validator     │  │Client      │      │
│  └────────────┘  └──────────────┘  └────────────┘      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│         Optional: Skill Registry                         │
│                                                         │
│  ┌────────────────────────────────────┐                 │
│  │          Registry Index            │                 │
│  │  (Index refs → Provider descriptors)│                 │
│  └────────────────────────────────────┘                 │
└─────────────────────────────────────────────────────────┘
```

## 3.2 Protocol Interaction Flow

### Phase 1: Skill Discovery

```
Skill Consumer (iFay)                Skill Provider
      │                                  │
      │── GET /.well-known/skill-sharing ─→│
      │                                  │
      │←── Skill Index ─────────────────│
      │                                  │
      │── Schema Validator parse/verify ──→│
      │                                  │
```

### Phase 2: Skill Invocation

```
Skill Consumer (iFay)                Skill Provider
      │                                  │
      │── POST {invocation_endpoint} ────→│
      │   (invocation request)           │
      │                                  │
      │←── 202 Accepted ─────────────────│
      │   (confirmation + execution_id)  │
      │                                  │
      │── GET {status_endpoint}/{id} ────→│
      │                                  │
      │←── execution status ─────────────│
      │   (running/completed/failed)     │
      │                                  │
      │── GET {result_endpoint}/{id} ────→│
      │                                  │
      │←── execution result ─────────────│
      │                                  │
```

## 3.3 Three Discovery Paths

| Path | Method | Description | Use Case |
|------|--------|-------------|----------|
| Well-Known URI | `GET /.well-known/skill-sharing` | Primary discovery method; returns index of all skills under a domain | Exploring all skills from a provider |
| Direct URL | `GET {skill_descriptor_url}` | Direct retrieval when descriptor URL is known | Known skill address |
| Registry Query | `GET {registry_url}/skills?type={type}` | Optional; batch retrieval via registry | Searching skills by type |

## 3.4 File Organization

```
project-root/
├── docs/
│   ├── en/                          # Baseline language (English)
│   │   ├── specification/
│   │   │   ├── 2025-10-25/          # Versioned documents
│   │   │   └── draft/               # Draft documents
│   │   ├── blueprint/               # Blueprint documents
│   │   ├── community/               # Community documents
│   │   ├── develop/                 # Development guides
│   │   └── sdk/                     # SDK documentation
│   ├── zh-CN/                       # Simplified Chinese (same structure)
│   ├── zh-TW/                       # Traditional Chinese
│   ├── ja/                          # Japanese
│   ├── ko/                          # Korean
│   ├── de/                          # German
│   ├── fr/                          # French
│   ├── es/                          # Spanish
│   └── ru/                          # Russian
├── schema/
│   ├── draft/                       # Draft Schema
│   │   ├── schema.json              # JSON Schema (Draft 2020-12)
│   │   ├── schema.ts                # TypeScript type definitions
│   │   └── schema.mdx               # MDX interactive documentation
│   └── 2025-10-25/                  # Versioned Schema
│       ├── schema.json
│       ├── schema.ts
│       └── schema.mdx
└── src/                             # Tool source code
    ├── validator.ts                 # Schema Validator
    ├── discovery.ts                 # Discovery mechanism logic
    ├── invocation.ts                # Invocation protocol logic
    └── version.ts                   # Version management logic
```

## 3.5 Component Responsibilities

### Discovery Client

Responsible for locating skill descriptors in the decentralized network:
- Sends requests to Well-Known URI to retrieve skill indexes
- Retrieves known skill descriptors via direct URL
- Performs batch retrieval via registries
- Supports filtering queries based on capability type

### Schema Validator

Responsible for validating skill descriptor compliance:
- Validates skill descriptor documents using schema.json
- Parses valid documents into structured Skill Descriptor objects
- Returns specific violation fields and reasons for invalid documents
- Supports serializing Skill Descriptor objects to Pretty Print JSON

### Invocation Client

Responsible for remotely invoking discovered skills:
- Constructs standardized invocation requests
- Handles authentication flows
- Manages execution status queries
- Handles timeout and error responses
