// ============================================================
// SAMPLE FOOTWEAR ERP — DUMMY DATA
// All hardcoded for demo purposes. Edit this file to change
// any figures shown across the prototype.
// ============================================================

const SIZES = ["6-7", "7-8", "8-9", "9-10", "10-11"];

// ============================================================
// LOGINS
// Each account belongs to exactly one role. The login screen
// checks the account against the role picked in the dropdown, so
// a salesman account cannot sign in as office and vice versa.
// Only the two roles this demo actually ships a screen for have
// accounts; the rest are listed as roles but cannot sign in.
// ============================================================

const ROLES = [
  { key: "admin",      label: "Super Admin" },
  { key: "office",     label: "Office" },
  { key: "salesman",   label: "Salesman" },
  { key: "production", label: "Production" },
  { key: "godown",     label: "Godown" },
  { key: "hr",         label: "HR" },
  { key: "accounts",   label: "Accounts" }
];

const USERS = [
  {
    userId: "rajesh.k",
    password: "demo",
    role: "salesman",
    name: "Rajesh K",
    home: "order.html",
    territory: "Kozhikode \u00B7 Malabar belt"
  },
  {
    userId: "anita.m",
    password: "demo",
    role: "office",
    name: "Anita M",
    home: "office.html",
    territory: "Head office \u00B7 Kochi"
  }
];

const ROLE_BY_KEY = new Map(ROLES.map(function (r) { return [r.key, r]; }));

function roleLabel(key) {
  const r = ROLE_BY_KEY.get(key);
  return r ? r.label : key;
}

function findUser(userId) {
  const id = String(userId || "").trim().toLowerCase();
  return USERS.find(function (u) { return u.userId === id; }) || null;
}

// roles that have a screen in this prototype
function roleHasLogin(key) {
  return USERS.some(function (u) { return u.role === key; });
}


const PRESETS = {
  standard: [4, 5, 6, 5, 4],
  large: [2, 4, 6, 7, 5],
  small: [6, 7, 5, 4, 2]
};

// House brands under the Sample Footwear group.
// These are invented names — deliberately not real-world footwear brands.
// logo: how the wordmark is drawn (see .logo-word variants in the CSS)
const BRANDS = [
  { key: "classic", name: "SF Classic",  tagline: "Everyday gents",   logo: "block",  colour: "#B3202C" },
  { key: "stride",  name: "Stride Pro",  tagline: "Premium comfort",  logo: "slant",  colour: "#1C1A1A" },
  { key: "terra",   name: "Terra",       tagline: "Value range",      logo: "spaced", colour: "#7A4E2E" },
  { key: "breeze",  name: "Breeze",      tagline: "Ladies daily",     logo: "soft",   colour: "#2F5488" },
  { key: "bloom",   name: "Bloom",       tagline: "Ladies premium",   logo: "dot",    colour: "#B3202C" },
  { key: "junior",  name: "Junior Step", tagline: "Kids",             logo: "round",  colour: "#B4741A" }
];

const BRAND_BY_KEY = new Map(BRANDS.map(function (b) { return [b.key, b]; }));

function getBrand(key) {
  return BRAND_BY_KEY.get(key);
}

const CATEGORIES = [
  { key: "gents", label: "Gents", prefix: "GTS" },
  { key: "ladies", label: "Ladies", prefix: "LDS" },
  { key: "kids", label: "Kids", prefix: "KID" }
];

