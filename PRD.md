# Open World Game How-To — PRD

**An open-world adventure game built to be read, not played.**

Status: v1.5 · P1 built 2026-09-01 · X-RAY and pause/step added 2026-09-02 (§4a, §5a, §8)
· X-ray explanation layer added 2026-09-02 (§4b, §8) · X-ray wording pass 2026-09-03 (§4c, §8)
· first student playtest answered 2026-09-03 (§4d, §8)

---

## 0. The one rule that settles every argument

This game's user is **a 15-year-old reading the source**, not a player. Every tradeoff — every
abstraction, every clever line, every dependency — resolves toward *"can a student trace this in
fifteen minutes?"* If a change makes the game better and the code harder to read, **the change is
wrong.** If a change makes the code more readable and the game slightly worse, **ship it.**

Say it back to yourself before every commit: **it's not for gameplay, it's for learning.**

### 0a. Low floor, high ceiling *(added v1.5, from the maintainer)*

Rule 0 says who the user is. This says how wide that user actually is, because the class is not
one student. Some of them have never played a video game and will not be persuaded to; some of
them will try to break the file within ten minutes of opening it. Both are the audience.

- **Low floor.** A student who is not a gamer, and not yet a programmer, has to be able to get
  somewhere real on the first sitting. That means the required path stays small, plain, and
  finishable: ten sections, one number to change, a visible result. Nothing on that path is
  allowed to assume they enjoy games or already know what a loop is.
- **High ceiling.** A student who wants to push has to find something to push against, and it
  should be *in the artifact*, not in a follow-up handout. The X-ray, the pause-and-step keys,
  the "ask an AI about this frame" buttons, `CHANGE-ME.md`'s harder half and its extras all
  exist for her.

The two are not in tension as long as the ceiling is **opt-in**. Every advanced thing in this
repo is behind a key press, a later section, or a numbered exercise — never in the way of the
student who just wants to change the colour of grass. When a change would raise the floor to
raise the ceiling, **it is the wrong change**, and §3a turns that into an actual line budget.

---

## 1. Why this exists

A student asked *how are video games made?*, was offered any game to reverse-engineer, and landed on
**open-world adventure**. The existing teardown targets in this course are all small utility apps —
a virtual pet, a contact dialer, a thumbnail maker. None of them is the medium teenagers actually
live in.

So: generate the target, then read it together. The loop is the course's standard one —
**Deconstruct → Critique → Reconstruct** — pointed at a game instead of an app. The novel part is
that the artifact is *made on demand from the student's own naming of the genre*, which puts their
choice on the target rather than the teacher's.

**Success is not a fun game.** Success is a student opening the file, finding the game loop
unassisted, changing one number, and seeing the world change.

---

## 2. Deliverables

| # | File | What it is |
|---|---|---|
| 1 | `game.html` | The whole game. One file. No build, no dependencies, opens from disk. |
| 2 | `TEARDOWN.md` | Six numbered "reads," 10–15 min each, that walk a student through the source. |
| 3 | `CHANGE-ME.md` | Ten ranked modifications, each naming the exact line to touch. |
| 4 | `README.md` | Twelve lines. What it is, how to open it, where to start reading. |

All four ship together. **`game.html` without `TEARDOWN.md` is an incomplete deliverable** — the
reading guide is not documentation, it is half the product.

---

## 3. `game.html` — hard constraints

These are not preferences. A build that violates one is rejected.

**Platform**
- Single file. Vanilla JavaScript. Zero dependencies, zero network requests, zero build step.
- Opens by double-clicking the file. Must work from `file://` with the network turned off.
- Must run in **Microsoft Edge** (school-managed devices) and Chrome. Nothing else is tested.
- All art is drawn with Canvas 2D primitives — rectangles, circles, text. **No image files, no
  sprite sheets, no base64 blobs.** Colored rectangles are correct and on-brief.

**Size** *(revised v1.5 — see §3a for the reasoning and the measurement)*
- **The required read — sections 1–10 — is 1,200–1,800 lines** including comments and data,
  hard ceiling **2,000**. This is the budget that matters: it is what a student who has never
  opened the file has to get through.
- **The whole file, optional sections included, has a hard ceiling of 2,600 lines.** Anything
  that pushes past the 1,800 above has to earn it by being *optional and removable* — its own
  numbered section after `10 · BOOT`, proved deletable by `tools/check-xray-removable.mjs`.
