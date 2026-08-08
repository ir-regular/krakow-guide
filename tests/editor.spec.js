/* =====================================================================
   Boundary editor tests
   =====================================================================
   Covers the interactions in tools/editor.html: drawing, undoing,
   finishing (both ways — the button and clicking the first point back),
   dragging a point after finishing, deleting a point, and clearing.
   ===================================================================== */

const { test, expect } = require("@playwright/test");
const { trackErrors } = require("./helpers");

// Five points forming a simple pentagon well within the visible map on
// load — arbitrary pixels, not real coordinates; these tests only care
// about the editor's bookkeeping, not where on Earth it ends up.
const PENTAGON = [[900, 300], [1100, 400], [1050, 600], [850, 620], [780, 450]];

async function drawPentagon(page) {
  for (const [x, y] of PENTAGON) {
    await page.mouse.click(x, y);
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto("/tools/editor.html");
});

test("drawing three or more points enables Finish, fewer keeps it disabled", async ({ page }) => {
  await expect(page.locator("#finish-btn")).toBeDisabled();
  await page.mouse.click(900, 300);
  await page.mouse.click(1000, 400);
  await expect(page.locator("#finish-btn")).toBeDisabled();
  await page.mouse.click(950, 500);
  await expect(page.locator("#finish-btn")).toBeEnabled();
});

test("finishing via the button produces a pastable coordinate array", async ({ page }) => {
  await drawPentagon(page);
  await page.click("#finish-btn");

  await expect(page.locator("#status")).toContainText("Shape finished — 5 points");
  const output = await page.locator("#output").textContent();

  // Should be a bare, valid JS array of five [lat, lon] pairs.
  const parsed = eval(output);
  expect(Array.isArray(parsed)).toBe(true);
  expect(parsed).toHaveLength(5);
  parsed.forEach((pt) => {
    expect(pt).toHaveLength(2);
    expect(typeof pt[0]).toBe("number");
    expect(typeof pt[1]).toBe("number");
  });

  await expect(page.locator("#copy-btn")).toBeEnabled();
});

test("finishing by clicking the first point works the same as the button", async ({ page }) => {
  await drawPentagon(page);
  const firstPoint = page.locator(".vertex-first-ready");
  await expect(firstPoint).toBeVisible();
  await firstPoint.click();

  await expect(page.locator("#status")).toContainText("Shape finished");
});

test("undo removes the last point, not an earlier one", async ({ page }) => {
  await page.mouse.click(900, 300);
  await page.mouse.click(1000, 400);
  await page.mouse.click(950, 500);
  await page.mouse.click(850, 550);
  await expect(page.locator(".vertex-icon")).toHaveCount(4);

  await page.click("#undo-btn");
  await expect(page.locator(".vertex-icon")).toHaveCount(3);
});

test("double-clicking a point deletes just that point", async ({ page }) => {
  await drawPentagon(page);
  await expect(page.locator(".vertex-icon")).toHaveCount(5);

  // The second point placed, not the first (which has special click-to-close behaviour).
  await page.locator(".vertex-icon").nth(1).dblclick();
  await expect(page.locator(".vertex-icon")).toHaveCount(4);
});

test("dragging a point after finishing updates the output", async ({ page }) => {
  await drawPentagon(page);
  await page.click("#finish-btn");
  const before = await page.locator("#output").textContent();

  const firstPoint = page.locator(".vertex-icon").first();
  const box = await firstPoint.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 60, box.y + 60, { steps: 5 });
  await page.mouse.up();

  const after = await page.locator("#output").textContent();
  expect(after).not.toBe(before);
  // Still finished, still draggable, still a valid array afterwards.
  await expect(page.locator("#status")).toContainText("Shape finished");
  expect(() => eval(after)).not.toThrow();
});

test("clicking the map after finishing does not add another point", async ({ page }) => {
  await drawPentagon(page);
  await page.click("#finish-btn");
  await page.mouse.click(700, 700);
  await expect(page.locator(".vertex-icon")).toHaveCount(5);
});

test("clear resets everything, including after finishing", async ({ page }) => {
  await drawPentagon(page);
  await page.click("#finish-btn");
  await page.click("#clear-btn");

  await expect(page.locator(".vertex-icon")).toHaveCount(0);
  await expect(page.locator("#status")).toContainText("Click the map to place the first point");
  await expect(page.locator("#output")).toContainText("Draw a shape to see its coordinates here");
  await expect(page.locator("#copy-btn")).toBeDisabled();
});

test("loads with no console or page errors", async ({ page }) => {
  const errors = trackErrors(page);

  await page.goto("/tools/editor.html");
  await drawPentagon(page);
  await page.click("#finish-btn");

  expect(errors).toEqual([]);
});
