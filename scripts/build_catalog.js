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
  더블하트: { tier: '중', tagline: '모유실감 PPSU 젖병과 젖꼭지·쪽쪽이', pros: ['PPSU 젖병 160ml/240ml(트윈·트리플 팩, 젖꼭지 포함 세트 등 구성이 다양)', '젖꼭지는 SS~3L 사이즈로 따로 판매(2개입)', '세트에 들어 있는 젖꼭지 사이즈가 구성마다 달라요(예: 160ml는 S, 240ml는 M 또는 L)', '쪽쪽이는 PPSU 노리개젖꼭지(6~18개월) 등이 판매'] },
  닥터브라운: { tier: '상', tagline: '옵션스+ 젖병과 노리개젖꼭지(프리벤트·어드밴티지)', pros: ['젖병은 150ml/270ml, PP·PPSU·유리 소재 선택 가능', '젖꼭지 단계(1~3단계)를 따로 구매하는 구조', '프리벤트는 0~6개월·6~12개월, 어드밴티지는 6~18개월 제품이 판매'] },
  베베숲: { tier: '중', tagline: '캡형 물티슈 브랜드', pros: ['캡형 70매·80매 라인', '10팩~20팩 대용량 구성이 많음'] },
  아토팜: { tier: '상', tagline: '보습 스킨케어 브랜드', pros: ['MLE 크림 160ml(튜브형)'] },
  군: { tier: '상', tagline: '일본 대왕제지의 기저귀 브랜드(GOO.N)', pros: ['쿠팡에서는 오리지널 팬티형이 L·XL·2XL 사이즈로 판매(단계 번호 대신 사이즈 표기)', '밴드형과 다른 라인은 확인하지 못했어요'] },
  팸퍼스: { tier: '중', tagline: '한국피앤지판매유한회사가 판매하는 글로벌 기저귀 브랜드', pros: ['베이비드라이 팬티형 등 라인업', '프리미엄케어 등 일부 라인은 한국 정규 판매 여부를 확인하지 못했어요'] },
  힙: { tier: '상', tagline: '유기농 콤비오틱 분유(HiPP)', pros: ['유기농 콤비오틱 1·2·3단계 800g이 판매', '해외직구·구매대행 상품이 섞여 있어 정식 수입품과 구분이 필요해요'] },
  압타밀: { tier: '상', tagline: '프로푸트라 듀오 어드밴스 분유(Aptamil)', pros: ['프로푸트라 듀오 어드밴스 1·2·3단계 800g이 판매', '해외구매 상품이 많아 구성·표기가 국내 정식품과 다를 수 있어요'] },
  맘베이비: { tier: '중', tagline: 'MAM 쪽쪽이 브랜드', pros: ['오리지널 실리콘 쪽쪽이(6~16개월 2개입)가 쿠팡에서 판매', '월령별 사이즈가 나뉘어 있고 0~6개월 제품은 한국 판매를 확인하지 못했어요'] },
  누비: { tier: '중', tagline: '벨벳 노리개젖꼭지 등 유아용품 브랜드', pros: ['벨벳 노리개젖꼭지 0~6개월 2개입'] },
  모윰: { tier: '상', tagline: '올실리콘 마카롱·소프트 윙 쪽쪽이 브랜드', pros: ['마카롱 쪽쪽이는 1단계(1~3개월)·2단계(3~6개월)·3단계(6개월 이상)로 나뉘고 전용 케이스가 포함된 1세트로 판매', '물고임이 없는 실리콘 쪽쪽이(6개월~)는 케이스 없이 따로 판매', '같은 브랜드도 제품마다 월령 기준이 달라요'] },
  그린맘: { tier: '중', tagline: '아이쏙 젖꼭지 브랜드(Green Mom)', pros: ['아이쏙 젖꼭지는 SS·S·M·L 사이즈, 2개입으로 판매', '슬림형(좁은 입구)과 일반형이 따로 있어 형태 확인이 필요해요', '젖병 라인은 판매 구성을 확인하지 못했어요'] },
  유팡: { tier: '중', tagline: '젖병 소독기 브랜드(UV 살균·건조)', pros: ['시그니처2 플러스(UP920A): 자외선(UV LED) 살균과 건조 기능(제조사 설명)', '크기 325×405×446mm, 비교 기사에서는 160ml 젖병 30개 수납으로 소개(참고)', '젖병·젖꼭지·세정제는 확인되지 않았어요'] },
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

