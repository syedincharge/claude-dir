---
name: conventional-commit
description: Write a commit message for this project in Conventional Commits format. Use when committing, when asked for a commit message, or when a message needs rewriting to the convention.
---

# Conventional commit messages

Produce a commit message in Conventional Commits format for the changes in the working tree, then
commit them once the message is approved.

## How to work

1. Run `git status` and `git diff --staged` (fall back to `git diff` when nothing is staged) to see
   what actually changed. Never write a message from the conversation alone.
2. Classify the change into exactly one type:
   - `feat` - new user-facing functionality
   - `fix` - bug fixes
   - `docs` - documentation updates
   - `test` - test suite improvements
   - `refactor` - code restructuring with no behavior change
   - `chore` - routine tasks, maintenance, tooling
3. Derive the scope from the top-level folder touched: `src`, `test`, `agents`, `skills`, `settings`,
   `mcp`. Omit the scope when a change spans several.
4. Write the subject, and a body only if the change is non-obvious.
5. Show the message and wait for approval before committing.
6. On approval, stage the relevant files explicitly (`git add <file>` — never `git add .`) and commit.
   Do not write a message for a change that is not staged.

If the diff genuinely contains two unrelated changes, say so and propose splitting the commit rather
than inventing a compound type.

## Shape

```
<type>(<scope>): <subject>

<body>
```

- **subject** — imperative mood, lower case, no trailing period, 72 characters or fewer.
  "add modulo operation", not "Added modulo operation." or "adds modulo operation".
- **body** — optional, wrapped at 72 columns. Explain *why* the change was made, not what the diff
  already shows. Omit it entirely for a change whose subject says everything.

## Breaking changes

Append `!` after the type or scope, and add a `BREAKING CHANGE:` footer naming what callers must do:

```
feat(src)!: throw RangeError instead of returning Infinity

BREAKING CHANGE: divide(x, 0) now throws RangeError. Callers that relied
on the Infinity return value must catch it.
```

## Examples

```
feat(src): add modulo operation
```

```
fix(src): reject blank operands with TypeError

Number('') is 0, so an empty input field computed silently instead of
being rejected. Reported from the browser front end in section 4.
```

```
test(test): cover the argument-count branch in run
```
