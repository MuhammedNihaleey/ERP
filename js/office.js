// ============================================================
// SAMPLE FOOTWEAR ERP — office screen
//
// The other half of the loop. A salesman places an order on
// order.html; it lands here for a decision, and whatever the
// office decides goes straight back to the salesman's dashboard.
//
// Every tab is built the same way so there is only one thing to
// learn: a few plain numbers at the top, a "Show me" dropdown,
// and one view underneath it. Nothing is stacked down the page.
// ============================================================

// nobody but the office gets this page
const me = Session.require("office");

// which view each dropdown is on
const view = { sales: "stage", purchase: "material", order: "pending", admin: "users" };

// ============================================================
// SHELL
// ============================================================

function renderWho() {
  el("whoami").textContent = "Office · " + me.name;
  el("todayDate").textContent = new Date().toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short", year: "numeric"
  });
}

function showTab(name) {
  document.querySelectorAll(".tab").forEach(function (t) {
    t.classList.toggle("is-active", t.dataset.tab === name);
  });
  document.querySelectorAll(".panel").forEach(function (p) {
    p.hidden = p.id !== "panel-" + name;
  });
  window.scrollTo(0, 0);
}

function initShell() {
  el("tabs").addEventListener("click", function (e) {
    const btn = e.target.closest(".tab");
    if (btn) showTab(btn.dataset.tab);
  });

  el("signOutBtn").addEventListener("click", function () {
    Session.signOut();
    window.location.href = "index.html";
  });

  // every dropdown works the same way: pick a view, redraw that view
  [["salesView", "sales", renderSales],
   ["purchaseView", "purchase", renderPurchase],
   ["orderView", "order", renderOrders],
   ["adminView", "admin", renderAdmin]].forEach(function (p) {
    el(p[0]).addEventListener("change", function () {
      view[p[1]] = el(p[0]).value;
      p[2]();
    });
  });
}

let toastTimer = null;

function toast(msg) {
  const box = el("toast");
  box.textContent = msg;
  box.hidden = false;
  flash(box, "is-in");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { box.hidden = true; }, 4200);
}

// ============================================================
// SHARED SUMS
// ============================================================

function atStage(key) {
  return ORDERS.filter(function (o) { return o.status === key; });
}

function sumValue(list) {
  return list.reduce(function (a, o) { return a + orderTotals(o).value; }, 0);
}

// everything except the orders that were turned down
function liveOrders() {
  return ORDERS.filter(function (o) { return o.status !== "rejected"; });
}

// Does this order put the dealer past their credit limit? The office needs
// that in front of it before approving, not buried a screen away.
function creditCheck(order) {
  const c = getCustomer(order.customerId);
  if (!c) return null;
  const value = orderTotals(order).value;
  const headroom = c.creditLimit - c.outstanding - value;
  return {
    customer: c, value: value, headroom: headroom,
    over: headroom < 0, overdue: c.overdueDays
  };
}

// ============================================================
// SHOWING ONE VIEW
// A tab has a meter and a table; exactly one of them is on screen
// at a time, whichever the dropdown asks for.
// ============================================================

function showMeter(tab) {
  el(tab + "ChartWrap").hidden = false;
  el(tab + "TableWrap").hidden = true;
}

function showTable(tab, columns, rowsHtml) {
  el(tab + "ChartWrap").hidden = true;
  el(tab + "TableWrap").hidden = false;
  el(tab + "Head").innerHTML = columns.map(function (c) {
    return "<th>" + c + "</th>";
  }).join("");
  el(tab + "Body").innerHTML = rowsHtml;
}

// ============================================================
// SALES — three numbers, then one view
// ============================================================

const SALES_NOTES = {
  credit: "A full bar means the dealer has used up their whole credit limit.",
  dealer: "",
  salesman: ""
};

