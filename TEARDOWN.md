# TEARDOWN — six reads through `game.html`

You are going to read a video game. Not play it: read it. `game.html` is one file, about
2,100 lines, and it is the whole game. Nothing is hidden in another file or downloaded from
the internet.

Each read below takes 10–15 minutes and stands on its own. Every read has the same shape:

1. **What you're looking for** — one sentence.
2. **Where it lives** — the section number and the line range. Section numbers match the
   banner comments in the file (`1 · CONFIG`, `2 · DATA`, ... `10 · BOOT`, plus an
   optional `11 · X-RAY`).
3. **A question** you can answer from the code alone. Answers are at the bottom of this file.
4. **Break it on purpose** — one edit, the exact line, and what you should see.

## Before you start

- Open `game.html` twice: once in **Microsoft Edge or Chrome** (double-click it) and once in a
  text editor that shows line numbers (VS Code, Notepad++, even Notepad with the status bar on).
- To see the browser's **console**, press **F12** in the game tab and click *Console*. Errors
  the game throws land there.
- After any edit: save the file, go to the game tab, press **F5** to reload. There is no build
  step. If a change doesn't seem to show up, press **N** in the game first — a saved game can
  hide a change to the starting position.
- The game has an **x-ray**. Press **X** and a panel opens beside it, showing the arrow below
  happening live: which keys are held right now, what the rules just changed in `state`, what
  the tile in front of you is, and the whole of `state`, updating sixty times a second. Leave it
  open for every read in this guide — it is the fastest way to check whether you read something
  correctly. Inside it, **P** freezes the world (the drawing keeps going) and **.** runs exactly
  one update, so you can watch a single tick happen. Two buttons copy everything the panel is
  showing into a question you can paste into any AI chat — one asks it to explain the frame you
  are looking at, one asks an image model to draw it. The x-ray is section 11 of the file. It is
  optional: delete it and the game is unchanged.

  Here is the whole screen with the panel open, and what each part of it is:

```
        the game (a canvas)                    the x-ray (press X)
    ┌───────────────────────┐   ┌────────────────────────────────────────┐
    │                       │   │ the whole file, as one picture         │
    │                       │   │   ▶ keyboard   last key: arrowright    │
    │      you walk         │   │   ▶ 4 · INPUT  writing that down       │
    │      around in        │   │   ▶ intents    moveRight               │
    │      here             │   │   ▶ 5 · UPDATE updates this frame: 1   │
    │                       │   │   │ 3 · state  timers only, last tileX │
    │                       │   │   ▶ 7 · RENDER frame 812, untouched    │
    ├───────────────────────┤   │   ▶ screen     what you are looking at │
    │ bag · quests · keys   │   ├────────────────────────────────────────┤
    └───────────────────────┘   │ ask an AI about this exact moment      │
                                │  [copy: explain this][copy: draw this] │
                                ├────────────────────────────────────────┤
                                │ 4 · INPUT   what you are asking for    │
                                │ 5 · UPDATE  what just changed, and when│
                                │ 6 · COLLIDE the tile you are facing    │
                                │ 3 · STATE   the whole world, live      │
                                │ 7+8 LOOP    frames drawn, updates run  │
                                └────────────────────────────────────────┘
```

  The top box is the arrow itself, one row per stage, redrawn sixty times a second. A row
  marked **▶** did something on the last frame; a row marked **│** sat still. Under it are the
  two buttons. Under those, the same five stages again in full detail, still in the order of
  the arrow.

  Nothing in that panel is a second copy of the game. Every number in it is read straight out of
  the same `state` the game itself uses, which is why it can never drift out of date.
- Line numbers below are exact for the version of the file shipped with this guide. If you
  have edited the file, they will drift; search for the function name instead.

One idea runs through all six reads. The file is one sentence, repeated sixty times a second:

    keyboard --> INPUT --> intents --> UPDATE --> state --> RENDER --> screen

Only UPDATE (and SAVE, when loading) is allowed to change `state`. RENDER only reads it. If you
remember nothing else, remember that arrow.

---

## Read 1 — Where does the game start, and what happens sixty times a second?

**What you're looking for:** the single function the browser calls over and over, and the
handful of lines that kick it off.

**Where it lives:** §10 BOOT, lines 1624–1686, then §8 LOOP, lines 1528–1562. Read them in that
order, because that is the order the computer does.

Start at the bottom of the file. BOOT is not a function; it is a short list of statements that
run once when the page opens. Follow them top to bottom: two checks on the data (1624–1658), the
canvas gets its size (1663–1664), the keyboard gets listened to (1666–1667), a save is tried
(1669–1672), and then one line — 1674 — asks the browser to call `frame` when it is next ready to
draw.

