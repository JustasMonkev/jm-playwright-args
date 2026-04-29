import { defineConfig } from '@playwright/test';
import { pwArg } from 'playwright-args';

const tenant = pwArg.string('tenant', { default: 'local' });
const retries = pwArg.number('custom-retries', { default: 0 });
const debugApi = pwArg.boolean('debug-api', { default: false });

export default defineConfig({
  testDir: './tests',
  retries,
  use: {
    baseURL: `https://${tenant}.example.test`,
    extraHTTPHeaders: debugApi ? { 'x-debug-api': '1' } : undefined,
  },
});