- No line longer than 100 characters.
- No function longer than **40 lines**. If one gets longer, it is two ideas — split it.

### 3a. Amendment (v1.5) — why the ceiling moved, and what it is actually protecting

The v1.5 pass took the file to 1,916 lines and asked whether the 1,800 target should rise. Two
findings settled it.

**Performance is not the constraint, and now there is a number.** Measured in headless Chromium
at 1366×650, calling the file's own functions two thousand times each: `update` 0.0004 ms,
`render` 0.43 ms, `JSON.stringify(state)` 0.003 ms (twice a frame), `showXray` 0.04 ms with the
panel open. The heaviest frame this file can produce — walking, timer running, X-ray open — is
**0.48 ms of a 16.7 ms budget, under 3%**, and it holds a flat 60 fps in every combination. The
same measurement on the 1,800-line version before the pass came out at 0.46 ms, a difference
inside the noise. Parsing is a one-time 110 ms at load, on 72 KB. There is roughly 35× headroom.
Line count is not a performance axis for a file this size and will not become one at 2,600.
(§5 still lists performance work as a non-goal. This was a measurement to answer a question,
not an optimisation.)

**What the ceiling protects is reading time, and reading happens one section at a time.** The
old single number treated the file as one sitting. It never was: `TEARDOWN.md` is six 10–15
minute reads, each scoped to a section or two. So the budget is now split to match the way the
artifact is used, and to match the shape the maintainer asked for — **a low floor and a high
ceiling.**

- **The floor is sections 1–10**, and it stays where it was. A student who has never played a
  video game, let alone read one, meets exactly the ten sections and nothing else; the file
  says so at the top of section 11 and `README.md` says so too. Two ways to measure it, both
  comfortably inside the original band: **1,482 lines** from the top of the file to the
  section-11 banner, which is what `tools/check.mjs` now reports as a separate PASS/FAIL, and
  **1,350 lines** once the X-ray's `<aside>` and stylesheet are stripped as well, which is
  what `tools/check-xray-removable.mjs` prints. The floor is the number to defend: the pass
  that took the whole file to 1,916 moved it from 1,370 to 1,482 — about 110 lines, from the
  middle of the band to the middle of the band.
- **The ceiling is everything after `10 · BOOT`**, and it can grow. The X-ray earned its ~570
  lines by being invisible until a student presses X and provably deletable without touching
  the game. Anything else that wants room has to clear the same bar: optional, opt-in,
  removable, and checked. That is what keeps a bigger file from raising the floor.

The practical rule for the next agent: **never spend the 1–10 budget on something a beginner
does not need.** If a feature is for the student who wants to push the limits, it goes after
BOOT in its own removable section, and the total stays under 2,600.

**Banned outright** (a `grep` for each must return nothing):
`import ` · `require(` · `<script src` · `eval(` · `innerHTML =` · `setTimeout(` for game logic ·
minified or generated code of any kind · nested ternaries · chained optional access deeper than one
level (`a?.b` is fine, `a?.b?.c` is not) · regular expressions anywhere a loop would read clearer ·
single-letter variable names outside a `for` index.

**Style, because the reader is the user**
- Names spelled out. `playerX`, not `px`. `tileSizeInPixels`, not `TS`.
- Prefer plain functions and plain objects. Use a `class` only where it is genuinely the clearest
  thing, and if you use one, say in a comment why a function wouldn't do.
- Comments explain **why**, never what. `// wrap so the player can't walk off the west edge` is
  useful; `// increment x` is noise and will be cut in review.
- **Render never mutates state.** This is the single most important teaching payload in the file:
  the reader should be able to see that drawing is a pure read of `state`. Enforce it with a dev
  assertion that snapshots `state` before the render pass and compares after.

---

## 4. `game.html` — required structure

Exactly these ten sections, **in this order**, each opening with a banner comment in this form:

```
/* ============================================================
   5 · UPDATE — the rules of the world
   What to look for: this is the only place the world changes.
   Every function here reads intents and writes state, and does
   nothing else. If you want the game to behave differently,
   you change something in this section.
   ============================================================ */
```

