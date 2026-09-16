// ============================================================
// SAMPLE FOOTWEAR ERP — office screen
//
// The other half of the loop. A salesman places an order on
// order.html; it lands here in "Waiting on the office", where it is
// approved, rejected, or pushed along the factory pipeline. Every
// decision is written to the shared order book, so the salesman's
// dashboard reflects it — live if their tab is open.
// ============================================================

// nobody but the office gets this page
const me = Session.require("office");

// ============================================================
// TOP BAR + TABS
// ============================================================

function renderWho() {
  el("whoami").textContent = "Office · " + me.name;
  el("todayDate").textContent = new Date().toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric"
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

function initTabs() {
  el("tabs").addEventListener("click", function (e) {
    const btn = e.target.closest(".tab");
    if (!btn) return;
    showTab(btn.dataset.tab);
  });

  el("signOutBtn").addEventListener("click", function () {
    Session.signOut();
    window.location.href = "index.html";
  });
}

// ============================================================
// TOAST — a change that arrived from the salesman's tab
// ============================================================

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
// ORDER — the approval desk
// ============================================================

const OFFICE_FILTERS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Awaiting approval", has: ["pending"] },
  { key: "making", label: "In the factory", has: ["approved", "production", "ready"] },
  { key: "dispatched", label: "Dispatched", has: ["dispatched"] },
  { key: "delivered", label: "Delivered", has: ["delivered"] },
  { key: "rejected", label: "Rejected", has: ["rejected"] }
];

let ordFilter = "all";

function pendingOrders() {
  return ORDERS.filter(function (o) { return o.status === "pending"; });
}

function filteredOrders() {
  const f = OFFICE_FILTERS.find(function (x) { return x.key === ordFilter; });
  if (!f || !f.has) return ORDERS;
  return ORDERS.filter(function (o) { return f.has.indexOf(o.status) !== -1; });
}

// Does this order put the dealer past their credit limit? The office needs
// that in front of it before approving, not buried a screen away.
function creditCheck(order) {
  const c = getCustomer(order.customerId);
  if (!c) return null;

  const value = orderTotals(order).value;
  const headroom = c.creditLimit - c.outstanding - value;
  return {
    customer: c,
    value: value,
    headroom: headroom,
    over: headroom < 0,
    overdue: c.overdueDays
  };
}

function actionsMarkup(order) {
  const acts = officeActions(order.status);
  if (acts.length === 0) {
    return '<p class="ord-actions-none">This order is closed — nothing left to do.</p>';
  }

  const buttons = acts.map(function (a) {
    const cls = a.kind === "primary" ? "btn"
      : a.kind === "danger" ? "btn btn-danger"
      : "btn-ghost";
    return '<button type="button" class="' + cls + '" data-act="' + a.key +
      '" data-no="' + order.no + '">' + esc(a.label) + "</button>";
  }).join("");

  // The reason field is revealed by Reject, so a rejection always carries
  // something back to the salesman. A pending order is drawn twice — once in
  // the queue, once under All orders — so nothing in here may carry an id;
  // it is found relative to the card that was clicked instead.
  return '<div class="ord-actions">' + buttons + "</div>" +
    '<div class="ord-reason" hidden>' +
      '<span class="label">Reason — the salesman sees this</span>' +
      '<div class="ord-reason-row">' +
        '<input type="text" class="ord-reason-input" autocomplete="off" ' +
          'aria-label="Reason for rejecting ' + order.no + '" ' +
          'placeholder="Dealer is over credit limit">' +
        '<button type="button" class="btn btn-danger" data-confirm-reject="' + order.no +
          '">Confirm reject</button>' +
        '<button type="button" class="btn-ghost" data-cancel-reject="' + order.no +
          '">Cancel</button>' +
      "</div>" +
    "</div>";
}