function renderSales() {
  const live = liveOrders();
  const waiting = atStage("pending");
  const owed = CUSTOMERS.reduce(function (a, c) { return a + c.outstanding; }, 0);
  const late = PAYMENTS.filter(function (p) { return p.overdueDays > 30; });

  el("kpiBookValue").textContent = rupees(sumValue(live));
  el("kpiBookNote").textContent = live.length +
    (live.length === 1 ? " order" : " orders") + " on the books";

  el("kpiPending").textContent = waiting.length;
  el("kpiPendingNote").textContent = waiting.length === 0
    ? "Nothing to decide"
    : rupees(sumValue(waiting)) + " to approve";

  el("kpiOutstanding").textContent = rupees(owed);
  el("kpiOutstandingNote").textContent = late.length +
    (late.length === 1 ? " bill" : " bills") + " over 30 days late";
  el("kpiOutstandingNote").classList.toggle("warn", late.length > 0);

  // the caption only earns its place next to a meter
  const salesNote = SALES_NOTES[view.sales] || "";
  el("salesNote").textContent = salesNote;
  el("salesNote").hidden = salesNote === "";

  if (view.sales === "salesman") return drawBySalesman(live);
  if (view.sales === "dealer") return drawByDealer(live);
  return drawCredit();
}

function drawBySalesman(live) {
  const by = Object.create(null);
  live.forEach(function (o) {
    const k = o.by || "Not recorded";
    const r = by[k] || (by[k] = { orders: 0, waiting: 0, value: 0 });
    r.orders++;
    if (o.status === "pending") r.waiting++;
    r.value += orderTotals(o).value;
  });

  const rows = Object.keys(by).sort(function (a, b) {
    return by[b].value - by[a].value;
  }).map(function (n) {
    const r = by[n];
    const staff = STAFF.find(function (s) { return s.name === n; });
    return "<tr>" +
      '<td><span class="t-name">' + esc(n) + "</span>" +
        '<span class="t-sub">' + esc(staff ? staff.branch : "\u2014") + "</span></td>" +
      '<td class="t-strong">' + r.orders + "</td>" +
      '<td class="t-strong' + (r.waiting > 0 ? " warn" : "") + '">' + r.waiting + "</td>" +
      '<td class="t-strong">' + rupees(r.value) + "</td>" +
      "</tr>";
  }).join("");

  showTable("sales", ["Salesman", "Orders", "Waiting on you", "Value"],
    rows || '<tr><td colspan="4" class="muted">No orders yet.</td></tr>');
}

function drawByDealer(live) {
  const by = Object.create(null);
  live.forEach(function (o) {
    const r = by[o.customerId] || (by[o.customerId] = { orders: 0, value: 0 });
    r.orders++;
    r.value += orderTotals(o).value;
  });

  const rows = Object.keys(by).sort(function (a, b) {
    return by[b].value - by[a].value;
  }).map(function (id) {
    const c = getCustomer(id);
    const r = by[id];
    return "<tr>" +
      '<td><span class="t-name">' + esc(c ? c.name : id) + "</span>" +
        '<span class="t-sub">' + esc(c ? c.place : "") + "</span></td>" +
      '<td class="t-strong">' + r.orders + "</td>" +
      '<td class="t-strong">' + rupees(r.value) + "</td>" +
      '<td class="t-strong">' + (c ? rupees(c.outstanding) : "\u2014") + "</td>" +
      "</tr>";
  }).join("");

  showTable("sales", ["Dealer", "Orders", "Ordered", "Owes us"],
    rows || '<tr><td colspan="4" class="muted">No orders yet.</td></tr>');
}

function drawCredit() {
  showMeter("sales");
  chartMeters("salesChart", CUSTOMERS.slice().sort(function (a, b) {
    return (b.outstanding / b.creditLimit) - (a.outstanding / a.creditLimit);
  }).map(function (c) {
    const pct = (c.outstanding / c.creditLimit) * 100;
    const st = creditState(pct);
    return {
      label: c.name,
      sub: rupees(c.outstanding) + " of " + rupees(c.creditLimit),
      pct: pct,
      // never a number the bar contradicts: a full bar says "all of it"
      display: pct >= 100 ? "All of it" : Math.round(pct) + "% used",
      state: st.state,
      stateLabel: st.label,
      tip: c.name + " owes " + rupees(c.outstanding) + " against a " +
        rupees(c.creditLimit) + " limit. " +
        rupees(c.creditLimit - c.outstanding) + " left to spend" +
        (c.overdueDays > 0 ? ", " + c.overdueDays + " days late" : "") + "."
    };
  }));
}

// ============================================================
// PURCHASE — three numbers and one picture
// ============================================================

const OPEN_PO = ["raised", "sent", "partial"];

const PURCHASE_NOTES = {
  material: "A full bar means we already hold as much as the factory wants. Short bars need buying.",
  orders: "",
  supplier: ""
};

