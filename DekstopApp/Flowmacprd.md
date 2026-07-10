# Product Requirements Document (PRD)
## FlowMac — AI Orchestration & Automation Platform for macOS

**Version:** 0.1 (Draft)
**Owner:** [You]
**Status:** Planning

---

## 1. Summary

FlowMac is a macOS desktop application that lets users build visual, no-code **workflows ("flows")** that automate actions across:

1. **Browser-based AI tools** (ChatGPT, Claude.ai, Gemini, Perplexity, etc.)
2. **Desktop AI apps** (Claude Desktop, ChatGPT Desktop, Cursor, VS Code)
3. **Any macOS application** (native, Electron, Qt, Java, CLI tools) via the Accessibility API

The core idea: every AI tool — website or app — is just "a text box in, a text box out." FlowMac types prompts into these boxes, waits for responses, extracts them, and passes them along a chain — running multiple AI tools **sequentially, in parallel, or as a pipeline** — without needing any API keys. It uses the user's existing logged-in sessions and subscriptions.

Think **Power Automate / Zapier**, but pointed at the screen and any app's UI, rather than at web APIs.

---

## 2. Problem Statement

People who use multiple AI tools daily face repetitive, manual friction:

- Copy-pasting the same prompt into ChatGPT, Claude, Gemini, and Perplexity to compare answers.
- Manually chaining outputs ("take Perplexity's research, paste into Claude, ask it to draft, paste into ChatGPT to edit").
- No easy way to get a "consensus" or "best-of" answer across tools without manual copy-paste.
- Existing solutions either require API keys (cost, rate limits, no access to web-only features) or only support chat-in-browser use (no automation, no chaining, no desktop apps).

There is no visual, no-code tool today that automates **both browsers and native/Electron desktop apps** as first-class citizens, with AI tool orchestration as a core use case.

---

## 3. Goals

- Let a non-technical user visually build a flow that sends one prompt to N AI tools and returns combined/compared results.
- Support three automation surfaces: browser tabs, Electron desktop apps, and native macOS apps — transparently, without the user needing to know which is which.
- Require **zero API keys** for the core experience (uses logged-in sessions).
- Support parallel execution, sequential pipelines, fallback chains, and consensus/voting patterns.
- Ship an MVP focused on the browser + top AI tools, then expand to desktop apps and native app automation.
- Be reliable enough to "press one hotkey and walk away" for common flows.

### 3.1 Non-Goals (for v1)

- Not building our own LLM or API access layer — we automate existing UIs only.
- Not a general RPA replacement for every enterprise workflow (no Windows/Linux support, no cloud execution).
- Not guaranteeing 100% automation of every possible third-party app (native apps with custom-rendered UI/no AX support are best-effort).
- Not handling image/audio generation output management in-depth in v1 (Midjourney/Suno are stretch goals, not MVP).

---

## 4. Target Users

- **Power users / prosumers** who already pay for multiple AI subscriptions (ChatGPT Plus, Claude Pro, Gemini Advanced, Perplexity Pro) and want to compare or combine them.
- **Researchers / writers / analysts** who want multi-source fact-checking or drafting pipelines.
- **Developers** who want to chain Claude/ChatGPT with Cursor/VS Code for code-generation-review loops.
- **Indie automation enthusiasts** (Keyboard Maestro / Alfred / Hazel users) looking for an AI-native automation tool.

---

## 5. Key Use Cases (User Stories)

| # | As a... | I want to... | So that... |
|---|---------|---------------|------------|
| 1 | User | send one prompt to multiple AI tools at once | I can compare answers side by side |
| 2 | User | chain AI tools (research → draft → edit) | I automate a multi-step workflow with one click |
| 3 | User | get a consensus answer from 3 AIs | I can trust factual answers more |
| 4 | User | route subtasks to the AI best suited (code vs. research vs. writing) | I get better quality per task type |
| 5 | User | auto-fallback to another AI if one is rate-limited/slow | my workflow doesn't stall |
| 6 | User | batch-run 100 prompts from a CSV across AI tools | I save hours of manual work |
| 7 | User | record a flow once and trigger it via hotkey | repeat tasks take one keystroke |
| 8 | User | point-and-click to "teach" FlowMac what a text box is in any app | I can automate apps without coding selectors |
| 9 | Developer | pipe AI-generated code into Cursor/VS Code and back | I get an automated code-writing/review loop |

---

## 6. Core Features (Functional Requirements)

### 6.1 Flow Editor
- Visual, node-based canvas (drag-and-drop blocks, connect with arrows).
- Save/load/export/import flows as JSON.
- Flow library with starter templates (Parallel Compare, Research Pipeline, Code Review Loop, Consensus Check).

