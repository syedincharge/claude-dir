# Agentic AI for Software Developer — demo workspace

A deliberately small Node.js calculator, used as the subject for a tour of Claude Code's
features: `CLAUDE.md`, subagents, skills, hooks, settings, and MCP servers. The app is
simple on purpose — the point is the tooling around it.

No dependencies, no build step. Node 18+ (developed on 22).

## Quick start

```bash
npm test                    # unit tests
node src/calculator.js add 2 3
start src/index.html        # open the browser front end (Windows)
```

## The app

`src/calculator.js` is a single CommonJS module exporting `add`, `subtract`, `multiply`,
`divide`, `modulo`, and `run` — the entry point that parses `<operation> <a> <b>`.

```bash
$ node src/calculator.js divide 9 3
3
$ node src/calculator.js divide 9 0
RangeError: b must not be zero
usage: node src/calculator.js <add|subtract|multiply|divide|modulo> <a> <b>
```

Invalid input throws rather than returning `NaN`: `TypeError` for anything that isn't a
finite number, `RangeError` for a zero divisor. Two internal helpers do the checking —
`assertFiniteNumber` for the operations and `parseOperand` for string input. The second one
exists because `Number('')` is `0`, so a blank operand would otherwise compute silently
instead of being rejected.

`src/index.html` is a browser front end over the same module. It loads `calculator.js` with
a plain `<script>` tag and calls `calculator.run()`, so it inherits the CLI's validation
instead of repeating it. To make that work, the bottom of `calculator.js` exports twice:
`module.exports` under Node, and a `calculator` global in the browser. Keep both paths
working when you change it.

## Testing

| command | what it does |
|---|---|
| `npm test` | 14 unit tests via the built-in `node:test` runner |
| `node --test test/calculator.test.js` | one file |
| `npm run test:browser` | 11 end-to-end cases against `src/index.html`, headless |
| `npm run test:browser:watch` | the same run in a **visible** window, 400ms a step |
| `npm run test:report` | unit tests plus JUnit XML at `reports/junit.xml` |
| `npm run report` | both, with an HTML summary at `reports/browser-report.html` |

The browser runner (`scripts/browser-test.js`) drives real Chromium, writes a screenshot
per case, and captures console errors — a pass with console noise still shows up red in the
report. It finds a browser via `CODEGPT_BROWSER_PATH`, then the newest
`ms-playwright/chromium-*` build, then an installed Chrome or Edge; set that env var to
pin one. `reports/` is gitignored.

Two things about the test scripts worth knowing before you edit them:

- They pass `"test/*.test.js"` explicitly. Bare `node --test` discovery also matches
  `scripts/browser-test.js`, which would run the whole browser suite inside `npm test`.
- `node --test test/` fails on Node 22.22.1 — it resolves the directory as a module — so
  keep the glob rather than "simplifying" it to a directory.

## The Claude Code pieces

This is the part the course is actually about.

- **`CLAUDE.md`** — project instructions, loaded into every session automatically.
- **`.claude/agents/`** — two subagents. `code-reviewer` checks changes against this
  project's conventions and is read-only; `test-writer` writes or extends `node:test`
  coverage including the throw paths.
- **`.claude/skills/conventional-commit/`** — a skill that writes commit messages in
  Conventional Commits format.
- **`.claude/settings.json`** — shared permissions and hooks: `npm` allowed, installs and
  git writes gated behind a prompt, `.env` and `secrets/**` denied outright.
- **`.claude/hooks/test-on-src-change.js`** — a `PostToolUse` hook that runs `npm test`
  whenever a file under `src/` is edited and reports a failing suite back as something to
  fix. It has already earned its keep once: adding `modulo` silently broke a test that used
  `modulo` as its example of an *unknown* operation, and the hook caught it on the spot.
- **`.mcp.json`** — MCP servers for this project: filesystem, context7, memory, playwright.

### A note on the playwright MCP entry

The playwright entry is pinned to `@playwright/mcp@0.0.84` on purpose, and the `-y` matters
too. An unpinned `@latest` forces an npm registry round-trip on every launch — around 11
seconds cold — which blows the 30-second connection budget when several servers start at
once. That is a timeout at session start with no obvious cause, so leave the version pinned
unless you are deliberately upgrading.

Also worth remembering: MCP tools register at **session start only**. Repairing a server
mid-session does not make its tools callable — you need a new session or a `/mcp` reconnect.

## Layout

```
src/          application code
test/         tests, one file per source file, named <name>.test.js
scripts/      browser-test.js — the end-to-end runner
reports/      generated output (gitignored)
.claude/      agents, skills, hooks, settings
```

## Conventions

- Plain JavaScript, CommonJS, no dependencies without asking first.
- JSDoc on every exported function.
- Throw on invalid input; never return `NaN`.
- A new feature isn't done until it has a test.