function historyMarkup(order) {
  const h = order.history || [];
  if (h.length === 0) return "";

  const rows = h.slice().reverse().map(function (entry) {
    const st = getStatus(entry.status);
    const when = new Date(entry.at);
    const stamp = isNaN(when) ? "" :
      when.toLocaleString("en-IN", {
        day: "numeric", month: "short", hour: "numeric", minute: "2-digit"
      });
    return '<li><span class="trail-what">' + esc(st.label) + "</span>" +
      '<span class="trail-who">' + esc(entry.by) + "</span>" +
      '<span class="trail-when">' + esc(stamp) + "</span></li>";
  }).join("");

  return '<div class="trail"><span class="label">Trail</span><ul>' + rows + "</ul></div>";
}

function creditMarkup(order) {
  const ck = creditCheck(order);
  if (!ck) return "";

  return '<div class="ord-credit' + (ck.over ? " is-over" : "") + '">' +
    '<span><span class="label">Credit limit</span>' +
      '<span class="num">' + rupees(ck.customer.creditLimit) + "</span></span>" +
    '<span><span class="label">Outstanding</span>' +
      '<span class="num">' + rupees(ck.customer.outstanding) + "</span></span>" +
    '<span><span class="label">This order</span>' +
      '<span class="num">' + rupees(ck.value) + "</span></span>" +
    '<span><span class="label">Headroom</span>' +
      '<span class="num' + (ck.over ? " warn" : "") + '">' +
      (ck.over ? "−" + groupIndian(Math.abs(ck.headroom)) : rupees(ck.headroom)) +
      "</span></span>" +
    '<span><span class="label">Overdue</span>' +
      '<span class="num' + (ck.overdue > 30 ? " warn" : "") + '">' +
      (ck.overdue > 0 ? ck.overdue + " days" : "None") + "</span></span>" +
  "</div>";
}

// One order card. `opts.open` starts it expanded — the approval queue does,
// because the office is there to act on it, not to go hunting for the lines.
function orderCard(order, opts) {
  const open = !!(opts && opts.open);
  const c = getCustomer(order.customerId);
  const st = getStatus(order.status);
  const t = orderTotals(order);
  const items = order.lines.length;
  const ck = creditCheck(order);
  const flagged = ck && (ck.over || ck.overdue > 30);

  return '<article class="ord' + (open ? " is-open" : "") +
      (flagged && order.status === "pending" ? " is-flagged" : "") +
      '" data-no="' + order.no + '">' +
    '<button type="button" class="ord-head" aria-expanded="' + (open ? "true" : "false") + '">' +
      '<span class="ord-id">' +
        '<span class="ord-no">' + order.no + "</span>" +
        '<span class="ord-date">' + formatDate(order.date) + "</span>" +
      "</span>" +
      '<span class="ord-who">' +
        '<span class="ord-name">' + esc(c ? c.name : "Unknown dealer") + "</span>" +
        '<span class="ord-place">' + esc(c ? c.place : "") +
          (order.by ? " · " + esc(order.by) : "") + "</span>" +
      "</span>" +
      '<span class="ord-figs">' +
        '<span class="ord-value num">' + rupees(t.value) + "</span>" +
        '<span class="ord-meta num">' + items +
          (items === 1 ? " item · " : " items · ") +
          groupIndian(t.boxes) + " boxes · " +
          groupIndian(t.pairs) + " pairs</span>" +
      "</span>" +
      '<span class="ord-status" data-tone="' + st.tone + '">' + st.label + "</span>" +
      '<span class="ord-chev" aria-hidden="true">' +
        '<svg viewBox="0 0 16 16"><path d="M4 6l4 4 4-4" fill="none" ' +
          'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" ' +
          'stroke-linejoin="round"/></svg>' +
      "</span>" +
    "</button>" +
    '<div class="ord-body"' + (open ? "" : " hidden") + ">" +
      (order.note ? '<p class="ord-note">' + esc(order.note) + "</p>" : "") +
      creditMarkup(order) +
      '<div class="ord-lines">' + orderLinesMarkup(order) + "</div>" +
      '<div class="ord-foot">' +
        "<span>Order value</span>" +
        '<span class="num">' + rupees(t.value) + "</span>" +
      "</div>" +
      historyMarkup(order) +
      actionsMarkup(order) +
    "</div>" +
  "</article>";
}

