# GlanceQueue

A quiet Notion task companion for Even G2. Browse one task at a time, review it, then confirm completion without picking up your phone.

Built for Heads Up 2026, AI Assistants & Work track.

## Run the local demo

Requires Node.js 22.12+ and npm. On Windows PowerShell use npm.cmd if script execution is disabled.

```sh
npm ci
npm run backend
# Second terminal:
npm run dev
# Third terminal:
npm run simulate
```

Preview: http://127.0.0.1:5183. Backend: loopback port 5184. No paid API is used in demo mode.

- Scroll / Up / Down: choose a task.
- Tap: review; tap again: complete.
- Double tap: cancel review; from the queue: exit G2.
- Web preview also supports arrows, Enter and Escape.
- The failure checkbox demonstrates an unsynced task remaining open.

Local demo state persists in .demo-state.json. Demo completion changes only these synthetic tasks, not a Notion workspace.

## Connect Notion

Create an internal integration with read and update content capabilities. Share a dedicated test database with it. Required properties: a title property and a checkbox named Done. Optional: a date property named Due.

Set NOTION_TOKEN and NOTION_DATA_SOURCE_ID in the backend process environment, then restart the backend. Both settings are required. Omitting both selects explicitly labelled Demo mode. Keep the integration secret local: never add it to the frontend, repository, screenshots or chat.

The backend uses Notion API version 2025-09-03. It queries unfinished tasks, checks source membership and last-edited revision, and changes only Done after confirmation. API failures preserve the task. Revision checks are best effort, not an atomic compare-and-swap transaction.

## Verification and current limits

```sh
npm test
npm run build
```

Verified on November 24, 2026: TypeScript production build, backend mocked tests, browser demo, and actual Even Hub simulator display/input. Simulator tests covered scrolling, review, double-click cancel, and successful local completion. Real G2 hardware and live Notion account integration have not been tested yet. The demo must not be represented as a successful Notion write.

This is a local single-user prototype. It binds to loopback, checks host/origin and requires a custom request header. Production hosting needs authentication, HTTPS and a configured backend URL. Packaging only the frontend does not deploy its backend. Up to 100 tasks are displayed; voice input is not implemented.

## Hackathon provenance

The scaffolding is the MIT-licensed minimal template from https://github.com/even-realities/evenhub-templates; its LICENSE is retained. Even Hub SDK, CLI, simulator, TypeScript and Vite existed before November 23. GlanceQueue task UI, confirmation workflow, Notion adapter and tests were created November 24 during the hackathon with Codex AI assistance.

Track: AI Assistants & Work. Core integration: Notion. No financial transactions, custody, microphone or paid model calls.
