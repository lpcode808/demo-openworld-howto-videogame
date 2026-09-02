#!/usr/bin/env node
// tools/check-xray-removable.mjs — verifies PRD §4a's promise: "Delete
// section 11, the <aside>, and the four X-ray lines in LOOP, and the game
// is exactly the same."
//
// Does NOT modify game.html. It reads game.html, removes those pieces from
// an in-memory copy, writes that copy to a temp file, and loads *that* file
// in headless Chromium to prove the stripped-down game still works: it
// loads clean, the player still walks, the render-purity assertion still
// runs, and X/P/. are inert.
//
// Maintainer tool, not a student deliverable (see tools/README.md). Prints
// one PASS/FAIL line per check and exits 1 if any check fails.
//
// Usage: PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node tools/check-xray-removable.mjs

import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import path from 'node:path';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const gameFilePath = path.join(scriptDir, '..', 'game.html');
const originalGameText = readFileSync(gameFilePath, 'utf8');

let anyFailed = false;

function report(passed, message) {
  console.log((passed ? 'PASS' : 'FAIL') + ' — ' + message);
  if (!passed) anyFailed = true;
}

// ------------------------------------------------------------------
// Step 1: remove the <aside id="xray" hidden> ... </aside> block.
// ------------------------------------------------------------------
function removeAsideMarkup(text) {
  const startMarker = '<aside id="xray" hidden>';
  const endMarker = '</aside>';
  const startIndex = text.indexOf(startMarker);
  if (startIndex === -1) {
    report(false, 'step 1: anchor <aside id="xray" hidden> not found — nothing removed');
    return text;
  }
  const endIndex = text.indexOf(endMarker, startIndex);
  if (endIndex === -1) {
    report(false, 'step 1: found the opening <aside id="xray"> tag but no matching ' +
      '</aside> after it — nothing removed');
    return text;
  }
  const removedChars = endIndex + endMarker.length - startIndex;
  const newText = text.slice(0, startIndex) + text.slice(endIndex + endMarker.length);
  report(true, 'step 1: removed the <aside id="xray" hidden> ... </aside> block (' +
    removedChars + ' characters)');
  return newText;
}

// ------------------------------------------------------------------
// Step 2: remove the aside#xray CSS rules from the <style> block.
// ------------------------------------------------------------------
function removeAsideCss(text) {
  const startMarker = '/* The X-ray panel.';
  const endMarker = '</style>';
  const startIndex = text.indexOf(startMarker);
  if (startIndex === -1) {
    report(false, 'step 2: anchor "/* The X-ray panel." comment not found in <style> — ' +
      'nothing removed');
    return text;
  }
  const endIndex = text.indexOf(endMarker, startIndex);
  if (endIndex === -1) {
    report(false, 'step 2: found the aside#xray CSS comment but no </style> after it — ' +
      'nothing removed');
    return text;
  }
  const span = text.slice(startIndex, endIndex);
  // Confirm the aside#xray selector is actually inside the span we're about
  // to delete, so a drifted anchor fails loudly instead of quietly deleting
  // the wrong stretch of CSS.
  if (!span.includes('aside#xray')) {
    report(false, 'step 2: the span between that comment and </style> contains no ' +
      '"aside#xray" rule — refusing to remove it');
    return text;
  }
  const newText = text.slice(0, startIndex) + text.slice(endIndex);
  report(true, 'step 2: removed the aside#xray CSS rules (' + span.length + ' characters)');
  return newText;
}

// ------------------------------------------------------------------
// Step 3: remove the whole "11 · X-RAY" section, banner to end of script.
// ------------------------------------------------------------------
function removeXraySection(text) {
  const bannerMarker = '/* ============================================================\n' +
    '   11 · X-RAY — a window onto the pipe, while it runs';
  const endMarker = '</script>';
  const startIndex = text.indexOf(bannerMarker);
  if (startIndex === -1) {
    report(false, 'step 3: the "11 · X-RAY" section banner was not found — nothing removed');
    return text;
  }
  const endIndex = text.indexOf(endMarker, startIndex);
  if (endIndex === -1) {
    report(false, 'step 3: found the "11 · X-RAY" banner but no </script> after it — ' +
      'nothing removed');
    return text;
  }
  const removedChars = endIndex - startIndex;
  const newText = text.slice(0, startIndex) + text.slice(endIndex);
  report(true, 'step 3: removed the "11 · X-RAY" section, banner through end of script (' +
    removedChars + ' characters)');
  return newText;
}

