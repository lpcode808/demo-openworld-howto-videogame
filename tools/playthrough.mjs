#!/usr/bin/env node
// tools/playthrough.mjs — a headless Chromium playthrough of game.html that
// proves the whole game works end to end: movement, collision, NPCs and
// dialogue, items and inventory, quest flags, the bridge gate, the second
// map, save, reload, and "new game" -- then level two: the forest gate shut
// and open, the third map, the bog's cost, and the three-item feast quest.
//
// Maintainer tool, not a student deliverable (see tools/README.md).
// Usage: PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node tools/playthrough.mjs

import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const gameFilePath = path.join(scriptDir, '..', 'game.html');
const gameFileUrl = 'file://' + gameFilePath;

// Direction name -> Playwright key name, and direction name -> tile offset.
// Mirrors the game's own `directionOffsets` in CONFIG/DATA.
const arrowKeyForDirection = {
  up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight',
};
const offsetForDirection = {
  up: { dx: 0, dy: -1 }, down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 }, right: { dx: 1, dy: 0 },
};

// The seven pipe-diagram stage labels, in order. Mirrors the game's own
// `xrayPipeStages` array in section 11.
const xrayPipeStageLabels = [
  'keyboard', '4 · INPUT', 'intents', '5 · UPDATE',
  '3 · state', '7 · RENDER', 'screen',
];

const consoleIssues = []; // { type: 'error' | 'warning' | 'pageerror', text }

// ------------------------------------------------------------------
// Small page-driving helpers
// ------------------------------------------------------------------

// Reads `state` from the page as a JSON clone (no live references).
async function getState(page) {
  return page.evaluate(() => JSON.parse(JSON.stringify(state)));
}

// Reads the world data the pathfinder and quest driver need. These are all
// script-level consts that never change at runtime, so one read is enough.
async function getWorld(page) {
  return page.evaluate(() => JSON.parse(JSON.stringify({
    maps, items, npcs, doors, tileTypes, saveSlotName, xrayStorageKey,
  })));
}

// Presses a key down, holds briefly, then releases. One tap = one game
// intent, matching how a student would actually play.
async function tapKey(page, key, holdMs = 40) {
  await page.keyboard.down(key);
  await page.waitForTimeout(holdMs);
  await page.keyboard.up(key);
}

// Polls `state` until `predicate` is true, or throws with a description.
async function waitForCondition(page, predicate, timeoutMs, description) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const state = await getState(page);
    if (predicate(state)) return state;
    await page.waitForTimeout(25);
  }
  const state = await getState(page);
  throw new Error('Timed out waiting for ' + description + '. Last state: ' +
    JSON.stringify(state));
}

// Reads whether the X-ray <aside> is currently hidden.
async function isXrayPanelHidden(page) {
  return page.evaluate(() => document.getElementById('xray').hidden);
}

// Parses the two LOOP counters and the pause state out of #xrayLoop's
// text, the same numbers a person reading the panel would see. Only
// meaningful while the panel is open — that text goes stale once hidden.
async function getXrayLoopCounters(page) {
  return page.evaluate(() => {
    const text = document.getElementById('xrayLoop').textContent;
    return {
      framesDrawn: Number(text.match(/frames drawn: (\d+)/)[1]),
      updatesRun: Number(text.match(/updates run:\s+(\d+)/)[1]),
      paused: text.includes('clock: PAUSED'),
    };
  });
}

// Reads the seven <li> rows of the pipe diagram: id, full text, and class.
async function getPipeRows(page) {
  return page.evaluate(() => Array.from(document.querySelectorAll('#xrayPipe li')).map((row) => ({
    id: row.id, text: row.textContent, className: row.className,
  })));
}

// Polls one pipe row's text until it contains `substring`, or throws with a
// description. Mirrors waitForCondition above, but for a DOM row instead of
// game `state`.
async function waitForPipeRowText(page, rowIndex, substring, timeoutMs, description) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const text = await page.evaluate(
      (index) => document.getElementById('xrayPipeRow' + index).textContent, rowIndex);
    if (text.includes(substring)) return text;
    await page.waitForTimeout(25);
  }
  const text = await page.evaluate(
    (index) => document.getElementById('xrayPipeRow' + index).textContent, rowIndex);
  throw new Error('Timed out waiting for ' + description + '. Last text: "' + text + '"');
}

// Watches, from inside the page via requestAnimationFrame (so no update can
// land between round trips unseen), for `xrayMemory.updatesRun` to change,
// then reports that pipe row's text and class on the exact frame it changed.
async function watchPipeRowThroughNextUpdate(page, rowIndex) {
  return page.evaluate((index) => new Promise((resolve, reject) => {
    const updatesRunBefore = xrayMemory.updatesRun;
    let framesWaited = 0;
    function checkNextFrame() {
      framesWaited += 1;
      if (xrayMemory.updatesRun !== updatesRunBefore) {
        const row = document.getElementById('xrayPipeRow' + index);
        resolve({ text: row.textContent, className: row.className });
        return;
      }
      if (framesWaited > 120) {
        reject(new Error('xrayMemory.updatesRun never changed within 120 animation frames'));
        return;
      }
      requestAnimationFrame(checkNextFrame);
    }
    requestAnimationFrame(checkNextFrame);
  }), rowIndex);
}

// Clicks one of the "ask an AI" buttons and, inside one synchronous page
// turn so no animation frame can land between "what the panel showed" and
// "what got copied", captures the pipe rows at the moment of the click
// alongside the button's result.
async function clickAskButton(page, buttonId) {
  return page.evaluate((id) => {
    const pipeRowsAtClick = Array.from(document.querySelectorAll('#xrayPipe li'))
      .map((row) => row.textContent);
    document.getElementById(id).click();
    return {
      pipeRowsAtClick,
      promptText: document.getElementById('xrayAskText').value,
      statusText: document.getElementById('xrayAskStatus').textContent,
      activeElementTag: document.activeElement.tagName,
    };
  }, buttonId);
}

// ------------------------------------------------------------------
// Pathfinding: BFS over the current map's tile grid, using the same
// walkability rule as the game's own COLLIDE section (canWalkTo).
// ------------------------------------------------------------------

// `gates` carries the two tiles whose answer depends on state, so this
// mirror of COLLIDE stays honest: { bridgeBuilt, forestGateOpen }.
function isWalkableTile(rows, tileTypes, npcList, mapName, gates, x, y) {
  if (y < 0 || y >= rows.length) return false;
  if (x < 0 || x >= rows[0].length) return false;
  for (const npc of npcList) {
    if (npc.map === mapName && npc.tileX === x && npc.tileY === y) return false;
  }
  const tileCharacter = rows[y][x];
  if (tileCharacter === 'B') return gates.bridgeBuilt;
  if (tileCharacter === 'G') return gates.forestGateOpen;
  const tileType = tileTypes[tileCharacter];
  return tileType !== undefined && tileType.walkable;
}

// Returns an array of steps [{ x, y, direction }, ...] from start to goal,
// excluding the start tile itself, or null if no path exists.
function findPath(rows, tileTypes, npcList, mapName, gates, start, goal) {
  const visited = new Set([start.x + ',' + start.y]);
  const cameFrom = new Map();
  const queue = [start];
  const directionSteps = [
    { dx: 0, dy: -1, direction: 'up' },
    { dx: 0, dy: 1, direction: 'down' },
    { dx: -1, dy: 0, direction: 'left' },
    { dx: 1, dy: 0, direction: 'right' },
  ];

  while (queue.length > 0) {
    const current = queue.shift();
    if (current.x === goal.x && current.y === goal.y) {
      const path = [];
      let node = current;
      while (node.x !== start.x || node.y !== start.y) {
        path.unshift(node);
        node = cameFrom.get(node.x + ',' + node.y);
      }
      return path;
    }
    for (const step of directionSteps) {
      const nextX = current.x + step.dx;
      const nextY = current.y + step.dy;
      const key = nextX + ',' + nextY;
      if (visited.has(key)) continue;
      if (!isWalkableTile(rows, tileTypes, npcList, mapName, gates, nextX, nextY)) continue;
      visited.add(key);
      cameFrom.set(key, current);
      queue.push({ x: nextX, y: nextY, direction: step.direction });
    }
  }
  return null;
}

