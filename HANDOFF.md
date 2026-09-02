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

### 2026-09-02-0916 — docs teach the X-ray; tooling now verifies it — Claude Code
- Found the gap that mattered for a user test: the X-ray shipped in v1.1/v1.2, but `TEARDOWN.md`
  never mentioned it once and `README.md` didn't list X/P/`.`. A student working the guide front
  to back would never have found the panel. Fixed in `72c0f5d`, docs only — a "Before you start"
  bullet, a pointer in Read 4 (the panel's intents box and change log *are* that read's chain),
  a pointer in Read 6 (the change log is a diff of the same two snapshots the purity check
  compares, which is why UPDATE is never instrumented), a line in the CHANGE-ME intro, and the
  README keys. Six reads stayed six and CHANGE-ME stayed ten items, per PRD §6/§7. Also
  corrected CHANGE-ME #10's `state.flags` citation — 512 was the player block's closing brace.
- PRD §8's v1.1/v1.2 criteria had no tooling behind them. `f2a5904` adds an X-RAY phase to
  `tools/playthrough.mjs` (toggle, open-state survives F5 while pause does not, P freezes UPDATE
  while RENDER keeps drawing, no catch-up burst on resume, `.` advances exactly one tick, X while
  paused hides and resumes, P/`.` inert while hidden) and a new `tools/check-xray-removable.mjs`
  that strips the `<aside>`, the CSS, section 11 and the four LOOP lines from a copy and proves
  the stripped 1,243-line game opens clean, walks and still asserts render purity. `tools/README.md`
  now also documents `check-doc-lines.mjs`, which it never had.
- `game.html` is untouched this session, so every line citation in the docs still holds. All four
  tools exit 0; playthrough is 26 s and was run three times consecutively with zero console output.
- Used Sonnet-model agents for the two tooling jobs and re-verified every result here before
  committing; the doc writing was done directly.
- Not done, and the reason this is not "shipped" yet: **no Edge anywhere on this VM** (no
  `microsoft-edge`, no `google-chrome` either — only Playwright's bundled Chromium), so PRD §3's
  "must run in Microsoft Edge" is still unproven by anyone. That needs one pass on a managed
  school laptop. Layout does hold at 1366×650 with the panel open — no horizontal scroll, the
  page scrolls ~144 px vertically — but that was measured in Chromium, not Edge.
- Routing: → maintainer opens `game.html` in Edge on a managed device once, then run the student
  test. P2 (combat, sound, day/night, minimap) is still deliberately untouched.
