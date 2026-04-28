import { existsSync } from 'node:fs';
import path from 'node:path';

type ResolveOptions = {
  cwd?: string;
  explicitBin?: string;
  exists?: (path: string) => boolean;
  platform?: NodeJS.Platform;
};

export function resolvePlaywrightBin(options: ResolveOptions = {}): string {
  if (options.explicitBin) return options.explicitBin;

  const cwd = options.cwd ?? process.cwd();
  const exists = options.exists ?? existsSync;
  const platform = options.platform ?? process.platform;
  const executable = platform === 'win32' ? 'playwright.cmd' : 'playwright';
  const localBin = path.join(cwd, 'node_modules', '.bin', executable);

  if (exists(localBin)) return localBin;

  return 'playwright';
}