// ------------------------------------------------------------------
// Movement: convert a path into key presses, and confirm each step lands.
// ------------------------------------------------------------------

// Presses one direction until the player arrives at (expectedX, expectedY),
// or the map changes (a door was stepped on). Retries the tap because the
// game's per-tile movement cooldown can swallow a tap sent too soon after
// the previous step.
async function moveOneStep(page, direction, expectedX, expectedY, startMapName) {
  const key = arrowKeyForDirection[direction];
  const deadline = Date.now() + 2000;
  while (Date.now() < deadline) {
    await tapKey(page, key);
    await page.waitForTimeout(35);
    const state = await getState(page);
    if (state.currentMap !== startMapName) return; // stepped through a door
    if (state.player.tileX === expectedX && state.player.tileY === expectedY) return;
  }
  const state = await getState(page);
  throw new Error('Timed out moving ' + direction + ' toward (' + expectedX + ',' +
    expectedY + '); player is at (' + state.player.tileX + ',' + state.player.tileY +
    ') on map "' + state.currentMap + '"');
}

// Faces the player a given direction without necessarily moving (used to
// turn toward a blocked NPC). Movement is gated by the same per-tile
// cooldown as an actual step, so a tap sent right after arriving can be
// dropped; retry until `player.facing` matches.
async function faceDirection(page, direction) {
  const key = arrowKeyForDirection[direction];
  const deadline = Date.now() + 2000;
  while (Date.now() < deadline) {
    await tapKey(page, key);
    await page.waitForTimeout(35);
    const state = await getState(page);
    if (state.player.facing === direction) return;
  }
  const state = await getState(page);
  throw new Error('Timed out facing ' + direction + '; player is still facing "' +
    state.player.facing + '"');
}

async function walkPath(page, path, startMapName) {
  let currentMapName = startMapName;
  for (const step of path) {
    await moveOneStep(page, step.direction, step.x, step.y, currentMapName);
    const state = await getState(page);
    currentMapName = state.currentMap;
  }
}

// Walks the player from its current tile to (targetX, targetY) on the map
// it is currently on, using a freshly-computed BFS path.
async function walkTo(page, world, targetX, targetY) {
  const state = await getState(page);
  const mapName = state.currentMap;
  const rows = world.maps[mapName].rows;
  const start = { x: state.player.tileX, y: state.player.tileY };
  const goal = { x: targetX, y: targetY };
  const gates = {
    bridgeBuilt: state.flags.bridgeBuilt,
    forestGateOpen: state.flags.healerHelped && state.flags.bridgeBuilt && state.flags.elderLit,
  };
  const path = findPath(rows, world.tileTypes, world.npcs, mapName, gates, start, goal);
  if (path === null) {
    throw new Error('No path from (' + start.x + ',' + start.y + ') to (' +
      targetX + ',' + targetY + ') on map "' + mapName + '"');
  }
  await walkPath(page, path, mapName);
}

// ------------------------------------------------------------------
// Talking: face an NPC, open dialogue, drive choices, confirm a flag.
// ------------------------------------------------------------------

// Finds a walkable tile next to the NPC to approach from, and which
// direction to face once standing there.
function findApproachTile(npc, rows, tileTypes) {
  const candidates = [
    { dx: -1, dy: 0, faceDirection: 'right' },
    { dx: 1, dy: 0, faceDirection: 'left' },
    { dx: 0, dy: -1, faceDirection: 'down' },
    { dx: 0, dy: 1, faceDirection: 'up' },
  ];
  for (const candidate of candidates) {
    const x = npc.tileX + candidate.dx;
    const y = npc.tileY + candidate.dy;
    if (y < 0 || y >= rows.length || x < 0 || x >= rows[0].length) continue;
    const tileType = tileTypes[rows[y][x]];
    if (tileType !== undefined && tileType.walkable) {
      return { x, y, faceDirection: candidate.faceDirection };
    }
  }
  return null;
}

// Moves the dialogue's highlighted choice from `currentIndex` to
// `targetIndex` with Up/Down taps, one tap per step of distance.
async function selectDialogueChoice(page, currentIndex, targetIndex) {
  while (currentIndex !== targetIndex) {
    if (targetIndex > currentIndex) {
      await tapKey(page, 'ArrowDown');
      currentIndex += 1;
    } else {
      await tapKey(page, 'ArrowUp');
      currentIndex -= 1;
    }
    await page.waitForTimeout(35);
  }
}

// Drives an open dialogue to its end: whenever the current node offers a
// choice that hands over an item, select it; otherwise just continue.
async function driveDialogueToEnd(page, npcStatic) {
  while (true) {
    const state = await getState(page);
    if (state.dialogue === null) return;
    const node = npcStatic.dialogue[state.dialogue.nodeKey];
    const givesItemIndex = node.choices.findIndex((choice) => choice.givesItems);
    if (givesItemIndex !== -1) {
      await selectDialogueChoice(page, state.dialogue.choiceIndex, givesItemIndex);
    }
    await tapKey(page, 'Space');
    await page.waitForTimeout(35);
  }
}

// Full "walk up, face them, talk, hand over the item" sequence for one NPC.
// Asserts the NPC's quest flag is true once the conversation ends.
async function talkAndGiveItem(page, world, npcId) {
  const npcStatic = world.npcs.find((npc) => npc.id === npcId);
  const rows = world.maps[npcStatic.map].rows;
  const approach = findApproachTile(npcStatic, rows, world.tileTypes);
  if (approach === null) {
    throw new Error('No walkable tile next to NPC "' + npcId + '" to approach from');
  }
  await walkTo(page, world, approach.x, approach.y);
  await faceDirection(page, approach.faceDirection);

  await tapKey(page, 'Space');
  await waitForCondition(page, (s) => s.dialogue !== null, 1000,
    'dialogue to open when talking to "' + npcId + '"');

  await driveDialogueToEnd(page, npcStatic);

  const finalState = await getState(page);
  if (!finalState.flags[npcStatic.setsFlag]) {
    throw new Error('Expected flag "' + npcStatic.setsFlag + '" to be true after ' +
      'talking to "' + npcId + '", but it is ' + finalState.flags[npcStatic.setsFlag]);
  }
  return finalState;
}

// ------------------------------------------------------------------
// The playthrough itself
// ------------------------------------------------------------------

function assertTrue(condition, message) {
  if (!condition) throw new Error('Assertion failed: ' + message);
}

function findItem(world, itemId) {
  return world.items.find((item) => item.id === itemId);
}

function findDoor(world, fromMap, toMap) {
  return world.doors.find((door) => door.fromMap === fromMap && door.toMap === toMap);
}

// On a completely fresh load: holding a direction key moves more than one
// tile (proves held-key walking, not just single taps), and talking to
// nobody does nothing and throws no error.
async function checkFreshLoadBasics(page) {
  const before = await getState(page);
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(500);
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(50);
  const afterHold = await getState(page);
  const tilesMoved = afterHold.player.tileX - before.player.tileX;
  assertTrue(tilesMoved > 1,
    'holding ArrowRight for 500ms should move more than one tile, moved ' + tilesMoved);
  console.log('PASS — held ArrowRight for 500ms moved ' + tilesMoved + ' tiles');

  await tapKey(page, 'Space');
  await page.waitForTimeout(80);
  const afterSpace = await getState(page);
  assertTrue(afterSpace.dialogue === null,
    'pressing Space facing nobody should not open a dialogue');
  console.log('PASS — pressing Space facing nobody opened no dialogue and threw nothing');
}

