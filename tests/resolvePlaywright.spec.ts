import { describe, expect, test } from 'vitest';
import { resolvePlaywrightBin } from '../src/resolvePlaywright.js';

describe('resolvePlaywrightBin', () => {
  test('returns the explicit path when provided', () => {
    expect(resolvePlaywrightBin({ explicitBin: '/repo/node_modules/.bin/playwright' })).toBe(
      '/repo/node_modules/.bin/playwright',
    );
  });

  test('prefers local node_modules binary path under cwd', () => {
    expect(
      resolvePlaywrightBin({
        cwd: '/repo',
        exists: (path: string) => path === '/repo/node_modules/.bin/playwright',
        platform: 'darwin',
      }),
    ).toBe('/repo/node_modules/.bin/playwright');
  });

  test('uses cmd extension on windows', () => {
    expect(
      resolvePlaywrightBin({
        cwd: 'C:\\repo',
        exists: (path: string) => path === 'C:\\repo/node_modules/.bin/playwright.cmd',
        platform: 'win32',
      }),
    ).toBe('C:\\repo/node_modules/.bin/playwright.cmd');
  });

  test('falls back to playwright when no local binary exists', () => {
    expect(
      resolvePlaywrightBin({
        cwd: '/repo',
        exists: () => false,
      }),
    ).toBe('playwright');
  });
});
