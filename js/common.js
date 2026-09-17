// ============================================================
// SAMPLE FOOTWEAR ERP — shared helpers
// Loaded by every screen (salesman and office) so the two never
// drift apart on formatting, order maths or the product drawing.
// ============================================================

// ---------- formatting ----------

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

const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun",
                    "Jul","Aug","Sep","Oct","Nov","Dec"];

function formatDate(iso) {
  const p = String(iso).split("-");
  return parseInt(p[2], 10) + " " + MONTH_ABBR[parseInt(p[1], 10) - 1] + " " + p[0];
}

function isoToday() {
  const d = new Date();
  return d.getFullYear() + "-" +
    String(d.getMonth() + 1).padStart(2, "0") + "-" +
    String(d.getDate()).padStart(2, "0");
}

// ---------- DOM ----------

// ids are stable for the life of the page; only container contents change
const elCache = Object.create(null);

function el(id) {
  let node = elCache[id];
  if (!node || !node.isConnected) {
    node = document.getElementById(id);
    elCache[id] = node;
  }
  return node;
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

// CSS animations only fire once, so reset them to replay an entrance
// every time it is shown — not just the first.
function restartAnimations(root) {
  const nodes = [root].concat(Array.prototype.slice.call(root.querySelectorAll("*")));
  nodes.forEach(function (n) { n.style.animation = "none"; });
  void root.offsetWidth;
  nodes.forEach(function (n) { n.style.animation = ""; });
}

// ---------- order maths ----------
// A placed order line carries its own resolved size ratio, so these
// read the line rather than looking a preset up again.

function lineRatioTotal(line) {
  return line.ratio.reduce(function (a, b) { return a + b; }, 0);
}

function linePairs(line) {
  return line.boxes * lineRatioTotal(line);
}

function lineValue(line) {
  const art = getArticle(line.code);
  return art ? linePairs(line) * art.rate : 0;
}

function orderTotals(order) {
  return order.lines.reduce(function (t, l) {
    t.boxes += l.boxes;
    t.pairs += linePairs(l);
    t.value += lineValue(l);
    return t;
  }, { boxes: 0, pairs: 0, value: 0 });
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

// the same article/colour is drawn many times across the strips and grid,
// so build each combination once
const svgCache = new Map();

function chappalSVG(articleCode, colourName) {
  const key = articleCode + "|" + colourName;
  let cached = svgCache.get(key);
  if (cached === undefined) {
    cached = buildChappal(articleCode, colourName);
    svgCache.set(key, cached);
  }
  return cached;
}

function buildChappal(articleCode, colourName) {
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
// WHAT A PRODUCT LOOKS LIKE
//
// A product the office added may carry a photograph; everything
// else falls back to the drawing above. Both come out wearing the
// same .chappal class, so every place that shows a product — shop
// card, picker row, order line, review table — sizes them
// identically and none of those need to know which they got.
// ============================================================

function productImage(articleCode, colourName) {
  const a = getArticle(articleCode);
  if (!a || !a.image) return chappalSVG(articleCode, colourName);

  return '<img class="chappal chappal-photo" src="' + esc(a.image) +
    '" alt="' + esc(a.name || articleCode) + '" loading="lazy">';
}

// ============================================================
// ORDER LINE MARKUP
// The expanded rows inside an order card. Shared so a salesman and
// the office are always looking at an identically drawn order.
// ============================================================

function orderLinesMarkup(order) {
  return order.lines.map(function (l) {
    const art = getArticle(l.code);
    const col = COLOUR_HEX[l.colour] || COLOUR_HEX.Black;
    return '<div class="ordline">' +
      '<span class="ordline-img">' + productImage(l.code, l.colour) + "</span>" +
      '<span class="ordline-main">' +
        '<span class="ordline-code">' + l.code + "</span>" +
        '<span class="ordline-name">' + esc(art ? art.name : "") + "</span>" +
      "</span>" +
      '<span class="ordline-meta num">' +
        '<span class="rev-dot" style="background:' + col.body + '"></span>' +
        l.colour + " · " + l.ratio.join("-") + " · " + l.boxes +
        (l.boxes === 1 ? " box" : " boxes") + " · " +
        groupIndian(linePairs(l)) + " pairs</span>" +
      '<span class="ordline-value num">' + rupees(lineValue(l)) + "</span>" +
    "</div>";
  }).join("");
}
