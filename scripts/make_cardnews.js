#!/usr/bin/env node
// 인스타그램 카드뉴스(1080x1350, 4:5) 자동 생성. 업로드는 하지 않습니다(사람이 직접 올림).
//
//   node scripts/make_cardnews.js                 → 만들 수 있는 묶음 목록
//   node scripts/make_cardnews.js formula-2단계    → 한 묶음 생성
//   node scripts/make_cardnews.js --all           → 가능한 묶음 전부 생성
//
// 결과: cardnews/<기준일>_<묶음>/01.jpg … + caption.txt
// 원칙: 사이트와 같은 기준(app.js peerKey/peersOf)으로 '같은 단계끼리 단가 순위'만 만든다.
//  - 비교 가능한 제품 3개 이상, '(참고)' 값 제외, 가격 기록 없는 제품 제외
//  - '싸다/비싸다' 판단 문구는 쓰지 않는다(기록이 쌓이기 전에는 순위만 보여줌)
//  - 가격 기준·분유 건강 면책·쿠팡 파트너스 고지를 항상 넣는다
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DB = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'products.json'), 'utf8'));
const SITE_URL = 'gain1541.github.io/my-website';
const AFF_TEXT = '이 사이트는 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.';
const MAX_ROWS = 6;

// 카테고리 포인트 색(CLAUDE.md와 동일). 초록·빨강·노랑은 판단 배지 전용이라 쓰지 않는다.
const CAT = {
  diaper: { label: '기저귀', c: '#c94a24', soft: '#fdeee8' },
  formula: { label: '분유', c: '#2f62c4', soft: '#e8effb' },
  etc: { label: '기타 용품', c: '#7a5c36', soft: '#f4ede3' },
};

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtU = (v) => (v >= 1000 ? Math.round(v).toLocaleString('ko-KR') : v.toFixed(1).replace(/\.0$/, ''));
const isRef = (h) => /참고/.test(h.s || '');
const last = (p) => p.history.slice().sort((a, b) => a.d.localeCompare(b.d)).pop();

function groupKey(p) {
  if (p.cat === 'diaper') return { id: `diaper-${p.type}-${p.stage}`, title: `${p.type} ${p.stage}` , cat: 'diaper' };
  if (p.cat === 'formula') return { id: `formula-${p.stage}`, title: `분유 ${p.stage}`, cat: 'formula' };
  if (p.cat === 'etc') return { id: `etc-${p.type}`, title: p.type, cat: 'etc' };
  return null;
}

