#!/usr/bin/env node
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { encodeEnvArgs } from './env.js';
import { parseCli } from './parseCli.js';
import { resolvePlaywrightBin } from './resolvePlaywright.js';
import { runPlaywright as defaultRunPlaywright } from './runPlaywright.js';

type RunCliOptions = {
  argv?: string[];
  cwd?: string;
  exists?: (path: string) => boolean;
  runPlaywright?: typeof defaultRunPlaywright;
};

export function isCliEntry(
  moduleUrl: string,
  argvPath: string | undefined,
  realpath: (path: string) => string = realpathSync,
): boolean {
  if (!argvPath) {
    return false;
  }

  const modulePath = fileURLToPath(moduleUrl);
  return normalizeEntryPath(modulePath, realpath) === normalizeEntryPath(argvPath, realpath);
}

export async function runCli(options: RunCliOptions = {}): Promise<number> {
  const parsed = parseCli(options.argv ?? process.argv.slice(2));
  const bin = resolvePlaywrightBin({ cwd: options.cwd, exists: options.exists });
  const runPlaywright = options.runPlaywright ?? defaultRunPlaywright;

  return await runPlaywright({
    bin,
    args: parsed.playwrightArgs,
    env: encodeEnvArgs(parsed.customArgs),
  });
}

if (isCliEntry(import.meta.url, process.argv[1])) {
  runCli()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}

function normalizeEntryPath(path: string, realpath: (path: string) => string): string {
  try {
    return realpath(path);
  } catch {
    return path;
  }
}
