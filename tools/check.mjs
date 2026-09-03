#!/usr/bin/env node
// tools/check.mjs — mechanical PRD §8 acceptance checks against game.html.
//
// Maintainer tool, not a student deliverable (see tools/README.md). Prints one
// PASS/FAIL line per check and exits 1 if any check fails.
//
// Usage: node tools/check.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const gameFilePath = path.join(scriptDir, '..', 'game.html');
const gameFileText = readFileSync(gameFilePath, 'utf8');
const lines = gameFileText.split('\n');

let anyFailed = false;

function report(passed, message) {
  console.log((passed ? 'PASS' : 'FAIL') + ' — ' + message);
  if (!passed) anyFailed = true;
}

// ------------------------------------------------------------------
// Check 1: the two line budgets of PRD §3, as revised by §3a. The one that
// matters is the required read, sections 1-10: that is what a student who
// has never opened the file has to get through, and it stays 1,200-1,800
// (ceiling 2,000). Everything after 10 · BOOT is opt-in and removable, so
// the whole file gets a looser ceiling of 2,600. Keeping them apart is the
// mechanical half of "low floor, high ceiling" (PRD §0a).
// ------------------------------------------------------------------
function checkLineCount() {
  // A trailing newline makes split('\n') produce one extra empty element;
  // don't count that as a line.
  const lineCount = lines[lines.length - 1] === '' ? lines.length - 1 : lines.length;
  report(lineCount <= 2600, 'whole file is ' + lineCount + ' lines (<= 2,600)');

  // The required read ends where the first optional section begins. With no
  // optional section at all, the required read is the whole file.
  const xRayLineIndex = findBannerLineIndex('11 · X-RAY', 1);
  const requiredReadLines = xRayLineIndex === -1 ? lineCount : xRayLineIndex - 1;
  const inTargetRange = requiredReadLines >= 1200 && requiredReadLines <= 1800;
  const rangeNote = inTargetRange
    ? 'inside the 1,200-1,800 target'
    : 'OUTSIDE the 1,200-1,800 target — see PRD §3a before widening it';
  report(requiredReadLines <= 2000 && inTargetRange,
    'required read (sections 1-10) is ' + requiredReadLines + ' lines, ' + rangeNote);
}

// ------------------------------------------------------------------
// Check 2: no line longer than 100 characters
// ------------------------------------------------------------------
function checkLineLength() {
  const offendingLineNumbers = [];
  for (let index = 0; index < lines.length; index++) {
    if (lines[index].length > 100) {
      offendingLineNumbers.push(index + 1);
    }
  }
  const passed = offendingLineNumbers.length === 0;
  const detail = passed
    ? 'no line exceeds 100 characters'
    : 'lines over 100 chars: ' + offendingLineNumbers.join(', ');
  report(passed, detail);
}

// ------------------------------------------------------------------
// Check 3: banned strings return zero hits
// ------------------------------------------------------------------
function checkBannedStrings() {
  const bannedStrings = [
    'import ', 'require(', '<script src', 'eval(', 'innerHTML =', 'setTimeout(',
  ];
  for (const bannedString of bannedStrings) {
    const hitLineNumbers = [];
    for (let index = 0; index < lines.length; index++) {
      if (lines[index].includes(bannedString)) {
        hitLineNumbers.push(index + 1);
      }
    }
    const passed = hitLineNumbers.length === 0;
    const detail = passed
      ? 'banned string ' + JSON.stringify(bannedString) + ' has zero hits'
      : 'banned string ' + JSON.stringify(bannedString) + ' found on lines: ' +
        hitLineNumbers.join(', ');
    report(passed, detail);
  }
}

// ------------------------------------------------------------------
// Check 4: the ten section banners (plus optional 11 · X-RAY), in order,
// each followed within 3 lines by a "What to look for" line.
// ------------------------------------------------------------------
function checkSectionBanners() {
  const requiredBannerLabels = [
    '1 · CONFIG', '2 · DATA', '3 · STATE', '4 · INPUT', '5 · UPDATE',
    '6 · COLLIDE', '7 · RENDER', '8 · LOOP', '9 · SAVE', '10 · BOOT',
  ];
  const optionalBannerLabel = '11 · X-RAY';

  let searchFromLineIndex = 0;
  for (const bannerLabel of requiredBannerLabels) {
    const found = findBannerWithWhatToLookFor(bannerLabel, searchFromLineIndex);
    if (found === null) {
      report(false, 'banner "' + bannerLabel + '" missing, out of order, or ' +
        'missing its "What to look for" line within 3 lines');
      return;
    }
    report(true, 'banner "' + bannerLabel + '" present with a "What to look for" line');
    searchFromLineIndex = found + 1;
  }

  // The X-RAY section is optional. If a line mentioning it exists anywhere
  // after BOOT, it must also carry a "What to look for" line.
  const xRayLineIndex = findBannerLineIndex(optionalBannerLabel, searchFromLineIndex);
  if (xRayLineIndex === -1) {
    report(true, 'optional banner "' + optionalBannerLabel + '" is absent (fine, it is optional)');
    return;
  }
  const xRayFound = findBannerWithWhatToLookFor(optionalBannerLabel, searchFromLineIndex);
  report(xRayFound !== null,
    'optional banner "' + optionalBannerLabel + '" present with a "What to look for" line');
}

function findLineIndexContaining(text, fromLineIndex) {
  for (let index = fromLineIndex; index < lines.length; index++) {
    if (lines[index].includes(text)) return index;
  }
  return -1;
}

