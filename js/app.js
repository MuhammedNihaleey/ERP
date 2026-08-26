// ============================================================
// SAMPLE FOOTWEAR ERP — salesman screen
// Vanilla JS, no dependencies, everything in memory.
// ============================================================

const PAIRS_PER_BOX = 24;

// ---------- helpers ----------

// 142500 -> "1,42,500"  (Indian digit grouping)
function groupIndian(n) {
  const s = String(Math.round(Math.abs(n)));
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3;
}

function rupees(n) {
  return "₹" + groupIndian(n);
}

function el(id) {
  return document.getElementById(id);
}

// ---------- state ----------

const state = {
  customer: null,
  ratio: [0, 0, 0, 0, 0],
  boxes: 10,
  lines: []
};

// ============================================================
// TOP BAR + TABS
// ============================================================

function renderDate() {
  const d = new Date();
  el("todayDate").textContent = d.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function initTabs() {
  el("tabs").addEventListener("click", function (e) {
    const btn = e.target.closest(".tab");
    if (!btn) return;
    document.querySelectorAll(".tab").forEach(function (t) {
      t.classList.toggle("is-active", t === btn);
    });
    document.querySelectorAll(".panel").forEach(function (p) {
      p.hidden = p.id !== "panel-" + btn.dataset.tab;
    });
    window.scrollTo(0, 0);
  });
}

// ============================================================
// 1. CUSTOMER
// ============================================================

function initCustomers() {
  const sel = el("customerSelect");
  CUSTOMERS.forEach(function (c) {
    const o = document.createElement("option");
    o.value = c.id;
    o.textContent = c.name + " — " + c.place;
    sel.appendChild(o);
  });

  sel.addEventListener("change", function () {
    state.customer = CUSTOMERS.find(function (c) { return c.id === sel.value; }) || null;
    renderCustomerFigures();
    renderCredit(orderValue());
  });
}

function renderCustomerFigures() {
  const box = el("customerFigures");
  const c = state.customer;
  if (!c) {
    box.hidden = true;
    return;
  }
  box.hidden = false;

  el("figCredit").textContent = rupees(c.creditLimit);

  const ratio = c.outstanding / c.creditLimit;
  const out = el("figOutstanding");
  out.textContent = rupees(c.outstanding);
  out.classList.toggle("warn", ratio > 0.6);

  const note = el("figOutstandingNote");
  note.textContent = Math.round(ratio * 100) + "% of limit used";
  note.classList.toggle("warn", ratio > 0.6);

  const od = el("figOverdue");
  od.textContent = c.overdueDays > 0 ? c.overdueDays + " days" : "None";
  od.classList.toggle("warn", c.overdueDays > 0);
}

// ============================================================
// 2. ARTICLE + COLOUR
// ============================================================

function initArticles() {
  const artSel = el("articleSelect");
  ARTICLES.forEach(function (a) {
    const o = document.createElement("option");
    o.value = a.code;
    o.textContent = a.code + " — " + a.name;
    artSel.appendChild(o);
  });

  el("colourSelect").addEventListener("change", function () {
    renderSwatches();
    renderProduct();
    renderCalc();
  });

  // tapping a colour chip drives the same state as the hidden select
  el("swatches").addEventListener("click", function (e) {
    const btn = e.target.closest(".swatch");
    if (!btn) return;
    el("colourSelect").value = btn.dataset.colour;
    renderSwatches();
    renderProduct();
    renderCalc();
  });

  el("changeProduct").addEventListener("click", showCatalogue);

  renderColours();
}

function currentArticle() {
  return getArticle(el("articleSelect").value);
}

function renderColours() {
  const sel = el("colourSelect");
  const art = currentArticle();
  sel.innerHTML = "";
  art.colours.forEach(function (col) {
    const o = document.createElement("option");
    o.value = col;
    o.textContent = col;
    sel.appendChild(o);
  });
}

// ============================================================
// CATALOGUE
// Browse by category, tap a product, and the ratio builder
// below opens already set to that article and colour.
// ============================================================

let activeCategory = "gents";

function initCatalogue() {
  el("cats").innerHTML = CATEGORIES.map(function (c) {
    return '<button class="cat' + (c.key === activeCategory ? " is-active" : "") +
      '" data-cat="' + c.key + '">' + c.label + "</button>";
  }).join("");

  el("cats").addEventListener("click", function (e) {
    const btn = e.target.closest(".cat");
    if (!btn) return;
    activeCategory = btn.dataset.cat;
    document.querySelectorAll(".cat").forEach(function (c) {
      c.classList.toggle("is-active", c.dataset.cat === activeCategory);
    });
    renderCatGrid();
  });

  el("catGrid").addEventListener("click", function (e) {
    const card = e.target.closest(".card");
    if (!card) return;
    // a colour dot on the card picks that colour straight away
    const dot = e.target.closest(".card-dot");
    pickProduct(card.dataset.code, dot ? dot.dataset.colour : null);
  });

  renderCatGrid();
}

function renderCatGrid() {
  const list = ARTICLES.filter(function (a) { return a.category === activeCategory; });

  el("catalogueCount").textContent =
    list.length + (list.length === 1 ? " article" : " articles");

  el("catGrid").innerHTML = list.map(function (a) {
    const dots = a.colours.map(function (col) {
      const c = COLOUR_HEX[col] || COLOUR_HEX.Black;
      return '<span class="card-dot" data-colour="' + col + '" title="' + col +
        '" style="background:' + c.body + '"></span>';
    }).join("");

    return '<button type="button" class="card" data-code="' + a.code + '">' +
      '<span class="card-img">' + chappalSVG(a.code, a.colours[0]) + "</span>" +
      '<span class="card-body">' +
        '<span class="card-top">' +
          '<span class="card-code">' + a.code + "</span>" +
          '<span class="card-rate num">' + rupees(a.rate) + "</span>" +
        "</span>" +
        '<span class="card-name">' + a.name + "</span>" +
        '<span class="card-dots">' + dots + "</span>" +
      "</span>" +
    "</button>";
  }).join("");
}

function pickProduct(code, colour) {
  el("articleSelect").value = code;
  renderColours();

  const art = getArticle(code);
  el("colourSelect").value =
    colour && art.colours.indexOf(colour) !== -1 ? colour : art.colours[0];

  el("catalogueSection").hidden = true;
  el("pickedSection").hidden = false;
  el("ratioSection").hidden = false;
  el("qtySection").hidden = false;

  renderSwatches();
  renderProduct();
  renderAll();

  el("pickedSection").scrollIntoView({
    behavior: reduceMotion ? "auto" : "smooth",
    block: "start"
  });
}

function showCatalogue() {
  el("catalogueSection").hidden = false;
  el("pickedSection").hidden = true;
  el("ratioSection").hidden = true;
  el("qtySection").hidden = true;
  renderCatGrid();
  el("catalogueSection").scrollIntoView({
    behavior: reduceMotion ? "auto" : "smooth",
    block: "start"
  });
}

// ============================================================
// PRODUCT ILLUSTRATION
// Drawn as inline SVG rather than shipped photos: it recolours
// live from the colour dropdown and adds no external files.
// ============================================================

const COLOUR_HEX = {
  Black: { body: "#2E2A29", dark: "#171514", light: "#4A4443" },
  Brown: { body: "#7A4E2E", dark: "#4E301A", light: "#9A6A43" },
  Blue:  { body: "#2F5488", dark: "#1D3660", light: "#4670AC" }
};

// One sole outline, transformed per family, plus a strap style each.
// Toe at the top, viewed from above.
const SOLE =
  "M50 12c17 0 30 12 30 32 0 16-6 26-7 40-1 16 5 38 1 56-3 14-12 22-24 22" +
  "s-21-8-24-22c-4-18 2-40 1-56-1-14-7-24-7-40 0-20 13-32 30-32Z";

const FAMILY = {
  // gents: full width, chunky thong strap
  GTS: { squash: "", strap: "thong", width: 10 },
  // ladies: narrower sole, slim band across the forefoot
  LDS: { squash: "translate(50 87) scale(0.90 1) translate(-50 -87)", strap: "band", width: 7 },
  // kids: short and stubby
  KID: { squash: "translate(50 87) scale(0.96 0.82) translate(-50 -87)", strap: "thong", width: 9 }
};

function strapMarkup(style, c, w) {
  if (style === "band") {
    return '<path d="M21 66c9-11 49-11 58 0" fill="none" stroke="' + c.dark +
        '" stroke-width="' + w + '" stroke-linecap="round"/>' +
      '<path d="M26 78c8-7 40-7 48 0" fill="none" stroke="' + c.dark +
        '" stroke-width="' + (w - 2) + '" stroke-linecap="round" opacity="0.75"/>';
  }

  if (style === "cross") {
    // two straps crossing over the instep
    return '<path d="M23 78C38 70 58 58 74 62" fill="none" stroke="' + c.dark +
        '" stroke-width="' + w + '" stroke-linecap="round"/>' +
      '<path d="M77 78C62 70 42 58 26 62" fill="none" stroke="' + c.dark +
        '" stroke-width="' + w + '" stroke-linecap="round"/>';
  }

  if (style === "tstrap") {
    // band across, with a strip running up to the toe post
    return '<path d="M22 72c10-10 46-10 56 0" fill="none" stroke="' + c.dark +
        '" stroke-width="' + w + '" stroke-linecap="round"/>' +
      '<path d="M50 40v30" fill="none" stroke="' + c.dark +
        '" stroke-width="' + (w - 3) + '" stroke-linecap="round"/>' +
      '<circle cx="50" cy="38" r="4" fill="' + c.dark + '"/>';
  }

  // thong: a V from the toe post out to each edge
  return '<path d="M50 44C45 55 38 64 27 71" fill="none" stroke="' + c.dark +
      '" stroke-width="' + w + '" stroke-linecap="round"/>' +
    '<path d="M50 44c5 11 12 20 23 27" fill="none" stroke="' + c.dark +
      '" stroke-width="' + w + '" stroke-linecap="round"/>' +
    '<circle cx="50" cy="39" r="4.5" fill="' + c.dark + '"/>';
}

function chappalSVG(articleCode, colourName) {
  const fam = FAMILY[articleCode.split("-")[0]] || FAMILY.GTS;
  const c = COLOUR_HEX[colourName] || COLOUR_HEX.Black;
  const meta = getArticle(articleCode);
  const strap = (meta && meta.style) || fam.strap;

  return '<svg class="chappal" viewBox="0 0 100 176" role="img" aria-label="' +
    articleCode + " in " + colourName + '">' +
      '<ellipse class="ch-shadow" cx="50" cy="167" rx="27" ry="4.5"/>' +
      '<g' + (fam.squash ? ' transform="' + fam.squash + '"' : "") + ">" +
        // sole, with a darker rim
        '<path class="ch-sole" d="' + SOLE + '" fill="' + c.body +
          '" stroke="' + c.dark + '" stroke-width="3"/>' +
        // footbed contour, just enough to read as a shoe not a shape
        '<path d="M31 96c12 5 26 5 38 0" fill="none" stroke="' + c.dark +
          '" stroke-width="1.6" opacity="0.3"/>' +
        '<path d="M33 124c11 4 23 4 34 0" fill="none" stroke="' + c.dark +
          '" stroke-width="1.6" opacity="0.22"/>' +
        strapMarkup(strap, c, fam.width) +
        // highlight down the left of the footbed
        '<path class="ch-shine" d="M28 52c1-14 8-24 17-28" fill="none" stroke="' +
          c.light + '" stroke-width="2.5" stroke-linecap="round" opacity="0.5"/>' +
      "</g>" +
    "</svg>";
}

function renderProduct() {
  const art = currentArticle();
  const colour = el("colourSelect").value;
  const box = el("productImg");

  box.innerHTML = chappalSVG(art.code, colour);
  el("productCode").textContent = art.code;
  el("productName").textContent = art.name + " · " + colour;
  el("productRate").textContent = rupees(art.rate);

  // re-trigger the swap animation
  box.classList.remove("is-swapping");
  void box.offsetWidth;
  box.classList.add("is-swapping");
}

// colour chips under the dropdowns — faster to tap than a select on a phone
function renderSwatches() {
  const art = currentArticle();
  const current = el("colourSelect").value;
  el("swatches").innerHTML = art.colours.map(function (col) {
    const c = COLOUR_HEX[col] || COLOUR_HEX.Black;
    return '<button type="button" class="swatch' + (col === current ? " is-on" : "") +
      '" data-colour="' + col + '" title="' + col + '" aria-label="' + col + '">' +
      '<span style="background:' + c.body + '"></span>' + col + "</button>";
  }).join("");
}

// ============================================================
// 3. RATIO BUILDER
// ============================================================

function initRatio() {
  const grid = el("ratioGrid");
  SIZES.forEach(function (size, i) {
    const col = document.createElement("div");
    col.className = "ratio-col";
    col.innerHTML =
      '<div class="ratio-size">' + size + "</div>" +
      '<div class="stepper">' +
        '<button class="step-btn" data-delta="-1" data-i="' + i + '" aria-label="Decrease ' + size + '">&minus;</button>' +
        '<input class="ratio-input num" type="number" min="0" max="24" data-i="' + i + '" value="0">' +
        '<button class="step-btn" data-delta="1" data-i="' + i + '" aria-label="Increase ' + size + '">+</button>' +
      "</div>" +
      '<div class="ratio-stock" data-stock="' + i + '"></div>';
    grid.appendChild(col);
  });

  grid.addEventListener("click", function (e) {
    const btn = e.target.closest(".step-btn");
    if (!btn) return;
    const i = +btn.dataset.i;
    const next = state.ratio[i] + +btn.dataset.delta;
    state.ratio[i] = Math.max(0, Math.min(PAIRS_PER_BOX, next));
    syncRatioInputs();
    flash(grid.querySelectorAll(".ratio-input")[i], "bump");
    renderAll();
  });

  grid.addEventListener("input", function (e) {
    const input = e.target.closest(".ratio-input");
    if (!input) return;
    const v = parseInt(input.value, 10);
    state.ratio[+input.dataset.i] =
      isNaN(v) ? 0 : Math.max(0, Math.min(PAIRS_PER_BOX, v));
    renderAll();
  });

  el("presets").addEventListener("click", function (e) {
    const btn = e.target.closest(".preset");
    if (!btn) return;
    const key = btn.dataset.preset;
    state.ratio = key === "custom" ? [0, 0, 0, 0, 0] : PRESETS[key].slice();
    syncRatioInputs();
    renderAll();
  });

  // start on the standard ratio so the demo opens with live numbers
  state.ratio = PRESETS.standard.slice();
  syncRatioInputs();
}

function syncRatioInputs() {
  document.querySelectorAll(".ratio-input").forEach(function (input) {
    input.value = state.ratio[+input.dataset.i];
  });
}

function ratioTotal() {
  return state.ratio.reduce(function (a, b) { return a + b; }, 0);
}

function renderCounter() {
  const total = ratioTotal();
  const remaining = PAIRS_PER_BOX - total;
  const c = el("counter");
  const ok = total === PAIRS_PER_BOX;

  let tail;
  if (ok) tail = "box complete";
  else if (remaining > 0) tail = remaining + " remaining";
  else tail = Math.abs(remaining) + " over";

  c.innerHTML =
    total + " of " + PAIRS_PER_BOX + " assigned &mdash; " + tail +
    "<small>One box = 24 pairs</small>";
  c.classList.toggle("ok", ok);
  c.classList.toggle("warn", !ok);
}

function renderPresetState() {
  const cur = state.ratio.join(",");
  document.querySelectorAll(".preset").forEach(function (btn) {
    const key = btn.dataset.preset;
    const match = key === "custom"
      ? cur === "0,0,0,0,0"
      : PRESETS[key].join(",") === cur;
    btn.classList.toggle("is-active", match);
  });
}

// ============================================================
// MOTION HELPERS
// ============================================================

const reduceMotion = window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// replay a one-shot CSS animation class
function flash(node, cls) {
  if (!node || reduceMotion) return;
  node.classList.remove(cls);
  void node.offsetWidth;
  node.classList.add(cls);
}

// roll the headline figure to its new value instead of snapping
let totalAnim = null;
let lastTotal = null;

function setTotalPairs(value) {
  const node = el("calcTotalPairs");

  if (lastTotal === null || reduceMotion) {
    node.textContent = groupIndian(value);
    lastTotal = value;
    return;
  }
  if (value === lastTotal) return;

  const from = lastTotal;
  const start = performance.now();
  const dur = 340;

  if (totalAnim) cancelAnimationFrame(totalAnim);
  flash(node, "pop");

  function step(now) {
    const t = Math.min(1, (now - start) / dur);
    const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
    node.textContent = groupIndian(Math.round(from + (value - from) * eased));
    if (t < 1) {
      totalAnim = requestAnimationFrame(step);
    } else {
      node.textContent = groupIndian(value);
      totalAnim = null;
    }
  }

  totalAnim = requestAnimationFrame(step);
  lastTotal = value;
}

// ============================================================
// 4 + 5. LIVE CALCULATION
// ============================================================

function initBoxes() {
  el("boxesInput").addEventListener("input", function () {
    const v = parseInt(this.value, 10);
    state.boxes = isNaN(v) || v < 1 ? 0 : v;
    renderAll();
  });
}

function renderCalc() {
  const boxes = state.boxes;
  const stock = getStock(el("articleSelect").value, el("colourSelect").value);

  setTotalPairs(boxes * PAIRS_PER_BOX);
  el("calcFormula").innerHTML =
    (boxes || 0) + " boxes × " + PAIRS_PER_BOX + " pairs";

  const art = currentArticle();
  const linePairs = boxes * PAIRS_PER_BOX;
  el("calcLineValue").textContent = rupees(linePairs * art.rate);
  el("calcRateFormula").textContent =
    groupIndian(linePairs) + " pairs × " + rupees(art.rate);

  // header
  let head = "<th>Size</th>";
  SIZES.forEach(function (s) { head += "<th>" + s + "</th>"; });
  head += "<th>Total</th>";
  el("calcHead").innerHTML = head;

  // per box
  let perBox = '<td class="t-row-label">Per box</td>';
  state.ratio.forEach(function (n) {
    perBox += '<td class="t-strong">' + n + "</td>";
  });
  const total = ratioTotal();
  perBox += '<td class="t-strong ' + (total === PAIRS_PER_BOX ? "ok" : "warn") + '">' + total + "</td>";
  el("calcPerBox").innerHTML = perBox;

  // ordered
  let ordered = '<td class="t-row-label">Ordered</td>';
  state.ratio.forEach(function (n) {
    ordered += '<td class="t-lg">' + groupIndian(n * boxes) + "</td>";
  });
  ordered += '<td class="t-lg accent">' + groupIndian(total * boxes) + "</td>";
  el("calcOrdered").innerHTML = ordered;

  // stock indicator
  let stockRow = '<td class="t-row-label">Stock</td>';
  state.ratio.forEach(function (n, i) {
    const need = n * boxes;
    const have = stock[i];
    const low = have < need || have < LOW_STOCK_THRESHOLD;
    stockRow += '<td class="stock-tag ' + (low ? "warn" : "") + '">' +
      (low ? "Low stock" : "In stock") + "</td>";
  });
  stockRow += "<td></td>";
  el("calcStock").innerHTML = stockRow;

  // per-size note under the ratio builder
  document.querySelectorAll("[data-stock]").forEach(function (node, i) {
    const need = state.ratio[i] * boxes;
    const have = stock[i];
    const low = have < need || have < LOW_STOCK_THRESHOLD;
    node.textContent = low ? "Low stock" : "In stock";
    node.classList.toggle("warn", low);
  });
}

// ============================================================
// 6. ORDER LINES
// ============================================================

function initOrderList() {
  el("addLineBtn").addEventListener("click", function () {
    const art = currentArticle();
    const newId = Date.now() + Math.random();
    state.lastAddedId = newId;
    state.lines.push({
      id: newId,
      article: art.code,
      articleName: art.name,
      colour: el("colourSelect").value,
      boxes: state.boxes,
      ratio: state.ratio.slice(),
      pairs: state.boxes * PAIRS_PER_BOX,
      rate: art.rate,
      value: state.boxes * PAIRS_PER_BOX * art.rate
    });
    el("confirmMsg").hidden = true;
    renderOrderList();
    updateButtons();
  });

  el("orderBody").addEventListener("click", function (e) {
    const btn = e.target.closest("[data-remove]");
    if (!btn) return;
    const id = btn.dataset.remove;
    const row = btn.closest("tr");

    function drop() {
      state.lines = state.lines.filter(function (l) { return String(l.id) !== id; });
      el("confirmMsg").hidden = true;
      renderOrderList();
      updateButtons();
    }

    if (reduceMotion) {
      drop();
    } else {
      row.classList.add("row-out");
      setTimeout(drop, 240);
    }
  });

  el("submitBtn").addEventListener("click", function () {
    const orderNo = "SO-" + nextOrderNumber;
    nextOrderNumber++;

    const boxes = state.lines.reduce(function (a, l) { return a + l.boxes; }, 0);
    const pairs = state.lines.reduce(function (a, l) { return a + l.pairs; }, 0);

    // inline record, left on the page once the overlay is dismissed
    const msg = el("confirmMsg");
    msg.textContent =
      "Order sent to office for approval — Order no. " + orderNo;
    msg.hidden = false;

    showSuccess(orderNo, state.lines.length, boxes, pairs);
  });

  el("successDone").addEventListener("click", closeSuccess);
}

function renderOrderList() {
  const has = state.lines.length > 0;
  el("orderEmpty").hidden = has;
  el("orderTableWrap").hidden = !has;
  el("orderFoot").hidden = !has;

  const body = el("orderBody");
  body.innerHTML = state.lines.map(function (l) {
    const isNew = l.id === state.lastAddedId;
    return '<tr class="' + (isNew && !reduceMotion ? "row-in" : "") + '">' +
      '<td><span class="t-name">' + l.article + "</span>" +
        '<span class="t-sub">' + l.colour + "</span></td>" +
      '<td style="text-align:left" class="ratio-chip">' + l.ratio.join("-") + "</td>" +
      '<td class="t-strong">' + l.boxes + "</td>" +
      '<td class="t-strong">' + groupIndian(l.pairs) + "</td>" +
      '<td class="t-strong">' + rupees(l.value) + "</td>" +
      '<td><button class="linkbtn" data-remove="' + l.id + '">Remove</button></td>' +
      "</tr>";
  }).join("");

  const boxes = state.lines.reduce(function (a, l) { return a + l.boxes; }, 0);
  const pairs = state.lines.reduce(function (a, l) { return a + l.pairs; }, 0);
  const value = orderValue();

  el("totalBoxes").textContent = groupIndian(boxes);
  el("totalPairs").textContent = groupIndian(pairs);
  el("totalValue").textContent = rupees(value);

  renderCredit(value);
}

function orderValue() {
  return state.lines.reduce(function (a, l) { return a + l.value; }, 0);
}

// Does this order still fit inside what the dealer is allowed to owe?
function renderCredit(value) {
  const c = state.customer;
  const box = el("creditBox");

  if (!c || state.lines.length === 0) {
    box.hidden = true;
    return;
  }
  box.hidden = false;

  const headroom = c.creditLimit - c.outstanding - value;

  el("crLimit").textContent = rupees(c.creditLimit);
  el("crOut").textContent = "− " + rupees(c.outstanding);
  el("crOrder").textContent = "− " + rupees(value);
  el("crHeadroom").textContent =
    (headroom < 0 ? "− " : "") + rupees(Math.abs(headroom));

  const over = headroom < 0;
  el("crHeadroom").classList.toggle("warn", over);
  el("crHeadroomRow").classList.toggle("is-over", over);

  const flag = el("crFlag");
  flag.hidden = !over;
  if (over) {
    flag.textContent =
      "Exceeds credit limit by " + rupees(Math.abs(headroom)) +
      " — order will be held for office approval.";
  }
}

function updateButtons() {
  const ready = ratioTotal() === PAIRS_PER_BOX && state.boxes > 0;
  el("addLineBtn").disabled = !ready;

  const hint = el("addHint");
  if (ready) hint.textContent = "";
  else if (state.boxes < 1) hint.textContent = "Enter number of boxes";
  else hint.textContent = "Assign all 24 pairs to enable";

  el("submitBtn").disabled = state.lines.length === 0;
}

// ============================================================
// SUCCESS CHIME
// Synthesised with the Web Audio API — no audio file to ship,
// so it still works offline. Audio is a nice-to-have: every
// failure path is swallowed so it can never break the demo.
// ============================================================

let audioCtx = null;
let soundOn = true;

function initSound() {
  const btn = el("soundToggle");
  renderSoundToggle();
  btn.addEventListener("click", function () {
    soundOn = !soundOn;
    renderSoundToggle();
    if (soundOn) playChime(); // little preview so you know it's back on
  });
}

function renderSoundToggle() {
  const btn = el("soundToggle");
  const speaker = '<path d="M3 6h3l4-3.5v13L6 12H3z" fill="currentColor"/>';
  const waves =
    '<path d="M12.5 5.5a4 4 0 010 7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>';
  const slash =
    '<path d="M12.5 6l4 6M16.5 6l-4 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>';

  btn.innerHTML =
    '<svg viewBox="0 0 18 18" aria-hidden="true">' +
    speaker + (soundOn ? waves : slash) + "</svg>";
  btn.classList.toggle("is-on", soundOn);
  btn.setAttribute("aria-pressed", soundOn ? "true" : "false");
  btn.setAttribute("title", soundOn ? "Sound on" : "Sound off");
  btn.setAttribute("aria-label", soundOn ? "Sound on" : "Sound off");
}

function playChime() {
  if (!soundOn) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!audioCtx) audioCtx = new AC();
    // browsers start the context suspended until a user gesture
    if (audioCtx.state === "suspended" && audioCtx.resume) audioCtx.resume();

    const now = audioCtx.currentTime;
    // rising major triad — E5, G#5, B5
    const notes = [
      { freq: 659.25, at: 0.00 },
      { freq: 830.61, at: 0.085 },
      { freq: 987.77, at: 0.17 }
    ];

    notes.forEach(function (n) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = n.freq;

      const t = now + n.at;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.16, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + 0.45);
    });
  } catch (e) {
    // no audio available — carry on silently
  }
}

