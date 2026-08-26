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

const ARTICLES = [
  { code: "GTS-4501", name: "Gents Slipper 4501", colours: ["Black", "Brown", "Blue"] },
  { code: "GTS-4502", name: "Gents Slipper 4502", colours: ["Black", "Brown"] },
  { code: "LDS-2201", name: "Ladies Slipper 2201", colours: ["Black", "Brown", "Blue"] },
  { code: "LDS-2208", name: "Ladies Slipper 2208", colours: ["Brown", "Blue"] },
  { code: "KID-1102", name: "Kids Slipper 1102", colours: ["Black", "Blue"] },
  { code: "GTS-4610", name: "Gents Slipper 4610", colours: ["Black", "Brown", "Blue"] }
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
  "LDS-2201|Black": [90, 110, 100, 70, 50],
  "LDS-2201|Brown": [45, 30, 25, 18, 10],
  "LDS-2201|Blue": [70, 65, 60, 40, 35],
  "LDS-2208|Brown": [55, 48, 42, 30, 20],
  "LDS-2208|Blue": [15, 10, 22, 18, 12],
  "KID-1102|Black": [130, 120, 100, 80, 60],
  "KID-1102|Blue": [35, 28, 30, 20, 15],
  "GTS-4610|Black": [150, 140, 120, 100, 85],
  "GTS-4610|Brown": [40, 35, 30, 25, 18],
  "GTS-4610|Blue": [25, 20, 15, 10, 5]
};

function getStock(articleCode, colour) {
  return STOCK[articleCode + "|" + colour] || [0, 0, 0, 0, 0];
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
