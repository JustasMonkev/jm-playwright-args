export type CustomArgs = Record<string, string | boolean | string[]>;

export type ParsedCli = {
  customArgs: CustomArgs;
  playwrightArgs: string[];
};

export function parseCli(argv: string[]): ParsedCli {
  const delimiterIndex = argv.indexOf('--');
  const customArgv = delimiterIndex === -1 ? argv : argv.slice(0, delimiterIndex);
  const forwarded = delimiterIndex === -1 ? [] : argv.slice(delimiterIndex + 1);

  return {
    customArgs: parseCustomArgs(customArgv),
    playwrightArgs: forwarded.length ? forwarded : ['test'],
  };
}

function parseCustomArgs(argv: string[]): CustomArgs {
  const result: CustomArgs = {};

  for (const arg of argv) {
    if (!arg.startsWith('--')) throw new Error(`Custom argument must start with "--": ${arg}`);

    const withoutPrefix = arg.slice(2);
    const equalsIndex = withoutPrefix.indexOf('=');
    const name = equalsIndex === -1 ? withoutPrefix : withoutPrefix.slice(0, equalsIndex);
    const value: string | boolean = equalsIndex === -1 ? true : withoutPrefix.slice(equalsIndex + 1);

    if (!name) throw new Error('Custom argument name cannot be empty');

    const previous = result[name];
    if (previous === undefined) result[name] = value;
    else if (Array.isArray(previous)) previous.push(String(value));
    else result[name] = [String(previous), String(value)];
  }

  return result;
}
