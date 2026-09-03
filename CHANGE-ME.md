# CHANGE-ME — ten things to break and fix

This is the reconstruct half of `game.html`. Ten changes, easiest to hardest — do them in order.
Each one is small enough to break and fix in a few minutes. If you type a map row wrong or drop an
NPC on a wall, the checks in §10 BOOT (`checkMapRowsAreEqualLength`, `checkThingsAreOnRealTiles`)
will stop the game and name your mistake. After any edit, save the file and press F5 — no build
step — and press N in the game if an old save is hiding your change.

Press **X** while you work. The x-ray panel shows `state` live, so when a change doesn't seem to
do anything you can see whether the value you edited actually moved, instead of guessing. When
you are stuck, press **P** to freeze the moment and hit *copy: explain this frame* — that puts
everything the panel is showing into a question you can paste into any AI chat, so you can ask
about the exact frame in front of you rather than describing it from memory.

## 1. Change a number in CONFIG

**Do:** Change how many steps per second the player takes while a key is held.
**Where:** §1 CONFIG, line 224 (`playerStepsPerSecond`)
**You should see:** The player visibly speeds up or slows down while walking.

## 2. Recolor a terrain type

**Do:** Change the hex color for one terrain type, such as grass or water.
**Where:** §1 CONFIG, lines 210–312
**You should see:** Every tile of that terrain type, on both maps, changes color.

## 3. Widen the map by typing

**Do:** Insert one more `.` just before the final `T` of every overworld row, so all thirty rows
stay the same length and the tree border stays on the edge.
**Where:** §2 DATA, lines 313–570
**You should see:** The map is wider, and the camera slides further right before it stops.

## 4. Add a fifth item

**Do:** The game already has four items. Add a fifth, copying the shape of an existing one, with
a tile position that isn't a wall or a tree.
**Where:** §2 DATA, lines 422–427 (`items`)
**You should see:** A new colored square on the ground, and its name in the Bag line once you
walk over it.

## 5. Add a fourth NPC

**Do:** Add a new entry to the NPC table, copying the shape of Mira, Bram, or Oswin, with its own
name, position, and dialogue tree.
**Where:** §2 DATA, lines 443–553 (`npcs`)
**You should see:** A new colored square with a name floating above it, and a speech box when
you face it and press Space.

## 6. Make an NPC move

**Do:** Make one NPC wander instead of standing still. Its position lives in the NPC table in
DATA, which is `const` and never changes — think about which section is allowed to change a
value over time, and where a value that changes over time is supposed to live.
**Where:** §2 DATA, lines 443–553 (`npcs`)
**Where:** §3 STATE, lines 586–629 (`state`)
**Where:** §5 UPDATE, lines 744–759 (`update`)
**You should see:** The NPC's square moves around the map on its own instead of staying put.

## 7. Add a terrain type with new walkability

**Do:** Pick a new letter, give it a color and a walkable value, then type that letter into a
map row.
**Where:** §1 CONFIG, lines 247–268 (`colors`)
**Where:** §2 DATA, lines 324–333 (`tileTypes`)
**Where:** §2 DATA, lines 345–377 (`maps.overworld.rows`)
**You should see:** A new colored tile where you typed the letter, either blocking your walk or
letting you through, depending on the walkable value you picked.

## 8. Add a second interior

**Do:** Copy the shape of the house map to make a new interior, then add a matching pair of
doors linking a tile in the overworld to a tile in the new interior, and back.
**Where:** §2 DATA, lines 342–399 (`maps`)
**Where:** §2 DATA, lines 345–377 (`maps.overworld.rows`)
**Where:** §2 DATA, lines 402–411 (`doors`)
**You should see:** Stepping on the new door tile takes you into the new interior, and stepping
on its exit tile brings you back to the same spot outside.

## 9. Add a quest that needs two items

**Do:** Pick or add an NPC who won't set their flag until the player is carrying two specific
items instead of one, so the offer, the choice, and the flag-flipping all need both.
**Where:** §2 DATA, lines 431–435 (`quests`)
**Where:** §2 DATA, lines 443–553 (`npcs`)
**Where:** §5 UPDATE, lines 897–912 (`updateTalking`)
**Where:** §5 UPDATE, lines 916–949 (`updateDialogue`)
**Where:** §5 UPDATE, lines 947–951 (`giveItemToNpc`)
**You should see:** The NPC only reaches their thank-you dialogue once you've handed over both
items, not just one.

