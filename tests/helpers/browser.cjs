const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
exports.launch = () => chromium.launch({
  headless: true,
  executablePath: process.env.BROWSER_EXECUTABLE || undefined,
  channel: process.env.BROWSER_CHANNEL || undefined,
});
