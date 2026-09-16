// ============================================================
// SAMPLE FOOTWEAR ERP — charts
//
// Two forms only, both deliberately plain: a horizontal bar list
// for "compare these amounts", and a meter for "how much of the
// limit is used". Nothing to learn how to read.
//
// Built from ordinary HTML rather than SVG, so a long dealer name
// or a big rupee figure simply wraps or sits outside the bar —
// text is never clipped by its own bar, and the whole thing
// reflows on a phone for free.
//
// Every bar carries its own value as text, and every chart sits
// directly above the table of the same numbers, so nothing here
// is readable only by eye or only on hover.
// ============================================================

const BAR_MIN_PCT = 0;   // truthful widths; a 3px floor is applied in CSS

// ---------- horizontal bars: compare amounts ----------
//
// rows: [{ label, sub, value, display, tip }]
//   label   — the category, e.g. "In production"
//   sub     — a quieter second line, e.g. "1 order"
//   value   — the number the bar length encodes
//   display — how the value is written out, e.g. "₹1,74,000"
//   tip     — optional longer breakdown, shown on hover/focus
//
// One measure, one colour. Bars are never coloured by their own
// value — the length already says that, and spending colour on it
// as well would leave nothing to say anything else with.

function chartBars(target, rows, opts) {
  const node = typeof target === "string" ? el(target) : target;
  if (!node) return;

  const o = opts || {};
  const max = rows.reduce(function (m, r) { return Math.max(m, r.value || 0); }, 0);

  if (rows.length === 0 || max <= 0) {
    node.innerHTML = '<p class="chart-empty">' +
      esc(o.empty || "Nothing to show yet.") + "</p>";
    return;
  }

  node.innerHTML = rows.map(function (r) {
    const value = r.value || 0;
    const pct = Math.max((value / max) * 100, BAR_MIN_PCT);
    const tip = r.tip || (r.label + " — " + (r.display || value));

    return '<div class="chart-row" tabindex="0" data-tip="' + esc(tip) + '">' +
      '<span class="chart-label">' + esc(r.label) +
        (r.sub ? '<span class="chart-sub">' + esc(r.sub) + "</span>" : "") +
      "</span>" +
      '<span class="chart-track">' +
        '<span class="chart-bar' + (value > 0 ? "" : " is-zero") +
          '" style="width:' + pct.toFixed(2) + '%"></span>' +
      "</span>" +
      '<span class="chart-value num">' + esc(r.display || String(value)) + "</span>" +
    "</div>";
  }).join("");
}

// ---------- meters: how much of the limit is used ----------
//
// rows: [{ label, sub, pct, display, state, stateLabel, tip }]
//   pct        — 0-100; the end of the track is the limit itself,
//                so a full bar means "at the limit", which needs
//                no explaining
//   state      — "ok" | "warn" | "over"
//   stateLabel — the word for that state, always shown: the colour
//                never carries the meaning on its own
//
// The fill and its track are two steps of one hue, so the state
// reads across the whole width of the bar, not just the filled part.

function chartMeters(target, rows, opts) {
  const node = typeof target === "string" ? el(target) : target;
  if (!node) return;

  const o = opts || {};

  if (rows.length === 0) {
    node.innerHTML = '<p class="chart-empty">' +
      esc(o.empty || "Nothing to show yet.") + "</p>";
    return;
  }

  node.innerHTML = rows.map(function (r) {
    const pct = Math.max(0, Math.min(100, r.pct || 0));
    const state = r.state || "ok";
    const tip = r.tip || (r.label + " — " + (r.display || ""));

    return '<div class="chart-row is-meter" tabindex="0" data-state="' + state +
        '" data-tip="' + esc(tip) + '">' +
      '<span class="chart-label">' + esc(r.label) +
        (r.sub ? '<span class="chart-sub">' + esc(r.sub) + "</span>" : "") +
      "</span>" +
      '<span class="chart-track">' +
        '<span class="chart-bar" style="width:' + pct.toFixed(2) + '%"></span>' +
      "</span>" +
      '<span class="chart-value num">' + esc(r.display || "") +
        '<span class="chart-state">' + stateIcon(state) +
          esc(r.stateLabel || "") + "</span>" +
      "</span>" +
    "</div>";
  }).join("");
}

