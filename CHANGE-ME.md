# CHANGE-ME — ten things to break and fix

This is the reconstruct half of `game.html`. Ten changes, easiest to hardest — do them in order.
Each one is small enough to break and fix in a few minutes. If you type a map row wrong or drop an
NPC on a wall, the checks in §10 BOOT (`checkMapRowsAreEqualLength`, `checkThingsAreOnRealTiles`)
will stop the game and name your mistake. After any edit, save the file and press F5 — no build
step — and press N in the game if an old save is hiding your change.

## 1. Change a number in CONFIG

**Do:** Change how many steps per second the player takes while a key is held.
**Where:** §1 CONFIG, line 144 (`playerStepsPerSecond`)
**You should see:** The player visibly speeds up or slows down while walking.

## 2. Recolor a terrain type

**Do:** Change the hex color for one terrain type, such as grass or water.
**Where:** §1 CONFIG, lines 130–191 (`colors`)
**You should see:** Every tile of that terrain type, on both maps, changes color.

## 3. Widen the map by typing

**Do:** Insert one more `.` just before the final `T` of every overworld row, so all thirty rows
stay the same length and the tree border stays on the edge.
**Where:** §2 DATA, lines 260–291 (`maps.overworld.rows`)
**You should see:** The map is wider, and the camera slides further right before it stops.

## 4. Add a fifth item

**Do:** The game already has four items. Add a fifth, copying the shape of an existing one, with
a tile position that isn't a wall or a tree.
**Where:** §2 DATA, lines 337–342 (`items`)
**You should see:** A new colored square on the ground, and its name in the Bag line once you
walk over it.

## 5. Add a fourth NPC

**Do:** Add a new entry to the NPC table, copying the shape of Mira, Bram, or Oswin, with its own
name, position, and dialogue tree.
**Where:** §2 DATA, lines 358–468 (`npcs`)
**You should see:** A new colored square with a name floating above it, and a speech box when
you face it and press Space.

## 6. Make an NPC move

**Do:** Make one NPC wander instead of standing still. Its position lives in the NPC table in
DATA, which is `const` and never changes — think about which section is allowed to change a
value over time, and where a value that changes over time is supposed to live.
**Where:** §2 DATA, lines 358–468 (`npcs`)
**Where:** §3 STATE, lines 500–535 (`state`)
**Where:** §5 UPDATE, lines 626–637 (`update`)
**You should see:** The NPC's square moves around the map on its own instead of staying put.

## 7. Add a terrain type with new walkability

**Do:** Pick a new letter, give it a color and a walkable value, then type that letter into a
map row.
**Where:** §1 CONFIG, lines 130–191 (`colors`)
**Where:** §2 DATA, lines 239–248 (`tileTypes`)
**Where:** §2 DATA, lines 260–291 (`maps.overworld.rows`)
**You should see:** A new colored tile where you typed the letter, either blocking your walk or
letting you through, depending on the walkable value you picked.

## 8. Add a second interior

**Do:** Copy the shape of the house map to make a new interior, then add a matching pair of
doors linking a tile in the overworld to a tile in the new interior, and back.
**Where:** §2 DATA, lines 257–313 (`maps`)
**Where:** §2 DATA, lines 260–291 (`maps.overworld.rows`)
**Where:** §2 DATA, lines 317–326 (`doors`)
**You should see:** Stepping on the new door tile takes you into the new interior, and stepping
on its exit tile brings you back to the same spot outside.

## 9. Add a quest that needs two items

**Do:** Pick or add an NPC who won't set their flag until the player is carrying two specific
items instead of one, so the offer, the choice, and the flag-flipping all need both.
**Where:** §2 DATA, lines 346–350 (`quests`)
**Where:** §2 DATA, lines 358–468 (`npcs`)
**Where:** §5 UPDATE, lines 745–760 (`updateTalking`)
**Where:** §5 UPDATE, lines 764–791 (`updateDialogue`)
**Where:** §5 UPDATE, lines 795–799 (`giveItemToNpc`)
**You should see:** The NPC only reaches their thank-you dialogue once you've handed over both
items, not just one.

## 10. Make something happen when all three flags are set

**Do:** Right now, nothing happens when all three quest flags are true — the HUD just shows
three `[x]` marks. Make something happen at that moment.
**Where:** §3 STATE, lines 520–524 (`state.flags`)
**Where:** §2 DATA, lines 346–350 (`quests`)
**Where:** §5 UPDATE, lines 626–637 (`update`)
**Where:** §7 RENDER, lines 1019–1058 (`drawHud`)
**You should see:** Something new — a message, a color change, a new tile — once the third
`[x]` appears.
