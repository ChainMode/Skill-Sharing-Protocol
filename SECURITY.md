# Security Policy — Skill Sharing Protocol (SSP)

## Supported Protocol & Artifact Versions

Security advisories and patches are maintained for the following released SSP baseline and reference stack:

| Protocol Version | Normative Artifacts | Security Support |
| --- | --- | --- |
| `1.0` (`ssp/1.0`) | `schemas/ssp-1.0.json`, `schema/2025-10-25/`, `vectors/ssp-1.0-conformance.json`, `src/` | Supported |
| `< 1.0` (pre-release drafts) | Unreleased historical drafts | Unsupported |

> **Note on Test Vectors**: Ed25519 keys and JWS proofs in `vectors/ssp-1.0-conformance.json` are deterministic public conformance fixtures and MUST NOT be used as production credentials.

## Security Scope

Security reports are prioritized for protocol specification or TypeScript reference stack (`src/`) flaws involving:

1. **Detached Ed25519 JWS + RFC 8785 JCS Descriptor Verification**: Signature verification bypasses, JCS canonicalization malleability, `alg: "EdDSA"` header confusion in `SkillProof`, or spoofing of bidirectional Origin <-> same-origin `/.well-known/fayid` provider binding across `SkillDescriptor` and `SkillIndex` payloads (`src/crypto.ts`).
2. **Default-Deny Gate for Unsigned & Unverified Descriptors**: Any path in `SspHttpConsumer` or validator logic that permits tampered or cross-origin descriptors, or invokes an unsigned/unverified skill without explicit **Human Prime** confirmation via Faying Protocol.
3. **SSRF, Transport & Endpoint Authorization Bounds**: Server-Side Request Forgery (SSRF), unsafe redirect/URI resolution, oversized payload exhaustion in `SspHttpConsumer` / `SkillRegistryMirror`, or authorization bypasses where `private` or `restricted` skills fail to enforce `401 AUTH_REQUIRED` / `403 PERMISSION_DENIED` on both descriptor fetch and invocation/task-polling endpoints (`src/http-provider.ts`), as well as `ifay_<base32>` / `cofay_<base32>` caller attribution validation (`src/invocation.ts`).

## Reporting a Vulnerability Privately

**Please do NOT report undisclosed vulnerabilities through public GitHub Issues, Discussions, or Pull Requests.**

### 1. Primary Channel — GitHub Private Vulnerability Reporting

Submit a confidential vulnerability report via **GitHub Security Advisories**:

- **Report URL**: https://github.com/ChainMode/Skill-Sharing-Protocol/security/advisories/new

### 2. Fallback Channel — Security Email

If GitHub Private Vulnerability Reporting is unavailable, email the maintainers directly:

- **Email**: **jah.g@ifay.ai**
- Include `[SECURITY][SSP]` in the subject line along with affected files, minimal reproduction payload or vector, and potential impact.

## Response & Coordinated Disclosure Timeline

- **Initial Acknowledgment**: Within **72 hours** of report receipt.
- **Triage & Severity Assessment**: Within **7 calendar days** of initial acknowledgment.
- **Coordinated Disclosure Window**: **90 days** from receipt to ship fixes, conformance regression vectors, and a coordinated GitHub Security Advisory (with reporter attribution unless anonymity is requested).
