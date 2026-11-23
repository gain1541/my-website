(() => {
  const CATS = [
    { id: 'diaper', label: '기저귀' },
    { id: 'formula', label: '분유' },
    { id: 'wipes', label: '물티슈' },
    { id: 'etc', label: '기타 육아용품' },
  ];
  const STAGE_ORDER = ['신생아', '1단계', '2단계', '3단계', '4단계', '5단계', '전연령'];
  const JUDGES = [
    { id: 'cheap', label: '저렴' },
    { id: 'normal', label: '보통' },
    { id: 'pricey', label: '비쌈' },
  ];
  const WINDOW = 26; // 평균 산출 기간(주)
  const TH = 0.05; // 판단 임계값 5%

  const $ = (s) => document.querySelector(s);
  const won = (n) => n.toLocaleString('ko-KR') + '원';
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const TIERS = [
    { id: '상', label: '상 (프리미엄)' },
    { id: '중', label: '중' },
    { id: '가성비', label: '가성비' },
  ];
  const tierOf = (p) => (DB.brands[p.brand] || {}).tier;
  const tierClass = { '상': 'hi', '중': 'mid', '가성비': 'low' };

  const state = { cat: 'diaper', tier: new Set(), brand: new Set(), type: new Set(), stage: new Set(), judge: new Set(), q: '', sort: 'diff' };
  let DB = null;

  fetch('data/products.json')
    .then((r) => r.json())
    .then((db) => { DB = db; init(); })
    .catch(() => {
      $('#grid').innerHTML = '<p class="empty">데이터를 불러오지 못했어요. 웹 서버(예: GitHub Pages)를 통해 열어주세요.</p>';
    });

  function analyze(p) {
    const shops = Object.keys(p.prices);
    const low = DB.dates.map((_, i) => {
      let m = null;
      for (const s of shops) {
        const v = p.prices[s][i];
        if (v != null && (m == null || v < m)) m = v;
      }
      return m;
    });
    const valid = low.filter((v) => v != null);
    const cur = low[low.length - 1];
    const win = low.slice(-WINDOW).filter((v) => v != null);
    const avg = win.reduce((a, b) => a + b, 0) / win.length;
    const min = Math.min(...valid);
    const max = Math.max(...valid);
    const diff = (cur - avg) / avg;
    const judge = diff <= -TH ? 'cheap' : diff >= TH ? 'pricey' : 'normal';
    const unitPrice = cur / (p.qty / p.basis);
    let bestShop = null;
    for (const s of shops) {
      if (p.prices[s][low.length - 1] === cur) { bestShop = s; break; }
    }
    return { low, cur, avg, min, max, diff, judge, unitPrice, bestShop, nearMin: cur <= min * 1.02 };
  }

  function init() {
    if (DB.sample) $('#sampleNotice').hidden = false;
    DB.products.forEach((p) => { p.a = analyze(p); });

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
    ['fBrand', 'fTier', 'fType', 'fStage', 'fJudge'].forEach((id) => {
      $('#' + id).addEventListener('click', (e) => {
        const b = e.target.closest('.chip');
        if (!b) return;
        const key = { fBrand: 'brand', fTier: 'tier', fType: 'type', fStage: 'stage', fJudge: 'judge' }[id];
        const set = state[key];
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
  const uniq = (arr) => [...new Set(arr)];

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
    chips('fJudge', JUDGES.map((j) => j.id), state.judge, (v) => JUDGES.find((j) => j.id === v).label);
    renderBrands(list);
    renderList();
  }

  function renderBrands(list) {
    const names = state.brand.size ? [...state.brand] : uniq(list.map((p) => p.brand));
    $('#brandInfo').innerHTML = `<h2>브랜드 특징</h2><div class="brands">` + names.map((n) => {
      const b = DB.brands[n];
      if (!b) return '';
      return `<div class="brand"><h3>${esc(n)} <span class="tier ${tierClass[b.tier]}">${esc(b.tier)}</span></h3><div class="tag">${esc(b.tagline)}</div><ul>${b.pros.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
    }).join('') + `</div>`;
  }

  function spark(vals, w = 220, h = 44) {
    const v = vals.filter((x) => x != null);
    const lo = Math.min(...v), hi = Math.max(...v), rng = hi - lo || 1;
    const pts = vals.map((x, i) => x == null ? null : [(i / (vals.length - 1)) * w, h - 4 - ((x - lo) / rng) * (h - 8)]).filter(Boolean);
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    const last = pts[pts.length - 1];
    return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><path d="${d}" fill="none" stroke="#9b8cff" stroke-width="2" vector-effect="non-scaling-stroke"/><circle cx="${last[0]}" cy="${last[1]}" r="3.5" fill="#ff8a65"/></svg>`;
  }

  const JL = { cheap: '저렴', normal: '보통', pricey: '비쌈' };
  const pct = (d) => (d > 0 ? '+' : '') + (d * 100).toFixed(1) + '%';
  const unitLabel = (p) => `${p.basis === 1 ? '' : p.basis}${p.unit}당`;

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
    const sorters = {
      diff: (a, b) => a.a.diff - b.a.diff,
      unit: (a, b) => a.a.unitPrice - b.a.unitPrice,
      price: (a, b) => a.a.cur - b.a.cur,
      name: (a, b) => a.name.localeCompare(b.name, 'ko'),
    };
    list.sort(sorters[state.sort]);
    $('#count').textContent = `${list.length}개 제품`;
    $('#empty').hidden = list.length > 0;
    $('#grid').innerHTML = list.map((p) => {
      const a = p.a;
      return `<button class="card" data-id="${p.id}">
        <span class="brandname">${esc(p.brand)} <span class="tier ${tierClass[tierOf(p)]}">${esc(tierOf(p))}</span></span>
        <h3>${esc(p.name)}</h3>
        <span class="tags"><span class="tag-s">${esc(p.type)}</span>${p.stage !== '전연령' ? `<span class="tag-s">${esc(p.stage)}</span>` : ''}</span>
        <span class="meta"><span class="price">${won(a.cur)}</span><span class="badge ${a.judge}">${JL[a.judge]}</span></span>
        <span class="unit">${unitLabel(p)} ${a.unitPrice.toFixed(a.unitPrice < 100 ? 1 : 0)}원 · 최저가 ${esc(a.bestShop)}</span>
        ${spark(a.low)}
        <span class="meta"><span class="diff ${a.judge}">평균 대비 ${pct(a.diff)}</span>${a.nearMin ? '<span class="low">역대 최저가 근접</span>' : ''}</span>
      </button>`;
    }).join('');
  }

  function chart(p) {
    const a = p.a, W = 640, H = 240, L = 52, R = 12, T = 12, B = 28;
    const vals = a.low;
    const lo = Math.min(a.min, a.avg) * 0.97, hi = a.max * 1.03, rng = hi - lo || 1;
    const x = (i) => L + (i / (vals.length - 1)) * (W - L - R);
    const y = (v) => T + (1 - (v - lo) / rng) * (H - T - B);
    const d = vals.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join(' ');
    let grid = '';
    for (let k = 0; k <= 3; k++) {
      const v = lo + (rng * k) / 3;
      grid += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="#eadfda" stroke-dasharray="3 3"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="#8a8799">${Math.round(v / 100) * 100 >= 1000 ? (Math.round(v / 100) / 10).toFixed(1) + '천' : Math.round(v)}</text>`;
    }
    const mi = vals.indexOf(a.min);
    const dl = DB.dates;
    const xt = [0, Math.floor(vals.length / 2), vals.length - 1].map((i) => `<text x="${x(i)}" y="${H - 8}" text-anchor="${i === 0 ? 'start' : i === vals.length - 1 ? 'end' : 'middle'}" font-size="11" fill="#8a8799">${dl[i].slice(2)}</text>`).join('');
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="가격 추이 그래프">
      ${grid}
      <line x1="${L}" x2="${W - R}" y1="${y(a.avg)}" y2="${y(a.avg)}" stroke="#ff8a65" stroke-dasharray="5 4"/>
      <text x="${W - R}" y="${y(a.avg) - 5}" text-anchor="end" font-size="11" fill="#ff8a65">26주 평균 ${won(Math.round(a.avg / 10) * 10)}</text>
      <path d="${d}" fill="none" stroke="#7c6cf0" stroke-width="2.4" stroke-linejoin="round"/>
      <circle cx="${x(mi)}" cy="${y(a.min)}" r="4.5" fill="#2f9e75"/>
      <circle cx="${x(vals.length - 1)}" cy="${y(a.cur)}" r="5" fill="#ff8a65"/>
      ${xt}
    </svg>`;
  }

  function openModal(id) {
    const p = DB.products.find((x) => x.id === id);
    const a = p.a;
    const verdictText = {
      cheap: `지금 가격이 최근 26주 평균보다 ${Math.abs(a.diff * 100).toFixed(1)}% 저렴해요. 사기 좋은 타이밍이에요.`,
      normal: `지금 가격은 평균과 비슷한 수준이에요(${pct(a.diff)}). 급하지 않다면 가격 추이를 더 지켜봐도 좋아요.`,
      pricey: `지금 가격이 평균보다 ${(a.diff * 100).toFixed(1)}% 비싸요. 급하지 않다면 조금 기다려 보세요.`,
    }[a.judge];
    const last = DB.dates.length - 1;
    const rows = Object.keys(p.prices).map((s) => ({ s, v: p.prices[s][last] })).filter((r) => r.v != null).sort((m, n) => m.v - n.v);
    const shopUrl = (s) => (DB.shops.find((x) => x.id === s) || {}).url + encodeURIComponent(p.name);
    const b = DB.brands[p.brand];
    $('#mBody').innerHTML = `
      <div class="brandname">${esc(p.brand)} <span class="tier ${tierClass[tierOf(p)]}">${esc(tierOf(p))}</span></div>
      <h2 id="mTitle">${esc(p.name)}</h2>
      <div class="verdict ${a.judge}">${verdictText}</div>
      <div class="stats">
        <div class="stat"><small>현재 최저가</small><b>${won(a.cur)}</b></div>
        <div class="stat"><small>26주 평균</small><b>${won(Math.round(a.avg / 10) * 10)}</b></div>
        <div class="stat"><small>1년 최저가</small><b>${won(a.min)}</b></div>
        <div class="stat"><small>${unitLabel(p)} 가격</small><b>${a.unitPrice.toFixed(a.unitPrice < 100 ? 1 : 0)}원</b></div>
      </div>
      ${chart(p)}
      <table><thead><tr><th>쇼핑몰</th><th class="r">현재가</th><th class="r">평균 대비</th><th></th></tr></thead><tbody>
        ${rows.map((r) => `<tr><td>${esc(r.s)}${r.v === a.cur ? ' 🏆' : ''}</td><td class="r">${won(r.v)}</td><td class="r">${pct((r.v - a.avg) / a.avg)}</td><td class="r"><a class="go" target="_blank" rel="noopener noreferrer" href="${esc(shopUrl(r.s))}">보러가기</a></td></tr>`).join('')}
      </tbody></table>
      ${b ? `<div class="binfo"><b>${esc(p.brand)}</b> <span class="tier ${tierClass[b.tier]}">${esc(b.tier)}</span> · ${esc(b.tagline)}<ul>${b.pros.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}`;
    $('#modal').hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function closeModal() { $('#modal').hidden = true; document.body.style.overflow = ''; }
})();
