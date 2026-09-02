# Maintainer tools

`check.mjs` runs the mechanical PRD §8 checks against `game.html` (line count, line length, banned strings, section banners, render purity, function length) — run with `node tools/check.mjs`.
`playthrough.mjs` drives a headless Chromium browser through the full game (both maps, all three quests, save, reload, new game) to prove it actually works — run with `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node tools/playthrough.mjs`.
`check-xray-removable.mjs` proves PRD §4a's promise — that deleting section 11, the `<aside>`, and the four X-ray lines in LOOP leaves the game exactly the same — by stripping those pieces from an in-memory copy of `game.html` and playing it in headless Chromium — run with `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node tools/check-xray-removable.mjs`.
`check-doc-lines.mjs` checks that the `game.html` line numbers cited in `TEARDOWN.md` and `CHANGE-ME.md` still point at the right lines — run with `node tools/check-doc-lines.mjs`.
All four exit 1 on any failure and print one PASS/FAIL line per check, so they can be scripted or eyeballed.
These are maintainer tools written for agents to prove the game functions, not part of the student deliverable — PRD §5 lists "a test suite as a deliverable" as an explicit non-goal.
Nothing here touches `game.html`; they only read it and load it in a browser.
Re-run all four after any change to `game.html` before calling the change done.
