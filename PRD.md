# Open World Game How-To — PRD

**An open-world adventure game built to be read, not played.**

Status: v1.3 · P1 built 2026-09-01 · X-RAY and pause/step added 2026-09-02 (§4a, §5a, §8)
· X-ray explanation layer added 2026-09-02 (§4b, §8)

---

## 0. The one rule that settles every argument

This game's user is **a 15-year-old reading the source**, not a player. Every tradeoff — every
abstraction, every clever line, every dependency — resolves toward *"can a student trace this in
fifteen minutes?"* If a change makes the game better and the code harder to read, **the change is
wrong.** If a change makes the code more readable and the game slightly worse, **ship it.**

Say it back to yourself before every commit: **it's not for gameplay, it's for learning.**

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

**Size**
- **1,200–1,800 lines** including comments and data. Hard ceiling **2,000**.
- No line longer than 100 characters.
- No function longer than **40 lines**. If one gets longer, it is two ideas — split it.

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
- All of §3's style rules apply to it unchanged. The file's target stays 1,200–1,800 lines.

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