function renderPurchase() {
  const open = PURCHASES.filter(function (p) { return OPEN_PO.indexOf(p.status) !== -1; });
  const committed = open.reduce(function (a, p) { return a + p.value; }, 0);
  const short = MATERIALS.filter(function (m) { return m.onHand < m.reorder; });

  el("kpiOpenPo").textContent = open.length;
  el("kpiOpenPoNote").textContent = PURCHASES.length + " raised in all";
  el("kpiPoValue").textContent = rupees(committed);
  el("kpiReorder").textContent = short.length;
  el("kpiReorderNote").textContent = short.length === 0
    ? "Everything is stocked"
    : short.map(function (m) { return m.name; }).join(", ");
  el("kpiReorderNote").classList.toggle("warn", short.length > 0);

  // the caption only earns its place next to a meter
  const purchaseNote = PURCHASE_NOTES[view.purchase] || "";
  el("purchaseNote").textContent = purchaseNote;
  el("purchaseNote").hidden = purchaseNote === "";

  if (view.purchase === "orders") return drawPoTable();
  if (view.purchase === "supplier") return drawSuppliers();
  return drawMaterials();
}

function drawMaterials() {
  showMeter("purchase");

  chartMeters("purchaseChart", MATERIALS.slice().sort(function (a, b) {
    return (a.onHand / a.reorder) - (b.onHand / b.reorder);
  }).map(function (m) {
    const pct = (m.onHand / m.reorder) * 100;
    const st = coverState(pct);
    const short = m.reorder - m.onHand;

    return {
      label: m.name,
      sub: "have " + groupIndian(m.onHand) + " \u00B7 want " +
        groupIndian(m.reorder) + " " + m.unit,
      pct: pct,
      // A bar that is already full must not be labelled 148% \u2014 that reads
      // as a contradiction. Once the bar is full the only useful thing left
      // to say is "enough"; below it, say exactly how much is missing.
      display: pct >= 100 ? "Enough" : "Short " + groupIndian(short),
      state: st.state,
      stateLabel: st.label,
      tip: m.name + " \u2014 we hold " + groupIndian(m.onHand) + " " + m.unit +
        " and want to keep " + groupIndian(m.reorder) + "." +
        (short > 0
          ? " Need to buy " + groupIndian(short) + " " + m.unit + "."
          : " Nothing to buy.")
    };
  }));
}

function drawSuppliers() {
  const rows = SUPPLIERS.map(function (s) {
    const theirs = PURCHASES.filter(function (p) {
      return p.supplierId === s.id && OPEN_PO.indexOf(p.status) !== -1;
    });
    return {
      s: s,
      open: theirs.length,
      value: theirs.reduce(function (a, p) { return a + p.value; }, 0)
    };
  }).sort(function (a, b) { return b.value - a.value; }).map(function (r) {
    return "<tr>" +
      '<td><span class="t-name">' + esc(r.s.name) + "</span>" +
        '<span class="t-sub">' + esc(r.s.place) + "</span></td>" +
      '<td class="muted">' + esc(r.s.supplies) + "</td>" +
      '<td class="t-strong">' + r.open + "</td>" +
      '<td class="t-strong">' + (r.value > 0 ? rupees(r.value) : "\u2014") + "</td>" +
      "</tr>";
  }).join("");

  showTable("purchase", ["Supplier", "Supplies", "Open orders", "Money committed"], rows);
}

function drawPoTable() {
  const rows = PURCHASES.map(function (p) {
    const s = getSupplier(p.supplierId);
    const st = getPurchaseStatus(p.status);
    return "<tr>" +
      '<td><span class="t-name">' + p.no + "</span>" +
        '<span class="t-sub">' + esc(p.item) + "</span></td>" +
      '<td><span class="t-name">' + esc(s ? s.name : "—") + "</span>" +
        '<span class="t-sub">' + esc(p.qty) + "</span></td>" +
      '<td class="t-strong">' + rupees(p.value) + "</td>" +
      '<td><span class="ord-status" data-tone="' + st.tone + '">' + st.label + "</span></td>" +
      "</tr>";
  }).join("");

  showTable("purchase", ["Order", "Supplier", "Value", "Status"], rows);
}

// ============================================================
// ORDER — the approval desk
// One list. The dropdown starts on what needs deciding.
// ============================================================

