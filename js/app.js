(() => {
  const CATS = [
    { id: 'diaper', label: '기저귀' },
    { id: 'formula', label: '분유' },
    { id: 'pacifier', label: '쪽쪽이' },
    { id: 'bottle', label: '분유병(젖병)' },
    { id: 'nipple', label: '젖꼭지(젖병용)' },
    { id: 'etc', label: '기타 용품' },
  ];
  const STAGE_ORDER = ['1단계(신생아)', '1단계', '2단계', '3단계', '4단계', '5단계', '대형(L)', '0~6개월', '6~12개월', '6~16개월', '6~18개월', 'SS', 'S', 'M', 'L', 'LL', '3L', '전연령'];
  const JUDGES = ['cheap', 'normal', 'pricey', 'pending'];
  // 필터·선택칩에서는 '평소 대비'임을 분명히 하는 긴 라벨을 씁니다.
  const JF = { cheap: '평소보다 저렴', normal: '평소 수준', pricey: '평소보다 비쌈', pending: '비교 준비 중' };
  const JL = { cheap: '저렴', normal: '보통', pricey: '비쌈', pending: '기록 중' };
  const TIERS = [
    { id: '상', label: '프리미엄' },
    { id: '중', label: '일반' },
    { id: '가성비', label: '가성비' },
  ];
  const tierLabel = (id) => (TIERS.find((x) => x.id === id) || {}).label || id;
  const tierClass = { '상': 'hi', '중': 'mid', '가성비': 'low' };
  const DAY = 86400000;
  const WINDOW_DAYS = 182; // 평균 산출 기간(약 6개월)
  const MIN_POINTS = 4; // 판단에 필요한 최소 기록 횟수
  const MIN_SPAN = 21; // 판단에 필요한 최소 기록 기간(일)
  const TH = 0.05; // 판단 임계값 5%
  // 쿠팡 파트너스 안내 문구: 약관의 정확한 표현으로 바꿔 사용하세요.
  const AFF_TEXT = '이 사이트는 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.';
  const NAVER = 'https://search.shopping.naver.com/search/all?query=';
  const COUPANG = 'https://www.coupang.com/np/search?q=';

  const $ = (s) => document.querySelector(s);
  const won = (n) => Math.round(n).toLocaleString('ko-KR') + '원';
  const fmtU = (v) => (v >= 1000 ? Math.round(v).toLocaleString('ko-KR') : v.toFixed(1).replace(/\.0$/, ''));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const tierOf = (p) => (DB.brands[p.brand] || {}).tier;
  const tierTag = (t) => (t ? `<span class="tier ${tierClass[t]}" title="브랜드 등급">${esc(tierLabel(t))}</span>` : '');
  const unitLabel = (p) => `${p.basis}${p.unit}당`;
  const packPrice = (p, u) => Math.round((u * p.qty) / p.basis / 10) * 10; // 10원 단위 환산
  const pct = (d) => (d > 0 ? '+' : '') + (d * 100).toFixed(1) + '%';
  const uniq = (arr) => [...new Set(arr)];
  const md = (d) => d.slice(5).replace('-', '/');
  // 전 기록 대비 변동(두 번째 기록부터). 초록·빨강은 '지금 가격' 판단 배지 전용이라 중립색 + 화살표로만 표시
  function chgInfo(a) {
    if (!a || a.count < 2) return null;
    const pv = a.h[a.h.length - 2], d = a.cur - pv.u, s = fmtU(Math.abs(d));
    if (s === '0') return { dir: 'flat', date: md(pv.d), txt: '' };
    return { dir: d > 0 ? 'up' : 'down', date: md(pv.d), txt: s + '원' };
  }
  const chgLong = (a) => {
    const c = chgInfo(a); if (!c) return '';
    if (c.dir === 'flat') return `<span class="chg flat">전 기록(${c.date})과 같아요</span>`;
    return `<span class="chg ${c.dir}"><span aria-hidden="true">${c.dir === 'up' ? '▲' : '▼'}</span> 전 기록(${c.date}) 대비 ${c.txt} ${c.dir === 'up' ? '오름' : '내림'}</span>`;
  };
  const chgShort = (a) => {
    const c = chgInfo(a); if (!c) return '<span class="muted">-</span>';
    if (c.dir === 'flat') return '<span class="chg flat">변동 없음</span>';
    return `<span class="chg ${c.dir}"><span aria-hidden="true">${c.dir === 'up' ? '▲' : '▼'}</span> ${c.txt}<span class="sr"> ${c.dir === 'up' ? '오름' : '내림'}</span></span>`;
  };
  const originTag = (p) => (p.origin ? `<span class="age orig">${esc(p.origin)} · 배송비 포함</span>` : '');
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* 저장 불가 환경 */ } },
  };
  const naverUrl = (p) => (p.links && p.links.naver) || NAVER + encodeURIComponent(p.name);
  const coupangUrl = (p) => (p.links && p.links.coupang) || COUPANG + encodeURIComponent(p.name);

  // 검색 별칭: 부모가 실제로 치는 말(기저귀·공갈·분유…)로도 찾히게 합니다.
  const CAT_ALIAS = {
    diaper: '기저귀 팬티 밴드 신생아',
    formula: '분유 우유 밀크',
    pacifier: '쪽쪽이 공갈 공갈젖꼭지 노리개 노리개젖꼭지',
    bottle: '젖병 분유병 수유',
    nipple: '젖꼭지 젖병젖꼭지 니플 수유',
    etc: '',
  };
  const TYPE_ALIAS = { '물티슈': '물티슈 와이프 티슈', '로션·크림': '로션 크림 보습 스킨케어', '젖병 소독기': '소독기 살균 자외선 uv 건조 소독', '주방세제': '세정제 젖병세정제 젖병 세척 설거지 식기', '체온계': '체온 열 귀체온계 적외선' };
  const blobOf = (p) => {
    if (!p._s) {
      p._s = [p.name, p.brand, p.type, p.stage, p.age, p.fits, p.includes, p.origin, CAT_ALIAS[p.cat], TYPE_ALIAS[p.type]].filter(Boolean).join(' ').toLowerCase();
      p._sn = p._s.replace(/\s+/g, '');
    }
    return p._s;
  };
  const matches = (p, q) => {
    blobOf(p);
    return q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => p._s.includes(w) || p._sn.includes(w));
  };

  const state = { cat: 'diaper', tier: new Set(), brand: new Set(), type: new Set(), stage: new Set(), judge: new Set(), q: '', sort: 'diff', view: 'card' };
  let DB = null;
  let reqUrl = '';
  let favs = new Set();
  let favOnly = false;
  let prevBrandCount = 0;

  fetch('data/products.json')
    .then((r) => r.json())
    .then((db) => { DB = db; init(); })
    .catch(() => {
      $('#grid').innerHTML = '<p class="empty">데이터를 불러오지 못했어요.<br><button type="button" class="btn" id="retry" style="margin-top:10px;padding:0 18px">다시 시도</button></p>';
      const rb = document.getElementById('retry'); if (rb) rb.addEventListener('click', () => location.reload());
    });

  // 제품명에 월령이 이미 들어 있으면 같은 월령 태그를 또 보여주지 않음
  const ageTag = (p) => (p.age && !p.name.includes(p.age.replace(/\(판매처 표기\)/, '')) ? p.age : '');
  // 판단 시작 예정일: 첫 기록일 + 최소 기간(주 1회 갱신 가정). 이미 지났으면 null
  function readyOn(a) {
    const d = new Date(Date.parse(a.h[0].d) + MIN_SPAN * DAY);
    if (d.getTime() <= Date.now()) return null;
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }
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
    // 요청·문의 폼 링크(주소가 있을 때만 표시)
    const ru = DB.site && DB.site.requestUrl;
    if (ru && /^https:\/\//.test(ru)) {
      reqUrl = ru;
      document.querySelectorAll('.req-link').forEach((a) => { a.href = ru; });
      document.querySelectorAll('.req-only').forEach((e) => { e.hidden = false; });
    }
    try { favs = new Set(JSON.parse(store.get('favs') || '[]')); } catch (e) { favs = new Set(); }
    const dates = DB.products.flatMap((p) => (p.history || []).map((x) => x.d)).sort();
    if (dates.length) {
      const last = dates[dates.length - 1], el = $('#asof');
      const t = new Date(); const today = Date.UTC(t.getFullYear(), t.getMonth(), t.getDate());
      const [yy, mm, dd] = last.split('-').map(Number);
      const days = Math.max(0, Math.round((today - Date.UTC(yy, mm - 1, dd)) / 864e5));
      const label = days === 0 ? '오늘' : `${days}일 전`;
      el.textContent = days > 14 ? `⚠ 가격 기준일 ${last.slice(5).replace('-', '/')} (${label}) · 지금과 다를 수 있어요`
        : `가격 기준일 ${last.slice(5).replace('-', '/')} (${label})`;
      el.classList.toggle('stale', days > 7);
      el.hidden = false;
    }
    $('#totals').textContent = `전체 ${DB.products.length}개 제품 · 가격 확인 ${DB.products.filter((p) => !p.a.none).length}개`;
    const savedCat = store.get('cat');
    if (CATS.some((c) => c.id === savedCat)) state.cat = savedCat;
    if (store.get('view') === 'table') state.view = 'table';
    const savedSort = store.get('sort');
    if (['diff', 'unit', 'name'].includes(savedSort)) { state.sort = savedSort; $('#sort').value = savedSort; }

    const withData = DB.products.filter((p) => !p.a.none);
    const nt = $('#noticeText');
    let msg = '';
    if (!withData.length) msg = '📝 제품 목록만 먼저 공개했어요. <b>가격은 수집이 시작되면 표시</b>돼요.';
    else if (withData.every((p) => p.a.judge === 'pending')) {
      // 가장 빠른 판단 시작 예정일(첫 기록일 + 최소 기간). 카드마다 반복하지 않고 여기서 한 번만 알려줍니다.
      const soon = new Date(Math.min(...withData.map((p) => Date.parse(p.a.h[0].d))) + MIN_SPAN * DAY);
      const when = soon.getTime() > Date.now() ? ` 가장 빠르면 <b>${soon.getMonth() + 1}/${soon.getDate()}경</b>부터예요.` : '';
      msg = `📈 가격 기록을 쌓는 중이에요. <b>${MIN_POINTS}회 이상, 3주 이상</b> 쌓이면 싼지 비싼지 알려드려요.${when}`;
    }
    if (msg && store.get('noticeClosed') !== msg) {
      nt.innerHTML = msg; $('#sampleNotice').hidden = false;
      $('#noticeClose').addEventListener('click', () => { $('#sampleNotice').hidden = true; store.set('noticeClosed', msg); });
    }

    $('#tabs').innerHTML = CATS.map((c) => `<button class="tab" data-cat="${c.id}">${c.label}</button>`).join('');
    $('#tabs').addEventListener('scroll', () => tabsHint(false), { passive: true });
    window.addEventListener('resize', () => tabsHint(false));
    $('#tabs').addEventListener('click', (e) => {
      const b = e.target.closest('.tab');
      if (!b) return;
      state.cat = b.dataset.cat; store.set('cat', state.cat);
      clearFilters(false);
      render();
      window.scrollTo({ top: 0 });
    });
    $('#crossNote').addEventListener('click', (e) => { const b = e.target.closest('.xcat'); if (b) switchCat(b.dataset.cat, true); });
    $('#emptySuggest').innerHTML = CATS.map((c) => `<button type="button" class="chip" data-cat="${c.id}">${esc(c.label)}</button>`).join('');
    $('#emptySuggest').addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (b) { state.q = ''; $('#q').value = ''; switchCat(b.dataset.cat, false); } });
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
    $('#grid').addEventListener('click', (e) => {
      const hb = e.target.closest('.heart');
      if (hb) { toggleFav(hb.dataset.fav); return; }
      if (!e.target.closest('a')) open(e.target.closest('.card, tr[data-id]'));
    });
    $('#favToggle').addEventListener('click', () => { favOnly = !favOnly; renderList(); });
    $('#viewToggle').addEventListener('click', (e) => {
      const b = e.target.closest('[data-view]'); if (!b || b.dataset.view === state.view) return;
      state.view = b.dataset.view; store.set('view', state.view); renderList();
    });
    $('#mClose').addEventListener('click', closeLayer);
    $('#openGuide').addEventListener('click', openGuide);
    $('#gClose').addEventListener('click', closeLayer);
    $('#guide').addEventListener('click', (e) => {
      if (e.target.id === 'guide') { closeLayer(); return; }
      const bb = e.target.closest('[data-b]');
      if (bb) { gBand = bb.dataset.b; renderGuide(); return; }
      const it = e.target.closest('.gitem');
      if (it) { $('#guide').hidden = true; openModal(it.dataset.id); }
    });
    $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeLayer(); const sb = e.target.closest('[data-share]'); if (sb) shareLink(sb.dataset.share); });
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
    fab.addEventListener('click', () => window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }));

    if (DB.products.some((p) => p.links && p.links.coupang)) {
      $('#affNote').textContent = AFF_TEXT; $('#affNote').hidden = false;
      // 카드에 쿠팡 버튼이 있으므로 목록 위에도 같은 안내를 한 번만 표시
      $('#affTop').textContent = AFF_TEXT; $('#affTop').hidden = false;
    }
    render();
    // 공유 링크(?p=제품ID)로 들어오면 해당 카테고리로 가서 상세를 엽니다
    try {
      const pid = new URLSearchParams(location.search).get('p');
      const tp = pid && DB.products.find((x) => x.id === pid);
      if (tp) {
        history.replaceState(null, '', location.pathname + location.hash);
        state.cat = tp.cat; store.set('cat', tp.cat); render();
        openModal(tp.id);
      }
    } catch (e) { /* 무시 */ }
  }

  function toggleFav(id) {
    favs.has(id) ? favs.delete(id) : favs.add(id);
    store.set('favs', JSON.stringify([...favs]));
    renderList();
  }
  function switchCat(cat, keepQuery) {
    state.cat = cat; store.set('cat', cat);
    clearFilters(false);
    if (!keepQuery) { state.q = ''; $('#q').value = ''; }
    render();
    window.scrollTo({ top: 0 });
  }
  function toggle(key, v) {
    const set = state[key];
    set.has(v) ? set.delete(v) : set.add(v);
    render();
  }
  function clearFilters(withSearch) {
    state.brand.clear(); state.type.clear(); state.stage.clear(); state.tier.clear(); state.judge.clear();
    if (withSearch) { state.q = ''; $('#q').value = ''; favOnly = false; }
  }

  // 시트/상세 열기·닫기 (모바일 뒤로가기 버튼으로 닫히도록 history 사용)
  function pushLayer(k, url) { try { history.pushState({ layer: k }, '', url || location.href); } catch (e) { /* 무시 */ } }
  // 레이어(상세·가이드·필터)가 열리면 배경을 비활성(inert)하고 포커스를 안으로 옮기며, 닫으면 처음 눌렀던 곳으로 돌려놓습니다.
  const BG_SEL = 'header.top, #sampleNotice, #stick, main, footer, #toTop';
  let lastOpener = null;
  function layerOpened(container, focusSel) {
    if (!lastOpener) lastOpener = document.activeElement;
    // 열린 레이어를 품은 영역(예: main 안의 필터 시트)은 inert 대상에서 뺍니다.
    const block = (e) => {
      if (!e.contains(container)) { e.setAttribute('inert', ''); return; }
      if (e !== container) Array.from(e.children).forEach(block);
    };
    document.querySelectorAll(BG_SEL).forEach(block);
    setTimeout(() => { const f = container.querySelector(focusSel); if (f) f.focus({ preventScroll: true }); }, 30);
  }
  function hideAll() {
    document.querySelectorAll('[inert]').forEach((e) => e.removeAttribute('inert'));
    if (lastOpener && lastOpener.isConnected && lastOpener.focus) lastOpener.focus({ preventScroll: true });
    lastOpener = null;
    $('#modal').hidden = true;
    $('#guide').hidden = true;
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
    layerOpened($('#side'), '#sheetClose');
  }

  const inCat = () => DB.products.filter((p) => p.cat === state.cat);

  function chips(id, values, set, labelFn) {
    $('#' + id).innerHTML = values.map((v) =>
      `<button class="chip ${set.has(v) ? 'on' : ''}" data-v="${esc(v)}" aria-pressed="${set.has(v)}">${esc(labelFn ? labelFn(v) : v)}</button>`).join('');
  }

  // 탭이 가로로 넘칠 때: 선택한 탭을 보이게 하고, 오른쪽에 더 있음을 표시
  function tabsHint(center) {
    const tb = $('#tabs'); if (!tb) return;
    const on = tb.querySelector('.tab.on');
    if (center && on) tb.scrollLeft = Math.max(0, on.offsetLeft - (tb.clientWidth - on.offsetWidth) / 2);
    const more = tb.scrollLeft + tb.clientWidth < tb.scrollWidth - 4;
    tb.classList.toggle('more', more);
  }
  function render() {
    document.body.dataset.cat = state.cat; // 카테고리별 포인트 색(CSS 변수)용
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('on', t.dataset.cat === state.cat));
    tabsHint(true);
    const list = inCat();
    const brands = uniq(list.map((p) => p.brand));
    chips('fBrand', brands, state.brand);
    chips('fTier', TIERS.map((t) => t.id), state.tier, (v) => TIERS.find((t) => t.id === v).label);
    // 브랜드를 고르면 종류·단계 칩도 그 브랜드의 것만 보여줍니다(이미 선택한 칩은 유지).
    const base = state.brand.size ? list.filter((p) => state.brand.has(p.brand)) : list;
    chips('fType', uniq([...base.map((p) => p.type), ...state.type]), state.type);
    // 쪽쪽이는 브랜드마다 월령 표기가 달라서, 단계 대신 공통 월령 구간(월령 가이드와 동일)으로 거릅니다.
    const isPac = state.cat === 'pacifier';
    const stages = isPac ? BANDS.map((x) => x.label) : uniq([...base.map((p) => p.stage), ...state.stage]).sort((a, b) => STAGE_ORDER.indexOf(a) - STAGE_ORDER.indexOf(b));
    chips('fStage', stages, state.stage);
    $('#fStage').parentElement.hidden = stages.length <= 1;
    $('#fStage').previousElementSibling.textContent = isPac ? '월령' : state.cat === 'nipple' ? '단계·사이즈' : '단계';
    chips('fJudge', JUDGES, state.judge, (v) => JF[v]);
    $('#quick').innerHTML = `<button class="chip ${state.brand.size ? '' : 'on'}" data-v="">전체</button>` +
      brands.map((b) => `<button class="chip ${state.brand.has(b) ? 'on' : ''}" data-v="${esc(b)}">${esc(b)}</button>`).join('');
    renderBrands(brands);
    if (state.brand.size !== prevBrandCount) { $('#brandInfo').open = state.brand.size > 0; prevBrandCount = state.brand.size; }
    // 모바일: 브랜드를 고르지 않았을 땐 '브랜드 특징'을 목록 아래로 보내 첫 화면에 제품이 보이게(CSS order)
    $('#brandInfo').classList.toggle('late', state.brand.size === 0);
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



  // ---------- 월령 가이드 ----------
  const BANDS = [
    { id: '0', label: '0~2개월', a: 0, b: 2 },
    { id: '1', label: '3~5개월', a: 3, b: 5 },
    { id: '2', label: '6~11개월', a: 6, b: 11 },
    { id: '3', label: '12~24개월', a: 12, b: 24 },
  ];
  const AXIS = 24; // 막대 그래프 범위(개월)
  let gBand = '0';
  // 월령 범위는 "시작 이상 ~ 끝 미만"으로 봅니다(예: 0~6개월은 6개월 전까지, 6~12개월은 6개월부터). 24개월 이상으로 끝나면 끝 월까지 포함.
  const monthMatch = (p, m) => p.months && m >= p.months[0] && (p.months[1] == null || m < p.months[1] || (p.months[1] >= 24 && m <= p.months[1]));
  const overlap = (p, band) => { for (let m = band.a; m <= band.b; m++) if (monthMatch(p, m)) return true; return false; };
  const GSECTIONS = [
    { cat: 'diaper', title: '기저귀', tip: '기저귀는 월령보다 <b>체중</b>으로 단계를 골라요. 단계별 체중 기준은 브랜드마다 달라서 포장의 체중 기준을 꼭 확인하세요.' },
    { cat: 'formula', title: '분유', tip: '분유 단계의 월령은 <b>브랜드마다 달라요.</b> 아래는 판매 페이지에 적힌 월령이에요. 분유 선택·변경은 <b>소아청소년과와 상담</b>하세요.' },
    { cat: 'pacifier', title: '쪽쪽이', tip: '쪽쪽이는 월령별 사이즈(S1, S2)를 맞춰 쓰는 제품이에요.' },
    { cat: 'bottle', title: '분유병(젖병)', tip: '젖병은 월령보다 <b>수유량</b>에 맞춰 용량을 골라요. 세트에 들어 있는 젖꼭지의 단계·사이즈는 구성마다 달라요.', noList: true },
    { cat: 'nipple', title: '젖꼭지(젖병용)', tip: '젖꼭지는 <b>단계(유속)·사이즈</b>를 아기에게 맞춰 바꿔 줘요. 단계별 월령은 브랜드마다 달라서 상품 상세에서 확인하고, <b>쓰는 젖병과 호환되는지</b> 꼭 확인하세요. 월령이 확인된 제품이 없어 목록은 "젖꼭지" 탭에서 보세요.', noList: true },
  ];

  function renderGuide() {
    const band = BANDS.find((x) => x.id === gBand);
    $('#gBands').innerHTML = BANDS.map((x) => `<button class="chip ${x.id === gBand ? 'on' : ''}" data-b="${x.id}" aria-pressed="${x.id === gBand}">${x.label}</button>`).join('');
    const bar = (p) => {
      const from = p.months[0], to = p.months[1] == null ? AXIS : Math.min(p.months[1], AXIS);
      const hl = `left:${(band.a / AXIS) * 100}%;width:${((Math.min(band.b, AXIS) - band.a + 1) / AXIS) * 100}%`;
      return `<div class="bar2" aria-hidden="true"><span class="hl" style="${hl}"></span><i class="${p.months[1] == null ? 'open' : ''}" style="left:${(from / AXIS) * 100}%;width:${(Math.max(to - from, 0.6) / AXIS) * 100}%"></i></div>`;
    };
    const weightHtml = () => {
      const w = DB.weightGuide;
      if (!w) return '';
      return `<details class="wtable"><summary>단계별 체중 기준 보기</summary>` +
        w.rows.map((r) => `<div class="wrow"><b>${esc(r.title)}</b><div class="wchips">${r.items.map(([s, k]) => `<span><em>${esc(s)}</em>${esc(k)}</span>`).join('')}</div><small>${esc(r.src)}</small></div>`).join('') +
        `<p class="wnote">${esc(w.general)}</p><p class="wnote warn">${esc(w.caution)}</p></details>`;
    };
    $('#gBody').innerHTML = GSECTIONS.map((sec) => {
      const items = DB.products.filter((p) => p.cat === sec.cat && overlap(p, band));
      const rows = sec.noList ? '' : (items.length
        ? `<div class="axis"><span></span><div><span>0</span><span>6</span><span>12</span><span>18</span><span>24개월</span></div></div>` + items.map((p) =>
          `<button class="gitem" data-id="${p.id}"><span class="gname"><small>${esc(p.brand)}</small>${esc(p.name)}${ageTag(p) ? ` <em class="age">${esc(ageTag(p))}</em>` : ''}</span>${bar(p)}</button>`).join('')
        : (sec.cat === 'diaper' ? '' : `<p class="gempty">이 월령에 맞는 ${sec.title} 정보는 확인 중이에요.</p>`));
      const unk = (sec.noList || sec.cat === 'diaper') ? [] : DB.products.filter((p) => p.cat === sec.cat && !p.months);
      const unkHtml = unk.length ? `<details class="unk"><summary>월령 확인 중인 제품 ${unk.length}개</summary><p class="wnote">판매 페이지에서 월령이 확인되지 않아 위 목록에 없어요. 목록에 없다고 맞지 않는 제품은 아니에요. 눌러서 상세를 보고 포장 표기를 확인하세요.</p>` +
        unk.map((p) => `<button class="gitem nobar" data-id="${p.id}"><span class="gname"><small>${esc(p.brand)}</small>${esc(p.name)}${p.stage ? ` <em class="age">${esc(p.stage)}</em>` : ''}</span></button>`).join('') + '</details>' : '';
      return `<section class="gsec"><h3>${sec.title}</h3><p class="gtip">${sec.tip}</p>${sec.cat === 'diaper' ? weightHtml() : ''}${rows}${unkHtml}</section>`;
    }).join('') + '<p class="basis">월령은 쇼핑몰 판매 페이지에 적힌 표기를 옮긴 참고용이에요. 예를 들어 0~6개월 제품은 6개월 전까지, 6~12개월 제품은 6개월부터예요. 아기마다 성장이 달라서 정확한 기준은 제품 포장에서 확인하세요. 월령이 확인된 제품만 표시돼요.</p>';
  }
  function openGuide() {
    renderGuide();
    $('#guide').hidden = false;
    document.body.style.overflow = 'hidden';
    $('#guide .sheet').scrollTop = 0;
    pushLayer('guide');
    layerOpened($('#guide'), '#gClose');
  }

  // 사진이 없을 때 쓰는 카테고리별 일러스트(직접 그린 아이콘)
  const ICONS = {
    diaper: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M5 11h38c1 13-5 26-13 30H18C10 37 4 24 5 11z" fill="#ffd9c9" stroke="#e8643b" stroke-width="2" stroke-linejoin="round"/><path d="M5 11h38v6H5z" fill="#fff" opacity=".75"/><circle cx="24" cy="29" r="3" fill="#fff" opacity=".8"/></svg>',
    formula: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="11" y="14" width="26" height="29" rx="4" fill="#dbe9ff" stroke="#4a78d0" stroke-width="2"/><rect x="9" y="7" width="30" height="9" rx="3" fill="#fff" stroke="#4a78d0" stroke-width="2"/><circle cx="24" cy="29" r="6" fill="#fff" stroke="#4a78d0" stroke-width="2"/><path d="M21.5 29h5M24 26.5v5" stroke="#4a78d0" stroke-width="2" stroke-linecap="round"/></svg>',
    pacifier: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="12" r="7" fill="none" stroke="#7c6cf0" stroke-width="3"/><path d="M6 27c0-5 8-8 18-8s18 3 18 8-8 8-18 8S6 32 6 27z" fill="#e8e0ff" stroke="#7c6cf0" stroke-width="2"/><path d="M19 34c0 6 2 9 5 9s5-3 5-9" fill="#ffd9c9" stroke="#e8643b" stroke-width="2"/></svg>',
    bottle: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M21 3h6l2 6H19z" fill="#ffd9c9" stroke="#e8643b" stroke-width="2" stroke-linejoin="round"/><rect x="16" y="9" width="16" height="6" rx="2" fill="#fff" stroke="#e8643b" stroke-width="2"/><path d="M15 15h18v26a4 4 0 0 1-4 4H19a4 4 0 0 1-4-4z" fill="#d6f2e8" stroke="#23805f" stroke-width="2"/><path d="M15 26h6M15 33h6" stroke="#23805f" stroke-width="2" stroke-linecap="round"/></svg>',
    wipes: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="7" y="18" width="34" height="24" rx="5" fill="#d6f2e8" stroke="#23805f" stroke-width="2"/><rect x="12" y="12" width="24" height="8" rx="3" fill="#fff" stroke="#23805f" stroke-width="2"/><path d="M18 12c0-5 4-7 8-7s5 3 3 6" fill="none" stroke="#23805f" stroke-width="2" stroke-linecap="round"/></svg>',
    nipple: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 4c-4 0-6 4-6 9v6h12v-6c0-5-2-9-6-9z" fill="#ffd9c9" stroke="#e8643b" stroke-width="2" stroke-linejoin="round"/><rect x="10" y="19" width="28" height="8" rx="4" fill="#fff" stroke="#e8643b" stroke-width="2"/><path d="M13 27h22l-2 15H15z" fill="#d6f2e8" stroke="#23805f" stroke-width="2" stroke-linejoin="round"/></svg>',
    steril: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="7" y="10" width="34" height="32" rx="6" fill="#e8e0ff" stroke="#7c6cf0" stroke-width="2"/><rect x="12" y="15" width="24" height="16" rx="3" fill="#fff" stroke="#7c6cf0" stroke-width="2"/><path d="M18 31v-9m6 9v-9m6 9v-9" stroke="#7c6cf0" stroke-width="2.4" stroke-linecap="round"/><circle cx="24" cy="37" r="2" fill="#7c6cf0"/></svg>',
    tube: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M13 12h22l-2 28H15z" fill="#ffe3ea" stroke="#c0426b" stroke-width="2" stroke-linejoin="round"/><rect x="17" y="4" width="14" height="8" rx="2" fill="#fff" stroke="#c0426b" stroke-width="2"/><path d="M13 40h22v3H13z" fill="#c0426b"/><circle cx="24" cy="26" r="4" fill="#fff" opacity=".85"/></svg>',
  };
  const kindOf = (p) => (p.cat === 'etc' ? (p.type === '물티슈' ? 'wipes' : p.type === '젖병 소독기' ? 'steril' : 'tube') : p.cat);
  // image(권리가 확인된 사진)가 있으면 아이콘 위에 덮어서 보여주고, 불러오지 못하면 아이콘이 남습니다.
  const thumbHtml = (p) => ICONS[kindOf(p)] + (p.image ? `<img src="${esc(p.image)}" alt="" width="56" height="56" loading="lazy" onerror="this.remove()">` : '');

  function renderActive() {
    const items = [];
    state.tier.forEach((v) => items.push(['tier', v, TIERS.find((t) => t.id === v).label]));
    state.type.forEach((v) => items.push(['type', v, v]));
    state.stage.forEach((v) => items.push(['stage', v, v]));
    state.judge.forEach((v) => items.push(['judge', v, JF[v]]));
    $('#active').innerHTML = items.map(([k, v, l]) => `<button class="achip" data-k="${k}" data-v="${esc(v)}" aria-label="${esc(l)} 필터 해제">${esc(l)} ✕</button>`).join('');
    const n = items.length + state.brand.size;
    const fc = $('#fCount');
    fc.hidden = n === 0; fc.textContent = n;
  }

  // 같은 단계끼리 단가 순위(기저귀: 종류+단계, 분유: 단계, 기타: 종류). 쪽쪽이·젖병·젖꼭지는 구성이 달라 제외.
  const peerKey = (p) => (p.cat === 'diaper' ? `d|${p.type}|${p.stage}` : p.cat === 'formula' ? `f|${p.stage}` : p.cat === 'etc' ? `e|${p.type}` : null);
  const isRef = (p) => /참고/.test(p.a.seller || '');
  function peersOf(p) {
    const k = peerKey(p);
    if (!k || p.a.none) return null;
    const list = DB.products.filter((q) => peerKey(q) === k && !q.a.none && !isRef(q)).sort((x, y) => x.a.cur - y.a.cur);
    return list.length >= 3 && list.includes(p) ? list : null;
  }
  function renderList() {
    renderActive();
    const list = inCat().filter((p) => {
      if (state.brand.size && !state.brand.has(p.brand)) return false;
      if (state.tier.size && !state.tier.has(tierOf(p))) return false;
      if (state.type.size && !state.type.has(p.type)) return false;
      if (state.stage.size && !(state.cat === 'pacifier' ? [...state.stage].some((l) => overlap(p, BANDS.find((x) => x.label === l))) : state.stage.has(p.stage))) return false;
      if (state.judge.size && !state.judge.has(p.a.judge)) return false;
      if (favOnly && !favs.has(p.id)) return false;
      if (state.q && !matches(p, state.q)) return false;
      return true;
    });
    // 가격 정보가 없는 제품은 항상 뒤로
    const by = (fn) => (a, b) => (!!a.a.none - !!b.a.none) || (a.a.none ? a.name.localeCompare(b.name, 'ko') : fn(a, b));
    const sorters = {
      diff: by((a, b) => (a.a.judge === 'pending' ? 1 : 0) - (b.a.judge === 'pending' ? 1 : 0) || a.a.diff - b.a.diff),
      unit: by((a, b) => a.a.cur - b.a.cur),
      name: (a, b) => a.name.localeCompare(b.name, 'ko'),
    };
    // 평균 대비 정렬은 판단이 나온 제품이 있을 때만 의미가 있어서, 없으면 선택지를 막고 단가순으로 보여줍니다
    const anyJudged = inCat().some((p) => !p.a.none && p.a.judge !== 'pending');
    const so = $('#sort'); so.querySelector('option[value=diff]').disabled = !anyJudged;
    so.querySelector('option[value=diff]').textContent = anyJudged ? '평균 대비 싼 순' : '평균 대비 싼 순 (기록이 쌓이면)';
    const eff = state.sort === 'diff' && !anyJudged ? 'unit' : state.sort;
    so.value = eff;
    list.sort(sorters[eff]);
    // 단계·구성이 섞인 목록을 단가순으로 볼 때의 오해 방지 안내
    const mixed = eff === 'unit' && peerKey(list[0] || {}) && new Set(list.map((p) => peerKey(p))).size > 1;
    $('#sortHint').hidden = !mixed;
    $('#count').textContent = `${list.length}개 제품`;
    const fb = $('#favToggle');
    fb.classList.toggle('on', favOnly); fb.setAttribute('aria-pressed', favOnly);
    fb.textContent = `${favOnly ? '♥' : '♡'} 관심만${favs.size ? ` (${favs.size})` : ''}`;
    $('#applyM').textContent = list.length ? `${list.length}개 제품 보기` : '조건에 맞는 제품 없음';
    $('#empty').hidden = list.length > 0;
    $('#emptyMsg').textContent = state.q ? `'${state.q}' 검색 결과가 없어요.` : '조건에 맞는 제품이 없어요.';
    // 다른 카테고리에서도 찾았다면 알려줍니다(검색은 현재 탭만 보여주므로 오해를 막기 위해)
    const cross = state.q ? CATS.filter((c) => c.id !== state.cat).map((c) => [c, DB.products.filter((p) => p.cat === c.id && matches(p, state.q)).length]).filter(([, n]) => n > 0) : [];
    const cn = $('#crossNote');
    cn.hidden = cross.length === 0;
    cn.innerHTML = cross.length ? `다른 카테고리에서도 찾았어요: ${cross.map(([c, n]) => `<button type="button" class="xcat" data-cat="${c.id}">${esc(c.label)} ${n}개</button>`).join('')}` : '';
    document.querySelectorAll('#viewToggle [data-view]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.view === state.view));
    const g = $('#grid');
    g.classList.toggle('tbl', state.view === 'table');
    if (state.view === 'table') { g.innerHTML = tableHtml(list); return; }
    g.innerHTML = list.map((p) => {
      const a = p.a;
      // 가격을 낸 판매처가 쿠팡이면 쿠팡 버튼을 앞에 둡니다(카드의 가격과 버튼이 같은 곳을 가리키게)
      const naverBtn = `<a class="cta" target="_blank" rel="noopener noreferrer" href="${esc(naverUrl(p))}">네이버 가격 비교 ↗</a>`;
      const coupangBtn = `<a class="cta" target="_blank" rel="${p.links && p.links.coupang ? 'sponsored nofollow ' : ''}noopener noreferrer" href="${esc(coupangUrl(p))}">쿠팡에서 보기 ↗</a>`;
      const link = `<div class="c-cta">${!a.none && /^쿠팡/.test(a.seller || '') ? coupangBtn + naverBtn : naverBtn + coupangBtn}</div>`;
      const isFav = favs.has(p.id);
      const heart = `<button type="button" class="heart ${isFav ? 'on' : ''}" data-fav="${p.id}" aria-pressed="${isFav}" aria-label="${esc(p.name)} 관심 ${isFav ? '해제' : '추가'}">${isFav ? '♥' : '♡'}</button>`;
      const top = (badge) => `<div class="c-top"><span class="brandname">${esc(p.brand)} ${tierTag(tierOf(p))}</span><span class="c-right">${badge}${heart}</span></div><div class="c-main"><div class="thumb ${kindOf(p)}">${thumbHtml(p)}</div><div class="c-text"><h3 class="c-name"><button type="button" class="card-open" aria-label="${esc(p.name)} 상세 보기">${esc(p.name)}</button></h3>${ageTag(p) ? `<span class="age">${esc(ageTag(p))}</span>` : ''}${p.fits ? `<span class="age fit">${esc(p.fits)}</span>` : ''}${p.includes ? `<span class="age inc">포함 젖꼭지 ${esc(p.includes)}</span>` : ''}${originTag(p)}</div></div>`;
      if (a.none) {
        return `<article class="card nodata" data-id="${p.id}">${top('<span class="badge pending">대기</span>')}
          <div class="c-mid"><span class="price none">가격 수집 전</span></div>
          <div class="unit">현재 가격은 링크에서 확인하세요</div>${link}</article>`;
      }
      const pr = peersOf(p);
      const rankHtml = pr ? `<div class="rank">${p.stage ? esc(p.stage) + ' ' : ''}${pr.length}개 중 <b>${pr.indexOf(p) + 1}위</b> (단가 싼 순)</div>` : '';
      // 기록 중인 카드는 같은 문구를 반복하지 않음(배지 '기록 중' + 상단 안내 + 상세에 판단 시작 예정일이 있음)
      const note = a.judge === 'pending'
        ? ''
        : `<span class="diff ${a.judge}">평균 대비 ${pct(a.diff)}</span>${a.nearMin ? ' <span class="low">최저가 근접</span>' : ''}`;
      return `<article class="card" data-id="${p.id}">${top(`<span class="badge ${a.judge}">${JL[a.judge]}</span>`)}
        <div class="c-mid"><span class="price"><small>${unitLabel(p)}</small>${fmtU(a.cur)}원</span>${a.count > 1 ? spark(a.h) : ''}</div>
        <div class="unit">${p.qty.toLocaleString('ko-KR')}${p.unit} 약 ${won(packPrice(p, a.cur))}${a.seller ? ` · ${esc(a.seller)}` : ''} · ${md(a.date)} 확인</div>${chgLong(a) ? `<div class="unit">${chgLong(a)}</div>` : ''}${rankHtml}
        ${note ? `<div class="c-note">${note}</div>` : ''}${link}
      </article>`;
    }).join('');
  }

  // 표(단가) 보기: 같은 기준의 단가를 한 줄씩 비교. 가로로 넓어서 모바일에서는 좌우 스크롤.
  function tableHtml(list) {
    if (!list.length) return '';
    const rows = list.map((p) => {
      const a = p.a;
      const nm = `<button type="button" class="card-open" aria-label="${esc(p.name)} 상세 보기">${esc(p.name)}</button><small>${esc(p.brand)}${p.origin ? ` · ${esc(p.origin)}` : ''}</small>`;
      if (a.none) return `<tr data-id="${p.id}"><th scope="row">${nm}</th><td colspan="6" class="muted">가격 수집 전</td></tr>`;
      return `<tr data-id="${p.id}"><th scope="row">${nm}</th>
        <td class="r"><b>${fmtU(a.cur)}원</b><small>${unitLabel(p)}</small></td>
        <td class="r">${p.qty.toLocaleString('ko-KR')}${p.unit}<small>약 ${won(packPrice(p, a.cur))}</small></td>
        <td>${a.seller ? esc(a.seller) : '-'}</td><td>${md(a.date)}</td><td>${chgShort(a)}</td>
        <td><span class="badge ${a.judge}">${JL[a.judge]}</span></td></tr>`;
    }).join('');
    return `<div class="tablewrap" tabindex="0" role="region" aria-label="단가 표 (좌우로 스크롤)"><table class="ptable"><thead><tr><th scope="col">제품</th><th scope="col" class="r">단가</th><th scope="col" class="r">구성 환산</th><th scope="col">판매처</th><th scope="col">확인일</th><th scope="col">변동</th><th scope="col">지금 가격</th></tr></thead><tbody>${rows}</tbody></table></div>`;
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

  function peerBox(p) {
    const pr = peersOf(p); if (!pr) return '';
    const top = pr.slice(0, 5); if (!top.includes(p)) top.push(p);
    return `<div class="peers"><b>같은 단계 비교${p.stage ? ` (${esc(p.stage)})` : ''}</b><ol>${top.map((q) => `<li class="${q === p ? 'me' : ''}"><span>${pr.indexOf(q) + 1}위 · ${esc(q.name)}</span><em>${fmtU(q.a.cur)}원</em></li>`).join('')}</ol><p class="basis">${pr.length}개 제품 중 순위예요. 포장 수량·구성이 달라 단가만으로 판단하기 어려울 수 있어요.</p></div>`;
  }
  function shareLink(id) {
    const url = location.origin + location.pathname + '?p=' + encodeURIComponent(id);
    const p = DB.products.find((x) => x.id === id);
    const toast = (m) => {
      let t = document.getElementById('toast');
      if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
      t.textContent = m; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2200);
    };
    if (navigator.share) { navigator.share({ title: `${p.name} | 아이톡톡`, url }).catch(() => {}); return; }
    const done = () => toast('링크를 복사했어요');
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, () => toast(url));
    else toast(url);
  }
  function openModal(id) {
    const p = DB.products.find((x) => x.id === id);
    const a = p.a;
    const b = DB.brands[p.brand];
    const head = `<div class="m-head"><div class="thumb big ${kindOf(p)}">${thumbHtml(p)}</div><div><div class="brandname">${esc(p.brand)} ${tierTag(tierOf(p))}</div><h2 id="mTitle">${esc(p.name)}</h2>${ageTag(p) ? `<span class="age">대상: ${esc(ageTag(p))}</span>` : ''}${p.fits ? `<span class="age fit">${esc(p.fits)}</span>` : ''}${p.includes ? `<span class="age inc">포함 젖꼭지 ${esc(p.includes)}</span>` : ''}${originTag(p)}</div></div>${p.note ? `<p class="basis note-line">ℹ️ ${esc(p.note)}</p>` : ''}${p.image && p.imageCredit ? `<p class="basis">사진: ${esc(p.imageCredit)}</p>` : ''}`;
    const shareBtn = `<button type="button" class="btn share" data-share="${esc(p.id)}">🔗 이 제품 링크 공유</button>`;
    const btns = `<div class="btns">${shareBtn}<a class="btn primary" target="_blank" rel="noopener noreferrer" href="${esc(naverUrl(p))}">네이버 가격 비교</a><a class="btn" target="_blank" rel="${p.links && p.links.coupang ? 'sponsored nofollow ' : ''}noopener noreferrer" href="${esc(coupangUrl(p))}">쿠팡에서 보기</a>${p.links && p.links.coupang ? (p.coupangNote ? '<p class="aff warn">' + esc(p.coupangNote) + '</p>' : '') + '<p class="aff">' + esc(AFF_TEXT) + '</p>' : ''}</div>`;
    const reqLine = reqUrl ? `<p class="basis"><a class="req-inline" target="_blank" rel="noopener noreferrer" href="${esc(reqUrl)}">가격·정보가 달라요? 제보하기 ↗</a></p>` : '';
    const brandBox = b ? `<div class="binfo"><b>${esc(p.brand)}</b> ${tierTag(b.tier)} · ${esc(b.tagline)}<ul>${b.pros.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : '';

    if (a.none) {
      $('#mBody').innerHTML = `${head}
        <div class="verdict pending">아직 가격이 등록되지 않았어요. 아래 버튼으로 현재 가격을 직접 확인해 보세요.</div>
        ${brandBox}${reqLine}${btns}`;
    } else {
      const verdictText = {
        pending: `가격 기록이 ${a.count}회예요. ${MIN_POINTS}회 이상, 3주 이상 쌓이면 평균과 비교해 싼지 비싼지 알려드려요.${readyOn(a) ? ` 주 1회 갱신하면 ${readyOn(a)}경부터 판단이 시작돼요.` : ''}`,
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
        <p class="basis">확인한 판매처 중 배송비 포함 최저가(비회원 기준, 멤버십·조건부 쿠폰 할인 제외)를 ${unitLabel(p)} 가격으로 환산한 값이에요. 기준일 ${esc(a.date)}${a.seller ? ` · ${esc(a.seller)}` : ''}</p>${/쿠팡/.test(a.seller) ? '<p class="basis wow">💡 쿠팡 로켓와우 회원은 로켓배송 상품의 배송비가 무료라 더 저렴할 수 있어요.</p>' : ''}
        <table><thead><tr><th>기준일</th><th class="r">${unitLabel(p)} 가격</th><th class="r">판매처</th></tr></thead><tbody>
          ${rows.map((r) => `<tr><td>${esc(r.d)}</td><td class="r">${fmtU(r.u)}원</td><td class="r">${esc(r.s || '-')}</td></tr>`).join('')}
        </tbody></table>${peerBox(p)}${brandBox}${reqLine}${btns}`;
    }
    $('#modal').hidden = false;
    $('.sheet').scrollTop = 0;
    document.body.style.overflow = 'hidden';
    pushLayer('modal', '?p=' + encodeURIComponent(id));
    layerOpened($('#modal'), '#mClose');
  }
})();
