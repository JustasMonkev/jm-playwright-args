import { decodeEnvArgs } from './env.js';
import { parseBooleanValue } from './helper.js';
import type { CustomArgs } from './parseCli.js';

type Value = CustomArgs[string];
type ScalarValue = string | boolean;

type ReadOptions<T> = {
  default?: T;
};

export function createPwArg(args: CustomArgs = decodeEnvArgs()) {
  return {
    raw: () => cloneArgs(args),
    has: (name: string) => args[name] !== undefined,
    string: (name: string, options: ReadOptions<string> = {}) => readString(args, name, options),
    number: (name: string, options: ReadOptions<number> = {}) => readNumber(args, name, options),
    boolean: (name: string, options: ReadOptions<boolean> = {}) => readBoolean(args, name, options),
    array: (name: string, options: ReadOptions<string[]> = {}) => readArray(args, name, options),
  };
}

export const pwArg = createPwArg();

function readString(args: CustomArgs, name: string, options: ReadOptions<string>): string {
  return String(readScalarValue(args, name, options.default));
}

function readNumber(args: CustomArgs, name: string, options: ReadOptions<number>): number {
  const value = readString(args, name, options.default === undefined ? {} : { default: String(options.default) });
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`Custom argument "${name}" must be a number`);
  return parsed;
}

function readBoolean(args: CustomArgs, name: string, options: ReadOptions<boolean>): boolean {
  const value = readScalarValue(args, name, options.default);
  const parsed = parseBooleanValue(value);
  if (parsed !== undefined) return parsed;

  throw new Error(`Custom argument "${name}" must be a boolean`);
}

function readArray(args: CustomArgs, name: string, options: ReadOptions<string[]>): string[] {
  const value = args[name];
  if (value === undefined) return [...(options.default ?? [])];
  if (Array.isArray(value)) return [...value];
  return [String(value)];
}

function readScalarValue<T>(args: CustomArgs, name: string, defaultValue: T | undefined): ScalarValue | T {
  const value = readValue(args, name, defaultValue);
  if (Array.isArray(value)) return value[value.length - 1] ?? '';
  return value;
}

function readValue<T>(args: CustomArgs, name: string, defaultValue: T | undefined): Value | T {
  const value = args[name];
  if (value === undefined) {
    if (defaultValue !== undefined) return defaultValue;
    throw new Error(`Custom argument "${name}" is required`);
  }
  return value;
}

function cloneArgs(args: CustomArgs): CustomArgs {
  return Object.fromEntries(
    Object.entries(args).map(([name, value]) => [name, Array.isArray(value) ? [...value] : value]),
  );
}