function renderQueue() {
  const queue = pendingOrders();
  const value = queue.reduce(function (a, o) { return a + orderTotals(o).value; }, 0);

  el("queueCount").textContent = queue.length === 0
    ? "Nothing waiting"
    : queue.length + (queue.length === 1 ? " order · " : " orders · ") + rupees(value);

  const flagged = queue.filter(function (o) {
    const ck = creditCheck(o);
    return ck && (ck.over || ck.overdue > 30);
  }).length;

  const lead = el("queueLead");
  lead.hidden = flagged === 0;
  if (flagged > 0) {
    lead.textContent = flagged + (flagged === 1 ? " order needs" : " orders need") +
      " a credit decision — the dealer is over limit or badly overdue.";
  }

  el("queueNone").hidden = queue.length > 0;
  el("queueList").innerHTML = queue.map(function (o) {
    return orderCard(o, { open: true });
  }).join("");

  const badge = el("ordersBadge");
  badge.textContent = queue.length;
  badge.hidden = queue.length === 0;
}

function renderAllOrders() {
  const list = filteredOrders();

  el("allCount").textContent = ORDERS.length +
    (ORDERS.length === 1 ? " order on the book" : " orders on the book");

  el("ordNone").hidden = list.length > 0;
  el("ordList").innerHTML = list.map(function (o) {
    return orderCard(o, { open: false });
  }).join("");
}

function renderOrdersTab() {
  renderQueue();
  renderAllOrders();
}

function initOrders() {
  el("ordFilters").innerHTML = OFFICE_FILTERS.map(function (f) {
    return '<button type="button" class="cat' +
      (f.key === ordFilter ? " is-active" : "") +
      '" data-filter="' + f.key + '">' + f.label + "</button>";
  }).join("");

  el("ordFilters").addEventListener("click", function (e) {
    const btn = e.target.closest("[data-filter]");
    if (!btn) return;
    ordFilter = btn.dataset.filter;
    document.querySelectorAll("#ordFilters .cat").forEach(function (c) {
      c.classList.toggle("is-active", c.dataset.filter === ordFilter);
    });
    renderAllOrders();
  });

  // one handler for both lists — the cards are rebuilt on every change,
  // so per-button listeners would go stale
  [el("queueList"), el("ordList")].forEach(function (list) {
    list.addEventListener("click", onOrderListClick);
  });

  renderOrdersTab();
}

function onOrderListClick(e) {
  const card = e.target.closest(".ord");

  const act = e.target.closest("[data-act]");
  if (act) {
    handleAction(act.dataset.no, act.dataset.act, card);
    return;
  }

  const confirmReject = e.target.closest("[data-confirm-reject]");
  if (confirmReject) {
    doReject(confirmReject.dataset.confirmReject, card);
    return;
  }

  const cancelReject = e.target.closest("[data-cancel-reject]");
  if (cancelReject) {
    closeReason(card);
    return;
  }

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
    toast("That order is no longer on the book.");
    renderAll();
    return;
  }

  // rejecting asks for a reason first — the salesman is owed one
  if (key === "reject") {
    openReason(card);
    return;
  }

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

  OrderStore.decide(
    no,
    "rejected",
    "Rejected by office — " + (reason || "no reason given"),
    me.name
  );

  toast(no + " rejected. The salesman has been told why.");
  renderAll();
}

function noteFor(action, order) {
  const who = " · " + me.name;

  if (action.to === "approved") {
    const ck = creditCheck(order);
    return ck && ck.over
      ? "Approved on credit override" + who
      : "Approved by office" + who;
  }
  if (action.to === "production") return "On the production schedule" + who;
  if (action.to === "ready") return "Made and ready to dispatch" + who;
  if (action.to === "dispatched") return "Left the godown" + who;
  if (action.to === "delivered") return "Delivered to the dealer" + who;
  if (action.to === "pending") return "Sent back for a fresh decision" + who;
  return "";
}

// ============================================================
// SALES
// ============================================================

