/** A single custom argument value: a bare flag, a `--name=value` string, or every value of a repeated argument. */
export type CustomArgValue = string | boolean | string[];

/** Custom arguments keyed by name (without the leading `--`). */
export type CustomArgs = Record<string, CustomArgValue>;

export interface ParsedCli {
  customArgs: CustomArgs;
  playwrightArgs: string[];
}
