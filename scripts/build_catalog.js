// 제품 목록(카탈로그)과 가격 입력용 CSV 템플릿을 만듭니다.
// 사용법: node scripts/build_catalog.js
// 주의: data/products.json을 새로 만들기 때문에, 이미 가격을 입력했다면 덮어써집니다.
//       (제품만 추가할 때는 data/products.json에 직접 항목을 추가하세요.)
//
// 등록 기준: 쇼핑몰 판매 페이지에서 "제품명·단계·팩 구성(매수/용량)"이 확인된 것만 넣습니다.
// 팩 구성이 다르면 가격 비교가 무의미하므로, 구성이 다른 상품은 별도 제품으로 등록하세요.
const fs = require('fs');
const path = require('path');

const shops = [
  { id: '쿠팡', url: 'https://www.coupang.com/np/search?q=' },
  { id: '네이버 최저가', url: 'https://search.shopping.naver.com/search/all?query=' },
];

// tier(가격대)는 임시 분류입니다. 실제 단위가격이 쌓이면 재조정하세요.
const brands = {
  하기스: { tier: '중', tagline: '유한킴벌리의 기저귀 브랜드', pros: ['네이처메이드 밴드형, 맥스드라이 에어 팬티형 등 라인업이 다양', '단계별로 팩 구성이 다르니 매수 확인 필요'] },
  보솜이: { tier: '가성비', tagline: '리얼코튼 오가니크 라인을 판매', pros: ['리얼코튼 오가니크 밴드형 기저귀', '판매처에 따라 3팩 등 묶음 구성이 많음'] },
  마미포코: { tier: '가성비', tagline: 'LG유니참의 기저귀 브랜드', pros: ['에어핏 공기솔솔 팬티형: 통기 솔루션을 강조', '중·대형 사이즈를 기존보다 크게 개선(2021년형)'] },
  남양: { tier: '중', tagline: '임페리얼드림 XO, 아이엠마더 분유', pros: ['임페리얼드림 XO는 1~3단계 구성', '아이엠마더는 초유 성분을 내세운 라인'] },
  매일: { tier: '중', tagline: '앱솔루트 명작 분유', pros: ['앱솔루트 명작 2FL 1~3단계 구성', '묶음(3개 등) 판매가 많아 구성 확인 필요'] },
  일동후디스: { tier: '상', tagline: '산양분유 중심 브랜드', pros: ['프리미엄 산양분유, 시그니처 산양분유 라인', '단계별 판매 구성 확인 필요'] },
  파스퇴르: { tier: '상', tagline: '위드맘 분유(750g)', pros: ['위드맘 1~3단계 구성, 용량은 750g', '다른 분유(800g)와 단위가격으로 비교 필요'] },
  누크: { tier: '상', tagline: '실리콘 쪽쪽이 브랜드', pros: ['센서티브 실리콘 쪽쪽이: S1(0~6개월), S2(6~18개월)', '월령별 사이즈가 구분됨'] },
  더블하트: { tier: '중', tagline: '모유실감 PPSU 젖병', pros: ['PPSU 젖병 160ml/240ml', '트윈·트리플 팩, 젖꼭지 포함 세트 등 구성이 다양'] },
  닥터브라운: { tier: '상', tagline: '옵션스+ 와이드넥 젖병', pros: ['150ml/270ml, PP·PPSU·유리 소재 선택 가능', '젖꼭지 단계(1~3단계)를 따로 구매하는 구조'] },
  베베숲: { tier: '중', tagline: '캡형 물티슈 브랜드', pros: ['캡형 70매·80매 라인', '10팩~20팩 대용량 구성이 많음'] },
  아토팜: { tier: '상', tagline: '보습 스킨케어 브랜드', pros: ['MLE 크림 160ml(튜브형)'] },
  존슨즈베이비: { tier: '중', tagline: '글로벌 베이비 케어 브랜드', pros: ['베드타임 로션 500ml', '대용량이라 100ml당 단가 비교에 유리'] },
};

const products = [];
let n = 1;
const add = (cat, brand, name, type, stage, qty, unit, basis = 1) =>
  products.push({ id: 'p' + String(n++).padStart(3, '0'), cat, brand, name, type, stage, qty, unit, basis, prices: {} });

