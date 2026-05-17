# Chapter 10: Schema Definition Specification

## 10.1 Overview

The protocol provides machine-readable specifications through three formats of Schema definition files, supporting automated validation and code generation.

## 10.2 Deliverables

| File | Format | Purpose |
|------|--------|---------|
| `schema.json` | JSON Schema Draft 2020-12 | Automated validation, code generation |
| `schema.ts` | TypeScript type definitions | Development-time type checking, IDE support |
| `schema.mdx` | MDX interactive documentation | Human-readable documentation, interactive examples |

## 10.3 JSON Schema Specification

### Basic Structure

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://skill-sharing.org/schema/draft/schema.json",
  "title": "Skill Sharing Protocol Schema",
  "description": "Complete Schema definition for the Skill Sharing Protocol",
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

### TypeScript to JSON Schema Mapping Rules

| TypeScript | JSON Schema |
|-----------|-------------|
| `string` | `{ "type": "string" }` |
| `number` | `{ "type": "number" }` |
| `boolean` | `{ "type": "boolean" }` |
| Union type `"a" \| "b"` | `{ "enum": ["a", "b"] }` |
| `interface` | `{ "type": "object", "properties": {...} }` |
| Optional field `field?` | Not in `required` array |
| `Record<string, T>` | `{ "type": "object", "additionalProperties": {...} }` |
| `unknown` | `{}` (no constraints) |

## 10.4 TypeScript Type Definitions

The TypeScript type definition file (`schema.ts`) maintains semantic consistency with the JSON Schema, providing:

- All enum type definitions
- All interface definitions
- Complete type exports
- JSDoc comment descriptions

## 10.5 MDX Interactive Documentation

The MDX document (`schema.mdx`) includes:

- Schema overview and usage guide
- Field description tables for each data model
- Valid descriptor examples
- Invalid descriptor examples (showing common errors)
- Comparison table of JSON Schema and TypeScript types

## 10.6 Versioned Directory Structure

```
schema/
├── draft/                    # Draft version in development
│   ├── schema.json
│   ├── schema.ts
│   └── schema.mdx
└── 2025-10-25/              # Published stable version
    ├── schema.json
    ├── schema.ts
    └── schema.mdx
```

Rules:
- The `draft/` directory always contains the latest development version
- When publishing a new version, draft content is copied to a date-named version directory
- When the JSON Schema is updated, the TypeScript type definitions and MDX documentation must be updated in sync

## 10.7 Schema Validator

The Schema Validator performs compliance validation of any Skill Descriptor document based on `schema.json`:

- Uses the ajv library to load the JSON Schema
- Validates document structural integrity
- Checks enum field value domains
- Returns detailed error information (field path, expected value, actual value)
- Supports parsing (JSON → object) and serialization (object → Pretty Print JSON)