// ---- 브랜드 추가분 (기존 제품 번호는 유지하기 위해 맨 뒤에 추가) ----
// 기저귀
add('diaper', '군', '군 오리지널 팬티형 여아용 대형(L) 44매×3팩', '팬티형', '대형(L)', 132, '매');
add('diaper', '팸퍼스', '팸퍼스 베이비드라이 팬티형 5단계 144매', '팬티형', '5단계', 144, '매');
// 분유 (월령은 한국어 판매 페이지에서 확인되지 않아 months를 넣지 않음)
for (const st of ['1단계', '2단계', '3단계']) add('formula', '힙', `힙 유기농 콤비오틱 ${st} 800g`, '유기농 콤비오틱', st, 800, 'g', 100);
for (const st of ['1단계', '2단계', '3단계']) add('formula', '압타밀', `압타밀 프로푸트라 듀오 어드밴스 ${st} 800g`, '프로푸트라 듀오 어드밴스', st, 800, 'g', 100);
// 쪽쪽이
add('pacifier', '닥터브라운', '닥터브라운 프리벤트 야광 노리개젖꼭지 1단계 (0~6개월) 2P', '실리콘', '0~6개월', 2, '개');
add('pacifier', '닥터브라운', '닥터브라운 프리벤트 야광 노리개젖꼭지 2단계 (6~12개월) 2P', '실리콘', '6~12개월', 2, '개');
add('pacifier', '닥터브라운', '닥터브라운 어드밴티지 야광 노리개젖꼭지 2단계 (6~18개월) 1개', '실리콘', '6~18개월', 1, '개');
add('pacifier', '맘베이비', '맘베이비 오리지널 실리콘 쪽쪽이 (6~16개월) 2개입', '실리콘', '6~16개월', 2, '개');
add('pacifier', '누비', '누비 벨벳 노리개젖꼭지 (0~6개월) 2P', '실리콘', '0~6개월', 2, '개');

// 쪽쪽이 추가: 더블하트, 모윰
add('pacifier', '더블하트', '더블하트 PPSU Skin Friendly 노리개젖꼭지 (6~18개월) 1개', 'PPSU', '6~18개월', 1, '개');
add('pacifier', '모윰', '모윰 올실리콘 마카롱 쪽쪽이+전용케이스 1단계 (1~3개월) 1세트', '실리콘', '1~3개월', 1, '개');
add('pacifier', '모윰', '모윰 올실리콘 마카롱 쪽쪽이+전용케이스 2단계 (3~6개월) 1세트', '실리콘', '3~6개월', 1, '개');
add('pacifier', '모윰', '모윰 올실리콘 마카롱 쪽쪽이+전용케이스 3단계 (6개월 이상) 1세트', '실리콘', '6개월 이상', 1, '개');
add('pacifier', '모윰', '모윰 물고임이 없는 실리콘 쪽쪽이 (6개월 이상) 1개', '실리콘', '6개월 이상', 1, '개');

// ---- 젖꼭지(젖병용) 분리: 단계(유속)·사이즈와 호환 젖병이 핵심. 월령은 한국 판매 표기가 확인되지 않아 넣지 않음 ----
for (const st of ['2단계', '3단계', '4단계']) add('nipple', '닥터브라운', `닥터브라운 옵션스+ 와이드넥 젖꼭지 ${st} 2P`, '옵션스+ 와이드넥', st, 2, '개');
for (const sz of ['SS', 'S', 'M', 'L', 'LL', '3L']) add('nipple', '더블하트', `더블하트 모유실감 3세대 젖꼭지 ${sz} 2개`, '모유실감 3세대', sz, 2, '개');

