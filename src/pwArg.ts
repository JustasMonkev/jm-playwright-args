import { decodeEnvArgs } from './env.js';
import { parseBooleanValue } from './helper.js';
import type { CustomArgs, CustomArgValue } from './types.js';

export interface ReadOptions<T> {
  /** Value returned when the argument was not passed. Without it, a missing argument throws. */
  readonly default?: T;
}

export interface PwArg {
  /** Returns a defensive copy of every custom argument. */
  raw(): CustomArgs;
  /** Returns whether the argument was passed. */
  has(name: string): boolean;
  /** Reads the argument as a string, using the last value when repeated. */
  string(name: string, options?: ReadOptions<string>): string;
  /** Reads the argument as a finite number, using the last value when repeated. */
  number(name: string, options?: ReadOptions<number>): number;
  /** Reads a bare flag or a `true`/`false` value, using the last value when repeated. */
  boolean(name: string, options?: ReadOptions<boolean>): boolean;
  /** Reads every value of a repeated argument, or a single-item array for one value. */
  array(name: string, options?: ReadOptions<readonly string[]>): string[];
}

type ScalarValue = string | boolean;

export function createPwArg(args: CustomArgs = decodeEnvArgs()): PwArg {
  const lookup = (name: string): CustomArgValue | undefined => (Object.hasOwn(args, name) ? args[name] : undefined);

  return {
    raw: () => cloneArgs(args),
    has: (name) => lookup(name) !== undefined,
    string: (name, options = {}) => readString(name, lookup(name), options.default),
    number: (name, options = {}) => readNumber(name, lookup(name), options.default),
    boolean: (name, options = {}) => readBoolean(name, lookup(name), options.default),
    array: (name, options = {}) => readArray(lookup(name), options.default),
  };
}

export const pwArg: PwArg = createPwArg();

function readString(name: string, value: CustomArgValue | undefined, fallback: string | undefined): string {
  if (value === undefined) return requireFallback(name, fallback);

  return String(lastValue(name, value));
}

function readNumber(name: string, value: CustomArgValue | undefined, fallback: number | undefined): number {
  if (value === undefined) return requireFallback(name, fallback);

  const scalar = lastValue(name, value);
  const parsed = typeof scalar === 'string' ? Number(scalar) : Number.NaN;
  if (!Number.isFinite(parsed)) throw new Error(`Custom argument "${name}" must be a number`);

  return parsed;
}

function readBoolean(name: string, value: CustomArgValue | undefined, fallback: boolean | undefined): boolean {
  if (value === undefined) return requireFallback(name, fallback);

  const parsed = parseBooleanValue(lastValue(name, value));
  if (parsed === undefined) throw new Error(`Custom argument "${name}" must be a boolean`);

  return parsed;
}

function readArray(value: CustomArgValue | undefined, fallback: readonly string[] | undefined): string[] {
  if (value === undefined) return [...(fallback ?? [])];
  if (Array.isArray(value)) return [...value];
  return [String(value)];
}

function lastValue(name: string, value: CustomArgValue): ScalarValue {
  if (!Array.isArray(value)) return value;

  const last = value.at(-1);
  if (last === undefined) throw requiredError(name);

  return last;
}

function requireFallback<T>(name: string, fallback: T | undefined): T {
  if (fallback === undefined) throw requiredError(name);

  return fallback;
}

function requiredError(name: string): Error {
  return new Error(`Custom argument "${name}" is required`);
}

function cloneArgs(args: CustomArgs): CustomArgs {
  return Object.fromEntries(
    Object.entries(args).map(([name, value]) => [name, Array.isArray(value) ? [...value] : value]),
  );
}
