import { describe, expect, test } from 'vitest';
import { resolvePlaywrightBin, resolvePlaywrightInvocation } from '../src/resolvePlaywright.js';

describe('resolvePlaywrightInvocation', () => {
  test('returns the explicit path when provided', () => {
    expect(resolvePlaywrightInvocation({ explicitBin: '/repo/node_modules/.bin/playwright' })).toEqual({
      bin: '/repo/node_modules/.bin/playwright',
      args: [],
    });
  });

  test('prefers local node_modules binary path under cwd', () => {
    expect(
      resolvePlaywrightInvocation({
        cwd: '/repo',
        exists: (path: string) => path === '/repo/node_modules/.bin/playwright',
        platform: 'darwin',
      }),
    ).toEqual({ bin: '/repo/node_modules/.bin/playwright', args: [] });
  });

  test('runs the local Playwright CLI through node on windows', () => {
    expect(
      resolvePlaywrightInvocation({
        cwd: 'C:\\repo',
        exists: (path: string) => path === 'C:\\repo/node_modules/playwright/cli.js',
        nodePath: 'C:\\node\\node.exe',
        platform: 'win32',
      }),
    ).toEqual({
      bin: 'C:\\node\\node.exe',
      args: ['C:\\repo/node_modules/playwright/cli.js'],
    });
  });

  test('falls back to @playwright/test CLI on windows', () => {
    expect(
      resolvePlaywrightInvocation({
        cwd: 'C:\\repo',
        exists: (path: string) => path === 'C:\\repo/node_modules/@playwright/test/cli.js',
        nodePath: 'C:\\node\\node.exe',
        platform: 'win32',
      }),
    ).toEqual({
      bin: 'C:\\node\\node.exe',
      args: ['C:\\repo/node_modules/@playwright/test/cli.js'],
    });
  });

  test('falls back to playwright when no local binary exists', () => {
    expect(
      resolvePlaywrightInvocation({
        cwd: '/repo',
        exists: () => false,
      }),
    ).toEqual({ bin: 'playwright', args: [] });
  });
});

describe('resolvePlaywrightBin', () => {
  test('returns the executable part of the invocation', () => {
    expect(
      resolvePlaywrightBin({
        cwd: '/repo',
        exists: (path: string) => path === '/repo/node_modules/.bin/playwright',
        platform: 'linux',
      }),
    ).toBe('/repo/node_modules/.bin/playwright');
  });
});
