import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 1,
  use: {
    headless: true,
    baseURL: 'https://example.com',
    viewport: { width: 1280, height: 720 },
  },
});