// A state is never colour alone: each one carries a shape and a word.
function stateIcon(state) {
  if (state === "over") {
    return '<svg class="chart-state-icon" viewBox="0 0 12 12" aria-hidden="true">' +
      '<path d="M6 1.5 11 10.5H1z" fill="none" stroke="currentColor" stroke-width="1.4" ' +
        'stroke-linejoin="round"/><path d="M6 5v2.2" stroke="currentColor" ' +
        'stroke-width="1.4" stroke-linecap="round"/>' +
      '<circle cx="6" cy="9" r="0.7" fill="currentColor"/></svg>';
  }
  if (state === "warn") {
    return '<svg class="chart-state-icon" viewBox="0 0 12 12" aria-hidden="true">' +
      '<circle cx="6" cy="6" r="4.6" fill="none" stroke="currentColor" stroke-width="1.4"/>' +
      '<path d="M6 3.4v3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>' +
      '<circle cx="6" cy="8.5" r="0.7" fill="currentColor"/></svg>';
  }
  return '<svg class="chart-state-icon" viewBox="0 0 12 12" aria-hidden="true">' +
    '<path d="M2.5 6.4 5 8.9l4.5-5.4" fill="none" stroke="currentColor" ' +
      'stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

// ---------- the thresholds behind the states ----------

// Share of a credit limit already used up.
function creditState(pct) {
  if (pct >= 90) return { state: "over", label: "Over" };
  if (pct >= 60) return { state: "warn", label: "Watch" };
  return { state: "ok", label: "Comfortable" };
}

// Stock against the level the factory wants held: a full bar is "at level".
function coverState(pct) {
  if (pct < 60) return { state: "over", label: "Reorder" };
  if (pct < 100) return { state: "warn", label: "Low" };
  return { state: "ok", label: "Covered" };
}

// ============================================================
// HOVER / FOCUS DETAIL
// The bars are already labelled and the same numbers sit in the
// table below, so this only ever adds detail — it is never the
// only way to read a value.
// ============================================================

let chartTip = null;

function ensureChartTip() {
  if (chartTip && chartTip.isConnected) return chartTip;
  chartTip = document.createElement("div");
  chartTip.className = "chart-tip";
  chartTip.hidden = true;
  document.body.appendChild(chartTip);
  return chartTip;
}

function showChartTip(row) {
  const text = row.getAttribute("data-tip");
  if (!text) return;

  const tip = ensureChartTip();
  tip.textContent = text;
  tip.hidden = false;

  // sit above the row, centred on it, and nudged back inside the viewport
  const r = row.getBoundingClientRect();
  const w = tip.offsetWidth;
  const margin = 8;
  let left = r.left + r.width / 2 - w / 2;
  left = Math.max(margin, Math.min(left, window.innerWidth - w - margin));

  const above = r.top - tip.offsetHeight - 8;
  tip.style.left = Math.round(left) + "px";
  tip.style.top = Math.round(above > margin ? above : r.bottom + 8) + "px";
}

function hideChartTip() {
  if (chartTip) chartTip.hidden = true;
}

// One delegated set of handlers for every chart on the page — the rows are
// rebuilt on each render, so per-row listeners would go stale.
function initCharts() {
  document.addEventListener("mouseover", function (e) {
    const row = e.target.closest && e.target.closest(".chart-row");
    if (row) showChartTip(row);
  });

  document.addEventListener("mouseout", function (e) {
    const row = e.target.closest && e.target.closest(".chart-row");
    if (row) hideChartTip();
  });

  // keyboard users see exactly what a mouse shows
  document.addEventListener("focusin", function (e) {
    const row = e.target.closest && e.target.closest(".chart-row");
    if (row) showChartTip(row);
  });

  document.addEventListener("focusout", hideChartTip);
  window.addEventListener("scroll", hideChartTip, { passive: true });
}
