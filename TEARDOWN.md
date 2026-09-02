# TEARDOWN — six reads through `game.html`

You are going to read a video game. Not play it: read it. `game.html` is one file, about
1,200 lines, and it is the whole game. Nothing is hidden in another file or downloaded from
the internet.

Each read below takes 10–15 minutes and stands on its own. Every read has the same shape:

1. **What you're looking for** — one sentence.
2. **Where it lives** — the section number and the line range. Section numbers match the
   banner comments in the file (`1 · CONFIG`, `2 · DATA`, ... `10 · BOOT`).
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

**Where it lives:** §10 BOOT, lines 1155–1219, then §8 LOOP, lines 1068–1094. Read them in that
order, because that is the order the computer does.

Start at the bottom of the file. BOOT is not a function; it is a short list of statements that
run once when the page opens. Follow them top to bottom: two checks on the data (1165–1202), the
canvas gets its size (1204–1205), the keyboard gets listened to (1207–1208), a save is tried
(1211–1213), and then one line — 1215 — asks the browser to call `frame` when it is next ready to
draw.

Now go to `frame`, lines 1079–1092. Fourteen lines. Read each one and say in words what it does.
The last line asks the browser to call `frame` again. That is the whole heartbeat: BOOT calls
`frame` once, and `frame` calls itself forever, about sixty times a second.

**Question 1:** Inside `frame` there is a `while` loop around `update`. Why a loop, and not just
calling `update` once per frame?

**Break it on purpose:** delete line 1091 (`requestAnimationFrame(frame);` inside `frame`).
Save, reload. You should see the world drawn once, correctly — and then nothing. Arrow keys do
nothing. The heart beat exactly once. Put the line back.

---

## Read 2 — Where does the world live?

**What you're looking for:** the map. It is not a picture. It is text you could type.

**Where it lives:** §2 DATA, lines 159–416. The maps themselves are lines 188–244; the
overworld's rows are lines 192–221.

Look at line 206. It is row 14 of the overworld: a line of `=` (path) running from the left,
across `BB` in the middle, and on to the right. Now look at the game: the path you start on.
Same thing. Every character in that string is one 32-pixel square on screen. Count the `~`
columns on either side of the `BB` — that is the river.

Now find `tileTypes`, lines 170–180. This table is the legend: what each character means, what
colour it is, and whether you can stand on it. Notice the map rows and the legend are both plain
data. Nothing in DATA *does* anything; the rest of the file reads it.

Look further down. `items` (268–273), `quests` (277–281), and `npcs` (289–400) are also just
tables. Read Mira's dialogue, lines 299–324 (the `dialogue: {` block). It is a set of named
nodes; each choice names the next node to jump to, or `null` to stop. That is a dialogue tree
written as data.

**Question 2:** Row 14 has `BB` where the path crosses the river. The legend says `'B'` is
*not* walkable. So how do you ever cross? (Hint: search the file for `'B'`.)

**Break it on purpose:** on line 206, change `BB` to `==`. Save, reload, press N. Walk east
along the path. You should cross the river before Bram has done anything; his quest now gates
nothing. Change it back.

---

## Read 3 — What is the game actually keeping track of?

**What you're looking for:** the one object that holds everything the game knows.

**Where it lives:** §3 STATE, lines 417–468. The object itself is `state`, lines 431–466.

Read `state` field by field. Where you are (`currentMap`, `player`). What you carry
(`inventory`). What you have done (`flags`). Whether someone is talking (`dialogue`). A message
(`notice`). That is the complete list. If the game "remembers" something, it is in here.

Now prove it to yourself. Pick any fact about the game — say, "which quests are done" — and
search the file for where it is stored. You will land on `state.flags`. Try another: "which item
is still lying on the ground?" You land on `state.pickedUpItems`. There is no second place.

Two things outside `state` do change while the game runs, and the comment at lines 427–430 names
them: `intents` (§4) and the loop's stopwatch (§8). Neither is a fact about the world; one is a
mailbox from the keyboard, the other is a clock.

**Question 3:** `state` has both `inventory` and `pickedUpItems`. They sound like the same
thing. Why are there two? (Hint: what happens to the herb when you give it to Mira?)

**Break it on purpose:** on lines 436–437, change `tileX: 3,` / `tileY: 14,` to `tileX: 33,`
/ `tileY: 14,`. Save, reload, and press **N** (a saved game would put you back where you saved).
You should start on the east bank of the river, next to the house, with the bridge behind you.
Change it back.

---

## Read 4 — How does a key press become a moving character?

**What you're looking for:** the full chain from finger to pixel, in order.

**Where it lives:** §4 INPUT, lines 469–546, then §5 UPDATE, lines 547–732. In particular
`onKeyDown` (509–529), `intents` (480–491), `update` (557–568) and `updatePlayerMovement`
(608–633).

Start in INPUT. When you press a key, the browser calls `onKeyDown`. Read it. It does not move
anything. It sets a field of `intents` to `true` — for the right arrow, `intents.moveRight`. That
is all INPUT ever does: write down what you asked for.

Now the other end. `update` (557) runs sixty times a second from `frame`. It calls
`updatePlayerMovement`. Read that function slowly. It reads `intents.moveRight`, works out the
target tile, asks COLLIDE whether it is allowed, and only then changes `state.player.tileX`.

Notice the `stepCooldown`. Without it, holding a key would move you sixty tiles a second. The
cooldown is what makes a held key a steady walk.

