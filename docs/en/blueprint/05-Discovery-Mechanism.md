# Chapter 5: Discovery Mechanism

## 5.1 Overview

The Discovery Mechanism defines how skill consumers locate and retrieve Skill Descriptors in a decentralized network. The protocol provides three complementary discovery paths to ensure flexibility and extensibility.

## 5.2 Well-Known URI Discovery

### Path Specification

Skill providers expose a standardized path under their domain:

```
GET https://{domain}/.well-known/skill-sharing
```

### Response Format: Skill Index

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
      "id": "com.example.translate-v1",
      "name": "Universal Translator",
      "capability_type": "api",
      "description": "High-quality text translation service supporting 100+ languages",
      "descriptor_url": "https://example.com/skills/translate/descriptor.json",
      "access": "restricted",
      "version": "2.1.0"
    },
    {
      "id": "com.example.sentiment-v1",
      "name": "Sentiment Analyzer",
      "capability_type": "api",
      "description": "Text sentiment analysis service",
      "descriptor_url": "https://example.com/skills/sentiment/descriptor.json",
      "access": "public",
      "version": "1.0.0"
    }
  ]
}
```

### Skill Index Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `protocol` | ProtocolVersion | Yes | Protocol version |
| `provider` | object | Yes | Provider information |
| `provider.name` | string | Yes | Provider name |
| `provider.url` | string | No | Provider website |
| `skills` | SkillIndexEntry[] | Yes | Skill list |

### Skill Index Entry Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique skill identifier |
| `name` | string | Yes | Skill name |
| `capability_type` | CapabilityType | Yes | Capability type |
| `description` | string | Yes | Brief description |
| `descriptor_url` | string | Yes | Full descriptor URL |
| `access` | AccessPolicy | Yes | Access control policy |
| `version` | string | Yes | Skill version |

## 5.3 Direct URL Discovery

When a consumer already knows the full URL of a Skill Descriptor, it can be retrieved directly:

```
GET https://example.com/skills/translate/descriptor.json
```

The response is a complete Skill Descriptor JSON document.

## 5.4 Registry Discovery (Optional)

A Skill Registry is an optional index service used to accelerate cross-domain skill discovery. The registry is not a prerequisite for protocol operation.

### Query Interface

```
GET {registry_url}/skills?type={capability_type}
```

### Response Format

Returns a list of matching skill descriptor references in the same format as Skill Index entries.

## 5.5 Access Control and Discovery

The discovery mechanism is closely linked to access control policies:

| Access Policy | Unauthenticated Discovery | Authenticated Discovery | Invocation |
|---------------|---------------------------|------------------------|------------|
| `public` | ✓ Visible | ✓ Visible | No authentication required |
| `restricted` | ✓ Visible | ✓ Visible | Authentication required |
| `private` | ✗ Not visible | ✓ Visible | Authentication required |

Key rules:
- When an unauthenticated request accesses the Well-Known URI, the returned Skill Index **does not include** any skills with `access` set to `private`
- Authenticated requests can see all skills (including private ones)

## 5.6 Capability Type Filtering

Consumers can filter skills by capability type:

```
GET /.well-known/skill-sharing?type=api
```

Filtering rules:
- Every skill in the result set has a `capability_type` equal to the filter value
- All skills matching that type from the original set appear in the results
- Filtering does not affect access control rules (private skills remain invisible to unauthenticated requests)

## 5.7 Skill Identifier Uniqueness

Within the same Skill Index, all skills must have unique `id` field values. The recommended ID format is:

```
{reverse_domain}.{skill_name}-v{major_version}
```

Examples:
- `com.example.translate-v1`
- `org.openai.gpt4-v1`
- `io.github.user.code-review-v2`