const ORDER_VIEWS = [
  { key: "pending", label: getStatus("pending").label, has: ["pending"] },
  { key: "approved", label: getStatus("approved").label, has: ["approved"] },
  { key: "making", label: "Being made", has: ["production", "ready"] },
  { key: "dispatched", label: getStatus("dispatched").label, has: ["dispatched"] },
  { key: "delivered", label: getStatus("delivered").label, has: ["delivered"] },
  { key: "rejected", label: getStatus("rejected").label, has: ["rejected"] },
  { key: "all", label: "All orders" }
];

function ordersIn(key) {
  const v = ORDER_VIEWS.find(function (x) { return x.key === key; });
  if (!v || !v.has) return ORDERS;
  return ORDERS.filter(function (o) { return v.has.indexOf(o.status) !== -1; });
}

// the option list carries its own counts, so the dropdown itself says
// where the work is without opening anything
function renderOrderPicker() {
  const sel = el("orderView");
  sel.innerHTML = ORDER_VIEWS.map(function (v) {
    return '<option value="' + v.key + '">' + esc(v.label) +
      " (" + ordersIn(v.key).length + ")</option>";
  }).join("");
  sel.value = view.order;
}

function renderOrders() {
  renderOrderPicker();

  const list = ordersIn(view.order);
  const waiting = atStage("pending");

  el("orderCount").textContent = list.length +
    (list.length === 1 ? " order" : " orders");

  // one line, only when there is actually a credit call to make
  const risky = waiting.filter(function (o) {
    const ck = creditCheck(o);
    return ck && (ck.over || ck.overdue > 30);
  });
  const lead = el("queueLead");
  lead.hidden = risky.length === 0 || view.order !== "pending";
  if (!lead.hidden) {
    lead.textContent = risky.length === 1
      ? "1 order below is from a dealer who already owes too much — check before approving."
      : risky.length + " orders below are from dealers who already owe too much — check before approving.";
  }

  el("ordNone").hidden = list.length > 0;
  el("ordList").innerHTML = list.map(orderCard).join("");

  const badge = el("ordersBadge");
  badge.textContent = waiting.length;
  badge.hidden = waiting.length === 0;
}

const TICK = '<svg class="btn-icon" viewBox="0 0 14 14" aria-hidden="true">' +
  '<path d="M2.5 7.4 5.6 10.5 11.5 3.9" fill="none" stroke="currentColor" ' +
  'stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const CROSS = '<svg class="btn-icon" viewBox="0 0 14 14" aria-hidden="true">' +
  '<path d="M3.5 3.5l7 7M10.5 3.5l-7 7" fill="none" stroke="currentColor" ' +
  'stroke-width="2" stroke-linecap="round"/></svg>';

function orderCard(order) {
  const c = getCustomer(order.customerId);
  const st = getStatus(order.status);
  const t = orderTotals(order);
  const acts = officeActions(order.status);

  const buttons = acts.map(function (a) {
    const cls = a.kind === "ok" ? "btn btn-ok"
      : a.kind === "danger" ? "btn btn-danger"
      : a.kind === "ghost" ? "btn-ghost" : "btn";
    const icon = a.key === "approve" ? TICK : a.key === "reject" ? CROSS : "";
    return '<button type="button" class="' + cls + '" data-act="' + a.key +
      '" data-no="' + order.no + '">' + icon + esc(a.label) + "</button>";
  }).join("");

  return '<article class="ord" data-no="' + order.no + '">' +
    '<button type="button" class="ord-head" aria-expanded="false">' +
      '<span class="ord-id">' +
        '<span class="ord-no">' + order.no + "</span>" +
        '<span class="ord-date">' + formatDate(order.date) + "</span>" +
      "</span>" +
      '<span class="ord-who">' +
        '<span class="ord-name">' + esc(c ? c.name : "Unknown dealer") + "</span>" +
        '<span class="ord-place">' + esc(c ? c.place : "") +
          (order.by ? " · sold by " + esc(order.by) : "") + "</span>" +
      "</span>" +
      '<span class="ord-figs">' +
        '<span class="ord-value num">' + rupees(t.value) + "</span>" +
        '<span class="ord-meta num">' + order.lines.length +
          (order.lines.length === 1 ? " item · " : " items · ") +
          groupIndian(t.boxes) + " boxes</span>" +
      "</span>" +
      '<span class="ord-status" data-tone="' + st.tone + '">' + st.label + "</span>" +
      '<span class="ord-chev" aria-hidden="true">' +
        '<svg viewBox="0 0 16 16"><path d="M4 6l4 4 4-4" fill="none" ' +
          'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" ' +
          'stroke-linejoin="round"/></svg>' +
      "</span>" +
    "</button>" +

    // the buttons sit on the card, so nothing has to be opened to act on it
    (buttons ? '<div class="ord-do">' + buttons + "</div>" : "") +

    // revealed by Reject — a reason always goes back to the salesman.
    // Nothing in here carries an id: the same order can be on screen twice.
    '<div class="ord-reason" hidden>' +
      '<span class="label">Why are you rejecting it? The salesman will see this.</span>' +
      '<div class="ord-reason-row">' +
        '<input type="text" class="ord-reason-input" autocomplete="off" ' +
          'aria-label="Reason for rejecting ' + order.no + '" ' +
          'placeholder="They already owe too much">' +
        '<button type="button" class="btn btn-danger" data-confirm-reject="' +
          order.no + '">Reject it</button>' +
        '<button type="button" class="btn-ghost" data-cancel-reject="' +
          order.no + '">Cancel</button>' +
      "</div>" +
    "</div>" +

    '<div class="ord-body" hidden>' +
      creditLine(order) +
      '<div class="ord-lines">' + orderLinesMarkup(order) + "</div>" +
      lastChangeLine(order) +
    "</div>" +
  "</article>";
}

