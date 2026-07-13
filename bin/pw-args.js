#!/usr/bin/env node
// npm launcher for `pw-args`. Prefers the compiled Rust binary (PW_ARGS_BIN,
// then target/release, then target/debug), builds it through cargo when a
// toolchain is available, and otherwise falls back to a pure-JS port of the
// CLI so fresh npm installs work without Rust. Forwards argv, env, signals
// and the exit code, and exports PW_ARGS_NODE (this Node's process.execPath)
// so the Rust binary can launch a local Playwright CLI without PATH lookup.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Deliberately not imported from ../index.js: loading the reader would
// decode any inherited PLAYWRIGHT_ARGS_JSON at startup and crash the
// launcher on stale/malformed values before it can overwrite them.
const envKey = 'PLAYWRIGHT_ARGS_JSON';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);

function main() {
  const rustInvocation = resolveRustInvocation();
  if (rustInvocation) {
    runChild(rustInvocation.bin, [...rustInvocation.args, ...args]);
  } else {
    runJsCli();
  }
}

function resolveRustInvocation() {
  if (process.env.PW_ARGS_FORCE_JS === '1') return undefined;

  const exe = process.platform === 'win32' ? '.exe' : '';
  const candidates = [
    process.env.PW_ARGS_BIN,
    path.join(packageRoot, 'target', 'release', `pw-args${exe}`),
    path.join(packageRoot, 'target', 'debug', `pw-args${exe}`),
  ];
  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) return { bin: candidate, args: [] };
  }

  const cargoAvailable = spawnSync('cargo', ['--version'], { stdio: 'ignore', shell: false }).status === 0;
  if (cargoAvailable) {
    const manifest = path.join(packageRoot, 'Cargo.toml');
    return { bin: 'cargo', args: ['run', '--quiet', '--release', '--manifest-path', manifest, '--bin', 'pw-args', '--'] };
  }

  return undefined;
}

// ---- Pure-JS fallback: a direct port of the original cli.ts flow. ----

const helpText = `Usage: pw-args [custom args] -- [playwright args]

Everything before "--" is parsed as custom arguments and forwarded to
Playwright config and tests via the PLAYWRIGHT_ARGS_JSON env variable.
Everything after "--" is passed unchanged to the Playwright CLI.

Options:
  -h, --help     Show this help and exit.
  -v, --version  Print the package version and exit.

Examples:
  pw-args --tenant=acme -- test --project=chromium
  pw-args --tag=smoke --tag=checkout -- test --grep @checkout
`;

function runJsCli() {
  const delimiterIndex = args.indexOf('--');
  const customArgv = delimiterIndex === -1 ? args : args.slice(0, delimiterIndex);
  const forwarded = delimiterIndex === -1 ? [] : args.slice(delimiterIndex + 1);

  if (customArgv.includes('--help') || customArgv.includes('-h')) {
    console.log(helpText);
    return;
  }
  if (customArgv.includes('--version') || customArgv.includes('-v')) {
    console.log(JSON.parse(readFileSync(path.join(packageRoot, 'package.json'), 'utf8')).version);
    return;
  }

  let customArgs;
  try {
    customArgs = parseCustomArgs(customArgv);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return;
  }

  const playwright = resolvePlaywright();
  const playwrightArgs = forwarded.length ? forwarded : ['test'];
  runChild(playwright.bin, [...playwright.args, ...playwrightArgs], { [envKey]: JSON.stringify(customArgs) });
}

function parseCustomArgs(argv) {
  const result = {};

  for (const arg of argv) {
    if (!arg.startsWith('--')) throw new Error(`Custom argument must start with "--": ${arg}`);

    const withoutPrefix = arg.slice(2);
    const equalsIndex = withoutPrefix.indexOf('=');
    const name = equalsIndex === -1 ? withoutPrefix : withoutPrefix.slice(0, equalsIndex);
    const value = equalsIndex === -1 ? true : withoutPrefix.slice(equalsIndex + 1);

    if (!name) throw new Error('Custom argument name cannot be empty');

    const previous = result[name];
    if (previous === undefined) result[name] = value;
    else if (Array.isArray(previous)) previous.push(String(value));
    else result[name] = [String(previous), String(value)];
  }

  return result;
}

function resolvePlaywright() {
  const cwd = process.cwd();

  if (process.platform === 'win32') {
    for (const cli of ['node_modules/playwright/cli.js', 'node_modules/@playwright/test/cli.js']) {
      const localCli = path.join(cwd, cli);
      if (existsSync(localCli)) return { bin: process.execPath, args: [localCli] };
    }
    return { bin: 'playwright', args: [] };
  }

  const localBin = path.join(cwd, 'node_modules', '.bin', 'playwright');
  if (existsSync(localBin)) return { bin: localBin, args: [] };
  return { bin: 'playwright', args: [] };
}

// ---- Shared child plumbing (signals, env, exit code). ----

function runChild(bin, childArgs, extraEnv = {}) {
  const child = spawn(bin, childArgs, {
    stdio: 'inherit',
    env: { ...process.env, PW_ARGS_NODE: process.execPath, ...extraEnv },
    shell: false,
  });

  const forwardSigint = () => child.kill('SIGINT');
  const forwardSigterm = () => child.kill('SIGTERM');
  const cleanup = () => {
    process.off('SIGINT', forwardSigint);
    process.off('SIGTERM', forwardSigterm);
  };

  process.on('SIGINT', forwardSigint);
  process.on('SIGTERM', forwardSigterm);

  child.once('error', (error) => {
    cleanup();
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
  child.once('close', (code) => {
    cleanup();
    process.exitCode = typeof code === 'number' ? code : 1;
  });
}

main();
