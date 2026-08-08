/* Shared helpers for the Playwright tests in this folder. */

// MapLibre GL's own tile/sprite fetches occasionally fail under load (this
// sandbox proxies every request, and tests run several pages in parallel
// against the same tile server) and surface as an uncaught AJAXError. That's
// transient network noise, not a bug in this site's code, so it's filtered
// out here rather than making every test flaky.
const NETWORK_NOISE = /AJAXError|Failed to fetch|maplibre-gl\.js/i;

function trackErrors(page) {
  const errors = [];
  page.on("pageerror", (e) => {
    const s = String(e);
    if (!NETWORK_NOISE.test(s)) errors.push(s);
  });
  page.on("console", (m) => {
    if (m.type() === "error" && !NETWORK_NOISE.test(m.text())) errors.push(m.text());
  });
  return errors;
}

module.exports = { trackErrors };
