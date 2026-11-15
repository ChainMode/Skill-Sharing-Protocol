# Contributing to Skill Sharing Protocol (SSP)

Thank you for contributing to **Skill Sharing Protocol (SSP)**! This document covers local verification, schema and conformance vector discipline, commit sign-off, ecosystem terminology, and dual-track licensing.

## Code of Conduct & Security

- All community members must adhere to our [Code of Conduct](./CODE_OF_CONDUCT.md) (contact: **jah.g@ifay.ai**).
- Report security issues privately following [SECURITY.md](./SECURITY.md) instead of opening public issues or pull requests.

## Contribution Workflow

1. Fork `https://github.com/ChainMode/Skill-Sharing-Protocol` on GitHub.
2. Clone your fork and configure `upstream`:
   ```bash
   git clone https://github.com/<your-username>/Skill-Sharing-Protocol.git
   cd Skill-Sharing-Protocol
   git remote add upstream https://github.com/ChainMode/Skill-Sharing-Protocol.git
   ```
3. Create a topic branch from `main` (`feat/`, `fix/`, `docs/`, `schema/`, `test/`, `chore/`).
4. Ensure type-checking, property-based tests, HTTP loopback suites, and conformance vectors pass before opening a Pull Request.

## Build, Test & Conformance Vector Verification

```bash
# Install dependencies
pnpm install

# Type-check TypeScript reference stack & schema types
pnpm run typecheck

# Run unit tests, 18 conformance vectors, HTTP loopback E2E & 11 fast-check property suites
pnpm test

# Verify TypeScript build compilation
pnpm run build
```

## Schema & Conformance Vector Discipline

- **Frozen `1.0` Baseline**: `schemas/ssp-1.0.json`, `schema/2025-10-25/`, and `vectors/ssp-1.0-conformance.json` define the normative `ssp/1.0` contract and are **frozen** once released. Never introduce breaking changes or overwrite frozen `1.0` schema files in place.
- **Additive Minor Evolution**: Backward-compatible minor protocol additions MUST use new versioned schema and vector files (for example `schemas/ssp-1.1.json` and `vectors/ssp-1.1-conformance.json`), keeping `schema/draft/` (`schema.json`, `schema.ts`, `schema.mdx`) synchronized.
- **Security Invariants**: Changes to `src/crypto.ts`, `src/http-provider.ts`, or `src/http-consumer.ts` MUST preserve Detached Ed25519 JWS + RFC 8785 JCS verification, Origin <-> `/.well-known/fayid` binding, Default-Deny blocking of unverified descriptors without explicit **Human Prime** consent, and non-monetary `task` polling semantics.

## Ecosystem Terminology Rules

Use positive canonical iFay terminology throughout code, schemas, and documentation:

- **`Human Prime`** (`人类原型`): Exclusively denotes the natural person mapped and served by an `iFay`.
- **`Host`** (`宿主`): Strictly denotes a runtime terminal hardware device or client software application.
- **`Fay`** (`iFay` + `coFay`): Denotes an accountable digital avatar identified by canonical `ifay_<base32>` or `cofay_<base32>` identifiers.
- **`GMChain`** (`公誉链`) & **`MeriToken`** (`美誉值` / `Merit Unit`): Denotes the ecosystem's strictly non-monetary social contribution reputation metric.

## Commit Convention & DCO 1.1 Sign-Off

Use [Conventional Commits](https://www.conventionalcommits.org/) (`feat`, `fix`, `docs`, `schema`, `refactor`, `test`, `chore`).

Every commit MUST carry a **Developer Certificate of Origin v1.1 (DCO 1.1)** `Signed-off-by` trailer (`git commit -s`) certifying contribution rights under https://developercertificate.org/:

```text
feat(crypto): add negative vector for mismatched well-known origin

Signed-off-by: Your Legal Name <you@example.com>
```

## Dual-Track Inbound = Outbound Licensing

Contributions follow `Inbound = Outbound` dual-track licensing (`Copyright (c) 2025-2026 ChainMode contributors`):

- **MIT License** ([`LICENSE`](./LICENSE)) for reference implementations (`src/`), machine-readable schemas (`schemas/`, `schema/`), and conformance test vectors (`vectors/`).
- **Creative Commons Attribution 4.0 International (`CC BY 4.0`)** ([`LICENSE-DOCS`](./LICENSE-DOCS)) for protocol specifications and architectural blueprint documents under `docs/`.
