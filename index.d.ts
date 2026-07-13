export type CustomArgs = Record<string, string | boolean | string[]>;

export type ParsedCli = {
  customArgs: CustomArgs;
  playwrightArgs: string[];
};

export type ReadOptions<T> = {
  default?: T;
};

export type PwArg = {
  raw(): CustomArgs;
  has(name: string): boolean;
  string(name: string, options?: ReadOptions<string>): string;
  number(name: string, options?: ReadOptions<number>): number;
  boolean(name: string, options?: ReadOptions<boolean>): boolean;
  array(name: string, options?: ReadOptions<string[]>): string[];
};

export declare const envKey: 'PLAYWRIGHT_ARGS_JSON';

export declare function decodeEnvArgs(env?: Record<string, string | undefined>): CustomArgs;

export declare function createPwArg(args?: CustomArgs): PwArg;

export declare const pwArg: PwArg;
