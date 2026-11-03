'use strict';

// End-to-end tests for src/index.html, driven through a real Chromium.
//
//   node scripts/browser-test.js            headless, writes reports/
//   node scripts/browser-test.js --headed   opens a visible window you can watch
//   node scripts/browser-test.js --headed --slow 600
//
// Chromium comes from patchright, which ships inside the CodeGPT editor
// extension — there is no npm dependency to install.

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createRequire } = require('node:module');
const { pathToFileURL } = require('node:url');

const ROOT = path.join(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'reports');
const SHOT_DIR = path.join(REPORT_DIR, 'screenshots');
const PAGE_URL = pathToFileURL(path.join(ROOT, 'src', 'index.html')).href;

/**
 * Reads a flag from argv.
 * @param {string} name - The flag name, without leading dashes.
 * @returns {boolean} Whether the flag is present.
 */
function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

/**
 * Reads the value following a flag.
 * @param {string} name - The flag name, without leading dashes.
 * @param {number} fallback - Value to use when the flag is absent.
 * @returns {number} The parsed value, or the fallback.
 */
function numericFlag(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) {
    return fallback;
  }
  const parsed = Number(process.argv[index + 1]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const byVersion = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

/**
 * Finds patchright's Chromium. Mirrors the browser-automation skill's lookup:
 * never pin the extension version directory, glob and take the newest.
 * @returns {object} Patchright's `chromium` namespace.
 * @throws {Error} If patchright cannot be resolved from any known location.
 */
function resolveChromium() {
  const roots = [];
  const add = (dir) => {
    if (dir && !roots.includes(dir)) {
      roots.push(dir.endsWith(path.sep) ? dir : dir + path.sep);
    }
  };

  add(process.env.CODEGPT_RUNTIME_MODULES);
  try {
    const home = process.env.CODEGPT_HOME || path.join(os.homedir(), '.codegpt');
    add(JSON.parse(fs.readFileSync(path.join(home, 'runtime.json'), 'utf8')).modulesRoot);
  } catch {
    // No runtime.json — fall through to the editor extension folders.
  }

  const editorDirs = ['.vscode', '.vscode-insiders', '.vscode-oss', '.cursor', '.windsurf'];
  for (const dir of editorDirs) {
    const base = path.join(os.homedir(), dir, 'extensions');
    if (!fs.existsSync(base)) {
      continue;
    }
    const newest = fs
      .readdirSync(base)
      .filter((d) => d.startsWith('danielsanmedium.dscodegpt-'))
      .sort(byVersion)
      .pop();
    if (newest) {
      add(path.join(base, newest, 'standalone'));
    }
  }
  add(ROOT);

  for (const root of roots) {
    try {
      const mod = createRequire(root)('patchright');
      const chromium = mod?.chromium ?? mod?.default?.chromium;
      if (chromium) {
        return chromium;
      }
    } catch {
      // Try the next root.
    }
  }
  throw new Error(`Could not resolve patchright. Looked in:\n  ${roots.join('\n  ')}`);
}

/**
 * Finds a Chromium-based browser binary. Passing one explicitly is what keeps
 * headless mode off the separate chrome-headless-shell download.
 * @returns {string|undefined} Path to a browser, or undefined to let patchright choose.
 */
function resolveBrowserPath() {
  if (process.env.CODEGPT_BROWSER_PATH) {
    return process.env.CODEGPT_BROWSER_PATH;
  }

  const pinned = path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright');
  if (fs.existsSync(pinned)) {
    const newest = fs
      .readdirSync(pinned)
      .filter((d) => d.startsWith('chromium-'))
      .sort(byVersion)
      .pop();
    if (newest) {
      const exe = path.join(pinned, newest, 'chrome-win64', 'chrome.exe');
      if (fs.existsSync(exe)) {
        return exe;
      }
    }
  }

  const installed = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  ];
  return installed.find((p) => fs.existsSync(p));
}