### 6.2 Automation Blocks
| Block | Behavior |
|---|---|
| Text Input | Manual prompt or triggered variable input |
| AI Prompt | Send prompt to one chosen AI (browser, Electron, or native), return response |
| Parallel AI | Fan-out same prompt to N AI targets simultaneously |
| AI Pipeline | Chain output of one AI into input of the next |
| AI Compare | Side-by-side view of N responses with copy/use actions |
| AI Consensus | Majority-vote or similarity-based agreement across N responses |
| Extract from Response | Regex/pattern extraction (e.g., pull code block, pull final answer) |
| Route by AI | Conditional routing based on task type or rules |
| Retry on Failure/Rate Limit | Auto-switch target or retry with backoff |
| Shell / CLI | Run local commands (e.g., `python`, `git`) |
| File I/O | Read/write local files |
| Notification / Clipboard | Native notification, copy result to clipboard |

### 6.3 Automation Targets
- **Browser tab automation**: ChatGPT, Claude.ai, Gemini, Perplexity, Mistral, Grok (MVP set; extensible).
- **Electron desktop app automation**: Claude Desktop, ChatGPT Desktop, Cursor, VS Code, Notion, Slack.
- **Native macOS app automation**: any app exposing Accessibility API elements (Finder, Mail, Notes, Terminal, third-party apps).
- **Auto-detection**: FlowMac identifies whether a target is a browser, Electron app, or native app and routes to the correct automation engine without user configuration.

### 6.4 Element Inspector ("Point & Teach")
- Recording mode: user hovers over any UI element in any app; FlowMac highlights it and shows its identified type/label.
- User clicks to capture the element as a reusable reference in the flow (e.g., "Claude Desktop message input").
- Captured elements are stored per-app and reused across flows.

### 6.5 Execution Engine
- Sequential and parallel execution of blocks.
- Persistent, logged-in browser/app sessions (no repeated login).
- Wait/poll logic for detecting "response finished streaming."
- Error handling: timeouts, retries, fallback routing.
- Execution log / history per flow run.

### 6.6 Triggers
- Manual run (button in app).
- Global hotkey.
- (Stretch) Scheduled runs, file-watch triggers, batch/CSV-driven runs.

---

## 7. Success Metrics

- Time-to-first-flow: a new user can build and run their first "Parallel Compare" flow in under 5 minutes.
- Reliability: ≥95% successful automated runs for the top 5 supported AI targets over a rolling week (excluding target-side outages).
- Adoption of chaining: % of users who build a flow with 2+ chained blocks (indicates value beyond simple comparison).
- Retention: % of users who run at least one flow per week after 30 days.

---

## 8. Constraints & Assumptions

- macOS only (Sequoia/Sonoma and later) — no Windows/Linux in v1.
- Relies on the user's already-authenticated sessions in browsers/apps; FlowMac does not store or manage credentials directly.
- AI providers' web/app UIs can change at any time, breaking selectors — flows need graceful degradation and a maintenance/update mechanism for site adapters.
- Automating third-party sites' UIs may be against some providers' Terms of Service; this is a legal/policy risk the user assumes, and FlowMac should surface this clearly (see Risks).
- Accessibility permissions (macOS System Settings → Privacy & Security → Accessibility) are required and must be requested/explained clearly.

---

## 9. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| AI provider UI changes break selectors | Broken flows | Modular "site adapter" design; versioned adapters; community/auto-update channel |
| ToS violations (automating web UIs) | Account bans, legal exposure | Clear in-app disclaimer; rate-limit human-like interaction; user opts in per target |
| macOS Accessibility permission friction | Poor onboarding, user drop-off | Guided permission flow with visuals; fallback explanations |
| Electron CDP access changes | Desktop app automation breaks | Detect CDP availability gracefully; fall back to AX API automation |
| Response extraction is unreliable (streaming UIs, dynamic DOM) | Wrong/incomplete output | Robust "wait until stable" heuristics; visual + text diffing; manual override |
| Performance with many parallel targets | Slow, resource-heavy | Cap default parallelism; lazy-load browser/app instances |

---

## 10. Phased Roadmap

| Phase | Scope | Duration (est.) |
|---|---|---|
| **Phase 1 — Browser + Web AI (MVP)** | Flow editor, Playwright browser automation, Claude.ai/ChatGPT/Gemini/Perplexity blocks, parallel execution, compare view | ~2 months |
| **Phase 2 — Electron Desktop Apps** | CDP auto-connect, Claude Desktop/ChatGPT Desktop blocks, Cursor/VS Code integration, app-type auto-detector | ~1.5 months |
| **Phase 3 — Native macOS Apps** | AX API driver, AppleScript runner, element inspector overlay, Terminal/shell integration | ~1.5 months |
| **Phase 4 — Polish & Ship** | Flow template library, error recovery/retry, export/share flows, DMG packaging, auto-update | ~1 month |

**Total estimate:** ~6 months to shippable v1.

---

## 11. Open Questions

- Should flows be shareable/exportable as a marketplace/community library in v1, or later?
- Do we need a sandboxed "safe mode" to prevent flows from taking unintended destructive actions in arbitrary apps (e.g., accidental deletes)?
- What's the pricing/distribution model — free, one-time purchase, subscription?
- How do we handle multi-monitor / minimized-window automation (elements not visible on screen)?
- Should image/audio-generating AIs (Midjourney, Suno) be prioritized earlier given user demand, despite higher automation difficulty?