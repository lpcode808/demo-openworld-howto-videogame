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
**Where:** §1 CONFIG, line 225 (`playerStepsPerSecond`)
**You should see:** The player visibly speeds up or slows down while walking.

## 2. Recolor a terrain type

**Do:** Change the hex color for one terrain type, such as grass or water.
**Where:** §1 CONFIG, lines 211–331
**You should see:** Every tile of that terrain type, on all three maps, changes color.

## 3. Widen the map by typing

**Do:** Insert one more `.` just before the final `T` of every overworld row, so all thirty rows
stay the same length and the tree border stays on the edge.
**Where:** §2 DATA, lines 332–700
**You should see:** The map is wider, and the camera slides further right before it stops.

## 4. Add a fifth item

**Do:** The game already has four items. Add a fifth, copying the shape of an existing one, with
a tile position that isn't a wall or a tree.
**Where:** §2 DATA, lines 498–508 (`items`)
**You should see:** A new colored square on the ground, and its name in the Bag line once you
walk over it.

## 5. Add a fourth NPC

**Do:** Add a new entry to the NPC table, copying the shape of Mira, Bram, or Oswin, with its own
name, position, and dialogue tree.
**Where:** §2 DATA, lines 533–683 (`npcs`)
**You should see:** A new colored square with a name floating above it, and a speech box when
you face it and press Space.

## 6. Make an NPC move

**Do:** Make one NPC wander instead of standing still. Its position lives in the NPC table in
DATA, which is `const` and never changes — think about which section is allowed to change a
value over time, and where a value that changes over time is supposed to live.
**Where:** §2 DATA, lines 533–683 (`npcs`)
**Where:** §3 STATE, lines 716–762 (`state`)
**Where:** §5 UPDATE, lines 877–892 (`update`)
**You should see:** The NPC's square moves around the map on its own instead of staying put.

## 7. Add a terrain type with new walkability

**Do:** Pick a new letter, give it a color and a walkable value, then type that letter into a
map row.
**Where:** §1 CONFIG, lines 255–279 (`colors`)
**Where:** §2 DATA, lines 350–363 (`tileTypes`)
**Where:** §2 DATA, lines 379–442 (`maps.overworld.rows`)
**You should see:** A new colored tile where you typed the letter, either blocking your walk or
letting you through, depending on the walkable value you picked.
**Then go further:** every tile in that table says two things about itself — `walkable` and
`slow`. Add a third. Ice that slides you an extra tile, ground only some quests let you onto, a
tile that shows a message when you stand on it. The bog is the worked example for `slow`: find
where UPDATE reads it (`stepCooldownFor`) and you have the whole pattern.

## 8. Add a second interior

**Do:** Copy the shape of the house map to make a new interior, then add a matching pair of
doors linking a tile in the overworld to a tile in the new interior, and back.
**Where:** §2 DATA, lines 376–464 (`maps`)
**Where:** §2 DATA, lines 379–442 (`maps.overworld.rows`)
**Where:** §2 DATA, lines 467–487 (`doors`)
**You should see:** Stepping on the new door tile takes you into the new interior, and stepping
on its exit tile brings you back to the same spot outside.

## 9. Add a quest that hands something back

**Do:** Every quest in the game so far takes items off you. Make one that gives an item *to* the
player — an NPC who, once their flag is set, puts a new item in your bag. Then make a later quest
want that item, so finishing one quest is what makes the next one possible.
**Where:** §2 DATA, lines 515–520 (`quests`)
**Where:** §2 DATA, lines 533–683 (`npcs`)
**Where:** §5 UPDATE, lines 1058–1073 (`updateTalking`)
**Where:** §5 UPDATE, lines 1077–1114 (`updateDialogue`)
**Where:** §5 UPDATE, lines 1110–1123 (`giveItemsToNpc`)
**You should see:** A chain — quest A can't be started until quest B is finished, because the
thing A wants only exists after B.
**Read first:** Nessa wants three things at once, which is the worked example for "a want is a
list": `wantsItems` in her row of `npcs`, and `hasAllItems` in UPDATE. Giving an item back is the
mirror image of `giveItemsToNpc`, so read that function before you write yours.
**Watch out for:** `pickedUpItems` in `state` exists so an item you gave away never reappears on
the ground. An item that was never on the ground has to reach the bag some other way — decide
which, and say why in a comment.

