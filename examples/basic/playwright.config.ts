import { defineConfig } from '@playwright/test';
import { pwArg } from 'jm-playwright-args';

const tenant = pwArg.string('tenant', { default: 'local' });

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: `https://${tenant}.example.test`,
  },
});
