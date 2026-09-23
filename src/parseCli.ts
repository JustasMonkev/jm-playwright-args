import type { CustomArgs, CustomArgValue, ParsedCli } from './types.js';

const DELIMITER = '--';
const ARG_PREFIX = '--';
const DEFAULT_PLAYWRIGHT_ARGS: readonly string[] = ['test'];

export interface SplitArgv {
  customArgv: string[];
  forwardedArgv: string[];
}

/** Splits argv at the first `--` into custom arguments and arguments forwarded to Playwright. */
export function splitArgv(argv: readonly string[]): SplitArgv {
  const delimiterIndex = argv.indexOf(DELIMITER);
  if (delimiterIndex === -1) return { customArgv: [...argv], forwardedArgv: [] };

  return {
    customArgv: argv.slice(0, delimiterIndex),
    forwardedArgv: argv.slice(delimiterIndex + 1),
  };
}

export function parseCli(argv: readonly string[]): ParsedCli {
  const { customArgv, forwardedArgv } = splitArgv(argv);

  return {
    customArgs: parseCustomArgs(customArgv),
    playwrightArgs: forwardedArgv.length > 0 ? forwardedArgv : [...DEFAULT_PLAYWRIGHT_ARGS],
  };
}

function parseCustomArgs(argv: readonly string[]): CustomArgs {
  // A Map keeps names such as "__proto__" as plain data instead of touching the object prototype.
  const result = new Map<string, CustomArgValue>();

  for (const arg of argv) {
    const { name, value } = parseCustomArg(arg);
    result.set(name, mergeValue(result.get(name), value));
  }

  return Object.fromEntries(result);
}

function parseCustomArg(arg: string): { name: string; value: string | true } {
  if (!arg.startsWith(ARG_PREFIX)) throw new Error(`Custom argument must start with "--": ${arg}`);

  const body = arg.slice(ARG_PREFIX.length);
  const equalsIndex = body.indexOf('=');
  const name = equalsIndex === -1 ? body : body.slice(0, equalsIndex);

  if (!name) throw new Error('Custom argument name cannot be empty');

  return { name, value: equalsIndex === -1 ? true : body.slice(equalsIndex + 1) };
}

function mergeValue(previous: CustomArgValue | undefined, value: string | true): CustomArgValue {
  if (previous === undefined) return value;
  if (Array.isArray(previous)) return [...previous, String(value)];
  return [String(previous), String(value)];
}
