// ============================================================
// SAMPLE FOOTWEAR ERP — salesman screen
// Vanilla JS, no dependencies, everything in memory.
// ============================================================

const PAIRS_PER_BOX = 24;

// box counts offered in the quantity dropdown
const BOX_OPTIONS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50];

// ratio sets offered in the size dropdown
const RATIO_SETS = [
  { key: "standard", label: "Standard" },
  { key: "large", label: "Large mix" },
  { key: "small", label: "Small mix" },
  { key: "custom", label: "Custom…" }
];

// the ratio actually in force for a row: a named set, or its own custom split
function ratioFor(item) {
  return item.preset === "custom" ? item.custom : PRESETS[item.preset];
}

function ratioTotal(item) {
  return ratioFor(item).reduce(function (a, b) { return a + b; }, 0);
}

// a custom split that doesn't add up to a full box blocks submission
function itemValid(item) {
  return ratioTotal(item) === PAIRS_PER_BOX;
}

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

// ids are stable for the life of the page; only container contents change
const elCache = Object.create(null);

function el(id) {
  let node = elCache[id];
  if (!node || !node.isConnected) {
    node = document.getElementById(id);
    elCache[id] = node;
  }
  return node;
}

function esc(str) {
  return String(str).replace(/[&<>"]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
  });
}

const reduceMotion = window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// replay a one-shot CSS animation class
function flash(node, cls) {
  if (!node || reduceMotion) return;
  node.classList.remove(cls);
  void node.offsetWidth;
  node.classList.add(cls);
}

// ---------- state ----------

const state = {
  customer: null,
  items: [],          // { id, code, colour, preset, boxes }
  category: "all",
  brand: null,
  search: "",
  // the order page's own picker keeps its filters separate from the shop's
  pickerCat: "all",
  pickerSearch: "",
  ordFilter: "all"
};

let nextItemId = 1;

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
    showTab(btn.dataset.tab);
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
    renderTotals();
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
  GTS: { squash: "", strap: "thong", width: 10 },
  LDS: { squash: "translate(50 87) scale(0.90 1) translate(-50 -87)", strap: "band", width: 7 },
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
    return '<path d="M23 78C38 70 58 58 74 62" fill="none" stroke="' + c.dark +
        '" stroke-width="' + w + '" stroke-linecap="round"/>' +
      '<path d="M77 78C62 70 42 58 26 62" fill="none" stroke="' + c.dark +
        '" stroke-width="' + w + '" stroke-linecap="round"/>';
  }

  if (style === "tstrap") {
    return '<path d="M22 72c10-10 46-10 56 0" fill="none" stroke="' + c.dark +
        '" stroke-width="' + w + '" stroke-linecap="round"/>' +
      '<path d="M50 40v30" fill="none" stroke="' + c.dark +
        '" stroke-width="' + (w - 3) + '" stroke-linecap="round"/>' +
      '<circle cx="50" cy="38" r="4" fill="' + c.dark + '"/>';
  }

  return '<path d="M50 44C45 55 38 64 27 71" fill="none" stroke="' + c.dark +
      '" stroke-width="' + w + '" stroke-linecap="round"/>' +
    '<path d="M50 44c5 11 12 20 23 27" fill="none" stroke="' + c.dark +
      '" stroke-width="' + w + '" stroke-linecap="round"/>' +
    '<circle cx="50" cy="39" r="4.5" fill="' + c.dark + '"/>';
}

// the same article/colour is drawn many times across the strips and grid,
// so build each combination once
const svgCache = new Map();

function chappalSVG(articleCode, colourName) {
  const key = articleCode + "|" + colourName;
  let cached = svgCache.get(key);
  if (cached === undefined) {
    cached = buildChappal(articleCode, colourName);
    svgCache.set(key, cached);
  }
  return cached;
}

function buildChappal(articleCode, colourName) {
  const fam = FAMILY[articleCode.split("-")[0]] || FAMILY.GTS;
  const c = COLOUR_HEX[colourName] || COLOUR_HEX.Black;
  const meta = getArticle(articleCode);
  const strap = (meta && meta.style) || fam.strap;

  return '<svg class="chappal" viewBox="0 0 100 176" role="img" aria-label="' +
    articleCode + " in " + colourName + '">' +
      '<ellipse class="ch-shadow" cx="50" cy="167" rx="27" ry="4.5"/>' +
      '<g' + (fam.squash ? ' transform="' + fam.squash + '"' : "") + ">" +
        '<path class="ch-sole" d="' + SOLE + '" fill="' + c.body +
          '" stroke="' + c.dark + '" stroke-width="3"/>' +
        '<path d="M31 96c12 5 26 5 38 0" fill="none" stroke="' + c.dark +
          '" stroke-width="1.6" opacity="0.3"/>' +
        '<path d="M33 124c11 4 23 4 34 0" fill="none" stroke="' + c.dark +
          '" stroke-width="1.6" opacity="0.22"/>' +
        strapMarkup(strap, c, fam.width) +
        '<path class="ch-shine" d="M28 52c1-14 8-24 17-28" fill="none" stroke="' +
          c.light + '" stroke-width="2.5" stroke-linecap="round" opacity="0.5"/>' +
      "</g>" +
    "</svg>";
}

// ============================================================
// 2. SHOP — the browsing surface a salesman shows a dealer
// ============================================================

