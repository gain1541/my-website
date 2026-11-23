// 단가 기록 CSV를 data/products.json에 반영합니다.
// 사용법: node scripts/import_csv.js prices.csv
// CSV 형식(헤더 포함): date,productId,unitPrice[,seller]
//   예) 2026-11-30,p001,297.7,11번가
// unitPrice: 배송비를 포함한 "시장 최저가"를 단가로 환산한 값 (기저귀·물티슈 1매당, 분유 100g당 등)
// seller: 그 최저가를 낸 판매처(선택). 같은 날짜·제품을 다시 넣으면 덮어씁니다.
const fs = require('fs');
const path = require('path');

const csvPath = process.argv[2];
if (!csvPath) { console.error('사용법: node scripts/import_csv.js prices.csv'); process.exit(1); }
const file = path.join(__dirname, '..', 'data', 'products.json');
const db = JSON.parse(fs.readFileSync(file, 'utf8'));

const rows = fs.readFileSync(csvPath, 'utf8').split(/\r?\n/).filter(Boolean).slice(1)
  .map((l) => l.split(',').map((s) => s.trim()));

let applied = 0, skipped = 0;
for (const [date, pid, uStr, seller] of rows) {
  const u = parseFloat(uStr);
  const p = db.products.find((x) => x.id === pid);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !p || !Number.isFinite(u) || u <= 0) { skipped++; continue; }
  p.history = p.history || [];
  const rec = { d: date, u: Math.round(u * 10) / 10 };
  if (seller) rec.s = seller;
  const i = p.history.findIndex((x) => x.d === date);
  if (i >= 0) p.history[i] = rec; else p.history.push(rec);
  p.history.sort((a, b) => a.d.localeCompare(b.d));
  applied++;
}
db.generatedAt = new Date().toISOString().slice(0, 10);
fs.writeFileSync(file, JSON.stringify(db));
console.log(`적용 ${applied}건, 건너뜀 ${skipped}건`);
