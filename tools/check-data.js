/* =====================================================================
   Optional sanity check for js/data.js
   =====================================================================
   Run it from the project folder whenever you've added content:

       node tools/check-data.js

   It catches the mistakes that are easy to make by hand — a typo'd
   category, coordinates that landed in the wrong country, a duplicated
   name, a missing description. It changes nothing; it only reports.

   You don't have to use this. The site also prints the same warnings
   to the browser console (F12) when you load it.
   ===================================================================== */

const fs = require("fs");
const path = require("path");

const dataPath = path.join(__dirname, "..", "js", "data.js");
const src = fs.readFileSync(dataPath, "utf8");

let data;
try {
  data = eval(src + "\n({ INTRO, CATEGORIES, DISTRICTS, TRIPS });");
} catch (e) {
  console.error("\n  js/data.js has a syntax error and the site will not load.\n");
  console.error("  " + e.message + "\n");
  console.error("  Usually this is a missing comma between entries, or an\n" +
                "  unclosed { } or [ ]. Check the lines you edited last.\n");
  process.exit(1);
}

const { CATEGORIES, DISTRICTS, TRIPS } = data;

// Must match the slug() in js/app.js so reported URLs are accurate.
const slug = (s) =>
  s.toLowerCase()
    .replace(/['’‘`]/g, "")
    .replace(/ł/g, "l")
    .replace(/ø/g, "o")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// Generous box around Kraków — catches lat/lon typed the wrong way round.
const BOX = { latMin: 49.9, latMax: 50.2, lonMin: 19.6, lonMax: 20.3 };

// Trips are allowed to be well outside the city, so they get a looser box
// covering the rough day-trip radius (Zakopane, Auschwitz, Częstochowa) —
// still tight enough to catch a swapped lat/lon.
const TRIP_BOX = { latMin: 49.0, latMax: 50.8, lonMin: 18.5, lonMax: 21.2 };

const isPoint = (c) => Array.isArray(c) && c.length === 2 &&
                       typeof c[0] === "number" && typeof c[1] === "number";

const problems = [];
const notes = [];

const checkPoint = (c, label, at, box = BOX) => {
  const [lat, lon] = c;
  if (lat < box.latMin || lat > box.latMax || lon < box.lonMin || lon > box.lonMax) {
    const swapped = lon >= box.latMin && lon <= box.latMax && lat >= box.lonMin && lat <= box.lonMax;
    problems.push(`${at} has ${label} at [${lat}, ${lon}], which looks wrong.` +
                  (swapped ? ` Looks like latitude and longitude are the wrong way round.` : ``));
  }
};

// Checks a ring (or list of rings, for an area with holes) of [lat, lon]
// points — shared by district-level `area` and place-level `area`/`path`.
const checkShape = (shape, kind, minPoints, at, box = BOX) => {
  const rings = Array.isArray(shape[0]) && Array.isArray(shape[0][0]) ? shape : [shape];
  rings.forEach((ring) => {
    if (!Array.isArray(ring) || ring.length < minPoints) {
      problems.push(`${at} has an ${kind} with too few points (needs at least ${minPoints}).`);
      return;
    }
    ring.forEach((pt) => {
      if (!isPoint(pt)) problems.push(`${at} has a malformed point in its ${kind}: ${JSON.stringify(pt)}`);
      else checkPoint(pt, `an ${kind} point`, at, box);
    });
  });
};

// `months` is optional on a place/trip (only relevant part of the year —
// a temporary exhibition, a festival). Must be integers 1-12, in the order
// they run (app.js's monthsLabel() shows "first–last", so an out-of-order
// list would print something misleading).
const checkMonths = (months, at) => {
  if (!Array.isArray(months) || !months.length) {
    problems.push(`${at} has a malformed "months" (expected e.g. [6] or [12, 1, 2]).`);
    return;
  }
  months.forEach((m) => {
    if (!Number.isInteger(m) || m < 1 || m > 12) {
      problems.push(`${at} has "${m}" in months — expected a whole number from 1 (Jan) to 12 (Dec).`);
    }
  });
};

const seenDistricts = new Set();

DISTRICTS.forEach((d) => {
  const where = `district "${d.name}"`;

  if (!d.name)        problems.push(`A district has no name.`);
  if (!d.tagline)     problems.push(`${where} has no tagline.`);
  if (!d.description) problems.push(`${where} has no description.`);
  if (!d.places || !d.places.length) {
    problems.push(`${where} has no places, so it won't appear on the site.`);
    return;
  }

  const id = d.id || slug(d.name);
  if (seenDistricts.has(id)) problems.push(`Two districts share the URL "${id}". Give one an explicit id.`);
  seenDistricts.add(id);

  if (!d.area) {
    notes.push(`${where} has no area — it will show as a pin only, which is fine.`);
  } else {
    checkShape(d.area, "area", 3, where);
  }

  const seenPlaces = new Set();

  d.places.forEach((p) => {
    const at = `"${p.name || "(unnamed)"}" in ${d.name}`;

    if (!p.name)        problems.push(`A place in ${d.name} has no name.`);
    if (!p.description) problems.push(`${at} has no description.`);

    if (!p.category) {
      problems.push(`${at} has no category.`);
    } else if (!CATEGORIES[p.category]) {
      problems.push(`${at} uses category "${p.category}", which isn't in CATEGORIES. ` +
                    `Valid: ${Object.keys(CATEGORIES).join(", ")}`);
    }

    const shape = p.area || p.path;

    if (!isPoint(p.coords) && !shape) {
      problems.push(`${at} has no valid coords, area or path — it will be left off the map. ` +
                    `Expected coords: [50.0617, 19.9394]`);
    }

    if (p.coords) {
      if (!isPoint(p.coords)) problems.push(`${at} has malformed coords. Expected [50.0617, 19.9394]`);
      else checkPoint(p.coords, "coords", at);
    }

    if (p.area && p.path) {
      problems.push(`${at} has both area and path. Use one or the other.`);
    }

    if (p.months) checkMonths(p.months, at);

    if (shape) {
      const kind = p.area ? "area" : "path";
      checkShape(shape, kind, p.area ? 3 : 2, at);

      if (p.path && p.path.length >= 3 && isPoint(p.path[0])) {
        const a = p.path[0], b = p.path[p.path.length - 1];
        const closed = a[0] === b[0] && a[1] === b[1];
        const nearlyClosed = !closed &&
          Math.abs(a[0] - b[0]) < 0.004 && Math.abs(a[1] - b[1]) < 0.004;
        if (nearlyClosed) {
          notes.push(`${at} has a path that nearly returns to its start. If it's meant to be ` +
                     `a loop, repeat the first point at the end to close it.`);
        }
      }
    }

    if (p.name) {
      const pid = p.id || slug(p.name);
      if (seenPlaces.has(pid)) problems.push(`Two places in ${d.name} share the URL "${pid}". Rename one, or give it an explicit id.`);
      seenPlaces.add(pid);
    }
  });
});

// Trips share the DISTRICTS' flat URL namespace ("/trip-id" alongside
// "/district-id"), so a trip's id has to be checked against seenDistricts
// too, not just against other trips.
(TRIPS || []).forEach((t) => {
  const at = `"${t.name || "(unnamed)"}" (a trip)`;

  if (!t.name)        problems.push(`A trip has no name.`);
  if (!t.description) problems.push(`${at} has no description.`);

  if (!t.category) {
    problems.push(`${at} has no category.`);
  } else if (!CATEGORIES[t.category]) {
    problems.push(`${at} uses category "${t.category}", which isn't in CATEGORIES. ` +
                  `Valid: ${Object.keys(CATEGORIES).join(", ")}`);
  }

  const shape = t.area || t.path;

  if (!isPoint(t.coords) && !shape) {
    problems.push(`${at} has no valid coords, area or path — it will be left off the map. ` +
                  `Expected coords: [50.0617, 19.9394]`);
  }

  if (t.coords) {
    if (!isPoint(t.coords)) problems.push(`${at} has malformed coords. Expected [50.0617, 19.9394]`);
    else checkPoint(t.coords, "coords", at, TRIP_BOX);
  }

  if (t.area && t.path) {
    problems.push(`${at} has both area and path. Use one or the other.`);
  }

  if (shape) {
    checkShape(shape, t.area ? "area" : "path", t.area ? 3 : 2, at, TRIP_BOX);
  }

  if (t.months) checkMonths(t.months, at);

  if (t.name) {
    const tid = t.id || slug(t.name);
    if (seenDistricts.has(tid)) {
      problems.push(`Trip "${t.name}" shares its URL "${tid}" with a district. Rename the trip, or give it an explicit id.`);
    }
    seenDistricts.add(tid);
  }
});

const placeCount = DISTRICTS.reduce((n, d) => n + (d.places ? d.places.length : 0), 0);

console.log("");
console.log(`  ${DISTRICTS.length} districts, ${placeCount} places, ${(TRIPS || []).length} trips, ${Object.keys(CATEGORIES).length} categories`);
console.log("");

notes.forEach((n) => console.log(`  note     ${n}`));
if (notes.length) console.log("");

if (problems.length) {
  problems.forEach((p) => console.log(`  PROBLEM  ${p}`));
  console.log(`\n  ${problems.length} problem(s) to fix.\n`);
  process.exit(1);
}

console.log("  No problems found.\n");