function initShop() {
  el("shopCats").innerHTML =
    [{ key: "all", label: "All" }].concat(CATEGORIES).map(function (c) {
      return '<button type="button" class="cat' +
        (c.key === state.category ? " is-active" : "") +
        '" data-cat="' + c.key + '">' + c.label + "</button>";
    }).join("");

  el("shopCats").addEventListener("click", function (e) {
    const btn = e.target.closest(".cat");
    if (!btn) return;
    state.category = btn.dataset.cat;
    document.querySelectorAll("#shopCats .cat").forEach(function (c) {
      c.classList.toggle("is-active", c.dataset.cat === state.category);
    });
    renderGrid();
  });

  el("logoRail").addEventListener("click", function (e) {
    const tile = e.target.closest(".logo-card");
    if (!tile) return;
    state.brand = tile.dataset.brand;
    renderGrid();
    el("browseTitle").scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start"
    });
  });

  el("brandClear").addEventListener("click", function () {
    state.brand = null;
    renderGrid();
  });

  el("shopSearch").addEventListener("input", function () {
    state.search = this.value.trim().toLowerCase();
    renderShop();
  });

  el("shopSearchBtn").addEventListener("click", function () {
    el("shopSearch").focus();
  });

  // every card lives in a container that delegates up to here
  document.getElementById("panel-shop").addEventListener("click", function (e) {
    const inc = e.target.closest("[data-inc]");
    if (inc) {
      e.preventDefault();
      incArticle(inc.dataset.inc);
      bumpBag(inc);
      return;
    }

    const dec = e.target.closest("[data-dec]");
    if (dec) {
      e.preventDefault();
      decArticle(dec.dataset.dec);
      return;
    }

    const add = e.target.closest("[data-add]");
    if (!add) return;
    e.preventDefault();
    addItem(add.dataset.add, add.dataset.colour || null);
    bumpBag(add);
  });

  el("goShop").addEventListener("click", function () {
    showTab("shop");
  });

  el("bagBtn").addEventListener("click", function () {
    showTab("order");
  });

  el("bagBarGo").addEventListener("click", function () {
    showTab("order");
  });

  renderShop();
}

// the review screen has no tab of its own — it belongs to the Order tab
const TAB_FOR_PANEL = { review: "order" };

function showTab(name) {
  const lit = TAB_FOR_PANEL[name] || name;

  document.querySelectorAll(".tab").forEach(function (t) {
    t.classList.toggle("is-active", t.dataset.tab === lit);
  });
  document.querySelectorAll(".panel").forEach(function (p) {
    p.hidden = p.id !== "panel-" + name;
  });

  if (name !== "order") closePicker();

  if (name === "order" && bagDirty) {
    bagDirty = false;
    drawSelected();
  }

  if (name === "pending") renderPendingTab();

  renderBagBar();
  window.scrollTo(0, 0);
}

function cardMarkup(a, opts) {
  const note = opts && opts.note ? opts.note : "";
  const dots = a.colours.map(function (col) {
    const c = COLOUR_HEX[col] || COLOUR_HEX.Black;
    return '<span class="card-dot" data-add="' + a.code + '" data-colour="' + col +
      '" style="background:' + c.body + '" title="Add in ' + col + '"></span>';
  }).join("");

  return '<article class="card" data-code="' + a.code + '">' +
    (a.isNew ? '<span class="card-flag">New</span>' : "") +
    '<span class="card-inbag">Added</span>' +
    (note ? '<span class="card-flag card-flag-warn">' + note + "</span>" : "") +
    '<div class="card-img">' + chappalSVG(a.code, a.colours[0]) + "</div>" +
    '<div class="card-top">' +
      '<span class="card-code">' + a.code + "</span>" +
      '<span class="card-rate num">' + rupees(a.rate) + "</span>" +
    "</div>" +
    '<span class="card-name">' + esc(a.name) + "</span>" +
    '<span class="card-brand">' + esc(getBrand(a.brand).name) + "</span>" +
    '<div class="card-dots">' + dots + "</div>" +
    '<div class="card-cta">' +
      '<button type="button" class="card-add" data-add="' + a.code + '">+ Add</button>' +
      '<div class="card-qty">' +
        '<button type="button" class="card-step" data-dec="' + a.code +
          '" aria-label="Remove a box of ' + a.code + '">&minus;</button>' +
        '<span class="card-qty-num" data-qty="' + a.code + '">1 added</span>' +
        '<button type="button" class="card-step" data-inc="' + a.code +
          '" aria-label="Add a box of ' + a.code + '">+</button>' +
      "</div>" +
    "</div>" +
  "</article>";
}

function matchingArticles() {
  return ARTICLES.filter(function (a) {
    if (state.brand && a.brand !== state.brand) return false;
    if (state.category !== "all" && a.category !== state.category) return false;
    return true;
  });
}

function searchArticles() {
  return ARTICLES.filter(function (a) {
    return (a.code + " " + a.name).toLowerCase().indexOf(state.search) !== -1;
  });
}

function renderShop() {
  const searching = state.search.length > 0;

  el("shopHome").hidden = searching;
  el("shopResults").hidden = !searching;

  if (searching) {
    const found = searchArticles();
    el("shopResultsCount").textContent =
      found.length + (found.length === 1 ? " article" : " articles");
    el("gridResults").innerHTML = found.length
      ? found.map(function (a) { return cardMarkup(a); }).join("")
      : '<p class="picker-none">No article matches “' + esc(state.search) + '”.</p>';
    renderAddedStates();
    return;
  }

  el("stripNew").innerHTML = ARTICLES.filter(function (a) { return a.isNew; })
    .map(function (a) { return cardMarkup(a); }).join("");

  el("stripFast").innerHTML = ARTICLES.filter(function (a) { return a.fastMoving; })
    .map(function (a) { return cardMarkup(a); }).join("");

  // the four thinnest articles in the godown
  const low = ARTICLES.slice()
    .sort(function (x, y) { return articleStock(x.code) - articleStock(y.code); })
    .slice(0, 4);
  el("stripLow").innerHTML = low.map(function (a) {
    return cardMarkup(a, { note: groupIndian(articleStock(a.code)) + " left" });
  }).join("");

  renderBrands();
  renderGrid();
  renderAddedStates();
}

