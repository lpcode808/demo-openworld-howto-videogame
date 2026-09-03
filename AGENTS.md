# AGENTS.md — demo-openworld-howto-videogame

Entry point for any harness working this repo (Cursor cloud agents, Codex, Claude Code).

## On entry

1. **Read `PRD.md` in full before writing a line.** It is the whole spec. Section 0 is the rule that
   settles every disagreement; sections 3 and 4 are hard constraints, not preferences.
2. Work the build order in **PRD §9**, in order, committing after each step.
3. **Stop at P1.** P2 exists in the PRD so it stays out of P1, not as a stretch goal.

## The thing agents get wrong here

This repo inverts the normal objective. **The reader is the user, not the player.** The instinct to
factor out repetition, add an abstraction layer, use a clever idiom, or reach for a library is
*correct on most repos and wrong on this one*. A 15-year-old has to be able to trace the whole file
in fifteen minutes.

Concretely, when you catch yourself about to:

- extract a helper that gets used twice → **don't**, inline reads better
- write a compact one-liner → **don't**, write the boring four lines
- add a dependency, a build step, or a module → **don't**, it's banned in PRD §3
- generalize something for a case that doesn't exist yet → **don't**, it's a teaching artifact

## Low floor, high ceiling

Read **PRD §0a** with §0; it was added after the first student playtest and it is the second
rule that settles arguments. The class is not one student. Some have never played a video game;
some will try to break the file in ten minutes. Both are the audience, and the way to serve both
is to keep every advanced thing **opt-in** — behind a key press, a later section, or a numbered
exercise — so it is never in the way of the student who just wants to recolour the grass.

The line budget is the mechanical half of that rule, so it is now **two numbers, not one**
(PRD §3, §3a):

- **The required read — top of file through section 10 — is 1,200–1,800 lines.** This is the
  floor and it is the number to defend. Currently 1,676.
- **The whole file, optional sections included, is ≤ 2,600 lines.** Currently 2,121.

Anything that takes the file past 1,800 has to earn it by being optional and *provably
removable*: its own numbered section after `10 · BOOT`, with `check-xray-removable.mjs` still
passing. Never spend the 1–10 budget on something a beginner does not need.

Performance is not what these numbers protect — reading time is. It has been measured: the
heaviest frame the file can produce is 0.48 ms of a 16.7 ms budget, under 3%, with ~35×
headroom (PRD §3a). Do not cite performance as a reason to cut lines, and do not do performance
work — §5 still lists it as a non-goal.

## Non-negotiables

- One file: `game.html`. No build. No dependencies. Opens from `file://` with the network off.
- Three maps, four quests, eleven sections. Level one is the village and must stay a
  five-minute playthrough (PRD §5); level two is behind the forest gate and only opens
  after it, which is what keeps that rule true.
- Must run in **Microsoft Edge** — the school's managed devices — and Chrome. Nothing else.
- The two line budgets above · ≤ 100 chars/line · ≤ 40 lines/function.
- The ten sections of PRD §4, in order, each with its numbered banner and its "What to look for" line.
- **RENDER never mutates `state`.** The dev assertion that proves it ships in the file.
- All four deliverables ship together. `game.html` alone is incomplete.

## Before you say it's done

Run the acceptance checklist in **PRD §8** and paste the results into your final message — the grep
results, the line count, the console output, and how long the playthrough took. Do not report
completion against a checklist you didn't actually run.

## Context you don't have

This is a teardown target for a high-school STEAM course. The genre was chosen by a student who
asked how video games are made. Course planning lives in a separate private repo; you don't need
it, and nothing here should assume it.

## Cloud sessions — fetch first

Cloud-agent VMs boot from a prebuilt checkout. Before trusting the prompt paste, run:

```bash
git fetch origin main
git log --oneline HEAD..origin/main
```

If that log is not empty, branch from `origin/main`, not the snapshot. Re-read `PRD.md` and this
file from disk after checkout — parallel Read returns stale content.

## The build-history page — `how.html`

Student-facing time-lapse of how `game.html` got written. Extra, not a fifth deliverable.
First draft is scaffolding: extend a `<article id="phase-N">`, do not rewrite the spine
unless the spine is wrong. Broad strokes, ADEPT, timestamps, why — not transcripts.

## Exit breadcrumb — `HANDOFF.md`

<!-- breadcrumb-convention:v1 -->

Any cloud/app session working in this repo ends by appending a dated entry to `HANDOFF.md` at
this repo's root (create the file if it doesn't exist yet). Newest entry at the bottom.

    ## YYYY-MM-DD — <what you worked on>
    - What changed, in one or two lines.
    - Anything left undone or worth knowing before the next session picks this up.
    - Routing: <who/what should act on this next, or "none">

Desktop agents sweep repos with recent commits on entry and surface new `HANDOFF.md` entries.