// 기저귀 (qty = 총 매수)
add('diaper', '하기스', '하기스 네이처메이드 밴드형 1단계(신생아) 66매', '밴드형', '1단계(신생아)', 66, '매');
add('diaper', '하기스', '하기스 네이처메이드 밴드형 2단계 58매', '밴드형', '2단계', 58, '매');
add('diaper', '하기스', '하기스 네이처메이드 밴드형 3단계 50매', '밴드형', '3단계', 50, '매');
add('diaper', '하기스', '하기스 맥스드라이 에어 팬티형 3단계 56매×2팩', '팬티형', '3단계', 112, '매');
add('diaper', '하기스', '하기스 맥스드라이 에어 팬티형 4단계 48매×2팩', '팬티형', '4단계', 96, '매');
add('diaper', '하기스', '하기스 맥스드라이 에어 팬티형 5단계 40매×2팩', '팬티형', '5단계', 80, '매');
add('diaper', '보솜이', '보솜이 리얼코튼 오가니크 밴드형 1단계 92매', '밴드형', '1단계(신생아)', 92, '매');
add('diaper', '마미포코', '마미포코 에어핏 공기솔솔 팬티형 4단계 72매', '팬티형', '4단계', 72, '매');

// 분유 (qty = g, 100g당 환산)
for (const s of ['1단계', '2단계', '3단계']) add('formula', '남양', `남양 임페리얼드림 XO ${s} 800g`, '임페리얼드림 XO', s, 800, 'g', 100);
for (const s of ['1단계', '2단계', '3단계']) add('formula', '남양', `남양 아이엠마더 ${s} 800g`, '아이엠마더', s, 800, 'g', 100);
for (const s of ['1단계', '2단계', '3단계']) add('formula', '매일', `매일 앱솔루트 명작 ${s} 800g`, '앱솔루트 명작', s, 800, 'g', 100);
add('formula', '일동후디스', '일동후디스 프리미엄 산양분유 2단계 800g', '산양분유', '2단계', 800, 'g', 100);
add('formula', '일동후디스', '일동후디스 시그니처 산양분유 2단계 800g', '산양분유', '2단계', 800, 'g', 100);
add('formula', '파스퇴르', '파스퇴르 위드맘 1단계 750g', '위드맘', '1단계', 750, 'g', 100);
add('formula', '파스퇴르', '파스퇴르 위드맘 3단계 750g', '위드맘', '3단계', 750, 'g', 100);

// 쪽쪽이
add('pacifier', '누크', '누크 센서티브 실리콘 쪽쪽이 S1 (0~6개월) 1개', '실리콘', '0~6개월', 1, '개');
add('pacifier', '누크', '누크 센서티브 실리콘 쪽쪽이 S2 (6~18개월) 1개', '실리콘', '6~18개월', 1, '개');

// 분유병(젖병)
add('bottle', '더블하트', '더블하트 모유실감 PPSU 젖병 160ml 트윈팩(2개)', 'PPSU', '전연령', 2, '개');
add('bottle', '더블하트', '더블하트 모유실감 PPSU 젖병 240ml 트윈팩(2개)', 'PPSU', '전연령', 2, '개');
add('bottle', '닥터브라운', '닥터브라운 옵션스+ 와이드넥 PP젖병 150ml', 'PP', '전연령', 1, '개');
add('bottle', '닥터브라운', '닥터브라운 옵션스+ 와이드넥 PP젖병 270ml 2입', 'PP', '전연령', 2, '개');

// 기타 용품
add('etc', '베베숲', '베베숲 시그니처 캡형 70매×20팩', '물티슈', '전연령', 1400, '매');
add('etc', '베베숲', '베베숲 센시티브 캡형 80매×10팩', '물티슈', '전연령', 800, '매');
add('etc', '아토팜', '아토팜 MLE 크림 160ml', '로션·크림', '전연령', 160, 'ml', 100);
add('etc', '존슨즈베이비', '존슨즈베이비 베드타임 로션 500ml', '로션·크림', '전연령', 500, 'ml', 100);

// 제품별 쇼핑몰 상품 페이지 링크 (추적 파라미터 없이 주소 앞부분만 저장)
const link = (id, shop, url) => { products.find((p) => p.id === id).links = { ...(products.find((p) => p.id === id).links || {}), [shop]: url }; };
link('p001', '네이버 최저가', 'https://search.shopping.naver.com/catalog/59645004330');

const out = { sample: false, generatedAt: new Date().toISOString().slice(0, 10), dates: [], shops, brands, products };
fs.writeFileSync(path.join(__dirname, '..', 'data', 'products.json'), JSON.stringify(out));

const lines = ['date,productId,shop,price,판매처(메모),제품명(참고용)'];
for (const p of products) for (const s of shops) lines.push(`${out.generatedAt},${p.id},${s.id},,,${p.name.replace(/,/g, '')}`);
fs.writeFileSync(path.join(__dirname, '..', 'data', 'prices_template.csv'), lines.join('\n') + '\n');

const used = new Set(products.map((p) => p.brand));
const missing = [...used].filter((b) => !brands[b]);
if (missing.length) { console.error('브랜드 정보 없음:', missing); process.exit(1); }
console.log('products:', products.length, '| template rows:', lines.length - 1);
