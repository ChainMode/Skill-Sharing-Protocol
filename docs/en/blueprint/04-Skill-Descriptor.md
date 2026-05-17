# Chapter 4: Skill Descriptor

## 4.1 Overview

The Skill Descriptor is the protocol's core data structure, existing as a JSON document that fully describes a skill's metadata. It serves as the contract between skill providers and consumers — providers declare a skill's capabilities through the descriptor, and consumers understand how to invoke the skill through it.

## 4.2 Complete Field Definitions

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `protocol` | ProtocolVersion | Protocol version information |
| `id` | string | Unique skill identifier |
| `name` | string | Skill name |
| `version` | string | Skill version (SemVer format) |
| `capability_type` | CapabilityType | Capability type |
| `description` | string | Skill description |
| `provider` | object | Skill provider information |
| `endpoint` | InvocationEndpoint | Invocation endpoint configuration |
| `inputs` | ParameterDefinition[] | Input parameter definitions |
| `output` | OutputDefinition | Output format definition |
| `auth` | AuthConfig | Authentication configuration |
| `access` | AccessPolicy | Access control policy |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `tags` | string[] | Tags (for search and classification) |
| `documentation_url` | string | Skill documentation URL |
| `created_at` | string | Creation time (ISO 8601) |
| `updated_at` | string | Update time (ISO 8601) |

## 4.3 Enum Types

### CapabilityType

```json
["plugin", "api", "knowledge", "task"]
```

- `plugin`: Embeddable functional module
- `api`: Remote service interface
- `knowledge`: Structured knowledge resource
- `task`: Human or iFay executable task

### AccessPolicy

```json
["public", "restricted", "private"]
```

- `public`: Open; anyone can discover and invoke
- `restricted`: Discoverable but invocation requires authentication
- `private`: Not discoverable without authentication

### AuthType

```json
["api_key", "oauth2", "custom", "none"]
```

## 4.4 Sub-structure Definitions

### ProtocolVersion

```json
{
  "version": "1.0.0",
  "changelog_url": "https://example.com/changelog"
}
```

- `version` (required): Protocol version number in SemVer format
- `changelog_url` (optional): Version changelog URL

### InvocationEndpoint

```json
{
  "url": "https://example.com/skills/translate/invoke",
  "method": "POST",
  "content_type": "application/json",
  "status_url": "https://example.com/skills/translate/status/{execution_id}",
  "result_url": "https://example.com/skills/translate/result/{execution_id}",
  "timeout_ms": 30000,
  "retry": {
    "max_attempts": 3,
    "backoff_ms": 1000
  }
}
```

### ParameterDefinition

```json
{
  "name": "text",
  "type": "string",
  "description": "Text to translate",
  "required": true,
  "default": null,
  "schema": { "minLength": 1, "maxLength": 10000 }
}
```

### AuthConfig

API Key authentication example:
```json
{
  "type": "api_key",
  "description": "Pass API Key via HTTP Header",
  "header": "X-API-Key"
}
```

OAuth 2.0 authentication example:
```json
{
  "type": "oauth2",
  "oauth2": {
    "authorization_url": "https://example.com/oauth/authorize",
    "token_url": "https://example.com/oauth/token",
    "scopes": {
      "skill:invoke": "Invoke skill",
      "skill:read": "Read skill information"
    }
  }
}
```

### OutputDefinition

```json
{
  "content_type": "application/json",
  "schema": {
    "type": "object",
    "properties": {
      "translated_text": { "type": "string" },
      "source_language": { "type": "string" },
      "target_language": { "type": "string" }
    }
  },
  "description": "Translation result including translated text and language information"
}
```

## 4.5 Complete Example

The following is a complete descriptor example for a translation skill:

```json
{
  "protocol": {
    "version": "1.0.0",
    "changelog_url": "https://skill-sharing.org/changelog"
  },
  "id": "com.example.translate-v1",
  "name": "Universal Translator",
  "version": "2.1.0",
  "capability_type": "api",
  "description": "High-quality text translation service supporting 100+ languages",
  "provider": {
    "name": "Example Corp",
    "url": "https://example.com",
    "contact": "skills@example.com"
  },
  "endpoint": {
    "url": "https://api.example.com/skills/translate/invoke",
    "method": "POST",
    "content_type": "application/json",
    "status_url": "https://api.example.com/skills/translate/status/{execution_id}",
    "result_url": "https://api.example.com/skills/translate/result/{execution_id}",
    "timeout_ms": 30000,
    "retry": {
      "max_attempts": 3,
      "backoff_ms": 1000
    }
  },
  "inputs": [
    {
      "name": "text",
      "type": "string",
      "description": "Text to translate",
      "required": true,
      "schema": { "minLength": 1, "maxLength": 10000 }
    },
    {
      "name": "target_language",
      "type": "string",
      "description": "Target language code (ISO 639-1)",
      "required": true
    },
    {
      "name": "source_language",
      "type": "string",
      "description": "Source language code (leave empty for auto-detection)",
      "required": false,
      "default": "auto"
    }
  ],
  "output": {
    "content_type": "application/json",
    "schema": {
      "type": "object",
      "properties": {
        "translated_text": { "type": "string" },
        "source_language": { "type": "string" },
        "target_language": { "type": "string" },
        "confidence": { "type": "number" }
      }
    },
    "description": "Translation result"
  },
  "auth": {
    "type": "api_key",
    "description": "Pass key via X-API-Key header",
    "header": "X-API-Key"
  },
  "access": "restricted",
  "tags": ["translation", "nlp", "multilingual"],
  "documentation_url": "https://docs.example.com/skills/translate",
  "created_at": "2025-01-15T08:00:00Z",
  "updated_at": "2025-03-20T14:30:00Z"
}
```