## 10. Make something happen when the last quest is done

**Do:** Finishing the three village quests opens the forest gate — read how that works, then do
the same for the *fourth* quest. Nothing at all happens when Nessa's feast basket is filled.
Make something happen.
**Where:** §3 STATE, lines 738–743 (`state.flags`)
**Where:** §2 DATA, lines 515–520 (`quests`)
**Where:** §5 UPDATE, lines 877–892 (`update`)
**Where:** §7 RENDER, lines 1376–1405 (`drawHud`) and lines 1410–1424 (`drawQuestList`)
**You should see:** Something new — a message, a colour change, a new tile, a fourth map — once
the fourth `[x]` appears.
**Read first:** the gate is the worked example, and it is only three pieces. `villageQuestFlags`
in DATA lists the flags to check; `villageQuestsAllDone()` answers the question; `canWalkTo`,
`tileColorFor` and `giveItemsToNpc` each ask it for their own reason. Copy that shape.
**A ready-made finish line:** the speedrun clock in `state.runTimer` keeps counting until you
press T again, because the game never decides a run is over. Stopping it the moment the fourth
flag flips turns it into a real speedrun timer — and the forest is what makes a run worth timing:
the bog ford is much quicker for one gatherable, barely quicker for another, and no use at all
for the third. That is the whole of this exercise in one field: UPDATE notices, `state`
remembers, RENDER shows it.

---

## Extra — four ideas that came from a playtest

These are not part of the ten. They came from the first student who played the game through and
wrote back, and they are here because they are exactly the right size for a second sitting: each
one is a real change with a real payoff, and none of them needs anything the file doesn't already
have.

Three things that student asked for are in the file now and so are not exercises: the speedrun
timer on **T**, the fix for mashing left and right, and **the Old Forest** — their idea for a
level two, gated behind the three village quests. Exercises 7, 9 and 10 above were rewritten when
the forest went in, because the forest is now the worked example for the things they used to ask
for. Read it, then go past it.

### A. Give each character its own way of speaking

**Do:** Right now all four NPCs talk in the same plain voice. Give them each a distinctive one —
one clipped and formal, one that rambles, one that writes in leetspeak (`h3ll0 tr4v3l3r`), one
that only speaks in symbols. It is the same trick as the map: dialogue is just text sitting in a
table, so you change a character by typing.
**Where:** §2 DATA, lines 533–683 (`npcs`) — the `lines:` arrays inside each `dialogue:` block
**You should see:** Four people who sound like four people. Watch the speech box width: a line
much longer than the ones already there will run off the edge, because `drawDialogueBox` sizes
the box by counting lines, not by measuring letters.
**Then ask:** should the *voice* live in DATA next to the words, or should RENDER know how to draw
a "leetspeak NPC"? One of those answers keeps DATA readable and one of them spreads a character
across two sections. There isn't a single right answer — decide, and write down why.

### B. Build a level three — and this time nobody has done it for you

**Do:** The Old Forest was this student's idea and it is in the game now. Do the next one
yourself: a fourth map, reached from inside the forest rather than from the village, gated on
Nessa's flag so it only opens once level two is finished. Up a mountain, or down a mineshaft.
**Where:** §2 DATA, lines 376–464 (`maps`), lines 467–487 (`doors`), lines 498–508 (`items`),
lines 515–520 (`quests`), lines 533–683 (`npcs`); §6 COLLIDE for the new gate; §1 CONFIG for
`hudHeightInPixels` if a fifth quest leaves the HUD no room.
**You should see:** A new place on the HUD's "Place:" line, and a quest that can't be started
until the feast is done.
**Worth knowing before you start:** this is the biggest change anyone can make to this file, and
the forest is your worked example for every part of it — five tables edited at once, one `if` in
COLLIDE, one letter typed into a map row. Do the map first and walk around in it before you add a
single item; the checks in §10 BOOT will catch a mistyped row and name it.
**The design question, which is the real exercise:** the forest works because there are two ways
across it and they are not the same speed. Give your map a decision too. Then press **T** and
race yourself both ways — if the clock can't tell the difference, the decision was fake.

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