// The credit position as one sentence, read left to right, instead of a
// grid of figures the reader has to assemble themselves.
function creditLine(order) {
  const ck = creditCheck(order);
  if (!ck) return "";

  const verdict = ck.over
    ? '<strong class="warn">' + rupees(Math.abs(ck.headroom)) + " over their limit</strong>"
    : '<strong class="ok">' + rupees(ck.headroom) + " still left</strong>";

  return '<p class="ord-credit' + (ck.over ? " is-over" : "") + '">' +
    "<strong>Credit check:</strong> limit " + rupees(ck.customer.creditLimit) +
    " · already owes " + rupees(ck.customer.outstanding) +
    " · this order " + rupees(ck.value) + " → " + verdict +
    (ck.overdue > 30
      ? ' <span class="warn">(and ' + ck.overdue + " days late paying)</span>"
      : "") +
  "</p>";
}

function lastChangeLine(order) {
  const h = order.history || [];
  if (h.length === 0) return "";
  const last = h[h.length - 1];
  const when = new Date(last.at);
  const stamp = isNaN(when) ? "" : when.toLocaleDateString("en-IN", {
    day: "numeric", month: "short"
  });
  return '<p class="ord-last">Last change: ' + esc(getStatus(last.status).label) +
    " by " + esc(last.by) + (stamp ? " on " + stamp : "") + "</p>";
}

function initOrders() {
  el("ordList").addEventListener("click", onOrderClick);
}

function onOrderClick(e) {
  const card = e.target.closest(".ord");

  const act = e.target.closest("[data-act]");
  if (act) return handleAction(act.dataset.no, act.dataset.act, card);

  const yes = e.target.closest("[data-confirm-reject]");
  if (yes) return doReject(yes.dataset.confirmReject, card);

  const no = e.target.closest("[data-cancel-reject]");
  if (no) return closeReason(card);

  const head = e.target.closest(".ord-head");
  if (head && card) {
    const open = card.classList.toggle("is-open");
    card.querySelector(".ord-body").hidden = !open;
    head.setAttribute("aria-expanded", open ? "true" : "false");
  }
}

function reasonBox(card) {
  return card ? card.querySelector(".ord-reason") : null;
}

function openReason(card) {
  const box = reasonBox(card);
  if (!box) return;
  box.hidden = false;
  const input = box.querySelector(".ord-reason-input");
  if (input) input.focus();
}

function closeReason(card) {
  const box = reasonBox(card);
  if (box) box.hidden = true;
}

function handleAction(no, key, card) {
  const order = OrderStore.get(no);
  if (!order) {
    toast("That order is no longer here.");
    return renderAll();
  }

  // rejecting asks for a reason first — the salesman is owed one
  if (key === "reject") return openReason(card);

  const action = officeActions(order.status).find(function (a) { return a.key === key; });
  if (!action) return;

  OrderStore.decide(no, action.to, noteFor(action, order), me.name);
  toast(no + " — " + getStatus(action.to).label.toLowerCase() + ".");
  renderAll();
}