function buildGroups() {
  const map = new Map();
  for (const p of DB.products) {
    const k = groupKey(p);
    if (!k || !(p.history || []).length) continue;
    const l = last(p);
    if (isRef(l)) continue;
    if (!map.has(k.id)) map.set(k.id, { ...k, items: [] });
    map.get(k.id).items.push({ p, l });
  }
  const out = [];
  for (const g of map.values()) {
    if (g.items.length < 3) continue;
    g.items.sort((a, b) => a.l.u - b.l.u);
    // 단위가 섞인 묶음은 비교 불가
    if (new Set(g.items.map((x) => `${x.p.basis}${x.p.unit}`)).size > 1) continue;
    g.asof = g.items.map((x) => x.l.d).sort().pop();
    g.unit = g.items[0].p.basis === 1 ? g.items[0].p.unit : `${g.items[0].p.basis}${g.items[0].p.unit}`;
    g.slug = g.id.replace(/[^\w가-힣-]+/g, '_');
    out.push(g);
  }
  return out;
}

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{width:1080px;height:1350px;font-family:'Pretendard','Noto Sans KR','Malgun Gothic','Apple SD Gothic Neo','WenQuanYi Zen Hei',sans-serif;color:#2b211c;background:#fff;position:relative;overflow:hidden;letter-spacing:-.01em}
.slide{width:1080px;height:1350px;padding:84px 80px;display:flex;flex-direction:column;position:relative}
.bar{position:absolute;left:0;top:0;right:0;height:16px;background:var(--c)}
.brand{display:flex;align-items:center;gap:16px;font-size:34px;font-weight:800}
.brand img{width:56px;height:56px;border-radius:14px}
.foot{margin-top:auto;font-size:26px;color:#6b5d55;display:flex;justify-content:space-between;align-items:center;padding-top:28px;border-top:2px solid #eee5df}
.chip{display:inline-block;background:var(--c);color:#fff;font-weight:800;font-size:32px;padding:10px 26px;border-radius:999px}
h1{font-size:104px;line-height:1.18;font-weight:900;margin-top:36px}
h1 em{font-style:normal;color:var(--c)}
h2{font-size:56px;font-weight:900;line-height:1.25}
.sub{font-size:38px;color:#5b4d45;margin-top:28px;line-height:1.5}
.cover{background:var(--soft)}
.cover .mid{margin:auto 0}
.swipe{font-size:34px;font-weight:800;color:var(--c)}
.rows{display:flex;flex-direction:column;gap:20px;margin-top:40px}
.row{display:flex;align-items:center;gap:24px;padding:24px 28px;border:3px solid #eee5df;border-radius:28px;background:#fff;position:relative;overflow:hidden}
.row .fill{position:absolute;left:0;top:0;bottom:0;background:var(--soft);z-index:0}
.row>*:not(.fill){position:relative;z-index:1}
.row.first{border-color:var(--c)}
.rank{flex:none;width:76px;height:76px;border-radius:50%;background:#eee5df;color:#5b4d45;font-size:40px;font-weight:900;display:flex;align-items:center;justify-content:center}
.row.first .rank{background:var(--c);color:#fff}
.nm{flex:1;min-width:0}
.nm b{display:block;font-size:26px;color:#6b5d55;font-weight:700}
.nm span{display:block;font-size:34px;font-weight:800;line-height:1.25;margin-top:4px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.pr{flex:none;text-align:right}
.pr b{display:block;font-size:50px;font-weight:900;font-variant-numeric:tabular-nums;color:#2b211c}
.row.first .pr b{color:var(--c)}
.pr span{display:block;font-size:24px;color:#6b5d55;margin-top:2px}
.note{font-size:26px;color:#6b5d55;line-height:1.5;margin-top:26px}
ul.rules{list-style:none;margin-top:44px;display:flex;flex-direction:column;gap:26px}
ul.rules li{font-size:38px;line-height:1.45;padding-left:64px;position:relative;font-weight:600}
ul.rules li::before{content:'✓';position:absolute;left:0;top:2px;width:44px;height:44px;border-radius:50%;background:var(--c);color:#fff;font-size:28px;font-weight:900;display:flex;align-items:center;justify-content:center}
.warn{margin-top:40px;background:#f6f1ec;border-radius:24px;padding:30px 34px;font-size:30px;line-height:1.55;color:#4a3d36}
.cta{margin:auto 0;text-align:center}
.cta .url{display:inline-block;margin-top:44px;font-size:42px;font-weight:900;color:var(--c);background:var(--soft);padding:26px 44px;border-radius:24px}
.cta .aff{margin-top:40px;font-size:26px;color:#6b5d55;line-height:1.5}
`;

function shell(g, body, cls = '') {
  const c = CAT[g.cat];
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>${CSS}</style></head>
<body style="--c:${c.c};--soft:${c.soft}"><div class="slide ${cls}"><div class="bar"></div>${body}</div></body></html>`;
}
const foot = (g, n, total) => `<div class="foot"><span>${esc(g.title)} · 가격 기준일 ${g.asof.slice(5).replace('-', '/')}</span><span>${n}/${total}</span></div>`;
const brandHead = (logo) => `<div class="brand"><img src="${logo}" alt="">아이톡톡</div>`;

function slides(g, logo) {
  const c = CAT[g.cat];
  const n = g.items.length;
  const pages = Math.ceil(n / MAX_ROWS);
  const per = Math.ceil(n / pages);
  const max = Math.max(...g.items.map((x) => x.l.u));
  const total = 3 + pages; // 표지 + 순위들 + 기준 + 마무리
  const out = [];

  out.push(shell(g, `${brandHead(logo)}
    <div class="mid"><span class="chip">${c.label} 단가 순위</span>
    <h1>${esc(g.title)}<br><em>${esc(g.unit)}당</em><br>얼마일까?</h1>
    <p class="sub">같은 단계 제품 ${n}개를<br>배송비 포함 단가로 줄 세웠어요</p></div>
    <div class="foot"><span>가격 기준일 ${g.asof.slice(5).replace('-', '/')}</span><span class="swipe">옆으로 넘기기 →</span></div>`, 'cover'));

  for (let i = 0; i < pages; i++) {
    const part = g.items.slice(i * per, (i + 1) * per);
    const rows = part.map((x, j) => {
      const rank = i * per + j + 1;
      const name = x.p.name.startsWith(x.p.brand) ? x.p.name.slice(x.p.brand.length).trim() : x.p.name;
      return `<div class="row ${rank === 1 ? 'first' : ''}"><div class="fill" style="width:${Math.max(8, (x.l.u / max) * 100)}%"></div>
        <div class="rank">${rank}</div><div class="nm"><b>${esc(x.p.brand)}</b><span>${esc(name)}</span></div>
        <div class="pr"><b>${fmtU(x.l.u)}원</b><span>${esc(g.unit)}당 · ${esc(x.l.s || '')}</span></div></div>`;
    }).join('');
    out.push(shell(g, `${brandHead(logo)}<h2 style="margin-top:36px">${esc(g.title)} 단가 순위${pages > 1 ? ` (${i + 1}/${pages})` : ''}</h2>
      <div class="rows">${rows}</div>
      <p class="note">${i === 0 ? '막대가 길수록 단가가 높아요. ' : ''}판매 페이지 구성이 제품마다 달라 월령·팩 구성은 상세 페이지에서 확인하세요.</p>
      ${foot(g, 2 + i, total)}`));
  }

  const health = g.cat === 'formula' ? '<div class="warn">분유 선택·전환은 아기마다 달라요. 가격만 보고 바꾸지 말고 소아청소년과와 상담하세요. 단계별 월령 표기는 브랜드마다 다를 수 있어요.</div>' : '';
  out.push(shell(g, `${brandHead(logo)}<h2 style="margin-top:36px">이 가격은 이렇게 계산했어요</h2>
    <ul class="rules"><li>배송비 포함, ${esc(g.unit)}당 단가로 환산</li><li>비회원 기준 (멤버십·카드·적립 제외)</li><li>조건부 쿠폰은 제외, 조건 없는 즉시할인은 포함</li><li>운영자가 확인한 판매처 중 최저가</li></ul>
    ${health}${foot(g, 2 + pages, total)}`));

  const hasAff = g.items.some((x) => x.p.links && x.p.links.coupang);
  out.push(shell(g, `${brandHead(logo)}<div class="cta"><h2>제품별 가격 기록과<br>링크는 사이트에서</h2>
    <div class="url">${SITE_URL}</div>
    <p class="aff">가격은 수시로 바뀌어요. 구매 전 판매처에서 다시 확인하세요.${hasAff ? '<br>' + AFF_TEXT : ''}</p></div>${foot(g, total, total)}`));
  return { html: out, hasAff };
}

function caption(g, hasAff) {
  const top = g.items.slice(0, 3).map((x, i) => `${i + 1}위 ${x.p.brand} ${x.p.name.replace(x.p.brand, '').trim()} - ${g.unit}당 ${fmtU(x.l.u)}원`).join('\n');
  const tags = { diaper: '#기저귀 #기저귀가격비교 #육아템 #육아꿀팁', formula: '#분유 #분유가격비교 #육아템 #육아꿀팁', etc: '#육아용품 #가격비교 #육아템' }[g.cat];
  return `${g.title} ${g.unit}당 단가 순위 (${g.asof.slice(5).replace('-', '/')} 기준)

${top}

▶ 배송비 포함 · 비회원 기준 · 조건부 쿠폰 제외, 운영자가 확인한 판매처 중 최저가예요.
▶ 가격은 수시로 바뀌니 구매 전 판매처에서 다시 확인하세요.
${g.cat === 'formula' ? '▶ 분유 선택·전환은 소아청소년과와 상담하세요.\n' : ''}▶ 전체 제품과 가격 기록: ${SITE_URL} (프로필 링크)
${hasAff ? '\n' + AFF_TEXT + '\n' : ''}
${tags} #아이톡톡
`;
}

async function render(g) {
  const { chromium } = require('playwright');
  const logo = 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(ROOT, 'img', 'logo.svg')).toString('base64');
  const { html, hasAff } = slides(g, logo);
  const dir = path.join(ROOT, 'cardnews', `${g.asof}_${g.slug}`);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
  for (let i = 0; i < html.length; i++) {
    await page.setContent(html[i]);
    await page.screenshot({ path: path.join(dir, String(i + 1).padStart(2, '0') + '.jpg'), type: 'jpeg', quality: 90 });
  }
  await browser.close();
  fs.writeFileSync(path.join(dir, 'caption.txt'), caption(g, hasAff));
  return { dir, count: html.length };
}

(async () => {
  const groups = buildGroups();
  const arg = process.argv[2];
  if (!arg) {
    console.log('만들 수 있는 묶음 (같은 단계 3개 이상, 참고값 제외):');
    groups.forEach((g) => console.log(`  ${g.id}  (${g.items.length}개, 기준일 ${g.asof})`));
    console.log('\n사용: node scripts/make_cardnews.js <묶음ID>   또는   --all');
    return;
  }
  const pick = arg === '--all' ? groups : groups.filter((g) => g.id === arg);
  if (!pick.length) { console.error(`묶음을 찾을 수 없어요: ${arg}`); process.exit(1); }
  for (const g of pick) {
    const r = await render(g);
    console.log(`${g.id}: ${r.count}장 → ${path.relative(ROOT, r.dir)}`);
  }
})();