// ------------------------------------------------------------
// The company rail drifts on its own but is also a real scroller,
// so it can be swiped or dragged anywhere at any time. Driving
// scrollLeft (rather than a CSS transform) is what makes both
// possible at once.
// ------------------------------------------------------------

function renderBrands() {
  function tile(b) {
    return '<button type="button" class="logo-card" data-brand="' + b.key +
        '" title="' + esc(b.name) + '">' +
        '<span class="logo-word" data-logo="' + b.logo +
          '" style="--bc:' + b.colour + '">' + esc(b.name) + "</span>" +
        '<span class="logo-tag">' + esc(b.tagline) + "</span>" +
      "</button>";
  }

  // the set is rendered twice so the rail can wrap seamlessly at halfway
  const once = BRANDS.map(tile).join("");
  el("logoTrack").innerHTML = once + once;
  if (typeof applyRail === "function") applyRail();
}

function renderGrid() {
  const list = matchingArticles();
  const brand = state.brand ? getBrand(state.brand) : null;

  document.querySelectorAll(".logo-card").forEach(function (t) {
    t.classList.toggle("is-active", t.dataset.brand === state.brand);
  });

  el("brandActive").hidden = !brand;
  if (brand) el("brandActiveName").textContent = brand.name + " — " + brand.tagline;
  el("browseTitle").textContent = brand ? "Browse " + brand.name : "Browse by category";

  el("shopCount").textContent =
    list.length + (list.length === 1 ? " article" : " articles");

  el("gridAll").innerHTML = list.length
    ? list.map(function (a) { return cardMarkup(a); }).join("")
    : '<p class="picker-none">Nothing in this company for that category.</p>';

  renderAddedStates();
}

function bumpBag(sourceNode) {
  flash(el("bagBtn"), "bump");

  const card = sourceNode.closest(".card");
  if (!card) return;

  flash(card, "card-added");
  flash(card.querySelector("[data-qty]"), "bump");
}

// every card for an article already in the order keeps a standing mark
function renderAddedStates() {
  document.querySelectorAll("#panel-shop .card").forEach(function (card) {
    const boxes = articleBoxes(card.dataset.code);
    card.classList.toggle("is-in-bag", boxes > 0);

    const num = card.querySelector("[data-qty]");
    if (num) num.textContent = boxes + " added";
  });
}

function renderBagCount() {
  const n = state.items.length;
  el("bagCount").textContent = n;
  el("bagBtn").classList.toggle("has-items", n > 0);

  el("bagBarCount").textContent = n + (n === 1 ? " item" : " items");
  el("bagBarValue").textContent = rupees(orderValue());
  renderBagBar();
  renderAddedStates();
  renderPickerAdded();
}

// the picker rows carry the same standing "N added" mark as the shop cards
function renderPickerAdded() {
  document.querySelectorAll("#pickerList .prow").forEach(function (row) {
    const boxes = articleBoxes(row.dataset.code);
    row.classList.toggle("is-in-bag", boxes > 0);

    let tag = row.querySelector(".prow-added");
    if (boxes > 0) {
      if (!tag) {
        tag = document.createElement("span");
        tag.className = "prow-added";
        row.querySelector(".prow-code").appendChild(tag);
      }
      tag.textContent = boxes + " added";
    } else if (tag) {
      tag.remove();
    }
  });
}

// only worth showing while browsing, and only once there is something to view
function renderBagBar() {
  const onShop = !el("panel-shop").hidden;
  el("bagBar").hidden = !(onShop && state.items.length > 0);
}

// ------------------------------------------------------------
// COMPANY RAIL
//
// The drift runs on a composited transform rather than scrollLeft.
// Writing scrollLeft each frame makes the browser round the offset to
// whole pixels, so a sub-pixel step lurches instead of gliding — that
// was the stutter. translate3d takes fractional values and stays on
// the GPU, so it holds a steady frame rate.
//
// Dragging moves the same value, which is what lets it be swiped
// anywhere at any moment, with a little inertia on release.
// ------------------------------------------------------------

const RAIL_SPEED = 0.032;      // px per millisecond (~32px/s)
let railPos = 0;               // px scrolled, always within [0, half)
let railPaused = false;
let railResume = null;
let railVel = 0;               // px/ms, carried after a flick
let railLast = 0;

function railHalf() {
  const track = el("logoTrack");
  return track ? track.offsetWidth / 2 : 0;
}

function applyRail() {
  const half = railHalf();
  if (half > 0) railPos = ((railPos % half) + half) % half;
  el("logoTrack").style.transform = "translate3d(" + (-railPos) + "px,0,0)";
}