| # | Section | Contents |
|---|---|---|
| 1 | **CONFIG** | Every tunable number in the game, named, at the top. Speed, tile size, viewport, colors. Nothing numeric is hard-coded further down. |
| 2 | **DATA** | The world as readable data: the tile map as an **array of strings**, the item table, the NPC table, the dialogue trees, the quest definitions. A student should be able to edit the map by typing. |
| 3 | **STATE** | One object named `state`. The single source of truth. There is no other mutable state anywhere in the file, and a comment says so. |
| 4 | **INPUT** | Keyboard events → an `intents` object. Nothing else. No game logic here. |
| 5 | **UPDATE** | Reads intents and state, writes state. The only section that mutates. |
| 6 | **COLLIDE** | Deliberately separated from UPDATE so it can be read on its own. Tile lookup, walkability, area transitions. |
| 7 | **RENDER** | Reads state, draws pixels, writes nothing. Camera, tiles, entities, HUD, dialogue box. |
| 8 | **LOOP** | `requestAnimationFrame` with a fixed timestep. Fifteen lines, and the most-read fifteen lines in the file. |
| 9 | **SAVE** | `localStorage` serialize/restore, wrapped in try/catch. |
| 10 | **BOOT** | Wire it up and start. |

Sections are numbered in their banners and in `TEARDOWN.md`, and the numbers match. Do not reorder
them for elegance.

### 4a. Amendment (v1.1) — the optional eleventh section, `11 · X-RAY`

Added after P1 shipped, at the maintainer's request: a curious student should be able to **see the
inner piping while the game is being played**, not only by reading the source. The X-ray is a side
panel, opened with the **X** key, that shows the file's one sentence happening live:

```
keyboard --> INPUT --> intents --> UPDATE --> state --> RENDER --> screen
```

Rules, so it stays a window onto the game and never becomes part of it:

- It is **section 11**, appended **after** `10 · BOOT`, with the same banner form. Sections 1–10
  keep their numbers, order and contents. "Start at the bottom, `10 · BOOT`" still holds: the
  banner of 11 says it is optional and where the game itself ends.
- It **only reads** `state` and `intents` and the pure lookups in DATA/COLLIDE/RENDER
  (`tileAt`, `canWalkTo`, `computeCamera`, ...). It writes words into a DOM `<aside>`, never the
  canvas, never `state`, never `intents`. The render-purity assertion runs before it every frame.
- It keeps **one** small object of its own memory (frame counts and the recent-changes log),
  named in STATE's comment as the third and last thing outside `state` that changes at runtime.
  Never saved, never drawn on the canvas.
- Its only hook into the game is **four lines in LOOP**: a snapshot of `state` before UPDATE runs,
  a pause-check call, a counter of updates this frame, and one call after the purity check. The
  "what changed" log is a diff of that snapshot against the one the purity check already takes, so
  UPDATE itself is not instrumented at all — that is the teaching payload: *the same snapshot
  that proves RENDER changed nothing shows you exactly what UPDATE did change.*
- It listens for the X key with its own `keydown` handler so INPUT stays about the game.
- **Delete section 11, the `<aside>`, and the four X-ray lines in LOOP, and the game is exactly
  the same.** Every X-ray constant lives inside section 11 for that reason, including its
  localStorage key.
- All of §3's style rules apply to it unchanged. *(v1.5: the 1,200–1,800 target this rule
  originally cited now applies to sections 1–10 only, and section 11 sits outside it —
  see §3a. The rest of this bullet is unchanged: the X-ray pays for its lines by being
  optional and removable, which is exactly the bar §3a sets.)*

---

### 4b. Amendment (v1.3) — the X-ray has to explain itself

The v1.1/v1.2 panel was accurate and terse: five boxes of live values. Watching a maintainer
read it made the gap obvious — a student who does not already know the arrow cannot learn it
from a wall of field names. v1.3 adds an explanation layer on top of the same readings. No new
readings, no new memory, no new hook into the game.

- **A live diagram, first in the panel.** Seven rows, one per stage of
  `keyboard → INPUT → intents → UPDATE → state → RENDER → screen`, in that order. Each row is a
  marker, the stage's name, and a short plain-English detail of what that stage did on the frame
  you are looking at. A stage that did something is marked `▶` and lit; one that sat still is
  marked `│` and dim, so the diagram reads without colour as well as with it. Every value on it
  is one the boxes below are already showing, said shorter — the diagram computes nothing.