async function runPlaythrough(page) {
  const world = await getWorld(page);

  await checkFreshLoadBasics(page);
  await checkForestGateIsShutOnAFreshLoad(page, world);

  const herb = findItem(world, 'herb');
  await walkTo(page, world, herb.tileX, herb.tileY);
  let state = await getState(page);
  assertTrue(state.inventory.includes('herb'), 'expected herb in inventory after walking over it');
  console.log('PASS — picked up herb at (' + herb.tileX + ',' + herb.tileY + ')');

  const plank = findItem(world, 'plank');
  await walkTo(page, world, plank.tileX, plank.tileY);
  state = await getState(page);
  assertTrue(state.inventory.includes('plank'), 'expected plank in inventory after walking over it');
  console.log('PASS — picked up plank at (' + plank.tileX + ',' + plank.tileY + ')');

  await talkAndGiveItem(page, world, 'mira');
  console.log('PASS — gave herb to Mira, flag healerHelped is true');

  await talkAndGiveItem(page, world, 'bram');
  console.log('PASS — gave plank to Bram, flag bridgeBuilt is true');

  // The bridge (row 14, columns 26-27) is the only crossing over the river.
  // Walking to a tile just past it proves the bridge is now walkable.
  await walkTo(page, world, 28, 14);
  state = await getState(page);
  assertTrue(state.player.tileX >= 28, 'expected to have crossed the bridge to the east bank');
  console.log('PASS — crossed the bridge to the east bank');

  const lantern = findItem(world, 'lantern');
  await walkTo(page, world, lantern.tileX, lantern.tileY);
  state = await getState(page);
  assertTrue(state.inventory.includes('lantern'), 'expected lantern in inventory after walking over it');
  console.log('PASS — picked up lantern at (' + lantern.tileX + ',' + lantern.tileY + ')');

  const houseDoor = findDoor(world, 'overworld', 'house');
  await walkTo(page, world, houseDoor.fromX, houseDoor.fromY);
  state = await getState(page);
  assertTrue(state.currentMap === 'house',
    'expected to be in "house" after stepping on the door tile, got "' + state.currentMap + '"');
  console.log('PASS — stepped through the door into the house');

  await talkAndGiveItem(page, world, 'oswin');
  console.log('PASS — gave lantern to Oswin, flag elderLit is true');

  const crown = findItem(world, 'crown');
  await walkTo(page, world, crown.tileX, crown.tileY);
  state = await getState(page);
  assertTrue(state.inventory.includes('crown'), 'expected crown in inventory after walking over it');
  console.log('PASS — picked up crown at (' + crown.tileX + ',' + crown.tileY + ')');

  const stateBeforeSave = await getState(page);
  await tapKey(page, 'k');
  await page.waitForTimeout(80);
  const savedText = await page.evaluate((slot) => localStorage.getItem(slot), world.saveSlotName);
  assertTrue(savedText !== null, 'expected a save under localStorage key "' + world.saveSlotName + '"');
  console.log('PASS — K saved the game to localStorage');

  await page.reload();
  await waitForCanvasReady(page);
  state = await getState(page);
  assertTrue(state.flags.healerHelped && state.flags.bridgeBuilt && state.flags.elderLit,
    'expected all three flags true after reload, got ' + JSON.stringify(state.flags));
  assertTrue(state.currentMap === 'house', 'expected currentMap "house" after reload, got "' +
    state.currentMap + '"');
  assertTrue(state.inventory.includes('crown'), 'expected crown still in inventory after reload');
  assertTrue(state.player.tileX === stateBeforeSave.player.tileX &&
    state.player.tileY === stateBeforeSave.player.tileY,
    'expected player at saved tile (' + stateBeforeSave.player.tileX + ',' +
    stateBeforeSave.player.tileY + ') after reload, got (' + state.player.tileX + ',' +
    state.player.tileY + ')');
  console.log('PASS — reload restored map, flags, inventory and player position from the save');

  await runLevelTwoChecks(page, world);

  const navigationAfterN = page.waitForNavigation({ waitUntil: 'load' }).catch(() => {});
  await tapKey(page, 'n');
  await navigationAfterN;
  await waitForCanvasReady(page);
  state = await getState(page);
  assertTrue(!state.flags.healerHelped && !state.flags.bridgeBuilt && !state.flags.elderLit,
    'expected all flags false after N (new game), got ' + JSON.stringify(state.flags));
  assertTrue(state.player.tileX === 3 && state.player.tileY === 14,
    'expected player back at (3,14) after N (new game), got (' + state.player.tileX + ',' +
    state.player.tileY + ')');
  console.log('PASS — N deleted the save and reset the game to its starting state');

  await runXrayChecks(page, world);
}

// ------------------------------------------------------------------
// X-RAY: the v1.1/v1.2 panel, its open/closed memory, pause/step, the
// v1.3 pipe diagram, the v1.3 "ask an AI" buttons, and the v1.4 details —
// the keyboard row naming a skipped key, the state row's tense, the
// textarea's hidden/visible moments, and the panel's own hint text. Section
// 11 in game.html; keys X, P and "." on their own listener, separate from
// the game's own INPUT section.
// ------------------------------------------------------------------

// (v1.1) X shows the panel; X again hides it. Starts hidden on this fresh
// (post-N) load because nothing has set the localStorage key yet.
async function checkXrayToggle(page) {
  assertTrue(await isXrayPanelHidden(page) === true,
    'expected the X-ray panel hidden before pressing X for the first time');

  await tapKey(page, 'x');
  await page.waitForTimeout(50);
  assertTrue(await isXrayPanelHidden(page) === false, 'expected X to show the X-ray panel');
  console.log('PASS — X showed the X-ray panel');

  await tapKey(page, 'x');
  await page.waitForTimeout(50);
  assertTrue(await isXrayPanelHidden(page) === true, 'expected X to hide the X-ray panel again');
  console.log('PASS — X hid the X-ray panel again');
}

// (v1.1) The open/closed choice survives F5, via localStorage key
// "open-world-how-to-xray-open" — open it, reload, still open; close it,
// reload, still closed.
async function checkXrayOpenStateSurvivesReload(page, world) {
  await tapKey(page, 'x');
  await page.waitForTimeout(50);
  const storedWhileOpen = await page.evaluate(
    (key) => localStorage.getItem(key), world.xrayStorageKey);
  assertTrue(storedWhileOpen === 'true',
    'expected localStorage["' + world.xrayStorageKey + '"] === "true" once open, got ' +
    JSON.stringify(storedWhileOpen));

  await page.reload();
  await waitForCanvasReady(page);
  assertTrue(await isXrayPanelHidden(page) === false,
    'expected the X-ray panel to still be open after a reload');
  console.log('PASS — the X-ray panel stayed open across a reload (localStorage["' +
    world.xrayStorageKey + '"])');

  await tapKey(page, 'x');
  await page.waitForTimeout(50);
  await page.reload();
  await waitForCanvasReady(page);
  assertTrue(await isXrayPanelHidden(page) === true,
    'expected the X-ray panel to still be closed after a reload');
  console.log('PASS — the X-ray panel stayed closed across a reload');
}

// (v1.2) With the panel open, P freezes UPDATE (updates run holds still,
// the player does not move even with a direction key held) while RENDER
// keeps going (frames drawn keeps rising).
async function checkPauseFreezesUpdateNotRender(page) {
  await tapKey(page, 'x'); // open the panel
  await page.waitForTimeout(50);
  await tapKey(page, 'p'); // pause
  await page.waitForTimeout(50);
  const before = await getXrayLoopCounters(page);
  assertTrue(before.paused === true, 'expected clock: PAUSED after pressing P');
  const stateBefore = await getState(page);

  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(500);
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(50);

  const after = await getXrayLoopCounters(page);
  const stateAfter = await getState(page);

  assertTrue(after.updatesRun === before.updatesRun,
    'expected "updates run" to stay at ' + before.updatesRun + ' while paused, got ' +
    after.updatesRun);
  assertTrue(after.framesDrawn > before.framesDrawn,
    'expected "frames drawn" to keep rising while paused (RENDER keeps running), stayed at ' +
    before.framesDrawn);
  assertTrue(stateAfter.player.tileX === stateBefore.player.tileX &&
    stateAfter.player.tileY === stateBefore.player.tileY,
    'expected the player not to move while paused with ArrowRight held, moved from (' +
    stateBefore.player.tileX + ',' + stateBefore.player.tileY + ') to (' +
    stateAfter.player.tileX + ',' + stateAfter.player.tileY + ')');
  console.log('PASS — P paused the world: "updates run" held at ' + before.updatesRun +
    ' and the player did not move, while "frames drawn" kept rising to ' + after.framesDrawn);
}

