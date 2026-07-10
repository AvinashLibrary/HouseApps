# Software Design Document (SDD)
## FlowMac — AI Orchestration & Automation Platform for macOS

**Version:** 0.1 (Draft)
**Companion to:** FlowMac PRD v0.1

---

## 1. Purpose

This document describes the technical architecture, components, data models, and execution model for FlowMac — a macOS app that automates AI tools (and any other app) via browser automation, Electron CDP, and the macOS Accessibility API, orchestrated through a visual flow engine.

---

## 2. High-Level Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                            FlowMac.app                             │
│                     (Tauri shell, Rust + WebView UI)                │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────┐    │
│  │                   Flow Editor UI (React/WebView)            │    │
│  │  Canvas, node blocks, compare view, element inspector UI    │    │
│  └───────────────────────────┬─────────────────────────────────┘    │
│                              │ IPC (Tauri commands / events)         │
│  ┌───────────────────────────▼─────────────────────────────────┐    │
│  │                    Flow Engine (Rust core)                   │    │
│  │  - Parses flow JSON graph                                     │    │
│  │  - Schedules block execution (sequential/parallel)            │    │
│  │  - Manages retries, timeouts, fallback routing                │    │
│  │  - Dispatches each step to the correct automation driver      │    │
│  └───┬───────────────────────┬───────────────────────┬───────────┘    │
│      │                       │                       │                │
│ ┌────▼─────┐         ┌───────▼───────┐       ┌───────▼───────┐       │
│ │ Playwright│        │   AX Driver    │       │ AppleScript   │       │
│ │  Sidecar  │        │  (Swift/Rust   │       │   Runner      │       │
│ │ (Node.js) │        │  via ApplicationServices) │ (osascript)│       │
│ │           │        │                │       │               │       │
│ │ • Browser │        │ • Native apps  │       │ • Finder      │       │
│ │   tabs    │        │ • Electron via │       │ • Mail        │       │
│ │ • Electron│        │   AX fallback  │       │ • Calendar    │       │
│ │   via CDP │        │                │       │ • Contacts    │       │
│ └───────────┘        └────────────────┘       └───────────────┘       │
└───────────────────────────────────────────────────────────────────┘
```

### 2.1 Process Model

- **Main process**: Tauri app (Rust), owns the UI window, the Flow Engine, and IPC.
- **Playwright sidecar**: a long-lived Node.js child process, communicating with the Rust core over a local JSON-RPC channel (stdio or local socket). Manages persistent browser contexts (one per AI target, with saved sessions) and connects to Electron apps via Chrome DevTools Protocol (CDP).
- **AX driver**: a small Swift (or Rust + `accessibility-sys`/`objc2`) helper binary invoked by the Rust core, wrapping `AXUIElement` calls for native app automation and the element inspector overlay.
- **AppleScript runner**: shells out to `osascript` for apps with strong AppleScript dictionaries (Finder, Mail, Calendar, Contacts) where AX API would be more brittle.

Each automation surface is isolated in its own process so a crash/hang in one (e.g., a stuck browser) doesn't take down the whole app.

---

## 3. Component Design

### 3.1 Flow Editor (Frontend)

- **Stack**: React + TypeScript, rendered inside Tauri's WebView.
- **Canvas library**: a node-graph library (e.g., React Flow) for drag-and-drop blocks and connections.
- **Responsibilities**:
  - Render flow graph, block palette, and property panels.
  - Serialize/deserialize flow to/from JSON (see §5 Data Model).
  - Render the **Compare View** (side-by-side responses with Copy/Use/Merge actions).
  - Render the **Element Inspector overlay** (hover-highlight, click-to-capture) by requesting screen coordinates/AX metadata from the Rust core.
- **Communication**: Tauri `invoke()` for commands (e.g., `run_flow`, `capture_element`), Tauri events for streaming progress/log updates back from the engine.

### 3.2 Flow Engine (Rust Core)

- **Responsibilities**:
  - Load and validate flow JSON against a schema.
  - Build an execution graph (DAG) from blocks and connections.
  - Execute nodes respecting dependencies: sequential chains run in order; nodes with no data dependency between them run concurrently (bounded by a configurable max-parallelism setting).
  - Maintain per-run state: variables, intermediate outputs, execution log.
  - Route each `AI Prompt`-type block to the correct driver based on the target's **App Type** (see §3.5 detection logic).
  - Implement retry/backoff and fallback-chain logic (`Retry on Rate Limit` block semantics).
  - Persist run history (flow_id, run_id, timestamps, per-block status/output) to local storage (SQLite).

### 3.3 Playwright Sidecar (Node.js)

- **Responsibilities**:
  - Maintain **persistent browser contexts** per AI website target, each with its own saved storage state (cookies/session) so the user stays logged in across runs.
  - Provide a driver interface per site (a **Site Adapter**): `navigate()`, `sendPrompt(text)`, `waitForResponseComplete()`, `extractResponse()`.
  - For Electron apps: detect the app's remote-debugging port (launching with `--remote-debugging-port` if not already running under one, or attaching to an already-running instance where possible) and control it via Playwright's CDP connection using the same Site Adapter interface.
  - Expose a JSON-RPC API to the Rust core: `openTarget`, `sendPrompt`, `getResponse`, `closeTarget`, `listActiveTargets`.

**Site Adapter interface (TypeScript):**
```ts
interface SiteAdapter {
  id: string;                     // "claude-web", "chatgpt-web", "claude-desktop", ...
  match(kind: "browser" | "electron"): boolean;
  open(context: BrowserContext | Page): Promise<void>;
  sendPrompt(page: Page, prompt: string): Promise<void>;
  waitForResponse(page: Page, timeoutMs: number): Promise<void>;
  extractResponse(page: Page): Promise<string>;
}
```
Each supported AI target (ChatGPT, Claude.ai, Gemini, Perplexity, Claude Desktop, ChatGPT Desktop, Cursor...) implements this interface with its own selectors/heuristics, isolated so that a UI change in one site only requires updating its adapter.

### 3.4 AX Driver (Native App Automation)

- **Responsibilities**:
  - Query the Accessibility tree of a target application (`AXUIElementCopyAttributeValue`, `AXUIElementCopyElementAtPosition`, etc.).
  - Locate text-input elements (by role `AXTextField`/`AXTextArea`, or by a previously captured element reference).
  - Set values (`AXUIElementSetAttributeValue` with `kAXValueAttribute`) or simulate keystrokes via `CGEvent` for apps that don't support direct value-setting.
  - Trigger actions (`AXUIElementPerformAction`, e.g. `kAXPressAction` for send buttons).
  - Poll a target text element until its value stabilizes (used as the "response finished" heuristic for native apps without a DOM-level streaming signal).
  - Power the **Element Inspector**: given a screen point (from mouse hover), resolve the AX element under the cursor and return its role, label, and a stable path/identifier for storage.
- **Element reference format**: since AX elements aren't stably addressable across app restarts, references are stored as a **path descriptor** (role + title/identifier + ancestor chain + relative position fallback), re-resolved at runtime with fuzzy matching.

### 3.5 App-Type Detection

```
Input: target app bundle identifier + running process info
   ├─ Is it a known browser (Safari/Chrome/Arc/Brave)?
   │     → Playwright driver, navigate by URL
   ├─ Is it a known Electron app (check for Electron framework in bundle,
   │   or presence of a debug port when launched with our helper)?
   │     → Playwright driver via CDP
   ├─ Is it a CLI/shell task?
   │     → Shell block, no GUI driver needed
   └─ Else (native app: AppKit/SwiftUI/Qt/Java/etc.)
         → AX Driver (with AppleScript runner preferred for apps
           with strong scripting dictionaries, e.g. Mail/Finder)