const STAGE_ROWS = [
  { key: "pending", label: "Awaiting approval" },
  { key: "approved", label: "Approved" },
  { key: "production", label: "In production" },
  { key: "ready", label: "Ready to dispatch" },
  { key: "dispatched", label: "Dispatched" },
  { key: "delivered", label: "Delivered" },
  { key: "rejected", label: "Rejected" }
];

// what the company still owes the dealer: everything not rejected
function liveOrders() {
  return ORDERS.filter(function (o) { return o.status !== "rejected"; });
}

function sumValue(list) {
  return list.reduce(function (a, o) { return a + orderTotals(o).value; }, 0);
}

function renderSalesTab() {
  const live = liveOrders();
  const queue = pendingOrders();
  const factory = ORDERS.filter(function (o) {
    return ["approved", "production", "ready"].indexOf(o.status) !== -1;
  });
  const outstanding = CUSTOMERS.reduce(function (a, c) { return a + c.outstanding; }, 0);
  const overdue = PAYMENTS.filter(function (p) { return p.overdueDays > 30; });

  el("salesAsOf").textContent = "As at " + formatDate(isoToday());

  el("kpiBookValue").textContent = rupees(sumValue(live));
  el("kpiBookNote").textContent = live.length +
    (live.length === 1 ? " live order" : " live orders");

  el("kpiPending").textContent = queue.length;
  el("kpiPendingNote").textContent = queue.length === 0
    ? "Desk is clear"
    : rupees(sumValue(queue)) + " to decide";

  el("kpiFactory").textContent = factory.length;
  el("kpiFactoryNote").textContent = rupees(sumValue(factory)) + " being made";

  el("kpiOutstanding").textContent = rupees(outstanding);
  el("kpiOutstandingNote").textContent = overdue.length +
    (overdue.length === 1 ? " invoice" : " invoices") + " over 30 days";
  el("kpiOutstandingNote").classList.toggle("warn", overdue.length > 0);

  // by stage
  el("stageBody").innerHTML = STAGE_ROWS.map(function (row) {
    const list = ORDERS.filter(function (o) { return o.status === row.key; });
    const t = list.reduce(function (acc, o) {
      const ot = orderTotals(o);
      acc.boxes += ot.boxes;
      acc.pairs += ot.pairs;
      acc.value += ot.value;
      return acc;
    }, { boxes: 0, pairs: 0, value: 0 });
    const st = getStatus(row.key);

    return "<tr>" +
      '<td><span class="t-name">' + esc(row.label) + "</span>" +
        '<span class="t-sub">' + esc(st.label) + "</span></td>" +
      '<td class="t-strong">' + list.length + "</td>" +
      '<td class="muted">' + groupIndian(t.boxes) + "</td>" +
      '<td class="muted">' + groupIndian(t.pairs) + "</td>" +
      '<td class="t-strong">' + rupees(t.value) + "</td>" +
      "</tr>";
  }).join("");

  // by salesman
  const byName = Object.create(null);
  live.forEach(function (o) {
    const key = o.by || "Unattributed";
    if (!byName[key]) byName[key] = { orders: 0, pending: 0, value: 0 };
    byName[key].orders++;
    if (o.status === "pending") byName[key].pending++;
    byName[key].value += orderTotals(o).value;
  });

  const names = Object.keys(byName).sort(function (a, b) {
    return byName[b].value - byName[a].value;
  });

  el("salesmanBody").innerHTML = names.length === 0
    ? '<tr><td colspan="4" class="muted">No orders on the book.</td></tr>'
    : names.map(function (n) {
        const r = byName[n];
        const staff = STAFF.find(function (s) { return s.name === n; });
        return "<tr>" +
          '<td><span class="t-name">' + esc(n) + "</span>" +
            '<span class="t-sub">' + esc(staff ? staff.branch : "—") + "</span></td>" +
          '<td class="t-strong">' + r.orders + "</td>" +
          '<td class="t-strong' + (r.pending > 0 ? " warn" : "") + '">' + r.pending + "</td>" +
          '<td class="t-strong">' + rupees(r.value) + "</td>" +
          "</tr>";
      }).join("");

  // top dealers
  const byDealer = Object.create(null);
  live.forEach(function (o) {
    if (!byDealer[o.customerId]) byDealer[o.customerId] = { orders: 0, value: 0 };
    byDealer[o.customerId].orders++;
    byDealer[o.customerId].value += orderTotals(o).value;
  });

  const ids = Object.keys(byDealer).sort(function (a, b) {
    return byDealer[b].value - byDealer[a].value;
  });

  el("dealerBody").innerHTML = ids.length === 0
    ? '<tr><td colspan="4" class="muted">No orders on the book.</td></tr>'
    : ids.map(function (id) {
        const c = getCustomer(id);
        const r = byDealer[id];
        const tight = c && c.outstanding / c.creditLimit > 0.6;
        return "<tr>" +
          '<td><span class="t-name">' + esc(c ? c.name : id) + "</span>" +
            '<span class="t-sub">' + esc(c ? c.place : "") + "</span></td>" +
          '<td class="t-strong">' + r.orders + "</td>" +
          '<td class="t-strong">' + rupees(r.value) + "</td>" +
          '<td class="t-strong' + (tight ? " warn" : "") + '">' +
            (c ? rupees(c.outstanding) : "—") + "</td>" +
          "</tr>";
      }).join("");
}