// (v1.2) P again resumes with no burst of catch-up ticks: the jump in
// "updates run" right after resuming is a couple of ticks, not the dozens
// that would have piled up while paused; after that it climbs near the
// normal 60/sec rate.
async function checkResumeHasNoCatchUpBurst(page) {
  const before = await getXrayLoopCounters(page);
  assertTrue(before.paused === true, 'expected the game to still be paused going into resume');

  await tapKey(page, 'p'); // resume
  await page.waitForTimeout(50); // a few frames' worth
  const justAfter = await getXrayLoopCounters(page);
  const immediateJump = justAfter.updatesRun - before.updatesRun;
  assertTrue(immediateJump >= 0 && immediateJump <= 10,
    'expected a small jump in "updates run" right after resuming (a couple of ticks), got ' +
    immediateJump);

  await page.waitForTimeout(450); // ~500ms total since resume
  const halfSecondLater = await getXrayLoopCounters(page);
  const riseOverHalfSecond = halfSecondLater.updatesRun - before.updatesRun;
  assertTrue(riseOverHalfSecond > 15 && riseOverHalfSecond < 60,
    'expected "updates run" to climb near 60/sec after resuming (~30 over 500ms), rose by ' +
    riseOverHalfSecond);
  console.log('PASS — P resumed with no catch-up burst (jumped by only ' + immediateJump +
    ' right after resume, then climbed by ' + riseOverHalfSecond + ' over the next ~500ms)');
}

// (v1.2) While paused, "." runs exactly one update: "updates run" rises
// by exactly 1, then holds there.
async function checkSingleStepAdvancesExactlyOne(page) {
  await tapKey(page, 'p'); // pause again
  await page.waitForTimeout(50);
  const before = await getXrayLoopCounters(page);
  assertTrue(before.paused === true, 'expected clock: PAUSED before single-stepping');

  await tapKey(page, '.');
  await page.waitForTimeout(50);
  const afterStep = await getXrayLoopCounters(page);
  assertTrue(afterStep.updatesRun === before.updatesRun + 1,
    'expected "." to advance "updates run" by exactly 1 from ' + before.updatesRun + ', got ' +
    afterStep.updatesRun);

  await page.waitForTimeout(150); // confirm it does not keep ticking
  const settled = await getXrayLoopCounters(page);
  assertTrue(settled.updatesRun === afterStep.updatesRun,
    'expected "updates run" to hold at ' + afterStep.updatesRun +
    ' after the single step, moved to ' + settled.updatesRun);
  console.log('PASS — "." advanced "updates run" by exactly 1 (from ' + before.updatesRun +
    ' to ' + afterStep.updatesRun + ') and the world stayed paused afterward');
}

// (v1.2) X pressed while paused hides the panel AND resumes the game —
// it must never leave the game frozen with no panel open to explain why.
async function checkClosingPanelWhilePausedResumesGame(page) {
  assertTrue(await isXrayPanelHidden(page) === false, 'expected the panel open going into this check');
  await tapKey(page, 'x');
  await page.waitForTimeout(50);
  assertTrue(await isXrayPanelHidden(page) === true,
    'expected X to hide the X-ray panel while paused');
  console.log('PASS — X pressed while paused hid the X-ray panel');
}

// (v1.2) P and "." do nothing while the panel is hidden — proven two ways
// at once: pressing them has no visible effect, and holding a direction
// key still moves the player, which also confirms X (above) really did
// resume the game rather than leaving it frozen.
async function checkPauseKeysInertWithPanelHidden(page) {
  assertTrue(await isXrayPanelHidden(page) === true, 'expected the panel hidden for this check');
  const before = await getState(page);

  await tapKey(page, 'p');
  await tapKey(page, '.');
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(500);
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(50);

  const after = await getState(page);
  const tilesMoved = after.player.tileX - before.player.tileX;
  assertTrue(tilesMoved > 1,
    'expected the player to move normally with the panel hidden (P and "." should do ' +
    'nothing, and the earlier X should have resumed the game), moved ' + tilesMoved + ' tiles');
  console.log('PASS — P and "." had no effect with the panel hidden, and the player moved ' +
    tilesMoved + ' tiles, confirming X had already resumed the game');
}

// (v1.2) Pause does not survive a reload (only panel-open/closed does):
// pause, reload, and confirm the game is running again.
async function checkPauseDoesNotSurviveReload(page) {
  await tapKey(page, 'x'); // reopen the panel
  await page.waitForTimeout(50);
  await tapKey(page, 'p'); // pause
  await page.waitForTimeout(50);
  assertTrue((await getXrayLoopCounters(page)).paused === true,
    'expected clock: PAUSED before reloading');

  await page.reload();
  await waitForCanvasReady(page);
  await page.waitForTimeout(50);

  assertTrue(await isXrayPanelHidden(page) === false,
    'expected the (separately-persisted) panel-open choice to still be open after reload');
  const loopAfterReload = await getXrayLoopCounters(page);
  assertTrue(loopAfterReload.paused === false,
    'expected clock: running (not PAUSED) after reload, but the panel still showed paused');

  const beforeMove = await getState(page);
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(500);
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(50);
  const afterMove = await getState(page);
  const tilesMoved = afterMove.player.tileX - beforeMove.player.tileX;
  assertTrue(tilesMoved > 1,
    'expected the game running (not paused) after reload, player moved ' + tilesMoved + ' tiles');
  console.log('PASS — pause did not survive a reload; the game was running again after F5 ' +
    '(player moved ' + tilesMoved + ' tiles)');
}

// (v1.3) The pipe diagram has exactly seven rows, one per stage of the
// sentence in the section-11 banner, in that order.
async function checkPipeDiagramShape(page) {
  const rows = await getPipeRows(page);
  assertTrue(rows.length === 7,
    'expected the pipe diagram to have exactly 7 rows, found ' + rows.length);
  for (let index = 0; index < xrayPipeStageLabels.length; index++) {
    assertTrue(rows[index].id === 'xrayPipeRow' + index,
      'expected row ' + index + ' to have id "xrayPipeRow' + index + '", got "' +
      rows[index].id + '"');
    const label = rows[index].text.slice(2, 14).trimEnd();
    assertTrue(label === xrayPipeStageLabels[index],
      'expected row ' + index + ' to show stage "' + xrayPipeStageLabels[index] + '", got "' +
      label + '"');
  }
  console.log('PASS — the pipe diagram has exactly 7 rows, in order: ' +
    xrayPipeStageLabels.join(' → '));
}

