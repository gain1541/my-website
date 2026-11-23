/* 요청·문의 모달: 구글폼(formResponse)으로 전송. 기존 .req-link/.req-inline 링크를 가로채 모달로 엽니다.
   전송은 fetch(no-cors)로 합니다: 구글이 응답을 읽을 수는 없지만, 네트워크 실패(오프라인·차단)는 구분해서 안내할 수 있어요.
   (구글이 오류로 거부해도 성공처럼 보일 수 있으니, 처음 1건은 직접 제출해서 응답 시트에 들어가는지 확인하세요.) */
(function () {
  var modal = document.getElementById('inqModal');
  if (!modal) return;
  var form = document.getElementById('inqForm');
  var done = document.getElementById('inqDone');
  var err = document.getElementById('inqErr');
  var sink = document.getElementById('inqSink');
  var chips = modal.querySelectorAll('.inq-chip input');
  var submitBtn = form.querySelector('.inq-submit');
  var KIND = 'entry.431515580';
  var lastFocus = null, waiting = false, timer = null;

  function syncChips() {
    for (var i = 0; i < chips.length; i++) chips[i].closest('.inq-chip').classList.toggle('on', chips[i].checked);
  }
  function open(kind, product) {
    lastFocus = document.activeElement;
    done.hidden = true; form.hidden = false; err.hidden = true;
    submitBtn.disabled = false; waiting = false; clearTimeout(timer);
    if (kind) { var r = modal.querySelector('input[name="' + KIND + '"][value="' + kind + '"]'); if (r) r.checked = true; }
    if (product) document.getElementById('inqProduct').value = product;
    syncChips();
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    var t = form.querySelector('input:checked') ? form.querySelector('textarea') : form.querySelector('input[type=radio]');
    if (t) t.focus({ preventScroll: true });
  }
  function close() {
    clearTimeout(timer); waiting = false;
    modal.hidden = true;
    // 아래에 상세 화면이 열려 있으면 스크롤 잠금을 유지
    var under = document.getElementById('modal');
    document.body.style.overflow = under && !under.hidden ? 'hidden' : '';
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  function fail(msg) { err.textContent = msg; err.hidden = false; err.scrollIntoView({ block: 'nearest' }); }
  function showDone() { waiting = false; clearTimeout(timer); form.hidden = true; done.hidden = false; }

  // 기존 요청 링크를 모달로 연결 (새 탭 열기·휴대폰 키 조합은 원래 링크 동작 유지)
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('.req-link, .req-inline');
    if (a && !e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
      e.preventDefault();
      if (a.classList.contains('req-inline')) {
        var t = document.getElementById('mTitle');
        open('가격·정보 오류 제보', t ? t.textContent.trim() : '');
      } else if (a.closest('#empty')) {
        open('제품 추가 요청', (document.getElementById('q') || {}).value || '');
      } else {
        open();
      }
      return;
    }
    if (e.target.closest('[data-inq-close]')) close();
    var again = e.target.closest('[data-inq-again]');
    if (again) { form.reset(); syncChips(); done.hidden = true; form.hidden = false; err.hidden = true; submitBtn.disabled = false; modal.querySelector('textarea').focus(); }
  });
  document.addEventListener('keydown', function (e) {
    if (modal.hidden) return;
    if (e.key === 'Escape') { e.stopPropagation(); close(); }
    if (e.key === 'Tab') {
      var f = modal.querySelectorAll('input:not([tabindex="-1"]), textarea, button, a[href]');
      f = Array.prototype.filter.call(f, function (n) { return n.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }, true);
  window.addEventListener('popstate', function () { if (!modal.hidden) close(); });
  Array.prototype.forEach.call(chips, function (c) { c.addEventListener('change', syncChips); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (waiting) return;
    if (form.inq_hp && form.inq_hp.value) { showDone(); return; } // 봇: 조용히 성공 화면
    var kind = form.querySelector('input[name="' + KIND + '"]:checked');
    var detail = form.querySelector('#inqDetail').value.trim();
    var email = form.querySelector('#inqEmail').value.trim();
    if (!kind) return fail('어떤 내용인지 골라 주세요.');
    if (detail.length < 5) return fail('자세한 내용을 5자 이상 적어 주세요.');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return fail('이메일 주소를 확인해 주세요.');
    err.hidden = true;
    submitBtn.disabled = true;
    waiting = true;
    var failMsg = '전송이 안 됐어요. 네트워크를 확인하고 다시 보내 주세요. 계속 안 되면 아래 "구글폼으로 직접 열기"를 이용해 주세요.';
    function onFail() { if (!waiting) return; waiting = false; clearTimeout(timer); submitBtn.disabled = false; fail(failMsg); }
    if (!window.fetch) { form.submit(); setTimeout(showDone, 700); return; } // 아주 오래된 브라우저: 숨은 iframe으로 전송
    var data = new URLSearchParams(new FormData(form));
    data.delete('inq_hp');
    var ctrl = window.AbortController ? new AbortController() : null;
    timer = setTimeout(function () { if (ctrl) ctrl.abort(); onFail(); }, 12000);
    fetch(form.action, { method: 'POST', mode: 'no-cors', body: data, signal: ctrl ? ctrl.signal : undefined })
      .then(function () { if (waiting) showDone(); }, onFail);
  });
})();
