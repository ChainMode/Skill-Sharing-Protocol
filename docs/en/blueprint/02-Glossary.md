# Chapter 2: Glossary

## 2.1 Core Terms

| Term | Definition |
|------|-----------|
| iFay | Intelligent cognitive companion system; the primary consumer of the Skill Sharing Protocol, capable of discovering and invoking skills to enhance its own capabilities |
| Skill | A callable capability unit declared following the protocol, including but not limited to plugins, APIs, knowledge packs, and task execution capabilities |
| Skill Provider | An entity (individual, organization, or automated system) that declares and exposes skills on the internet |
| Skill Consumer | An entity that discovers and invokes skills, primarily iFay instances |
| Skill Descriptor | A skill metadata document conforming to the protocol Schema definition, describing a skill's capabilities, interfaces, invocation methods, etc. |

## 2.2 Protocol Terms

| Term | Definition |
|------|-----------|
| Discovery Mechanism | The methods and processes by which skill consumers locate and discover skill descriptors in a decentralized network |
| Protocol Schema | The formalized specification defining the structure of skill descriptors, including JSON Schema, TypeScript types, and MDX documentation |
| Skill Registry | An optional skill indexing service used to accelerate skill discovery, but not a prerequisite for protocol operation |
| Invocation Endpoint | The remote invocation entry address declared in a skill descriptor |
| Capability Type | The classification identifier for skills, including plugin, api, knowledge, and task |
| Schema Validator | A tool or component that validates skill descriptor compliance against the protocol Schema |
| Protocol Version | The version identifier of the protocol specification, following semantic versioning |

## 2.3 Technical Terms

| Term | Definition |
|------|-----------|
| Well-Known URI | The standardized discovery path `/.well-known/skill-sharing`, used to expose the skill index under a domain |
| Skill Index | The document returned by the Well-Known URI, containing a reference list of all declared skill descriptors under a domain |
| Semantic Versioning (SemVer) | Version number format `MAJOR.MINOR.PATCH`, used for protocol version management |
| JSON Schema | A standard for describing JSON data structures; this protocol uses Draft 2020-12 |
| Access Policy | The visibility level of a skill: public, restricted, or private |
| Execution ID | A unique identifier returned after skill invocation, used to track execution status and retrieve results |
