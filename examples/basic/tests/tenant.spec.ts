import { test, expect } from '@playwright/test';
import { pwArg } from 'playwright-args';

test('receives tenant arg', async ({ baseURL }) => {
  expect(pwArg.string('tenant')).toBe('acme');
  expect(baseURL).toBe('https://acme.example.test');
});
