import { spawn as nodeSpawn } from 'node:child_process';
import type { EventEmitter } from 'node:events';

type ChildProcessLike = EventEmitter & {
  kill?: (signal: NodeJS.Signals) => boolean;
};

type SignalEmitterLike = {
  on: (signal: NodeJS.Signals, listener: () => void) => unknown;
  off: (signal: NodeJS.Signals, listener: () => void) => unknown;
};

type SpawnOptions = {
  stdio: 'inherit';
  env: NodeJS.ProcessEnv;
  shell: boolean;
};

type SpawnLike = (command: string, args: string[], options: SpawnOptions) => ChildProcessLike;

type RunOptions = {
  bin: string;
  args: string[];
  env: Record<string, string>;
  baseEnv?: NodeJS.ProcessEnv;
  platform?: NodeJS.Platform;
  signalEmitter?: SignalEmitterLike;
  spawn?: SpawnLike;
};

export async function runPlaywright(options: RunOptions): Promise<number> {
  const spawn = options.spawn ?? nodeSpawn;
  const platform = options.platform ?? process.platform;
  const signalEmitter = options.signalEmitter ?? process;

  return await new Promise((resolve, reject) => {
    const child = spawn(options.bin, options.args, {
      stdio: 'inherit',
      env: {
        ...(options.baseEnv ?? process.env),
        ...options.env,
      },
      shell: platform === 'win32',
    });

    const forwardSignal = (signal: NodeJS.Signals) => {
      child.kill?.(signal);
    };
    const forwardSigint = () => forwardSignal('SIGINT');
    const forwardSigterm = () => forwardSignal('SIGTERM');
    const cleanup = () => {
      signalEmitter.off('SIGINT', forwardSigint);
      signalEmitter.off('SIGTERM', forwardSigterm);
    };

    signalEmitter.on('SIGINT', forwardSigint);
    signalEmitter.on('SIGTERM', forwardSigterm);

    child.once('error', (error) => {
      cleanup();
      reject(error);
    });
    child.once('close', (code) => {
      cleanup();
      resolve(typeof code === 'number' ? code : 1);
    });
  });
}
