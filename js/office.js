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
// SALES — three numbers and one picture
// ============================================================

const SALES_NOTES = {
  stage: "How far along every order is. Longest bar = most money sitting there.",
  salesman: "Who has brought in the most business.",
  dealer: "Which shops are ordering the most.",
  credit: "A full bar means the dealer has used up their whole credit limit."
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

  el("salesNote").textContent = SALES_NOTES[view.sales] || "";

  if (view.sales === "credit") return drawCredit();
  if (view.sales === "salesman") return drawBySalesman(live);
  if (view.sales === "dealer") return drawByDealer(live);
  return drawByStage();
}

// Labels come from the status list in data.js rather than being written out
// again here, so a stage can never be called one thing on the chart and
// another on the order card.
const PIPELINE = PIPELINE_KEYS.map(function (key) {
  return { key: key, label: getStatus(key).label };
});

function drawByStage() {
  chartBars("salesChart", PIPELINE.map(function (s) {
    const list = atStage(s.key);
    const value = sumValue(list);
    return {
      label: s.label,
      sub: list.length + (list.length === 1 ? " order" : " orders"),
      value: value,
      display: rupees(value),
      tip: s.label + " — " + list.length +
        (list.length === 1 ? " order worth " : " orders worth ") + rupees(value) +
        (list.length ? " · " + list.map(function (o) { return o.no; }).join(", ") : "")
    };
  }), { empty: "No orders yet." });
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

  chartBars("salesChart", Object.keys(by).map(function (n) {
    const r = by[n];
    const staff = STAFF.find(function (s) { return s.name === n; });
    return {
      label: n,
      sub: (staff ? staff.branch + " · " : "") + r.orders +
        (r.orders === 1 ? " order" : " orders"),
      value: r.value,
      display: rupees(r.value),
      tip: n + " — " + rupees(r.value) + " across " + r.orders +
        (r.orders === 1 ? " order" : " orders") +
        (r.waiting > 0 ? ", " + r.waiting + " still waiting on you" : "")
    };
  }).sort(function (a, b) { return b.value - a.value; }),
    { empty: "No orders yet." });
}

function drawByDealer(live) {
  const by = Object.create(null);
  live.forEach(function (o) {
    const r = by[o.customerId] || (by[o.customerId] = { orders: 0, value: 0 });
    r.orders++;
    r.value += orderTotals(o).value;
  });

  chartBars("salesChart", Object.keys(by).map(function (id) {
    const c = getCustomer(id);
    const r = by[id];
    return {
      label: c ? c.name : id,
      sub: (c ? c.place + " · " : "") + r.orders +
        (r.orders === 1 ? " order" : " orders"),
      value: r.value,
      display: rupees(r.value),
      tip: (c ? c.name : id) + " — " + rupees(r.value) + " ordered" +
        (c ? ", " + rupees(c.outstanding) + " still unpaid" : "")
    };
  }).sort(function (a, b) { return b.value - a.value; }),
    { empty: "No orders yet." });
}

function drawCredit() {
  chartMeters("salesChart", CUSTOMERS.slice().sort(function (a, b) {
    return (b.outstanding / b.creditLimit) - (a.outstanding / a.creditLimit);
  }).map(function (c) {
    const pct = (c.outstanding / c.creditLimit) * 100;
    const st = creditState(pct);
    return {
      label: c.name,
      sub: rupees(c.outstanding) + " of " + rupees(c.creditLimit),
      pct: pct,
      display: Math.round(pct) + "%",
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
  material: "A full bar means we hold as much as the factory wants. Short bars need buying.",
  orders: "Everything we have ordered from our suppliers.",
  supplier: "Money committed to each supplier on orders not yet closed."
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

  el("purchaseNote").textContent = PURCHASE_NOTES[view.purchase] || "";

  // the purchase-order list is the one view that is a table, not a chart
  const isTable = view.purchase === "orders";
  el("poTableWrap").hidden = !isTable;

  if (isTable) {
    el("purchaseChart").innerHTML = "";
    return drawPoTable();
  }
  if (view.purchase === "supplier") return drawSuppliers();
  return drawMaterials();
}

function drawMaterials() {
  chartMeters("purchaseChart", MATERIALS.slice().sort(function (a, b) {
    return (a.onHand / a.reorder) - (b.onHand / b.reorder);
  }).map(function (m) {
    const pct = (m.onHand / m.reorder) * 100;
    const st = coverState(pct);
    return {
      label: m.name,
      sub: groupIndian(m.onHand) + " of " + groupIndian(m.reorder) + " " + m.unit,
      pct: pct,
      display: Math.round(pct) + "%",
      state: st.state,
      stateLabel: st.label,
      tip: m.name + " — we hold " + groupIndian(m.onHand) + " " + m.unit +
        " and want " + groupIndian(m.reorder) + "." +
        (pct < 100 ? " Short by " + groupIndian(m.reorder - m.onHand) + " " + m.unit + "." : "")
    };
  }));
}

function drawSuppliers() {
  chartBars("purchaseChart", SUPPLIERS.map(function (s) {
    const theirs = PURCHASES.filter(function (p) {
      return p.supplierId === s.id && OPEN_PO.indexOf(p.status) !== -1;
    });
    const value = theirs.reduce(function (a, p) { return a + p.value; }, 0);
    return {
      label: s.name,
      sub: s.supplies,
      value: value,
      display: value > 0 ? rupees(value) : "—",
      tip: s.name + " of " + s.place + " — " + (theirs.length
        ? rupees(value) + " on " + theirs.length +
          (theirs.length === 1 ? " open order" : " open orders")
        : "nothing open right now") + "."
    };
  }).sort(function (a, b) { return b.value - a.value; }),
    { empty: "No open purchase orders." });
}

function drawPoTable() {
  el("poBody").innerHTML = PURCHASES.map(function (p) {
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
  renderAdmin();
}

if (me) {
  renderWho();
  initCharts();
  initShell();
  initOrders();

  el("resetDemoBtn").addEventListener("click", function () {
    OrderStore.reset();
    toast("All orders put back to the start.");
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