// A section banner is the line right after a "/* ====" rule. The X-ray's
// <aside> headings reuse the same labels ("7 · RENDER + 8 · LOOP"), so a
// plain text search would stop at the HTML instead of the real banner.
function findBannerLineIndex(bannerLabel, fromLineIndex) {
  for (let index = Math.max(1, fromLineIndex); index < lines.length; index++) {
    if (lines[index].includes(bannerLabel) && lines[index - 1].trim().startsWith('/* ====')) {
      return index;
    }
  }
  return -1;
}

// Finds `bannerLabel` at or after fromLineIndex, and confirms a line
// containing "What to look for" appears within the following 3 lines.
// Returns the banner's line index, or null if not found correctly.
function findBannerWithWhatToLookFor(bannerLabel, fromLineIndex) {
  const bannerLineIndex = findBannerLineIndex(bannerLabel, fromLineIndex);
  if (bannerLineIndex === -1) return null;
  for (let offset = 1; offset <= 3; offset++) {
    const candidateLine = lines[bannerLineIndex + offset];
    if (candidateLine !== undefined && candidateLine.includes('What to look for')) {
      return bannerLineIndex;
    }
  }
  return null;
}

// ------------------------------------------------------------------
// Check 5: no assignment to state.* inside RENDER (between the 7 · RENDER
// banner and the 8 · LOOP banner), and inside 11 · X-RAY if it exists.
// ------------------------------------------------------------------
function checkNoStateMutationInRender() {
  const renderStartLineIndex = findBannerLineIndex('7 · RENDER', 0);
  const loopStartLineIndex = findBannerLineIndex('8 · LOOP', renderStartLineIndex + 1);
  if (renderStartLineIndex === -1 || loopStartLineIndex === -1) {
    report(false, 'could not locate RENDER/LOOP banners to scan for state mutation');
    return;
  }
  const offenders = findStateAssignments(renderStartLineIndex, loopStartLineIndex);

  const xRayLineIndex = findBannerLineIndex('11 · X-RAY', loopStartLineIndex);
  if (xRayLineIndex !== -1) {
    offenders.push(...findStateAssignments(xRayLineIndex, lines.length));
  }

  const passed = offenders.length === 0;
  const detail = passed
    ? 'no assignment to state.* inside RENDER' + (xRayLineIndex !== -1 ? ' or X-RAY' : '')
    : 'assignment to state.* found on lines: ' + offenders.join(', ');
  report(passed, detail);
}

// Assignment pattern: `state.<path> =`, `+=`, or `-=`, but not `==`, `===`,
// or `!=`. Scans line by line rather than with a broad regex-over-the-whole-
// file so it stays easy to read.
function findStateAssignments(fromLineIndex, toLineIndex) {
  const assignmentPattern = /state(\.[a-zA-Z0-9_]+)+\s*(\+=|-=|=)/;
  const offenders = [];
  for (let index = fromLineIndex; index < toLineIndex; index++) {
    const line = lines[index];
    const match = line.match(assignmentPattern);
    if (match === null) continue;
    const matchEnd = match.index + match[0].length;
    const operatorIsPlainEquals = match[0].endsWith('=') &&
      !match[0].endsWith('+=') && !match[0].endsWith('-=');
    if (operatorIsPlainEquals) {
      // Reject if it's actually ==, ===, or != by checking the character
      // right after the matched "=" and the character right before it.
      const charBeforeEquals = line[matchEnd - 2];
      const charAfterMatch = line[matchEnd];
      if (charBeforeEquals === '=' || charBeforeEquals === '!' || charAfterMatch === '=') {
        continue;
      }
    }
    offenders.push(index + 1);
  }
  return offenders;
}

// ------------------------------------------------------------------
// Check 6: no function longer than 40 lines
// ------------------------------------------------------------------
function checkFunctionLength() {
  const offenders = [];
  const functionStartPattern = /^function [a-zA-Z0-9_]+\(/;
  for (let index = 0; index < lines.length; index++) {
    if (!functionStartPattern.test(lines[index])) continue;
    const closingLineIndex = findMatchingCloseBrace(index);
    if (closingLineIndex === -1) {
      offenders.push((index + 1) + ' (no matching closing brace found)');
      continue;
    }
    const functionLineCount = closingLineIndex - index + 1;
    if (functionLineCount > 40) {
      offenders.push('line ' + (index + 1) + ' (' + functionLineCount + ' lines)');
    }
  }
  const passed = offenders.length === 0;
  const detail = passed
    ? 'no function exceeds 40 lines'
    : 'functions over 40 lines: ' + offenders.join('; ');
  report(passed, detail);
}

// Starting at a `function name(` line, finds the line index of the `}` that
// closes it at column 0 (this file's convention for a top-level function).
function findMatchingCloseBrace(startLineIndex) {
  for (let index = startLineIndex + 1; index < lines.length; index++) {
    if (lines[index] === '}') return index;
  }
  return -1;
}

// ------------------------------------------------------------------
// Check 7: the render-purity assertion is present and called after render()
// ------------------------------------------------------------------
function checkRenderPurityAssertion() {
  const definesAssertion = gameFileText.includes('function assertRenderChangedNothing(');
  const callsRenderThenAssertion = /render\(\);\s*\n\s*assertRenderChangedNothing\(/.test(
    gameFileText);
  const passed = definesAssertion && callsRenderThenAssertion;
  const detail = passed
    ? 'assertRenderChangedNothing is defined and called right after render()'
    : 'assertRenderChangedNothing missing (defined=' + definesAssertion +
      ', called-after-render=' + callsRenderThenAssertion + ')';
  report(passed, detail);
}

checkLineCount();
checkLineLength();
checkBannedStrings();
checkSectionBanners();
checkNoStateMutationInRender();
checkFunctionLength();
checkRenderPurityAssertion();

console.log('');
console.log(anyFailed ? 'RESULT: FAIL' : 'RESULT: PASS');
process.exit(anyFailed ? 1 : 0);
