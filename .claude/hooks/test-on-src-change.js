'use strict';

// PostToolUse hook: runs `npm test` after Claude edits a file under src/.
// Claude Code pipes the tool call as JSON on stdin; everything else is ignored
// so that editing docs or tests does not trigger the suite.

const { spawnSync } = require('node:child_process');

let input = '';

process.stdin.on('data', (chunk) => {
  input += chunk;
});

process.stdin.on('end', () => {
  let filePath = '';
  try {
    filePath = JSON.parse(input).tool_input?.file_path ?? '';
  } catch {
    process.exit(0); // Not JSON we understand — stay out of the way.
  }

  if (!/[\\/]src[\\/]/.test(filePath)) {
    process.exit(0);
  }

  console.log(`[hook] ${filePath} changed under src/ — running npm test`);
  const result = spawnSync('npm', ['test'], { stdio: 'inherit', shell: true });

  // Exit code 2 feeds the failure back to Claude as something to fix.
  process.exit(result.status === 0 ? 0 : 2);
});
