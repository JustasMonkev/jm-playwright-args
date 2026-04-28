import { describe, expect, test } from 'vitest';
import { createPwArg } from '../src/pwArg.js';

describe('pwArg helper', () => {
  test('reads string args with defaults', () => {
    const pwArg = createPwArg({ tenant: 'acme' });
    expect(pwArg.string('tenant')).toBe('acme');
    expect(pwArg.string('missing', { default: 'local' })).toBe('local');
  });

  test('reads number args and rejects non-numeric values', () => {
    const pwArg = createPwArg({ retries: '2', broken: 'x' });
    expect(pwArg.number('retries')).toBe(2);
    expect(() => pwArg.number('broken')).toThrow('Custom argument "broken" must be a number');
  });

  test('reads boolean args from flags and string values', () => {
    const pwArg = createPwArg({ 'debug-api': true, headed: 'false' });
    expect(pwArg.boolean('debug-api')).toBe(true);
    expect(pwArg.boolean('headed')).toBe(false);
  });

  test('rejects invalid boolean string values', () => {
    const pwArg = createPwArg({ headed: 'yes' });
    expect(() => pwArg.boolean('headed')).toThrow('Custom argument "headed" must be a boolean');
  });

  test('reads repeated args as arrays', () => {
    const pwArg = createPwArg({ tag: ['smoke', 'checkout'], single: 'one' });
    expect(pwArg.array('tag')).toEqual(['smoke', 'checkout']);
    expect(pwArg.array('single')).toEqual(['one']);
  });

  test('uses the last repeated value for scalar readers', () => {
    const pwArg = createPwArg({
      tenant: ['preview', 'prod'],
      retries: ['1', '3'],
      headed: ['true', 'false'],
    });

    expect(pwArg.string('tenant')).toBe('prod');
    expect(pwArg.number('retries')).toBe(3);
    expect(pwArg.boolean('headed')).toBe(false);
  });

  test('returns defensive copies for raw and array values', () => {
    const pwArg = createPwArg({ tag: ['smoke'] });

    const raw = pwArg.raw();
    (raw.tag as string[]).push('mutated');
    expect(pwArg.array('tag')).toEqual(['smoke']);

    const tags = pwArg.array('tag');
    tags.push('mutated-again');
    expect(pwArg.array('tag')).toEqual(['smoke']);
  });

  test('returns defensive copies for array defaults', () => {
    const defaultTags = ['local'];
    const pwArg = createPwArg({});

    const tags = pwArg.array('tag', { default: defaultTags });
    tags.push('mutated');

    expect(defaultTags).toEqual(['local']);
    expect(pwArg.array('tag', { default: defaultTags })).toEqual(['local']);
  });

  test('exposes raw args and has checks', () => {
    const pwArg = createPwArg({ tenant: 'acme' });
    expect(pwArg.raw()).toEqual({ tenant: 'acme' });
    expect(pwArg.has('tenant')).toBe(true);
    expect(pwArg.has('missing')).toBe(false);
  });

  test('throws when required args are missing', () => {
    const pwArg = createPwArg({});
    expect(() => pwArg.string('tenant')).toThrow('Custom argument "tenant" is required');
  });
});