function initRail() {
  const rail = el("logoRail");
  const DRAG_SLOP = 5;          // px of movement before it counts as a drag

  let pressing = false;         // finger/button is down
  let dragging = false;         // and has moved far enough to be a drag
  let startX = 0;
  let startPos = 0;
  let moved = 0;
  let lastX = 0;
  let lastT = 0;
  let pointerId = null;

  function pause() {
    railPaused = true;
    clearTimeout(railResume);
  }

  function resumeSoon(delay) {
    clearTimeout(railResume);
    railResume = setTimeout(function () { railPaused = false; }, delay || 1400);
  }

  rail.addEventListener("pointerenter", function (e) {
    if (e.pointerType === "mouse") pause();
  });

  rail.addEventListener("pointerleave", function (e) {
    if (e.pointerType === "mouse" && !pressing) resumeSoon(300);
  });

  rail.addEventListener("pointerdown", function (e) {
    pressing = true;
    dragging = false;
    moved = 0;
    railVel = 0;
    startX = lastX = e.clientX;
    startPos = railPos;
    lastT = performance.now();
    pointerId = e.pointerId;
    pause();
    // deliberately no setPointerCapture here: capturing on press retargets
    // the click to the rail, and a tap would never reach the logo card
  });

  rail.addEventListener("pointermove", function (e) {
    if (!pressing) return;

    const dx = e.clientX - startX;
    moved = Math.max(moved, Math.abs(dx));

    if (!dragging) {
      if (moved < DRAG_SLOP) return;   // still just a press
      dragging = true;
      rail.classList.add("is-dragging");
      if (rail.setPointerCapture) {
        try { rail.setPointerCapture(pointerId); } catch (err) {}
      }
    }

    const now = performance.now();
    const dt = now - lastT;
    if (dt > 0) railVel = -(e.clientX - lastX) / dt;
    lastX = e.clientX;
    lastT = now;

    railPos = startPos - dx;
    applyRail();
    e.preventDefault();
  });

  function endPress(e) {
    if (!pressing) return;
    pressing = false;

    if (dragging) {
      rail.classList.remove("is-dragging");
      if (rail.releasePointerCapture && pointerId != null) {
        try { rail.releasePointerCapture(pointerId); } catch (err) {}
      }
    } else {
      railVel = 0;                     // a tap should not fling the rail
    }

    dragging = false;
    pointerId = null;
    resumeSoon();
  }

  rail.addEventListener("pointerup", endPress);
  rail.addEventListener("pointercancel", endPress);

  // a drag must not also register as a tap on a logo
  rail.addEventListener("click", function (e) {
    if (moved > DRAG_SLOP) {
      e.preventDefault();
      e.stopPropagation();
      moved = 0;
    }
  }, true);

  rail.addEventListener("wheel", function (e) {
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (!d) return;
    railPos += d;
    applyRail();
    pause();
    resumeSoon();
    e.preventDefault();
  }, { passive: false });

  applyRail();
  if (!reduceMotion) requestAnimationFrame(stepRail);
}

// time-based so the speed is identical on 60Hz and 120Hz screens
function stepRail(now) {
  const dt = railLast ? Math.min(now - railLast, 50) : 16;
  railLast = now;

  if (!el("panel-shop").hidden) {
    if (Math.abs(railVel) > 0.004) {
      // glide out a flick
      railPos += railVel * dt;
      railVel *= Math.pow(0.9975, dt);
      applyRail();
    } else if (!railPaused) {
      railVel = 0;
      railPos += RAIL_SPEED * dt;
      applyRail();
    }
  }

  requestAnimationFrame(stepRail);
}

// ============================================================
// 2b. PRODUCT PICKER — the searchable dropdown on the order page.
// Same products as the shop, but reachable without leaving the order.
// ============================================================

function initPicker() {
  el("pickerCats").innerHTML =
    [{ key: "all", label: "All" }].concat(CATEGORIES).map(function (c) {
      return '<button type="button" class="pcat' +
        (c.key === state.pickerCat ? " is-active" : "") +
        '" data-cat="' + c.key + '">' + c.label + "</button>";
    }).join("");

  el("pickerCats").addEventListener("click", function (e) {
    const btn = e.target.closest(".pcat");
    if (!btn) return;
    state.pickerCat = btn.dataset.cat;
    document.querySelectorAll(".pcat").forEach(function (c) {
      c.classList.toggle("is-active", c.dataset.cat === state.pickerCat);
    });
    renderPickerList();
  });

  el("pickerSearch").addEventListener("input", function () {
    state.pickerSearch = this.value.trim().toLowerCase();
    openPicker();
    renderPickerList();
  });

  el("pickerSearch").addEventListener("focus", openPicker);

  el("pickerBtn").addEventListener("click", function () {
    if (el("pickerPanel").hidden) {
      openPicker();
      el("pickerSearch").focus();
    } else {
      closePicker();
    }
  });

  // a row adds the article; a colour dot adds it in that colour
  el("pickerList").addEventListener("click", function (e) {
    const dot = e.target.closest("[data-colour]");
    const row = e.target.closest(".prow");
    if (!row) return;
    addItem(row.dataset.code, dot ? dot.dataset.colour : null);
    flash(row, "card-added");
    flash(el("bagBtn"), "bump");
  });

  // clicking away closes the panel
  document.addEventListener("click", function (e) {
    if (!e.target.closest("#picker")) closePicker();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closePicker();
  });

  renderPickerList();
}

function openPicker() {
  el("pickerPanel").hidden = false;
  el("picker").classList.add("is-open");
}

function closePicker() {
  el("pickerPanel").hidden = true;
  el("picker").classList.remove("is-open");
}

function pickerArticles() {
  return ARTICLES.filter(function (a) {
    if (state.pickerCat !== "all" && a.category !== state.pickerCat) return false;
    if (!state.pickerSearch) return true;
    return (a.code + " " + a.name + " " + getBrand(a.brand).name)
      .toLowerCase().indexOf(state.pickerSearch) !== -1;
  });
}