Notice also that `update` checks `state.dialogue`. While a speech box is open, the same arrow
keys mean "move the highlight" and Space means "pick", so a different function runs.

**Question 4:** Hold the right arrow. List, in order, every function that runs between the key
going down and `state.player.tileX` changing. There are six or seven.

**Break it on purpose:** on line 498 (`'arrowleft'`), change `intents.moveLeft = isDown` to
`intents.moveRight = isDown`. Save, reload. The left arrow should now walk you right. Nothing
in UPDATE changed — you only changed what the key *asks for*. Change it back.

---

## Read 5 — Why can't you walk through a tree?

**What you're looking for:** the one function that says yes or no to a step.

**Where it lives:** §6 COLLIDE, lines 733–785. `canWalkTo` is lines 770–783; `tileAt` is
742–747.

This section is deliberately small so you can read it in one go. `tileAt` answers "which
character is at this spot on this map?", and treats anywhere off the edge as a wall. `canWalkTo`
asks three questions in order: is someone standing there? is it the bridge? otherwise, what does
the legend say? That is the entire physics engine.

Look at how the bridge is handled (779–781). The legend says `'B'` is not walkable, but this
one line overrides it when `state.flags.bridgeBuilt` is true. The tile never changed; a fact in
`state` changed, and COLLIDE reads it.

Now look at `findDoorAt` (750–757) and where it is used, `goThroughDoorUnderPlayer` (637–645).
Changing area is nothing more than changing three fields of `state`. RENDER draws whatever map
`state.currentMap` names; it never knows you moved.

**Question 5:** The house is drawn with `#` for walls and `D` for the door. You can step on the
`D` but not the `#` beside it. Which exact line makes that difference?

**Break it on purpose:** on line 173 (the `'T'` row of `tileTypes`), change `walkable: false`
to `walkable: true`. Save, reload. You should be able to walk straight through every tree,
including into the herb grove from any side. You still can't leave the map — find the line in
`tileAt` that guarantees that. Change it back.

---

## Read 6 — Why does drawing never change anything?

**What you're looking for:** proof that RENDER only reads. This is the most important idea in
the file.

**Where it lives:** §7 RENDER, lines 786–1067, and three lines of §8 LOOP, 1088–1090.

Scroll through RENDER. Every function is called `draw`-something or `compute`-something. Pick
any one and read it. It reads `state`, it reads the tables in DATA, and it calls `context.fill…`.
Search the whole section for `state.` followed by `=`. You will not find one. RENDER has no
way to change the world.

Why does that matter? Because it means you can understand the game in two halves. UPDATE decides
*what is true*. RENDER shows *what is true*. A bug in the drawing can never change where the
player is, and a bug in the rules can never be hidden by the drawing.

Now look at how the file enforces it. Line 1088 turns `state` into a string before drawing. Line
1090 calls `assertRenderChangedNothing` (1059–1065), which turns `state` into a string again and
compares. If they differ, the game throws an error and stops. It is a promise with an alarm on it.

**Question 6:** Find the line in RENDER that decides whether the bridge is drawn as water or as
planks. Does that line *change* anything? If not, which line, in which section, made the bridge
change?

**Break it on purpose:** inside `drawNotice`, after line 1043, add a new line
`state.notice.text = 'oops';`. Save, reload. Press F12 to open the console. Walk onto the herb
so a notice appears. You should see the game freeze and the console read
`RENDER changed state! Drawing must only read.` Delete the line you added.

---

## Answers

**1.** Frames are not exactly 1/60 s apart — a slow computer or a busy tab makes some frames
late. Each frame adds the real time that passed to `unsimulatedSeconds`, then runs `update` in
fixed 1/60 s slices as many times as fit, keeping the remainder for next frame. The game
therefore advances by the same rules on every machine; only how often it is *drawn* varies.

**2.** `canWalkTo` (line 779) checks for `'B'` before looking at the legend and returns
`state.flags.bridgeBuilt` instead. That flag is set to `true` in `giveItemToNpc` (line 728) when
you hand Bram the plank. `tileColorFor` (843–848) reads the same flag to draw planks instead
of water.

**3.** `inventory` is what you are carrying right now. `pickedUpItems` is everything you have
*ever* picked up. When you give Mira the herb it leaves `inventory` but stays in `pickedUpItems`,
and both `drawItems` (line 901) and `pickUpItemUnderPlayer` (line 651) check `pickedUpItems`, so
the herb does not reappear on the ground.

**4.** `onKeyDown` (509) → `setMovementIntent` (495) sets `intents.moveRight`. Then on the next
frame: `frame` (1079) → `update` (557) → `updatePlayerMovement` (608) → `canWalkTo` (770) →
`findNpcAt` (760) and `tileAt` (742) → back in `updatePlayerMovement`, line 628 assigns
`player.tileX = targetX`.

**5.** Line 782, `return tileTypes[tileCharacter].walkable;`, combined with the legend: line 176
says `'D'` is `walkable: true` and line 177 says `'#'` is `walkable: false`. Walls and doors are
just different letters in the map string; the legend is what gives them meaning.

**6.** `tileColorFor`, line 844 (`if (tileCharacter === 'B' && state.flags.bridgeBuilt)`). It
changes nothing; it returns a colour. The bridge "changed" when `giveItemToNpc` in §5 UPDATE
(line 728) set `state.flags.bridgeBuilt = true`. RENDER noticed on the next frame because it
reads that flag every time it draws.
