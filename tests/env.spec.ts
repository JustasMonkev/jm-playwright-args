import { describe, expect, test } from 'vitest';
import { decodeEnvArgs, encodeEnvArgs, envKey } from '../src/env.js';

describe('env transport', () => {
  test('encodes custom args as JSON under stable env key', () => {
    expect(encodeEnvArgs({ tenant: 'acme', 'debug-api': true })).toEqual({
      [envKey]: JSON.stringify({ tenant: 'acme', 'debug-api': true }),
    });
  });

  test('decodes missing env as empty args', () => {
    expect(decodeEnvArgs({})).toEqual({});
  });

  test('decodes valid env JSON', () => {
    expect(decodeEnvArgs({ [envKey]: '{"tenant":"acme"}' })).toEqual({ tenant: 'acme' });
  });

  test('throws a readable error for invalid env JSON', () => {
    expect(() => decodeEnvArgs({ [envKey]: '{broken' })).toThrow('PLAYWRIGHT_ARGS_JSON contains invalid JSON');
  });

  test('throws a readable error for invalid env shapes', () => {
    expect(() => decodeEnvArgs({ [envKey]: 'null' })).toThrow('PLAYWRIGHT_ARGS_JSON contains invalid custom arguments');
    expect(() => decodeEnvArgs({ [envKey]: '[]' })).toThrow('PLAYWRIGHT_ARGS_JSON contains invalid custom arguments');
    expect(() => decodeEnvArgs({ [envKey]: '{"tenant":1}' })).toThrow(
      'PLAYWRIGHT_ARGS_JSON contains invalid custom arguments',
    );
    expect(() => decodeEnvArgs({ [envKey]: '{"tag":["smoke",false]}' })).toThrow(
      'PLAYWRIGHT_ARGS_JSON contains invalid custom arguments',
    );
    expect(() => decodeEnvArgs({ [envKey]: '{"":"acme"}' })).toThrow(
      'PLAYWRIGHT_ARGS_JSON contains invalid custom arguments',
    );
  });
});