function renderPickerList() {
  const list = pickerArticles();
  const box = el("pickerList");

  if (list.length === 0) {
    box.innerHTML = '<p class="picker-none">No article matches \u201C' +
      esc(state.pickerSearch) + '\u201D.</p>';
    return;
  }

  box.innerHTML = list.map(function (a) {
    const dots = a.colours.map(function (col) {
      const c = COLOUR_HEX[col] || COLOUR_HEX.Black;
      return '<span class="prow-dot" data-colour="' + col +
        '" style="background:' + c.body + '" title="Add in ' + col + '"></span>';
    }).join("");

    const boxes = articleBoxes(a.code);

    return '<button type="button" class="prow' + (boxes > 0 ? " is-in-bag" : "") +
        '" data-code="' + a.code + '">' +
      '<span class="prow-img">' + chappalSVG(a.code, a.colours[0]) + "</span>" +
      '<span class="prow-main">' +
        '<span class="prow-code">' + a.code +
          (boxes > 0 ? '<span class="prow-added">' + boxes + " added</span>" : "") +
        "</span>" +
        '<span class="prow-name">' + esc(a.name) + " \u00B7 " +
          esc(getBrand(a.brand).name) + "</span>" +
        '<span class="prow-dots">' + dots + "</span>" +
      "</span>" +
      '<span class="prow-rate num">' + rupees(a.rate) + "</span>" +
    "</button>";
  }).join("");
}

// ============================================================
// 3. SELECTED ITEMS
// ============================================================

function initSelected() {
  // colour / size / quantity all funnel through one change handler
  el("selList").addEventListener("change", function (e) {
    const field = e.target.closest("[data-field]");
    if (!field) return;

    const item = state.items.find(function (i) {
      return String(i.id) === field.dataset.id;
    });
    if (!item) return;

    const key = field.dataset.field;

    if (key === "custom") {
      const v = parseInt(field.value, 10);
      item.custom[+field.dataset.i] =
        isNaN(v) ? 0 : Math.max(0, Math.min(PAIRS_PER_BOX, v));
      refreshCustom(item);
      updateRowFigures(item);
      renderTotals();
      return;
    }

    item[key] = key === "boxes" ? parseInt(field.value, 10) : field.value;

    if (key === "preset") {
      const row = field.closest(".sel");
      row.querySelector(".sel-custom").hidden = item.preset !== "custom";
      refreshCustom(item);
    }

    if (key === "colour") {
      const img = el("selList").querySelector('[data-img="' + item.id + '"]');
      if (img) {
        img.innerHTML = chappalSVG(item.code, item.colour);
        flash(img, "is-swapping");
      }
    }

    updateRowFigures(item);
    renderTotals();
  });

  el("selList").addEventListener("input", function (e) {
    const field = e.target.closest('[data-field="custom"]');
    if (!field) return;
    const item = state.items.find(function (i) {
      return String(i.id) === field.dataset.id;
    });
    if (!item) return;

    const v = parseInt(field.value, 10);
    item.custom[+field.dataset.i] =
      isNaN(v) ? 0 : Math.max(0, Math.min(PAIRS_PER_BOX, v));
    refreshCustom(item);
    updateRowFigures(item);
    renderTotals();
  });

  el("selList").addEventListener("click", function (e) {
    const btn = e.target.closest("[data-remove]");
    if (!btn) return;

    const id = btn.dataset.remove;
    const row = btn.closest(".sel");

    function drop() {
      state.items = state.items.filter(function (i) { return String(i.id) !== id; });
      el("confirmMsg").hidden = true;
      renderSelected();
      renderTotals();
    }

    if (reduceMotion) {
      drop();
    } else {
      row.classList.add("row-out");
      setTimeout(drop, 240);
    }
  });

  el("submitBtn").addEventListener("click", openReview);
  el("successDone").addEventListener("click", function () { closeSuccess("pending"); });
  el("successNew").addEventListener("click", function () { closeSuccess("shop"); });
}

function addItem(code, colour) {
  const art = getArticle(code);
  if (!art) return;

  state.items.push({
    id: nextItemId++,
    code: code,
    colour: colour && art.colours.indexOf(colour) !== -1 ? colour : art.colours[0],
    preset: "standard",
    custom: PRESETS.standard.slice(),
    boxes: 1
  });

  el("confirmMsg").hidden = true;
  renderSelected();
  renderTotals();
}

function articleBoxes(code) {
  return state.items.reduce(function (a, i) {
    return i.code === code ? a + i.boxes : a;
  }, 0);
}

// tapping + on a card adjusts the line most recently added for that article,
// so two colours of the same article stay as two separate lines
function lastItemFor(code) {
  for (let i = state.items.length - 1; i >= 0; i--) {
    if (state.items[i].code === code) return state.items[i];
  }
  return null;
}

function incArticle(code) {
  const item = lastItemFor(code);
  if (!item) { addItem(code, null); return; }
  item.boxes += 1;
  afterQtyChange();
}

function decArticle(code) {
  const item = lastItemFor(code);
  if (!item) return;
  if (item.boxes > 1) item.boxes -= 1;
  else state.items = state.items.filter(function (i) { return i !== item; });
  afterQtyChange();
}

function afterQtyChange() {
  el("confirmMsg").hidden = true;
  renderSelected();
  renderTotals();
}

function itemPairs(item) {
  return item.boxes * ratioTotal(item);
}

function itemValue(item) {
  return itemPairs(item) * getArticle(item.code).rate;
}

let bagDirty = false;

// the order is a separate tab: skip the DOM work while it is hidden and
// catch up the moment it is opened
function renderSelected() {
  if (el("panel-order").hidden) {
    bagDirty = true;
    return;
  }
  bagDirty = false;
  drawSelected();
}

