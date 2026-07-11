# jm-playwright-args

> **Note:** Playwright now supports custom CLI arguments natively as of [playwright#40850](https://github.com/microsoft/playwright/pull/40850). If you are on the latest Playwright version, you may not need this package. `jm-playwright-args` remains useful if you need to stay on an older version or prefer the typed accessor API (`pwArg.string`, `pwArg.number`, etc.).

Pass custom command-line arguments into Playwright config and tests without patching Playwright.

## Install

```bash
npm install -D jm-playwright-args @playwright/test
cargo build --release   # builds the pw-args CLI at target/release/pw-args
```

The npm package ships the Node-side `pwArg` reader used by Playwright configs and tests; the `pw-args` CLI itself is the Rust binary.

## Run

```bash
pw-args --tenant=acme --build-path=dist -- test --project=chromium
```

Everything before `--` is parsed by `jm-playwright-args`. Everything after `--` is passed unchanged to Playwright.

If no Playwright command is provided after the custom arguments, `pw-args` runs `playwright test`.

```bash
pw-args --tenant=acme
```

## Config

```ts
import { defineConfig } from '@playwright/test';
import { pwArg } from 'jm-playwright-args';

const tenant = pwArg.string('tenant', { default: 'local' });

export default defineConfig({
  use: {
    baseURL: `https://${tenant}.example.test`,
  },
});
```

## Tests

```ts
import { test, expect } from '@playwright/test';
import { pwArg } from 'jm-playwright-args';

test('tenant is selected', async () => {
  expect(pwArg.string('tenant')).toBe('acme');
});
```

## Typed Args

```ts
import { pwArg } from 'jm-playwright-args';

const tenant = pwArg.string('tenant', { default: 'local' });
const retries = pwArg.number('custom-retries', { default: 0 });
const debugApi = pwArg.boolean('debug-api', { default: false });
const tags = pwArg.array('tag');
const rawArgs = pwArg.raw();
const hasTenant = pwArg.has('tenant');
```

Boolean values can be passed as bare flags or explicit lowercase values.

```bash
pw-args --debug-api --headed=false -- test
```

Repeated scalar arguments use the last value. Array reads return all values.

```bash
pw-args --tenant=preview --tenant=prod --tag=smoke --tag=checkout -- test
```

## Argument Semantics

- `pwArg.string(name)` returns the selected value as a string.
- `pwArg.number(name)` accepts finite numeric strings and throws for non-numeric values.
- `pwArg.boolean(name)` accepts `--name`, `--name=true`, and `--name=false`. Other string values throw.
- `pwArg.array(name)` returns every repeated value, or a single-item array for one value.
- Missing arguments throw unless a `default` is provided.
- Repeated scalar reads use the last value. Repeated array reads return all values.
- `pwArg.raw()` and `pwArg.array()` return defensive copies.

## Commands

```bash
pw-args --report-env=ci -- show-report playwright-report
pw-args --tenant=staging -- test --ui
pw-args --tag=smoke --tag=checkout -- test --grep @checkout
```

## Examples

The `examples/` folder contains runnable scenarios:

- `examples/basic` — minimum config wiring `--tenant` into `baseURL`.
- `examples/typed-args` — string, number, and boolean reads in one config.
- `examples/tags` — repeated `--tag` arguments converted to `grep` regexes.
- `examples/multi-env` — `--env=staging|prod` switches `baseURL` per run.
- `examples/debug-flags` — bare flags and explicit `=false` toggle launch options.
- `examples/defaults` — fallback values when arguments are omitted.

## Rust implementation

The `pw-args` CLI and library are implemented in Rust (`src/*.rs`, BDD-style specs under `tests/*_spec.rs`). The binary forwards custom args over the `PLAYWRIGHT_ARGS_JSON` env variable and the crate exposes the typed readers on a process-wide `pw_arg()` singleton. The only Node-side code left is `index.js`, the dependency-free reader that Playwright configs and tests import.

```bash
cargo build --release   # target/release/pw-args
cargo test              # BDD-style specs, incl. an end-to-end Playwright run
```

## Limits

`jm-playwright-args` does not teach Playwright to accept unknown flags directly. It provides a wrapper command because Playwright's own CLI rejects unknown options before config and tests run.
