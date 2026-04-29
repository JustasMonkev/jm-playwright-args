import { test, expect } from '@playwright/test';
import { pwArg } from 'playwright-args';

test('falls back to declared defaults when args are absent', async ({ baseURL }) => {
  expect(pwArg.string('tenant', { default: 'local' })).toBe(pwArg.has('tenant') ? pwArg.string('tenant') : 'local');
  expect(pwArg.number('workers', { default: 1 })).toBeGreaterThanOrEqual(1);
  expect(baseURL).toMatch(/^https:\/\/[a-z]+\.example\.test$/);
});
