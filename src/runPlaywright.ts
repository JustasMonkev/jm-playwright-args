import { spawn as nodeSpawn } from 'node:child_process';

interface ChildProcessLike {
  once(event: 'close', listener: (code: number | null) => void): unknown;
  once(event: 'error', listener: (error: Error) => void): unknown;
  kill?(signal: NodeJS.Signals): boolean;
}

interface SignalEmitterLike {
  on(signal: NodeJS.Signals, listener: () => void): unknown;
  off(signal: NodeJS.Signals, listener: () => void): unknown;
}

interface SpawnOptions {
  stdio: 'inherit';
  env: NodeJS.ProcessEnv;
  shell: false;
}

type SpawnLike = (command: string, args: readonly string[], options: SpawnOptions) => ChildProcessLike;

export interface RunPlaywrightOptions {
  readonly bin: string;
  readonly args: readonly string[];
  readonly env: Readonly<Record<string, string>>;
  readonly baseEnv?: NodeJS.ProcessEnv;
  readonly signalEmitter?: SignalEmitterLike;
  readonly spawn?: SpawnLike;
}

export type RunPlaywright = (options: RunPlaywrightOptions) => Promise<number>;

const FORWARDED_SIGNALS: readonly NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];

export function runPlaywright(options: RunPlaywrightOptions): Promise<number> {
  const { bin, args, env, baseEnv = process.env } = options;
  const signalEmitter: SignalEmitterLike = options.signalEmitter ?? process;
  const spawn: SpawnLike = options.spawn ?? nodeSpawn;

  return new Promise<number>((resolve, reject) => {
    const child = spawn(bin, args, {
      stdio: 'inherit',
      env: { ...baseEnv, ...env },
      // Never use a shell: arguments must reach Playwright literally, without shell interpretation.
      shell: false,
    });

    const forwarders = FORWARDED_SIGNALS.map((signal) => ({
      signal,
      listener: () => {
        child.kill?.(signal);
      },
    }));
    const cleanup = () => {
      for (const { signal, listener } of forwarders) signalEmitter.off(signal, listener);
    };

    for (const { signal, listener } of forwarders) signalEmitter.on(signal, listener);

    child.once('error', (error) => {
      cleanup();
      reject(error);
    });
    child.once('close', (code) => {
      cleanup();
      resolve(code ?? 1);
    });
  });
}
