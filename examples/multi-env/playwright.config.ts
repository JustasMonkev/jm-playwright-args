import { defineConfig } from '@playwright/test';
import { pwArg } from 'jm-playwright-args';

const env = pwArg.string('env', { default: 'staging' });

const baseUrls: Record<string, string> = {
  staging: 'https://staging.example.test',
  prod: 'https://prod.example.test',
};

if (!baseUrls[env]) {
  throw new Error(`Unknown --env value: ${env}`);
}

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: baseUrls[env],
  },
});