function doReject(no, card) {
  const box = reasonBox(card);
  const input = box && box.querySelector(".ord-reason-input");
  const reason = input ? input.value.trim() : "";

  OrderStore.decide(no, "rejected",
    "Rejected by office — " + (reason || "no reason given"), me.name);

  toast(no + " rejected. The salesman has been told why.");
  renderAll();
}

function noteFor(action, order) {
  const who = " · " + me.name;
  if (action.to === "approved") {
    const ck = creditCheck(order);
    return (ck && ck.over ? "Approved even though over limit" : "Approved by office") + who;
  }
  if (action.to === "production") return "Sent to the factory" + who;
  if (action.to === "ready") return "Made and ready to send" + who;
  if (action.to === "dispatched") return "Sent out from the godown" + who;
  if (action.to === "delivered") return "Delivered to the dealer" + who;
  if (action.to === "pending") return "Put back for a fresh decision" + who;
  return "";
}

// ============================================================
// PRODUCTS
//
// The office puts an article on the books and the salesman can
// sell it immediately. Photographs are optional: without one the
// product is drawn from its strap and colour like the rest of the
// range, so a half-finished catalogue never looks broken.
// ============================================================

// A photograph off a phone is several megabytes; localStorage holds a
// few, and the order book shares it. So nothing is stored as picked —
// it is redrawn smaller first. 420px is more than the largest slot on
// either screen (a shop card is 112px tall) at twice the pixel density.
const PHOTO_MAX_PX = 420;
const PHOTO_QUALITY = 0.72;

// what the form is holding, until Save
let photoData = null;

function shrinkPhoto(file, done, fail) {
  if (!/^image\//.test(file.type)) {
    return fail("That file is not an image. Pick a JPG or PNG.");
  }

  const reader = new FileReader();

  reader.onerror = function () { fail("That photo could not be read."); };

  reader.onload = function () {
    const img = new Image();

    img.onerror = function () {
      fail("That photo could not be opened. Try a different one.");
    };

    img.onload = function () {
      const scale = Math.min(1, PHOTO_MAX_PX / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext("2d");
      // photos of footwear are shot on white; a transparent PNG would
      // otherwise turn black once it is flattened into a JPEG
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);

      try {
        done(canvas.toDataURL("image/jpeg", PHOTO_QUALITY));
      } catch (e) {
        fail("That photo could not be processed. Try a different one.");
      }
    };

    img.src = reader.result;
  };

  reader.readAsDataURL(file);
}

function showPhoto(dataUrl) {
  photoData = dataUrl;
  const box = el("pPreview");

  if (dataUrl) {
    box.innerHTML = '<img src="' + esc(dataUrl) + '" alt="Photo of the new product">';
  } else {
    box.innerHTML = '<span class="photobox-empty">No photo yet</span>';
    el("pPhoto").value = "";
  }

  el("pPhotoClear").hidden = !dataUrl;
}

function prodError(msg) {
  const box = el("prodError");
  box.textContent = msg;
  box.hidden = !msg;
  if (msg) flash(box, "is-shake");
}

function initProductForm() {
  el("pCategory").innerHTML = CATEGORIES.map(function (c) {
    return '<option value="' + c.key + '">' + esc(c.label) + "</option>";
  }).join("");

  el("pBrand").innerHTML = BRANDS.map(function (b) {
    return '<option value="' + b.key + '">' + esc(b.name) + " \u2014 " +
      esc(b.tagline) + "</option>";
  }).join("");

  el("pStyle").innerHTML = STYLES.map(function (s) {
    return '<option value="' + s.key + '">' + esc(s.label) + "</option>";
  }).join("");

  el("pColours").innerHTML = COLOUR_CHOICES.map(function (col, i) {
    const c = COLOUR_HEX[col];
    return '<label class="checkbox"><input type="checkbox" value="' + col + '"' +
      (i === 0 ? " checked" : "") + '>' +
      '<span class="checkbox-dot" style="background:' + c.body + '"></span>' +
      esc(col) + "</label>";
  }).join("");

  // the code is handed out, not typed, so it follows the category
  el("pCategory").addEventListener("change", showNextCode);

  el("addProductBtn").addEventListener("click", openProductForm);
  el("pCancel").addEventListener("click", closeProductForm);

  el("pPhoto").addEventListener("change", function () {
    const file = el("pPhoto").files && el("pPhoto").files[0];
    if (!file) return;
    prodError("");
    shrinkPhoto(file, showPhoto, function (msg) {
      showPhoto(null);
      prodError(msg);
    });
  });

  el("pPhotoClear").addEventListener("click", function () { showPhoto(null); });

  el("prodForm").addEventListener("submit", function (e) {
    e.preventDefault();
    saveProduct();
  });

  el("prodList").addEventListener("click", function (e) {
    const btn = e.target.closest("[data-remove]");
    if (btn) removeProduct(btn.dataset.remove);
  });
}

