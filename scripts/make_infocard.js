#!/usr/bin/env node
// 정보형 카드뉴스(육아 건강·안전 등) 생성. 업로드는 하지 않습니다(사람이 직접 올림).
//
//   node scripts/make_infocard.js cardnews/content/파일.json
//
// 입력 JSON:
//  { "slug":"winter-infection", "title":"…", "subtitle":"…", "asof":"2026-11-26",
//    "slides":[{ "heading":"…", "bullets":["…"], "note":"…", "verify":["원문 확인이 필요한 항목"] }],
//    "sources":[{ "name":"질병관리청 …", "url":"https://…", "verified":false }],
//    "disclaimer":"…", "hashtags":"#…" }
//
// 안전장치(건강 정보 오류 방지):
//  - 출처가 하나라도 verified:true가 아니면 '초안·원문 확인 전' 띠를 모든 장에 찍고 캡션에도 경고를 넣는다.
//  - 출처가 하나도 없으면 생성하지 않는다.
//  - 질병 진단·치료를 단정하는 내용은 쓰지 않는다(일반 정보 + 전문가 상담 안내).
//  - 다른 글을 복사하지 않고 공식 자료를 직접 정리해서 쓴다.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const COLOR = { c: '#17788f', soft: '#e6f3f6' }; // 초록·빨강·노랑은 판단 배지 전용이라 쓰지 않음
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{width:1080px;height:1350px;font-family:'Pretendard','Noto Sans KR','Malgun Gothic','Apple SD Gothic Neo','WenQuanYi Zen Hei',sans-serif;color:#2b211c;background:#fff;overflow:hidden;letter-spacing:-.01em}
.slide{width:1080px;height:1350px;padding:84px 80px;display:flex;flex-direction:column;position:relative}
.bar{position:absolute;left:0;top:0;right:0;height:16px;background:${COLOR.c}}
.draft{position:absolute;left:0;right:0;top:16px;background:#2b211c;color:#fff;text-align:center;font-size:24px;font-weight:800;padding:8px 0}
.brand{display:flex;align-items:center;gap:16px;font-size:34px;font-weight:800;margin-top:24px}
.brand img{width:56px;height:56px;border-radius:14px}
.foot{margin-top:auto;font-size:26px;color:#6b5d55;display:flex;justify-content:space-between;padding-top:28px;border-top:2px solid #eee5df}
.chip{display:inline-block;background:${COLOR.c};color:#fff;font-weight:800;font-size:32px;padding:10px 26px;border-radius:999px}
h1{font-size:96px;line-height:1.2;font-weight:900;margin-top:36px}
h1 em{font-style:normal;color:${COLOR.c}}
h2{font-size:58px;font-weight:900;line-height:1.28;margin-top:36px}
.sub{font-size:38px;color:#5b4d45;margin-top:28px;line-height:1.5}
.cover{background:${COLOR.soft}}.cover .mid{margin:auto 0}
.swipe{font-weight:800;color:${COLOR.c};font-size:34px}
ul.b{list-style:none;margin-top:44px;display:flex;flex-direction:column;gap:30px}
ul.b li{font-size:40px;line-height:1.5;padding-left:64px;position:relative;font-weight:600}
ul.b li::before{content:'';position:absolute;left:8px;top:18px;width:24px;height:24px;border-radius:50%;background:${COLOR.c}}
ul.b li b{color:${COLOR.c};font-weight:900}
.note{margin-top:36px;background:#f6f1ec;border-radius:24px;padding:28px 34px;font-size:30px;line-height:1.55;color:#4a3d36}
ul.src{list-style:none;margin-top:36px;display:flex;flex-direction:column;gap:18px}
ul.src li{font-size:28px;line-height:1.45;color:#4a3d36;word-break:break-all}
.cta{margin:auto 0;text-align:center}
.cta .url{display:inline-block;margin-top:36px;font-size:40px;font-weight:900;color:${COLOR.c};background:${COLOR.soft};padding:24px 40px;border-radius:24px}
`;

function page(inner, draft, cls = '') {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>${CSS}</style></head><body><div class="slide ${cls}"><div class="bar"></div>${draft ? '<div class="draft">초안 · 원문 확인 전 — 게시 금지</div>' : ''}${inner}</div></body></html>`;
}

(async () => {
  const file = process.argv[2];
  if (!file) { console.error('사용: node scripts/make_infocard.js <내용.json>'); process.exit(1); }
  const d = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
  if (!d.sources || !d.sources.length) { console.error('출처가 없어 생성하지 않습니다(sources 필요).'); process.exit(1); }
  const draft = !d.sources.every((s) => s.verified === true);
  const logo = 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(ROOT, 'img', 'logo.svg')).toString('base64');
  const head = `<div class="brand"><img src="${logo}" alt="">아이톡톡</div>`;
  const total = d.slides.length + 3; // 표지 + 내용 + 출처 + 마무리
  const foot = (n) => `<div class="foot"><span>${esc(d.title)}</span><span>${n}/${total}</span></div>`;
  const out = [];
  out.push(page(`${head}<div class="mid"><span class="chip">육아 건강 정보</span><h1>${esc(d.title)}</h1><p class="sub">${esc(d.subtitle || '')}</p></div><div class="foot"><span>${esc(d.asof)} 기준</span><span class="swipe">옆으로 넘기기 →</span></div>`, draft, 'cover'));
  d.slides.forEach((s, i) => {
    out.push(page(`${head}<h2>${esc(s.heading)}</h2><ul class="b">${s.bullets.map((b) => `<li>${esc(b).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')}</li>`).join('')}</ul>${s.note ? `<div class="note">${esc(s.note)}</div>` : ''}${foot(i + 2)}`, draft));
  });
  out.push(page(`${head}<h2>참고한 공식 자료</h2><ul class="src">${d.sources.map((s) => `<li>• ${esc(s.name)}<br>${esc(s.url)}</li>`).join('')}</ul><div class="note">${esc(d.disclaimer)}</div>${foot(total - 1)}`, draft));
  out.push(page(`${head}<div class="cta"><h2>육아용품 가격은<br>아이톡톡에서</h2><div class="url">gain1541.github.io/my-website</div></div>${foot(total)}`, draft));

  const { chromium } = require('playwright');
  const dir = path.join(ROOT, 'cardnews', 'info', `${d.asof}_${d.slug}`);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch();
  const pg = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
  for (let i = 0; i < out.length; i++) {
    await pg.setContent(out[i]);
    await pg.screenshot({ path: path.join(dir, String(i + 1).padStart(2, '0') + '.jpg'), type: 'jpeg', quality: 90 });
  }
  await browser.close();

  const verify = d.slides.flatMap((s) => (s.verify || []).map((v) => `- ${s.heading}: ${v}`));
  const cap = `${d.title}\n${d.subtitle || ''}\n\n${d.slides.map((s) => `▶ ${s.heading}`).join('\n')}\n\n※ ${d.disclaimer}\n\n참고: ${d.sources.map((s) => s.name).join(', ')}\n\n${d.hashtags || ''} #아이톡톡\n`;
  fs.writeFileSync(path.join(dir, 'caption.txt'), (draft ? '【초안 — 아래 확인 전에는 게시하지 마세요】\n\n' : '') + cap);
  if (draft) fs.writeFileSync(path.join(dir, 'VERIFY.txt'), `원문 확인이 필요한 항목\n(출처를 직접 열어 확인한 뒤 JSON의 sources[].verified를 true로 바꾸고 다시 생성하세요)\n\n출처:\n${d.sources.map((s) => `- ${s.name} ${s.url}`).join('\n')}\n\n항목:\n${verify.join('\n') || '(없음)'}\n`);
  console.log(`${out.length}장 → ${path.relative(ROOT, dir)}${draft ? '  [초안: 원문 확인 전]' : ''}`);
})();