```
Detection results are cached per app bundle ID so repeated runs skip re-detection.

### 3.6 Execution Engine — Scheduling Semantics

- Flow graph = DAG of blocks; edges represent data dependencies.
- **Parallel block**: fans out to N children with no ordering dependency; engine spawns concurrent driver calls (bounded by `maxParallelism`, default 4) and joins results into an array consumed by the next block (e.g., `AI Compare`, `AI Consensus`).
- **Pipeline (sequential) block**: output of block N is substituted into block N+1's prompt template via a variable reference (`{{prev.output}}`).
- **Fallback chain**: modeled as an ordered list of targets on one `AI Prompt` block; engine tries target 1, and on a defined failure condition (timeout, detected rate-limit text, driver error) moves to target 2, etc.
- **Consensus block**: takes N text outputs, computes pairwise similarity (initially: simple normalized string/semantic similarity, e.g. embedding-based or a lightweight text-similarity heuristic) and returns majority/most-similar-cluster result, flagging disagreement if no cluster exceeds a threshold.

---

## 4. Automation Driver Comparison

| Surface | Driver | Key APIs | Notes |
|---|---|---|---|
| Browser tab | Playwright | DOM selectors, network waits | Most reliable; used for web AI targets |
| Electron desktop app | Playwright via CDP | Same DOM selectors as browser, connected via `--remote-debugging-port` | Treat as "a browser we don't control the chrome of" |
| Native macOS app | AX API (`AXUIElement`) | Accessibility tree traversal, `AXUIElementPerformAction`, `AXUIElementSetAttributeValue` | Works on any app exposing AX (required for VoiceOver compliance) |
| Scriptable native app | AppleScript (`osascript`) | App-specific scripting dictionary | Preferred over AX where a rich dictionary exists (Mail, Finder, Calendar) |
| CLI tools | Direct process spawn | `std::process::Command` (Rust) | No GUI automation needed |

---

## 5. Data Model

### 5.1 Flow JSON Schema (simplified)

```json
{
  "id": "flow_uuid",
  "name": "Research Across AIs",
  "version": 1,
  "variables": [{ "name": "topic", "type": "string" }],
  "nodes": [
    {
      "id": "n1",
      "type": "text_input",
      "config": { "prompt": "{{topic}}" }
    },
    {
      "id": "n2",
      "type": "parallel_ai",
      "config": {
        "targets": [
          { "targetId": "claude-web", "promptTemplate": "{{n1.output}}" },
          { "targetId": "chatgpt-web", "promptTemplate": "{{n1.output}}" },
          { "targetId": "gemini-web", "promptTemplate": "{{n1.output}}" }
        ],
        "maxParallelism": 3,
        "timeoutMs": 60000
      }
    },
    {
      "id": "n3",
      "type": "ai_compare",
      "config": { "sources": ["n2.results"] }
    }
  ],
  "edges": [
    { "from": "n1", "to": "n2" },
    { "from": "n2", "to": "n3" }
  ]
}
```

### 5.2 Target Registry

Each automatable AI target is registered with metadata:

```json
{
  "targetId": "claude-web",
  "displayName": "Claude.ai",
  "surface": "browser",
  "url": "https://claude.ai",
  "adapterId": "claude-web-adapter",
  "requiresLogin": true,
  "sessionPersistencePath": "~/Library/Application Support/FlowMac/sessions/claude-web"
}
```

### 5.3 Local Storage

- **SQLite database** (via `rusqlite` or `sqlx`) storing: flows, run history, captured element references, target registry overrides.
- **Browser session storage**: Playwright's `storageState` JSON per target, stored under the app's Application Support directory, encrypted at rest using macOS Keychain-backed encryption where feasible.
- **No credentials are ever entered/stored by FlowMac directly** — it relies on the user's existing logged-in sessions in real browser/app profiles or its own persistent contexts that the user logs into once.

---

## 6. Element Inspector — Design Detail

1. User enters "Record" mode from the Flow Editor.
2. Rust core asks the AX Driver to start a global mouse-move listener (via `CGEventTap`) and, on each move, resolve the AX element under the cursor (`AXUIElementCopyElementAtPosition`).
3. A transparent, click-through overlay window (separate `NSWindow`, ignoring mouse events except for the final click) is drawn around the bounding box of the hovered element, positioned using `AXUIElementCopyAttributeValue(kAXPositionAttribute / kAXSizeAttribute)`.
4. On click, the AX Driver captures: role, title/placeholder, containing window/app bundle ID, and a best-effort stable path descriptor.
5. This descriptor is returned to the Flow Editor and stored as a **captured element reference**, usable by `AI Prompt`/`Type Text`/`Click` blocks targeting native or Electron apps.
6. At runtime, references are re-resolved by matching role + label first, falling back to relative position within the window if the primary match fails (handles minor UI reflows).

---

## 7. Error Handling & Resilience

- **Timeouts**: every driver call has a per-block configurable timeout; on timeout, engine marks the block failed and evaluates fallback/retry config.
- **"Response not detected" heuristic tuning**: for streaming UIs, use a **stability window** (e.g., text unchanged for 1.5s) rather than a fixed wait, configurable per adapter.
- **Selector breakage**: adapters are versioned; if an adapter's key selectors fail health checks (a periodic self-test against the live site), FlowMac flags the target as "may need update" in the UI rather than failing silently.
- **Permission errors**: if Accessibility permission is missing, AX Driver calls fail with a specific error code surfaced to the UI, which shows a guided remediation flow (deep-link to System Settings pane).
- **Process crashes**: Playwright sidecar and AX helper are supervised by the Rust core; a crash triggers automatic restart with exponential backoff, and any in-flight blocks using that driver are marked failed/retried per flow config.

---

## 8. Security & Privacy

- FlowMac does not transmit prompt content or responses to any FlowMac-owned server — all automation and data stays local to the user's Mac (no cloud component in v1).
- Session storage state (cookies) is sensitive; stored in the app's sandboxed Application Support directory, and the app should request only the OS permissions it needs (Accessibility, Automation/AppleScript per-app, and screen recording only if required for visual selector fallback).
- The app must clearly disclose, on first run and per-target, that automating a given AI provider's web/app UI may be subject to that provider's Terms of Service, and let the user opt in per target.
- No arbitrary remote code execution: flow JSON should not allow embedding executable scripts beyond the sanctioned "Shell" block, which itself should have a confirmation step before first run of any new flow containing shell commands.

---

## 9. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Platform | macOS 14 (Sonoma) and later, Apple Silicon + Intel |
| Performance | Default flow with 3 parallel AI targets should complete within the slowest target's natural response time + <2s orchestration overhead |
| Resource usage | Idle app (no active runs) should use <150MB RAM beyond browser/Electron processes it manages |
| Reliability | Sidecar/driver processes auto-recover from crashes without losing flow state |
| Extensibility | New AI targets addable by writing a new Site Adapter without touching core engine code |
| Observability | Every run produces a structured log (per-block timing, input/output snippets, errors) viewable in-app |

---

## 10. Technology Stack Summary

| Layer | Technology |
|---|---|
| App shell / packaging | Tauri (Rust) |
| UI | React + TypeScript, React Flow (node canvas) |
| Core engine | Rust |
| Browser & Electron automation | Playwright (Node.js sidecar), CDP |
| Native app automation | Swift or Rust (`ApplicationServices` / AX API bindings), `CGEventTap` |
| Scripting fallback | AppleScript via `osascript` |
| Local persistence | SQLite (`rusqlite`/`sqlx`) |
| Distribution | Signed & notarized `.dmg`, Sparkle-style auto-update |

---

## 11. Milestones Mapped to PRD Phases

| Phase | Key Technical Deliverables |
|---|---|
| Phase 1 | Tauri scaffold, Flow Engine v1 (sequential + parallel), Playwright sidecar, adapters for Claude.ai/ChatGPT/Gemini/Perplexity, Compare View |
| Phase 2 | CDP auto-connect helper, Electron adapters (Claude Desktop, ChatGPT Desktop, Cursor, VS Code), app-type detector |
| Phase 3 | AX Driver (Swift/Rust helper), Element Inspector overlay, AppleScript runner, Terminal/shell block |
| Phase 4 | Adapter health-check system, run-history UI, template library, DMG signing/notarization, auto-update channel |

---

## 12. Open Technical Questions

- Best-effort vs. guaranteed element re-resolution when native/Electron app UIs change between versions — how much fuzzy matching is acceptable before flagging for user re-capture?
- Should the Playwright sidecar run one shared Chromium/Electron-attached process, or isolate each target in its own process for stability at the cost of memory?
- What similarity method should power the Consensus block (simple string similarity vs. local embedding model vs. asking one AI to judge agreement)?
- Do we need a lightweight local model (on-device) for response extraction/parsing, or is regex/heuristic parsing sufficient for v1?