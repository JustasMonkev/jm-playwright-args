import { test, expect } from '@playwright/test';
import { pwArg } from 'playwright-args';

test('targets the selected environment', async ({ baseURL }) => {
  const env = pwArg.string('env');
  expect(['staging', 'prod']).toContain(env);
  expect(baseURL).toBe(`https://${env}.example.test`);
});