// (v1.4) The two hints that explain how to read the panel say what the panel
// actually does: the "5 · UPDATE" hint names the two quiet fields it leaves
// out of the change log (xrayQuietFields in game.html), and the "one
// picture" hint at the top tells you to hold an arrow key, the one gesture
// that lights every row in turn. Pure markup, no key presses, so this can
// run at any point in the phase.
async function checkXrayHintsNameQuietFieldsAndHoldKey(page) {
  const hintTextByHeading = await page.evaluate(() => {
    const result = {};
    for (const section of document.querySelectorAll('#xray > section')) {
      const heading = section.querySelector('h3');
      const hint = section.querySelector('p.hint');
      if (heading !== null && hint !== null) result[heading.textContent] = hint.textContent;
    }
    return result;
  });

  const updateHint = hintTextByHeading['5 · UPDATE — what changed in state'];
  assertTrue(updateHint !== undefined,
    'expected a p.hint under the "5 · UPDATE — what changed in state" heading');
  assertTrue(updateHint.includes('stepCooldown') && updateHint.includes('notice.secondsLeft'),
    'expected the "5 · UPDATE" hint to name both quiet fields, got "' + updateHint + '"');
  console.log('PASS — the "5 · UPDATE" hint names the two quiet fields it leaves out, ' +
    'stepCooldown and notice.secondsLeft');

  const pictureHint = hintTextByHeading['the whole file, as one picture'];
  assertTrue(pictureHint !== undefined,
    'expected a p.hint under the "the whole file, as one picture" heading');
  assertTrue(pictureHint.includes('Hold an arrow key'),
    'expected the "one picture" hint to say to hold an arrow key, got "' + pictureHint + '"');
  console.log('PASS — the "the whole file, as one picture" hint tells you to hold an arrow key');
}

// (v1.4) The "keyboard" row (row 0) knows the difference between a game key
// and one of the X-ray's own: X, P and "." never reach INPUT, so naming one
// there says so instead of pretending it went down the pipe. Pressing P
// pauses the game (not a game key, no intent held, so the row stays dim);
// a real game key afterward goes right back to naming it plainly.
async function checkKeyboardRowNamesSkippedKeys(page) {
  await tapKey(page, 'p'); // pauses; P is a panel key, not a game key
  await page.waitForTimeout(50);
  assertTrue((await getXrayLoopCounters(page)).paused === true,
    'expected P to pause the game going into this check');

  const afterP = await getPipeRows(page);
  assertTrue(afterP[0].text.includes('not a game key, INPUT skips it'),
    'expected the "keyboard" row to name P as skipped by INPUT, got "' + afterP[0].text + '"');
  assertTrue(afterP[0].text.startsWith('│ '),
    'expected the "keyboard" row to stay dim ("│ ") since no game intent is held, got "' +
    afterP[0].text + '"');
  console.log('PASS — pressing P (a panel key) left the "keyboard" row dim and named as ' +
    'skipped by INPUT');

  await tapKey(page, 'ArrowRight');
  await page.waitForTimeout(50);
  const afterArrow = await getPipeRows(page);
  assertTrue(afterArrow[0].text.includes('last key you pressed: arrowright'),
    'expected the "keyboard" row to name arrowright plainly, got "' + afterArrow[0].text + '"');
  console.log('PASS — a real game key right after went back to naming it plainly');

  await tapKey(page, 'p'); // resume, so the next check finds the game running
  await page.waitForTimeout(50);
}

// (v1.3) Holding ArrowRight lights the keyboard/INPUT/intents rows (▶ and
// class "on") and names the key and the intent it set; releasing it dims
// them again (│, no class). The player only steps every few ticks, so this
// does not check the "3 · state" row on any particular frame — it walks a
// few tiles and then checks that row mentions the field that changed.
async function checkArrowRightLightsPipeRows(page) {
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(100);
  const whileHeld = await getPipeRows(page);
  for (let index = 0; index < 3; index++) {
    assertTrue(whileHeld[index].text.startsWith('▶ '),
      'expected row ' + index + ' to start with "▶ " while ArrowRight is held, got "' +
      whileHeld[index].text + '"');
    assertTrue(whileHeld[index].className === 'on',
      'expected row ' + index + ' to have class "on" while ArrowRight is held, got "' +
      whileHeld[index].className + '"');
  }
  assertTrue(whileHeld[0].text.includes('arrowright'),
    'expected the "keyboard" row to name the key, got "' + whileHeld[0].text + '"');
  assertTrue(whileHeld[2].text.includes('moveRight'),
    'expected the "intents" row to name moveRight, got "' + whileHeld[2].text + '"');
  console.log('PASS — holding ArrowRight lit the keyboard/INPUT/intents rows and named the ' +
    'key and moveRight');

  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(100);
  const afterRelease = await getPipeRows(page);
  for (let index = 0; index < 3; index++) {
    assertTrue(afterRelease[index].text.startsWith('│ '),
      'expected row ' + index + ' to start with "│ " once ArrowRight is released, got "' +
      afterRelease[index].text + '"');
    assertTrue(afterRelease[index].className === '',
      'expected row ' + index + ' to have no class once ArrowRight is released, got "' +
      afterRelease[index].className + '"');
  }
  console.log('PASS — releasing ArrowRight dimmed the keyboard/INPUT/intents rows again');

  for (let step = 0; step < 4; step++) {
    await tapKey(page, 'ArrowRight');
    await page.waitForTimeout(80);
  }
  await waitForPipeRowText(page, 4, 'player.tileX', 2000,
    'the "3 · state" row to mention player.tileX after walking a few tiles');
  console.log('PASS — after walking a few tiles, the "3 · state" row named player.tileX');
}

// (v1.4) The "3 · state" row carries tense, not just a value: "this frame:
// #" the tick a step actually lands, "timers only, last #" the ticks
// between (only the quiet step cooldown moved), and "no change, last #"
// once movement stops and that cooldown itself settles at zero. Holding a
// key crosses the first two; sampling repeatedly is the only way to catch
// both, since a single read lands on whichever tense the frame happens to
// be in.
async function checkStateRowTracksChangeTense(page) {
  await page.keyboard.down('ArrowRight');
  const samples = [];
  for (let sampleIndex = 0; sampleIndex < 20; sampleIndex++) {
    const rows = await getPipeRows(page);
    samples.push(rows[4].text);
    await page.waitForTimeout(15);
  }
  await page.keyboard.up('ArrowRight');

  assertTrue(samples.some((text) => text.includes('this frame: #')),
    'expected at least one sample of the "3 · state" row to read "this frame: #" while ' +
    'ArrowRight was held');
  assertTrue(samples.some((text) => text.includes('timers only, last #')),
    'expected at least one sample of the "3 · state" row to read "timers only, last #" while ' +
    'ArrowRight was held');
  for (const text of samples) {
    assertTrue(text.includes('player.tileX'),
      'expected every sampled "3 · state" row to mention player.tileX, got "' + text + '"');
  }
  console.log('PASS — while ArrowRight was held, the "3 · state" row cycled through "this ' +
    'frame: #" and "timers only, last #", every sample naming player.tileX');

  await page.waitForTimeout(400); // the step cooldown finishes ticking down
  const settled = await getPipeRows(page);
  assertTrue(settled[4].text.includes('no change, last #'),
    'expected the "3 · state" row to read "no change, last #" once movement and its step ' +
    'cooldown settle, got "' + settled[4].text + '"');
  assertTrue(settled[4].text.includes('player.tileX'),
    'expected the settled "3 · state" row to still name player.tileX, got "' +
    settled[4].text + '"');
  console.log('PASS — once ArrowRight was released and the step cooldown finished, the "3 · ' +
    'state" row read "no change, last #" and still named player.tileX');
}

// (v1.3) While paused, the "5 · UPDATE" row says PAUSED; pressing "." for
// one step lights that same row (▶, class "on") on the exact frame the
// step runs, and it goes back to reading PAUSED once that frame passes.
async function checkPipeUpdateRowShowsPauseAndStep(page) {
  await tapKey(page, 'p'); // pause
  await page.waitForTimeout(50);
  const paused = await getPipeRows(page);
  assertTrue(paused[3].text.includes('PAUSED'),
    'expected the "5 · UPDATE" row to say PAUSED, got "' + paused[3].text + '"');
  console.log('PASS — while paused, the "5 · UPDATE" row said PAUSED');

  const stepWatch = watchPipeRowThroughNextUpdate(page, 3);
  await tapKey(page, '.');
  const stepped = await stepWatch;
  assertTrue(stepped.text.startsWith('▶ '),
    'expected the "5 · UPDATE" row to start with "▶ " on the frame the step ran, got "' +
    stepped.text + '"');
  assertTrue(stepped.className === 'on',
    'expected the "5 · UPDATE" row to have class "on" on the frame the step ran, got "' +
    stepped.className + '"');
  console.log('PASS — pressing "." lit the "5 · UPDATE" row on the exact frame the step ran');

  await page.waitForTimeout(50);
  const settled = await getPipeRows(page);
  assertTrue(settled[3].text.includes('PAUSED'),
    'expected the "5 · UPDATE" row to read PAUSED again once the step frame passed, got "' +
    settled[3].text + '"');
  console.log('PASS — the "5 · UPDATE" row went back to PAUSED once the step frame passed');
}