function drawSelected() {
  const has = state.items.length > 0;
  el("selEmpty").hidden = has;
  el("sumBox").hidden = !has;
  el("selCount").textContent = has
    ? state.items.length + (state.items.length === 1 ? " item" : " items")
    : "";

  el("selList").innerHTML = state.items.map(function (it) {
    const art = getArticle(it.code);

    const colourOpts = art.colours.map(function (c) {
      return '<option value="' + c + '"' +
        (c === it.colour ? " selected" : "") + ">" + c + "</option>";
    }).join("");

    const sizeOpts = RATIO_SETS.map(function (r) {
      return '<option value="' + r.key + '"' +
        (r.key === it.preset ? " selected" : "") + ">" + r.label + "</option>";
    }).join("");

    // five small inputs, shown only while this row is on Custom
    const customCells = SIZES.map(function (size, i) {
      return '<label class="cust-cell">' +
        '<span class="cust-size">' + size + "</span>" +
        '<input class="cust-input num" type="number" min="0" max="24" ' +
          'data-field="custom" data-id="' + it.id + '" data-i="' + i + '" ' +
          'value="' + it.custom[i] + '">' +
      "</label>";
    }).join("");

    // include the current value so a stepped count like 7 still shows
    const opts = BOX_OPTIONS.indexOf(it.boxes) === -1
      ? BOX_OPTIONS.concat([it.boxes]).sort(function (a, b) { return a - b; })
      : BOX_OPTIONS;

    const boxOpts = opts.map(function (n) {
      return '<option value="' + n + '"' +
        (n === it.boxes ? " selected" : "") + ">" + n +
        (n === 1 ? " box" : " boxes") + "</option>";
    }).join("");

    const valid = itemValid(it);
    const total = ratioTotal(it);

    return '<div class="sel row-in' + (valid ? "" : " is-invalid") + '">' +
      '<div class="sel-img" data-img="' + it.id + '">' +
        chappalSVG(it.code, it.colour) +
      "</div>" +

      '<div class="sel-main">' +
        '<div class="sel-code">' + it.code + "</div>" +
        '<div class="sel-name">' + esc(art.name) + "</div>" +
        '<div class="sel-rate num">' + rupees(art.rate) + " per pair</div>" +
      "</div>" +

      '<div class="sel-controls">' +
        '<label class="sel-ctl">' +
          '<span class="label">Colour</span>' +
          '<select data-field="colour" data-id="' + it.id + '">' + colourOpts + "</select>" +
        "</label>" +
        '<label class="sel-ctl sel-ctl-wide">' +
          '<span class="label">Size ratio</span>' +
          '<select data-field="preset" data-id="' + it.id + '">' + sizeOpts + "</select>" +
        "</label>" +
        '<label class="sel-ctl">' +
          '<span class="label">Quantity</span>' +
          '<select data-field="boxes" data-id="' + it.id + '">' + boxOpts + "</select>" +
        "</label>" +
      "</div>" +

      '<div class="sel-figs">' +
        '<div class="sel-pairs num" data-pairs="' + it.id + '"></div>' +
        '<div class="sel-value num" data-value="' + it.id + '"></div>' +
      "</div>" +

      '<button class="sel-x" data-remove="' + it.id + '" aria-label="Remove ' +
        it.code + '">&times;</button>' +

      '<div class="sel-custom"' + (it.preset === "custom" ? "" : " hidden") + '>' +
        '<div class="cust-grid">' + customCells + "</div>" +
        '<div class="cust-total' + (valid ? "" : " warn") + '" data-cust="' + it.id + '">' +
          total + " of " + PAIRS_PER_BOX + " pairs assigned" +
        "</div>" +
      "</div>" +
    "</div>";
  }).join("");

  state.items.forEach(updateRowFigures);
}

function refreshCustom(item) {
  const node = el("selList").querySelector('[data-cust="' + item.id + '"]');
  if (!node) return;

  const total = ratioTotal(item);
  const ok = itemValid(item);

  node.textContent = total + " of " + PAIRS_PER_BOX + " pairs assigned";
  node.classList.toggle("warn", !ok);
  node.closest(".sel").classList.toggle("is-invalid", !ok);
}

function updateRowFigures(item) {
  const p = el("selList").querySelector('[data-pairs="' + item.id + '"]');
  const v = el("selList").querySelector('[data-value="' + item.id + '"]');
  if (!p || !v) return;

  p.textContent = ratioFor(item).join("-") + " · " +
    groupIndian(itemPairs(item)) + " pairs";
  v.textContent = rupees(itemValue(item));
  flash(v, "bump");
}

// ============================================================
// TOTALS + CREDIT
// ============================================================

function orderValue() {
  return state.items.reduce(function (a, i) { return a + itemValue(i); }, 0);
}

function renderTotals() {
  const boxes = state.items.reduce(function (a, i) { return a + i.boxes; }, 0);
  const pairs = state.items.reduce(function (a, i) { return a + itemPairs(i); }, 0);
  const value = orderValue();

  el("sumBoxes").textContent = groupIndian(boxes);
  el("sumPairs").textContent = groupIndian(pairs);
  el("sumValue").textContent = rupees(value);
  flash(el("sumValue"), "pop");

  const allValid = state.items.every(itemValid);
  const empty = state.items.length === 0;
  const noDealer = !state.customer;

  el("submitBtn").disabled = empty || !allValid || noDealer;
  renderBagCount();

  const hint = el("submitHint");
  const problem = !allValid
    ? "One item's custom ratio doesn't add up to 24 pairs."
    : noDealer ? "Select a dealer at the top before submitting." : "";

  hint.hidden = empty || !problem;
  hint.textContent = problem;
  el("submitNote").hidden = empty || !!problem;

  renderCredit(value);
}

