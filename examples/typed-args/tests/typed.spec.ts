import { test, expect } from '@playwright/test';
import { pwArg } from 'playwright-args';

test('reads each typed argument', async ({ baseURL }) => {
  expect(pwArg.string('tenant')).toBe('acme');
  expect(pwArg.number('custom-retries')).toBe(2);
  expect(pwArg.boolean('debug-api')).toBe(true);
  expect(baseURL).toBe('https://acme.example.test');
});
