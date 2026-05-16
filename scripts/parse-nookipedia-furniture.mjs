// Parses the Nookipedia "List of all furniture in New Horizons" HTML page
// (https://nookipedia.com/wiki/Furniture/New_Horizons/All_furniture) into a
// compact JSON list that the app can consume.
//
// Usage:
//   node scripts/parse-nookipedia-furniture.mjs \
//        --in nookipedia_all_furniture.html \
//        --out src/data/nh-furniture.json
//
// The page renders a single <table> whose rows have 10 cells:
//   0: # (index)
//   1: Item name (link)
//   2: Image
//   3: Buy price (data-sort-value)
//   4: Sell price (data-sort-value)
//   5: Available from
//   6: HHA theme(s)
//   7: Interact (Yes/No/-)
//   8: Customizable (Yes/No)
//   9: Size (alt="W.W×H.H" on the img)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function arg(name, fallback) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return fallback;
  return process.argv[idx + 1];
}

const inputPath = path.resolve(ROOT, arg('in', 'nookipedia_all_furniture.html'));
const outputPath = path.resolve(ROOT, arg('out', 'src/data/nh-furniture.json'));

const rawHtml = fs.readFileSync(inputPath, 'utf8');

// The furniture list lives in the FIRST <table class="sortable"> in the page;
// later tables are unrelated nav blocks that also contain <tr> rows. Restrict
// parsing to the body of that first table so we don't pick up stray rows.
function extractFurnitureTable(src) {
  const start = src.indexOf('<table class="sortable"');
  if (start === -1) return src;
  // Walk forward looking for matching </table> while ignoring the index of
  // any nested tables (there shouldn't be any here, but be defensive).
  let depth = 0;
  const re = /<table\b|<\/table>/g;
  re.lastIndex = start;
  let m;
  while ((m = re.exec(src)) !== null) {
    if (m[0] === '</table>') {
      depth--;
      if (depth === 0) return src.slice(start, m.index + '</table>'.length);
    } else {
      depth++;
    }
  }
  return src.slice(start);
}

const html = extractFurnitureTable(rawHtml);

function decodeEntities(s) {
  return s
    .replace(/&#160;/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function stripTags(s) {
  return decodeEntities(s.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
}

function attr(snippet, name) {
  const re = new RegExp(`${name}="([^"]*)"`);
  const m = snippet.match(re);
  return m ? m[1] : '';
}

// Grab a row at a time. Each row in source has many newlines; rows always end
// with </tr>. We use a non-greedy match across lines.
const rowRe = /<tr>([\s\S]*?)<\/tr>/g;
const items = [];
let m;
let skipped = 0;
while ((m = rowRe.exec(html)) !== null) {
  const inner = m[1];
  const cells = [];
  const cellRe = /<td([^>]*)>([\s\S]*?)<\/td>/g;
  let c;
  while ((c = cellRe.exec(inner)) !== null) {
    cells.push({ attrs: c[1], html: c[2] });
  }
  if (cells.length !== 10) {
    skipped++;
    continue;
  }

  const numberCell = cells[0];
  const nameCell = cells[1];
  const imageCell = cells[2];
  const buyCell = cells[3];
  const sellCell = cells[4];
  const availCell = cells[5];
  const hhaCell = cells[6];
  const interactCell = cells[7];
  const customCell = cells[8];
  const sizeCell = cells[9];

  // Index column may be rendered with commas (e.g. "1,000"); prefer the raw
  // data-sort-value attribute which is always numeric.
  const sortVal = attr(numberCell.attrs, 'data-sort-value');
  const num = sortVal
    ? parseInt(sortVal, 10)
    : parseInt(stripTags(numberCell.html).replace(/,/g, ''), 10);
  if (!Number.isFinite(num)) {
    skipped++;
    continue;
  }

  const name = stripTags(nameCell.html);
  const itemLinkMatch = nameCell.html.match(/href="\/wiki\/(Item:[^"]+)"/);
  const wikiSlug = itemLinkMatch ? itemLinkMatch[1] : '';

  const imageMatch = imageCell.html.match(/<img[^>]+src="([^"]+)"[^>]*>/);
  let imageUrl = imageMatch ? imageMatch[1] : '';
  // Prefer the 2x (full-resolution) URL from srcset if available
  const srcsetMatch = imageCell.html.match(/srcset="([^"]+)"/);
  if (srcsetMatch) {
    const two = srcsetMatch[1]
      .split(',')
      .map((s) => s.trim())
      .find((s) => s.endsWith(' 2x'));
    if (two) imageUrl = two.replace(/ 2x$/, '').trim();
  }

  function parsePrice(cell) {
    const sortAttr = attr(cell.attrs, 'data-sort-value');
    if (sortAttr) {
      const n = parseInt(sortAttr, 10);
      if (Number.isFinite(n)) return n;
    }
    const text = stripTags(cell.html);
    if (/NFS|—|-/.test(text) && !/\d/.test(text)) return null;
    const m2 = text.match(/([\d,]+)/);
    return m2 ? parseInt(m2[1].replace(/,/g, ''), 10) : null;
  }

  const buy = parsePrice(buyCell);
  const sell = parsePrice(sellCell);

  // Available from: collect link texts inside the cell
  const availLinks = [];
  const aRe = /<a[^>]*>([^<]+)<\/a>/g;
  let a;
  while ((a = aRe.exec(availCell.html)) !== null) {
    const t = decodeEntities(a[1]).trim();
    if (t && !availLinks.includes(t)) availLinks.push(t);
  }
  const availableFrom = availLinks.length
    ? availLinks.join(' / ')
    : stripTags(availCell.html);

  const hhaThemes = stripTags(hhaCell.html)
    .split('/')
    .map((s) => s.trim())
    .filter((s) => s && s !== '-');

  const interact = stripTags(interactCell.html);
  const customizable = /yes/i.test(stripTags(customCell.html));

  // Size: read from img alt (e.g. "1.0×1.0", "3.0×1.0")
  let sizeW = 1;
  let sizeH = 1;
  const sizeAlt = attr(sizeCell.html, 'alt');
  if (sizeAlt) {
    const sm = sizeAlt.match(/([\d.]+)\s*[×x]\s*([\d.]+)/);
    if (sm) {
      sizeW = parseFloat(sm[1]);
      sizeH = parseFloat(sm[2]);
    }
  }

  items.push({
    id: num,
    name,
    wikiSlug,
    image: imageUrl,
    buy: buy === 0 ? null : buy,
    sell,
    availableFrom,
    hhaThemes,
    interact: interact === '-' ? null : interact,
    customizable,
    size: { w: sizeW, h: sizeH },
  });
}

// Sort by id for stability
items.sort((a, b) => a.id - b.id);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(items, null, 0));

// Also emit a tiny stats summary to stdout
const totalSize = fs.statSync(outputPath).size;
const sizeBuckets = items.reduce((acc, it) => {
  const k = `${it.size.w}x${it.size.h}`;
  acc[k] = (acc[k] || 0) + 1;
  return acc;
}, {});

console.log(`Parsed: ${items.length} items, skipped rows: ${skipped}`);
console.log(`Output: ${path.relative(ROOT, outputPath)} (${(totalSize / 1024).toFixed(1)} KB)`);
console.log('Top sizes:', Object.entries(sizeBuckets).sort((a, b) => b[1] - a[1]).slice(0, 10));
console.log('First 3 items:', items.slice(0, 3).map((i) => i.name));
console.log('Last 3 items:', items.slice(-3).map((i) => i.name));