Now go to `frame`, lines 1539–1560. Twenty-two lines. Read each
one and say in words what it does. The last line asks the browser to call `frame` again. That is
the whole heartbeat: BOOT calls `frame` once, and `frame` calls itself forever, about sixty
times a second.

**Question 1:** Inside `frame` there is a `while` loop around `update`. Why a loop, and not just
calling `update` once per frame?

**Break it on purpose:** delete line 1559 (`requestAnimationFrame(frame);` inside `frame`).
Save, reload. You should see the world drawn once, correctly — and then nothing. Arrow keys do
nothing. The heart beat exactly once. Put the line back.

---

## Read 2 — Where does the world live?

**What you're looking for:** the map. It is not a picture. It is text you could type.

**Where it lives:** §2 DATA, lines 332–700. The maps themselves are lines 376–464; the
overworld's rows are lines 379–442.

Look at line 394. It is row 14 of the overworld: a line of `=` (path) running from the left,
across `BB` in the middle, and on to the right. Now look at the game: the path you start on.
Same thing. Every character in that string is one 32-pixel square on screen. Count the `~`
columns on either side of the `BB` — that is the river.

Now find `tileTypes`, lines 350–363. This table is the legend: what each character means, what
colour it is, and whether you can stand on it. Notice the map rows and the legend are both plain
data. Nothing in DATA *does* anything; the rest of the file reads it.

Look further down. `items` (498–508), `quests` (515–520), and `npcs` (533–683) are also just
tables. Read Mira's dialogue, lines 543–568 (the `dialogue: {` block). It is a set of named
nodes; each choice names the next node to jump to, or `null` to stop. That is a dialogue tree
written as data.

There are three maps in `maps`, not one: the village, the forest behind the gate, and the inside
of Oswin's house. Scroll to the forest and read its rows the way you just read row 14. The stream
of `~` across the middle cuts the map in half, and there are exactly two ways through it — the
four `m` tiles in the middle, and the gap at the east end. That is a level design, and it is
twenty lines of text you could retype. Nothing in DATA decides that the `m` tiles are slower to
walk on; the legend just says `slow: true`, and UPDATE is what acts on it.

**Question 2:** Row 14 has `BB` where the path crosses the river. The legend says `'B'` is
*not* walkable. So how do you ever cross? (Hint: search the file for `'B'`.)

**Break it on purpose:** on line 394, change `BB` to `==`. Save, reload, press N. Walk east
along the path. You should cross the river before Bram has done anything; his quest now gates
nothing. Change it back.

---

## Read 3 — What is the game actually keeping track of?

**What you're looking for:** the one object that holds everything the game knows.

**Where it lives:** §3 STATE, lines 701–764. The object itself is `state`, lines 716–762.

Read `state` field by field. Where you are (`currentMap`, `player`). What you carry
(`inventory`). What you have done (`flags`). Whether someone is talking (`dialogue`). A message
(`notice`). That is the complete list. If the game "remembers" something, it is in here.

Now prove it to yourself. Pick any fact about the game — say, "which quests are done" — and
search the file for where it is stored. You will land on `state.flags`. Try another: "which item
is still lying on the ground?" You land on `state.pickedUpItems`. There is no second place.

Three things outside `state` do change while the game runs, and the comment at lines 708–715
names them: `intents` (§4), the loop's stopwatch (§8), and `xrayMemory` in the optional §11
X-RAY. None is a fact about the world: one is a mailbox from the keyboard, one is a clock, and
one is the x-ray panel's own scratch paper.

**Question 3:** `state` has both `inventory` and `pickedUpItems`. They sound like the same
thing. Why are there two? (Hint: what happens to the herb when you give it to Mira?)

**Break it on purpose:** on lines 721–722, change `tileX: 3,` / `tileY: 14,` to `tileX: 33,`
/ `tileY: 14,`. Save, reload, and press **N** (a saved game would put you back where you saved).
You should start on the east bank of the river, next to the house, with the bridge behind you.
Change it back.

---

## Read 4 — How does a key press become a moving character?

**What you're looking for:** the full chain from finger to pixel, in order.

**Where it lives:** §4 INPUT, lines 765–866, then §5 UPDATE, lines 867–1125. In particular
`onKeyDown` (825–846), `intents` (778–792), `update` (877–892) and `updatePlayerMovement`
(953–987).

Start in INPUT. When you press a key, the browser calls `onKeyDown`. Read it. It does not move
anything. It sets a field of `intents` to `true` — for the right arrow, `intents.moveRight`. That
is all INPUT ever does: write down what you asked for.

There is one field in `intents` that is not a plain true/false: `newestMoveDirection` holds the
last direction you pressed, as a word. It exists because of a bug a player found. Mashing left
and right made the character walk left no matter which key you hit last, and the reason is in
`updatePlayerMovement`: the four `if`s that read the move flags are in a fixed order, and when
two keys are down at the same time — which happens for a few milliseconds every time you mash —
the earlier `if` always wins. A list of which keys are down cannot say which one you pressed
*second*, so INPUT now writes that down too.

