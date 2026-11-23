(() => {
  const CATS = [
    { id: 'diaper', label: '기저귀' },
    { id: 'formula', label: '분유' },
    { id: 'pacifier', label: '쪽쪽이' },
    { id: 'bottle', label: '분유병(젖병)' },
    { id: 'etc', label: '기타 용품' },
  ];
  const STAGE_ORDER = ['1단계(신생아)', '1단계', '2단계', '3단계', '4단계', '5단계', '0~6개월', '6~18개월', '전연령'];
  const JUDGES = [
    { id: 'cheap', label: '저렴' },
    { id: 'normal', label: '보통' },
    { id: 'pricey', label: '비쌈' },
    { id: 'pending', label: '판단 보류' },
  ];
  const JL = { cheap: '저렴', normal: '보통', pricey: '비쌈', pending: '판단 보류' };
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
  const unitLabel = (p) => `${p.basis === 1 ? '' : p.basis}${p.unit}당`;
  const packPrice = (p, u) => Math.round((u * p.qty) / p.basis / 10) * 10; // 10원 단위 환산
  const pct = (d) => (d > 0 ? '+' : '') + (d * 100).toFixed(1) + '%';
  const uniq = (arr) => [...new Set(arr)];

  const state = { cat: 'diaper', tier: new Set(), brand: new Set(), type: new Set(), stage: new Set(), judge: new Set(), q: '', sort: 'diff' };
  let DB = null;

  fetch('data/products.json')
    .then((r) => r.json())
    .then((db) => { DB = db; init(); })
    .catch(() => {
      $('#grid').innerHTML = '<p class="empty">데이터를 불러오지 못했어요. 웹 서버(예: GitHub Pages)를 통해 열어주세요.</p>';
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
    const withData = DB.products.filter((p) => !p.a.none);
    const notice = $('#sampleNotice');
    if (!withData.length) {
      notice.innerHTML = '📝 제품 목록만 먼저 공개했어요. <b>가격은 수집이 시작되면 표시</b>돼요.';
      notice.hidden = false;
    } else if (withData.every((p) => p.a.judge === 'pending')) {
      notice.innerHTML = `📈 가격 기록을 쌓는 중이에요. <b>기록이 ${MIN_POINTS}회 이상, 3주 이상</b> 쌓이면 싼지 비싼지 판단해 드려요.`;
      notice.hidden = false;
    }

    $('#tabs').innerHTML = CATS.map((c) => `<button class="tab" data-cat="${c.id}">${c.label}</button>`).join('');
    $('#tabs').addEventListener('click', (e) => {
      const b = e.target.closest('.tab');
      if (!b) return;
      state.cat = b.dataset.cat;
      state.brand.clear(); state.type.clear(); state.stage.clear(); state.tier.clear();
      render();
    });
    $('#q').addEventListener('input', (e) => { state.q = e.target.value.trim(); renderList(); });
    $('#sort').addEventListener('change', (e) => { state.sort = e.target.value; renderList(); });
    $('#reset').addEventListener('click', () => {
      state.brand.clear(); state.type.clear(); state.stage.clear(); state.judge.clear(); state.tier.clear(); state.q = '';
      $('#q').value = '';
      render();
    });
    const keys = { fBrand: 'brand', fTier: 'tier', fType: 'type', fStage: 'stage', fJudge: 'judge' };
    Object.keys(keys).forEach((id) => {
      $('#' + id).addEventListener('click', (e) => {
        const b = e.target.closest('.chip');
        if (!b) return;
        const set = state[keys[id]];
        set.has(b.dataset.v) ? set.delete(b.dataset.v) : set.add(b.dataset.v);
        render();
      });
    });
    $('#grid').addEventListener('click', (e) => {
      const c = e.target.closest('.card');
      if (c) openModal(c.dataset.id);
    });
    $('#mClose').addEventListener('click', closeModal);
    $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
    render();
  }

  const inCat = () => DB.products.filter((p) => p.cat === state.cat);

  function chips(id, values, set, labelFn) {
    $('#' + id).innerHTML = values.map((v) =>
      `<button class="chip ${set.has(v) ? 'on' : ''}" data-v="${esc(v)}">${esc(labelFn ? labelFn(v) : v)}</button>`).join('');
  }

  function render() {
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('on', t.dataset.cat === state.cat));
    const list = inCat();
    chips('fBrand', uniq(list.map((p) => p.brand)), state.brand);
    chips('fTier', TIERS.map((t) => t.id), state.tier, (v) => TIERS.find((t) => t.id === v).label);
    chips('fType', uniq(list.map((p) => p.type)), state.type);
    const stages = uniq(list.map((p) => p.stage)).sort((a, b) => STAGE_ORDER.indexOf(a) - STAGE_ORDER.indexOf(b));
    chips('fStage', stages, state.stage);
    $('#fStage').parentElement.hidden = stages.length <= 1;
    chips('fJudge', JUDGES.map((j) => j.id), state.judge, (v) => JL[v]);
    renderBrands(list);
    renderList();
  }

  function renderBrands(list) {
    const names = state.brand.size ? [...state.brand] : uniq(list.map((p) => p.brand));
    $('#brandInfo').innerHTML = `<h2>브랜드 특징</h2><div class="brands">` + names.map((n) => {
      const b = DB.brands[n];
      if (!b) return '';
      return `<div class="brand"><h3>${esc(n)} ${tierTag(b.tier)}</h3><div class="tag">${esc(b.tagline)}</div><ul>${b.pros.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
    }).join('') + `</div>`;
  }

  // 날짜 축 기준 미니 그래프
  function spark(h, w = 220, ht = 44) {
    const t0 = Date.parse(h[0].d), t1 = Date.parse(h[h.length - 1].d);
    const vs = h.map((x) => x.u);
    const lo = Math.min(...vs), hi = Math.max(...vs), rng = hi - lo || 1;
    const pts = h.map((x) => [t1 > t0 ? ((Date.parse(x.d) - t0) / (t1 - t0)) * w : w / 2, ht - 4 - ((x.u - lo) / rng) * (ht - 8)]);
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    const last = pts[pts.length - 1];
    return `<svg class="spark" viewBox="0 0 ${w} ${ht}" preserveAspectRatio="none" aria-hidden="true"><path d="${d}" fill="none" stroke="#9b8cff" stroke-width="2" vector-effect="non-scaling-stroke"/><circle cx="${last[0]}" cy="${last[1]}" r="3.5" fill="#ff8a65"/></svg>`;
  }

  function renderList() {
    let list = inCat().filter((p) => {
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
    $('#empty').hidden = list.length > 0;
    $('#grid').innerHTML = list.map((p) => {
      const a = p.a;
      const head = `<span class="brandname">${esc(p.brand)} ${tierTag(tierOf(p))}</span>
        <h3>${esc(p.name)}</h3>
        <span class="tags"><span class="tag-s">${esc(p.type)}</span>${p.stage !== '전연령' ? `<span class="tag-s">${esc(p.stage)}</span>` : ''}</span>`;
      if (a.none) {
        return `<button class="card nodata" data-id="${p.id}">${head}
          <span class="meta"><span class="price none">가격 수집 전</span><span class="badge pending">대기</span></span>
          <span class="unit">가격이 등록되면 표시돼요</span></button>`;
      }
      const note = a.judge === 'pending'
        ? `<span class="diff pending">기록 ${a.count}회 · ${MIN_POINTS}회 이상부터 판단</span>`
        : `<span class="diff ${a.judge}">평균 대비 ${pct(a.diff)}</span>`;
      return `<button class="card" data-id="${p.id}">${head}
        <span class="meta"><span class="price">${fmtU(a.cur)}원<small>${unitLabel(p)}</small></span><span class="badge ${a.judge}">${JL[a.judge]}</span></span>
        <span class="unit">${p.qty.toLocaleString('ko-KR')}${p.unit} 기준 약 ${won(packPrice(p, a.cur))}${a.seller ? ` · ${esc(a.seller)}` : ''} · ${a.date.slice(5)} 기준</span>
        ${a.count > 1 ? spark(a.h) : ''}
        <span class="meta">${note}${a.nearMin ? '<span class="low">기록 중 최저가 근접</span>' : ''}</span>
      </button>`;
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
      grid += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="#eadfda" stroke-dasharray="3 3"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="#8a8799">${fmtU(v)}</text>`;
    }
    const minP = h.find((p) => p.u === a.min);
    const lastP = h[h.length - 1];
    const ticks = uniq([h[0].d, lastP.d]);
    const xt = ticks.map((dt, i) => `<text x="${x(dt)}" y="${H - 8}" text-anchor="${ticks.length === 1 ? 'middle' : i === 0 ? 'start' : 'end'}" font-size="11" fill="#8a8799">${dt.slice(2)}</text>`).join('');
    const dots = h.map((p) => `<circle cx="${x(p.d)}" cy="${y(p.u)}" r="3" fill="#7c6cf0"/>`).join('');
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="단가 추이 그래프">
      ${grid}
      <line x1="${L}" x2="${W - R}" y1="${y(a.avg)}" y2="${y(a.avg)}" stroke="#ff8a65" stroke-dasharray="5 4"/>
      <text x="${W - R}" y="${y(a.avg) - 5}" text-anchor="end" font-size="11" fill="#ff8a65">평균 ${fmtU(a.avg)}원</text>
      <path d="${d}" fill="none" stroke="#7c6cf0" stroke-width="2.4" stroke-linejoin="round"/>
      ${dots}
      <circle cx="${x(minP.d)}" cy="${y(minP.u)}" r="5" fill="#2f9e75"/>
      <circle cx="${x(lastP.d)}" cy="${y(lastP.u)}" r="5.5" fill="#ff8a65"/>
      ${xt}
    </svg>`;
  }

  function openModal(id) {
    const p = DB.products.find((x) => x.id === id);
    const a = p.a;
    const b = DB.brands[p.brand];
    const q = encodeURIComponent(p.name);
    const naverUrl = (p.links && p.links.naver) || NAVER + q;
    const coupangUrl = (p.links && p.links.coupang) || COUPANG + q;
    const head = `<div class="brandname">${esc(p.brand)} ${tierTag(tierOf(p))}</div><h2 id="mTitle">${esc(p.name)}</h2>`;
    const btns = `<div class="btns"><a class="btn primary" target="_blank" rel="noopener noreferrer" href="${esc(naverUrl)}">네이버 가격 비교 보기</a><a class="btn" target="_blank" rel="noopener noreferrer" href="${esc(coupangUrl)}">쿠팡에서 보기</a></div>`;
    const brandBox = b ? `<div class="binfo"><b>${esc(p.brand)}</b> ${tierTag(b.tier)} · ${esc(b.tagline)}<ul>${b.pros.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : '';

    if (a.none) {
      $('#mBody').innerHTML = `${head}
        <div class="verdict pending">아직 가격이 등록되지 않았어요. 아래 버튼으로 현재 가격을 직접 확인해 보세요.</div>
        ${btns}${brandBox}`;
    } else {
      const verdictText = {
        pending: `가격 기록이 ${a.count}회라 아직 판단을 보류해요. ${MIN_POINTS}회 이상, 3주 이상 쌓이면 평균과 비교해 알려드려요.`,
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
        ${btns}
        <table><thead><tr><th>기준일</th><th class="r">${unitLabel(p)} 가격</th><th class="r">판매처</th></tr></thead><tbody>
          ${rows.map((r) => `<tr><td>${esc(r.d)}</td><td class="r">${fmtU(r.u)}원</td><td class="r">${esc(r.s || '-')}</td></tr>`).join('')}
        </tbody></table>${brandBox}`;
    }
    $('#modal').hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function closeModal() { $('#modal').hidden = true; document.body.style.overflow = ''; }
})();
