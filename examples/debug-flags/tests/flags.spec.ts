import { test, expect } from '@playwright/test';
import { pwArg } from 'playwright-args';

test('bare flag enables debug, explicit false disables slow', async () => {
  expect(pwArg.boolean('debug-api')).toBe(true);
  expect(pwArg.boolean('slow')).toBe(false);
  expect(pwArg.has('debug-api')).toBe(true);
});
