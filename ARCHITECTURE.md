# CLAUDE CLOUD CONTROL CENTER — ARCHITECTURAL SPECIFICATION

## 1. Executive Summary & Core Principle

**Claude Cloud Control Center** is a mobile-first, thin-client remote control plane for a cloud-hosted AI development workstation running on an Oracle Linux Virtual Machine.

### The Immutable Architectural Rule: Thin Client Only
The user's mobile device or desktop browser is **strictly a thin client**:
- The browser **NEVER** runs Claude Code, MCP servers, Node.js development workloads, Python scripts, Git operations, compilers, build systems, test runners, Docker/Podman, or Linux/PRoot containers.
- The browser **NEVER** stores local workspace clones or executes shell binaries.
- The phone acts exclusively as an authorized remote monitoring, inspection, approval, and control console. All state generation and real side-effects occur remotely on the cloud VM host.

---

## 2. Why the Browser Is NOT the Source of Truth

In traditional mobile or web applications, the browser holds state and persists edits optimistically. In our architecture, the **remote host is the single source of truth**:

1. **Survival Across Device Detachments**:
   - **Browser reload**: The remote activity execution continues without pause.
   - **Browser closed / Phone powered off**: The remote cgroup sandbox executes tests, builds, and tool calls uninterrupted.
   - **Network drop / Airplane mode**: The thin client displays `OFFLINE / DISCONNECTED (Control connection unavailable. Remote execution state will be checked after reconnection.)`. When connectivity returns, the client fetches the event sequence and replays state up to the current sequence number.
2. **Orphan Recovery**:
   - If the remote daemon process or VM host reboots, durable checkpoints (`Checkpoint`) and append-only event logs (`ActivityEvent`) allow the remote supervisor to detect interrupted activities and mark them `RECOVERABLE`.
3. **No Secret Leakage**:
   - API keys (Anthropic, Gemini, OpenAI, GitHub PATs, Cloudflare tokens) remain sealed in server-side vault environments. The client receives only redacted, typed metadata.

---

## 3. Domain Model & Schema Versioning

Every durable domain object and event begins with `schemaVersion: 1` to guarantee migration readiness for future Phase 3 SQLite or Postgres persistence.

### Core Resources
1. **Project**:
   - Identifies remote workspace directories (`rootPath`), Git branch pointers, and activity counts.
2. **Activity**:
   - First-class work-item object containing execution status, phase, `currentAction`, `nextAction`, `blocker`, files changed, test results, estimated costs, and checkpoint pointers.
3. **ActivityEvent**:
   - Append-only event stream (`SESSION_STARTED`, `TOOL_STARTED`, `TOOL_COMPLETED`, `FILE_CHANGED`, `COMMAND_STARTED`, `TEST_COMPLETED`, `APPROVAL_REQUESTED`, `CHECKPOINT_CREATED`, etc.).
   - Client UI is reconstructed through event stream hydration rather than mutable client-side caches.
4. **Checkpoint**:
   - Immutable snapshot of the working tree and Git commit SHA before risky mutations or at key step boundaries.
5. **PendingApproval**:
   - Durable representation of a sensitive action awaiting user confirmation.
6. **ClaudeSession**:
   - Session telemetry, tokens used, context window percentage, and cost metrics.

### Activity Status Lifecycle
```
[DRAFT] -> [QUEUED] -> [STARTING] -> [RUNNING] <-----> [PAUSED]
                                        |
                 +----------------------+----------------------+
                 |                      |                      |
                 v                      v                      v
        [WAITING_APPROVAL]         [COMPLETED]            [FAILED]
                 |                                             |
                 v                                             v
            (Approved)                                   [RECOVERABLE]
```

---

## 4. Permission & Risk Tier Model

Every action executed through the Control Center is evaluated against a 3-tier risk boundary:

| Risk Tier | Scope | Examples | Enforcement |
|---|---|---|---|
| **SAFE** | Read-only inspection & isolated verification | View status, read logs, browse files, inspect Git, run unprivileged tests | Immediate execution |
| **CONFIRM** | Non-destructive remote mutations | Git push, open PR, toggle MCP server, restart daemon, dispatch activity | User confirmation prompt in UI |
| **STRONG_CONFIRM** | Privileged, destructive, or kernel-level mutations | Host reboot, delete remote file, rewind checkpoint, sysctl kernel tuning | High-visibility modal with command payload preview |

---

## 5. Adapter Architecture & System Boundaries

The application is structured around clean hexagonal adapter boundaries:

```
[ Mobile Browser (React + TypeScript) ]
                   │
                   ▼ (HTTP REST / RemoteTerminalAdapter)
[ Express API Gateway (/api/v1/*) ]
                   │
       ┌───────────┴───────────┐
       ▼                       ▼
[ In-Memory Repositories ] [ Mock Adapters ]
   (Phase 1 Prototype)       (Phase 1 Telemetry)
       │                       │
       ▼ (Phase 3 swap)        ▼ (Phase 2 swap)
[ SQLite Database ]      [ Remote Oracle Linux Agent Daemon ]
                            ├── Claude Code CLI
                            ├── MCP Multiplexer Gateway
                            ├── Kernel Cgroups & Podman
                            └── Oracle Object Storage Backups
```

### Typed API Interfaces (Contracts)
All UI components interface strictly with typed TypeScript contracts:
- `HealthApi`
- `DashboardApi`
- `ProjectsApi`
- `ActivitiesApi`
- `SessionsApi`
- `EventsApi`
- `FilesApi`
- `TerminalApi` (backed by `RemoteTerminalAdapter`)
- `GitHubApi`
- `McpApi`
- `ModelsApi`
- `JobsApi`
- `MonitoringApi`
- `BackupApi`
- `AdminApi`

---

## 6. Verification and Readiness for Phase 2

- **Zero Local Workloads**: No execution occurs in the browser.
- **Degraded State Visibility**: 4-state indicator system (`HEALTHY`, `DEGRADED`, `UNAVAILABLE`, `UNKNOWN`).
- **Mobile-First Touch Compliance**: All interactives meet or exceed 44px hit-box requirements with safe-area spacing.
- **Ready for Oracle Daemon**: Phase 2 replaces the mock adapters with real HTTP/WebSocket client wrappers connecting to the remote Oracle Linux daemon over Cloudflare Zero Trust.