## 10. Make something happen when all three flags are set

**Do:** Right now, nothing happens when all three quest flags are true — the HUD just shows
three `[x]` marks. Make something happen at that moment.
**Where:** §3 STATE, lines 605–610 (`state.flags`)
**Where:** §2 DATA, lines 431–435 (`quests`)
**Where:** §5 UPDATE, lines 744–759 (`update`)
**Where:** §7 RENDER, lines 1172–1201 (`drawHud`) and lines 1206–1220 (`drawQuestList`)
**You should see:** Something new — a message, a color change, a new tile — once the third
`[x]` appears.
**A ready-made finish line:** the speedrun clock in `state.runTimer` keeps counting until you
press T again, because the game never decides a run is over. Stopping it here — when the third
flag flips — turns it into a real speedrun timer. That is the whole of this exercise in one
field: UPDATE notices, `state` remembers, RENDER shows it.

---

## Extra — four ideas that came from a playtest

These are not part of the ten. They came from the first student who played the game through and
wrote back, and they are here because they are exactly the right size for a second sitting: each
one is a real change with a real payoff, and none of them needs anything the file doesn't already
have. The same playtest also asked for a speedrun timer and reported that mashing left and right
confused the player's direction — those two are fixed in the file, so they are not exercises.

### A. Give each character its own way of speaking

**Do:** Right now all three NPCs talk in the same plain voice. Give them each a distinctive one —
one clipped and formal, one that rambles, one that writes in leetspeak (`h3ll0 tr4v3l3r`), one
that only speaks in symbols. It is the same trick as the map: dialogue is just text sitting in a
table, so you change a character by typing.
**Where:** §2 DATA, lines 443–553 (`npcs`) — the `lines:` arrays inside each `dialogue:` block
**You should see:** Three people who sound like three people. Watch the speech box width: a line
much longer than the ones already there will run off the edge, because `drawDialogueBox` sizes
the box by counting lines, not by measuring letters.
**Then ask:** should the *voice* live in DATA next to the words, or should RENDER know how to draw
a "leetspeak NPC"? One of those answers keeps DATA readable and one of them spreads a character
across two sections. There isn't a single right answer — decide, and write down why.

### B. Send the player into the forest to gather for the villagers

**Do:** The overworld is mostly trees you can't enter. Add a third map — a forest — reached
through a gap in the treeline the way the house is reached through its door, put two or three new
items in it, and have a villager want them.
**Where:** §2 DATA, lines 342–399 (`maps`), lines 402–411 (`doors`), lines 422–427 (`items`),
lines 431–435 (`quests`), lines 443–553 (`npcs`)
**You should see:** A new place on the HUD's "Place:" line, and a quest that can't be finished
without going there.
**Worth knowing before you start:** this is the biggest change in this file. Nothing new has to be
invented for it — a third map is the same shape as the house, a gathering quest is the same shape
as the healer's — but you are editing five tables at once, so do the map first and walk around in
it before you add a single item.

### C. Sound

**Do:** A step, a pickup, a door. The Web Audio API can make a short beep in about ten lines with
no sound files, which matters because this game is one file with no folder beside it.
**Where:** it does not exist yet — you are adding it. The honest question is *which section*, and
it is a genuinely hard one: a sound is an output, like drawing, but RENDER is not allowed to do
anything except read `state` and draw. Read the banner over §7 again before you decide.
**You should see:** …hear. And you should be able to say, in one sentence, why you put it where
you put it.

### D. Make the speedrun clock survive a reload

**Do:** T starts a clock, but reloading the page starts it over even though your save keeps your
progress — so a reload is a free reset. Put the timer in the save.
**Where:** §9 SAVE (`saveGame` and `loadGame`), and `state.runTimer` in §3 STATE
**You should see:** Save with K, press F5, press L — and the clock picks up where it left off.
**Watch out for:** a save written before your change has no timer in it. `loadGame` is wrapped in
a try/catch for exactly this kind of reason; make sure an old save still loads instead of
crashing the game.
