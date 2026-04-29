import { test, expect } from '@playwright/test';
import { pwArg } from 'jm-playwright-args';

test('checkout flow @checkout', async () => {
  expect(pwArg.array('tag')).toContain('checkout');
});

test('smoke flow @smoke', async () => {
  expect(pwArg.array('tag')).toContain('smoke');
});

test('payments flow @payments', async () => {
  throw new Error('should be filtered out by --tag');
});
