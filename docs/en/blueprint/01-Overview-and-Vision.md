# Chapter 1: Overview and Vision

## 1.1 Project Background

Skill Sharing Protocol is a core sub-project of the iFay ecosystem. As an intelligent cognitive companion system, iFay needs a standardized way to discover and invoke capabilities distributed across the internet — we collectively refer to these capabilities as "skills."

Current AI capability extension models rely on centralized platforms (such as plugin marketplaces and API gateways), which introduce single points of failure, platform lock-in, and innovation bottlenecks. Skill Sharing Protocol proposes a new decentralized paradigm: skill providers declare and expose skills on the internet following protocol conventions, and iFay can autonomously discover and remotely invoke these skills.

This concept is analogous to:
- **The Web's hyperlink model**: Anyone can publish content under their own domain, and search engines discover it automatically
- **Blockchain's decentralized nodes**: No centralized registration needed; nodes declare and discover autonomously
- **P2P seed discovery mechanisms**: Resource location in distributed networks

## 1.2 Core Philosophy

> Any executable capability can become an invocable skill.

The scope of "skills" encompasses:

| Type | Description | Examples |
|------|-------------|----------|
| Plugin | Embeddable functional modules | Image processing plugin, text analysis plugin |
| API | Remote service interfaces | Weather query API, translation service |
| Knowledge | Structured knowledge resources | Domain knowledge base, FAQ dataset |
| Task | Human or iFay executable tasks | Code review, document translation |

## 1.3 Design Principles

1. **Decentralized Discovery**: Skill providers declare skills under their own domains; consumers discover skills through standardized paths without centralized platforms
2. **Self-Describing**: Each skill fully describes its capabilities, interfaces, and invocation methods through a standardized Skill Descriptor
3. **Protocol as Specification**: Deliverables are protocol documents and Schema definition files, not software applications
4. **Open and Inclusive**: Protocol documentation in 9 languages, targeting the global developer community

## 1.4 Project Deliverables

This is an open-source project with the following deliverables:

1. **Protocol Specification Documents**: 9 language versions (en, zh-CN, zh-TW, ja, ko, de, fr, es, ru)
2. **Schema Definition Files**:
   - JSON Schema (Draft 2020-12)
   - TypeScript type definitions
   - MDX interactive documentation
3. **Schema Validator**: A tool for validating skill descriptor compliance against the protocol Schema

## 1.5 Target Audience

- **Skill Providers**: Those who wish to expose their capabilities as discoverable and invocable skills
- **Skill Consumers (iFay instances)**: Those who need to discover and invoke external skills to enhance their own capabilities
- **Protocol Integration Developers**: Those building tools, SDKs, or platforms based on the protocol
- **Global Developer Community**: Those participating in protocol discussion, improvement, and implementation