- **One grey caption under each heading**, saying in words what that box is.
- **Two buttons: "ask an AI about this exact moment."** They build a prompt out of exactly what
  the panel is showing and copy it to the clipboard — one asking any chat model to walk the
  frame stage by stage for a fifteen-year-old, one asking an image model to draw the seven rows
  as a labelled diagram with the busy stages glowing. The prompt also lands in a read-only
  textarea, so a browser that refuses the copy still leaves the text selected for Ctrl+C. This
  is the one place the panel writes text a student takes *out* of the file.
- **The buttons sit second**, directly under the diagram rather than at the bottom in arrow
  order. A student will not scroll a full panel to find them. The five detail boxes below keep
  the arrow's order unchanged.
- **The panel scrolls itself** (`max-height: calc(100vh - 32px)`) instead of growing the page,
  so the game never slides off a 1366×650 school laptop screen.
- Everything in §4a still holds unchanged: section 11 only reads, `xrayMemory` is still the one
  object of X-ray memory (it gains the last key seen, for the diagram's top row), the hook into
  LOOP is still the same four lines, and deleting section 11, the `<aside>` and those four lines
  still leaves exactly the same game. `tools/check-xray-removable.mjs` proves it.
- The file is now ~1,800 lines: the top of §3's target range, with the 2,000 ceiling untouched.
  **Anything added to the X-ray from here has to pay for itself by cutting something.**

Diagrams belong in `TEARDOWN.md` too, for the same reason: a map of the panel in "Before you
start", the key-to-pixel chain in Read 4, and the two-snapshots picture in Read 6.

### 4c. Amendment (v1.4) — five places the panel misled a first-time reader

A second evaluation pass (one reviewer reading as a fifteen-year-old, one as a learning-UX
reviewer, plus a screenshot pass at 1366×650) found the same two problems independently, and
three smaller ones. All five are wording and layout on the same readings: no new readings, no
new memory, no new hook into the game, and the file is still exactly 1,800 lines because
every added line was paid for by a shorter comment in section 11 or the stylesheet.

- **Panel keys were shown as if they went down the pipe.** After P or `.`, the `keyboard`
  row read `last key you pressed: p` above `nothing to write down`. It now reads
  `p — not a game key, INPUT skips it`, using INPUT's own `keysTheGameUses` list, so a student
  learns that the panel listens beside the game, not through it.
- **UPDATE lit while `state` said nothing changed.** Between steps, UPDATE runs and touches
  only `stepCooldown` and `notice.secondsLeft`, which the change log skips on purpose. The
  `3 · state` row now says `timers only, last …` on those frames, `this frame: …` when a real
  change happened, and `no change, last …` when nothing moved at all, and it always carries the
  `#n` tick. The UPDATE box's caption names the two skipped fields.
- **An empty textarea took the first fold.** It is hidden until the first copy, so the change
  log, the payoff of the arrow, is visible without scrolling.
- **The STATE caption said nothing lives outside `state`**, under an intents box that visibly
  does. It now names the three things that do and says none is game knowledge.
- **The diagram was a readout, not an invitation.** Its caption now says to hold an arrow key
  and watch the rows light from the top down, and that the numbers are the file's sections,
  since the detail boxes run 4, 5, 6, 3, 7+8 in arrow order rather than file order.

Considered and rejected: rewording the UPDATE row on the one frame a `.` step runs (a 16 ms
frame nobody can read; the `this frame:` row and the change log already show the step), and
reordering the detail boxes by section number (would split UPDATE from the COLLIDE box that
explains its decision).

### 4d. Amendment (v1.5) — the first student playtest

A student played the finished game through and wrote back. §10 named that report as the thing
to watch, so this pass answers it rather than a review. Their message asked for six things.
Two are in the file now; four became exercises in `CHANGE-ME.md`; none of the P2 list moved.

**Built.**

- **Mashing left and right confused the player's direction.** Reproduced: twelve alternating
  taps ending on Right left the player two tiles *west* and facing *west*. Two causes, both in
  the same place. `updatePlayerMovement` read the four held-key flags in a fixed order, so
  whenever two arrows overlapped — which happens for a few milliseconds on every mash — the
  earlier `if` won regardless of which key was pressed second; and the function returns early
  while `stepCooldown` is still running, so a tap shorter than one step was dropped entirely.
  `intents` now carries `newestMoveDirection`, written by INPUT on every movement keydown and
  cleared by `updatePlayerMovement` once it has had its turn. Releasing the key does not clear
  it, which is what makes a fast tap survive the cooldown. The held-key order is still there,
  as the fallback for a key that is simply down. This is the fix's payload for a reader: a list
  of what is held cannot express *which one you pressed second*, so INPUT has to write it down.
- **A speedrun timer.** **T** starts a clock at 0:00 in the top-right corner of the world and
  **T** again stops and hides it. `state.runTimer` is `{ secondsElapsed, visible }`; it only
  counts while visible, which keeps a hidden clock out of the X-ray's change log — and makes
  pressing T a one-key demonstration of a field starting to tick. Not saved, so a reload gives
  a fresh clock; that gap is exercise D in `CHANGE-ME.md`.

**Deliberately not built.**

- **The game never decides a run is over.** A finish line at all three flags is exercise 10 in
  `CHANGE-ME.md`; implementing it here would have spent the hardest exercise in the guide. The
  timer is written so that exercise becomes "stop the clock", and entry 10 now says so.
- **Sound**, and **a forest area with a gathering quest**. Sound is on the P2 list and is an
  explicit P1 non-goal in §5. The forest is a third map plus items plus a quest — the largest
  change anyone could make to this file, and therefore the most valuable one to leave for a
  student. Both are in `CHANGE-ME.md`'s extras, sound framed around the question it actually
  raises: where does an *output* live when RENDER is only allowed to read and draw?
- **"Extremely easy to speedrun."** Accurate, and not a defect — §1 says success is not a fun
  game. The timer makes the observation measurable, which is the most this file should do
  about it.
- **Per-character dialogue voices**, including the leetspeak idea. Pure DATA: no code changes
  at all, which is exactly why it is exercise A rather than a commit. Choosing the tone of
  three characters in a school artifact is also the maintainer's call, not an agent's.

**The size constraint this pass moved — and how it was settled.** `game.html` came out of
this pass at 1,916 lines, past §3's old 1,200–1,800 band. Raised, on the maintainer's call,
after the frame budget was measured rather than assumed: **§3 now budgets the required read
and the whole file separately, and §3a records the measurement and the reasoning.** The
required read is 1,482 lines, still mid-band. Nothing else in §3 moved: no dependency, no
build step, no line over 100 characters, no function over 40 (`drawHud` hit 41 and was split,
which is what §3 says to do), and the X-ray is still removable.

---

## 5. Scope — what the game actually is

**P1. Build this and stop.**

- **Overworld**: a 40×30 tile map defined as an array of strings, four terrain types (grass, water,
  tree, path). Walk around with arrow keys / WASD.
- **Camera** that follows the player and clamps at the map edges.
- **One interior area** — a cave or a house — as a second map, entered by stepping on a door tile.
  Two maps is what makes it "a world" instead of "a screen," and it costs about thirty lines.
- **Three NPCs** with dialogue. Trees at most two levels deep. Space bar to talk.
- **Four items** and an inventory. Pick up by walking over.
- **Three quest flags**, gated: one NPC wants an item, giving it flips a flag, the flag opens a
  bridge. That's the whole quest system and it is enough to show how state gates a world.
- **Save/load** to `localStorage`, plus a visible "saved" indicator.

**P1.5 — X-RAY (v1.1, built after P1 merged).** The panel shows, top to bottom in the order of
the arrow: every field of `intents` with the held ones lit; a log of the last fourteen changes to
`state` (field, old value, new value, tagged with the update number; the two per-step clocks
`stepCooldown` and `notice.secondsLeft` are skipped so they don't flood it); a COLLIDE probe of
the tile the player faces (character, legend name, walkable?, who is standing there, where a door
leads, and the bridge's flag-dependent rule when facing it); the whole `state` object pretty-
printed; and a LOOP line with frames drawn, updates run, the camera tile, and the purity check.
Whether the panel was open survives a reload so the edit → save → F5 loop keeps it open. Nothing
else: no pause, no step, no time travel — those are P2 candidates, listed below, not P1.5.

**P2. Do not build until P1 ships and the maintainer has read it.**
Combat (one enemy type, contact damage, health). Sound. A day/night tint. A minimap. For the
X-ray: a pause key and a single-step key so a student can watch one tick at a time.

**Explicit non-goals.** Pretty art. Sound in P1. Mobile or touch. Multiplayer. Performance work of
any kind. A framework. A test suite as a deliverable. Procedural generation — the map is hand-typed
data on purpose, because a student can edit it.

**A five-minute full playthrough must be possible**: three quests, both maps, save, reload, still
saved. If it takes longer than five minutes, the scope grew and something comes out.

---

## 6. `TEARDOWN.md` — the reading guide

Six reads. Each one is **10–15 minutes**, self-contained, and shaped the same way:

1. **What you're looking for** — one sentence.
2. **Where it lives** — the section number and the line range.
3. **A question to answer** from the code alone, with the answer at the bottom of the file so a
   student can check herself.
4. **Break it on purpose** — one specific edit, the exact line, and what should visibly happen.

The six reads, in order:

| Read | Question it answers |
|---|---|
| 1 | **Where does the game start, and what happens sixty times a second?** (LOOP + BOOT) |
| 2 | **Where does the world live?** (DATA — the map is a list of strings you can type into) |
| 3 | **What is the game actually keeping track of?** (STATE — one object, nothing hidden) |
| 4 | **How does a key press become a moving character?** (INPUT → UPDATE, the whole chain) |
| 5 | **Why can't you walk through a tree?** (COLLIDE) |
| 6 | **Why does drawing never change anything?** (RENDER — the read/write split, the payload) |

Written for a student reading alone, second person, no jargon that isn't defined on first use.

---

## 7. `CHANGE-ME.md` — the reconstruct half

Ten modifications, ranked easiest to hardest, each naming the exact section and the exact line.
Roughly: change a number in CONFIG → recolor a terrain type → widen the map by typing → add a fourth
item → add a fourth NPC with dialogue → make an NPC move → add a terrain type with new walkability →
add a second interior → add a quest that needs two items → make something happen when all three
flags are set.

Each entry is one sentence of what to do, one line of where, and one sentence of what you should see.
No solutions.

---

## 8. Acceptance criteria

Mechanically checkable — run these before calling it done:

- [ ] Opens by double-click in Edge and Chrome. **Zero console errors, zero warnings.**
- [ ] Works with the network disabled.
- [ ] `wc -l game.html` ≤ 2000. No line > 100 chars.
- [ ] Each banned string from §3 returns zero grep hits.
- [ ] All ten section banners present, in order, numbered, each with a "What to look for" line.
- [ ] No assignment to `state.` anywhere inside the RENDER section.
- [ ] The render-purity dev assertion is present and passing.
- [ ] Full playthrough (3 quests, both maps, save, reload, verify) completes in under 5 minutes.
- [ ] All four deliverables present; `TEARDOWN.md` line ranges match the actual file.
- [ ] (v1.1) X pressed in the game shows the panel; X again hides it; the choice survives F5.
- [ ] (v1.1) No assignment to `state.` or `intents.` anywhere inside section `11 · X-RAY`.
- [ ] (v1.1) Deleting section 11, the `<aside>` and the four X-ray lines in LOOP leaves a game
      that opens with zero console errors and walks — the X-ray is removable by construction.
- [ ] (v1.1) `node tools/check.mjs`, `node tools/playthrough.mjs` and `node tools/check-doc-lines.mjs`
      all exit 0. These are maintainer tools, not student deliverables.
- [ ] (v1.2) Panel open, P freezes the world while the panel keeps redrawing; P again resumes
      with no burst of catch-up ticks.
- [ ] (v1.2) While paused, `.` runs exactly one update: "updates run" rises by 1 and the
      change log gains that tick's fields.
- [ ] (v1.2) P and `.` do nothing while the panel is hidden; X while paused hides the panel
      and resumes.
- [ ] (v1.2) Pause survives neither F5 nor K/L; panel-open still does.
- [ ] (v1.2) `xrayMemory` remains the only X-ray memory; STATE's "three other things" comment
      is still true.
- [ ] (v1.2) All three `tools/*.mjs` exit 0 after TEARDOWN/CHANGE-ME ranges are refreshed.
- [ ] (v1.3) The panel's first box is a seven-row diagram, one row per stage of the arrow, in
      order; rows light with `▶` when their stage acted and dim to `│` when it did not.
- [ ] (v1.3) Each box in the panel carries a one-line plain-English caption under its heading.
- [ ] (v1.3) Both "ask an AI" buttons fill the textarea with a prompt containing the live values
      the panel is showing, report the copy, and hand keyboard focus back so the game still walks.
- [ ] (v1.3) The panel scrolls inside itself; at 1366×650 with it open there is no horizontal
      page scroll and the canvas stays on screen.
- [ ] (v1.3) Section 11 is still removable, `xrayMemory` is still the only X-ray memory, and the
      hook into LOOP is still the same four lines.
- [ ] (v1.3) All four `tools/*.mjs` exit 0, and `check-doc-lines.mjs` is clean after the
      insertion above the script shifted every citation.
- [ ] (v1.4) After P or `.` with the panel open, the `keyboard` row says the key is not a game
      key and INPUT skips it; after an arrow key it names the key again.
- [ ] (v1.4) While walking, the `3 · state` row alternates `this frame: #n …` and
      `timers only, last #n …`; standing still it reads `no change, last #n …`.
- [ ] (v1.4) The prompt textarea is hidden until the first "ask an AI" click, then shown.
- [ ] (v1.4) The UPDATE caption names `stepCooldown` and `notice.secondsLeft` as left out.
- [ ] (v1.4) `game.html` is ≤ 1,800 lines and every student-facing line citation still holds.
      *(Superseded in v1.5 by the two criteria below; the citation half still holds and is
      still checked by `tools/check-doc-lines.mjs`.)*
- [ ] (v1.5) The required read — top of the file through section 10 — is 1,200–1,800 lines,
      and the whole file is ≤ 2,600. `tools/check.mjs` reports these as two separate checks.
- [ ] (v1.5) Anything that took the whole file past 1,800 lives after `10 · BOOT` in its own
      optional section and `tools/check-xray-removable.mjs` still passes.
- [ ] (v1.5) Twelve alternating Left/Right taps ending on Right leave the player facing right,
      not left, and a tap shorter than one step is not dropped.
- [ ] (v1.5) T starts the clock at 0:00 and shows it; T again hides it and it stops counting.
      With the timer off, the X-ray's `3 · state` row still reads `no change` when standing
      still; with it on, that row reads `timers only`.
- [ ] (v1.5) `runTimer` is absent from the save, so K → F5 → L restores progress with a fresh
      clock. Section 11 is still removable and `xrayMemory` is still the only X-ray memory.
- [ ] (v1.5) All four `tools/*.mjs` exit 0 after every TEARDOWN/CHANGE-ME citation was
      re-anchored, and no line in `game.html` exceeds 100 characters.

Judged by a human, not the agent:

- [ ] A student who has never seen the file can answer **Read 1's** question in ten minutes.
- [ ] A teacher can scroll the file once and find the game loop without searching.

---

## 9. Build order for the overnight run

Commit after each step. Do not refactor a finished section while building a later one.

1. Skeleton: all ten banners, empty. Commit.
2. CONFIG + DATA + STATE — the world as data, nothing running yet. Commit.
3. LOOP + RENDER — a static map on screen. Commit.
4. INPUT + UPDATE + COLLIDE — a player who walks and can't walk through trees. Commit.
5. NPCs, dialogue, items, inventory. Commit.
6. Quest flags and the gated bridge. Commit.
7. The interior area and transitions. Commit.
8. SAVE. Commit.
9. Render-purity assertion + the acceptance-criteria pass. Commit.
10. `TEARDOWN.md`, `CHANGE-ME.md`, `README.md` — written **against the finished file**, with real
    line ranges. Commit.

**Stop at P1.** If you finish early, do not start P2 — spend the time re-reading `game.html` as a
15-year-old would and cutting anything that made you pause.

---

## 10. Open questions

- **The genre came from a student.** They picked open-world adventure over the usual small-app
  teardown targets. If the built thing doesn't feel like what they meant, that's the failure mode to
  watch, not bugs.
- **Whether this runs in class is undecided.** Realistic outcomes: a short Read 1 walkthrough, send
  it after the term ends, or fold it into a longer block for students who stay.
- **The artifact should be portable.** Single file, no account, no server — a student can take it
  home, which would make it the only piece of the course that travels.
- **GitHub Pages is extra, not instead.** `game.html` still opens from disk with the network
  off and still makes zero network requests. The Pages URL is for a classroom that already
  has a connection. `index.html` is a redirect to `game.html`, not a fifth deliverable.
- **`how.html` is extra, not instead.** A student-facing time-lapse of how the file got
  written (ADEPT framing, agent phases). It is not a fifth deliverable. The four files in
  §2 are still the product. Later sessions should extend a phase, not rebuild the spine.