Now the other end. `update` (877) runs sixty times a second from `frame`. It calls
`updatePlayerMovement`. Read that function slowly. It reads `intents.moveRight`, works out the
target tile, asks COLLIDE whether it is allowed, and only then changes `state.player.tileX`.

Notice the `stepCooldown`. Without it, holding a key would move you sixty tiles a second. The
cooldown is what makes a held key a steady walk. It is also the second half of that bug: the
function gives up early while the cooldown is still counting down, so a tap shorter than one
step used to be thrown away entirely. That is why letting go of a key does *not* clear
`newestMoveDirection` — the direction waits for the next step it is allowed to take, and
`updatePlayerMovement` clears it once it has had its turn. You can see the cooldown in the
x-ray: while you walk,
the `3 · state` row says **timers only** on most frames. UPDATE ran, but the only thing it
touched was that countdown, which the change log leaves out so real changes are not buried
under sixty ticks a second. Every ninth frame or so it says **this frame:** and names the
tile that changed. Press **P** and the top row says `p — not a game key, INPUT skips it`:
the panel's own keys never enter the pipe, which is why pausing changes nothing in `state`.

Notice also that `update` checks `state.dialogue`. While a speech box is open, the same arrow
keys mean "move the highlight" and Space means "pick", so a different function runs.

Now check yourself against the running game. Press **X**, then hold the right arrow. This one
read runs the whole length of the panel:

```
  what happens                                  where to watch it in the x-ray
  ────────────                                  ──────────────────────────────
  you hold the right arrow down
        │
        ▼
  4 · INPUT writes down what you asked for      the "4 · INPUT" box: moveRight
        │                                       goes bright while your finger
        ▼                                       is down
  intents.moveRight is now true
        │
        ▼
  5 · UPDATE reads it, asks COLLIDE whether     the "5 · UPDATE" box: a new
  the step is allowed, and only then writes     line appears, reading
        │                                       player.tileX  5  →  6
        ▼
  state.player.tileX is now one bigger          the "3 · STATE" box: that
        │                                       number changes in place
        ▼
  7 · RENDER reads state and draws it           the "7+8 LOOP" box: "frames
        │                                       drawn" keeps climbing
        ▼
  you see yourself one tile further east        the game window itself
```

Two things are worth noticing on that diagram. The arrow only ever points **down** — nothing
later reaches back up and changes something earlier. And `state` is touched exactly once, in
the middle, by UPDATE. Press **P** to freeze the world and **.** to walk one update at a time,
and you can watch that single write happen on its own.

**Question 4:** Hold the right arrow. List, in order, every function that runs between the key
going down and `state.player.tileX` changing. There are six or seven.

**Break it on purpose:** on line 799 (`arrowleft: 'left'`), change `'left'` to `'right'`. Save,
reload. The left arrow should now walk you right. Nothing in UPDATE changed — you only changed
what the key *asks for*. Change it back.

---

## Read 5 — Why can't you walk through a tree?

**What you're looking for:** the one function that says yes or no to a step.

**Where it lives:** §6 COLLIDE, lines 1126–1184. `canWalkTo` is lines 1163–1182; `tileAt` is
lines 1135–1140.

This section is deliberately small so you can read it in one go. `tileAt` answers "which
character is at this spot on this map?", and treats anywhere off the edge as a wall. `canWalkTo`
asks four questions in order: is someone standing there? is it the bridge? is it the forest gate?
otherwise, what does the legend say? That is the entire physics engine.

Look at how the bridge is handled (1171–1176). The legend says `'B'` is not walkable, but this
one line overrides it when `state.flags.bridgeBuilt` is true. The tile never changed; a fact in
`state` changed, and COLLIDE reads it.

Now read the two lines under it, the forest gate. It is the same trick a second time, and
comparing the pair is the most useful thing in this read. The bridge asks about **one** flag.
The gate calls `villageQuestsAllDone()`, which asks about **three** — so a tile can depend on as
much of `state` as you like, and the tile itself never knows. This is also why level two exists
at all: the whole of "you have finished the village, here is somewhere new" is one `if` in this
section plus one `G` typed into row 0 of the overworld.

Now look at `findDoorAt` (1143–1150) and where it is used, `goThroughDoorUnderPlayer` (991–999).
Changing area is nothing more than changing three fields of `state`. RENDER draws whatever map
`state.currentMap` names; it never knows you moved.

**Question 5:** The house is drawn with `#` for walls and `D` for the door. You can step on the
`D` but not the `#` beside it. Which exact line makes that difference?

