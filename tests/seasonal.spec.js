/* =====================================================================
   Seasonal filtering tests
   =====================================================================
   Covers the "Visiting in" month dropdown: a place/trip with a `months`
   array should be flagged with a badge, hidden when an excluded month is
   picked, and shown again for "any time" and for a month it does include.

   Skips itself if data.js currently has no seasonal place at all, rather
   than hardcoding one by name — same reasoning as routes.spec.js: this
   shouldn't need editing just because someone edits js/data.js.
   ===================================================================== */

const { test, expect } = require("@playwright/test");
const { trackErrors } = require("./helpers");

// Finds the first district that has at least one place carrying a
// `months` badge, and that place's id — or null if none exists yet.
async function findSeasonalPlace(page) {
  await page.goto("/");
  const districtIds = await page.$$eval("[data-district]", (els) => els.map((e) => e.dataset.district));

  for (const districtId of districtIds) {
    await page.goto(`/#/${districtId}`);
    const badge = page.locator(".card-badge").first();
    if (await badge.count()) {
      const placeId = await badge.locator("xpath=ancestor::button[1]").getAttribute("data-place");
      return { districtId, placeId };
    }
  }
  return null;
}

test("a seasonal place is flagged with a badge and actually hidden/shown by the month filter", async ({ page }) => {
  const found = await findSeasonalPlace(page);
  test.skip(!found, "no place with a `months` field in js/data.js right now");
  const { districtId, placeId } = found;

  const errors = trackErrors(page);
  await page.goto(`/#/${districtId}`);
  const card = page.locator(`.card[data-place="${placeId}"]`);

  await expect(card).toBeVisible();
  await expect(card.locator(".card-badge")).toBeVisible();

  // Walk every month and record whether the card is visible. A real filter
  // must show it for at least one month and hide it for at least one other
  // — proving the filter does something, without hardcoding which months.
  const visibility = {};
  for (let m = 1; m <= 12; m++) {
    await page.selectOption("#month-select", String(m));
    visibility[m] = await card.isVisible();
  }
  expect(Object.values(visibility)).toContain(true);
  expect(Object.values(visibility)).toContain(false);

  // Still flagged with its badge on a month where it does show.
  const monthShown = Object.keys(visibility).find((m) => visibility[m]);
  await page.selectOption("#month-select", monthShown);
  await expect(card.locator(".card-badge")).toBeVisible();

  // "Any time" (the default) always shows it again.
  await page.selectOption("#month-select", "");
  await expect(card).toBeVisible();

  expect(errors).toEqual([]);
});

test("Google Maps links are present, well-formed, and biased differently for places vs trips", async ({ page }) => {
  await page.goto("/");

  const districtId = await page.locator("[data-district]").first().getAttribute("data-district");
  await page.goto(`/#/${districtId}`);
  const placeId = await page.locator("[data-place]").first().getAttribute("data-place");
  await page.goto(`/#/${districtId}/${placeId}`);

  const placeMapLink = page.locator(".facts a", { hasText: "Open in Google Maps" });
  await expect(placeMapLink).toBeVisible();
  const placeHref = await placeMapLink.getAttribute("href");
  expect(placeHref).toMatch(/^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/);
  expect(decodeURIComponent(placeHref)).toContain("Kraków");

  await page.goto("/");
  const tripLocator = page.locator("[data-trip]").first();
  const tripId = (await tripLocator.count()) ? await tripLocator.getAttribute("data-trip") : null;
  test.skip(!tripId, "no trips in js/data.js right now");
  await page.goto(`/#/${tripId}`);
  const tripMapLink = page.locator(".facts a", { hasText: "Open in Google Maps" });
  const tripHref = await tripMapLink.getAttribute("href");
  expect(decodeURIComponent(tripHref)).toContain(", Poland");
});
