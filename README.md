# Claude Cloud Control Center

> **Mobile-First Thin-Client Remote Control Plane for Cloud-Hosted AI Workstations**  
> **Phase 1 Release (Foundational Control Plane & Verification Gate)**

---

## Overview

Claude Cloud Control Center is a mobile-first, thin-client remote control plane engineered to supervise, monitor, and control cloud-hosted development workstations running Claude Code and MCP agents.

### The Immutable Architectural Rule: Thin Client Only
The user's mobile device or browser is **strictly a thin client**:
- The browser **NEVER** runs Claude Code, MCP servers, compiler toolchains, Git engines, or Linux containers.
- The browser **NEVER** stores local repositories or executes shell binaries.
- All real work occurs remotely. The client functions purely as an authorized remote monitoring, approval, and control console.

---

## Phase 1 Scope & Release Status

This repository implements **Phase 1 ONLY**:
- **Authoritative REST API Gateway** (`/api/v1/*`) with structured JSON contracts, request correlation IDs (`x-request-id`), and strict error schemas.
- **Fail-Closed Authentication & RBAC**: Bearer tokens for `OWNER`, `OPERATOR`, and `VIEWER` roles. Forged client headers are strictly ignored.
- **Truthful Normal-Mode Startup**: An unconfigured deployment starts in a truthful, non-hallucinatory state (`NOT_CONFIGURED` / `0` projects / `—` metrics), isolated from simulated demo data.
- **Server-Authoritative Approval Gate**: Strict risk-level enforcement (`SAFE`, `CONFIRM`, `STRONG_CONFIRM`), idempotency guards against double resolution, and cross-resource mismatch validation.
- **Deterministic Activity State Machine**: Formal transition matrix preventing illegal jumps or execution bypasses. Terminal states `COMPLETED` and `CANCELLED` are immutable.
- **Strict Path Security**: Hardened file validator rejecting directory traversal (`..`), percent-encoded attacks, absolute paths, null bytes, and malicious drive prefixes.
- **Modern MCP Gateway**: Standardized on Streamable HTTP transport as the modern remote standard, retaining legacy HTTP+SSE solely for backwards compatibility.
- **Pristine Quality Gates**: 0 TypeScript errors, 0 ESLint errors, 0 failing tests, 0 build warnings.

---

## Toolchain & Package Manager

**Bun** is the authoritative, sole package manager for this repository:
- `bun.lock` is tracked and authoritative.
- CI installs dependencies using frozen lockfile: `bun install --frozen-lockfile`.
- All operational scripts are standardized across Bun and Node:

```bash
# Install dependencies with frozen lockfile
bun install --frozen-lockfile

# Typecheck codebase (Zero errors)
bun run typecheck

# Lint codebase with ESLint (Zero errors)
bun run lint

# Run unit and integration tests with Vitest (Zero failing tests)
bun run test

# Compile and package client bundle with Vite (Zero errors)
bun run build

# Start local full-stack development server on port 3000
bun run dev
```

---

## Continuous Integration (CI)

The GitHub Actions workflow (`.github/workflows/ci.yml`) enforces the release verification pipeline:
1. **Checkout Code**
2. **Setup Bun** (latest stable)
3. **Install Dependencies** (`bun install --frozen-lockfile`)
4. **Typecheck** (`bun run typecheck`)
5. **Lint** (`bun run lint`)
6. **Test** (`bun run test`)
7. **Build** (`bun run build`)

---

## Operating Modes

### 1. Normal Mode (Default: `PHASE1_DEMO_MODE=false`)
A fresh, unconfigured installation reflects truthful ground truth:
- **Control Plane**: `HEALTHY`
- **Execution Backend**: `NOT_CONFIGURED`
- **Claude / MCP / LiteLLM / GitHub / Backup**: `NOT_CONFIGURED`
- **Projects / Activities / Sessions / Jobs**: `0`
- **Telemetry / Costs / Tokens**: `—` (Unknown != Zero)
- No fake hostnames, no invented Git repositories, no simulated terminal PTYs.

### 2. Demo Mode (`PHASE1_DEMO_MODE=true`)
When explicitly enabled via environment variable:
- Populates representative mock entities for UX evaluation.
- Every simulated resource is clearly badged with `DEMO SIMULATION`.
- Demo data remains completely segregated from production persistence stores.

---

## Authentication & Access Control

Authentication fails closed:
- Unauthenticated requests to protected endpoints return `401 Unauthorized`.
- Role resolution is performed exclusively by the server via verified Bearer tokens:
  - `AUTH_TOKEN_OWNER`: Grants full administrative control (`OWNER`).
  - `AUTH_TOKEN_OPERATOR`: Grants operational mutation capabilities (`OPERATOR`).
  - `AUTH_TOKEN_VIEWER`: Grants read-only inspection access (`VIEWER`).
- Forged client headers (e.g. `x-role`, `x-demo-role`) are discarded.

---

## Project Structure

```
├── .github/workflows/ci.yml   # Authoritative Bun CI workflow
├── server/                    # Full-stack API & Backend
│   ├── middleware/            # Auth, security headers, error handling
│   ├── policy/                # Central action and risk policies
│   ├── repositories/memory/   # In-memory repositories (Projects, Activities, Approvals, etc.)
│   ├── routes/                # Canonical /api/v1/* router
│   ├── validation/            # Path and input safety validators
│   └── tests/                 # Server integration & security test suites
├── src/                       # React 19 Frontend Thin Client
│   ├── adapters/              # HTTP and Mock client implementations
│   ├── components/            # Mobile-first screen features and common UI
│   ├── context/               # ControlCenterContext & FirebaseAuthContext
│   ├── domain/                # Contracts, enums, models, state machines
│   └── utils/                 # Truthful formatters (formatCurrency, formatTokens, etc.)
├── server.ts                  # Express server entry point mounting Vite middlewares
├── bun.lock                   # Authoritative Bun lockfile
├── package.json               # Package definitions and npm/bun scripts
├── tsconfig.json              # TypeScript compilation configuration
└── ARCHITECTURE.md            # Detailed system architectural specification
```

---

## License

Apache-2.0