function showNextCode() {
  el("pCodeNote").textContent = "It will be given the code " +
    nextArticleCode(el("pCategory").value) + ".";
}

function openProductForm() {
  el("prodForm").hidden = false;
  el("addProductBtn").hidden = true;
  showNextCode();
  el("pName").focus();
}

function closeProductForm() {
  el("prodForm").hidden = true;
  el("addProductBtn").hidden = false;
  el("prodForm").reset();
  showPhoto(null);
  prodError("");
}

function chosenColours() {
  return Array.prototype.slice
    .call(el("pColours").querySelectorAll("input:checked"))
    .map(function (i) { return i.value; });
}

function saveProduct() {
  const name = el("pName").value.trim();
  const rate = parseInt(el("pRate").value, 10);
  const stock = parseInt(el("pStock").value, 10);
  const colours = chosenColours();

  if (!name) return prodError("Give the product a name.");
  if (!rate || rate < 1) return prodError("Put in what a dealer pays per pair.");
  if (colours.length === 0) return prodError("Pick at least one colour.");

  const category = el("pCategory").value;
  const pairs = isNaN(stock) || stock < 0 ? 0 : stock;

  const stockByColour = Object.create(null);
  colours.forEach(function (col) { stockByColour[col] = spreadStock(pairs); });

  const result = ProductStore.add({
    code: nextArticleCode(category),
    name: name,
    category: category,
    brand: el("pBrand").value,
    style: el("pStyle").value,
    rate: rate,
    colours: colours,
    stock: stockByColour,
    image: photoData || null,
    isNew: true,                 // it lands in the shop's New launches strip
    addedBy: me.name,
    addedOn: isoToday()
  });

  if (result.error) return prodError(result.error);

  closeProductForm();
  toast(result.product.code + " added. It is in the salesman's shop now.");
  renderProducts();
}

function removeProduct(code) {
  const a = getArticle(code);
  const result = ProductStore.remove(code);
  if (result.error) {
    prodError(result.error);
  } else {
    toast((a ? a.name : code) + " taken off the list.");
  }
  renderProducts();
}

function renderProducts() {
  const mine = ProductStore.added();

  el("productCount").textContent = ARTICLES.length + " products" +
    (mine.length ? " \u00B7 " + mine.length + " added by the office" : "");

  el("prodList").innerHTML = ARTICLES.map(function (a) {
    const brand = getBrand(a.brand);
    const pairs = articleStock(a.code);
    const dots = a.colours.map(function (col) {
      const c = COLOUR_HEX[col] || COLOUR_HEX.Black;
      return '<span class="prod-dot" style="background:' + c.body +
        '" title="' + esc(col) + '"></span>';
    }).join("");

    return '<article class="prod">' +
      '<span class="prod-img">' + productImage(a.code, a.colours[0]) + "</span>" +
      '<span class="prod-main">' +
        '<span class="prod-code">' + esc(a.code) +
          (a.addedBy ? '<span class="chip chip-soft">Added by office</span>' : "") +
        "</span>" +
        '<span class="prod-name">' + esc(a.name) + "</span>" +
        '<span class="prod-sub">' + esc(brand ? brand.name : "") + " \u00B7 " +
          esc(roleFreeCategory(a.category)) + "</span>" +
      "</span>" +
      '<span class="prod-dots">' + dots + "</span>" +
      '<span class="prod-figs">' +
        '<span class="prod-rate num">' + rupees(a.rate) + "</span>" +
        '<span class="prod-stock num">' + groupIndian(pairs) + " pairs</span>" +
      "</span>" +
      '<span class="prod-act">' +
        (a.addedBy
          ? '<button type="button" class="btn-ghost" data-remove="' + a.code +
            '">Remove</button>'
          : '<span class="hint">Part of the range</span>') +
      "</span>" +
    "</article>";
  }).join("");
}

