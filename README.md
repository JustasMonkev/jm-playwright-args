# jm-playwright-args

Pass custom command-line arguments into Playwright config and tests without patching Playwright.

## Install

```bash
npm install -D jm-playwright-args @playwright/test
```

## Run

```bash
npx pw-args --tenant=acme --build-path=dist -- test --project=chromium
```

Everything before `--` is parsed by `jm-playwright-args`. Everything after `--` is passed unchanged to Playwright.

If no Playwright command is provided after the custom arguments, `pw-args` runs `playwright test`.

```bash
npx pw-args --tenant=acme
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
npx pw-args --debug-api --headed=false -- test
```

Repeated scalar arguments use the last value. Array reads return all values.

```bash
npx pw-args --tenant=preview --tenant=prod --tag=smoke --tag=checkout -- test
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
npx pw-args --report-env=ci -- show-report playwright-report
npx pw-args --tenant=staging -- test --ui
npx pw-args --tag=smoke --tag=checkout -- test --grep @checkout
```

## Limits

`jm-playwright-args` does not teach Playwright to accept unknown flags directly. It provides a wrapper command because Playwright's own CLI rejects unknown options before config and tests run.
