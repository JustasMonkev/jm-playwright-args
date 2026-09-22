#!/usr/bin/env node
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodeEnvArgs } from './env.js';
import { isRecord } from './helper.js';
import { parseCli, splitArgv } from './parseCli.js';
import { type ResolveOptions, resolvePlaywrightInvocation } from './resolvePlaywright.js';
import { runPlaywright as defaultRunPlaywright, type RunPlaywright } from './runPlaywright.js';

export interface RunCliOptions extends Omit<ResolveOptions, 'explicitBin'> {
  readonly argv?: readonly string[];
  readonly runPlaywright?: RunPlaywright;
  readonly stdout?: (line: string) => void;
}

const HELP_FLAGS: ReadonlySet<string> = new Set(['--help', '-h']);
const VERSION_FLAGS: ReadonlySet<string> = new Set(['--version', '-v']);
const PACKAGE_JSON_CANDIDATES: readonly string[] = ['../package.json', '../../package.json'];

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
  realpath: (filePath: string) => string = realpathSync,
): boolean {
  if (!argvPath) return false;

  const modulePath = fileURLToPath(moduleUrl);
  return normalizeEntryPath(modulePath, realpath) === normalizeEntryPath(argvPath, realpath);
}

export async function runCli(options: RunCliOptions = {}): Promise<number> {
  const {
    argv = process.argv.slice(2),
    runPlaywright = defaultRunPlaywright,
    stdout = (line) => console.log(line),
    ...resolveOptions
  } = options;
  const { customArgv } = splitArgv(argv);

  if (customArgv.some((arg) => HELP_FLAGS.has(arg))) {
    stdout(helpText);
    return 0;
  }

  if (customArgv.some((arg) => VERSION_FLAGS.has(arg))) {
    stdout(readPackageVersion());
    return 0;
  }

  const { customArgs, playwrightArgs } = parseCli(argv);
  const playwright = resolvePlaywrightInvocation(resolveOptions);

  return runPlaywright({
    bin: playwright.bin,
    args: [...playwright.args, ...playwrightArgs],
    env: encodeEnvArgs(customArgs),
  });
}

function readPackageVersion(): string {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));

  for (const candidate of PACKAGE_JSON_CANDIDATES) {
    try {
      const parsed: unknown = JSON.parse(readFileSync(path.resolve(moduleDir, candidate), 'utf8'));
      if (isRecord(parsed) && typeof parsed.version === 'string') return parsed.version;
    } catch {
      // try next candidate
    }
  }

  return 'unknown';
}

function normalizeEntryPath(filePath: string, realpath: (filePath: string) => string): string {
  try {
    return realpath(filePath);
  } catch {
    return filePath;
  }
}

if (isCliEntry(import.meta.url, process.argv[1])) {
  runCli()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
