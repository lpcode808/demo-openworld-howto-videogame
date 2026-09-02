#!/usr/bin/env node
// tools/playthrough.mjs — a headless Chromium playthrough of game.html that
// proves the whole game works end to end: movement, collision, NPCs and
// dialogue, items and inventory, quest flags, the bridge gate, the second
// map, save, reload, and "new game".
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
    maps, items, npcs, doors, tileTypes, saveSlotName,
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

// ------------------------------------------------------------------
// Pathfinding: BFS over the current map's tile grid, using the same
// walkability rule as the game's own COLLIDE section (canWalkTo).
// ------------------------------------------------------------------

function isWalkableTile(rows, tileTypes, npcList, mapName, bridgeBuilt, x, y) {
  if (y < 0 || y >= rows.length) return false;
  if (x < 0 || x >= rows[0].length) return false;
  for (const npc of npcList) {
    if (npc.map === mapName && npc.tileX === x && npc.tileY === y) return false;
  }
  const tileCharacter = rows[y][x];
  if (tileCharacter === 'B') return bridgeBuilt;
  const tileType = tileTypes[tileCharacter];
  return tileType !== undefined && tileType.walkable;
}

// Returns an array of steps [{ x, y, direction }, ...] from start to goal,
// excluding the start tile itself, or null if no path exists.
function findPath(rows, tileTypes, npcList, mapName, bridgeBuilt, start, goal) {
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
      if (!isWalkableTile(rows, tileTypes, npcList, mapName, bridgeBuilt, nextX, nextY)) continue;
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
  const path = findPath(rows, world.tileTypes, world.npcs, mapName,
    state.flags.bridgeBuilt, start, goal);
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
    const givesItemIndex = node.choices.findIndex((choice) => choice.givesItem);
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