// ---- 그린맘(젖꼭지), 유팡(젖병 소독기) ----
for (const sz of ['SS', 'S', 'M', 'L']) add('nipple', '그린맘', `그린맘 아이쏙 젖꼭지 ${sz} 2개입`, '아이쏙', sz, 2, '개');
add('etc', '유팡', '유팡 시그니처2 플러스 젖병 소독기 (UP920A)', '젖병 소독기', '전연령', 1, '개');

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
meta('p040', { age: '0~6개월' });
meta('p041', { age: '6~12개월' });
meta('p042', { age: '6~18개월' });
meta('p043', { age: '6~16개월' });
meta('p044', { age: '0~6개월' });
meta('p045', { age: '6~18개월' });
meta('p046', { age: '1~3개월' });
meta('p047', { age: '3~6개월' });
meta('p048', { age: '6개월 이상' });
meta('p049', { age: '6개월 이상' });
// months: [시작월, 끝월|null]  판매 페이지에 월령이 명시된 제품만 입력합니다(월령 가이드에 사용). null은 '이후 계속'.
const MONTHS = { p001: [0, 1], p007: [0, 1], p009: [0, 3], p011: [12, 24], p012: [0, 6], p013: [6, 12], p014: [12, 24], p015: [0, 6], p020: [0, 6], p021: [12, null], p022: [0, 6], p023: [6, 18], p040: [0, 6], p041: [6, 12], p042: [6, 18], p043: [6, 16], p044: [0, 6], p045: [6, 18], p046: [1, 3], p047: [3, 6], p048: [6, null], p049: [6, null] };
for (const [id, m] of Object.entries(MONTHS)) meta(id, { months: m });
// fits: 호환 젖병(판매 페이지·제조사 표기 기준), note: 제품 안내 문구
const FIT_WARN = '다른 브랜드·라인 젖병과는 나사 구조와 두께가 달라 맞지 않을 수 있어요. 구매 전에 호환을 확인하세요.';
['p050', 'p051', 'p052'].forEach((id) => meta(id, { fits: '옵션스+ 와이드넥 젖병용', note: FIT_WARN + ' 1단계는 젖병에 기본 포함인 경우가 많아 따로 판매하지 않아요(한국 판매처 기준 2~4단계 확인).' }));
['p053', 'p054', 'p055', 'p056', 'p057', 'p058'].forEach((id) => meta(id, { fits: '모유실감 3세대 젖병용', note: FIT_WARN + ' 사이즈별 월령 기준은 확인하지 못했어요. 더블하트 상세 페이지나 고객센터에서 확인하세요.' }));
['p059', 'p060', 'p061', 'p062'].forEach((id) => meta(id, { fits: '그린맘 아이쏙 젖병용', note: FIT_WARN + ' 슬림형(좁은 입구)과 일반형이 따로 있어요. 어느 형태인지 상품 상세에서 확인하세요. 사이즈별 월령 기준은 확인하지 못했어요.' }));
meta('p063', { note: '모델명(UP920A)과 구성(LED 세트·칫솔걸이 포함 여부)이 판매처마다 달라요. 같은 모델·구성끼리 비교하세요.' });
const BOTTLE_NOTE = '젖꼭지가 포함되는지와 단계·사이즈는 판매 구성마다 달라요. 상품 상세에서 확인하고, 단계별 젖꼭지는 "젖꼭지(젖병용)" 탭에서 비교하세요.';
['p024', 'p025', 'p026', 'p027'].forEach((id) => meta(id, { note: BOTTLE_NOTE }));
const SEARCH_NOTE = '쿠팡 검색 결과로 이동해요. 수량·라인이 다를 수 있으니 구성을 확인하세요.';
['p008', 'p018', 'p020', 'p021', 'p028', 'p032', 'p033', 'p034', 'p035', 'p036', 'p037', 'p038', 'p039', 'p042', 'p043', 'p044', 'p045', 'p046', 'p049'].forEach((id) => meta(id, { coupangNote: SEARCH_NOTE }));

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

