import { defineConfig } from '@playwright/test';
import { pwArg } from 'playwright-args';

const debugApi = pwArg.boolean('debug-api', { default: false });
const slow = pwArg.boolean('slow', { default: false });

export default defineConfig({
  testDir: './tests',
  use: {
    launchOptions: { slowMo: slow ? 250 : 0 },
    extraHTTPHeaders: debugApi ? { 'x-debug-api': '1' } : undefined,
  },
});
