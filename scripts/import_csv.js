// 실제 가격 CSV를 data/products.json에 반영합니다.
// 사용법: node scripts/import_csv.js prices.csv
// CSV 형식(헤더 포함): date,productId,shop,price
//   예) 2026-11-29,p001,쿠팡,24900
// 날짜는 과거→최신 순서로 넣어주세요. 새 날짜는 자동으로 추가됩니다.
const fs = require('fs');
const path = require('path');

const csvPath = process.argv[2];
if (!csvPath) { console.error('사용법: node scripts/import_csv.js prices.csv'); process.exit(1); }
const file = path.join(__dirname, '..', 'data', 'products.json');
const db = JSON.parse(fs.readFileSync(file, 'utf8'));

const rows = fs.readFileSync(csvPath, 'utf8').split(/\r?\n/).filter(Boolean).slice(1)
  .map((l) => l.split(',').map((s) => s.trim()))
  .sort((a, b) => a[0].localeCompare(b[0]));

let applied = 0, skipped = 0;
for (const [date, pid, shop, priceStr] of rows) {
  const price = parseInt(priceStr, 10);
  const p = db.products.find((x) => x.id === pid);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !p || !Number.isFinite(price) || price <= 0) { skipped++; continue; }
  let idx = db.dates.indexOf(date);
  if (idx === -1) {
    if (date < db.dates[db.dates.length - 1]) { skipped++; continue; } // 과거 날짜 삽입은 미지원
    db.dates.push(date);
    db.products.forEach((q) => Object.values(q.prices).forEach((arr) => arr.push(null)));
    idx = db.dates.length - 1;
  }
  if (!p.prices[shop]) p.prices[shop] = db.dates.map(() => null);
  p.prices[shop][idx] = price;
  applied++;
}
db.sample = false; // 실제 데이터가 들어가면 샘플 안내 문구를 끕니다
db.generatedAt = db.dates[db.dates.length - 1];
fs.writeFileSync(file, JSON.stringify(db));
console.log(`적용 ${applied}건, 건너뜀 ${skipped}건`);