const CUSTOMERS = [
  {
    id: "c1",
    name: "Malabar Footwear Traders",
    place: "Kozhikode",
    creditLimit: 500000,
    outstanding: 142500,
    overdueDays: 18,
    lastOrder: "2026-08-14"
  },
  {
    id: "c2",
    name: "Kochin Shoe Palace",
    place: "Ernakulam",
    creditLimit: 350000,
    outstanding: 268000,
    overdueDays: 42,
    lastOrder: "2026-07-29"
  },
  {
    id: "c3",
    name: "St. Thomas Footwear Mart",
    place: "Thrissur",
    creditLimit: 250000,
    outstanding: 41000,
    overdueDays: 0,
    lastOrder: "2026-08-20"
  },
  {
    id: "c4",
    name: "Alappuzha Chappal Depot",
    place: "Alappuzha",
    creditLimit: 400000,
    outstanding: 312000,
    overdueDays: 65,
    lastOrder: "2026-07-02"
  },
  {
    id: "c5",
    name: "Kollam Footwear House",
    place: "Kollam",
    creditLimit: 300000,
    outstanding: 58500,
    overdueDays: 5,
    lastOrder: "2026-08-22"
  },
  {
    id: "c6",
    name: "Thiruvalla Sole Traders",
    place: "Pathanamthitta",
    creditLimit: 200000,
    outstanding: 187000,
    overdueDays: 30,
    lastOrder: "2026-08-05"
  }
];

// rate = dealer rate per pair, in rupees. A box is 24 pairs.
const ARTICLES = [
  // ---------- gents ----------
  { code: "GTS-4501", brand: "classic", style: "thong", name: "Gents Daily Slipper", category: "gents", rate: 185, colours: ["Black", "Brown", "Blue"] , fastMoving: true },
  { code: "GTS-4502", brand: "classic", style: "band", name: "Gents Casual Slipper", category: "gents", rate: 210, colours: ["Black", "Brown"]  },
  { code: "GTS-4610", brand: "stride", style: "cross", name: "Gents Comfort Slipper", category: "gents", rate: 245, colours: ["Black", "Brown", "Blue"] , isNew: true },
  { code: "GTS-4705", brand: "terra", style: "thong", name: "Gents Economy Slipper", category: "gents", rate: 165, colours: ["Black", "Blue"] , fastMoving: true },
  { code: "GTS-4820", brand: "stride", style: "tstrap", name: "Gents Premium Slipper", category: "gents", rate: 295, colours: ["Black", "Brown"] , isNew: true },

  // ---------- ladies ----------
  { code: "LDS-2201", brand: "breeze", style: "band", name: "Ladies Daily Slipper", category: "ladies", rate: 165, colours: ["Black", "Brown", "Blue"] , fastMoving: true },
  { code: "LDS-2208", brand: "breeze", style: "cross", name: "Ladies Fancy Slipper", category: "ladies", rate: 175, colours: ["Brown", "Blue"]  },
  { code: "LDS-2310", brand: "bloom", style: "tstrap", name: "Ladies Comfort Slipper", category: "ladies", rate: 195, colours: ["Black", "Brown"]  },
  { code: "LDS-2415", brand: "bloom", style: "band", name: "Ladies Premium Slipper", category: "ladies", rate: 225, colours: ["Black", "Blue"] , isNew: true },

  // ---------- kids ----------
  { code: "KID-1102", brand: "junior", style: "thong", name: "Kids School Slipper", category: "kids", rate: 120, colours: ["Black", "Blue"] , fastMoving: true },
  { code: "KID-1205", brand: "junior", style: "cross", name: "Kids Fancy Slipper", category: "kids", rate: 135, colours: ["Brown", "Blue"]  },
  { code: "KID-1310", brand: "junior", style: "band", name: "Kids Sport Slipper", category: "kids", rate: 150, colours: ["Black", "Blue"] , isNew: true }
];

// Stock per article+colour, pairs available for each of the five sizes.
// Anything under LOW_STOCK_THRESHOLD pairs is flagged low stock.
const LOW_STOCK_THRESHOLD = 40;

