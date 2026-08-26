// ============================================================
// SAMPLE FOOTWEAR ERP — DUMMY DATA
// All hardcoded for demo purposes. Edit this file to change
// any figures shown across the prototype.
// ============================================================

const SIZES = ["6-7", "7-8", "8-9", "9-10", "10-11"];

const PRESETS = {
  standard: [4, 5, 6, 5, 4],
  large: [2, 4, 6, 7, 5],
  small: [6, 7, 5, 4, 2]
};

// House brands under the Sample Footwear group.
// These are invented names — deliberately not real-world footwear brands.
const BRANDS = [
  { key: "classic", name: "SF Classic", tagline: "Everyday gents" },
  { key: "stride",  name: "Stride Pro", tagline: "Premium comfort" },
  { key: "terra",   name: "Terra",      tagline: "Value range" },
  { key: "breeze",  name: "Breeze",     tagline: "Ladies daily" },
  { key: "bloom",   name: "Bloom",      tagline: "Ladies premium" },
  { key: "junior",  name: "Junior Step", tagline: "Kids" }
];

function getBrand(key) {
  return BRANDS.find(function (b) { return b.key === key; });
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

function getStock(articleCode, colour) {
  return STOCK[articleCode + "|" + colour] || [0, 0, 0, 0, 0];
}

// total pairs in the godown across every colour and size of an article
function articleStock(code) {
  return Object.keys(STOCK).reduce(function (sum, k) {
    if (k.split("|")[0] !== code) return sum;
    return sum + STOCK[k].reduce(function (a, b) { return a + b; }, 0);
  }, 0);
}

function getArticle(code) {
  return ARTICLES.find(function (a) { return a.code === code; });
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
