// Checks that the line numbers TEARDOWN.md and CHANGE-ME.md cite still point at the right
// lines of game.html. Structured citations are checked automatically; every other "line N"
// mention is printed next to the actual source line so a human can eyeball it in a minute.
//
//   node tools/check-doc-lines.mjs            (exit 1 if any automatic check fails)
import { readFileSync } from 'node:fs';

const source = readFileSync('game.html', 'utf8').split('\n');
const docs = ['TEARDOWN.md', 'CHANGE-ME.md'];
let failures = 0;

function lineText(number) {
  return (source[number - 1] || '').trim();
}

function fail(doc, docLine, message) {
  failures += 1;
  console.log(`FAIL ${doc}:${docLine}  ${message}`);
}

// Does the identifier get defined on this exact line? Accepts function/const/let/key forms.
function definesIdentifier(number, identifier) {
  const text = lineText(number);
  return text.startsWith(`function ${identifier}(`) ||
    text.startsWith(`const ${identifier} `) || text.startsWith(`let ${identifier} `) ||
    text.startsWith(`${identifier}:`) || text.startsWith(`${identifier} =`) ||
    text.startsWith(`'${identifier}'`) || text.startsWith(`${identifier}(`);
}

function rangeContains(from, to, needle) {
  for (let number = from; number <= to; number++) {
    if (lineText(number).includes(needle)) return true;
  }
  return false;
}

// Section banners: "§7 RENDER, lines 789–1070" means the "7 · RENDER" banner opens at the
// first cited line and the next banner starts after the last.
function checkSectionRange(doc, docLine, sectionNumber, from, to) {
  const bannerAt = lineText(from).startsWith('/* ====') &&
    lineText(from + 1).startsWith(`${sectionNumber} · `);
  if (!bannerAt) {
    fail(doc, docLine, `§${sectionNumber} said to start at ${from}, but that is: ${lineText(from)}` +
      ` / ${lineText(from + 1)}`);
  }
  const nextBannerAt = lineText(to + 1).startsWith('/* ====') ||
    lineText(to + 2).startsWith('/* ====') || lineText(to + 3).startsWith('/* ====') ||
    lineText(to) === '</html>' || lineText(to + 1) === '</script>';
  if (!nextBannerAt) {
    fail(doc, docLine, `§${sectionNumber} said to end at ${to}, but nothing new starts there`);
  }
}

for (const doc of docs) {
  const docLines = readFileSync(doc, 'utf8').split('\n');
  console.log(`\n== ${doc} ==`);
  docLines.forEach((text, index) => {
    const docLine = index + 1;

    // `ident` (A–B)  or  `ident` (A)
    for (const match of text.matchAll(/`([A-Za-z_.]+)` \((\d+)(?:–(\d+))?\)/g)) {
      const identifier = match[1].split('.').pop();
      const from = Number(match[2]);
      if (!definesIdentifier(from, identifier)) {
        fail(doc, docLine, `\`${identifier}\` (${from}) but line ${from} is: ${lineText(from)}`);
      }
    }

    // lines A–B (`ident`)  or  line A (`snippet`
    for (const match of text.matchAll(/lines? (\d+)(?:–(\d+))? \(`([^`]+)`/g)) {
      const from = Number(match[1]);
      const to = Number(match[2] || match[1]);
      // "state.flags" is written as "flags:" inside the state object, so match the last part.
      // "maps.overworld.rows" cites the rows themselves, one line under "rows: [".
      const needle = match[3].split('.').pop();
      if (!rangeContains(from - 1, to, needle)) {
        fail(doc, docLine, `lines ${from}–${to} should contain \`${needle}\``);
      }
    }

    // §N NAME, lines A–B   (a whole section; "lines A–B (`name`)" is a function, handled above)
    for (const match of text.matchAll(/§(\d+) [A-Z-]+, lines (\d+)–(\d+)/g)) {
      const after = text.slice(match.index + match[0].length, match.index + match[0].length + 3);
      const before = text.slice(Math.max(0, match.index - 3), match.index);
      // "(`name`)" after it means a function range; "of §8" before it means a partial range.
      if (after === ' (`' || before === 'of ') continue;
      checkSectionRange(doc, docLine, Number(match[1]), Number(match[2]), Number(match[3]));
    }

    // Everything else: print for the eyeball pass.
    for (const match of text.matchAll(/\blines? (\d+)(?:–(\d+))?/g)) {
      const from = Number(match[1]);
      const context = text.slice(Math.max(0, match.index - 30), match.index + 45)
        .replace(/\s+/g, ' ');
      console.log(`  ${doc}:${docLine}  "${context}"\n      -> ${from}: ${lineText(from).slice(0, 80)}`);
    }
  });
}

console.log(failures === 0 ? '\nAll automatic citation checks passed.' : `\n${failures} failure(s).`);
process.exit(failures === 0 ? 0 : 1);
