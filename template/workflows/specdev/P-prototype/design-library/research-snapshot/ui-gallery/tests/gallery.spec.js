const { test, expect } = require("@playwright/test");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const galleryRoot = path.resolve(__dirname, "..");
const pages = [
  "index.html",
  "01-dense-ide.html",
  "02-monochrome-console.html",
  "03-soft-personal-ai.html",
  "04-responsive-web.html",
  "05-mobile-supervisor.html",
  "06-cross-platform-workspace.html",
  "07-local-first-content.html",
  "08-media-first.html",
];

for (const filename of pages) {
  test(`${filename} renders without viewport overflow`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(pathToFileURL(path.join(galleryRoot, filename)).href);

    await expect(page.locator("body")).toBeVisible();
    expect(await page.locator("svg").count()).toBeGreaterThan(0);

    const layout = await page.evaluate(() => ({
      viewport: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
    }));
    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewport + 1);
    expect(layout.bodyWidth).toBeLessThanOrEqual(layout.viewport + 1);

    const brokenImages = await page.locator("img").evaluateAll((images) =>
      images.filter((image) => !image.complete || image.naturalWidth === 0).map((image) => image.src),
    );
    expect(brokenImages).toEqual([]);
  });
}

test("theme and token controls respond", async ({ page }) => {
  await page.goto(pathToFileURL(path.join(galleryRoot, "03-soft-personal-ai.html")).href);
  await page.locator("[data-theme-toggle]").click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.locator("[data-token-toggle]").click();
  await expect(page.locator(".token-drawer")).toHaveClass(/open/);
  await page.locator("[data-token-close]").click();
  await expect(page.locator(".token-drawer")).not.toHaveClass(/open/);
});

test("mobile approval returns a visible decision", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(pathToFileURL(path.join(galleryRoot, "05-mobile-supervisor.html")).href);
  await page.locator('[data-approval="allow"]').click();
  await expect(page.locator(".approval-result.allow")).toContainText("已允许本次操作");
});
