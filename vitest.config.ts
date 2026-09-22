import { defineConfig, type ViteUserConfig } from 'vitest/config';

const config: ViteUserConfig = defineConfig({
  test: {
    include: ['tests/**/*.spec.ts'],
  },
});

export default config;