function roleFreeCategory(key) {
  const c = CATEGORIES.find(function (x) { return x.key === key; });
  return c ? c.label : key;
}

// ============================================================
// ADMINISTRATION — one table, picked from the dropdown
// ============================================================

function renderAdmin() {
  if (view.admin === "dealers") drawDealerAdmin();
  else if (view.admin === "brands") drawBrandAdmin();
  else drawStaffAdmin();

  const touched = ORDERS.filter(function (o) { return (o.history || []).length > 1; }).length;
  el("demoDataNote").textContent = ORDERS.length + " orders in the system" +
    (touched > 0 ? ", " + touched + " changed during this run-through" : "") + ".";
}

function head(cols) {
  el("adminHead").innerHTML = cols.map(function (c) { return "<th>" + c + "</th>"; }).join("");
}

function drawStaffAdmin() {
  head(["Name", "User ID", "Job", "Where", "Can log in?"]);
  el("adminBody").innerHTML = STAFF.map(function (s) {
    return "<tr>" +
      '<td><span class="t-name">' + esc(s.name) +
        (s.userId === me.userId ? '<span class="chip chip-soft">You</span>' : "") +
        "</span></td>" +
      '<td class="muted">' + esc(s.userId) + "</td>" +
      '<td class="muted">' + esc(roleLabel(s.role)) + "</td>" +
      '<td class="muted">' + esc(s.branch) + "</td>" +
      "<td>" + (s.login
        ? '<span class="chip chip-go">Yes</span>'
        : '<span class="chip">Not in this demo</span>') + "</td>" +
      "</tr>";
  }).join("");
}

function drawDealerAdmin() {
  head(["Dealer", "Credit limit", "Owes us", "Left to spend", "Paying late?"]);
  el("adminBody").innerHTML = CUSTOMERS.map(function (c) {
    const left = c.creditLimit - c.outstanding;
    const tight = left < c.creditLimit * 0.25;
    return "<tr>" +
      '<td><span class="t-name">' + esc(c.name) + "</span>" +
        '<span class="t-sub">' + esc(c.place) + "</span></td>" +
      '<td class="t-strong">' + rupees(c.creditLimit) + "</td>" +
      '<td class="t-strong">' + rupees(c.outstanding) + "</td>" +
      '<td class="t-strong' + (tight ? " warn" : "") + '">' + rupees(left) + "</td>" +
      "<td>" + (c.overdueDays > 30
        ? '<span class="chip chip-stop">' + c.overdueDays + " days</span>"
        : c.overdueDays > 0
          ? '<span class="chip">' + c.overdueDays + " days</span>"
          : '<span class="chip chip-go">No</span>') + "</td>" +
      "</tr>";
  }).join("");
}

function drawBrandAdmin() {
  head(["Brand", "Known for", "Products", "Pairs in godown"]);
  el("adminBody").innerHTML = BRANDS.map(function (b) {
    const arts = ARTICLES.filter(function (a) { return a.brand === b.key; });
    const pairs = arts.reduce(function (a, art) { return a + articleStock(art.code); }, 0);
    return "<tr>" +
      '<td><span class="t-name">' + esc(b.name) + "</span></td>" +
      '<td class="muted">' + esc(b.tagline) + "</td>" +
      '<td class="t-strong">' + arts.length + "</td>" +
      '<td class="t-strong">' + groupIndian(pairs) + "</td>" +
      "</tr>";
  }).join("");
}

// ============================================================
// BOOT
// ============================================================

function renderAll() {
  renderSales();
  renderPurchase();
  renderOrders();
  renderProducts();
  renderAdmin();
}

if (me) {
  renderWho();
  initCharts();
  initShell();
  initOrders();
  initProductForm();

  el("resetDemoBtn").addEventListener("click", function () {
    OrderStore.reset();
    toast("All orders put back to the start.");
    renderAll();
  });

  el("resetProductsBtn").addEventListener("click", function () {
    ProductStore.reset();
    toast("Products put back to the original range.");
    renderAll();
  });

  renderAll();

  // A salesman placing an order in another tab writes to the shared book;
  // this redraws the desk the moment that happens.
  let lastCount = ORDERS.length;
  OrderStore.onChange(function () {
    if (ORDERS.length > lastCount) {
      const fresh = ORDERS[0];
      toast("New order " + fresh.no + " from " + (fresh.by || "a salesman") + ".");
    }
    lastCount = ORDERS.length;
    renderAll();
  });
}
