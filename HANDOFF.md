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

### 2026-09-02-1120 — X-ray v1.3: the panel explains itself, and hands you a prompt — Claude Code
- The v1.1/v1.2 panel was accurate and terse — five boxes of field names. A student who does not
  already know the arrow could not learn it from that. v1.3 is an explanation layer on the same
  readings: no new readings, no new memory, no new hook into the game. PRD gains §4b and six §8
  criteria.
- **A live diagram, first in the panel.** Seven rows, one per stage of the arrow, each a marker,
  the stage's name, and a plain-English detail of what that stage did on this frame. `▶` + lit =
  it acted; `│` + dim = it sat still, so it reads without colour too. The `3 · state` row keeps
  showing the last real change between changes — most frames change nothing (a step takes ~9
  ticks), and a row that only ever said "nothing changed" would hide the thing worth watching.
- **One grey caption under each heading** saying in words what that box is.
- **Two buttons, "ask an AI about this exact moment."** They build a prompt out of exactly what
  the panel is showing and copy it: one asks any chat model to walk the frame stage by stage for
  a fifteen-year-old, one asks an image model to draw the seven rows as a labelled diagram with
  the busy stages glowing. `document.execCommand('copy')` after selecting a read-only textarea —
  the one copy that behaves the same from `file://` in Edge and Chrome; if it is refused the text
  is still selected for Ctrl+C. Focus is handed back to the page or the next W lands in the box.
- The buttons sit **second**, under the diagram, not last in arrow order: nobody scrolls a full
  panel to find them. The panel also scrolls **itself** now (`max-height: calc(100vh - 32px)`),
  so the game no longer slides off a 1366×650 screen — page scroll went 1300 px → 678 px.
- Docs got diagrams, per the same complaint: a map of the whole screen with the panel open in
  "Before you start", a key-to-pixel chain in Read 4 (stages only — Read 4's question asks for
  the function list, so the diagram must not answer it), and the two-snapshots picture in Read 6.
  Six reads stayed six; CHANGE-ME stayed ten.
- **Found and fixed pre-existing doc bugs** while re-checking citations. `check-doc-lines.mjs`
  only auto-checks structured citations; the prose ones had drifted. Wrong by one: the map row a
  student is told to edit (`351`→`350`, twice), the `'T'` legend row (`318`→`317`), the `'D'`/`'#'`
  rows in answer 5 (`321`/`322`→`320`/`321`), `canWalkTo`'s return line (`926`→`927`), and
  `drawItems`/`pickUpItemUnderPlayer` (`1045`/`795`→`1043`/`793`). Answer 3 also still said "two
  things outside `state` change" — it has been three since v1.1. Every one of these would have
  sent a student to the wrong line.
- 74 lines went in above the script, so every citation in both guides shifted by +74; that was
  applied mechanically and then verified, not eyeballed.
- Used a Sonnet-model agent for the `playthrough.mjs` work and re-ran everything here before
  committing. One thing it got subtly wrong and I changed: it clicked the buttons with in-page
  `element.click()`, which is not a real user gesture — exactly the thing the clipboard call
  depends on. The draw-button check now uses a real Playwright click.
- All four tools exit 0. `check.mjs` PASS (1,798 lines, no line > 100, no banned string, all
  banners, no `state.` write in RENDER or X-RAY, no function > 40 lines). `playthrough.mjs` PASS,
  36 checks, 28 s, zero console output, run three times. `check-xray-removable.mjs` PASS — and
  the stripped game is still **exactly 1,243 lines**, byte-identical to before this session, which
  is the real proof that all of v1.3 stayed inside section 11 and the `<aside>`.
- **Budget warning:** `game.html` is 1,798 of §3's 1,800-line target (ceiling 2,000). Anything
  added to the X-ray from here has to pay for itself by cutting something. §4b says so too.
- Still not done, and still the reason this is not "shipped": **nobody has opened this in Edge.**
  No `microsoft-edge` and no `google-chrome` on this VM — only Playwright's Chromium. `file://` +
  `execCommand('copy')` is the piece most likely to behave differently under a school's managed
  Edge policy, so that is the thing to check first. P2 (combat, sound, day/night, minimap) is
  still deliberately untouched.
- Routing: → maintainer opens `game.html` in Edge on a managed device, presses X, and clicks
  *copy: explain this frame* to confirm the clipboard works there; then run the student test.

### 2026-09-03-0005 — GitHub Pages already on; root now opens the game — Cursor cloud
- Pages was already publishing `main` at
  https://lpcode808.github.io/demo-openworld-howto-videogame/ — the root rendered
  `README.md` ("download and double-click") and never mentioned `/game.html`, which
  was already live and playable. That is why it felt like we were not serving it.