// Does this order still fit inside what the dealer is allowed to owe?
function renderCredit(value) {
  const c = state.customer;
  const box = el("creditBox");

  if (!c || state.items.length === 0) {
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

// ============================================================
// SUCCESS CHIME
// Synthesised with the Web Audio API — no audio file to ship,
// so it still works offline. Every failure path is swallowed.
// ============================================================

let audioCtx = null;
let soundOn = true;

function initSound() {
  const btn = el("soundToggle");
  renderSoundToggle();
  btn.addEventListener("click", function () {
    soundOn = !soundOn;
    renderSoundToggle();
    if (soundOn) playChime();
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
    if (audioCtx.state === "suspended" && audioCtx.resume) audioCtx.resume();

    const now = audioCtx.currentTime;
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

// ============================================================
// REVIEW — the order list, shown between Submit and Place order
// ============================================================

function initReview() {
  el("reviewBack").addEventListener("click", function () { showTab("order"); });
  el("placeBtn").addEventListener("click", placeOrder);
}

function openReview() {
  if (state.items.length === 0 || !state.customer) return;
  closePicker();
  renderReview();
  showTab("review");
}

function isoToday() {
  const d = new Date();
  return d.getFullYear() + "-" +
    String(d.getMonth() + 1).padStart(2, "0") + "-" +
    String(d.getDate()).padStart(2, "0");
}

function renderReview() {
  const c = state.customer;

  el("reviewCustomer").textContent = c ? c.name : "\u2014";
  el("reviewPlace").textContent = c ? c.place : "";
  el("reviewDate").textContent = formatDate(isoToday());

  el("reviewBody").innerHTML = state.items.map(function (it) {
    const art = getArticle(it.code);
    const col = COLOUR_HEX[it.colour] || COLOUR_HEX.Black;

    return "<tr>" +
      '<td><span class="rev-cell">' +
        '<span class="rev-img">' + chappalSVG(it.code, it.colour) + "</span>" +
        '<span><span class="t-name">' + it.code + "</span>" +
          '<span class="t-sub">' + esc(art.name) + " \u00B7 " +
            esc(getBrand(art.brand).name) + "</span></span>" +
      "</span></td>" +
      '<td class="muted"><span class="rev-dot" style="background:' + col.body +
        '"></span>' + it.colour + "</td>" +
      '<td class="muted num">' + ratioFor(it).join("-") + "</td>" +
      '<td class="t-strong">' + it.boxes + "</td>" +
      '<td class="t-strong">' + groupIndian(itemPairs(it)) + "</td>" +
      '<td class="t-strong">' + rupees(itemValue(it)) + "</td>" +
    "</tr>";
  }).join("");

  const boxes = state.items.reduce(function (a, i) { return a + i.boxes; }, 0);
  const pairs = state.items.reduce(function (a, i) { return a + itemPairs(i); }, 0);
  const value = orderValue();

  el("revBoxes").textContent = groupIndian(boxes);
  el("revPairs").textContent = groupIndian(pairs);
  el("revValue").textContent = rupees(value);

  const headroom = c ? c.creditLimit - c.outstanding - value : 0;
  const flag = el("revFlag");
  flag.hidden = headroom >= 0;
  if (headroom < 0) {
    flag.textContent = "Exceeds credit limit by " + rupees(Math.abs(headroom)) +
      " \u2014 the order will be held for office approval.";
  }

  el("confirmMsg").hidden = true;
}

// ============================================================
// ORDER PLACED — animated confirmation
// ============================================================

function placeOrder() {
  const c = state.customer;
  if (!c || state.items.length === 0) return;

  const orderNo = "SO-" + nextOrderNumber;
  nextOrderNumber++;

  const boxes = state.items.reduce(function (a, i) { return a + i.boxes; }, 0);
  const pairs = state.items.reduce(function (a, i) { return a + itemPairs(i); }, 0);
  const value = orderValue();
  const over = (c.creditLimit - c.outstanding - value) < 0;

  // A placed order keeps its own copy of every line, resolved ratio and all,
  // so later edits to the working order can never reach back into it.
  ORDERS.unshift({
    no: orderNo,
    customerId: c.id,
    date: isoToday(),
    status: "pending",
    note: over
      ? "Held at office \u2014 dealer is over credit limit"
      : "Waiting for office approval",
    lines: state.items.map(function (it) {
      return {
        code: it.code,
        colour: it.colour,
        ratio: ratioFor(it).slice(),
        boxes: it.boxes
      };
    })
  });

  renderPendingTab();

  const msg = el("confirmMsg");
  msg.textContent = "Order placed \u2014 Order no. " + orderNo;
  msg.hidden = false;

  el("successOrderNo").textContent = orderNo;
  el("successMeta").textContent =
    state.items.length + (state.items.length === 1 ? " item" : " items") + " \u00B7 " +
    groupIndian(boxes) + " boxes \u00B7 " + groupIndian(pairs) + " pairs \u00B7 " + rupees(value);

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
  void root.offsetWidth;
  nodes.forEach(function (n) { n.style.animation = ""; });
}

function closeSuccess(dest) {
  if (el("successOverlay").hidden) return;
  el("successOverlay").hidden = true;
  startNewOrder(dest || "pending");
}

function startNewOrder(dest) {
  state.items = [];
  state.search = "";
  state.pickerSearch = "";
  el("shopSearch").value = "";
  el("pickerSearch").value = "";
  el("confirmMsg").hidden = true;
  renderShop();
  renderPickerList();
  renderSelected();
  renderTotals();
  showTab(dest === "shop" ? "shop" : "pending");
}

document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") closeSuccess("pending");
});

// ============================================================
// PENDING ORDERS
// Status is owned by office / production / godown — dummy for now.
// ============================================================

const ORDER_FILTERS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Awaiting approval", has: ["pending"] },
  { key: "making", label: "In production", has: ["approved", "production", "ready"] },
  { key: "dispatched", label: "Dispatched", has: ["dispatched"] },
  { key: "delivered", label: "Delivered", has: ["delivered"] }
];

function initPending() {
  el("ordFilters").innerHTML = ORDER_FILTERS.map(function (f) {
    return '<button type="button" class="cat' +
      (f.key === state.ordFilter ? " is-active" : "") +
      '" data-filter="' + f.key + '">' + f.label + "</button>";
  }).join("");

  el("ordFilters").addEventListener("click", function (e) {
    const btn = e.target.closest("[data-filter]");
    if (!btn) return;
    state.ordFilter = btn.dataset.filter;
    document.querySelectorAll("#ordFilters .cat").forEach(function (c) {
      c.classList.toggle("is-active", c.dataset.filter === state.ordFilter);
    });
    renderPendingTab();
  });

  // an order opens to show the lines it was placed with
  el("ordList").addEventListener("click", function (e) {
    const head = e.target.closest(".ord-head");
    if (!head) return;
    const card = head.closest(".ord");
    const open = card.classList.toggle("is-open");
    card.querySelector(".ord-body").hidden = !open;
    head.setAttribute("aria-expanded", open ? "true" : "false");
  });

  renderPendingTab();
}

function lineRatioTotal(line) {
  return line.ratio.reduce(function (a, b) { return a + b; }, 0);
}

function linePairs(line) {
  return line.boxes * lineRatioTotal(line);
}

function lineValue(line) {
  const art = getArticle(line.code);
  return art ? linePairs(line) * art.rate : 0;
}

function orderTotals(order) {
  return order.lines.reduce(function (t, l) {
    t.boxes += l.boxes;
    t.pairs += linePairs(l);
    t.value += lineValue(l);
    return t;
  }, { boxes: 0, pairs: 0, value: 0 });
}

function filteredOrders() {
  const f = ORDER_FILTERS.find(function (x) { return x.key === state.ordFilter; });
  if (!f || !f.has) return ORDERS;
  return ORDERS.filter(function (o) { return f.has.indexOf(o.status) !== -1; });
}

function renderPendingTab() {
  const list = filteredOrders();
  const awaiting = ORDERS.filter(function (o) {
    return o.status !== "delivered";
  }).length;

  el("pendingCount").textContent =
    awaiting + (awaiting === 1 ? " order open" : " orders open");

  el("ordNone").hidden = list.length > 0;

  el("ordList").innerHTML = list.map(function (o) {
    const c = getCustomer(o.customerId);
    const st = getStatus(o.status);
    const t = orderTotals(o);
    const items = o.lines.length;

    const lines = o.lines.map(function (l) {
      const art = getArticle(l.code);
      const col = COLOUR_HEX[l.colour] || COLOUR_HEX.Black;
      return '<div class="ordline">' +
        '<span class="ordline-img">' + chappalSVG(l.code, l.colour) + "</span>" +
        '<span class="ordline-main">' +
          '<span class="ordline-code">' + l.code + "</span>" +
          '<span class="ordline-name">' + esc(art ? art.name : "") + "</span>" +
        "</span>" +
        '<span class="ordline-meta num">' +
          '<span class="rev-dot" style="background:' + col.body + '"></span>' +
          l.colour + " \u00B7 " + l.ratio.join("-") + " \u00B7 " + l.boxes +
          (l.boxes === 1 ? " box" : " boxes") + " \u00B7 " +
          groupIndian(linePairs(l)) + " pairs</span>" +
        '<span class="ordline-value num">' + rupees(lineValue(l)) + "</span>" +
      "</div>";
    }).join("");

    return '<article class="ord" data-no="' + o.no + '">' +
      '<button type="button" class="ord-head" aria-expanded="false">' +
        '<span class="ord-id">' +
          '<span class="ord-no">' + o.no + "</span>" +
          '<span class="ord-date">' + formatDate(o.date) + "</span>" +
        "</span>" +
        '<span class="ord-who">' +
          '<span class="ord-name">' + esc(c ? c.name : "Unknown dealer") + "</span>" +
          '<span class="ord-place">' + esc(c ? c.place : "") + "</span>" +
        "</span>" +
        '<span class="ord-figs">' +
          '<span class="ord-value num">' + rupees(t.value) + "</span>" +
          '<span class="ord-meta num">' + items +
            (items === 1 ? " item \u00B7 " : " items \u00B7 ") +
            groupIndian(t.boxes) + " boxes \u00B7 " +
            groupIndian(t.pairs) + " pairs</span>" +
        "</span>" +
        '<span class="ord-status" data-tone="' + st.tone + '">' + st.label + "</span>" +
        '<span class="ord-chev" aria-hidden="true">' +
          '<svg viewBox="0 0 16 16"><path d="M4 6l4 4 4-4" fill="none" ' +
            'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" ' +
            'stroke-linejoin="round"/></svg>' +
        "</span>" +
      "</button>" +
      '<div class="ord-body" hidden>' +
        (o.note ? '<p class="ord-note">' + esc(o.note) + "</p>" : "") +
        '<div class="ord-lines">' + lines + "</div>" +
        '<div class="ord-foot">' +
          "<span>Order value</span>" +
          '<span class="num">' + rupees(t.value) + "</span>" +
        "</div>" +
      "</div>" +
    "</article>";
  }).join("");
}


// ============================================================
// READ-ONLY TABS
// ============================================================

function formatDate(iso) {
  const p = iso.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return parseInt(p[2], 10) + " " + months[parseInt(p[1], 10) - 1] + " " + p[0];
}

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
    return '<tr><td><span class="t-name">' + parts[0] + "</span></td>" +
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

renderDate();
initSound();
initTabs();
initCustomers();
initShop();
initRail();
initPicker();
initSelected();
initReview();
initPending();
renderSelected();
renderTotals();
renderCustomersTab();
renderStockTab();
renderPaymentsTab();
