const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 60000,
  retries: 0,
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
  },
  webServer: {
    command: 'npx http-server -p 8090 -c-1 --silent',
    port: 8090,
    reuseExistingServer: true,
    timeout: 10000,
  },
});
