# Chapter 8: Version Management

## 8.1 Overview

Protocol version management ensures compatibility during protocol evolution, enabling skill providers and consumers to transition smoothly to new versions.

## 8.2 Semantic Versioning

The protocol follows the Semantic Versioning specification:

```
MAJOR.MINOR.PATCH
```

| Version Number | Change Type | Compatibility |
|----------------|-------------|---------------|
| MAJOR | Incompatible protocol changes | Breaking changes; consumers must upgrade |
| MINOR | Backward-compatible feature additions | Older consumers continue to work normally |
| PATCH | Backward-compatible bug fixes | Documentation corrections, Schema fixes |

## 8.3 Version Declaration

Every Skill Descriptor must declare the protocol version it follows:

```json
{
  "protocol": {
    "version": "1.0.0",
    "changelog_url": "https://skill-sharing.org/changelog"
  }
}
```

## 8.4 Version Compatibility Rules

### Compatibility Determination

```
Consumer supported version: X.Y.Z
Descriptor protocol version: A.B.C

Compatible condition: A == X (same major version)
Incompatible condition: A != X (different major version)
```

### Compatibility Matrix Example

| Consumer Version | Descriptor Version | Compatibility | Explanation |
|-----------------|-------------------|---------------|-------------|
| 1.0.0 | 1.0.0 | ✓ Compatible | Exact match |
| 1.0.0 | 1.2.0 | ✓ Compatible | Minor version is backward-compatible |
| 1.0.0 | 1.2.3 | ✓ Compatible | Patch version is backward-compatible |
| 1.0.0 | 2.0.0 | ✗ Incompatible | Different major version |
| 2.0.0 | 1.5.0 | ✗ Incompatible | Different major version |

### Version Incompatibility Response

When a consumer encounters an incompatible protocol version:

```json
{
  "error": {
    "code": "VERSION_INCOMPATIBLE",
    "message": "Protocol version 2.0.0 is not compatible with consumer version 1.x",
    "details": {
      "descriptor_version": "2.0.0",
      "consumer_supported_range": "1.x.x",
      "upgrade_url": "https://skill-sharing.org/upgrade-guide"
    }
  }
}
```

## 8.5 Schema Versioned Directories

Schema definition files are organized by version:

```
schema/
├── draft/                    # Current draft in development
│   ├── schema.json
│   ├── schema.ts
│   └── schema.mdx
└── 2025-10-25/              # Published version
    ├── schema.json
    ├── schema.ts
    └── schema.mdx
```

- `draft/`: The latest version currently in development, which may contain unstable changes
- `{date}/`: Published stable versions, named by release date

## 8.6 Version Changelog

The protocol Schema includes a reference path to the version changelog (`changelog_url`), recording changes for each version:

- Newly added fields or features
- Deprecated fields or features
- Breaking change descriptions
- Migration guides

## 8.7 Backward Compatibility Guarantees

Backward compatibility guarantees for minor version updates:

1. Existing required fields are not removed
2. New fields default to optional
3. Semantics of existing fields are not changed
4. Value domains of enum types are not narrowed
5. Required parameters of existing interfaces are not increased