/**
 * @typedef {object} Case
 * @property {string} name - Sentence describing the behavior under test.
 * @property {string} a - Text typed into the first operand field.
 * @property {string} operation - Value of the operation select.
 * @property {string} b - Text typed into the second operand field.
 * @property {string} [result] - Expected `#result` text.
 * @property {string} [error] - Expected `#error` text.
 */

/** @type {Case[]} */
const CASES = [
  { name: 'adds two numbers', a: '2', operation: 'add', b: '3', result: '2 + 3 = 5' },
  { name: 'subtracts two numbers', a: '9', operation: 'subtract', b: '4', result: '9 - 4 = 5' },
  { name: 'subtracts to a negative result', a: '4', operation: 'subtract', b: '9', result: '4 - 9 = -5' },
  { name: 'multiplies two numbers', a: '6', operation: 'multiply', b: '7', result: '6 * 7 = 42' },
  { name: 'divides evenly', a: '9', operation: 'divide', b: '3', result: '9 / 3 = 3' },
  { name: 'divides to a fraction', a: '1', operation: 'divide', b: '8', result: '1 / 8 = 0.125' },
  { name: 'divides by a negative number', a: '9', operation: 'divide', b: '-3', result: '9 / -3 = -3' },
  { name: 'returns a remainder', a: '10', operation: 'modulo', b: '3', result: '10 % 3 = 1' },
  {
    name: 'rejects division by zero',
    a: '5',
    operation: 'divide',
    b: '0',
    error: 'RangeError: b must not be zero',
  },
  {
    name: 'rejects modulo by zero',
    a: '5',
    operation: 'modulo',
    b: '0',
    error: 'RangeError: b must not be zero',
  },
  {
    name: 'rejects blank input instead of coercing to zero',
    a: '',
    operation: 'add',
    b: '3',
    error: 'TypeError: a must be a finite number, got ""',
  },
];

/**
 * Runs one case against the open page.
 * @param {object} page - The patchright page.
 * @param {Case} testCase - The case to run.
 * @param {number} index - Position in the run, used to name the screenshot.
 * @returns {Promise<object>} The outcome, including actual values and a screenshot name.
 */
async function runCase(page, testCase, index) {
  await page.fill('#num1', testCase.a);
  await page.selectOption('#operation', testCase.operation);
  await page.fill('#num2', testCase.b);
  await page.click('#calculate');

  // calculate() blanks both nodes first, so wait for either to be filled in.
  await page.waitForFunction(() => {
    const result = document.querySelector('#result').textContent.trim();
    const error = document.querySelector('#error').textContent.trim();
    return result !== '' || error !== '';
  });

  const actualResult = (await page.locator('#result').innerText()).trim();
  const actualError = (await page.locator('#error').innerText()).trim();

  const shot = `${String(index + 1).padStart(2, '0')}-${testCase.operation}.png`;
  await page.screenshot({ path: path.join(SHOT_DIR, shot) });

  const expectedResult = testCase.result ?? '';
  const expectedError = testCase.error ?? '';
  return {
    name: testCase.name,
    input: `${testCase.a || '(blank)'} ${testCase.operation} ${testCase.b || '(blank)'}`,
    expected: expectedError || expectedResult,
    actual: actualError || actualResult,
    passed: actualResult === expectedResult && actualError === expectedError,
    shot,
  };
}

/**
 * Escapes text for safe inclusion in HTML.
 * @param {string} text - The raw text.
 * @returns {string} The escaped text.
 */