// (v1.4) The "ask an AI" textarea starts hidden and stays that way until the
// first click of a fresh page load copies something into it — checked here
// with an actual reload, since once this same run clicks a button below,
// there is no "before any click" moment left to check. (The other half —
// hidden becoming false — is checked right after checkAskExplainButton
// below, which does that first click.)
async function checkAskTextareaHiddenOnFreshLoad(page) {
  await page.reload();
  await waitForCanvasReady(page);
  assertTrue(await isXrayPanelHidden(page) === false,
    'expected the panel-open choice to survive the reload (localStorage)');

  const hiddenBeforeAnyClick = await page.evaluate(
    () => document.getElementById('xrayAskText').hidden);
  assertTrue(hiddenBeforeAnyClick === true,
    'expected the "ask an AI" textarea hidden on a fresh load, before either button has ' +
    'ever been clicked');
  console.log('PASS — the "ask an AI" textarea started hidden on this fresh page load');

  // Pause does not survive a reload; re-pause here so the very next check
  // (checkAskExplainButton) finds the game exactly as it expects to: open
  // and paused, ready for its own "resume, then walk" proof.
  await tapKey(page, 'p');
  await page.waitForTimeout(50);
  assertTrue((await getXrayLoopCounters(page)).paused === true,
    'expected to leave the game paused for the next check to resume');
}

// (v1.3) Clicking "copy: explain this frame" fills the textarea with a
// prompt built from exactly what the panel is showing right now: the pipe
// sentence, all seven pipe rows, the live player.tileX value, and the
// instruction text — and hands the keyboard back to the game afterward.
async function checkAskExplainButton(page) {
  // The previous check left the game paused; resume it, because proving
  // the keyboard still works after copying means actually walking.
  await tapKey(page, 'p');
  await page.waitForTimeout(50);

  const stateAtClick = await getState(page);
  const result = await clickAskButton(page, 'xrayAskExplain');

  assertTrue(result.promptText.includes(
    'keyboard -> INPUT -> intents -> UPDATE -> state -> RENDER -> screen'),
    'expected the explain prompt to include the pipe sentence');
  for (const rowText of result.pipeRowsAtClick) {
    assertTrue(result.promptText.includes(rowText),
      'expected the explain prompt to include the pipe row: "' + rowText + '"');
  }
  assertTrue(result.promptText.includes('"tileX": ' + stateAtClick.player.tileX),
    'expected the explain prompt to include the live player.tileX value (' +
    stateAtClick.player.tileX + ')');
  assertTrue(result.promptText.includes(
    'Walk me through that one frame, one stage of the arrow at a time.'),
    'expected the explain prompt to include the walk-through instruction');
  console.log('PASS — "copy: explain this frame" filled the textarea with the pipe sentence, ' +
    'all seven pipe rows, the live player.tileX, and the instruction text');

  assertTrue(result.statusText === 'Copied. Paste it into any AI chat.',
    'expected the status line to report a successful copy, got "' + result.statusText + '"');
  console.log('PASS — the status line reported the copy');

  assertTrue(result.activeElementTag === 'BODY',
    'expected focus to return to <body> after copying, activeElement is <' +
    result.activeElementTag + '>');
  const beforeWalk = await getState(page);
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(300);
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(50);
  const afterWalk = await getState(page);
  const tilesMoved = afterWalk.player.tileX - beforeWalk.player.tileX;
  assertTrue(tilesMoved > 0,
    'expected the game to still take keyboard input after copying, walked ' + tilesMoved +
    ' tile(s) east');
  console.log('PASS — focus returned to <body>, so the game still took keyboard input, ' +
    'walking ' + tilesMoved + ' tile(s) east');
}

// (v1.4) ...and the payoff half of the check above: once
// checkAskExplainButton's click has actually fired, the textarea must have
// un-hidden itself.
async function checkAskTextareaVisibleAfterFirstClick(page) {
  const hiddenAfterClick = await page.evaluate(
    () => document.getElementById('xrayAskText').hidden);
  assertTrue(hiddenAfterClick === false,
    'expected the "ask an AI" textarea visible (hidden === false) right after a click');
  console.log('PASS — the "ask an AI" textarea became visible right after the first click');
}

// (v1.3) Clicking "copy: draw this frame" replaces the textarea with a
// different prompt that also carries all seven pipe rows, but asks for a
// picture instead of an explanation.
// This one clicks the way a student does — a real browser click from
// Playwright, not element.click() from inside the page — because the copy
// itself depends on the browser treating it as a genuine user gesture. The
// trade-off is that the frame counter in the "7 · RENDER" row moves between
// the click and the read, so this check asserts on the stage labels, which
// do not change, rather than on each row's exact text.
async function checkAskDrawButton(page) {
  const explainPromptText = await page.evaluate(() => document.getElementById('xrayAskText').value);
  await page.click('#xrayAskDraw');
  await page.waitForTimeout(50);
  const promptText = await page.evaluate(() => document.getElementById('xrayAskText').value);
  const statusText = await page.evaluate(
    () => document.getElementById('xrayAskStatus').textContent);

  assertTrue(promptText !== explainPromptText,
    'expected "copy: draw this frame" to replace the textarea with a different prompt');
  for (const label of xrayPipeStageLabels) {
    assertTrue(promptText.includes(label),
      'expected the draw prompt to include the pipe row for "' + label + '"');
  }
  assertTrue(promptText.includes('Draw one diagram'),
    'expected the draw prompt to ask for a diagram');
  assertTrue(statusText === 'Copied. Paste it into any AI chat.',
    'expected a real user click to copy, status line says "' + statusText + '"');
  console.log('PASS — a real click on "copy: draw this frame" replaced the textarea with a ' +
    'different prompt carrying all seven stages, asked for a diagram, and reported the copy');
}

// (v1.3) Both buttons copy to the real clipboard, not just the textarea —
// read it back the way pasting into a chat model would. The textarea
// currently holds the draw prompt (the last button clicked), so that is
// what should be on the clipboard; if the browser will not hand the
// clipboard back in this environment, that is reported as a failure here,
// not skipped quietly.
async function checkClipboardReceivedPrompt(page) {
  const textareaValue = await page.evaluate(() => document.getElementById('xrayAskText').value);
  let clipboardText;
  try {
    clipboardText = await page.evaluate(() => navigator.clipboard.readText());
  } catch (error) {
    throw new Error('could not read the clipboard to confirm the copy reached it ' +
      '(navigator.clipboard.readText() failed: ' + error.message + ')');
  }
  assertTrue(clipboardText === textareaValue,
    'expected the clipboard to hold exactly what "copy: draw this frame" put in the textarea');
  console.log('PASS — the clipboard actually received the copied prompt (read back with ' +
    'navigator.clipboard.readText())');
}

