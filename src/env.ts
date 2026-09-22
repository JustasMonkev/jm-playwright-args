import { isRecord } from './helper.js';
import type { CustomArgs, CustomArgValue } from './types.js';

export const envKey = 'PLAYWRIGHT_ARGS_JSON';

export function encodeEnvArgs(customArgs: CustomArgs): Record<typeof envKey, string> {
  return {
    [envKey]: JSON.stringify(customArgs),
  };
}

export function decodeEnvArgs(env: NodeJS.ProcessEnv = process.env): CustomArgs {
  const value = env[envKey];
  if (!value) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch (error) {
    throw new Error(`${envKey} contains invalid JSON`, { cause: error });
  }

  if (!isCustomArgs(parsed)) throw new Error(`${envKey} contains invalid custom arguments`);

  return parsed;
}

function isCustomArgs(value: unknown): value is CustomArgs {
  return (
    isRecord(value) && Object.entries(value).every(([name, argValue]) => name !== '' && isCustomArgValue(argValue))
  );
}

function isCustomArgValue(value: unknown): value is CustomArgValue {
  if (typeof value === 'string' || typeof value === 'boolean') return true;

  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}
