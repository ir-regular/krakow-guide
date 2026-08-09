/* =====================================================================
   Shape vs point marker tests
   =====================================================================
   Anything drawn as a shape (a district or place with an `area`/`path`)
   should show its name label on the map but NOT a pin icon — the shape
   is already there, and a circular pin on top of it both implies one
   exact spot (misleading for a whole region) and can swallow a small
   shape entirely under its own circle. Point-only places should still
   get their normal icon.
   ===================================================================== */

const { test, expect } = require("@playwright/test");
const { trackErrors } = require("./helpers");

// Reads every rendered .leaflet-marker-icon on the current view and
// reports, per marker, whether it has a pin circle and/or a text label.
async function readMarkers(page) {
  return page.$$eval(".leaflet-marker-icon", (icons) =>
    icons.map((icon) => ({
      hasPin: !!icon.querySelector(".pin"),
      label: icon.querySelector(".pin-label")?.textContent || null
    }))
  );
}

test("home screen: districts with an area show a label but no pin", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/");
  await page.waitForTimeout(600);

  const markers = await readMarkers(page);
  expect(markers.length).toBeGreaterThan(0);

  // Every district currently has an `area`, so this should be true for
  // at least the district markers (trips may or may not have a shape).
  expect(markers.some((m) => m.label && !m.hasPin)).toBe(true);

  expect(errors).toEqual([]);
});

test("inside a district: a shape-based place shows a label but no pin, point places keep theirs", async ({ page }) => {
  const errors = trackErrors(page);

  // Old Town is used here (rather than a generically-discovered district)
  // because it's the project's own documented reference example for a
  // path-shaped place — see "Planty" in js/data.js and the README.
  await page.goto("/#/old-town");
  await page.waitForTimeout(600);

  const markers = await readMarkers(page);
  expect(markers.some((m) => m.label && !m.hasPin)).toBe(true);   // the shape (Planty)
  expect(markers.some((m) => m.hasPin)).toBe(true);                // ordinary point places

  expect(errors).toEqual([]);
});
