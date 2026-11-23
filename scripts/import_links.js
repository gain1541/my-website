// 제품별 쇼핑몰 링크를 data/products.json에 반영합니다.
// 사용법: node scripts/import_links.js links.csv
// CSV 형식(헤더 포함): productId,naver,coupang
//   naver  : https://search.shopping.naver.com/catalog/숫자  (뒤의 추적 파라미터는 자동 제거)
//   coupang: 쿠팡 파트너스 단축 링크 (https://link.coupang.com/... 또는 https://coupa.ng/...)
// 빈 칸은 기존 값을 유지합니다. 규칙에 맞지 않는 값은 건너뛰고 이유를 출력합니다.
const fs = require('fs');
const path = require('path');

const csvPath = process.argv[2];
if (!csvPath) { console.error('사용법: node scripts/import_links.js links.csv'); process.exit(1); }
const file = path.join(__dirname, '..', 'data', 'products.json');
const db = JSON.parse(fs.readFileSync(file, 'utf8'));

const cleanNaver = (u) => {
  const m = /^https:\/\/search\.shopping\.naver\.com\/catalog\/(\d+)/.exec(u);
  return m ? `https://search.shopping.naver.com/catalog/${m[1]}` : null;
};
const cleanCoupang = (u) => (/^https:\/\/(link\.coupang\.com|coupa\.ng)\/[A-Za-z0-9/_-]+/.test(u) ? u.split(/\s/)[0] : null);

const rows = fs.readFileSync(csvPath, 'utf8').split(/\r?\n/).filter(Boolean).slice(1).map((l) => l.split(',').map((s) => s.trim()));
let ok = 0;
for (const [pid, naver, coupang] of rows) {
  const p = db.products.find((x) => x.id === pid);
  if (!p) { console.log(`건너뜀: 제품 없음 (${pid})`); continue; }
  p.links = p.links || {};
  if (naver) {
    const v = cleanNaver(naver);
    if (v) { p.links.naver = v; ok++; } else console.log(`건너뜀: ${pid} 네이버 링크 형식이 아님`);
  }
  if (coupang) {
    const v = cleanCoupang(coupang);
    if (v) { p.links.coupang = v; ok++; } else console.log(`건너뜀: ${pid} 쿠팡 링크는 파트너스 단축 링크여야 해요`);
  }
}
fs.writeFileSync(file, JSON.stringify(db));
console.log(`반영 ${ok}건`);
