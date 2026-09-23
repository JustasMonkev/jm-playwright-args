import { describe, expect, test } from 'vitest';
import { parseCli } from '../src/parseCli.js';

describe('parseCli', () => {
  test('splits custom args from playwright args at delimiter', () => {
    expect(parseCli(['--tenant=acme', '--build-path=dist', '--', 'test', '--project=chromium'])).toEqual({
      customArgs: {
        tenant: 'acme',
        'build-path': 'dist',
      },
      playwrightArgs: ['test', '--project=chromium'],
    });
  });

  test('defaults to playwright test when no playwright command is provided', () => {
    expect(parseCli(['--tenant=acme'])).toEqual({
      customArgs: {
        tenant: 'acme',
      },
      playwrightArgs: ['test'],
    });
  });

  test('keeps repeated custom args as arrays', () => {
    expect(parseCli(['--tag=smoke', '--tag=checkout', '--', 'test'])).toEqual({
      customArgs: {
        tag: ['smoke', 'checkout'],
      },
      playwrightArgs: ['test'],
    });
  });

  test('supports boolean custom flags', () => {
    expect(parseCli(['--debug-api', '--', 'test'])).toEqual({
      customArgs: {
        'debug-api': true,
      },
      playwrightArgs: ['test'],
    });
  });

  test('keeps explicit false values as strings for typed readers', () => {
    expect(parseCli(['--debug-api=false', '--', 'test'])).toEqual({
      customArgs: {
        'debug-api': 'false',
      },
      playwrightArgs: ['test'],
    });
  });

  test('keeps empty values and values containing equals signs', () => {
    expect(parseCli(['--empty=', '--token=a=b=c', '--', 'test'])).toEqual({
      customArgs: {
        empty: '',
        token: 'a=b=c',
      },
      playwrightArgs: ['test'],
    });
  });

  test('keeps repeated flags as arrays', () => {
    expect(parseCli(['--debug-api', '--debug-api=false', '--', 'test'])).toEqual({
      customArgs: {
        'debug-api': ['true', 'false'],
      },
      playwrightArgs: ['test'],
    });
  });

  test('treats inherited object names as ordinary arguments', () => {
    const { customArgs } = parseCli(['--constructor=first', '--constructor=second', '--__proto__=safe']);

    expect(Object.hasOwn(customArgs, 'constructor')).toBe(true);
    expect(Object.hasOwn(customArgs, '__proto__')).toBe(true);
    expect(customArgs.constructor).toEqual(['first', 'second']);
    expect(customArgs.__proto__).toBe('safe');
    expect(Object.getPrototypeOf(customArgs)).toBe(Object.prototype);
  });

  test('defaults delimiter-only input to playwright test', () => {
    expect(parseCli(['--'])).toEqual({
      customArgs: {},
      playwrightArgs: ['test'],
    });
  });

  test('rejects positional custom args before delimiter', () => {
    expect(() => parseCli(['tenant=acme', '--', 'test'])).toThrow('Custom argument must start with "--": tenant=acme');
  });

  test('rejects empty custom arg names', () => {
    expect(() => parseCli(['--=value', '--', 'test'])).toThrow('Custom argument name cannot be empty');
  });
});
