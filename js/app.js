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

  artSel.addEventListener("change", function () {
    renderColours();
    renderCalc();
  });
  el("colourSelect").addEventListener("change", renderCalc);

  renderColours();
}

function currentArticle() {
  return ARTICLES.find(function (a) { return a.code === el("articleSelect").value; });
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
  c.classList.toggle("accent", ok);
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

  el("calcTotalPairs").textContent = groupIndian(boxes * PAIRS_PER_BOX);
  el("calcFormula").innerHTML =
    (boxes || 0) + " boxes × " + PAIRS_PER_BOX + " pairs";

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
  perBox += '<td class="t-strong ' + (total === PAIRS_PER_BOX ? "accent" : "warn") + '">' + total + "</td>";
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
    state.lines.push({
      id: Date.now() + Math.random(),
      article: art.code,
      articleName: art.name,
      colour: el("colourSelect").value,
      boxes: state.boxes,
      ratio: state.ratio.slice(),
      pairs: state.boxes * PAIRS_PER_BOX
    });
    el("confirmMsg").hidden = true;
    renderOrderList();
    updateButtons();
  });

  el("orderBody").addEventListener("click", function (e) {
    const btn = e.target.closest("[data-remove]");
    if (!btn) return;
    const id = btn.dataset.remove;
    state.lines = state.lines.filter(function (l) { return String(l.id) !== id; });
    el("confirmMsg").hidden = true;
    renderOrderList();
    updateButtons();
  });

  el("submitBtn").addEventListener("click", function () {
    const msg = el("confirmMsg");
    msg.textContent =
      "Order sent to office for approval — Order no. SO-" + nextOrderNumber;
    msg.hidden = false;
    nextOrderNumber++;
  });
}

function renderOrderList() {
  const has = state.lines.length > 0;
  el("orderEmpty").hidden = has;
  el("orderTableWrap").hidden = !has;
  el("orderFoot").hidden = !has;

  const body = el("orderBody");
  body.innerHTML = state.lines.map(function (l) {
    return "<tr>" +
      '<td><span class="t-name">' + l.article + "</span>" +
        '<span class="t-sub">' + l.colour + "</span></td>" +
      '<td style="text-align:left" class="ratio-chip">' + l.ratio.join("-") + "</td>" +
      '<td class="t-strong">' + l.boxes + "</td>" +
      '<td class="t-strong">' + groupIndian(l.pairs) + "</td>" +
      '<td><button class="linkbtn" data-remove="' + l.id + '">Remove</button></td>' +
      "</tr>";
  }).join("");

  const boxes = state.lines.reduce(function (a, l) { return a + l.boxes; }, 0);
  const pairs = state.lines.reduce(function (a, l) { return a + l.pairs; }, 0);
  el("totalBoxes").textContent = groupIndian(boxes);
  el("totalPairs").textContent = groupIndian(pairs);
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
initTabs();
initCustomers();
initArticles();
initRatio();
initBoxes();
initOrderList();
renderOrderList();
renderCustomersTab();
renderStockTab();
renderPaymentsTab();
renderAll();
