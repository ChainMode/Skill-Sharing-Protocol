# Chapter 11: Multilingual Support

## 11.1 Overview

The protocol targets the global developer community, providing protocol documentation in 9 languages to ensure that developers of different language backgrounds can accurately understand the protocol specification.

## 11.2 Supported Languages

| Language Code | Language | Directory Path | Role |
|---------------|----------|---------------|------|
| `en` | English | `docs/en/` | Baseline language |
| `zh-CN` | Simplified Chinese | `docs/zh-CN/` | Translation |
| `zh-TW` | Traditional Chinese | `docs/zh-TW/` | Translation |
| `ja` | Japanese | `docs/ja/` | Translation |
| `ko` | Korean | `docs/ko/` | Translation |
| `de` | German | `docs/de/` | Translation |
| `fr` | French | `docs/fr/` | Translation |
| `es` | Spanish | `docs/es/` | Translation |
| `ru` | Russian | `docs/ru/` | Translation |

## 11.3 Directory Structure

Each language maintains an independent directory structure:

```
docs/{language_code}/
├── specification/
│   ├── draft/                # Draft specification document
│   │   └── specification.md
│   └── 2025-10-25/          # Versioned specification document
│       └── specification.md
├── blueprint/               # Blueprint documentation
│   └── illustration/        # Illustration resources
├── community/               # Community documentation
├── develop/                 # Development guides
└── sdk/                     # SDK documentation
```

## 11.4 Baseline Language Strategy

- English (en) serves as the baseline language for protocol documentation
- All new content is first written in English
- Other language versions are translated from English
- When baseline language documents are updated, synchronization status is annotated in other language versions

## 11.5 Translation Principles

1. Technical terms are kept in English (e.g., Skill Descriptor, Well-Known URI)
2. Conceptual descriptions are expressed in the target language
3. Comments in code examples are translated to the target language
4. Document structure remains consistent with the baseline language
5. Each translated version annotates the corresponding baseline language version number

## 11.6 Synchronization Status Annotation

When baseline language documents are updated, other language versions should annotate synchronization status in the document header:

```markdown
---
base_version: en/2025-10-25
sync_status: synced | outdated | in_progress
last_synced: 2025-10-25
---
```
