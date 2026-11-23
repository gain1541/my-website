(() => {
  const CATS = [
    { id: 'diaper', label: '기저귀' },
    { id: 'formula', label: '분유' },
    { id: 'pacifier', label: '쪽쪽이' },
    { id: 'bottle', label: '분유병(젖병)' },
    { id: 'etc', label: '기타 용품' },
  ];
  const STAGE_ORDER = ['1단계(신생아)', '1단계', '2단계', '3단계', '4단계', '5단계', '0~6개월', '6~18개월', '전연령'];
  const JUDGES = ['cheap', 'normal', 'pricey', 'pending'];
  const JL = { cheap: '저렴', normal: '보통', pricey: '비쌈', pending: '기록 중' };
  const TIERS = [
    { id: '상', label: '상 (프리미엄)' },
    { id: '중', label: '중' },
    { id: '가성비', label: '가성비' },
  ];
  const tierClass = { '상': 'hi', '중': 'mid', '가성비': 'low' };
  const DAY = 86400000;
  const WINDOW_DAYS = 182; // 평균 산출 기간(약 6개월)
  const MIN_POINTS = 4; // 판단에 필요한 최소 기록 횟수
  const MIN_SPAN = 21; // 판단에 필요한 최소 기록 기간(일)
  const TH = 0.05; // 판단 임계값 5%
  const NAVER = 'https://search.shopping.naver.com/search/all?query=';
  const COUPANG = 'https://www.coupang.com/np/search?q=';

  const $ = (s) => document.querySelector(s);
  const won = (n) => Math.round(n).toLocaleString('ko-KR') + '원';
  const fmtU = (v) => (v >= 1000 ? Math.round(v).toLocaleString('ko-KR') : v.toFixed(1).replace(/\.0$/, ''));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const tierOf = (p) => (DB.brands[p.brand] || {}).tier;
  const tierTag = (t) => (t ? `<span class="tier ${tierClass[t]}">${esc(t)}</span>` : '');
  const unitLabel = (p) => `${p.basis}${p.unit}당`;
  const packPrice = (p, u) => Math.round((u * p.qty) / p.basis / 10) * 10; // 10원 단위 환산
  const pct = (d) => (d > 0 ? '+' : '') + (d * 100).toFixed(1) + '%';
  const uniq = (arr) => [...new Set(arr)];
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* 저장 불가 환경 */ } },
  };
  const naverUrl = (p) => (p.links && p.links.naver) || NAVER + encodeURIComponent(p.name);
  const coupangUrl = (p) => (p.links && p.links.coupang) || COUPANG + encodeURIComponent(p.name);

  const state = { cat: 'diaper', tier: new Set(), brand: new Set(), type: new Set(), stage: new Set(), judge: new Set(), q: '', sort: 'diff' };
  let DB = null;

  fetch('data/products.json')
    .then((r) => r.json())
    .then((db) => { DB = db; init(); })
    .catch(() => {
      $('#grid').innerHTML = '<p class="empty">데이터를 불러오지 못했어요. 잠시 뒤 새로고침해 주세요.</p>';
    });

  function analyze(p) {
    const h = (p.history || []).slice().sort((a, b) => a.d.localeCompare(b.d));
    if (!h.length) return { none: true, judge: 'pending', h };
    const last = h[h.length - 1];
    const lastT = Date.parse(last.d);
    const win = h.filter((x) => lastT - Date.parse(x.d) <= WINDOW_DAYS * DAY);
    const avg = win.reduce((a, x) => a + x.u, 0) / win.length;
    const vals = h.map((x) => x.u);
    const min = Math.min(...vals), max = Math.max(...vals);
    const span = (lastT - Date.parse(h[0].d)) / DAY;
    const pending = h.length < MIN_POINTS || span < MIN_SPAN;
    const cur = last.u;
    const diff = (cur - avg) / avg;
    const judge = pending ? 'pending' : diff <= -TH ? 'cheap' : diff >= TH ? 'pricey' : 'normal';
    return { h, cur, date: last.d, seller: last.s || '', avg, min, max, diff, judge, count: h.length, nearMin: !pending && cur <= min * 1.02 };
  }

  function init() {
    DB.products.forEach((p) => { p.a = analyze(p); });
    const savedCat = store.get('cat');
    if (CATS.some((c) => c.id === savedCat)) state.cat = savedCat;
    const savedSort = store.get('sort');
    if (['diff', 'unit', 'name'].includes(savedSort)) { state.sort = savedSort; $('#sort').value = savedSort; }

    const withData = DB.products.filter((p) => !p.a.none);
    const nt = $('#noticeText');
    let msg = '';
    if (!withData.length) msg = '📝 제품 목록만 먼저 공개했어요. <b>가격은 수집이 시작되면 표시</b>돼요.';
    else if (withData.every((p) => p.a.judge === 'pending')) msg = `📈 가격 기록을 쌓는 중이에요. <b>${MIN_POINTS}회 이상, 3주 이상</b> 쌓이면 싼지 비싼지 알려드려요.`;
    if (msg && store.get('noticeClosed') !== msg) {
      nt.innerHTML = msg; $('#sampleNotice').hidden = false;
      $('#noticeClose').addEventListener('click', () => { $('#sampleNotice').hidden = true; store.set('noticeClosed', msg); });
    }

    $('#tabs').innerHTML = CATS.map((c) => `<button class="tab" data-cat="${c.id}">${c.label}</button>`).join('');
    $('#tabs').addEventListener('click', (e) => {
      const b = e.target.closest('.tab');
      if (!b) return;
      state.cat = b.dataset.cat; store.set('cat', state.cat);
      clearFilters(false);
      render();
      window.scrollTo({ top: 0 });
    });
    $('#q').addEventListener('input', (e) => { state.q = e.target.value.trim(); renderList(); });
    $('#sort').addEventListener('change', (e) => { state.sort = e.target.value; store.set('sort', state.sort); renderList(); });
    ['#reset', '#resetM', '#emptyReset'].forEach((id) => $(id).addEventListener('click', () => { clearFilters(true); render(); }));
    $('#applyM').addEventListener('click', closeLayer);
    $('#sheetClose').addEventListener('click', closeLayer);
    $('#openFilter').addEventListener('click', openSheet);
    $('#side').addEventListener('click', (e) => { if (e.target.id === 'side') closeLayer(); });

    const keys = { fBrand: 'brand', fTier: 'tier', fType: 'type', fStage: 'stage', fJudge: 'judge' };
    Object.keys(keys).forEach((id) => {
      $('#' + id).addEventListener('click', (e) => {
        const b = e.target.closest('.chip');
        if (b) toggle(keys[id], b.dataset.v);
      });
    });
    $('#quick').addEventListener('click', (e) => {
      const b = e.target.closest('.chip');
      if (!b) return;
      if (b.dataset.v === '') { state.brand.clear(); render(); } else toggle('brand', b.dataset.v);
    });
    $('#active').addEventListener('click', (e) => {
      const b = e.target.closest('.achip');
      if (b) toggle(b.dataset.k, b.dataset.v);
    });

    const open = (card) => { if (card) openModal(card.dataset.id); };
    $('#grid').addEventListener('click', (e) => { if (!e.target.closest('a')) open(e.target.closest('.card')); });
    $('#grid').addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('card')) { e.preventDefault(); open(e.target); }
    });
    $('#mClose').addEventListener('click', closeLayer);
    $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeLayer(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLayer(); });
    window.addEventListener('popstate', hideAll);

    // 맨 위로 버튼
    const fab = $('#toTop');
    const stick = $('#stick');
    let lastY = 0;
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      fab.hidden = y < 700;
      // 아래로 스크롤하면 상단 바를 숨기고, 위로 올리면 다시 보여줘서 화면을 넓게 씁니다
      if (y > lastY + 8 && y > 240) stick.classList.add('hide');
      else if (y < lastY - 8 || y <= 240) stick.classList.remove('hide');
      lastY = y;
    }, { passive: true });
    fab.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    // 브랜드 특징: 데스크톱은 펼침, 모바일은 접힘
    const mq = window.matchMedia('(min-width: 900px)');
    const syncBrandBox = () => { $('#brandInfo').open = mq.matches; };
    syncBrandBox();
    (mq.addEventListener ? mq.addEventListener('change', syncBrandBox) : mq.addListener(syncBrandBox));

    render();
  }

  function toggle(key, v) {
    const set = state[key];
    set.has(v) ? set.delete(v) : set.add(v);
    render();
  }
  function clearFilters(withSearch) {
    state.brand.clear(); state.type.clear(); state.stage.clear(); state.tier.clear(); state.judge.clear();
    if (withSearch) { state.q = ''; $('#q').value = ''; }
  }

  // 시트/상세 열기·닫기 (모바일 뒤로가기 버튼으로 닫히도록 history 사용)
  function pushLayer(k) { try { history.pushState({ layer: k }, ''); } catch (e) { /* 무시 */ } }
  function hideAll() {
    $('#modal').hidden = true;
    $('#side').classList.remove('open');
    document.body.style.overflow = '';
  }
  function closeLayer() {
    if (history.state && history.state.layer) history.back(); else hideAll();
  }
  function openSheet() {
    $('#side').classList.add('open');
    document.body.style.overflow = 'hidden';
    pushLayer('sheet');
  }

  const inCat = () => DB.products.filter((p) => p.cat === state.cat);

  function chips(id, values, set, labelFn) {
    $('#' + id).innerHTML = values.map((v) =>
      `<button class="chip ${set.has(v) ? 'on' : ''}" data-v="${esc(v)}" aria-pressed="${set.has(v)}">${esc(labelFn ? labelFn(v) : v)}</button>`).join('');
  }

  function render() {
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('on', t.dataset.cat === state.cat));
    const list = inCat();
    const brands = uniq(list.map((p) => p.brand));
    chips('fBrand', brands, state.brand);
    chips('fTier', TIERS.map((t) => t.id), state.tier, (v) => TIERS.find((t) => t.id === v).label);
    chips('fType', uniq(list.map((p) => p.type)), state.type);
    const stages = uniq(list.map((p) => p.stage)).sort((a, b) => STAGE_ORDER.indexOf(a) - STAGE_ORDER.indexOf(b));
    chips('fStage', stages, state.stage);
    $('#fStage').parentElement.hidden = stages.length <= 1;
    chips('fJudge', JUDGES, state.judge, (v) => JL[v]);
    $('#quick').innerHTML = `<button class="chip ${state.brand.size ? '' : 'on'}" data-v="">전체</button>` +
      brands.map((b) => `<button class="chip ${state.brand.has(b) ? 'on' : ''}" data-v="${esc(b)}">${esc(b)}</button>`).join('');
    renderBrands(brands);
    renderList();
  }

  function renderBrands(all) {
    const names = state.brand.size ? [...state.brand] : all;
    $('#brandCount').textContent = `(${names.length})`;
    $('#brands').innerHTML = names.map((n) => {
      const b = DB.brands[n];
      if (!b) return '';
      return `<div class="brand"><h3>${esc(n)} ${tierTag(b.tier)}</h3><div class="tag">${esc(b.tagline)}</div><ul>${b.pros.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
    }).join('');
  }

  // 날짜 축 기준 미니 그래프
  function spark(h, w = 220, ht = 34) {
    const t0 = Date.parse(h[0].d), t1 = Date.parse(h[h.length - 1].d);
    const vs = h.map((x) => x.u);
    const lo = Math.min(...vs), hi = Math.max(...vs), rng = hi - lo || 1;
    const pts = h.map((x) => [t1 > t0 ? ((Date.parse(x.d) - t0) / (t1 - t0)) * w : w / 2, ht - 4 - ((x.u - lo) / rng) * (ht - 8)]);
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    const last = pts[pts.length - 1];
    return `<svg class="spark" viewBox="0 0 ${w} ${ht}" preserveAspectRatio="none" aria-hidden="true"><path d="${d}" fill="none" stroke="#9b8cff" stroke-width="2" vector-effect="non-scaling-stroke"/><circle cx="${last[0]}" cy="${last[1]}" r="3.5" fill="#ff8a65"/></svg>`;
  }

  function renderActive() {
    const items = [];
    state.tier.forEach((v) => items.push(['tier', v, TIERS.find((t) => t.id === v).label]));
    state.type.forEach((v) => items.push(['type', v, v]));
    state.stage.forEach((v) => items.push(['stage', v, v]));
    state.judge.forEach((v) => items.push(['judge', v, JL[v]]));
    $('#active').innerHTML = items.map(([k, v, l]) => `<button class="achip" data-k="${k}" data-v="${esc(v)}" aria-label="${esc(l)} 필터 해제">${esc(l)} ✕</button>`).join('');
    const n = items.length + state.brand.size;
    const fc = $('#fCount');
    fc.hidden = n === 0; fc.textContent = n;
  }

  function renderList() {
    renderActive();
    const list = inCat().filter((p) => {
      if (state.brand.size && !state.brand.has(p.brand)) return false;
      if (state.tier.size && !state.tier.has(tierOf(p))) return false;
      if (state.type.size && !state.type.has(p.type)) return false;
      if (state.stage.size && !state.stage.has(p.stage)) return false;
      if (state.judge.size && !state.judge.has(p.a.judge)) return false;
      if (state.q && !(p.name + p.brand).toLowerCase().includes(state.q.toLowerCase())) return false;
      return true;
    });
    // 가격 정보가 없는 제품은 항상 뒤로
    const by = (fn) => (a, b) => (!!a.a.none - !!b.a.none) || (a.a.none ? a.name.localeCompare(b.name, 'ko') : fn(a, b));
    const sorters = {
      diff: by((a, b) => (a.a.judge === 'pending' ? 1 : 0) - (b.a.judge === 'pending' ? 1 : 0) || a.a.diff - b.a.diff),
      unit: by((a, b) => a.a.cur - b.a.cur),
      name: (a, b) => a.name.localeCompare(b.name, 'ko'),
    };
    list.sort(sorters[state.sort]);
    $('#count').textContent = `${list.length}개 제품`;
    $('#applyM').textContent = list.length ? `${list.length}개 제품 보기` : '조건에 맞는 제품 없음';
    $('#empty').hidden = list.length > 0;
    $('#grid').innerHTML = list.map((p) => {
      const a = p.a;
      const link = `<a class="mini" target="_blank" rel="noopener noreferrer" href="${esc(naverUrl(p))}">네이버 가격 보기 ↗</a>`;
      const top = (badge) => `<div class="c-top"><span class="brandname">${esc(p.brand)} ${tierTag(tierOf(p))}</span>${badge}</div><h3>${esc(p.name)}</h3>`;
      if (a.none) {
        return `<article class="card nodata" data-id="${p.id}" tabindex="0" role="button" aria-label="${esc(p.name)} 상세 보기">${top('<span class="badge pending">대기</span>')}
          <div class="c-mid"><span class="price none">가격 수집 전</span></div>
          <div class="c-bot"><span class="unit">현재 가격은 링크에서 확인하세요</span>${link}</div></article>`;
      }
      const note = a.judge === 'pending'
        ? `<span class="diff pending">기록 ${a.count}회 · ${MIN_POINTS}회부터 판단</span>`
        : `<span class="diff ${a.judge}">평균 대비 ${pct(a.diff)}</span>${a.nearMin ? ' <span class="low">최저가 근접</span>' : ''}`;
      return `<article class="card" data-id="${p.id}" tabindex="0" role="button" aria-label="${esc(p.name)} 상세 보기">${top(`<span class="badge ${a.judge}">${JL[a.judge]}</span>`)}
        <div class="c-mid"><span class="price"><small>${unitLabel(p)}</small>${fmtU(a.cur)}원</span>${a.count > 1 ? spark(a.h) : ''}</div>
        <div class="unit">${p.qty.toLocaleString('ko-KR')}${p.unit} 약 ${won(packPrice(p, a.cur))}${a.seller ? ` · ${esc(a.seller)}` : ''} · ${a.date.slice(5).replace('-', '/')} 기준</div>
        <div class="c-bot"><span>${note}</span>${link}</div>
      </article>`;
    }).join('');
  }

  function chart(a) {
    const W = 640, H = 240, L = 52, R = 12, T = 12, B = 28;
    const h = a.h;
    const t0 = Date.parse(h[0].d), t1 = Date.parse(h[h.length - 1].d);
    const lo = Math.min(a.min, a.avg) * 0.97, hi = a.max * 1.03, rng = hi - lo || 1;
    const x = (d) => (t1 > t0 ? L + ((Date.parse(d) - t0) / (t1 - t0)) * (W - L - R) : (L + W - R) / 2);
    const y = (v) => T + (1 - (v - lo) / rng) * (H - T - B);
    const d = h.map((p, k) => (k ? 'L' : 'M') + x(p.d).toFixed(1) + ' ' + y(p.u).toFixed(1)).join(' ');
    let grid = '';
    for (let k = 0; k <= 3; k++) {
      const v = lo + (rng * k) / 3;
      grid += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="#eadfda" stroke-dasharray="3 3"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end" font-size="12" fill="#68657a">${fmtU(v)}</text>`;
    }
    const minP = h.find((p) => p.u === a.min);
    const lastP = h[h.length - 1];
    const ticks = uniq([h[0].d, lastP.d]);
    const xt = ticks.map((dt, i) => `<text x="${x(dt)}" y="${H - 8}" text-anchor="${ticks.length === 1 ? 'middle' : i === 0 ? 'start' : 'end'}" font-size="12" fill="#68657a">${dt.slice(2)}</text>`).join('');
    const dots = h.map((p) => `<circle cx="${x(p.d)}" cy="${y(p.u)}" r="3" fill="#7c6cf0"/>`).join('');
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="단가 추이 그래프">
      ${grid}
      <line x1="${L}" x2="${W - R}" y1="${y(a.avg)}" y2="${y(a.avg)}" stroke="#e8643b" stroke-dasharray="5 4"/>
      <text x="${W - R}" y="${y(a.avg) - 5}" text-anchor="end" font-size="12" fill="#e8643b">평균 ${fmtU(a.avg)}원</text>
      <path d="${d}" fill="none" stroke="#7c6cf0" stroke-width="2.4" stroke-linejoin="round"/>
      ${dots}
      <circle cx="${x(minP.d)}" cy="${y(minP.u)}" r="5" fill="#23805f"/>
      <circle cx="${x(lastP.d)}" cy="${y(lastP.u)}" r="5.5" fill="#e8643b"/>
      ${xt}
    </svg>`;
  }

  function openModal(id) {
    const p = DB.products.find((x) => x.id === id);
    const a = p.a;
    const b = DB.brands[p.brand];
    const head = `<div class="brandname">${esc(p.brand)} ${tierTag(tierOf(p))}</div><h2 id="mTitle">${esc(p.name)}</h2>`;
    const btns = `<div class="btns"><a class="btn primary" target="_blank" rel="noopener noreferrer" href="${esc(naverUrl(p))}">네이버 가격 비교</a><a class="btn" target="_blank" rel="noopener noreferrer" href="${esc(coupangUrl(p))}">쿠팡에서 보기</a></div>`;
    const brandBox = b ? `<div class="binfo"><b>${esc(p.brand)}</b> ${tierTag(b.tier)} · ${esc(b.tagline)}<ul>${b.pros.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : '';

    if (a.none) {
      $('#mBody').innerHTML = `${head}
        <div class="verdict pending">아직 가격이 등록되지 않았어요. 아래 버튼으로 현재 가격을 직접 확인해 보세요.</div>
        ${brandBox}${btns}`;
    } else {
      const verdictText = {
        pending: `가격 기록이 ${a.count}회예요. ${MIN_POINTS}회 이상, 3주 이상 쌓이면 평균과 비교해 싼지 비싼지 알려드려요.`,
        cheap: `지금 단가가 평균보다 ${Math.abs(a.diff * 100).toFixed(1)}% 저렴해요. 사기 좋은 타이밍이에요.`,
        normal: `지금 단가는 평균과 비슷한 수준이에요(${pct(a.diff)}). 급하지 않다면 추이를 더 지켜봐도 좋아요.`,
        pricey: `지금 단가가 평균보다 ${(a.diff * 100).toFixed(1)}% 비싸요. 급하지 않다면 조금 기다려 보세요.`,
      }[a.judge];
      const rows = a.h.slice().reverse().slice(0, 10);
      $('#mBody').innerHTML = `${head}
        <div class="verdict ${a.judge}">${verdictText}</div>
        <div class="stats">
          <div class="stat"><small>현재 ${unitLabel(p)}</small><b>${fmtU(a.cur)}원</b></div>
          <div class="stat"><small>평균(최근 6개월)</small><b>${fmtU(a.avg)}원</b></div>
          <div class="stat"><small>기록 중 최저</small><b>${fmtU(a.min)}원</b></div>
          <div class="stat"><small>${p.qty.toLocaleString('ko-KR')}${p.unit} 기준 환산</small><b>약 ${won(packPrice(p, a.cur))}</b></div>
        </div>
        ${a.count > 1 ? chart(a) : ''}
        <p class="basis">배송비를 포함한 시장 최저가를 ${unitLabel(p)} 가격으로 환산한 값이에요. 기준일 ${esc(a.date)}${a.seller ? ` · ${esc(a.seller)}` : ''}</p>
        <table><thead><tr><th>기준일</th><th class="r">${unitLabel(p)} 가격</th><th class="r">판매처</th></tr></thead><tbody>
          ${rows.map((r) => `<tr><td>${esc(r.d)}</td><td class="r">${fmtU(r.u)}원</td><td class="r">${esc(r.s || '-')}</td></tr>`).join('')}
        </tbody></table>${brandBox}${btns}`;
    }
    $('#modal').hidden = false;
    $('.sheet').scrollTop = 0;
    document.body.style.overflow = 'hidden';
    pushLayer('modal');
  }
})();