// ============================================================
// ORDER PLACED — animated confirmation
// ============================================================

function showSuccess(orderNo, lineCount, boxes, pairs) {
  el("successOrderNo").textContent = orderNo;
  el("successMeta").textContent =
    lineCount + (lineCount === 1 ? " line" : " lines") + " · " +
    groupIndian(boxes) + " boxes · " + groupIndian(pairs) + " pairs · " +
    rupees(orderValue());

  const c = state.customer;
  const over = c && (c.creditLimit - c.outstanding - orderValue()) < 0;
  el("successSub").textContent = over
    ? "Held for credit approval at office"
    : "Sent to office for approval";

  const overlay = el("successOverlay");
  overlay.hidden = false;
  restartAnimations(overlay);
  playChime();
  el("successDone").focus();
}

// CSS animations only fire once, so reset them to replay the tick
// every time an order is placed — not just the first.
function restartAnimations(root) {
  const nodes = [root].concat(Array.prototype.slice.call(root.querySelectorAll("*")));
  nodes.forEach(function (n) { n.style.animation = "none"; });
  void root.offsetWidth; // force reflow
  nodes.forEach(function (n) { n.style.animation = ""; });
}

function closeSuccess() {
  if (el("successOverlay").hidden) return;
  el("successOverlay").hidden = true;
  startNewOrder();
}

