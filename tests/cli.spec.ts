import { describe, expect, test, vi } from 'vitest';
import { isCliEntry, runCli } from '../src/cli.js';
import { envKey } from '../src/env.js';

describe('runCli', () => {
  test('parses custom args, resolves playwright, and returns child exit code', async () => {
    const runPlaywright = vi.fn(async () => 7);

    const exitCode = await runCli({
      argv: ['--tenant=acme', '--', 'test', '--project=chromium'],
      cwd: '/repo',
      exists: () => false,
      runPlaywright,
    });

    expect(exitCode).toBe(7);
    expect(runPlaywright).toHaveBeenCalledWith({
      bin: 'playwright',
      args: ['test', '--project=chromium'],
      env: { [envKey]: '{"tenant":"acme"}' },
    });
  });

  test('defaults to playwright test when no forwarded command is present', async () => {
    const runPlaywright = vi.fn(async () => 0);

    await runCli({
      argv: ['--tenant=acme'],
      cwd: '/repo',
      exists: () => false,
      runPlaywright,
    });

    expect(runPlaywright).toHaveBeenCalledWith(
      expect.objectContaining({
        args: ['test'],
      }),
    );
  });
});

describe('isCliEntry', () => {
  test('treats npm bin symlinks as the CLI entrypoint', () => {
    const realpath = (value: string) => {
      if (value === '/repo/node_modules/.bin/pw-args') {
        return '/repo/node_modules/playwright-args/dist/cli.js';
      }
      return value;
    };

    expect(
      isCliEntry('file:///repo/node_modules/playwright-args/dist/cli.js', '/repo/node_modules/.bin/pw-args', realpath),
    ).toBe(true);
  });

  test('does not treat unrelated files as the CLI entrypoint', () => {
    expect(
      isCliEntry(
        'file:///repo/node_modules/playwright-args/dist/cli.js',
        '/repo/scripts/run.js',
        (value: string) => value,
      ),
    ).toBe(false);
  });
});
