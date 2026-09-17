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
//   ProductStore — the same idea for the catalogue: the office adds
//                a product and it appears in the salesman's shop.
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


// ============================================================
// CATALOGUE
//
// The office adds products; the salesman sells them. Same shape as
// the order book above: one shared list in localStorage, ARTICLES
// refilled in place so every screen already holding a reference to
// it sees the change, and a live event so an open salesman tab
// updates without a reload.
//
// Photographs live on the product record as data URLs. They are
// shrunk before they get here (see the office screen) because
// localStorage is small and shared with the order book — a stored
// catalogue that will not fit is the one failure this has to
// survive, so every write is guarded.
// ============================================================

const ProductStore = (function () {
  const KEY = "sfw.erp.products.v1";
  const LOCAL_EVENT = "sfw-products-changed";

  // the catalogue shipped in data.js, kept aside so the demo can be reset
  const SEED = JSON.parse(JSON.stringify(ARTICLES));

  function read() {
    const raw = storageGet("localStorage", KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch (e) {
      return null;
    }
  }

  // ARTICLES is a const in data.js and every screen holds a reference to it,
  // so it is refilled in place rather than replaced.
  function adopt(list) {
    ARTICLES.length = 0;
    list.forEach(function (a) { ARTICLES.push(a); });
    reindexArticles();
  }

  // Returns null on success, or a message to show the user. A catalogue with
  // photographs can outgrow localStorage; when it does the product is not
  // silently dropped — the caller is told, so it can say so and put the
  // list back. A browser that refuses storage altogether (a private window)
  // is a different thing and is not an error: the catalogue simply lives in
  // memory for that tab, exactly as the order book does.
  function persist() {
    const json = JSON.stringify(ARTICLES);
    const store = safeStorage("localStorage");

    if (store) {
      const previous = store.getItem(KEY);
      try {
        store.setItem(KEY, json);
      } catch (e) {
        // leave the stored copy exactly as it was
        if (previous !== null) {
          try { store.setItem(KEY, previous); } catch (ignored) {}
        }
        return "There is no room left in this browser to save another photo. " +
          "Remove a product you no longer need, or add this one without a photo.";
      }
    }

    memoryFallback[KEY] = json;
    window.dispatchEvent(new CustomEvent(LOCAL_EVENT));
    return null;
  }

  function hydrate() {
    const stored = read();
    if (stored) adopt(stored);
    else persist();
  }

  function all() {
    return ARTICLES.slice();
  }

  function add(product) {
    hydrate();

    if (getArticle(product.code)) {
      return { error: "A product with code " + product.code + " already exists." };
    }

    ARTICLES.unshift(product);
    reindexArticles();

    const problem = persist();
    if (problem) {
      // put the catalogue back the way it was rather than leave the screen
      // showing a product that was never saved
      hydrate();
      return { error: problem };
    }
    return { product: product };
  }

  function remove(code) {
    hydrate();
    const i = ARTICLES.findIndex(function (a) { return a.code === code; });
    if (i === -1) return { error: "That product is no longer in the list." };

    const gone = ARTICLES.splice(i, 1)[0];
    reindexArticles();
    persist();
    return { product: gone };
  }

  function reset() {
    adopt(JSON.parse(JSON.stringify(SEED)));
    persist();
  }

  function onChange(fn) {
    window.addEventListener("storage", function (e) {
      if (e.key !== KEY) return;
      hydrate();
      fn(ARTICLES);
    });
    window.addEventListener(LOCAL_EVENT, function () { fn(ARTICLES); });
  }

  hydrate();

  return {
    hydrate: hydrate,
    all: all,
    add: add,
    remove: remove,
    reset: reset,
    onChange: onChange
  };
})();