// ============================================================
// PURCHASE
// ============================================================

const OPEN_PO = ["raised", "sent", "partial"];

function renderPurchaseTab() {
  const open = PURCHASES.filter(function (p) {
    return OPEN_PO.indexOf(p.status) !== -1;
  });
  const committed = open.reduce(function (a, p) { return a + p.value; }, 0);
  const short = MATERIALS.filter(function (m) { return m.onHand < m.reorder; });

  el("kpiOpenPo").textContent = open.length;
  el("kpiOpenPoNote").textContent = PURCHASES.length + " raised in all";

  el("kpiPoValue").textContent = rupees(committed);

  el("kpiReorder").textContent = short.length;
  el("kpiReorderNote").textContent = short.length === 0
    ? "Every material is covered"
    : short.map(function (m) { return m.name; }).join(", ");
  el("kpiReorderNote").classList.toggle("warn", short.length > 0);

  el("poCount").textContent = open.length + " open · " + rupees(committed) + " committed";

  el("poBody").innerHTML = PURCHASES.map(function (p) {
    const s = getSupplier(p.supplierId);
    const st = getPurchaseStatus(p.status);
    return "<tr>" +
      '<td><span class="t-name">' + p.no + "</span>" +
        '<span class="t-sub">' + formatDate(p.date) + "</span></td>" +
      '<td><span class="t-name">' + esc(s ? s.name : "—") + "</span>" +
        '<span class="t-sub">' + esc(s ? s.place : "") + "</span></td>" +
      '<td><span class="t-name">' + esc(p.item) + "</span>" +
        '<span class="t-sub">' + esc(p.note) + "</span></td>" +
      '<td class="muted">' + esc(p.qty) + "</td>" +
      '<td class="t-strong">' + rupees(p.value) + "</td>" +
      '<td><span class="ord-status" data-tone="' + st.tone + '">' + st.label + "</span></td>" +
      "</tr>";
  }).join("");

  el("materialBody").innerHTML = MATERIALS.map(function (m) {
    const low = m.onHand < m.reorder;
    const cover = Math.round((m.onHand / m.reorder) * 100);
    return "<tr>" +
      '<td><span class="t-name">' + esc(m.name) + "</span>" +
        '<span class="t-sub">in ' + esc(m.unit) + "</span></td>" +
      '<td class="t-strong' + (low ? " warn" : "") + '">' + groupIndian(m.onHand) + "</td>" +
      '<td class="muted">' + groupIndian(m.reorder) + "</td>" +
      '<td class="t-strong' + (low ? " warn" : "") + '">' + cover + "%" +
        (low ? '<span class="t-sub warn">Reorder</span>' : "") + "</td>" +
      "</tr>";
  }).join("");

  el("supplierBody").innerHTML = SUPPLIERS.map(function (s) {
    const theirs = PURCHASES.filter(function (p) {
      return p.supplierId === s.id && OPEN_PO.indexOf(p.status) !== -1;
    });
    const value = theirs.reduce(function (a, p) { return a + p.value; }, 0);
    return "<tr>" +
      '<td><span class="t-name">' + esc(s.name) + "</span>" +
        '<span class="t-sub">' + esc(s.place) + "</span></td>" +
      '<td class="muted">' + esc(s.supplies) + "</td>" +
      '<td class="t-strong">' + theirs.length + "</td>" +
      '<td class="t-strong">' + (value > 0 ? rupees(value) : "—") + "</td>" +
      "</tr>";
  }).join("");
}