async function runXrayChecks(page, world) {
  await checkXrayToggle(page);
  await checkXrayOpenStateSurvivesReload(page, world);
  await checkPauseFreezesUpdateNotRender(page);
  await checkResumeHasNoCatchUpBurst(page);
  await checkSingleStepAdvancesExactlyOne(page);
  await checkClosingPanelWhilePausedResumesGame(page);
  await checkPauseKeysInertWithPanelHidden(page);
  await checkPauseDoesNotSurviveReload(page);
  await checkPipeDiagramShape(page);
  await checkXrayHintsNameQuietFieldsAndHoldKey(page);
  await checkKeyboardRowNamesSkippedKeys(page);
  await checkArrowRightLightsPipeRows(page);
  await checkStateRowTracksChangeTense(page);
  await checkPipeUpdateRowShowsPauseAndStep(page);
  await checkAskTextareaHiddenOnFreshLoad(page);
  await checkAskExplainButton(page);
  await checkAskTextareaVisibleAfterFirstClick(page);
  await checkAskDrawButton(page);
  await checkClipboardReceivedPrompt(page);
  await runPlaytestFixChecks(page, world);
}

// ------------------------------------------------------------------
// v1.6: level two. The forest gate is the second tile in the file whose
// walkability depends on `state`, so it is checked the same way the bridge
// is: shut before, open after, and the map behind it actually reachable.
// PRD §5b.
// ------------------------------------------------------------------

// Before any quest is done the gate is a wall: COLLIDE says no, the picture
// agrees (it is drawn as trees, not path), and walking into it does nothing.
async function checkForestGateIsShutOnAFreshLoad(page, world) {
  const gate = findDoor(world, 'overworld', 'forest');
  const shut = await page.evaluate((at) => ({
    walkable: canWalkTo('overworld', at.x, at.y),
    color: tileColorFor('G'),
    treeColor: tileTypes['T'].color,
    pathColor: tileTypes['='].color,
  }), { x: gate.fromX, y: gate.fromY });
  assertTrue(shut.walkable === false,
    'expected the forest gate at (' + gate.fromX + ',' + gate.fromY + ') to be shut on a ' +
    'fresh load, but canWalkTo said true');
  assertTrue(shut.color === shut.treeColor,
    'expected a shut gate to be drawn in the tree colour, got ' + shut.color);
  console.log('PASS — on a fresh load the forest gate is shut and drawn as trees');

  // Walk to the tile below it and try to step in. The player must not move.
  await walkTo(page, world, gate.fromX, gate.fromY + 1);
  const before = await getState(page);
  await tapKey(page, 'ArrowUp', 300);
  const after = await getState(page);
  assertTrue(after.player.tileY === before.player.tileY && after.currentMap === 'overworld',
    'expected holding Up against the shut gate to move nobody, but the player went from ' +
    JSON.stringify(before.player) + ' to ' + JSON.stringify(after.player) +
    ' on map "' + after.currentMap + '"');
  console.log('PASS — holding Up against the shut gate does not move the player or change map');
}

// With all three village flags set the same tile answers differently, and
// the picture changes with it. This is the bridge's lesson, twice.
async function checkForestGateOpensWithTheThirdQuest(page, world) {
  const gate = findDoor(world, 'overworld', 'forest');
  const open = await page.evaluate((at) => ({
    walkable: canWalkTo('overworld', at.x, at.y),
    color: tileColorFor('G'),
    pathColor: tileTypes['='].color,
  }), { x: gate.fromX, y: gate.fromY });
  assertTrue(open.walkable === true,
    'expected the forest gate to be open once all three village flags are set');
  assertTrue(open.color === open.pathColor,
    'expected an open gate to be drawn in the path colour, got ' + open.color);
  console.log('PASS — with all three village quests done the gate is walkable and drawn as path');
}

// Every bog tile costs slowTileStepMultiplier ordinary steps. Read the cost
// straight out of the game's own function, then prove it in real time by
// walking the same distance over grass and over the bog.
async function checkTheBogCostsMoreThanGrass(page) {
  const costs = await page.evaluate(() => ({
    bog: stepCooldownFor('forest', 14, 8),
    grass: stepCooldownFor('forest', 14, 18),
    multiplier: slowTileStepMultiplier,
  }));
  assertTrue(costs.bog === costs.grass * costs.multiplier,
    'expected a bog step to cost ' + costs.multiplier + 'x a grass step, got ' +
    costs.bog + ' vs ' + costs.grass);
  console.log('PASS — a bog step costs ' + costs.multiplier + 'x a grass step (' +
    costs.bog.toFixed(3) + 's vs ' + costs.grass.toFixed(3) + 's)');
}

// Walk the whole of level two: in through the gate, gather all three, back
// out through the exit, and hand the basket over.
async function runLevelTwoChecks(page, world) {
  await checkForestGateOpensWithTheThirdQuest(page, world);
  await checkTheBogCostsMoreThanGrass(page);

  // The playthrough leaves the player inside the house (that is where the
  // save/reload check ends), and walkTo only pathfinds within one map.
  let state = await getState(page);
  if (state.currentMap !== 'overworld') {
    const wayOut = findDoor(world, state.currentMap, 'overworld');
    await walkTo(page, world, wayOut.fromX, wayOut.fromY);
    state = await getState(page);
    assertTrue(state.currentMap === 'overworld',
      'expected to be outdoors again before heading for the forest, got "' +
      state.currentMap + '"');
    console.log('PASS — left the house and came back out into the village');
  }

  const gate = findDoor(world, 'overworld', 'forest');
  await walkTo(page, world, gate.fromX, gate.fromY);
  state = await getState(page);
  assertTrue(state.currentMap === 'forest',
    'expected to be in "forest" after stepping on the open gate, got "' + state.currentMap + '"');
  assertTrue(state.player.tileX === gate.toX && state.player.tileY === gate.toY,
    'expected to arrive at (' + gate.toX + ',' + gate.toY + '), got (' +
    state.player.tileX + ',' + state.player.tileY + ')');
  console.log('PASS — stepped through the open gate into ' + world.maps.forest.title);

  // The three gatherables, in whatever order the table lists them. Each one
  // is a separate walk, which also proves the map is fully connected.
  for (const itemId of ['mushroom', 'honeycomb', 'berries']) {
    const item = findItem(world, itemId);
    await walkTo(page, world, item.tileX, item.tileY);
    state = await getState(page);
    assertTrue(state.inventory.includes(itemId),
      'expected ' + itemId + ' in the bag after walking over it at (' +
      item.tileX + ',' + item.tileY + ')');
    console.log('PASS — gathered ' + item.name + ' at (' + item.tileX + ',' + item.tileY + ')');
  }

  const exit = findDoor(world, 'forest', 'overworld');
  await walkTo(page, world, exit.fromX, exit.fromY);
  state = await getState(page);
  assertTrue(state.currentMap === 'overworld',
    'expected to be back in "overworld" after the forest exit, got "' + state.currentMap + '"');
  console.log('PASS — the forest exit leads back to the village');

  await talkAndGiveItem(page, world, 'nessa');
  state = await getState(page);
  for (const itemId of ['mushroom', 'honeycomb', 'berries']) {
    assertTrue(!state.inventory.includes(itemId),
      'expected ' + itemId + ' to leave the bag when the basket was handed over');
  }
  assertTrue(state.flags.feastHeld, 'expected flag feastHeld true after Nessa got all three');
  console.log('PASS — handing over all three at once emptied the bag and set feastHeld');

  // Four quests now, and the HUD has to have somewhere to draw the fourth.
  const hud = await page.evaluate(() => ({
    questCount: quests.length,
    canvasHeight: canvas.height,
    worldHeight: viewportHeightInTiles * tileSizeInPixels,
    lineHeight: layout.hudLineHeight,
    helpBaseline: hudHeightInPixels - layout.hudLineHeight / 2,
  }));
  const lastQuestBaseline = hud.lineHeight * hud.questCount;
  assertTrue(lastQuestBaseline < hud.helpBaseline,
    'expected the last of ' + hud.questCount + ' quest lines (baseline ' + lastQuestBaseline +
    ') to sit above the help line (baseline ' + hud.helpBaseline + ') inside the HUD');
  console.log('PASS — all ' + hud.questCount + ' quest lines fit in the HUD above the help line');
}

// ------------------------------------------------------------------
// v1.5: the two things the first student playtest asked for — a direction
// that follows the key you actually pressed last, and a speedrun clock.
// PRD §4d.
// ------------------------------------------------------------------

