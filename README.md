# Skill Sharing Protocol (`ssp/1.0`)

**Skill Sharing Protocol (SSP)** is a decentralized, self-sovereign protocol for declaring, discovering, verifying, and invoking external capabilities (`plugin`, `api`, `knowledge`, `task`) across **Fay** entities (**iFay** personal companions and **coFay** organizational agents) on behalf of **Human Prime** (`人类原型`) or organizations.

iFay and coFay instances can be continuously enhanced with knowledge bases, service APIs, plugins, and asynchronous human-in-the-loop tasks while preserving end-to-end cryptographic provenance and Default-Deny safety.

## Key Capabilities in SSP 1.0 (Edition `2025-10-25`)

- **Two-Segment Protocol Versioning (`ssp/1.0`)**: Wire protocol versions use `MAJOR.MINOR` (`"1.0"`, token `ssp/1.0`) with stateless same-`MAJOR` compatibility (`descriptor.major === consumer.major`) and optional `SSP-Supported-Versions` HTTP header advertisement. Individual skill implementation versions (`SkillDescriptor.version`) remain independent SemVer strings.
- **Cryptographic Trust Root (RFC 8785 JCS + Detached Ed25519 JWS)**: Providers sign `SkillDescriptor` and `SkillIndex` payloads (`SkillProof` with `alg: "EdDSA"`) anchored at same-origin `/.well-known/fayid`. Consumers enforce Origin ↔ FayID bidirectional binding and a **Default-Deny** gate (`unverified` skills are never automatically invoked without explicit Human Prime confirmation via Faying Protocol; tampered or cross-origin payloads are unconditionally rejected).
- **Canonical FayID Attribution & Endpoint Security**: `InvocationRequest.caller.id` requires canonical `ifay_<base32>` or `cofay_<base32>` identifiers with optional `mandate_ref` attribution. Providers enforce server-side authentication and authorization (`401 AUTH_REQUIRED` / `403 PERMISSION_DENIED`) on **both** descriptor fetch and invocation/polling endpoints for `private` and `restricted` skills—never relying on index hiding alone.
- **Pure HTTP Reference Stack & Non-Monetary `task` Polling**: Zero-external-runtime `node:http` Provider (`SspHttpProvider`), Consumer (`SspHttpConsumer`), and optional pass-through `SkillRegistryMirror` supporting synchronous and asynchronous status polling without monetary settlement coupling.

## Repository Layout

| Path | Description |
|------|-------------|
| `schemas/ssp-1.0.json` | Normative JSON Schema Draft 2020-12 for SSP 1.0 |
| `schema/2025-10-25/` | Frozen Edition `2025-10-25` schema (`schema.json`, `schema.ts`, `schema.mdx`) |
| `schema/draft/` | Synchronized active specification draft schema (`schema.json`, `schema.ts`, `schema.mdx`) |
| `vectors/ssp-1.0-conformance.json` | 18 deterministic positive, negative, and boundary conformance vectors |
| `src/version.ts` | Two-segment `MAJOR.MINOR` / `ssp/MAJOR.MINOR` parser, same-`MAJOR` compatibility, and header negotiation |
| `src/crypto.ts` | Pure `node:crypto` RFC 8785 JCS canonicalizer, Detached Ed25519 JWS signer/verifier, Origin ↔ FayID check, and Default-Deny gate |
| `src/validator.ts` | Ajv Draft 2020-12 validator, parser, and serializer for `SkillDescriptor`, `SkillIndex`, and `/.well-known/fayid` |
| `src/discovery.ts` | Access-policy filtering, capability-type filtering, and `SkillIndex` ID uniqueness checks |
| `src/invocation.ts` | `InvocationRequest` / `InvocationResponse` validation and unified 7-code SSP error constructors |
| `src/http-provider.ts` | Reference `node:http` SSP 1.0 Provider server and pass-through `SkillRegistryMirror` |
| `src/http-consumer.ts` | Reference SSP 1.0 Consumer client (discovery, end-to-end JWS verification, Default-Deny gate, invocation & polling) |
| `docs/{lang}/specification/` | Multilingual specification snapshots (`2025-10-25/`) and authoritative `zh-CN` draft chapters |

## Verification & Testing

```bash
# Type-check TypeScript reference implementation and schema definitions
npm run typecheck

# Run unit tests, 18 conformance vectors, loopback HTTP e2e tests, and 11 fast-check property suites
npm test

# Compile TypeScript build output
npm run build
```

## License

**MIT (Reference Implementations, Schemas & Test Vectors) / CC BY 4.0 (Specifications & Blueprints)** — Copyright (c) 2025-2026 ChainMode contributors. See [`LICENSE`](./LICENSE) and [`LICENSE-DOCS`](./LICENSE-DOCS).
