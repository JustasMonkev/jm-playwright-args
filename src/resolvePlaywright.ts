import { existsSync } from 'node:fs';
import path from 'node:path';

type ResolveOptions = {
  cwd?: string;
  explicitBin?: string;
  exists?: (path: string) => boolean;
  nodePath?: string;
  platform?: NodeJS.Platform;
};

export type PlaywrightInvocation = {
  bin: string;
  args: string[];
};

export function resolvePlaywrightBin(options: ResolveOptions = {}): string {
  return resolvePlaywrightInvocation(options).bin;
}

export function resolvePlaywrightInvocation(options: ResolveOptions = {}): PlaywrightInvocation {
  if (options.explicitBin) return { bin: options.explicitBin, args: [] };

  const cwd = options.cwd ?? process.cwd();
  const exists = options.exists ?? existsSync;
  const platform = options.platform ?? process.platform;

  if (platform === 'win32') {
    const localCli = path.join(cwd, 'node_modules', 'playwright', 'cli.js');
    if (exists(localCli)) return { bin: options.nodePath ?? process.execPath, args: [localCli] };

    const localTestCli = path.join(cwd, 'node_modules', '@playwright', 'test', 'cli.js');
    if (exists(localTestCli)) return { bin: options.nodePath ?? process.execPath, args: [localTestCli] };

    return { bin: 'playwright', args: [] };
  }

  const localBin = path.join(cwd, 'node_modules', '.bin', 'playwright');

  if (exists(localBin)) return { bin: localBin, args: [] };

  return { bin: 'playwright', args: [] };
}
