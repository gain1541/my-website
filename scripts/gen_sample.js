// 샘플 데이터 생성기: node scripts/gen_sample.js
// 실제 가격이 아닌 "가상의 샘플"입니다. 실제 데이터로 교체하면 됩니다.
const fs = require('fs');
const path = require('path');

let seed = 20261122;
const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;

const END = new Date('2026-11-22T00:00:00Z');
const N = 52; // 52주
const dates = [];
for (let i = 0; i < N; i++) {
  const d = new Date(END.getTime() - (N - 1 - i) * 7 * 86400000);
  dates.push(d.toISOString().slice(0, 10));
}

const shops = [
  { id: '쿠팡', mul: 1.0, url: 'https://www.coupang.com/np/search?q=' },
  { id: '네이버쇼핑', mul: 1.02, url: 'https://search.shopping.naver.com/search/all?query=' },
  { id: '11번가', mul: 1.04, url: 'https://search.11st.co.kr/Search.tmall?kwd=' },
  { id: 'G마켓', mul: 1.03, url: 'https://browse.gmarket.co.kr/search?keyword=' },
];

const brands = {
  하기스: { cats: ['diaper', 'wipes'], tagline: '국내 대표 기저귀 브랜드', pros: ['라인업이 다양해 단계·타입 선택 폭이 넓음', '대형마트·온라인 어디서나 구하기 쉬움', '프로모션이 잦아 가격 변동이 큰 편'] },
  팸퍼스: { cats: ['diaper'], tagline: '글로벌 브랜드, 흡수력 강조', pros: ['흡수력·보송함을 강점으로 내세움', '신생아용 라인이 세분화되어 있음', '프리미엄 가격대'] },
  보솜이: { cats: ['diaper'], tagline: '국내 중저가 가성비 브랜드', pros: ['상대적으로 낮은 단가', '순한 소재를 강조하는 라인 보유', '대용량 구성이 많음'] },
  군: { cats: ['diaper'], tagline: '통기성·피부 편의를 강조하는 브랜드', pros: ['얇고 통기성 있는 설계를 강조', '피부가 예민한 아기 후기가 많음'] },
  마미포코: { cats: ['diaper'], tagline: '가성비 팬티 기저귀', pros: ['팬티형 위주의 합리적 가격', '활동량 많은 월령에 인기'] },
  남양: { cats: ['formula'], tagline: '임페리알XO 등 국내 대표 분유', pros: ['전 단계 라인업 보유', '국내 모유 성분 연구 기반을 강조'] },
  매일: { cats: ['formula'], tagline: '앱솔루트 등 대표 분유', pros: ['단계별 라인업이 촘촘함', '대형 유통 채널에서 구하기 쉬움'] },
  일동: { cats: ['formula'], tagline: '아이엠마더 등 프리미엄 분유', pros: ['성분 설계를 강조하는 라인', '프로모션·샘플 이벤트가 잦은 편'] },
  파스퇴르: { cats: ['formula'], tagline: '유기농·청정 원유 강조', pros: ['원유 품질을 강조', '프리미엄 이미지'] },
  몽드드: { cats: ['wipes'], tagline: '프리미엄 물티슈', pros: ['원단 품질과 순한 성분 강조', '캡형/리필 구성 다양'] },
  베베숲: { cats: ['wipes'], tagline: '순한 성분의 아기 물티슈', pros: ['무향·저자극을 강조', '대량 박스 구성으로 장당 단가가 낮음'] },
  더블하트: { cats: ['etc'], tagline: '젖병·수유용품 전문', pros: ['모유실감 젖꼭지 라인 보유', '교체용 부품 구하기 쉬움'] },
  유팡: { cats: ['etc'], tagline: '젖병·세정제·케어 용품', pros: ['세정제·젖병 라인 다양', '대용량 리필 구성'] },
  피죤: { cats: ['etc'], tagline: '세제·섬유 케어 브랜드', pros: ['아기 세탁용 라인 보유', '대용량 가성비'] },
};

const products = [];
let pid = 1;
const add = (p) => products.push({ id: 'p' + String(pid++).padStart(3, '0'), ...p });

// 기저귀
const diaperStages = [
  { stage: '신생아', qtyBand: 84, f: 0.9 },
  { stage: '1단계', qtyBand: 78, f: 0.95 },
  { stage: '2단계', qtyBand: 72, f: 1.0 },
  { stage: '3단계', qtyBand: 64, f: 1.05 },
  { stage: '4단계', qtyBand: 58, f: 1.1 },
];
const diaperLines = [
  { brand: '하기스', line: '네이처메이드', base: 31000 },
  { brand: '팸퍼스', line: '아이졸라', base: 34000 },
  { brand: '보솜이', line: '리얼코튼', base: 24000 },
  { brand: '군', line: '에어핏', base: 33000 },
];
for (const l of diaperLines) {
  for (const s of diaperStages) {
    add({ cat: 'diaper', brand: l.brand, name: `${l.brand} ${l.line} 밴드형 ${s.stage}`, type: '밴드형', stage: s.stage, qty: s.qtyBand, unit: '매', basis: 1, base: Math.round(l.base * s.f * (s.qtyBand / 70)) });
  }
}
const pantsStages = [
  { stage: '3단계', qty: 60, f: 1.0 },
  { stage: '4단계', qty: 54, f: 1.05 },
  { stage: '5단계', qty: 48, f: 1.1 },
];
for (const l of [{ brand: '하기스', line: '맥스드라이', base: 29000 }, { brand: '마미포코', line: '에어핏', base: 22000 }, { brand: '팸퍼스', line: '베이비드라이', base: 32000 }]) {
  for (const s of pantsStages) {
    add({ cat: 'diaper', brand: l.brand, name: `${l.brand} ${l.line} 팬티형 ${s.stage}`, type: '팬티형', stage: s.stage, qty: s.qty, unit: '매', basis: 1, base: Math.round(l.base * s.f * (s.qty / 60)) });
  }
}