// ------------------------------------------------------------------
// Step 4: remove the four X-ray lines (plus their comments) inside
// function frame() in section 8 LOOP.
// ------------------------------------------------------------------
const loopChunks = [
  {
    label: 'the xrayStopwatchWhilePaused call, plus its comment',
    text: "  // Ask the X-ray whether to spend this frame's time normally, or not at all.\n" +
      '  unsimulatedSeconds = xrayStopwatchWhilePaused(unsimulatedSeconds);\n',
  },
  {
    label: 'the stateBeforeUpdate snapshot, plus its two-line comment',
    text: '  // A text snapshot of state before UPDATE runs. X-RAY compares it with the\n' +
      '  // snapshot taken before RENDER to show exactly which fields UPDATE changed.\n' +
      '  const stateBeforeUpdate = JSON.stringify(state);\n',
  },
  {
    label: 'the updatesThisFrame counter declaration',
    text: '  let updatesThisFrame = 0;\n',
  },
  {
    label: 'the updatesThisFrame increment inside the while loop',
    text: '    updatesThisFrame += 1;\n',
  },
  {
    label: 'the showXray call',
    text: '  showXray(stateBeforeUpdate, stateBeforeRender, updatesThisFrame);\n',
  },
];

function removeLoopChunks(text) {
  for (const chunk of loopChunks) {
    const occurrences = text.split(chunk.text).length - 1;
    if (occurrences !== 1) {
      report(false, 'step 4: ' + chunk.label + ' — expected exactly 1 occurrence of the ' +
        'anchor text, found ' + occurrences + ' — nothing removed');
      continue;
    }
    text = text.replace(chunk.text, '');
    report(true, 'step 4: removed ' + chunk.label);
  }
  return text;
}

// ------------------------------------------------------------------
// Post-removal sanity: no dangling reference to anything just removed.
//
// Scanned over code lines only (a trimmed line starting with "//" or
// "<!--" is dropped first) because PRD §4a's promise is behavioral — "the
// game is exactly the same" — and a leftover *comment* elsewhere in the
// file mentioning the word can't break that. Game.html's STATE section has
// exactly one such comment ("... and `xrayMemory` in the optional X-RAY
// section ...", describing what else changes at runtime); it is outside
// all four things PRD §4a says to delete, so it is expected to survive.
// ------------------------------------------------------------------
function codeLinesOnly(text) {
  return text
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      return !trimmed.startsWith('//') && !trimmed.startsWith('<!--');
    })
    .join('\n');
}

function checkNoDanglingReferences(strippedText) {
  const codeText = codeLinesOnly(strippedText);
  const patterns = [
    { name: '"xray" (case-insensitive)', regex: /xray/i },
    { name: '"updatesThisFrame"', regex: /updatesThisFrame/ },
    { name: '"stateBeforeUpdate"', regex: /stateBeforeUpdate/ },
  ];
  for (const pattern of patterns) {
    const lines = codeText.split('\n');
    const hitLines = [];
    for (let index = 0; index < lines.length; index++) {
      if (pattern.regex.test(lines[index])) hitLines.push(index + 1);
    }
    const passed = hitLines.length === 0;
    const detail = passed
      ? 'no remaining code reference to ' + pattern.name
      : pattern.name + ' still appears in code near stripped-file line(s): ' +
        hitLines.join(', ');
    report(passed, detail);
  }
}

// ------------------------------------------------------------------
// Browser-driven checks on the stripped copy.
// ------------------------------------------------------------------
async function waitForCanvasReady(page) {
  await page.waitForFunction(() => {
    const canvasElement = document.getElementById('gameCanvas');
    return canvasElement !== null && canvasElement.width === 640;
  }, { timeout: 5000 });
}

async function getState(page) {
  return page.evaluate(() => JSON.parse(JSON.stringify(state)));
}

async function tapKey(page, key, holdMs = 40) {
  await page.keyboard.down(key);
  await page.waitForTimeout(holdMs);
  await page.keyboard.up(key);
}

async function checkStrippedGameLoadsClean(page, strippedFileUrl, consoleIssues) {
  await page.goto(strippedFileUrl);
  await waitForCanvasReady(page);
  await page.waitForTimeout(150); // let a couple of frames run
  const knownBrowserLayerNoise = 'unique security origins';
  const unexpected = consoleIssues.filter((issue) => !issue.text.includes(knownBrowserLayerNoise));
  const passed = unexpected.length === 0;
  const detail = passed
    ? 'the stripped game loads with zero console errors, warnings, or page errors'
    : 'the stripped game logged ' + unexpected.length + ' unexpected issue(s): ' +
      unexpected.map((issue) => '[' + issue.type + '] ' + issue.text).join(' | ');
  report(passed, detail);
  return passed;
}