// after a submit, clear the pad down for the next order
function startNewOrder() {
  state.lines = [];
  state.ratio = PRESETS.standard.slice();
  state.boxes = 10;
  el("boxesInput").value = 10;
  syncRatioInputs();

  // back to the catalogue, ready for the next order
  el("catalogueSection").hidden = false;
  el("pickedSection").hidden = true;
  el("ratioSection").hidden = true;
  el("qtySection").hidden = true;

  renderOrderList();
  renderAll();
  window.scrollTo(0, 0);
}

document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") closeSuccess();
});

// ============================================================
// READ-ONLY TABS
// ============================================================

function renderCustomersTab() {
  el("customersBody").innerHTML = CUSTOMERS.map(function (c) {
    const over = c.outstanding / c.creditLimit > 0.6;
    return "<tr>" +
      '<td><span class="t-name">' + c.name + "</span>" +
        '<span class="t-sub">' + c.place + "</span></td>" +
      '<td class="t-strong">' + rupees(c.creditLimit) + "</td>" +
      '<td class="t-strong' + (over ? " warn" : "") + '">' + rupees(c.outstanding) + "</td>" +
      '<td class="muted">' + formatDate(c.lastOrder) + "</td>" +
      "</tr>";
  }).join("");
}

function formatDate(iso) {
  const p = iso.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return parseInt(p[2], 10) + " " + months[parseInt(p[1], 10) - 1] + " " + p[0];
}

