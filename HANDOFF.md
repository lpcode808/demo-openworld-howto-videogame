# demo-openworld-howto-videogame handoff

Cloud and phone sessions append a dated HST breadcrumb before exit. Record what changed, what
remains, any forced branch still needing merge, and a `Routing: → ...` line only when work belongs
elsewhere. Desktop agents read the newest entry after syncing.

### 2026-09-01-1540 — repo live, cloud env ready — Cursor
- `PRD.md`, `AGENTS.md`, `README.md`, `.cursor/environment.json` on `main`.
- `game.html`, `TEARDOWN.md`, and `CHANGE-ME.md` not built yet — follow PRD §9 build order.
- Routing: → cloud agent overnight build per PRD §9, stop at P1.

### 2026-09-01-1557 — dev environment validated — Cursor
- Confirmed the zero-dependency env runs the PRD's target stack. Chrome 148 is installed
  (`google-chrome-stable`); `.cursor/environment.json` install is a no-op echo, as intended.
- Proved a `file://` page runs Canvas 2D, keyboard→intents, `requestAnimationFrame`, and
  `localStorage` save/load, plus a render-purity assertion, via a throwaway smoke page in `/tmp`
  (not committed — not a deliverable). All checks PASS; movement + save/load demoed on screen.
- Heads-up for the `game.html` build: opening any `file://` page in Chrome DevTools shows a red
  "Unsafe attempt to load URL ... 'file:' URLs are treated as unique security origins" line. It is
  a browser-layer artifact, NOT page JS — headless Chrome with verbose logging emits only the
  page's own `console.log`. Don't chase it as a code bug when checking PRD §8's "zero console errors".
- No environment.json changes needed; env is correct for a single-file, no-build browser game.
- Routing: → cloud agent overnight build per PRD §9, stop at P1.

### 2026-09-01-2228 — P1 built: game.html + TEARDOWN + CHANGE-ME + README — Cursor cloud
- Built `game.html` in PRD §9 order, one commit per step, on branch
  `cursor/build-open-world-game-p1-8272` (PR #2). 1,222 lines, ten sections, zero deps. All §8
  mechanical checks pass; real-Chrome playthrough (3 quests, both maps, save, F5, verified) is 35 s.
- Two commented exceptions to "one `state`": `intents` (INPUT mailbox) and the LOOP stopwatch.
  §9 steps 5 and 6 landed in one commit (a dialogue choice that gives an item *is* the flag flip).
- Added beyond the letter of the PRD, all teaching-motivated: a file map at the top of the script,
  a `layout` table in CONFIG (so RENDER has no bare pixel numbers), boot-time DATA checks that name
  a mistyped map row / misplaced NPC, sandy trails to each outdoor item, and `<link rel="icon"
  href="data:,">` so no favicon request can log an error on a school machine.
- Not done: Edge was not available on the VM; only Chrome 148 was tested. P2 untouched.
- Docs cite exact line numbers; any edit to `game.html` above the cited lines drifts them.
  `TEARDOWN.md` tells students to search by function name if numbers drift.
- Routing: → maintainer reads `game.html` as a 15-year-old would (PRD §9 "stop at P1"), and tests
  once in Edge on a managed device.

### 2026-09-02-0851 — X-RAY merged to main; pause/step (v1.2) built and pushed — Claude Code
- Merged `claude/fable-orchestrator-agent-ui-05vwd5` (PRD §4a/§5a v1.1: the `11 · X-RAY` side
  panel, opened with X, a live window onto `keyboard → INPUT → intents → UPDATE → state →
  RENDER → screen`) into `main` as PR #3, after fixing 55 stale line citations in `TEARDOWN.md`/
  `CHANGE-ME.md` that the new section had left pointing at the wrong code.
- Built v1.2 on top: P pauses (RENDER and the panel keep running; the fixed-timestep accumulator
  discards time instead of banking it, so resuming never bursts catch-up updates), `.` runs
  exactly one UPDATE tick while paused. Neither persists — only whether the panel is open still
  does. Section 11 stays deletable by construction (now four LOOP lines, not three).
- Used a Fable-model agent as spec-writer and judge, and a Haiku-model agent as implementer, with
  every round independently re-verified here against `tools/check.mjs`, `tools/check-doc-lines.mjs`,
  and the headless `tools/playthrough.mjs` before anything was committed.
- Landed on `claude/upbeat-mendel-9lir10`, one commit ahead of `main`; not yet merged as of this
  entry (the user asked for this handoff first, merge next). Not tested in real Edge/Chrome by a
  human, and P2 (combat, sound, day/night, minimap) is still untouched — P1.5/v1.2 only.
- Routing: → merge `claude/upbeat-mendel-9lir10` into `main` (in progress), then a fresh session
  can pick up wherever the maintainer points it next — nothing else is pending.
