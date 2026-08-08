/* =====================================================================
   Route smoke tests
   =====================================================================
   Crawls every URL the site can produce — home, each district, each
   place inside it, each trip — and checks two things: no JS error, and
   the sidebar title actually changed for the route it's on.

   That second check matters more than it sounds: a JS error partway
   through a render leaves the static placeholder title ("Kraków") sitting
   in the HTML from before app.js ever touched it, which *looks* like a
   loaded page if you only check the title is non-empty — it's exactly
   what happened when a district/place/trip URL crashed on a cold direct
   load, because the map had never been given an initial view, so
   map.getZoom() was undefined the first time anything tried to zoom.
   That bug only showed up on the cold-load path, not on in-page clicks,
   which is why both are checked here.

   Routes are discovered from the rendered DOM, not hardcoded, so this
   doesn't need editing when someone adds a district, place or trip to
   js/data.js.
   ===================================================================== */

const { test, expect } = require("@playwright/test");
const { trackErrors } = require("./helpers");

// Reads every district/place/trip id straight off the rendered cards, so
// the route list always matches whatever is actually in js/data.js.
async function discoverRoutes(page) {
  await page.goto("/");
  const homeTitle = (await page.locator("#panel-title").textContent()).trim();

  const districtIds = await page.$$eval("[data-district]", (els) => els.map((e) => e.dataset.district));
  const tripIds = await page.$$eval("[data-trip]", (els) => els.map((e) => e.dataset.trip));

  const routes = [...districtIds.map((id) => `/#/${id}`), ...tripIds.map((id) => `/#/${id}`)];

  for (const id of districtIds) {
    await page.goto(`/#/${id}`);
    const placeIds = await page.$$eval("[data-place]", (els) => els.map((e) => e.dataset.place));
    routes.push(...placeIds.map((pid) => `/#/${id}/${pid}`));
  }

  return { homeTitle, routes };
}

test("home page has at least one district and loads with no errors", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/");
  await expect(page.locator("[data-district]").first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("every route loads cleanly navigated in-page (like clicking around)", async ({ page }) => {
  const { homeTitle, routes } = await discoverRoutes(page);
  expect(routes.length).toBeGreaterThan(0);

  const errors = trackErrors(page);
  for (const route of routes) {
    await page.goto(route);
    // Every non-home route must show ITS OWN title, not the leftover home
    // one — a stale title is the signature of a render that threw partway
    // through, which "not empty" alone wouldn't catch.
    await expect(page.locator("#panel-title")).not.toHaveText(homeTitle);
  }
  expect(errors).toEqual([]);
});

// A fresh `page.goto()` to a URL that only differs by hash does NOT reload
// the page in a real browser, so testing the cold-load path needs a brand
// new page per route rather than hash-hopping within one.
test.describe("every route also loads cleanly as a cold direct load (a shared link)", () => {
  let homeTitle, routes;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    ({ homeTitle, routes } = await discoverRoutes(page));
    await page.close();
  });

  test("every discovered route survives a fresh, direct page load", async ({ browser }) => {
    expect(routes.length).toBeGreaterThan(0);

    for (const route of routes) {
      const page = await browser.newPage();
      const errors = trackErrors(page);
      await page.goto(route, { waitUntil: "load" });
      await expect(page.locator("#panel-title"), `title on cold load of ${route}`).not.toHaveText(homeTitle);
      expect(errors, `errors on cold load of ${route}`).toEqual([]);
      await page.close();
    }
  });
});