// 쿠팡 파트너스에서 제공받은 상품 이미지 주소(쿠팡 이미지 서버에서 직접 불러옴, 파일을 저장해 두지 않음).
// 사용 전 쿠팡 파트너스 약관의 이미지 사용 조건을 확인하세요. 문제가 되면 이 목록을 비우면 아이콘으로 돌아갑니다.
const COUPANG_THUMBS = {
  p001: 'https://t2c.coupangcdn.com/thumbnails/remote/212x212ex/image/retail/images/252547846692601-7dfdc9e5-03ca-4e03-b43b-1e5a8730a3ac.png',
  p002: 'https://t1a.coupangcdn.com/thumbnails/remote/212x212ex/image/retail/images/253104256728657-9736fadb-5085-4583-9a98-06484aecfc9b.jpg',
  p003: 'https://thumbnail7.coupangcdn.com/thumbnails/remote/212x212ex/image/retail/images/251672008326952-7dcf0b1f-b82b-4d55-b2b3-1f1a279cd688.jpg',
  p022: 'https://t4a.coupangcdn.com/thumbnails/remote/212x212ex/image/retail/images/3686595414221814-4b623943-852c-40d5-b4a7-51d0d84a6d33.jpg',
  p023: 'https://thumbnail4.coupangcdn.com/thumbnails/remote/212x212ex/image/retail/images/3066359667196221-0d5a406a-3226-4332-9c26-28b8ea900888.jpg',
  p026: 'https://thumbnail11.coupangcdn.com/thumbnails/remote/212x212ex/image/retail/images/144496753564599-0e1b2fee-c732-4835-b3c9-a3dd57e4993d.jpg',
  p027: 'https://thumbnail9.coupangcdn.com/thumbnails/remote/212x212ex/image/retail/images/6d0bdba8-4aba-40a7-a520-b464f2c57a9014808107313377730382.png',
  p024: 'https://thumbnail6.coupangcdn.com/thumbnails/remote/212x212ex/image/vendor_inventory/image_audit/stage/manual/0734f650d57c74b192cebf0d16e66b36a40ce79d94cebb92bd2f134f66c1_1791957441095.jpg',
  p025: 'https://thumbnail4.coupangcdn.com/thumbnails/remote/212x212ex/image/vendor_inventory/image_audit/stage/manual/5f3e984e-bd25-44e5-bf1a-c32c97ae9e43_1792747608579.jpeg',
  p030: 'https://t5a.coupangcdn.com/thumbnails/remote/212x212ex/image/vendor_inventory/777a/540c8009e5d1a9ce56a12d8a9e8d48c5e1127b43f7c528df69bccaff9e8e.jpg',
  p031: 'https://thumbnail1.coupangcdn.com/thumbnails/remote/212x212ex/image/vendor_inventory/d63b/9cfdd7e95c0b79210d93be1147cf7098f14bfe7b5283aabc60c973e41017.jpg',
  p040: 'https://thumbnail12.coupangcdn.com/thumbnails/remote/212x212ex/image/vendor_inventory/image_audit/advertiser/1777097143610/6f22993c-b59e-4c36-803c-84879e80a4f2.jpg',
};
for (const [id, url] of Object.entries(COUPANG_THUMBS)) {
  if (!/^https:\/\/[a-z0-9]+\.coupangcdn\.com\/thumbnails\//.test(url)) throw new Error('이미지 주소 형식 오류: ' + id);
  meta(id, { image: url, imageCredit: '쿠팡 파트너스 제공 이미지' });
}

// img/ 폴더에 `p001.jpg`처럼 제품 ID로 저장한 사진을 자동 연결합니다(jpg/jpeg/png/webp).
// 출처·이용 허락 표기는 img/credits.json에 {"p001": "하기스 제공"} 형태로 적습니다. 권리가 확인된 사진만 넣으세요.
const imgDir = path.join(__dirname, '..', 'img');
const credits = fs.existsSync(path.join(imgDir, 'credits.json')) ? JSON.parse(fs.readFileSync(path.join(imgDir, 'credits.json'), 'utf8')) : {};
for (const p of products) {
  const ext = ['jpg', 'jpeg', 'png', 'webp'].find((e) => fs.existsSync(path.join(imgDir, `${p.id}.${e}`)));
  if (ext) { p.image = `img/${p.id}.${ext}`; if (credits[p.id]) p.imageCredit = credits[p.id]; }
}

// 기저귀 단계별 체중 기준(판매 페이지에 표기된 값만). 브랜드·라인마다 달라서 확인된 것만 넣고, 출처를 함께 적습니다.
const weightGuide = {
  rows: [
    { title: '하기스 밴드형', items: [['1단계', '3~4.5kg'], ['2단계', '4~8kg'], ['3단계', '6~10kg'], ['4단계', '8~13kg'], ['5단계', '10~16kg']], src: '쇼핑몰 판매 페이지 표기 (3단계는 네이처밤부 밴드 표기). 팬티형은 기준이 달라요.' },
    { title: '마미포코 꿀잠팬티', items: [['4단계', '10~14kg'], ['5단계', '13~18kg']], src: 'SSG 판매 페이지 라인업표. 에어핏 팬티는 확인되지 않았어요.' },
  ],
  general: '육아 정보 사이트의 일반적인 구간: 신생아 5kg 이하, S 4~8kg, M 6~11kg, L 9~14kg, 팬티 XL 12~17kg, XXL 15kg 이상 (브랜드마다 달라요)',
  caution: '하기스·마미포코의 다른 라인과 팸퍼스, 보솜이는 체중 기준을 확인하지 못했어요. 포장 뒷면의 사이즈표를 꼭 확인하세요. 구간이 겹치면 체형에 따라 한 단계 위나 아래를 고르기도 해요.',
};

// 사이트 설정: requestUrl에 구글폼 등 요청·문의 폼 주소(https)를 넣으면 사이트에 요청 링크가 나타납니다. 비어 있으면 숨김.
const SITE = { requestUrl: 'https://docs.google.com/forms/d/e/1FAIpQLScT72Vj0wiB9EoNTeXDLYDiHyTHOZSI8apM4aVmS5r4zYrEsQ/viewform' };

const out = { sample: false, generatedAt: new Date().toISOString().slice(0, 10), site: SITE, brands, weightGuide, products };
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