// The report was "spamming the left and right arrow keys, the game seemed
// to struggle with processing my direction". Before the fix, twelve
// alternating taps ending on Right left the player facing left, because
// the two keys overlap for a few milliseconds and updatePlayerMovement
// read the held-key flags in a fixed order.
// Both direction checks want a known, open stretch of ground. Clearing the
// save and reloading puts the player back on row 14 of the overworld, where
// the tiles either side are path, so a blocked step can never be the reason
// a check fails.
async function resetToStartingTile(page, world) {
  await page.evaluate((key) => localStorage.removeItem(key), world.saveSlotName);
  await page.reload();
  await waitForCanvasReady(page);
  const state = await waitForCondition(page,
    (s) => s.player.tileX === 3 && s.player.tileY === 14, 2000, 'the starting tile (3,14)');
  return state;
}

async function checkMashingLeftRightFollowsTheNewestKey(page, world) {
  await resetToStartingTile(page, world);
  for (let round = 0; round < 12; round++) {
    await page.keyboard.down('ArrowLeft');
    await page.waitForTimeout(30);
    await page.keyboard.up('ArrowLeft');
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(30);
    await page.keyboard.up('ArrowRight');
  }
  const state = await waitForCondition(page, (s) => s.player.facing === 'right', 1000,
    'player to face right after 12 left/right taps ending on ArrowRight');
  assertTrue(state.player.facing === 'right',
    'expected facing right after mashing left/right and ending on right, got ' +
    state.player.facing);
  console.log('PASS — mashing left/right ends facing the key pressed last, not the first `if`');
}

// The other half of the same bug: updatePlayerMovement returns early while
// stepCooldown is running, so a tap released inside that window used to be
// dropped. intents.newestMoveDirection survives the release, so the step
// still happens once the cooldown expires.
async function checkShortTapSurvivesTheStepCooldown(page, world) {
  await resetToStartingTile(page, world);
  // Start a step so a cooldown is definitely running, then release.
  await tapKey(page, 'ArrowLeft', 40);
  await page.waitForTimeout(10);
  const before = await getState(page);
  // 15 ms is far shorter than one step at playerStepsPerSecond = 7 (143 ms).
  await tapKey(page, 'ArrowRight', 15);
  const after = await waitForCondition(page, (state) => state.player.facing === 'right', 1000,
    'a 15 ms tap of ArrowRight to be honoured after the step cooldown');
  assertTrue(after.player.tileX === before.player.tileX + 1,
    'expected the short tap to move one tile east from ' + before.player.tileX + ', got ' +
    after.player.tileX);
  console.log('PASS — a tap shorter than one step is remembered instead of dropped');
}

// T starts the clock at 0:00 and shows it; T again stops it and hides it.
// It only counts while visible, which is what keeps a hidden clock out of
// the X-ray change log.
async function checkSpeedrunTimerStartsStopsAndIsNotSaved(page, world) {
  await resetToStartingTile(page, world);
  let state = await getState(page);
  assertTrue(state.runTimer.visible === false,
    'expected the timer hidden on a fresh load, got ' + JSON.stringify(state.runTimer));
  const restingSeconds = state.runTimer.secondsElapsed;
  await page.waitForTimeout(300);
  state = await getState(page);
  assertTrue(state.runTimer.secondsElapsed === restingSeconds,
    'expected a hidden timer not to count, but it moved to ' + state.runTimer.secondsElapsed);

  await tapKey(page, 't');
  state = await waitForCondition(page, (s) => s.runTimer.visible, 1000, 'T to start the timer');
  await page.waitForTimeout(400);
  state = await getState(page);
  assertTrue(state.runTimer.secondsElapsed > 0.2,
    'expected the timer to be counting after T, got ' + state.runTimer.secondsElapsed);
  console.log('PASS — T starts the speedrun clock from zero and it counts while visible');

  const runningSeconds = state.runTimer.secondsElapsed;
  await tapKey(page, 't');
  state = await waitForCondition(page, (s) => !s.runTimer.visible, 1000, 'T to stop the timer');
  await page.waitForTimeout(300);
  state = await getState(page);
  assertTrue(state.runTimer.secondsElapsed === runningSeconds ||
    state.runTimer.secondsElapsed < runningSeconds + 0.05,
    'expected a hidden timer to stop counting, got ' + state.runTimer.secondsElapsed);
  console.log('PASS — T again hides the clock and it stops counting');

  // Restarting sets it back to zero, the way a stopwatch does.
  await tapKey(page, 't');
  state = await waitForCondition(page, (s) => s.runTimer.visible, 1000, 'T to restart');
  assertTrue(state.runTimer.secondsElapsed < 0.3,
    'expected a restarted timer to begin near zero, got ' + state.runTimer.secondsElapsed);
  await tapKey(page, 't');
  console.log('PASS — restarting the clock restarts it from 0:00');

  // The timer is a moment, not progress: it must not be in the save.
  await tapKey(page, 'k');
  const savedText = await page.evaluate(() => localStorage.getItem(saveSlotName));
  assertTrue(savedText !== null, 'expected K to write a save');
  assertTrue(!savedText.includes('runTimer'),
    'expected runTimer to be left out of the save, but it is in: ' + savedText);
  console.log('PASS — runTimer is absent from the save, so a reload gives a fresh clock');
}

async function runPlaytestFixChecks(page, world) {
  await checkMashingLeftRightFollowsTheNewestKey(page, world);
  await checkShortTapSurvivesTheStepCooldown(page, world);
  await checkSpeedrunTimerStartsStopsAndIsNotSaved(page, world);
}

async function waitForCanvasReady(page) {
  await page.waitForFunction(() => {
    const canvasElement = document.getElementById('gameCanvas');
    return canvasElement !== null && canvasElement.width === 640;
  }, { timeout: 5000 });
}

// ------------------------------------------------------------------
// Entry point
// ------------------------------------------------------------------

async function main() {
  const startTimeMs = Date.now();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  // The X-ray "ask an AI" buttons copy to the real clipboard; grant it here
  // so runXrayChecks can read the clipboard back and confirm that.
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const page = await context.newPage();

  page.on('console', (message) => {
    const type = message.type();
    if (type === 'error' || type === 'warning') {
      consoleIssues.push({ type, text: message.text() });
    }
  });
  page.on('pageerror', (error) => {
    consoleIssues.push({ type: 'pageerror', text: String(error) });
  });

  let failure = null;
  try {
    await page.goto(gameFileUrl);
    await waitForCanvasReady(page);
    await runPlaythrough(page);
  } catch (error) {
    failure = error;
  } finally {
    await browser.close();
  }

  const wallTimeSeconds = ((Date.now() - startTimeMs) / 1000).toFixed(1);
  console.log('');
  console.log('Wall time: ' + wallTimeSeconds + 's');

  console.log('');
  console.log('Console errors/warnings/pageerrors captured:');
  const knownBrowserLayerNoise = 'unique security origins';
  let unexpectedIssueFound = false;
  if (consoleIssues.length === 0) {
    console.log('  (none)');
  }
  for (const issue of consoleIssues) {
    const isKnownBrowserLayerNoise = issue.text.includes(knownBrowserLayerNoise);
    const classification = isKnownBrowserLayerNoise ? ' [browser-layer, not a code bug]' : '';
    console.log('  [' + issue.type + ']' + classification + ' ' + issue.text);
    if (!isKnownBrowserLayerNoise) unexpectedIssueFound = true;
  }

  if (failure) {
    console.log('');
    console.log('RESULT: FAIL — ' + failure.message);
    process.exit(1);
  }
  if (unexpectedIssueFound) {
    console.log('');
    console.log('RESULT: FAIL — unexpected console error/warning/pageerror above');
    process.exit(1);
  }
  console.log('');
  console.log('RESULT: PASS');
  process.exit(0);
}

main();