// 분유
const formulaLines = [
  { brand: '남양', line: '임페리알XO', base: 21000 },
  { brand: '매일', line: '앱솔루트', base: 20000 },
  { brand: '일동', line: '아이엠마더', base: 22500 },
  { brand: '파스퇴르', line: '위드맘', base: 23500 },
];
const fStages = [
  { stage: '1단계', f: 1.0 },
  { stage: '2단계', f: 0.98 },
  { stage: '3단계', f: 0.95 },
];
for (const l of formulaLines) {
  for (const s of fStages) {
    add({ cat: 'formula', brand: l.brand, name: `${l.brand} ${l.line} ${s.stage} 800g`, type: l.line, stage: s.stage, qty: 800, unit: 'g', basis: 100, base: Math.round(l.base * s.f * 3) });
  }
}

// 물티슈
for (const l of [
  { brand: '몽드드', line: '프리미엄 캡형', type: '캡형', qty: 70, packs: 10, base: 1800 },
  { brand: '몽드드', line: '프리미엄 리필형', type: '리필형', qty: 80, packs: 10, base: 1500 },
  { brand: '베베숲', line: '무향 캡형', type: '캡형', qty: 80, packs: 10, base: 1400 },
  { brand: '베베숲', line: '무향 리필형', type: '리필형', qty: 100, packs: 10, base: 1250 },
  { brand: '하기스', line: '네이처메이드 캡형', type: '캡형', qty: 72, packs: 10, base: 1900 },
]) {
  add({ cat: 'wipes', brand: l.brand, name: `${l.brand} ${l.line} ${l.qty}매 x ${l.packs}팩`, type: l.type, stage: '전연령', qty: l.qty * l.packs, unit: '매', basis: 1, base: l.base * l.packs });
}

// 기타 육아용품
for (const l of [
  { brand: '더블하트', name: '더블하트 모유실감 젖병 240ml 2P', type: '젖병', base: 21000, qty: 2, unit: '개' },
  { brand: '더블하트', name: '더블하트 모유실감 젖꼭지 4P', type: '젖꼭지', base: 12500, qty: 4, unit: '개' },
  { brand: '유팡', name: '유팡 젖병세정제 리필 1,000ml', type: '세정제', base: 11800, qty: 1000, unit: 'ml', basis: 100 },
  { brand: '피죤', name: '피죤 아기 전용 세제 2.5L', type: '세탁세제', base: 14900, qty: 2500, unit: 'ml', basis: 100 },
]) {
  add({ cat: 'etc', brand: l.brand, name: l.name, type: l.type, stage: '전연령', qty: l.qty, unit: l.unit, basis: l.basis || 1, base: l.base });
}

// 가격 시계열 생성
for (const p of products) {
  const phase = rnd() * 6;
  const mood = (rnd() - 0.45) * 0.3; // 최근 가격 쏠림: -13.5% ~ +16.5%
  const missing = rnd() < 0.3 ? Math.floor(rnd() * shops.length) : -1;
  const prices = {};
  const common = [];
  let walk = 0;
  for (let i = 0; i < N; i++) {
    walk += (rnd() - 0.5) * 0.012;
    walk = Math.max(-0.08, Math.min(0.08, walk));
    let v = 1 + 0.035 * Math.sin(i / 7 + phase) + walk;
    if (rnd() < 0.09) v *= 0.88; // 세일
    if (i >= N - 6) v *= 1 + mood * ((i - (N - 7)) / 6);
    common.push(v);
  }
  shops.forEach((s, si) => {
    if (si === missing) return;
    const bias = 1 + (rnd() - 0.5) * 0.04;
    prices[s.id] = common.map((v, i) => {
      const jitter = 1 + (rnd() - 0.5) * 0.03;
      return Math.round((p.base * s.mul * bias * v * jitter) / 10) * 10;
    });
  });
  p.prices = prices;
  delete p.base;
}

const out = {
  sample: true,
  generatedAt: END.toISOString().slice(0, 10),
  dates,
  shops: shops.map(({ id, url }) => ({ id, url })),
  brands,
  products,
};
const file = path.join(__dirname, '..', 'data', 'products.json');
fs.writeFileSync(file, JSON.stringify(out));
console.log('products:', products.length, 'bytes:', fs.statSync(file).size);
