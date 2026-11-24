#!/usr/bin/env node
/*
 * 아이톡톡 점검 스크립트 (회귀 방지용)
 *   node scripts/audit.js            데이터 점검 + 화면 점검
 *   node scripts/audit.js --data     데이터 점검만(브라우저 불필요)
 * 화면 점검에는 Playwright가 필요합니다. 접근성(axe)은 axe-core가 있으면 실행하고,
 * 없으면 건너뜁니다(경로는 환경변수 AXE_PATH로 지정 가능).
 * 실패(FAIL)가 하나라도 있으면 종료 코드 1, 경고(WARN)는 종료 코드에 영향 없음.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '..');
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/products.json'), 'utf8'));
const fails = [], warns = [];
const FAIL = (m) => { fails.push(m); console.log('  ✗ FAIL', m); };
const WARN = (m) => { warns.push(m); console.log('  ! WARN', m); };
const OK = (m) => console.log('  ✓', m);
const median = (a) => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

function auditData() {
  console.log('\n[데이터]');
  const P = DATA.products;
  const ids = new Set();
  P.forEach((p) => {
    if (ids.has(p.id)) FAIL(`중복 id ${p.id}`);
    ids.add(p.id);
    (p.history || []).forEach((h) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(h.d)) FAIL(`${p.id} 날짜 형식 오류 ${h.d}`);
      if (!(h.u > 0)) FAIL(`${p.id} 단가 오류 ${h.u}`);
    });
    if (!p.qty || !p.unit) FAIL(`${p.id} 수량/단위 누락`);
    if (!DATA.brands[p.brand]) WARN(`${p.id} 브랜드 정보 없음: ${p.brand}`);
  });
  OK(`제품 ${P.length}개, id 중복·형식 점검 완료`);

  // 기준일 경과
  const dates = P.flatMap((p) => (p.history || []).map((h) => h.d)).sort();
  const last = dates[dates.length - 1];
  const days = Math.round((Date.now() - Date.parse(last)) / 864e5);
  if (days > 14) WARN(`가격 기준일 ${last} (${days}일 경과) - 갱신 필요`);
  else if (days > 7) WARN(`가격 기준일 ${last} (${days}일 경과)`);
  else OK(`가격 기준일 ${last} (${days}일 전)`);

  // 가격 없는 제품, 참고값
  const none = P.filter((p) => !(p.history || []).length);
  if (none.length) WARN(`가격 없는 제품 ${none.length}개: ${none.map((p) => p.id).join(', ')}`);
  const refs = P.filter((p) => /참고/.test(((p.history || []).slice(-1)[0] || {}).s || ''));
  if (refs.length) OK(`'(참고)' 값 ${refs.length}개: ${refs.map((p) => p.id).join(', ')}`);

  // 월령 미확인(분유·쪽쪽이)
  ['formula', 'pacifier'].forEach((c) => {
    const miss = P.filter((p) => p.cat === c && !p.months);
    if (miss.length) WARN(`${c} 월령 미확인 ${miss.length}/${P.filter((p) => p.cat === c).length}개`);
  });

  // 링크 중복·누락
  const seen = {};
  P.forEach((p) => {
    const u = p.links && p.links.coupang;
    if (!u) { WARN(`${p.id} 쿠팡 링크 없음`); return; }
    (seen[u] = seen[u] || []).push(p.id);
  });
  Object.entries(seen).filter(([, v]) => v.length > 1).forEach(([, v]) => WARN(`쿠팡 링크 중복: ${v.join(', ')}`));
  P.forEach((p) => {
    const n = p.links && p.links.naver;
    if (n && !/^https:\/\/(search\.shopping\.naver\.com|naver\.me|msearch\.shopping\.naver\.com)/.test(n)) WARN(`${p.id} 네이버 링크 형식 확인: ${n.slice(0, 50)}`);
  });

  // 단가 이상치(같은 종류·단계 중앙값의 3배 초과 또는 1/3 미만)
  const groups = {};
  P.filter((p) => (p.history || []).length).forEach((p) => {
    const k = `${p.cat}|${p.type}|${p.stage}`;
    (groups[k] = groups[k] || []).push(p);
  });
  Object.values(groups).filter((g) => g.length >= 3).forEach((g) => {
    const m = median(g.map((p) => p.history.slice(-1)[0].u));
    g.forEach((p) => { const u = p.history.slice(-1)[0].u; if (u > m * 3 || u < m / 3) WARN(`${p.id} 단가 이상치 ${u} (그룹 중앙값 ${m})`); });
  });
  OK('링크·단가 이상치 점검 완료');
}

function serve() {
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg' };
  const srv = http.createServer((req, res) => {
    let f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    if (f.endsWith(path.sep) || req.url.split('?')[0] === '/') f = path.join(ROOT, 'index.html');
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise((r) => srv.listen(0, () => r(srv)));
}

async function auditUI() {
  let chromium;
  try { ({ chromium } = require('playwright')); } catch (e) { WARN('playwright 없음 - 화면 점검 건너뜀'); return; }
  let axeSrc = null;
  try { axeSrc = require(process.env.AXE_PATH || 'axe-core').source; } catch (e) { WARN('axe-core 없음 - 접근성 점검 건너뜀(AXE_PATH 지정 가능)'); }
  const srv = await serve();
  const base = `http://localhost:${srv.address().port}/`;
  const browser = await chromium.launch();

  const axe = async (page, label) => {
    if (!axeSrc) return;
    await page.addScriptTag({ content: axeSrc });
    const r = await page.evaluate(() => axe.run());
    const bad = r.violations.filter((v) => ['serious', 'critical'].includes(v.impact));
    bad.length ? FAIL(`axe ${label}: ${bad.map((v) => v.id).join(', ')}`) : OK(`axe ${label}: serious 이상 0건`);
  };

  for (const [name, vp, mobile] of [['모바일 390', { width: 390, height: 844 }, true], ['데스크톱 1280', { width: 1280, height: 900 }, false]]) {
    console.log(`\n[화면 - ${name}]`);
    const ctx = await browser.newContext({ viewport: vp, hasTouch: mobile, isMobile: mobile });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));
    await page.goto(base);
    await page.waitForSelector('.card');
    const cards = await page.$$eval('.card', (e) => e.length);
    cards ? OK(`카드 ${cards}개 표시`) : FAIL('카드가 표시되지 않음');

    await axe(page, '메인');

    // 검색 회귀
    const q = async (cat, term) => {
      await page.click(`.tab[data-cat=${cat}]`);
      await page.fill('#q', term);
      await page.waitForTimeout(80);
      const n = await page.$$eval('.card', (e) => e.length);
      await page.fill('#q', '');
      return n;
    };
    for (const [cat, term, min] of [['diaper', '기저귀', 1], ['pacifier', '공갈', 1], ['nipple', '니플', 1], ['etc', '소독', 1], ['formula', '분유', 1]]) {
      const n = await q(cat, term);
      n >= min ? OK(`검색 '${term}'(${cat}) → ${n}개`) : FAIL(`검색 '${term}'(${cat}) 결과 ${n}개`);
    }
    await page.click('.tab[data-cat=diaper]');

    // 상세 모달: 포커스 진입·복귀
    await page.focus('.card-open');
    await page.keyboard.press('Enter');
    await page.waitForSelector('#modal:not([hidden])');
    await page.waitForTimeout(120);
    (await page.evaluate(() => document.activeElement && document.activeElement.id === 'mClose')) ? OK('모달 열면 포커스가 닫기 버튼으로 이동') : FAIL('모달 포커스 이동 실패');
    await axe(page, '상세 모달');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    (await page.evaluate(() => document.activeElement && document.activeElement.classList.contains('card-open'))) ? OK('닫으면 포커스가 카드로 복귀') : FAIL('모달 닫은 뒤 포커스 복귀 실패');

    // 월령 가이드
    await page.click('#openGuide');
    await page.waitForSelector('#gBody .gsec');
    await axe(page, '월령 가이드');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);

    // 필터 시트(모바일)
    if (mobile) {
      await page.click('#openFilter');
      await page.waitForTimeout(150);
      await axe(page, '필터 시트');
      await page.click('#sheetClose');
      await page.waitForTimeout(150);
    }

    // 공유 링크
    const pid = DATA.products[0].id;
    await page.goto(`${base}?p=${pid}`);
    await page.waitForSelector('#modal:not([hidden])');
    OK(`공유 링크 ?p=${pid} → 상세 열림`);
    await page.goto(base);
    await page.waitForSelector('.card');

    // 모바일: 터치 영역·글자 크기
    if (mobile) {
      const m = await page.evaluate(() => {
        const bad = [], fs = [];
        document.querySelectorAll('a,button,select,summary,input').forEach((e) => {
          const r = e.getBoundingClientRect();
          if (r.width && r.height < 44 && !e.closest('[hidden]') && getComputedStyle(e).visibility !== 'hidden' && !e.matches('.inq-hp *, .sr *')) bad.push((e.id || e.className || e.tagName) + ':' + Math.round(r.height));
        });
        document.querySelectorAll('body *').forEach((e) => {
          if ([...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && e.getBoundingClientRect().width && parseFloat(getComputedStyle(e).fontSize) < 12) fs.push(e.className || e.tagName);
        });
        return { bad: [...new Set(bad)], fs: [...new Set(fs)] };
      });
      m.bad.length ? WARN(`터치 영역 44px 미만: ${m.bad.join(', ')}`) : OK('터치 영역 44px 이상');
      m.fs.length ? WARN(`12px 미만 글자: ${m.fs.join(', ')}`) : OK('글자 12px 이상');
    }
    errs.length ? FAIL(`페이지 오류: ${errs.join(' | ')}`) : OK('페이지 오류 없음');
    await ctx.close();
  }
  await browser.close();
  srv.close();
}

(async () => {
  auditData();
  if (!process.argv.includes('--data')) await auditUI();
  console.log(`\n결과: FAIL ${fails.length}건, WARN ${warns.length}건`);
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
