import { existsSync } from 'node:fs';
import path from 'node:path';

export interface ResolveOptions {
  readonly cwd?: string;
  readonly explicitBin?: string;
  readonly exists?: (filePath: string) => boolean;
  readonly nodePath?: string;
  readonly platform?: NodeJS.Platform;
}

export interface PlaywrightInvocation {
  bin: string;
  args: string[];
}

const GLOBAL_PLAYWRIGHT_BIN = 'playwright';

// Paths are relative to node_modules, in order of preference.
const WINDOWS_CLI_SCRIPTS: readonly (readonly string[])[] = [
  ['playwright', 'cli.js'],
  ['@playwright', 'test', 'cli.js'],
];
const POSIX_BIN: readonly string[] = ['.bin', 'playwright'];

export function resolvePlaywrightBin(options: ResolveOptions = {}): string {
  return resolvePlaywrightInvocation(options).bin;
}

export function resolvePlaywrightInvocation(options: ResolveOptions = {}): PlaywrightInvocation {
  const {
    cwd = process.cwd(),
    explicitBin,
    exists = existsSync,
    nodePath = process.execPath,
    platform = process.platform,
  } = options;

  if (explicitBin) return { bin: explicitBin, args: [] };

  const nodeModules = path.join(cwd, 'node_modules');

  if (platform === 'win32') {
    // The .cmd shim in node_modules/.bin needs a shell, so run the CLI script through node instead.
    const cliScript = WINDOWS_CLI_SCRIPTS.map((segments) => path.join(nodeModules, ...segments)).find((candidate) =>
      exists(candidate),
    );
    if (cliScript) return { bin: nodePath, args: [cliScript] };

    return { bin: GLOBAL_PLAYWRIGHT_BIN, args: [] };
  }

  const localBin = path.join(nodeModules, ...POSIX_BIN);
  if (exists(localBin)) return { bin: localBin, args: [] };

  return { bin: GLOBAL_PLAYWRIGHT_BIN, args: [] };
}
