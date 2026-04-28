import { EventEmitter } from 'node:events';
import { describe, expect, test, vi } from 'vitest';
import { runPlaywright } from '../src/runPlaywright.js';

describe('runPlaywright', () => {
  test('spawns playwright with provided args and merged env', async () => {
    const child = new EventEmitter();
    const spawn = vi.fn(() => child);

    const exitPromise = runPlaywright({
      bin: 'playwright',
      args: ['test', '--project=chromium'],
      env: { PLAYWRIGHT_ARGS_JSON: '{"tenant":"acme"}' },
      baseEnv: { PATH: '/bin' },
      platform: 'linux',
      spawn,
    });

    child.emit('close', 0);

    await expect(exitPromise).resolves.toBe(0);
    expect(spawn).toHaveBeenCalledWith(
      'playwright',
      ['test', '--project=chromium'],
      expect.objectContaining({
        stdio: 'inherit',
        env: {
          PATH: '/bin',
          PLAYWRIGHT_ARGS_JSON: '{"tenant":"acme"}',
        },
        shell: false,
      }),
    );
  });

  test('uses a shell on windows', async () => {
    const child = new EventEmitter();
    const spawn = vi.fn(() => child);
    const exitPromise = runPlaywright({
      bin: 'playwright.cmd',
      args: ['test'],
      env: {},
      platform: 'win32',
      spawn,
    });

    child.emit('close', 0);

    await expect(exitPromise).resolves.toBe(0);
    expect(spawn).toHaveBeenCalledWith(
      'playwright.cmd',
      ['test'],
      expect.objectContaining({
        shell: true,
      }),
    );
  });

  test('returns 1 when child process closes without an exit code', async () => {
    const child = new EventEmitter();
    const spawn = vi.fn(() => child);
    const exitPromise = runPlaywright({ bin: 'playwright', args: ['test'], env: {}, spawn });

    child.emit('close', null);

    await expect(exitPromise).resolves.toBe(1);
  });

  test('rejects when child process emits an error', async () => {
    const child = new EventEmitter();
    const spawn = vi.fn(() => child);
    const exitPromise = runPlaywright({ bin: 'playwright', args: ['test'], env: {}, spawn });
    const error = new Error('spawn failed');

    child.emit('error', error);

    await expect(exitPromise).rejects.toThrow('spawn failed');
  });

  test('forwards termination signals to child process until it exits', async () => {
    const signalEmitter = new EventEmitter();
    const child = Object.assign(new EventEmitter(), { kill: vi.fn() });
    const spawn = vi.fn(() => child);
    const exitPromise = runPlaywright({ bin: 'playwright', args: ['test'], env: {}, signalEmitter, spawn });

    signalEmitter.emit('SIGTERM');
    child.emit('close', 0);
    await exitPromise;
    signalEmitter.emit('SIGTERM');

    expect(child.kill).toHaveBeenCalledTimes(1);
    expect(child.kill).toHaveBeenCalledWith('SIGTERM');
  });
});
