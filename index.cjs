// Node-side reader for Playwright configs and tests. The CLI itself is the
// Rust `pw-args` binary; this dependency-free module only decodes what the
// binary put into PLAYWRIGHT_ARGS_JSON.
//
// Implemented as CommonJS so `require('jm-playwright-args')` works on every
// supported Node release; `index.js` re-exports it for ESM consumers.

const envKey = 'PLAYWRIGHT_ARGS_JSON';

function decodeEnvArgs(env = process.env) {
  const value = env[envKey];
  if (!value) return {};

  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch (error) {
    throw new Error(`${envKey} contains invalid JSON`, { cause: error });
  }

  if (!isCustomArgs(parsed)) throw new Error(`${envKey} contains invalid custom arguments`);

  return parsed;
}

function createPwArg(args = decodeEnvArgs()) {
  return {
    raw: () => cloneArgs(args),
    has: (name) => args[name] !== undefined,
    string: (name, options = {}) => String(readScalarValue(args, name, options.default)),
    number: (name, options = {}) => readNumber(args, name, options),
    boolean: (name, options = {}) => readBoolean(args, name, options),
    array: (name, options = {}) => readArray(args, name, options),
  };
}

const pwArg = createPwArg();

function readNumber(args, name, options) {
  if (args[name] === undefined && options.default !== undefined) return options.default;

  const value = readScalarValue(args, name, undefined);
  if (typeof value !== 'string') throw new Error(`Custom argument "${name}" must be a number`);

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`Custom argument "${name}" must be a number`);
  return parsed;
}

function readBoolean(args, name, options) {
  const value = readScalarValue(args, name, options.default);
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;

  throw new Error(`Custom argument "${name}" must be a boolean`);
}

function readArray(args, name, options) {
  const value = args[name];
  if (value === undefined) return [...(options.default ?? [])];
  if (Array.isArray(value)) return [...value];
  return [String(value)];
}

function readScalarValue(args, name, defaultValue) {
  const value = args[name] === undefined ? defaultValue : args[name];
  if (value === undefined) throw new Error(`Custom argument "${name}" is required`);
  if (!Array.isArray(value)) return value;

  const last = value[value.length - 1];
  if (last === undefined) throw new Error(`Custom argument "${name}" is required`);
  return last;
}

function cloneArgs(args) {
  return Object.fromEntries(
    Object.entries(args).map(([name, value]) => [name, Array.isArray(value) ? [...value] : value]),
  );
}

function isCustomArgs(value) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;

  return Object.entries(value).every(([name, argValue]) => {
    if (!name) return false;
    if (typeof argValue === 'string' || typeof argValue === 'boolean') return true;
    return Array.isArray(argValue) && argValue.every((item) => typeof item === 'string');
  });
}

module.exports = { envKey, decodeEnvArgs, createPwArg, pwArg };
