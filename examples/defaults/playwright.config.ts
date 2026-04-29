import { defineConfig } from '@playwright/test';
import { pwArg } from 'jm-playwright-args';

const tenant = pwArg.string('tenant', { default: 'local' });
const workers = pwArg.number('workers', { default: 1 });

export default defineConfig({
  testDir: './tests',
  workers,
  use: {
    baseURL: `https://${tenant}.example.test`,
  },
});
