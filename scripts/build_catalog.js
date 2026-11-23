// 제품 목록(카탈로그)과 가격 입력용 CSV 템플릿을 만듭니다.
// 사용법: node scripts/build_catalog.js
// 이미 입력한 가격 기록(history)은 제품명이 같으면 그대로 유지됩니다.
// 제품명을 바꾸면 그 제품의 기록은 이어지지 않으니 주의하세요.
//
// 등록 기준: 쇼핑몰 판매 페이지에서 "제품명·단계·팩 구성(매수/용량)"이 확인된 것만 넣습니다.
// 팩 구성이 다르면 가격 비교가 무의미하므로, 구성이 다른 상품은 별도 제품으로 등록하세요.
const fs = require('fs');
const path = require('path');

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
  products.push({ id: 'p' + String(n++).padStart(3, '0'), cat, brand, name, type, stage, qty, unit, basis, history: [] });

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
add('bottle', '닥터브라운', '닥터브라운 옵션스+ 와이드넥 PP젖병 150ml 트윈팩(2개)+세척솔', 'PP', '전연령', 2, '개');
add('bottle', '닥터브라운', '닥터브라운 옵션스+ 와이드넥 PP젖병 270ml 2입', 'PP', '전연령', 2, '개');

// 기타 용품
add('etc', '베베숲', '베베숲 시그니처 캡형 70매×20팩', '물티슈', '전연령', 1400, '매');
add('etc', '베베숲', '베베숲 센시티브 캡형 80매×10팩', '물티슈', '전연령', 800, '매');
add('etc', '아토팜', '아토팜 MLE 크림 160ml', '로션·크림', '전연령', 160, 'ml', 100);
add('etc', '존슨즈베이비', '존슨즈베이비 베드타임 로션 500ml', '로션·크림', '전연령', 500, 'ml', 100);

// 제품 부가 정보: age(대상 월령, 판매 페이지 표기 기준), coupangNote(쿠팡 링크가 정확히 같은 구성이 아닐 때 안내)
const meta = (id, o) => Object.assign(products.find((x) => x.id === id), o);
meta('p001', { age: '신생아용' });
meta('p002', { age: '생후 약 1개월~' });
meta('p007', { age: '신생아용' });
meta('p009', { age: '~백일' });
meta('p011', { age: '12~24개월' });
meta('p012', { age: '0~6개월' });
meta('p013', { age: '6~12개월' });
meta('p014', { age: '12~24개월' });
meta('p015', { age: '0~6개월' });
meta('p020', { age: '0~6개월' });
meta('p021', { age: '12개월~' });
const SEARCH_NOTE = '쿠팡 검색 결과로 이동해요. 수량·라인이 다를 수 있으니 구성을 확인하세요.';
['p008', 'p018', 'p020', 'p021', 'p028'].forEach((id) => meta(id, { coupangNote: SEARCH_NOTE }));

// 제품별 쇼핑몰 상품 페이지 링크 (추적 파라미터 없이 주소 앞부분만 저장). key: naver | coupang
const link = (id, key, url) => { const p = products.find((x) => x.id === id); p.links = { ...(p.links || {}), [key]: url }; };
link('p001', 'naver', 'https://search.shopping.naver.com/catalog/59645004330');

// 이미 입력한 가격 기록은 제품명 기준으로 보존합니다.
const dataFile = path.join(__dirname, '..', 'data', 'products.json');
if (fs.existsSync(dataFile)) {
  const old = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  const byName = new Map((old.products || []).map((p) => [p.name, p]));
  for (const p of products) {
    const o = byName.get(p.name);
    if (o && Array.isArray(o.history)) p.history = o.history;
    if (o && o.links) for (const k of ['naver', 'coupang']) if (o.links[k]) p.links = { ...p.links, [k]: o.links[k] };
  }
}

// img/ 폴더에 `p001.jpg`처럼 제품 ID로 저장한 사진을 자동 연결합니다(jpg/jpeg/png/webp).
// 출처·이용 허락 표기는 img/credits.json에 {"p001": "하기스 제공"} 형태로 적습니다. 권리가 확인된 사진만 넣으세요.
const imgDir = path.join(__dirname, '..', 'img');
const credits = fs.existsSync(path.join(imgDir, 'credits.json')) ? JSON.parse(fs.readFileSync(path.join(imgDir, 'credits.json'), 'utf8')) : {};
for (const p of products) {
  const ext = ['jpg', 'jpeg', 'png', 'webp'].find((e) => fs.existsSync(path.join(imgDir, `${p.id}.${e}`)));
  if (ext) { p.image = `img/${p.id}.${ext}`; if (credits[p.id]) p.imageCredit = credits[p.id]; }
}

const out = { sample: false, generatedAt: new Date().toISOString().slice(0, 10), brands, products };
fs.writeFileSync(dataFile, JSON.stringify(out));

const unitName = (p) => `${p.basis === 1 ? '' : p.basis}${p.unit}당`;
const lines = ['date,productId,unitPrice,seller,제품명(참고용),단가 단위(참고용)'];
for (const p of products) lines.push(`${out.generatedAt},${p.id},,,${p.name.replace(/,/g, '')},${unitName(p)}`);
fs.writeFileSync(path.join(__dirname, '..', 'data', 'prices_template.csv'), lines.join('\n') + '\n');

// 링크 입력용 템플릿 (이미 연결된 링크는 미리 채워 둡니다)
const linkLines = ['productId,naver,coupang,제품명(참고용)'];
for (const p of products) linkLines.push(`${p.id},${(p.links && p.links.naver) || ''},${(p.links && p.links.coupang) || ''},${p.name.replace(/,/g, '')}`);
fs.writeFileSync(path.join(__dirname, '..', 'data', 'links_template.csv'), linkLines.join('\n') + '\n');

const used = new Set(products.map((p) => p.brand));
const missing = [...used].filter((b) => !brands[b]);
if (missing.length) { console.error('브랜드 정보 없음:', missing); process.exit(1); }
console.log('products:', products.length, '| template rows:', lines.length - 1);
