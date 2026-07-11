#!/usr/bin/env node
// npm launcher for the Rust `pw-args` binary. Finds a compiled binary
// (or falls back to `cargo run`), forwards argv, env, signals and the
// exit code, and tells the binary which Node to use on Windows via
// PW_ARGS_NODE (the `process.execPath` default of the original CLI).
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const exe = process.platform === 'win32' ? '.exe' : '';
const args = process.argv.slice(2);

const [bin, binArgs] = resolveInvocation();
const child = spawn(bin, [...binArgs, ...args], {
  stdio: 'inherit',
  env: { ...process.env, PW_ARGS_NODE: process.execPath },
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

function resolveInvocation() {
  const candidates = [
    process.env.PW_ARGS_BIN,
    path.join(packageRoot, 'target', 'release', `pw-args${exe}`),
    path.join(packageRoot, 'target', 'debug', `pw-args${exe}`),
  ];
  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) return [candidate, []];
  }

  // No compiled binary yet: build-and-run through cargo.
  const manifest = path.join(packageRoot, 'Cargo.toml');
  return ['cargo', ['run', '--quiet', '--release', '--manifest-path', manifest, '--bin', 'pw-args', '--']];
}
