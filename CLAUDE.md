# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

This is the demo workspace for the **"Agentic AI for Software Developer"** Udemy course. It contains a
small Node.js calculator app used to show off Claude Code features: CLAUDE.md, subagents, skills, MCP
servers, settings, and hooks.

## Commands

- `npm test` - run the unit tests (built-in `node:test` runner, no dependencies)
- `node --test test/calculator.test.js` - run a single test file
- `node src/calculator.js` - run the demo CLI (e.g. `node src/calculator.js add 2 3`)
- `npm run test:browser` - drive `src/index.html` in a headless Chromium, 11 end-to-end cases
- `npm run test:browser:watch` - the same run in a **visible** window, slowed to 400ms a step
- `npm run test:report` - unit tests plus a JUnit file at `reports/junit.xml`
- `npm run report` - both of the above; the HTML summary lands at `reports/browser-report.html`

The test scripts pass `"test/*.test.js"` explicitly rather than letting `node --test` discover files:
discovery also matches `scripts/browser-test.js`, which would run the whole browser suite inside
`npm test`. A bare `node --test test/` fails on this Node build - it resolves the directory as a
module - so keep the glob.

## Code style

- Plain JavaScript (CommonJS), no build step, no external dependencies.
- Every exported function must have a JSDoc comment.
- Throw `TypeError` for invalid inputs instead of returning `NaN`.

## Workspace layout

- `src/` - application code
- `test/` - tests (one test file per source file, named `<name>.test.js`)
- `.claude/agents/` - project subagents (see `code-reviewer.md`, `test-writer.md`)
- `.claude/skills/` - project skills (see `conventional-commit/`)
- `.claude/settings.json` - shared project settings (permissions, hooks)
- `.claude/hooks/` - scripts the hooks in `settings.json` invoke
- `scripts/browser-test.js` - end-to-end runner for `src/index.html`
- `reports/` - generated output (gitignored); JUnit XML, the HTML report, and per-case screenshots
- `.mcp.json` - MCP servers available to this project

`src/calculator.js` exports `add`, `subtract`, `multiply`, `divide`, `modulo`, and `run` (the entry
point that parses `<operation> <a> <b>`). Operand validation lives in two internal helpers -
`assertFiniteNumber` for the operations and `parseOperand` for string input. Reuse them rather than
writing fresh type checks; in particular `parseOperand` rejects blank strings, which `Number()`
would otherwise coerce to `0`.

`src/index.html` is a browser front end for the same module. `calculator.js` therefore exports via
CommonJS under Node and sets a `calculator` global when loaded by a plain `<script>` tag - keep both
paths working when changing the bottom of that file. The page calls `calculator.run()` so it inherits
the CLI's validation instead of repeating it.

## Rules for Claude

- Always run `npm test` after changing anything in `src/`. A `PostToolUse` hook
  (`.claude/hooks/test-on-src-change.js`) also does this automatically, and reports a failing suite
  back as something to fix.
- New features need a matching test before the task is considered done.
- Do not add npm dependencies without asking first.
