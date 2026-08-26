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

function el(id) {
  return document.getElementById(id);
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
  search: ""
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

function chappalSVG(articleCode, colourName) {
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
// 2. PRODUCT PICKER — searchable dropdown with images
// ============================================================

function initPicker() {
  el("pickerCats").innerHTML =
    [{ key: "all", label: "All" }].concat(CATEGORIES).map(function (c) {
      return '<button type="button" class="pcat' +
        (c.key === state.category ? " is-active" : "") +
        '" data-cat="' + c.key + '">' + c.label + "</button>";
    }).join("");

  el("pickerCats").addEventListener("click", function (e) {
    const btn = e.target.closest(".pcat");
    if (!btn) return;
    state.category = btn.dataset.cat;
    document.querySelectorAll(".pcat").forEach(function (c) {
      c.classList.toggle("is-active", c.dataset.cat === state.category);
    });
    renderPickerList();
  });

  el("pickerSearch").addEventListener("input", function () {
    state.search = this.value.trim().toLowerCase();
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

  el("pickerList").addEventListener("click", function (e) {
    const row = e.target.closest(".prow");
    if (!row) return;
    addItem(row.dataset.code, null);
  });

  // clicking away closes the panel
  document.addEventListener("click", function (e) {
    if (!e.target.closest("#picker")) closePicker();
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

function matchingArticles() {
  return ARTICLES.filter(function (a) {
    if (state.category !== "all" && a.category !== state.category) return false;
    if (!state.search) return true;
    return (a.code + " " + a.name).toLowerCase().indexOf(state.search) !== -1;
  });
}

function renderPickerList() {
  const list = matchingArticles();
  const box = el("pickerList");

  if (list.length === 0) {
    box.innerHTML = '<p class="picker-none">No article matches “' +
      esc(state.search) + '”.</p>';
    return;
  }

  box.innerHTML = list.map(function (a) {
    const dots = a.colours.map(function (col) {
      const c = COLOUR_HEX[col] || COLOUR_HEX.Black;
      return '<span class="prow-dot" style="background:' + c.body +
        '" title="' + col + '"></span>';
    }).join("");

    return '<button type="button" class="prow" data-code="' + a.code + '">' +
      '<span class="prow-img">' + chappalSVG(a.code, a.colours[0]) + "</span>" +
      '<span class="prow-main">' +
        '<span class="prow-code">' + a.code + "</span>" +
        '<span class="prow-name">' + esc(a.name) + "</span>" +
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

  el("submitBtn").addEventListener("click", submitOrder);
  el("successDone").addEventListener("click", closeSuccess);
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
    boxes: 10
  });

  el("confirmMsg").hidden = true;
  el("pickerSearch").value = "";
  state.search = "";
  closePicker();
  renderPickerList();
  renderSelected();
  renderTotals();
}

function itemPairs(item) {
  return item.boxes * ratioTotal(item);
}

function itemValue(item) {
  return itemPairs(item) * getArticle(item.code).rate;
}

function renderSelected() {
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

    const boxOpts = BOX_OPTIONS.map(function (n) {
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
  el("submitBtn").disabled = state.items.length === 0 || !allValid;

  const hint = el("submitHint");
  hint.hidden = allValid || state.items.length === 0;
  hint.textContent = "One item's custom ratio doesn't add up to 24 pairs.";

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

function submitOrder() {
  const orderNo = "SO-" + nextOrderNumber;
  nextOrderNumber++;

  const boxes = state.items.reduce(function (a, i) { return a + i.boxes; }, 0);
  const pairs = state.items.reduce(function (a, i) { return a + itemPairs(i); }, 0);
  const value = orderValue();

  const msg = el("confirmMsg");
  msg.textContent = "Order sent to office for approval — Order no. " + orderNo;
  msg.hidden = false;

  el("successOrderNo").textContent = orderNo;
  el("successMeta").textContent =
    state.items.length + (state.items.length === 1 ? " item" : " items") + " · " +
    groupIndian(boxes) + " boxes · " + groupIndian(pairs) + " pairs · " + rupees(value);

  const c = state.customer;
  const over = c && (c.creditLimit - c.outstanding - value) < 0;
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

function closeSuccess() {
  if (el("successOverlay").hidden) return;
  el("successOverlay").hidden = true;
  startNewOrder();
}

function startNewOrder() {
  state.items = [];
  state.search = "";
  el("pickerSearch").value = "";
  renderPickerList();
  renderSelected();
  renderTotals();
  window.scrollTo(0, 0);
}

document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    closeSuccess();
    closePicker();
  }
});

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
initPicker();
initSelected();
renderSelected();
renderTotals();
renderCustomersTab();
renderStockTab();
renderPaymentsTab();
