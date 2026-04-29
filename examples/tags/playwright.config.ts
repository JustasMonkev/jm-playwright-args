import { defineConfig } from '@playwright/test';
import { pwArg } from 'playwright-args';

const tags = pwArg.array('tag', { default: ['smoke'] });
const grep = tags.map((tag) => new RegExp(`@${tag}\\b`));

export default defineConfig({
  testDir: './tests',
  grep,
});