function renderStockTab() {
  let head = "<th>Article</th><th>Colour</th>";
  SIZES.forEach(function (s) { head += "<th>" + s + "</th>"; });
  el("stockHead").innerHTML = head;

  const keys = Object.keys(STOCK).slice(0, 6);
  el("stockBody").innerHTML = keys.map(function (k) {
    const parts = k.split("|");
    const rows = STOCK[k].map(function (n) {
      return '<td class="t-strong' + (n < LOW_STOCK_THRESHOLD ? " warn" : "") + '">' +
        groupIndian(n) + "</td>";
    }).join("");
    return "<tr><td><span class=\"t-name\">" + parts[0] + "</span></td>" +
      '<td class="muted">' + parts[1] + "</td>" + rows + "</tr>";
  }).join("");
}

function renderPaymentsTab() {
  el("paymentsBody").innerHTML = PAYMENTS.map(function (p) {
    const late = p.overdueDays > 30;
    return "<tr>" +
      '<td><span class="t-name">' + p.customer + "</span></td>" +
      '<td class="muted">' + p.invoiceNo + "</td>" +
      '<td class="t-strong">' + rupees(p.amount) + "</td>" +
      '<td class="t-strong' + (late ? " warn" : "") + '">' + p.overdueDays + " days</td>" +
      "</tr>";
  }).join("");
}

// ============================================================
// BOOT
// ============================================================

function renderAll() {
  renderCounter();
  renderPresetState();
  renderCalc();
  updateButtons();
}

renderDate();
initSound();
initTabs();
initCustomers();
initArticles();
initCatalogue();
initRatio();
initBoxes();
initOrderList();
renderOrderList();
renderCustomersTab();
renderStockTab();
renderPaymentsTab();
renderAll();