const STOCK = {
  "GTS-4501|Black": [120, 95, 140, 60, 30],
  "GTS-4501|Brown": [80, 20, 55, 40, 25],
  "GTS-4501|Blue": [10, 15, 20, 12, 8],
  "GTS-4502|Black": [200, 180, 160, 90, 70],
  "GTS-4502|Brown": [60, 45, 38, 22, 15],
  "GTS-4610|Black": [150, 140, 120, 100, 85],
  "GTS-4610|Brown": [40, 35, 30, 25, 18],
  "GTS-4610|Blue": [25, 20, 15, 10, 5],
  "GTS-4705|Black": [210, 190, 175, 120, 95],
  "GTS-4705|Blue": [65, 58, 44, 30, 22],
  "GTS-4820|Black": [90, 85, 70, 55, 40],
  "GTS-4820|Brown": [35, 28, 24, 18, 12],

  "LDS-2201|Black": [90, 110, 100, 70, 50],
  "LDS-2201|Brown": [45, 30, 25, 18, 10],
  "LDS-2201|Blue": [70, 65, 60, 40, 35],
  "LDS-2208|Brown": [55, 48, 42, 30, 20],
  "LDS-2208|Blue": [15, 10, 22, 18, 12],
  "LDS-2310|Black": [130, 115, 95, 75, 55],
  "LDS-2310|Brown": [50, 42, 36, 28, 20],
  "LDS-2415|Black": [75, 68, 60, 45, 32],
  "LDS-2415|Blue": [30, 26, 20, 15, 10],

  "KID-1102|Black": [130, 120, 100, 80, 60],
  "KID-1102|Blue": [35, 28, 30, 20, 15],
  "KID-1205|Brown": [95, 88, 72, 55, 38],
  "KID-1205|Blue": [42, 36, 30, 24, 16],
  "KID-1310|Black": [160, 145, 130, 105, 80],
  "KID-1310|Blue": [55, 48, 40, 32, 25]
};

// A product the office adds carries its own opening stock on the record,
// so it is looked at before the fixed godown table above.
function getStock(articleCode, colour) {
  const a = getArticle(articleCode);
  if (a && a.stock && a.stock[colour]) return a.stock[colour];
  return STOCK[articleCode + "|" + colour] || [0, 0, 0, 0, 0];
}

// ARTICLES is refilled in place whenever the office adds or removes a
// product, so the lookups below are rebuilt rather than built once.
let ARTICLE_BY_CODE = new Map();
let ARTICLE_STOCK = Object.create(null);

function reindexArticles() {
  ARTICLE_BY_CODE = new Map(ARTICLES.map(function (a) { return [a.code, a]; }));

  // total pairs in the godown per article, totalled here rather than
  // rescanned on every sort comparison
  ARTICLE_STOCK = Object.create(null);

  Object.keys(STOCK).forEach(function (k) {
    const code = k.split("|")[0];
    const sum = STOCK[k].reduce(function (a, b) { return a + b; }, 0);
    ARTICLE_STOCK[code] = (ARTICLE_STOCK[code] || 0) + sum;
  });

  // anything the office added brings its own opening stock
  ARTICLES.forEach(function (a) {
    if (!a.stock) return;
    ARTICLE_STOCK[a.code] = Object.keys(a.stock).reduce(function (t, col) {
      return t + a.stock[col].reduce(function (x, y) { return x + y; }, 0);
    }, 0);
  });
}

function getArticle(code) {
  return ARTICLE_BY_CODE.get(code);
}

function articleStock(code) {
  return ARTICLE_STOCK[code] || 0;
}

reindexArticles();

// ============================================================
// ADDING A PRODUCT
// What the office picks from when it puts a new article on the
// books. Styles decide how the fallback drawing is inked, for a
// product added without a photograph.
// ============================================================

const STYLES = [
  { key: "thong",  label: "Thong (V strap)" },
  { key: "band",   label: "Band across" },
  { key: "cross",  label: "Cross straps" },
  { key: "tstrap", label: "T-strap" }
];

const COLOUR_CHOICES = ["Black", "Brown", "Blue"];

