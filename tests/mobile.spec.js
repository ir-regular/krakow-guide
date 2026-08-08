/* =====================================================================
   Mobile layout tests
   =====================================================================
   Regression coverage for a real bug: #sidebar and #map-wrap split the
   screen with flex-basis percentages (55%/45%), but flex items default
   to min-height: auto — meaning they refuse to shrink below their own
   content's height. A long enough card list pushed #sidebar taller than
   the viewport instead of scrolling internally, squeezing #map-wrap (and
   the toggle button inside it) down to nothing. Only showed up once
   js/data.js had enough content in one district to overflow a real phone
   screen — see css/styles.css's mobile media query (min-height: 0) for
   the fix.
   ===================================================================== */

const { test, expect } = require("@playwright/test");
const { trackErrors } = require("./helpers");

test.use({ viewport: { width: 390, height: 664 } });   // roughly a small phone in portrait

// Finds whichever district currently has the most places, so this test
// keeps testing the worst case as js/data.js grows instead of needing
// to be updated by hand.
async function findBusiestDistrict(page) {
  await page.goto("/");
  const cards = await page.$$eval("[data-district]", (els) =>
    els.map((e) => ({
      id: e.dataset.district,
      count: Number(e.querySelector(".card-count")?.textContent || "0")
    }))
  );
  return cards.reduce((busiest, c) => (c.count > busiest.count ? c : busiest));
}

test("sidebar never grows taller than the viewport, even on the busiest district", async ({ page }) => {
  const errors = trackErrors(page);

  const { id } = await findBusiestDistrict(page);
  await page.goto(`/#/${id}`);
  await page.waitForTimeout(300);

  const sidebarHeight = await page.locator("#sidebar").evaluate((el) => el.getBoundingClientRect().height);
  expect(sidebarHeight).toBeLessThanOrEqual(page.viewportSize().height);

  expect(errors).toEqual([]);
});

test("the mobile toggle button stays reachable and actually reveals the full map", async ({ page }) => {
  const { id } = await findBusiestDistrict(page);
  await page.goto(`/#/${id}`);

  const toggle = page.locator("#mobile-toggle");
  await expect(toggle).toBeInViewport();

  await toggle.click();
  await expect(page.locator("#app")).toHaveClass(/panel-collapsed/);
  await expect(page.locator("#sidebar")).toBeHidden();
});