// ============================================================
// ADMINISTRATION
// ============================================================

function renderAdminTab() {
  el("staffBody").innerHTML = STAFF.map(function (s) {
    const isMe = s.userId === me.userId;
    return "<tr>" +
      '<td><span class="t-name">' + esc(s.name) +
        (isMe ? '<span class="chip chip-soft">You</span>' : "") + "</span>" +
        '<span class="t-sub">' + esc(roleLabel(s.role)) + "</span></td>" +
      '<td class="muted">' + esc(s.userId) + "</td>" +
      '<td class="muted">' + esc(roleLabel(s.role)) + "</td>" +
      '<td class="muted">' + esc(s.branch) + "</td>" +
      "<td>" + (s.login
        ? '<span class="chip chip-go">Enabled</span>'
        : '<span class="chip">Not in demo</span>') + "</td>" +
      "<td>" + (s.active
        ? '<span class="chip chip-go">Active</span>'
        : '<span class="chip chip-stop">Inactive</span>') + "</td>" +
      "</tr>";
  }).join("");

  el("creditBody").innerHTML = CUSTOMERS.map(function (c) {
    const headroom = c.creditLimit - c.outstanding;
    const tight = headroom < c.creditLimit * 0.25;
    return "<tr>" +
      '<td><span class="t-name">' + esc(c.name) + "</span>" +
        '<span class="t-sub">' + esc(c.place) + "</span></td>" +
      '<td class="t-strong">' + rupees(c.creditLimit) + "</td>" +
      '<td class="t-strong">' + rupees(c.outstanding) + "</td>" +
      '<td class="t-strong' + (tight ? " warn" : "") + '">' + rupees(headroom) + "</td>" +
      '<td class="t-strong' + (c.overdueDays > 30 ? " warn" : "") + '">' +
        (c.overdueDays > 0 ? c.overdueDays + " days" : "None") + "</td>" +
      "</tr>";
  }).join("");

  el("brandBody").innerHTML = BRANDS.map(function (b) {
    const arts = ARTICLES.filter(function (a) { return a.brand === b.key; });
    const pairs = arts.reduce(function (a, art) { return a + articleStock(art.code); }, 0);
    return "<tr>" +
      '<td><span class="t-name">' + esc(b.name) + "</span>" +
        '<span class="t-sub">' + esc(b.tagline) + "</span></td>" +
      '<td class="muted">' + esc(arts.length > 0 ? arts[0].category : "—") + "</td>" +
      '<td class="t-strong">' + arts.length + "</td>" +
      '<td class="t-strong">' + groupIndian(pairs) + "</td>" +
      "</tr>";
  }).join("");

  const placed = ORDERS.filter(function (o) { return (o.history || []).length > 0; }).length;
  el("demoDataNote").textContent = ORDERS.length + " orders on the book, " +
    placed + " of them touched during this run-through.";

  el("resetDemoBtn").onclick = function () {
    OrderStore.reset();
    toast("Order book reset to the five sample orders.");
    renderAll();
  };
}

// ============================================================
// BOOT
// ============================================================

function renderAll() {
  renderSalesTab();
  renderPurchaseTab();
  renderOrdersTab();
  renderAdminTab();
}

if (me) {
  renderWho();
  initTabs();
  initOrders();
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