// Codes are handed out rather than typed, so two products can never collide
// and nobody has to know the numbering scheme.
function nextArticleCode(categoryKey) {
  const cat = CATEGORIES.find(function (c) { return c.key === categoryKey; });
  const prefix = (cat ? cat.prefix : "GTS") + "-";

  const highest = ARTICLES.reduce(function (max, a) {
    if (a.code.indexOf(prefix) !== 0) return max;
    const n = parseInt(a.code.slice(prefix.length), 10);
    return isNaN(n) ? max : Math.max(max, n);
  }, 0);

  return prefix + (highest + 1);
}

// Spread a pairs-per-colour figure across the five sizes the way a normal
// box is made up, so a new product behaves like every other one.
function spreadStock(pairsPerColour) {
  const ratio = PRESETS.standard;
  const total = ratio.reduce(function (a, b) { return a + b; }, 0);
  return ratio.map(function (r) {
    return Math.round((pairsPerColour * r) / total);
  });
}

const PAYMENTS = [
  { customer: "Malabar Footwear Traders", invoiceNo: "INV-3312", amount: 62500, overdueDays: 18 },
  { customer: "Kochin Shoe Palace", invoiceNo: "INV-3288", amount: 118000, overdueDays: 42 },
  { customer: "Alappuzha Chappal Depot", invoiceNo: "INV-3201", amount: 165000, overdueDays: 65 },
  { customer: "Alappuzha Chappal Depot", invoiceNo: "INV-3255", amount: 147000, overdueDays: 33 },
  { customer: "Thiruvalla Sole Traders", invoiceNo: "INV-3298", amount: 92000, overdueDays: 30 },
  { customer: "Kollam Footwear House", invoiceNo: "INV-3340", amount: 58500, overdueDays: 5 }
];

let nextOrderNumber = 2451;

// ============================================================
// ORDER STATUS
// The status of a placed order is owned elsewhere in the ERP —
// office approves, production makes, godown dispatches. Until
// those screens are wired up these are dummy values.
// ============================================================

// Plain words. These labels are the single source for the status pill, the
// dropdowns and the charts, so the same order is never called two things on
// two different screens.
const ORDER_STATUSES = {
  pending:    { label: "Waiting for approval", tone: "wait" },
  approved:   { label: "Approved",             tone: "info" },
  production: { label: "Being made",           tone: "info" },
  ready:      { label: "Ready to send",        tone: "info" },
  dispatched: { label: "Sent out",             tone: "go" },
  delivered:  { label: "Delivered",            tone: "done" },
  rejected:   { label: "Rejected",             tone: "stop" }
};

// the order a job really travels in; rejected is a dead end, not a stage
const PIPELINE_KEYS = ["pending", "approved", "production", "ready",
                       "dispatched", "delivered"];

// What the office may do to an order in a given state. Each action
// names the status it moves the order to; the office screen turns
// these into the buttons on an order card.
// Plain words, and never more than two choices at a time — the office
// should not have to work out what a button means.
const OFFICE_ACTIONS = {
  pending: [
    { key: "approve",  label: "Approve",           to: "approved",   kind: "ok"      },
    { key: "reject",   label: "Reject",            to: "rejected",   kind: "danger"  }
  ],
  approved: [
    { key: "produce",  label: "Send to factory",   to: "production", kind: "primary" },
    { key: "hold",     label: "Undo approval",     to: "pending",    kind: "ghost"   }
  ],
  production: [
    { key: "ready",    label: "Mark as made",      to: "ready",      kind: "primary" }
  ],
  ready: [
    { key: "dispatch", label: "Mark as sent out",  to: "dispatched", kind: "primary" }
  ],
  dispatched: [
    { key: "deliver",  label: "Mark as delivered", to: "delivered",  kind: "primary" }
  ],
  rejected: [
    { key: "reopen",   label: "Undo reject",       to: "pending",    kind: "ghost"   }
  ],
  delivered: []
};

