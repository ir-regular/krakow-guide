/* =====================================================================
   Boundary editor — proof of concept
   =====================================================================
   Draw a rough polygon on the map, then copy the coordinates it prints
   out into DISTRICT_SHAPES (or a place's `area`/`path`) in js/data.js.

   This is a standalone dev tool — it doesn't read or write data.js, it
   just gets you the array of [lat, lon] points in the right shape.
   ===================================================================== */

(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const round4 = (n) => Math.round(n * 10000) / 10000;

  const DRAFT_STYLE    = { color: "#b3441f", weight: 3, opacity: .85, dashArray: "6 6", fill: false };
  const FINISHED_STYLE = { color: "#b3441f", weight: 3, opacity: .9, fillColor: "#b3441f", fillOpacity: .22 };

  /* ── Map ────────────────────────────────────────────────────── */

  const map = L.map("map", { zoomControl: true, scrollWheelZoom: true })
    .setView([50.0614, 19.9366], 13);

  L.maplibreGL({
    style: "https://tiles.openfreemap.org/styles/liberty",
    attributionControl: {
      customAttribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }
  }).addTo(map);

  const vertexGroup = L.layerGroup().addTo(map);
  let previewLayer = null;
  let previewIsPolygon = false;

  /* ── State ──────────────────────────────────────────────────── */

  let points = [];      // [[lat, lon], …]
  let finished = false;

  /* ── DOM ────────────────────────────────────────────────────── */

  const statusEl    = $("status");
  const undoBtn     = $("undo-btn");
  const finishBtn   = $("finish-btn");
  const clearBtn    = $("clear-btn");
  const copyBtn     = $("copy-btn");
  const outputEl    = $("output");
  const outputBox   = outputEl.parentElement;
  const cursorEl    = $("cursor-readout");

  /* ── Drawing ────────────────────────────────────────────────── */

  function vertexIcon(kind) {
    return L.divIcon({
      className: "vertex-icon vertex-" + kind,
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });
  }

  function updatePreviewShape() {
    if (points.length < 2) {
      if (previewLayer) { map.removeLayer(previewLayer); previewLayer = null; }
      return;
    }
    if (!previewLayer || previewIsPolygon !== finished) {
      if (previewLayer) map.removeLayer(previewLayer);
      previewLayer = (finished ? L.polygon(points, FINISHED_STYLE) : L.polyline(points, DRAFT_STYLE)).addTo(map);
      previewIsPolygon = finished;
    } else {
      previewLayer.setLatLngs(points);
    }
  }

  function removePoint(i) {
    points.splice(i, 1);
    if (finished && points.length < 3) finished = false;
    rebuildMarkers();
    updatePreviewShape();
    updateOutput();
    updateButtons();
    updateStatus();
  }

  function rebuildMarkers() {
    vertexGroup.clearLayers();

    points.forEach((pt, i) => {
      const isFirst = i === 0;
      const readyToClose = isFirst && points.length >= 3 && !finished;
      const kind = readyToClose ? "first-ready" : (isFirst ? "first" : "normal");

      const marker = L.marker(pt, { icon: vertexIcon(kind), draggable: true });

      if (readyToClose) {
        marker.bindTooltip("Click to finish", { direction: "top", offset: [0, -12] });
      }

      marker.on("click", (e) => {
        if (readyToClose) {
          L.DomEvent.stop(e);
          finish();
        }
      });

      marker.on("dblclick", (e) => {
        L.DomEvent.stop(e);
        removePoint(i);
      });

      marker.on("drag", () => {
        const ll = marker.getLatLng();
        points[i] = [round4(ll.lat), round4(ll.lng)];
        updatePreviewShape();
        updateOutput();
      });

      marker.on("dragend", rebuildMarkers);

      marker.addTo(vertexGroup);
    });
  }

  /* ── Output ─────────────────────────────────────────────────── */

  function formatOutput() {
    // toFixed(4), not template-literal interpolation — plain `${n}` drops
    // trailing zeros (50.0620 -> "50.062"), which doesn't match the four-
    // decimal style the rest of data.js already uses.
    const body = points.map((p) => `    [${p[0].toFixed(4)}, ${p[1].toFixed(4)}]`).join(",\n");
    return `[\n${body}\n  ]`;
  }

  function updateOutput() {
    outputEl.textContent = points.length ? formatOutput() : "Draw a shape to see its coordinates here.";
    outputBox.classList.toggle("is-ready", finished);
    copyBtn.disabled = !finished;
  }

  function updateButtons() {
    undoBtn.disabled = finished || points.length === 0;
    finishBtn.disabled = finished || points.length < 3;
    clearBtn.disabled = points.length === 0;
  }

  function updateStatus() {
    if (finished) {
      statusEl.textContent = `Shape finished — ${points.length} points. Drag a point to adjust, or Clear to start over.`;
    } else if (points.length === 0) {
      statusEl.textContent = "Click the map to place the first point.";
    } else if (points.length < 3) {
      statusEl.textContent = `${points.length} point${points.length > 1 ? "s" : ""} placed — need at least 3 to close the shape.`;
    } else {
      statusEl.textContent = `${points.length} points placed — click the first point (green) or press Finish shape.`;
    }
  }

  /* ── Actions ────────────────────────────────────────────────── */

  function finish() {
    if (finished || points.length < 3) return;
    finished = true;
    rebuildMarkers();
    updatePreviewShape();
    updateOutput();
    updateButtons();
    updateStatus();
  }

  map.on("click", (e) => {
    if (finished) return;
    points.push([round4(e.latlng.lat), round4(e.latlng.lng)]);
    rebuildMarkers();
    updatePreviewShape();
    updateOutput();
    updateButtons();
    updateStatus();
  });

  map.on("mousemove", (e) => {
    cursorEl.textContent = `${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`;
  });
  map.on("mouseout", () => { cursorEl.textContent = ""; });

  undoBtn.addEventListener("click", () => {
    if (finished || !points.length) return;
    points.pop();
    rebuildMarkers();
    updatePreviewShape();
    updateOutput();
    updateButtons();
    updateStatus();
  });

  finishBtn.addEventListener("click", finish);

  clearBtn.addEventListener("click", () => {
    points = [];
    finished = false;
    rebuildMarkers();
    updatePreviewShape();
    updateOutput();
    updateButtons();
    updateStatus();
  });

  copyBtn.addEventListener("click", async () => {
    const text = outputEl.textContent;
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      // Clipboard API can be unavailable (e.g. a plain file:// page) —
      // fall back to selecting the text so Ctrl/Cmd+C still works.
      const range = document.createRange();
      range.selectNodeContents(outputEl);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
    const original = copyBtn.textContent;
    copyBtn.textContent = "Copied!";
    setTimeout(() => { copyBtn.textContent = original; }, 1200);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !finishBtn.disabled) finish();
  });

  updateButtons();

})();
