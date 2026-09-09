const { launch } = require("./helpers/browser.cjs");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const fs = require("node:fs");
(async () => {
  fs.mkdirSync("test-results", { recursive: true });
  const browser = await launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  page.on("pageerror", (e) => console.error("PAGE ERROR", e.message));
  page.on("console", (m) => {
    if (m.type() === "error") console.error("CONSOLE", m.text().slice(0, 300));
  });
  await page.goto(pathToFileURL(path.resolve("index.html")).href + "?debug=1&skipIntro=1");
  await page.waitForSelector("#menu:not(.hidden)", { timeout: 60000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: "test-results/title.png" });
  console.log(
    await page.evaluate(() => ({
      meshes: __nightShift.scene.meshes.length,
      fps: __nightShift.engine.getFps(),
      phase: __nightShift.G.phase,
    })),
  );
  await page.click("#start");
  await page.evaluate(() => {
    __nightShift.closeModal();
    __nightShift.teleport(-2.5, 3.9, Math.PI, 0.05);
  });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "test-results/shop.png" });
  await page.evaluate(() => __nightShift.teleport(0, 1.2, 0, 0));
  await page.waitForTimeout(500);
  await page.screenshot({ path: "test-results/forecourt.png" });
  console.log(
    await page.evaluate(() => ({
      fps: __nightShift.engine.getFps(),
      modal: __nightShift.G.modal,
      mode: __nightShift.G.mode,
    })),
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