function officeActions(status) {
  return OFFICE_ACTIONS[status] || [];
}

function getStatus(key) {
  return ORDER_STATUSES[key] || ORDER_STATUSES.pending;
}

// Orders already in the system. A line carries its own resolved size
// ratio, so a placed order never changes if the presets are edited later.
const ORDERS = [
  {
    no: "SO-2450",
    by: "Rajesh K",
    customerId: "c3",
    date: "2026-08-25",
    status: "dispatched",
    note: "Left godown 26 Aug · LR 4471, Kerala Roadways",
    lines: [
      { code: "GTS-4501", colour: "Black", ratio: PRESETS.standard, boxes: 12 },
      { code: "LDS-2201", colour: "Blue",  ratio: PRESETS.large,    boxes: 6 }
    ]
  },
  {
    no: "SO-2449",
    by: "Rajesh K",
    customerId: "c1",
    date: "2026-08-24",
    status: "production",
    note: "Should be off the line on 29 Aug",
    lines: [
      { code: "GTS-4610", colour: "Brown", ratio: PRESETS.standard, boxes: 10 },
      { code: "GTS-4820", colour: "Black", ratio: PRESETS.small,    boxes: 4 },
      { code: "KID-1310", colour: "Blue",  ratio: PRESETS.standard, boxes: 8 }
    ]
  },
  {
    no: "SO-2448",
    by: "Suresh P",
    customerId: "c5",
    date: "2026-08-22",
    status: "approved",
    note: "Approved by office, waiting for a slot in the factory",
    lines: [
      { code: "LDS-2415", colour: "Black", ratio: PRESETS.large, boxes: 5 }
    ]
  },
  {
    no: "SO-2447",
    by: "Rajesh K",
    customerId: "c2",
    date: "2026-08-20",
    status: "pending",
    note: "Held at office — dealer is over credit limit",
    lines: [
      { code: "GTS-4705", colour: "Black", ratio: PRESETS.standard, boxes: 15 },
      { code: "KID-1102", colour: "Black", ratio: PRESETS.small,    boxes: 6 }
    ]
  },
  {
    no: "SO-2446",
    by: "Suresh P",
    customerId: "c6",
    date: "2026-08-16",
    status: "delivered",
    note: "Received at shop 19 Aug",
    lines: [
      { code: "LDS-2310", colour: "Brown", ratio: PRESETS.standard, boxes: 7 },
      { code: "GTS-4502", colour: "Black", ratio: PRESETS.standard, boxes: 9 }
    ]
  }
];

const CUSTOMER_BY_ID = new Map(CUSTOMERS.map(function (c) { return [c.id, c]; }));

function getCustomer(id) {
  return CUSTOMER_BY_ID.get(id);
}


// ============================================================
// PURCHASE — raw material bought in for the factory
// Office sees this side of the ledger; a salesman never does.
// ============================================================

const SUPPLIERS = [
  { id: "s1", name: "Kerala Polymers",        place: "Kalamassery", supplies: "PVC compound" },
  { id: "s2", name: "Coimbatore Strap Works", place: "Coimbatore",  supplies: "Straps & buckles" },
  { id: "s3", name: "Nilgiri Rubber Mills",   place: "Ooty",        supplies: "Sole rubber sheet" },
  { id: "s4", name: "Ernad Packaging",        place: "Malappuram",  supplies: "Cartons & printing" },
  { id: "s5", name: "Southern Chem Agencies", place: "Kochi",       supplies: "Adhesive & pigment" }
];

const SUPPLIER_BY_ID = new Map(SUPPLIERS.map(function (s) { return [s.id, s]; }));

function getSupplier(id) {
  return SUPPLIER_BY_ID.get(id);
}

