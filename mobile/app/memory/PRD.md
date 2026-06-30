
Action: file_editor create /app/memory/PRD.md --file-text "# Exam Prep Portal — PRD

## Vision
A \"GPS for Indian competitive exams\" (NEET · UPSC CSE · SBI PO · SBI Clerk). Aspirants pick exam → goal → timeline and immediately get a topic-by-topic weekly plan with progress tracking. Zero video lectures, zero outbound sales, zero locked core checklists.

## MVP Scope (this iteration)
**Onboarding (3 steps)**
- Exam picker (4 exams)
- Goal picker (Top Rank / Safe Qualify / First Timer)
- Timeline picker (30/60/90/180/365 days)

**Main app (bottom tabs)**
- Home/Dashboard — countdown card, today's task, completed/revise/goal metrics, streak pill
- Plan — week-by-week schedule generated from topic tree + goal
- Progress — overall %, per-subject bars, achievement badges
- More — links to Digest, UPSC Track (only for UPSC), Checklist, Settings, Auth

**Detail screens**
- Topic Checklist — accordion (Subject → Chapter → Topic), tap to cycle Pending → Done → Revise
- Weekly Digest — curated content cards (Trend/PYQ/Strategy/Revision/Mains)
- UPSC Track Advisor — age input → personalized track + 4-stage roadmap
- Settings — view plan, change exam, reset progress
- Auth (optional) — Sign in / Sign up to sync progress

## Backend
- FastAPI + MongoDB
- JWT auth (signup/login/me) — bcrypt hashing, 30-day tokens
- Static exam/topic/digest data (no AI in MVP)
- Endpoints: /api/exams, /api/exams/{id}/topics, /api/exams/{id}/plan, /api/digest, /api/upsc/tracks, /api/progress

## Design Language
\"Editorial Mobile LIGHT\" — cream surface (#F5F4F0), white cards, terracotta brand (#D35400), Georgia (serif) for display, system sans for body. Soft pill badges, flat surfaces (no glassmorphism).

## Out of scope (deferred)
- AI plan generation (Claude Haiku) — toggled off in MVP
- Push notifications, offline mode
- Premium tier / monetization
- Live mock tests, community

## Test Account
Seeded automatically: `test@exam.com / test1234`. See `/app/memory/test_credentials.md`.
"
Observation: Create successful: /app/memory/PRD.md

Fetching debug logs for expo

==> /var/log/supervisor/expo.err.log <==

==> /var/log/supervisor/expo.out.log <==
env: export EXPO_TUNNEL_SUBDOMAIN EXPO_PACKAGER_HOSTNAME EXPO_PUBLIC_BACKEND_URL EXPO_USE_FAST_RESOLVER METRO_CACHE_ROOT EXPO_PACKAGER_PROXY_URL
Starting project at /app/frontend
Fast resolver is enabled.
Starting Metro Bundler
Waiting on http://localhost:3000
Logs for your project will appear below.
Web node_modules/expo-router/entry.js ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░ 99.9% (776/776)
Web Bundled 629ms node_modules/expo-router/entry.js (776 modules)
yarn run v1.22.22
$ /app/frontend/node_modules/.bin/expo start --port 3000
env: load .env
env: export EXPO_TUNNEL_SUBDOMAIN EXPO_PACKAGER_HOSTNAME EXPO_PUBLIC_BACKEND_URL EXPO_USE_FAST_RESOLVER METRO_CACHE_ROOT EXPO_PACKAGER_PROXY_URL
Starting project at /app/frontend
Fast resolver is enabled.
Starting Metro Bundler
Waiting on http://localhost:3000
Logs for your project will appear below.
Web node_modules/expo-router/entry.js ░░░░░░░░░░░░░░░░  0.0% (0/1)
Web Bundled 643ms node_modules/expo-router/entry.js (776 modules)
 LOG  [web] Logs will appear in the browser console


Fetching debug logs for backend

==> /var/log/supervisor/backend.err.log <==
INFO:     Shutting down
INFO:     Waiting for application shutdown.
INFO:     Application shutdown complete.
INFO:     Finished server process [112]
INFO:     Stopping reloader process [86]
INFO:     Will watch for changes in these directories: ['/app/backend']
INFO:     Uvicorn running on http://0.0.0.0:8001 (Press CTRL+C to quit)
INFO:     Started reloader process [244] using WatchFiles
INFO:     Started server process [277]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
WARNING:  WatchFiles detected changes in 'server.py'. Reloading...
INFO:     Shutting down
INFO:     Waiting for application shutdown.
INFO:     Application shutdown complete.
INFO:     Finished server process [277]
INFO:     Started server process [496]
INFO:     Waiting for application startup.
2026-06-29 04:22:22,675 - server - INFO - Seeded test account: test@exam.com / test1234
INFO:     Application startup complete.

==> /var/log/supervisor/backend.out.log <==
INFO:     127.0.0.1:35716 - "GET / HTTP/1.1" 404 Not Found


Fetching debug logs for mongodb

tail: cannot open '/var/log/supervisor/mongodb*.log' for reading: No such file or directory