async function checkPlayerStillWalks(page) {
  const before = await getState(page);
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(400);
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(50);
  const after = await getState(page);
  const moved = after.player.tileX !== before.player.tileX ||
    after.player.tileY !== before.player.tileY;
  report(moved, 'the player still walks — holding ArrowRight moved the tile position from (' +
    before.player.tileX + ',' + before.player.tileY + ') to (' +
    after.player.tileX + ',' + after.player.tileY + ')');
}

async function checkRenderPurityStillRuns(page, consoleIssuesSoFar) {
  // assertRenderChangedNothing() throws (a pageerror) if RENDER ever wrote
  // to state. It runs every frame regardless of the X-ray, so if it were
  // collateral damage from stripping, either the stripped file would fail
  // to define/call it (caught by checkNoDanglingReferences plus the load
  // check above), or it would simply never have gotten a chance to fire.
  // The strongest evidence it "still runs and passes" from outside the
  // page is: several frames have played, and the function is present.
  const definesAssertion = await page.evaluate(
    () => typeof assertRenderChangedNothing === 'function');
  const beforeIssueCount = consoleIssuesSoFar.length;
  await page.waitForTimeout(200); // several more frames
  const passed = definesAssertion && consoleIssuesSoFar.length === beforeIssueCount;
  const detail = passed
    ? 'assertRenderChangedNothing is still defined and several frames ran without it firing'
    : 'assertRenderChangedNothing missing or fired during the wait (defined=' +
      definesAssertion + ', new console issues=' + (consoleIssuesSoFar.length - beforeIssueCount) + ')';
  report(passed, detail);
}

async function checkXrayKeysAreInert(page) {
  const before = await getState(page);
  for (const key of ['x', 'p', '.']) {
    let threw = null;
    try {
      await tapKey(page, key);
    } catch (error) {
      threw = error;
    }
    await page.waitForTimeout(30);
    if (threw !== null) {
      report(false, 'pressing "' + key + '" threw: ' + threw.message);
      return;
    }
  }
  await page.waitForTimeout(50);
  const after = await getState(page);
  const stateUnchanged = JSON.stringify(before) === JSON.stringify(after);
  const asideStillAbsent = await page.evaluate(() => document.getElementById('xray') === null);
  const passed = stateUnchanged && asideStillAbsent;
  const detail = passed
    ? 'pressing X, P and . did nothing (state unchanged, no #xray element exists) and threw nothing'
    : 'pressing X, P and . had an effect (state unchanged=' + stateUnchanged +
      ', #xray still absent=' + asideStillAbsent + ')';
  report(passed, detail);
}

// ------------------------------------------------------------------
// Entry point
// ------------------------------------------------------------------
async function main() {
  let strippedText = originalGameText;
  strippedText = removeAsideMarkup(strippedText);
  strippedText = removeAsideCss(strippedText);
  strippedText = removeXraySection(strippedText);
  strippedText = removeLoopChunks(strippedText);

  checkNoDanglingReferences(strippedText);

  const strippedLineCount = strippedText.split('\n').length;
  console.log('');
  console.log('Stripped file line count: ' + strippedLineCount +
    ' (original was ' + originalGameText.split('\n').length + ')');
  console.log('');

  if (anyFailed) {
    console.log('Skipping browser checks: the stripped copy was not produced cleanly above.');
    console.log('');
    console.log('RESULT: FAIL');
    process.exit(1);
  }

  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'check-xray-removable-'));
  const strippedFilePath = path.join(tempDir, 'game-stripped.html');
  writeFileSync(strippedFilePath, strippedText, 'utf8');
  const strippedFileUrl = 'file://' + strippedFilePath;

  const consoleIssues = []; // { type: 'error' | 'warning' | 'pageerror', text }
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

  let crashError = null;
  try {
    const loadedClean = await checkStrippedGameLoadsClean(page, strippedFileUrl, consoleIssues);
    if (loadedClean) {
      await checkPlayerStillWalks(page);
      await checkRenderPurityStillRuns(page, consoleIssues);
      await checkXrayKeysAreInert(page);
    } else {
      report(false, 'skipped remaining browser checks because the stripped game did not load clean');
    }
  } catch (error) {
    crashError = error;
  } finally {
    await browser.close();
  }

  console.log('');
  if (crashError) {
    console.log('RESULT: FAIL — ' + crashError.message);
    process.exit(1);
  }
  console.log(anyFailed ? 'RESULT: FAIL' : 'RESULT: PASS');
  process.exit(anyFailed ? 1 : 0);
}

main();