const PURCHASE_STATUSES = {
  raised:   { label: "Raised",         tone: "wait" },
  sent:     { label: "Sent to supplier", tone: "info" },
  partial:  { label: "Part received",  tone: "info" },
  received: { label: "Received",       tone: "go" },
  closed:   { label: "Closed",         tone: "done" }
};

function getPurchaseStatus(key) {
  return PURCHASE_STATUSES[key] || PURCHASE_STATUSES.raised;
}

const PURCHASES = [
  { no: "PO-1188", supplierId: "s1", date: "2026-09-12", status: "raised",
    item: "PVC compound \u2014 natural", qty: "8,000 kg", value: 624000,
    note: "For the October gents run" },
  { no: "PO-1187", supplierId: "s3", date: "2026-09-10", status: "sent",
    item: "Sole rubber sheet 4mm", qty: "1,200 sheets", value: 318000,
    note: "Delivery promised 20 Sep" },
  { no: "PO-1186", supplierId: "s2", date: "2026-09-06", status: "partial",
    item: "Ladies band straps", qty: "26,000 pairs", value: 197500,
    note: "14,000 pairs in, balance on 18 Sep" },
  { no: "PO-1185", supplierId: "s4", date: "2026-09-02", status: "received",
    item: "Printed cartons \u2014 all brands", qty: "9,500 nos", value: 142500,
    note: "GRN 4412 \u00B7 checked into godown" },
  { no: "PO-1184", supplierId: "s5", date: "2026-08-28", status: "closed",
    item: "Adhesive & pigment", qty: "640 kg", value: 86400,
    note: "Invoice settled 5 Sep" },
  { no: "PO-1183", supplierId: "s1", date: "2026-08-22", status: "closed",
    item: "PVC compound \u2014 black", qty: "6,500 kg", value: 507000,
    note: "Invoice settled 1 Sep" }
];

// Raw material on hand, against the level the factory wants held.
const MATERIALS = [
  { name: "PVC compound \u2014 natural", unit: "kg",     onHand: 2400, reorder: 4000 },
  { name: "PVC compound \u2014 black",   unit: "kg",     onHand: 5100, reorder: 4000 },
  { name: "Sole rubber sheet 4mm",       unit: "sheets", onHand: 380,  reorder: 600  },
  { name: "Gents thong straps",          unit: "pairs",  onHand: 18500, reorder: 15000 },
  { name: "Ladies band straps",          unit: "pairs",  onHand: 9200, reorder: 12000 },
  { name: "Printed cartons",             unit: "nos",    onHand: 7400, reorder: 5000 },
  { name: "Adhesive",                    unit: "kg",     onHand: 210,  reorder: 300  }
];

// ============================================================
// ADMINISTRATION — the staff directory behind the logins
// "login" marks the two accounts this prototype actually ships a
// screen for; the rest are listed but cannot sign in yet.
// ============================================================

const STAFF = [
  { name: "Anita M",   userId: "anita.m",   role: "office",     branch: "Head office \u00B7 Kochi",   active: true,  login: true },
  { name: "Rajesh K",  userId: "rajesh.k",  role: "salesman",   branch: "Kozhikode",                  active: true,  login: true },
  { name: "Suresh P",  userId: "suresh.p",  role: "salesman",   branch: "Kollam",                     active: true,  login: false },
  { name: "Devika R",  userId: "devika.r",  role: "accounts",   branch: "Head office \u00B7 Kochi",   active: true,  login: false },
  { name: "Jomon T",   userId: "jomon.t",   role: "production", branch: "Factory \u00B7 Aluva",       active: true,  login: false },
  { name: "Basheer A", userId: "basheer.a", role: "godown",     branch: "Godown \u00B7 Aluva",        active: true,  login: false },
  { name: "Leena S",   userId: "leena.s",   role: "hr",         branch: "Head office \u00B7 Kochi",   active: false, login: false },
  { name: "N. Menon",  userId: "n.menon",   role: "admin",      branch: "Head office \u00B7 Kochi",   active: true,  login: false }
];