- PR #6 (`cursor/github-pages-play-url-f477`): `index.html` redirects to `game.html`,
  `.nojekyll` skips Jekyll, README **Open it** leads with
  [play it on GitHub Pages](https://lpcode808.github.io/demo-openworld-howto-videogame/),
  PRD §10 says Pages is extra, not instead. `game.html` itself is untouched.
- Could not set the repo homepage field (`gh repo edit` 403). After merge, the site
  root should open the game; until then `/game.html` already works.
- Routing: → merge PR #6, then confirm the live root redirects. Edge-on-a-school-
  laptop check from the previous entry is still outstanding.

### 2026-09-03-0021 — PR #6 merged; live root opens the game — Cursor cloud
- Merged PR #6 into `origin/main` as `abb4ec6`. Pages rebuilt from that commit
  (status `built`, ~25 s). The live root now serves `index.html` and redirects
  to `game.html`; walked in Chrome, console empty.
- README on `main` has [play it on GitHub Pages](https://lpcode808.github.io/demo-openworld-howto-videogame/).
- Routing: none for Pages. Edge-on-a-school-laptop check is still outstanding.

### 2026-09-02-1622 — X-ray v1.4: second evaluation pass on the panel wording — Claude Code
- Asked for: another evaluation pass on the new UX for understanding the piping (not the game
  mechanic). Method: a real-Chromium screenshot pass at 1366×650 in five panel states, my own
  read, then two independent Sonnet-model reviewers (one reading as a fifteen-year-old, one as
  a learning-UX reviewer) given the screenshots and section 11 but not my notes. Both landed on
  the same two top findings as the screenshot pass, which is why those two were treated as
  certain and the rest as judgement calls. PRD §4c records all five and the two rejections.
- **Changed in `game.html`, all inside section 11, the `<aside>` and its CSS:** the `keyboard`
  row names X/P/`.` (any non-game key, via INPUT's own `keysTheGameUses`) as skipped by INPUT;
  the `3 · state` row now says `this frame: #n …`, `timers only, last #n …` or `no change, last
  #n …` (a `stateMoved` boolean from `showXray`, one more argument to `showPipe`); the prompt
  textarea is `hidden` until the first copy so the change log is above the fold; the STATE and
  UPDATE captions stopped over-claiming (the two skipped timer fields are now named); the
  diagram caption invites an experiment and explains the 4-5-6-3-7 numbering. The file is
  **exactly 1,800 lines**: 18 added lines were paid for by trimming 18 comment lines (section 11
  and the stylesheet) so no student-facing citation moved. `check-doc-lines.mjs` is clean; the
  only doc citation that changed is §11's end line (1795 → 1797).
- One thing to know about the removability proof: the stripped game is now 1,242 lines, not the
  1,243 earlier entries quote, because one shortened comment (the `body` CSS comment) sits
  outside the X-ray. Same game; the byte-identity claim from the v1.3 entry no longer holds.
- Docs: `TEARDOWN.md` Read 4 gained a paragraph tying `stepCooldown` to the new `timers only`
  row and the `not a game key` row; the panel map's state row was re-lettered. `PRD.md` gained
  §4c and five v1.4 §8 criteria. README and CHANGE-ME needed no change.
- `tools/playthrough.mjs` gained five v1.4 checks (hint text, the keyboard row after P, the state
  row's three tenses sampled while walking, textarea hidden on a fresh load and shown after the
  first click), written by a Sonnet-model agent and re-run here twice: 44 PASS lines, 29 s, zero
  console output. All four tools exit 0. Landed as PR #7 on `main`.
- Rejected on purpose: rewording the UPDATE row on the single 16 ms frame a `.` step runs (the
  `this frame:` row and the log already show the step), and reordering the detail boxes by
  section number (would separate UPDATE from the COLLIDE box that explains its decision).
- Not done, still: nobody has opened this in **Edge**. New Edge-specific thing to eyeball: the
  widest pipe row is now 54 monospace characters, which fits 400 px in Chromium with an overlay
  scrollbar; with a classic 17 px scrollbar and Courier New it might show a horizontal scroll
  inside the diagram box. Consolas (Edge's default) fits. P2 still deliberately untouched.
- Routing: → maintainer opens `game.html` in Edge, presses X, holds an arrow, and checks the
  `3 · state` row reads without a horizontal scrollbar; then run the student test.

### 2026-09-03 — how.html first draft: ADEPT build-history scaffolding — Cursor cloud
- New student page `how.html`: ADEPT framing (BetterExplained), three agent threads, eight
  dated phases from the PRD through v1.4 and Pages. Broad strokes, Hawaii-time stamps, why,
  what they tested. Scaffolding for later sessions (`<article id="phase-N">`, HTML comments).
- Linked from the help line under the canvas (same 1,800 lines), the `index.html` noscript
  fallback, and README. PRD §10 and AGENTS.md record that it is extra, not a fifth deliverable.
- `game.html` itself is otherwise untouched; `check.mjs` and `check-doc-lines.mjs` still PASS.
- Routing: → merge this first version to main, then other agents fill in close-ups under
  each phase. Edge-on-a-school-laptop check is still outstanding.

### 2026-09-02-2145 — how.html second pass: X-ray close-ups, corrected clock — Claude Code
- Read the merged `how.html` (PR #8) as the X-ray thread it asks to hear from, and filled in
  close-ups under phases 3, 4, 5 and 7 from the handoff entries above, the PR bodies and
  section 11 itself: the two-snapshot hook (with the Read 6 picture), the un-clevered
  key-union loop and the section 11 banner as quotes, the pause-bank picture and why paused
  time is discarded, the seven pipe rows mid-step, the `element.click()` test that could not
  fail, the seven off-by-one prose citations, the two-readers method, the keyboard row
  before/after, the three tenses of the state row, the two rejected ideas, and the
  1,243 → 1,242 honesty note. Added a short phase 8 for the page itself. Spine, ADEPT block
  and phases 0–2 and 6 left as written; their scaffold comments still stand.
- **Corrected the clock across the spine.** Agent commits are stamped UTC and the maintainer's
  merges are stamped -10:00; the first draft read them as one zone and said "three days",
  "Sep 2 night / Sep 3" for PR #6 and "3 September" in the footer. In HST the whole build is
  Sep 1 3:40pm → Sep 2 9:30pm, about thirty hours; PR #6 landed at 2:20pm, PR #7 at 4:30pm,
  PR #8 at 9:30pm. Timeline, thread cards, phase tags and footer now agree, and a hint under
  the timeline explains the ten-hour trap. Also "Hawaii" → "Hawaiʻi" throughout the page.
  Note the two Cursor entries above stamped `2026-09-03-0005`/`-0021` are UTC, not HST.
- `game.html` untouched: `check.mjs` PASS (1,800 lines), `check-doc-lines.mjs` clean. Page
  checked in headless Chromium at 1366×650 before and after: no horizontal overflow, zero
  console output, all `phase-N` anchors present (now 0–8). No line in `how.html` over 100.
- Not done: close-ups for phases 0, 1, 2 and 6 belong to the Cursor threads that lived them.
  Edge on a school laptop is still unproven for every page in this repo.
- Routing: → merge to main; a Cursor session fills in phases 0–2 and 6; then the Edge check.

### 2026-09-03 — tab icon, help-line break, how.html skim pass — Claude Code
- All three pages now share an inline SVG tab icon (grass, water strip, gold player) written in
  the `<head>` as a three-line `data:` URL, so there is still no extra file to lose. In
  `game.html` it replaced the empty icon and its comment line-for-line, and the help paragraph
  now closes on its last text line, so the file is still exactly 1,800 lines and no reading-guide
  citation moved. "How this was made" sits on its own line under the canvas (a `<br>`).
- `how.html` third pass, for skimming: an "On this page" jump list under the lede, a one-line
  takeaway under every phase title, list-shaped paragraphs turned into bullets, grey hints
  labelled Why / Tested / Note / Staffing, and all eleven close-ups folded into `<details>`
  (closed by default, no JS). No facts, times or numbers changed. Spine and anchors intact.
- Checks: `check.mjs` PASS, `check-doc-lines.mjs` clean, both pages rendered in headless
  Chromium at 1366×650 with zero console output and no horizontal overflow; icon loads.
- Not done: Edge on a school laptop, still. Also worth an eye in Edge: `<details>` folding and
  the two-column jump list.
- Routing: → merge; the Edge check is still the next human test.

### 2026-09-03 — first student playtest answered: input fix, speedrun timer — Claude Code
- **The direction bug is real and is fixed.** Reproduced in headless Chromium first: twelve
  alternating Left/Right taps ending on Right left the player two tiles *west* and facing
  *west*. Two causes in one place — `updatePlayerMovement` read the four held-key flags in a
  fixed order (so the earlier `if` won whenever two arrows overlapped, which is every mash),
  and it returns early while `stepCooldown` runs (so a tap shorter than one step was dropped).
  `intents.newestMoveDirection` now carries the last direction pressed; INPUT writes it, and
  `updatePlayerMovement` clears it once it has had its turn. Releasing the key does not clear
  it — that is what makes a fast tap survive. Held-key order stays as the fallback.
- **Speedrun timer.** T starts a clock at 0:00 top-right, T again stops and hides it.
  `state.runTimer` only counts while visible, which keeps a hidden clock out of the X-ray
  change log and makes pressing T a one-key demo of a field starting to tick. Not saved.
- **Not built, on purpose:** sound (P2 list, explicit P1 non-goal), the forest-gathering second
  area, per-character dialogue voices/leetspeak, and any difficulty rebalance. All four are now
  `CHANGE-ME.md` extras A–D — the forest and the voices are the two most valuable things in the
  student's message to leave *for* a student, and the tone of three characters in a school
  artifact is the maintainer's call. A finish line for the timer is deliberately left as
  exercise 10, which now says so.
- **The one constraint this crossed:** `game.html` is **1,916 lines** — over PRD §3's 1,200–1,800
  target band, 84 under the 2,000 ceiling. PRD §4d records it and says plainly it is the
  maintainer's call: raise the band to ~1,950, or trim the pass. Nothing else in §3 moved
  (`drawHud` hit 41 lines and was split into `drawQuestList`, per §3's own instruction).
- Checks: all four tools exit 0. `check.mjs` PASS, `check-doc-lines.mjs` clean after every
  TEARDOWN/CHANGE-ME citation was re-anchored (mechanically, by diff, then eyeballed),
  `check-xray-removable.mjs` PASS, `playthrough.mjs` 50 checks / 30s / zero console output.
  Three new playthrough checks cover the mash, the short tap, and the timer, so this can't
  silently regress. Screenshot-checked at 1366×650: clock does not collide with the "Saved!"
  banner, no horizontal page overflow, `1:08` formats right.
- Not done: Edge on a school laptop — still unproven, still the next human test, and now there
  is a new key (T) and a new HUD element to check there. `how.html` was left alone; a phase for
  this playtest pass is available to whoever wants to write it.
- Routing: → the maintainer, for two calls — the line-count band in PRD §3, and whether to
  accept leetspeak/voice variation as a student exercise or have it written into DATA directly.

### 2026-09-03 — line budget split: low floor, high ceiling — Claude Code
- **The size rule changed shape, and this is the thing to read before you add anything.** The
  maintainer raised the limit and named the reason: keep a low floor for students who are not
  gamers, and a high ceiling for the ones who want to push. PRD **§0a** states that as a rule
  and **§3/§3a** turn it into two budgets instead of one:
  - **required read (top of file → section 10): 1,200–1,800 lines.** The floor. Now 1,482.
  - **whole file, optional sections included: ≤ 2,600 lines.** Now 1,916.
  Anything that takes the file past 1,800 must be **optional and provably removable** — its own
  numbered section after `10 · BOOT`, with `check-xray-removable.mjs` still passing. The rule
  for you: never spend the 1–10 budget on something a beginner does not need. `check.mjs` now
  reports the two budgets as two separate PASS/FAIL lines, so this is enforced, not aspirational.
- **Perf was measured, not assumed, because the maintainer made it the condition for raising
  the limit.** Headless Chromium at 1366×650, each of the file's own functions called 2,000
  times: `update` 0.0004 ms, `render` 0.43 ms, `JSON.stringify(state)` 0.003 ms (twice a frame),
  `showXray` 0.04 ms. Heaviest frame the file can produce — walking, timer running, X-ray open —
  is **0.48 ms of a 16.7 ms budget, under 3%**, flat 60 fps in every combination; the 1,800-line
  version measured 0.46 ms, inside the noise. Parse is a one-time 110 ms on 72 KB. ~35× headroom.
  Numbers are in PRD §3a. **Do not cite performance as a reason to cut lines**, and do not do
  performance work — §5 still lists it as a non-goal.
- Also updated so the rule is in the place an agent actually looks: `AGENTS.md` has a new
  "Low floor, high ceiling" section above the non-negotiables, and `tools/README.md` describes
  the two budgets. PRD §4a's old "target stays 1,200–1,800" bullet now points at §3a instead of
  contradicting it; §4d records how the band question was settled.
- `game.html` untouched by this entry — all four tools green, citations unchanged.
- Not done: **Edge on a school laptop.** Unproven for every page in this repo, and there is now
  a new key (T) and a new HUD element to check there. Still the next human test.
- Routing: → next agent, read PRD §0a and §3a before adding anything to `game.html`. The two
  open student ideas worth building are `CHANGE-ME.md` extras B (forest area) and C (sound) —
  but both are deliberately left as student exercises, so do not build them without being asked.
  If sound is ever wanted in the file, §0a and §3a say where it goes: after BOOT, opt-in,
  removable.

### 2026-09-03 — level two: the Old Forest — Claude Code
- **There is a level two now.** Asked for by the maintainer; it was the student's own idea from
  the §4d playtest, which v1.5 had left as a `CHANGE-ME.md` exercise. That call is reversed.
  A third map (`forest`, 30×20) sits behind a `G` tile typed into row 0 of the overworld's north
  treeline, shut until all three village flags are set. Nessa the Cook, one tile off the main
  path, wants three things gathered there — a fourth quest. Talking to her *before* the gate
  opens is how a player learns what level two is: level two explained by a villager, not a
  tutorial.
- **Three new ideas, each deliberately a second instance of something the file already teaches.**
  That is what kept the required read inside its band. (1) `canWalkTo`'s bridge exception now has
  a sibling: the gate asks `villageQuestsAllDone()` — three flags instead of one, so the pair
  says a tile can depend on as much of `state` as you like. (2) `wantsItem` became `wantsItems`
  for every NPC, so Mira's list is one long and Nessa's is three; `hasAllItems` answers for both.
  (3) `tileTypes` gained a `slow` column — only the bog says yes, and `stepCooldownFor` acts on
  it. The x-ray's COLLIDE probe explains both new tiles: facing a shut gate it lists all three
  flags so you can see which one is missing.
- **The bog is the answer to "extremely easy to speedrun".** The stream cuts the forest in half
  with exactly two ways through. Measured in step-equivalents (a bog tile costs two): the ford
  beats the detour by 23 for the mushroom, by **1** for the honeycomb, and is no use at all for
  the berries. So with **T** running there is now something to actually optimise, and CHANGE-ME
  extra B asks the student to build a map with a real decision of its own.
- **The five-minute rule (PRD §5) is untouched, and that is why this was buildable.** Level one
  is still three quests and two maps, and the gate does not open until those three flags are set,
  so the path that rule measures is the same path it always was. Full game ≈ ten minutes.
- **What it cost the reading guide, which is half the product.** Level two spends three of the ten
  exercises by doing them — 7 (terrain with new walkability), 9 (a two-item quest), 10 (something
  happens when all three flags are set). All three were **rewritten, not stubbed**: each now
  points at the forest as its worked example and asks for the next step up (a third tile property;
  a quest that hands an item *back*; a payoff for the fourth flag). Extra B went from "build the
  forest" to "build a level three, and this time nobody has done it for you."
- **Budgets (PRD §3a).** Required read 1,676 of 1,800 — about 120 lines of floor left, and that
  is the number to watch, not the 2,600. Whole file 2,121 of 2,600. The x-ray additions this pass
  landed after BOOT and so cost the floor nothing, which is the §0a rule working as intended.
- **Perf re-measured, since raising the limit was conditional on it.** Heaviest frame — walking,
  timer on, x-ray open — is 0.43 ms of 16.7 ms, flat 60 fps; the 1,800-line version was 0.46 ms,
  so every difference is noise and none tracks line count. Parse is a one-time 13.5 ms median
  over six loads of the 83 KB file. PRD §3a's old "110 ms parse" figure was a cold-start
  artifact and has been corrected.
- Checks: all four tools exit 0. `playthrough.mjs` is 62 checks / ~60 s / zero console output and
  now actually plays level two — gate shut (including holding a key into it), gate open, the third
  map, all three gatherables, the bog's cost, the three-item hand-over, and that four quest lines
  fit the HUD. Its pathfinder learned the gate, so it mirrors COLLIDE honestly again.
  `check.mjs` reports the two budgets; citations re-anchored and eyeballed one by one.
- Not done: **Edge on a school laptop**, still. The list of things unproven there keeps growing —
  T, the four-line HUD (the canvas is 640×600 now, up from 640×576), the forest's colours.
- Routing: → the Edge check is now the most overdue thing in this repo. After that, the two open
  student ideas are `CHANGE-ME.md` extras A (per-character voices, incl. leetspeak — still the
  maintainer's tone call) and C (sound, still on the P2 list). Neither should be built unasked.

## 2026-09-03 — build-history infographics
- Replaced five dense text diagrams in how.html with responsive native HTML/CSS visuals: the frame pipeline, build timeline, removable X-ray, pause/step flow, and maintainer checks.
- Styling reuses the page's dark panels, grey rules, monospace labels, and gold highlight. No scripts, dependencies, or game files changed.
- Routing: review and merge pull request for the infographic page update.
