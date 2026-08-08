// @ts-check
const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  // These tests load real tiles from tiles.openfreemap.org — a free,
  // community-run service. Running one worker at a time, one page load
  // after another, keeps this suite from hammering it with a burst of
  // concurrent requests every time someone runs the tests.
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:8123"
  },
  // Reuses the exact server command the README already tells people to run
  // by hand, so there's nothing new to install just to serve the files.
  webServer: {
    command: "python3 -m http.server 8123",
    url: "http://localhost:8123",
    reuseExistingServer: true,
    timeout: 10_000
  }
});
