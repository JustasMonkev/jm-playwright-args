// ESM entry: re-exports the CommonJS implementation so both module systems
// share the same pwArg singleton.
export { envKey, decodeEnvArgs, createPwArg, pwArg } from './index.cjs';
