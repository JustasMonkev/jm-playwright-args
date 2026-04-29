#!/usr/bin/env node
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
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
  stdout?: (line: string) => void;
};

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
  const argv = options.argv ?? process.argv.slice(2);
  const stdout = options.stdout ?? ((line) => console.log(line));

  if (argv.includes('--help') || argv.includes('-h')) {
    stdout(helpText);
    return 0;
  }

  if (argv.includes('--version') || argv.includes('-v')) {
    stdout(packageVersion);
    return 0;
  }

  const parsed = parseCli(argv);
  const bin = resolvePlaywrightBin({ cwd: options.cwd, exists: options.exists });
  const runPlaywright = options.runPlaywright ?? defaultRunPlaywright;

  return await runPlaywright({
    bin,
    args: parsed.playwrightArgs,
    env: encodeEnvArgs(parsed.customArgs),
  });
}

function readPackageVersion(): string {
  const candidates = ['../package.json', '../../package.json'];
  for (const candidate of candidates) {
    try {
      const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), candidate);
      const parsed = JSON.parse(readFileSync(file, 'utf8')) as { version?: unknown };
      if (typeof parsed.version === 'string') return parsed.version;
    } catch {
      // try next candidate
    }
  }
  return 'unknown';
}

const packageVersion = readPackageVersion();

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
