import type { CustomArgs } from './parseCli.js';

export const envKey = 'PLAYWRIGHT_ARGS_JSON';

export function encodeEnvArgs(customArgs: CustomArgs): Record<string, string> {
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
  if (!isRecord(value)) return false;

  return Object.entries(value).every(([name, argValue]) => {
    if (!name) return false;

    if (typeof argValue === 'string' || typeof argValue === 'boolean') return true;

    return Array.isArray(argValue) && argValue.every((item) => typeof item === 'string');
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