function escapeHtml(text) {
  return String(text).replace(
    /[&<>"]/g,
    (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch],
  );
}

/**
 * Writes the HTML report.
 * @param {object[]} results - One entry per case.
 * @param {string[]} consoleErrors - Console errors captured during the run.
 * @returns {string} Path to the written report.
 */
function writeReport(results, consoleErrors) {
  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;
  const rows = results
    .map(
      (r) => `      <tr class="${r.passed ? 'pass' : 'fail'}">
        <td>${r.passed ? '&#10003;' : '&#10007;'}</td>
        <td>${escapeHtml(r.name)}</td>
        <td class="input"><code>${escapeHtml(r.input)}</code></td>
        <td><code>${escapeHtml(r.expected)}</code></td>
        <td><code>${escapeHtml(r.actual)}</code></td>
        <td><a href="screenshots/${r.shot}">view</a></td>
      </tr>`,
    )
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Calculator browser report</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: system-ui, sans-serif; max-width: 60rem; margin: 2rem auto; padding: 0 1rem; }
  h1 { margin-bottom: 0.25rem; }
  .meta { color: #666; margin-bottom: 1.5rem; }
  .tally { font-size: 1.1rem; font-weight: bold; margin-bottom: 1rem; }
  .ok { color: #14794a; }
  .bad { color: #b3261e; }
  table { border-collapse: collapse; width: 100%; }
  th, td { text-align: left; padding: 0.5rem 0.6rem; border-bottom: 1px solid #8884; vertical-align: top; }
  th { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.04em; color: #666; }
  tr.fail td { background: #b3261e18; }
  td.input { white-space: nowrap; }
  code { font-size: 0.9em; }
  footer { margin-top: 2rem; color: #666; font-size: 0.9rem; }
</style>
</head>
<body>
  <h1>Calculator browser report</h1>
  <div class="meta">src/index.html &middot; ${escapeHtml(new Date().toISOString())}</div>
  <div class="tally">
    <span class="${failed === 0 ? 'ok' : 'bad'}">${passed}/${results.length} passed</span>
    ${failed > 0 ? `<span class="bad"> &middot; ${failed} failed</span>` : ''}
    &middot; ${consoleErrors.length} console error(s)
  </div>
  <table>
    <thead>
      <tr><th></th><th>Behavior</th><th>Input</th><th>Expected</th><th>Actual</th><th>Shot</th></tr>
    </thead>
    <tbody>
${rows}
    </tbody>
  </table>
  ${
    consoleErrors.length > 0
      ? `<h2>Console errors</h2><pre>${escapeHtml(consoleErrors.join('\n'))}</pre>`
      : ''
  }
  <footer>Generated by scripts/browser-test.js</footer>
</body>
</html>
`;

  const target = path.join(REPORT_DIR, 'browser-report.html');
  fs.writeFileSync(target, html);
  return target;
}

async function main() {
  const headed = hasFlag('headed');
  const slowMo = numericFlag('slow', headed ? 400 : 0);

  fs.mkdirSync(SHOT_DIR, { recursive: true });

  const chromium = resolveChromium();
  const executablePath = resolveBrowserPath();
  const browser = await chromium.launch({
    headless: !headed,
    slowMo,
    ...(executablePath ? { executablePath } : {}),
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage();

  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => consoleErrors.push(String(error)));

  await page.goto(PAGE_URL);

  const results = [];
  for (const [index, testCase] of CASES.entries()) {
    results.push(await runCase(page, testCase, index));
  }

  if (headed) {
    // Give the watcher a moment to see the final state before the window closes.
    await page.waitForTimeout(1500);
  }
  await browser.close();

  const reportPath = writeReport(results, consoleErrors);

  for (const r of results) {
    console.log(`${r.passed ? 'ok  ' : 'FAIL'} ${r.name}`);
    if (!r.passed) {
      console.log(`     expected: ${r.expected}`);
      console.log(`     actual:   ${r.actual}`);
    }
  }
  const failed = results.filter((r) => !r.passed).length;
  console.log(`\n${results.length - failed}/${results.length} passed, ${consoleErrors.length} console error(s)`);
  console.log(`report: ${reportPath}`);

  process.exitCode = failed === 0 && consoleErrors.length === 0 ? 0 : 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
