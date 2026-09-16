// ============================================================
// SAMPLE FOOTWEAR ERP — session + shared order book
//
// There is no server in this prototype, so the two role screens
// talk to each other through the browser instead:
//
//   Session    — who is signed in, per browser tab (sessionStorage),
//                so a salesman tab and an office tab can be open
//                side by side as two different people.
//   OrderStore — the one order book both screens read and write
//                (localStorage), shared across every tab on the
//                same origin. A salesman places an order, the
//                office approves it, and the salesman sees the
//                decision — live, without a reload.
//
// Loaded after data.js: it hydrates that file's ORDERS array and
// nextOrderNumber from storage, so every screen starts from the
// same state rather than from the seed.
// ============================================================

// A private window, or a page opened straight off the filesystem in
// some browsers, can refuse storage outright. Nothing here may throw
// in that case — the demo just falls back to memory for that tab.
function safeStorage(kind) {
  try {
    const s = window[kind];
    const probe = "__sfw_probe__";
    s.setItem(probe, "1");
    s.removeItem(probe);
    return s;
  } catch (e) {
    return null;
  }
}

const memoryFallback = Object.create(null);

function storageGet(kind, key) {
  const s = safeStorage(kind);
  if (!s) return key in memoryFallback ? memoryFallback[key] : null;
  return s.getItem(key);
}

function storageSet(kind, key, value) {
  memoryFallback[key] = value;
  const s = safeStorage(kind);
  if (s) s.setItem(key, value);
}

function storageRemove(kind, key) {
  delete memoryFallback[key];
  const s = safeStorage(kind);
  if (s) s.removeItem(key);
}

// ============================================================
// SESSION
// ============================================================

const Session = (function () {
  const KEY = "sfw.erp.session.v1";

  function current() {
    const raw = storageGet("sessionStorage", KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function signIn(user) {
    storageSet("sessionStorage", KEY, JSON.stringify({
      userId: user.userId,
      name: user.name,
      role: user.role,
      territory: user.territory || ""
    }));
  }

  function signOut() {
    storageRemove("sessionStorage", KEY);
  }

  // A screen belongs to exactly one role. Anyone else — nobody signed
  // in, or the wrong role — is sent back to the login rather than shown
  // a page they have no business seeing.
  function require(role) {
    const me = current();
    if (!me || me.role !== role) {
      window.location.replace("index.html?denied=" + encodeURIComponent(role));
      return null;
    }
    return me;
  }

  return { current: current, signIn: signIn, signOut: signOut, require: require };
})();

// ============================================================
// ORDER BOOK
// ============================================================

const OrderStore = (function () {
  const ORDERS_KEY = "sfw.erp.orders.v1";
  const SEQ_KEY = "sfw.erp.seq.v1";
  const LOCAL_EVENT = "sfw-orders-changed";

  // the seed in data.js, kept aside so the demo can be reset to it
  const SEED_ORDERS = JSON.parse(JSON.stringify(ORDERS));
  const SEED_SEQ = nextOrderNumber;

  function readOrders() {
    const raw = storageGet("localStorage", ORDERS_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch (e) {
      return null;
    }
  }

  // ORDERS is a const in data.js and every screen already holds a
  // reference to it, so it is refilled in place rather than replaced.
  function adopt(list) {
    ORDERS.length = 0;
    list.forEach(function (o) { ORDERS.push(o); });
  }

  function persist() {
    storageSet("localStorage", ORDERS_KEY, JSON.stringify(ORDERS));
    storageSet("localStorage", SEQ_KEY, String(nextOrderNumber));
    // storage events only reach *other* tabs, so this tab is told directly
    window.dispatchEvent(new CustomEvent(LOCAL_EVENT));
  }

  // The order list and the next order number are pulled in separately,
  // because claiming a number and writing the order are two steps: a
  // reload of the number in between would hand back a number already used.
  function hydrateOrders() {
    const stored = readOrders();
    if (!stored) {
      // first run on this browser — write the seed out as the shared book
      persist();
      return;
    }
    adopt(stored);
  }

  // Never moves backwards: a number claimed in this tab but not yet written
  // out is still the highest one anybody has taken.
  function hydrateSeq() {
    const seq = parseInt(storageGet("localStorage", SEQ_KEY), 10);
    if (!isNaN(seq)) nextOrderNumber = Math.max(seq, nextOrderNumber, SEED_SEQ);
  }

  function hydrate() {
    hydrateOrders();
    hydrateSeq();
  }

  function reset() {
    adopt(JSON.parse(JSON.stringify(SEED_ORDERS)));
    nextOrderNumber = SEED_SEQ;
    persist();
  }

  function get(no) {
    return ORDERS.find(function (o) { return o.no === no; }) || null;
  }

  // The next order number, claimed and written out in one step so two tabs
  // placing orders cannot land on the same one.
  function claimOrderNo() {
    hydrateSeq();
    const no = "SO-" + nextOrderNumber;
    nextOrderNumber++;
    storageSet("localStorage", SEQ_KEY, String(nextOrderNumber));
    return no;
  }

  function place(order) {
    // orders only — re-reading the sequence here would undo the claim
    // the caller has just made
    hydrateOrders();
    order.history = [{
      at: new Date().toISOString(),
      status: "pending",
      by: order.by || "Salesman",
      note: "Order placed"
    }];
    // unseen is the salesman's side of the loop: the office sets it when
    // it decides, the salesman's pending tab clears it on open.
    order.unseen = false;
    ORDERS.unshift(order);
    persist();
    return order;
  }

  // The office moving an order along. Returns the updated order, or null
  // if it has gone (another tab reset the demo mid-click).
  function decide(no, status, note, by) {
    hydrateOrders();
    const order = get(no);
    if (!order) return null;

    order.status = status;
    if (note) order.note = note;
    order.history = (order.history || []).concat([{
      at: new Date().toISOString(),
      status: status,
      by: by || "Office",
      note: note || ""
    }]);
    order.unseen = true;
    persist();
    return order;
  }

  // Clear the "you have not seen this yet" marks. `pick` narrows it to one
  // person's orders, so one salesman opening their tab does not clear
  // another's unread decisions.
  function markSeen(pick) {
    let touched = false;
    ORDERS.forEach(function (o) {
      if (o.unseen && (!pick || pick(o))) {
        o.unseen = false;
        touched = true;
      }
    });
    if (touched) persist();
    return touched;
  }

  function unseenCount(pick) {
    return ORDERS.filter(function (o) {
      return o.unseen && (!pick || pick(o));
    }).length;
  }

  function forSalesman(name) {
    return ORDERS.filter(function (o) { return o.by === name; });
  }

  // fn is handed the hydrated ORDERS whenever anything changes, in this
  // tab or any other
  function onChange(fn) {
    window.addEventListener("storage", function (e) {
      if (e.key !== ORDERS_KEY && e.key !== SEQ_KEY) return;
      hydrate();
      fn(ORDERS);
    });
    window.addEventListener(LOCAL_EVENT, function () { fn(ORDERS); });
  }

  hydrate();

  return {
    hydrate: hydrate,
    reset: reset,
    get: get,
    claimOrderNo: claimOrderNo,
    place: place,
    decide: decide,
    markSeen: markSeen,
    unseenCount: unseenCount,
    forSalesman: forSalesman,
    onChange: onChange
  };
})();
