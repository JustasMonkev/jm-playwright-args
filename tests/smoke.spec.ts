import { describe, expect, test } from 'vitest';
import { pwArg } from '../src/index.js';

describe('public API', () => {
  test('exports pwArg helper', () => {
    expect(pwArg).toBeDefined();
    expect(typeof pwArg.raw).toBe('function');
  });
});