**Break it on purpose:** on line 353 (the `'T'` row of `tileTypes`), change `walkable: false`
to `walkable: true`. Save, reload. You should be able to walk straight through every tree,
including into the herb grove from any side. You still can't leave the map — find the line in
`tileAt` that guarantees that. Change it back.

---

## Read 6 — Why does drawing never change anything?

**What you're looking for:** proof that RENDER only reads. This is the most important idea in
the file.

**Where it lives:** §7 RENDER, lines 1185–1527, and three lines of §8 LOOP, lines 1555–1557.

Scroll through RENDER. Every function is called `draw`-something or `compute`-something. Pick
any one and read it. It reads `state`, it reads the tables in DATA, and it calls `context.fill…`.
Search the whole section for `state.` followed by `=`. You will not find one. RENDER has no
way to change the world.

Why does that matter? Because it means you can understand the game in two halves. UPDATE decides
*what is true*. RENDER shows *what is true*. A bug in the drawing can never change where the
player is, and a bug in the rules can never be hidden by the drawing.

Now look at how the file enforces it. Line 1240 turns `state` into a string before drawing. Line
1242 calls `assertRenderChangedNothing` (1519–1525), which turns `state` into a string again and
compares. If they differ, the game throws an error and stops. It is a promise with an alarm on it.

The x-ray is built on that same pair of strings. Line 1233 takes a snapshot before UPDATE runs;
line 1555 takes the one the purity check uses. Two snapshots, two comparisons:

```
  one turn of the loop
  ─────────────────────────────────────────────────────────────────────

  snapshot A  =  JSON.stringify(state)            line 1548
      │
      │   UPDATE runs — none, one, or several times
      ▼
  snapshot B  =  JSON.stringify(state)            line 1555
      │
      │   RENDER runs
      ▼
  compare state against snapshot B                line 1557
      │
      ├── the same?    good. drawing changed nothing. carry on.
      └── different?   throw. the game stops on the spot.


  A against B      = everything UPDATE changed   → the x-ray's "what changed" box
  B against now    = everything RENDER changed   → must always be nothing
```

Look at what that costs. Nothing inside UPDATE is instrumented — no logging, no hooks, no
special cases. The same two strings that prove RENDER is honest are also the complete record of
what the rules did. If you wanted to know what changed, you would have had to take those
snapshots anyway. That is spelled out in `§11 X-RAY, lines 1687–2128`.

**Question 6:** Find the line in RENDER that decides whether the bridge is drawn as water or as
planks. Does that line *change* anything? If not, which line, in which section, made the bridge
change?

**Break it on purpose:** inside `drawNotice`, after line 1481, add a new line
`state.notice.text = 'oops';`. Save, reload. Press F12 to open the console. Walk onto the herb
so a notice appears. You should see the game freeze and the console read
`RENDER changed state! Drawing must only read.` Delete the line you added.

---

## Answers

**1.** Frames are not exactly 1/60 s apart — a slow computer or a busy tab makes some frames
late. Each frame adds the real time that passed to `unsimulatedSeconds`, then runs `update` in
fixed 1/60 s slices as many times as fit, keeping the remainder for next frame. The game
therefore advances by the same rules on every machine; only how often it is *drawn* varies.

**2.** `canWalkTo` (line 1175) checks for `'B'` before looking at the legend and returns
`state.flags.bridgeBuilt` instead. That flag is set to `true` in `giveItemToNpc` (line 1110) when
you hand Bram the plank. `tileColorFor` (1246–1254) reads the same flag to draw planks instead
of water.

**3.** `inventory` is what you are carrying right now. `pickedUpItems` is everything you have
*ever* picked up. When you give Mira the herb it leaves `inventory` but stays in `pickedUpItems`,
and both `drawItems` (line 1318) and `pickUpItemUnderPlayer` (line 1002) check `pickedUpItems`, so
the herb does not reappear on the ground.

**4.** `onKeyDown` (825) → `setMovementIntent` (805) sets `intents.moveRight`. Then on the next
frame: `frame` (1539) → `update` (877) → `updatePlayerMovement` (953) → `canWalkTo` (1163) →
`findNpcAt` (1153) and `tileAt` (1135) → back in `updatePlayerMovement`, line 982 assigns
`player.tileX = targetX`.

**5.** Line 927, `return tileTypes[tileCharacter].walkable;`, combined with the legend: line 356
says `'D'` is `walkable: true` and line 357 says `'#'` is `walkable: false`. Walls and doors are
just different letters in the map string; the legend is what gives them meaning.

**6.** `tileColorFor`, line 1247 (`if (tileCharacter === 'B' && state.flags.bridgeBuilt)`). It
changes nothing; it returns a colour. The bridge "changed" when `giveItemToNpc` in §5 UPDATE
(line 1110) set `state.flags.bridgeBuilt = true`. RENDER noticed on the next frame because it
reads that flag every time it draws.
