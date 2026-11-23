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
];

const brands = {
  하기스: { tier: '중', cats: ['diaper', 'etc'], tagline: '국내 대표 기저귀 브랜드', pros: ['라인업이 다양해 단계·타입 선택 폭이 넓음', '대형마트·온라인 어디서나 구하기 쉬움', '프로모션이 잦아 가격 변동이 큰 편'] },
  팸퍼스: { tier: '상', cats: ['diaper'], tagline: '글로벌 브랜드, 흡수력 강조', pros: ['흡수력·보송함을 강점으로 내세움', '신생아용 라인이 세분화되어 있음', '프리미엄 가격대'] },
  보솜이: { tier: '가성비', cats: ['diaper'], tagline: '국내 중저가 가성비 브랜드', pros: ['상대적으로 낮은 단가', '순한 소재를 강조하는 라인 보유', '대용량 구성이 많음'] },
  군: { tier: '상', cats: ['diaper'], tagline: '통기성·피부 편의를 강조하는 브랜드', pros: ['얇고 통기성 있는 설계를 강조', '피부가 예민한 아기 후기가 많음'] },
  마미포코: { tier: '가성비', cats: ['diaper'], tagline: '가성비 팬티 기저귀', pros: ['팬티형 위주의 합리적 가격', '활동량 많은 월령에 인기'] },
  남양: { tier: '중', cats: ['formula'], tagline: '임페리알XO 등 국내 대표 분유', pros: ['전 단계 라인업 보유', '국내 모유 성분 연구 기반을 강조'] },
  매일: { tier: '중', cats: ['formula'], tagline: '앱솔루트 등 대표 분유', pros: ['단계별 라인업이 촘촘함', '대형 유통 채널에서 구하기 쉬움'] },
  일동: { tier: '상', cats: ['formula'], tagline: '아이엠마더 등 프리미엄 분유', pros: ['성분 설계를 강조하는 라인', '프로모션·샘플 이벤트가 잦은 편'] },
  파스퇴르: { tier: '상', cats: ['formula'], tagline: '유기농·청정 원유 강조', pros: ['원유 품질을 강조', '프리미엄 이미지'] },
  누크: { tier: '상', cats: ['pacifier'], tagline: '교정 형태 쪽쪽이로 알려진 독일 브랜드', pros: ['구강 구조를 고려한 형태를 강조', '월령별 사이즈가 구분됨'] },
  아벤트: { tier: '중', cats: ['pacifier', 'bottle'], tagline: '쪽쪽이·젖병을 함께 파는 글로벌 브랜드', pros: ['쪽쪽이·젖병 호환 라인이 다양', '오프라인·온라인 구하기 쉬움'] },
  닥터브라운: { tier: '상', cats: ['pacifier', 'bottle'], tagline: '배앓이 방지 설계를 내세운 젖병 브랜드', pros: ['통기 시스템을 강조한 젖병', '쪽쪽이·젖병 라인 모두 보유', '부품이 많아 세척이 번거로울 수 있음'] },
  더블하트: { tier: '중', cats: ['bottle', 'pacifier'], tagline: '젖병·수유용품 전문 국내 브랜드', pros: ['모유실감 젖꼭지 라인 보유', '교체용 부품 구하기 쉬움', '국내 브랜드 중 가격대가 합리적'] },
  컴포타: { tier: '가성비', cats: ['bottle'], tagline: '가성비 젖병 브랜드', pros: ['합리적인 가격의 PP/PPSU 젖병', '입문용으로 쓰기 좋음'] },
  몽드드: { tier: '상', cats: ['etc'], tagline: '프리미엄 물티슈', pros: ['원단 품질과 순한 성분 강조', '캡형/리필 구성 다양'] },
  베베숲: { tier: '중', cats: ['etc'], tagline: '순한 성분의 아기 물티슈', pros: ['무향·저자극을 강조', '대량 박스 구성으로 장당 단가가 낮음'] },
  아토팜: { tier: '상', cats: ['etc'], tagline: '피부 보습 전문 베이비 스킨케어', pros: ['보습 크림·로션 라인이 다양', '민감 피부용으로 인지도가 높음'] },
  존슨즈베이비: { tier: '중', cats: ['etc'], tagline: '글로벌 베이비 케어 브랜드', pros: ['로션·샴푸 등 라인이 폭넓음', '대형마트에서 구하기 쉬움'] },
  세타필: { tier: '중', cats: ['etc'], tagline: '민감 피부용 보습 스킨케어', pros: ['저자극 보습을 강조', '대용량 구성이 있어 단가가 유리'] },
  피죤: { tier: '가성비', cats: ['etc'], tagline: '세제·섬유 케어 브랜드', pros: ['아기 세탁용 라인 보유', '대용량 가성비'] },
  마더케이: { tier: '중', cats: ['etc'], tagline: '젖병·아기 세정용품 브랜드', pros: ['젖병·장난감 세정제 라인', '리필 구성이 있어 단가가 낮음'] },
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

// 쪽쪽이
for (const l of [
  { brand: '누크', line: '제니우스 실리콘', base: 9500 },
  { brand: '아벤트', line: '울트라 소프트', base: 11500 },
  { brand: '닥터브라운', line: '해피 패시', base: 10500 },
  { brand: '더블하트', line: '모유실감 쪽쪽이', base: 8500 },
]) {
  for (const st of [{ stage: '신생아(0~5개월)', f: 1 }, { stage: '6개월+', f: 1.02 }]) {
    add({ cat: 'pacifier', brand: l.brand, name: `${l.brand} ${l.line} ${st.stage} 2P`, type: l.line.includes('실리콘') || l.line.includes('소프트') ? '실리콘' : '교정형', stage: st.stage, qty: 2, unit: '개', basis: 1, base: Math.round(l.base * st.f) });
  }
}

// 분유병(젖병)
for (const l of [
  { brand: '더블하트', name: '더블하트 모유실감 PPSU 젖병 240ml', type: 'PPSU', base: 21000, qty: 1 },
  { brand: '더블하트', name: '더블하트 모유실감 PPSU 젖병 160ml 2P', type: 'PPSU', base: 25000, qty: 2 },
  { brand: '더블하트', name: '더블하트 모유실감 젖꼭지 4P', type: '젖꼭지', base: 12500, qty: 4 },
  { brand: '닥터브라운', name: '닥터브라운 옵션스+ 젖병 270ml', type: 'PP', base: 19000, qty: 1 },
  { brand: '닥터브라운', name: '닥터브라운 내추럴 플로우 젖꼭지 2P', type: '젖꼭지', base: 11000, qty: 2 },
  { brand: '아벤트', name: '아벤트 내추럴 젖병 260ml 2P', type: 'PP', base: 22000, qty: 2 },
  { brand: '아벤트', name: '아벤트 내추럴 젖꼭지 2P', type: '젖꼭지', base: 9500, qty: 2 },
  { brand: '컴포타', name: '컴포타 PPSU 젖병 240ml 2P', type: 'PPSU', base: 18000, qty: 2 },
  { brand: '컴포타', name: '컴포타 유리 젖병 240ml', type: '유리', base: 11000, qty: 1 },
]) {
  add({ cat: 'bottle', brand: l.brand, name: l.name, type: l.type, stage: '전연령', qty: l.qty, unit: '개', basis: 1, base: l.base });
}

// 기타 용품: 물티슈 / 로션·크림 / 세제
for (const l of [
  { brand: '몽드드', line: '프리미엄 캡형', qty: 70, packs: 10, base: 1800 },
  { brand: '몽드드', line: '프리미엄 리필형', qty: 80, packs: 10, base: 1500 },
  { brand: '베베숲', line: '무향 캡형', qty: 80, packs: 10, base: 1400 },
  { brand: '베베숲', line: '무향 리필형', qty: 100, packs: 10, base: 1250 },
  { brand: '하기스', line: '네이처메이드 캡형', qty: 72, packs: 10, base: 1900 },
]) {
  add({ cat: 'etc', brand: l.brand, name: `${l.brand} ${l.line} ${l.qty}매 x ${l.packs}팩`, type: '물티슈', stage: '전연령', qty: l.qty * l.packs, unit: '매', basis: 1, base: l.base * l.packs });
}
for (const l of [
  { brand: '아토팜', name: '아토팜 MLE 크림 160ml', type: '로션·크림', base: 27000, qty: 160 },
  { brand: '아토팜', name: '아토팜 탑투토 워시 400ml', type: '로션·크림', base: 18500, qty: 400 },
  { brand: '존슨즈베이비', name: '존슨즈베이비 로션 500ml', type: '로션·크림', base: 9800, qty: 500 },
  { brand: '세타필', name: '세타필 베이비 데일리 로션 399ml', type: '로션·크림', base: 15900, qty: 399 },
]) {
  add({ cat: 'etc', brand: l.brand, name: l.name, type: l.type, stage: '전연령', qty: l.qty, unit: 'ml', basis: 100, base: l.base });
}
for (const l of [
  { brand: '피죤', name: '피죤 아기 전용 세제 2.5L', type: '세탁세제', base: 14900, qty: 2500 },
  { brand: '피죤', name: '피죤 아기 섬유유연제 2.5L', type: '섬유유연제', base: 12900, qty: 2500 },
  { brand: '마더케이', name: '마더케이 젖병세정제 리필 1,000ml', type: '젖병세정제', base: 11800, qty: 1000 },
  { brand: '마더케이', name: '마더케이 젖병세정제 용기 500ml', type: '젖병세정제', base: 7900, qty: 500 },
]) {
  add({ cat: 'etc', brand: l.brand, name: l.name, type: l.type, stage: '전연령', qty: l.qty, unit: 'ml', basis: 100, base: l.base });
}

// 가격 시계열 생성
for (const p of products) {
  const phase = rnd() * 6;
  const mood = (rnd() - 0.45) * 0.3; // 최근 가격 쏠림: -13.5% ~ +16.5%
  const missing = rnd() < 0.12 ? Math.floor(rnd() * shops.length) : -1;
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
