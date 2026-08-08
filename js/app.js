/* =====================================================================
   Kraków guide — rendering engine
   =====================================================================
   You should not need to edit this file to add content. It reads
   whatever is in js/data.js and builds the map + sidebar from it.

   If something you added doesn't show up, open the browser console
   (F12) — this file prints a clear warning for common data mistakes.
   ===================================================================== */

(function () {
  "use strict";

  /* ── Small helpers ──────────────────────────────────────────── */

  const $ = (id) => document.getElementById(id);

  // "St Mary's Basilica" -> "st-marys-basilica"   (used for shareable URLs)
  //
  // Polish letters are folded to their plain equivalents so that names like
  // "Podgórze" and "Błonia" give clean URLs (podgorze, blonia) rather than
  // mangled ones. NFD splits most accents off their base letter; ł and ø are
  // separate letters that don't decompose, so they're mapped by hand.
  const slug = (s) =>
    s.toLowerCase()
      .replace(/['’‘`]/g, "")
      .replace(/ł/g, "l")
      .replace(/ø/g, "o")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")   // strip the separated accent marks
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  // Escape anything that came from data.js before it touches innerHTML.
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  // description accepts a string OR an array of strings (one per paragraph)
  const prose = (text) =>
    (Array.isArray(text) ? text : [text])
      .filter(Boolean)
      .map((p) => `<p>${esc(p)}</p>`)
      .join("");

  const fallbackCategory = { label: "Place", icon: "📍", color: "#8a8078" };
  const categoryFor = (key) => CATEGORIES[key] || fallbackCategory;

  // A search link (not a bare lat/lon pin) so it lands on the actual Google
  // Maps listing — photos, reviews, opening hours — for anyone who wants to
  // save the place to their own map. `area` just biases the search; it's
  // not asserting the place is literally inside it (a day trip nowhere near
  // Kraków still gets one, biased towards "Poland" instead).
  const mapsSearchUrl = (name, area) =>
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name}, ${area}`)}`;

  /* ── Seasonal places (temporary exhibitions, festivals, …) ──────
     A place or trip can give an optional `months` array (1-12) if it's
     only relevant part of the year. Nothing about the site requires it —
     omit it and the entry just shows all the time, as before.          */

  const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // [6] -> "Jun"   [11, 12] -> "Nov–Dec"   (assumes the months are already
  // given in the order they run, same as any other ordered list in data.js)
  const monthsLabel = (months) => {
    const names = months.map((m) => MONTH_NAMES[m - 1]);
    return names.length > 1 ? `${names[0]}–${names[names.length - 1]}` : names[0];
  };

  let selectedMonth = null;   // null = "any time" — the dropdown's default

  const isInSeason = (entry) =>
    selectedMonth === null || !entry.months || entry.months.includes(selectedMonth);

  /* ── Places that are regions, not points ────────────────────────
     A place may have an `area` (a filled shape, e.g. a park) or a
     `path` (a line, e.g. a ring or a stretch of wall) instead of —
     or as well as — a single point.                               */

  const shapeOf = (p) => p.area || p.path || null;

  // A polygon is either one ring [[lat,lon], …] or several rings
  // [[outer], [hole], …]. This flattens either form to a list of points.
  const flattenPoints = (shape) =>
    Array.isArray(shape[0][0]) ? shape.flat() : shape;

  // Centre of a shape's bounding box. Used to position the pin when the
  // author gave a shape but no explicit `coords`.
  function shapeAnchor(shape) {
    const pts = flattenPoints(shape);
    const lats = pts.map((pt) => pt[0]);
    const lons = pts.map((pt) => pt[1]);
    return [
      (Math.min(...lats) + Math.max(...lats)) / 2,
      (Math.min(...lons) + Math.max(...lons)) / 2
    ];
  }

  // How a shape is drawn, normally and when it's the selected place.
  const shapeStyle = (p, color, active) =>
    p.area
      ? { color, weight: active ? 3 : 2, opacity: active ? .95 : .7,
          fillColor: color, fillOpacity: active ? .3 : .15 }
      : { color, weight: active ? 11 : 7, opacity: active ? .9 : .55,
          lineCap: "round", lineJoin: "round" };

  /* ── Normalise the data ─────────────────────────────────────────
     Fills in everything the author was allowed to leave out: ids,
     map centres, district shapes. Also warns about broken entries. */

  const districts = DISTRICTS.map((d) => {
    const places = (d.places || []).map((p) => {
      const shape = shapeOf(p);

      // A place needs either a point or a shape. Given a shape but no
      // point, the pin goes in the middle of it.
      let coords = p.coords && p.coords.length === 2 ? p.coords : null;
      if (!coords && shape) coords = shapeAnchor(shape);

      if (!coords) {
        console.warn(`[data.js] "${p.name}" in ${d.name} has no valid coords, area or path — it won't appear on the map.`);
      }
      if (p.category && !CATEGORIES[p.category]) {
        console.warn(`[data.js] "${p.name}" uses category "${p.category}", which isn't defined in CATEGORIES. Using a default pin.`);
      }
      return { ...p, id: p.id || slug(p.name), coords };
    }).filter((p) => p.coords);

    // Centre the district on the average of its places, unless told otherwise.
    let center = d.center;
    if (!center && places.length) {
      center = [
        places.reduce((sum, p) => sum + p.coords[0], 0) / places.length,
        places.reduce((sum, p) => sum + p.coords[1], 0) / places.length
      ];
    }
    if (!center) {
      console.warn(`[data.js] District "${d.name}" has no places and no center — skipping.`);
    }

    return {
      ...d,
      id: d.id || slug(d.name),
      icon: d.icon || "📍",
      color: d.color || "#b3441f",
      area: d.area || null,
      center,
      zoom: d.zoom || 15,
      places
    };
  }).filter((d) => d.center);

  const findDistrict = (id) => districts.find((d) => d.id === id);
  const findPlace = (d, id) => d.places.find((p) => p.id === id);

  // Trips are shaped exactly like a place, but live at the top level rather
  // than inside a district — for things worth a pin but not worth a district
  // of their own (an out-of-town castle, a day trip).
  const trips = TRIPS.map((t) => {
    const shape = shapeOf(t);

    let coords = t.coords && t.coords.length === 2 ? t.coords : null;
    if (!coords && shape) coords = shapeAnchor(shape);

    if (!coords) {
      console.warn(`[data.js] Trip "${t.name}" has no valid coords, area or path — it won't appear on the map.`);
    }
    if (t.category && !CATEGORIES[t.category]) {
      console.warn(`[data.js] Trip "${t.name}" uses category "${t.category}", which isn't defined in CATEGORIES. Using a default pin.`);
    }
    return { ...t, id: t.id || slug(t.name), coords };
  }).filter((t) => t.coords);

  const findTrip = (id) => trips.find((t) => t.id === id);

  /* ── Map setup ──────────────────────────────────────────────── */

  // Needs a real starting view, not just a container — landing directly on a
  // detail URL (a shared link) calls setView/fitBounds before anything else
  // has, and map.getZoom() returns undefined on a map that's never had a
  // view set, which turns Math.max(undefined, 16) into NaN and breaks Leaflet.
  const map = L.map("map", { zoomControl: true, scrollWheelZoom: true })
    .setView([50.0614, 19.9366], 13);

  // OpenFreeMap's tiles are vector, not raster, so they're rendered by MapLibre
  // GL underneath and only bridged into this Leaflet map via the plugin above
  // — everything else (markers, popups, shapes) is still plain Leaflet.
  L.maplibreGL({
    style: "https://tiles.openfreemap.org/styles/liberty",
    // maplibre-gl-leaflet only reads attribution via attributionControl.customAttribution,
    // not a plain `attribution` string like Leaflet's own L.tileLayer does.
    attributionControl: {
      customAttribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }
  }).addTo(map);

  // Everything we draw goes in here so a view change can wipe it cleanly.
  const layer = L.layerGroup().addTo(map);
  let markersById = {};   // id -> marker, so the sidebar can highlight pins
  let shapesById = {};    // id -> polygon/polyline, for places that are regions

  const pinIcon = (emoji, color, kind, label) =>
    L.divIcon({
      className: "",
      html:
        `<div class="pin pin-${kind}" style="background:${color}">${emoji}</div>` +
        (label ? `<div class="pin-label">${esc(label)}</div>` : ""),
      iconSize: kind === "district" ? [40, 40] : [30, 30],
      iconAnchor: kind === "district" ? [20, 20] : [15, 15]
    });

  function setActiveMarker(id) {
    Object.entries(markersById).forEach(([key, marker]) => {
      const el = marker.getElement()?.querySelector(".pin");
      if (el) el.classList.toggle("is-active", key === id);
    });
    Object.entries(shapesById).forEach(([key, entry]) => {
      entry.layer.setStyle(shapeStyle(entry.place, entry.color, key === id));
    });
  }

  /* ── Sidebar shell ──────────────────────────────────────────── */

  function setHeader(title, namePl, tagline, backLabel, backHref) {
    $("panel-title").innerHTML =
      esc(title) + (namePl ? `<span class="pl-name">${esc(namePl)}</span>` : "");
    $("panel-tagline").textContent = tagline || "";

    const btn = $("back-btn");
    if (backLabel) {
      btn.hidden = false;
      $("back-label").textContent = backLabel;
      btn.onclick = () => { location.hash = backHref; };
    } else {
      btn.hidden = true;
    }
  }

  function renderLegend(places) {
    const el = $("map-legend");
    const used = [...new Set(places.map((p) => p.category))];
    if (!used.length) { el.hidden = true; return; }

    el.hidden = false;
    el.innerHTML = used.map((key) => {
      const c = categoryFor(key);
      return `<div><span class="sw" style="background:${c.color}"></span>${esc(c.label)}</div>`;
    }).join("");
  }

  /* ── View: home (all districts, plus any top-level trips) ─────── */

  // Draws the district and trip pins shared by the home screen and by a
  // trip's own detail view (which needs its siblings visible on the map,
  // same as a place does inside its district). Split out from showHome()
  // so a trip→trip or trip→home move doesn't need to redraw it every time.
  function drawHomeLayer() {
    layer.clearLayers();
    markersById = {};
    shapesById = {};

    districts.forEach((d) => {
      if (d.area) {
        L.polygon(d.area, {
          className: "district-area",
          color: d.color, weight: 2, opacity: .75,
          fillColor: d.color, fillOpacity: .13
        })
          .on("click", () => { location.hash = "/" + d.id; })
          .on("mouseover", (e) => e.target.setStyle({ fillOpacity: .28 }))
          .on("mouseout",  (e) => e.target.setStyle({ fillOpacity: .13 }))
          .addTo(layer);
      }

      const marker = L.marker(d.center, {
        icon: pinIcon(d.icon, d.color, "district", d.name),
        riseOnHover: true
      })
        .on("click", () => { location.hash = "/" + d.id; })
        .addTo(layer);

      markersById[d.id] = marker;
    });

    trips.filter(isInSeason).forEach((t) => {
      const shape = shapeOf(t);
      const c = categoryFor(t.category);

      if (shape) {
        const drawn = (t.area ? L.polygon : L.polyline)(shape, {
          className: "place-shape",
          ...shapeStyle(t, c.color, false)
        })
          .on("click", () => { location.hash = "/" + t.id; })
          .addTo(layer);

        shapesById[t.id] = { layer: drawn, place: t, color: c.color };
      }

      const marker = L.marker(t.coords, {
        icon: pinIcon(c.icon, c.color, "place", t.name),
        riseOnHover: true
      })
        .on("click", () => { location.hash = "/" + t.id; })
        .addTo(layer);

      markersById[t.id] = marker;
    });
  }

  function showHome() {
    setActiveMarker(null);
    $("map-legend").hidden = true;

    // Trips deliberately aren't included here — they can be well outside
    // the city, and zooming the whole map out to fit one would shrink every
    // district down for a pin most visits won't need. Panning finds them,
    // and so does the list below.
    const bounds = L.latLngBounds(districts.map((d) => d.center));
    districts.forEach((d) => d.area && bounds.extend(L.latLngBounds(d.area)));
    map.fitBounds(bounds, { padding: [70, 70] });

    setHeader(INTRO.title, null, INTRO.tagline, null, null);

    const visibleTrips = trips.filter(isInSeason);

    $("panel-body").innerHTML =
      `<div class="prose">${prose(INTRO.description)}</div>` +
      `<div class="section-label">Districts</div>` +
      `<ul class="card-list">` +
      districts.map((d) => `
        <li>
          <button class="card" data-district="${d.id}">
            <span class="card-icon">${d.icon}</span>
            <span class="card-text">
              <span class="card-name">${esc(d.name)}</span>
              <span class="card-meta">${esc(d.tagline || "")}</span>
            </span>
            <span class="card-count">${d.places.filter(isInSeason).length}</span>
          </button>
        </li>`).join("") +
      `</ul>` +
      (visibleTrips.length
        ? `<div class="section-label">Day trips</div>` +
          `<ul class="card-list">` +
          visibleTrips.map((t) => {
            const c = categoryFor(t.category);
            return `
        <li>
          <button class="card" data-trip="${t.id}">
            <span class="card-icon">${c.icon}</span>
            <span class="card-text">
              <span class="card-name">${esc(t.name)}</span>
              <span class="card-meta">${esc(c.label)}</span>
            </span>
            ${t.months ? `<span class="card-badge" title="Only ${monthsLabel(t.months)}">🗓 ${monthsLabel(t.months)}</span>` : ""}
          </button>
        </li>`;
          }).join("") +
          `</ul>`
        : "") +
      (INTRO.tip ? `<div class="tip"><strong>Good to know</strong>${esc(INTRO.tip)}</div>` : "");

    wireCards();
  }

  /* ── View: one district (its places) ────────────────────────── */

  function showDistrict(d, activePlaceId) {
    layer.clearLayers();
    markersById = {};
    shapesById = {};

    // Out-of-season places are left off the map, except the one the URL
    // points at directly — a shared link to a seasonal place shouldn't go
    // pinless just because a different month is selected.
    const visiblePlaces = d.places.filter((p) => isInSeason(p) || p.id === activePlaceId);

    // Shapes first, so the pins sit on top of them and stay clickable.
    visiblePlaces.forEach((p) => {
      const shape = shapeOf(p);
      if (!shape) return;

      const c = categoryFor(p.category);
      const drawn = (p.area ? L.polygon : L.polyline)(shape, {
        className: "place-shape",
        ...shapeStyle(p, c.color, false)
      })
        .on("click", () => { location.hash = `/${d.id}/${p.id}`; })
        .addTo(layer);

      shapesById[p.id] = { layer: drawn, place: p, color: c.color };
    });

    visiblePlaces.forEach((p) => {
      const c = categoryFor(p.category);
      const marker = L.marker(p.coords, {
        icon: pinIcon(c.icon, c.color, "place", p.name),
        riseOnHover: true
      })
        .on("click", () => { location.hash = `/${d.id}/${p.id}`; })
        .addTo(layer);

      markersById[p.id] = marker;
    });

    if (!activePlaceId) {
      if (visiblePlaces.length > 1) {
        // Frame the pins plus the full extent of any region-shaped places.
        const bounds = L.latLngBounds(visiblePlaces.map((p) => p.coords));
        visiblePlaces.forEach((p) => {
          const shape = shapeOf(p);
          if (shape) bounds.extend(L.latLngBounds(flattenPoints(shape)));
        });
        map.fitBounds(bounds, { padding: [60, 60] });
      } else if (visiblePlaces.length === 1) {
        map.setView(visiblePlaces[0].coords, d.zoom);
      } else {
        map.setView(d.center, d.zoom);
      }
    }

    renderLegend(visiblePlaces);

    const place = activePlaceId ? findPlace(d, activePlaceId) : null;
    if (place) renderPlace(d, place);
    else renderDistrictOverview(d);
  }

  function renderDistrictOverview(d) {
    setActiveMarker(null);
    setHeader(d.name, d.namePl, d.tagline, "All districts", "");

    $("panel-body").innerHTML =
      `<div class="prose">${prose(d.description)}</div>` +
      (d.tip ? `<div class="tip"><strong>Good to know</strong>${esc(d.tip)}</div>` : "") +
      `<div class="section-label">Things to do here</div>` +
      `<ul class="card-list">` +
      d.places.filter(isInSeason).map((p) => {
        const c = categoryFor(p.category);
        return `
        <li>
          <button class="card" data-place="${p.id}">
            <span class="card-icon">${c.icon}</span>
            <span class="card-text">
              <span class="card-name">${esc(p.name)}</span>
              <span class="card-meta">${esc(c.label)}</span>
            </span>
            ${p.months ? `<span class="card-badge" title="Only ${monthsLabel(p.months)}">🗓 ${monthsLabel(p.months)}</span>` : ""}
          </button>
        </li>`;
      }).join("") +
      `</ul>`;

    wireCards(d);
  }

  // The chip + description + tip + facts block is identical for a place
  // and a trip — only the header and the back link differ, which each
  // caller sets up itself.
  function placeBodyHtml(p, c, backHtml, mapsArea) {
    const facts = [
      ["Address", p.address],
      ["Hours",   p.hours],
      ["Price",   p.price],
      ["Link",    p.link ? `<a href="${esc(p.link)}" target="_blank" rel="noopener">Website &nearr;</a>` : null],
      ["Map",     `<a href="${esc(mapsSearchUrl(p.name, mapsArea))}" target="_blank" rel="noopener">Open in Google Maps &nearr;</a>`]
    ].filter(([, v]) => v);

    return `<span class="chip">${c.icon} ${esc(c.label)}</span>` +
      `<div class="prose">${prose(p.description)}</div>` +
      (p.tip ? `<div class="tip"><strong>Tip</strong>${esc(p.tip)}</div>` : "") +
      (facts.length
        ? `<dl class="facts">` +
          facts.map(([k, v]) =>
            `<div><dt>${k}</dt><dd>${k === "Link" || k === "Map" ? v : esc(v)}</dd></div>`
          ).join("") +
          `</dl>`
        : "") +
      backHtml;
  }

  function renderPlace(d, p) {
    const c = categoryFor(p.category);
    setActiveMarker(p.id);

    const shape = shapeOf(p);
    if (shape) {
      // A region: frame the whole of it rather than zooming in on one point.
      map.fitBounds(L.latLngBounds(flattenPoints(shape)), { padding: [70, 70] });
    } else {
      map.setView(p.coords, Math.max(map.getZoom(), 16), { animate: true });
    }

    setHeader(p.name, p.namePl, null, `Back to ${d.name}`, "/" + d.id);

    $("panel-body").innerHTML = placeBodyHtml(p, c,
      `<button class="btn-primary" data-back="${d.id}">Back to ${esc(d.name)}</button>`,
      `${d.name}, Kraków`);

    $("panel-body").querySelector("[data-back]")
      .addEventListener("click", () => { location.hash = "/" + d.id; });

    $("panel-body").scrollTop = 0;
  }

  /* ── View: one trip (a top-level pin, no district of its own) ─── */

  function renderTrip(t) {
    const c = categoryFor(t.category);
    setActiveMarker(t.id);
    $("map-legend").hidden = true;

    const shape = shapeOf(t);
    if (shape) {
      map.fitBounds(L.latLngBounds(flattenPoints(shape)), { padding: [70, 70] });
    } else {
      map.setView(t.coords, Math.max(map.getZoom(), 13), { animate: true });
    }

    setHeader(t.name, t.namePl, null, "All districts", "");

    $("panel-body").innerHTML = placeBodyHtml(t, c,
      `<button class="btn-primary" data-back>Back to all districts</button>`,
      "Poland");

    $("panel-body").querySelector("[data-back]")
      .addEventListener("click", () => { location.hash = ""; });

    $("panel-body").scrollTop = 0;
  }

  /* ── Wire up the clickable cards in the sidebar ─────────────── */

  function wireCards(district) {
    $("panel-body").querySelectorAll(".card").forEach((btn) => {
      const districtId = btn.dataset.district;
      const tripId = btn.dataset.trip;
      const placeId = btn.dataset.place;

      btn.addEventListener("click", () => {
        location.hash = districtId ? "/" + districtId
          : tripId ? "/" + tripId
          : `/${district.id}/${placeId}`;
        if (window.innerWidth <= 780) $("app").classList.remove("panel-collapsed");
      });

      // Hovering a card lights up the matching pin (and region) on the map.
      const id = districtId || tripId || placeId;
      const highlight = (on) => {
        const el = markersById[id]?.getElement()?.querySelector(".pin");
        if (el) el.classList.toggle("is-active", on);

        const entry = shapesById[id];
        if (entry) entry.layer.setStyle(shapeStyle(entry.place, entry.color, on));
      };
      btn.addEventListener("mouseenter", () => highlight(true));
      btn.addEventListener("mouseleave", () => highlight(false));
    });
  }

  /* ── Routing ────────────────────────────────────────────────
     The URL hash tracks where you are, so any view is a shareable
     link and the browser back button behaves as expected.
       #/kazimierz             a district
       #/kazimierz/plac-nowy   one place
       #/pieskowa-skala-zamek  a trip — top-level, no district         */

  // Which map layer is currently drawn: null (nothing yet), "home" (the
  // district + trip pins, shared by the home screen and any trip's own
  // view), or a district id.
  let currentView = null;

  function route() {
    const [id, placeId] = location.hash.replace(/^#\/?/, "").split("/");

    const district = id ? findDistrict(id) : null;
    if (district) {
      // Only redraw the pins when the district actually changed, so that
      // clicking between places in one district doesn't flicker the map.
      if (district.id !== currentView) {
        currentView = district.id;
        showDistrict(district, placeId);
        return;
      }
      const place = placeId ? findPlace(district, placeId) : null;
      if (place) renderPlace(district, place);
      else renderDistrictOverview(district);
      return;
    }

    const trip = id ? findTrip(id) : null;
    if (trip) {
      if (currentView !== "home") drawHomeLayer();
      currentView = "home";
      renderTrip(trip);
      return;
    }

    if (currentView !== "home") drawHomeLayer();
    currentView = "home";
    showHome();
  }

  window.addEventListener("hashchange", route);

  /* ── Filtering by month ────────────────────────────────────────
     Lives in the header rather than panel-body, so it stays put (and
     keeps its value) as you navigate between districts and places.   */

  $("month-select").addEventListener("change", (e) => {
    selectedMonth = e.target.value ? Number(e.target.value) : null;
    // Forces route() to redraw the current view's pins/list from scratch,
    // the same way a genuine navigation to a new district does.
    currentView = null;
    route();
  });

  /* ── Mobile: collapse the panel to see the whole map ────────── */

  $("mobile-toggle").addEventListener("click", () => {
    $("app").classList.toggle("panel-collapsed");
    setTimeout(() => map.invalidateSize(), 220);
  });

  /* ── Go ─────────────────────────────────────────────────────── */

  if (!districts.length) {
    $("panel-body").innerHTML =
      `<div class="prose"><p>No districts found. Check <code>js/data.js</code> — ` +
      `each district needs a <code>name</code> and at least one place with ` +
      `<code>coords</code>.</p></div>`;
  } else {
    route();
  }

})();
