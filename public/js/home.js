document.addEventListener('ui:ready', () => {
  const form = document.getElementById('homeSearch'), res = document.getElementById('results'), sec = document.getElementById('resultsSection');
  const feat = document.getElementById('featured');
  function stats() {
    const all = Store.stadiums(), S = Store.stats(), bk = S.bookings, us = S.players;
    const min = all.length ? Math.min.apply(null, all.map(s => s.price)) : 0;
    document.getElementById('statsRow').innerHTML = [[all.length, 'ملاعب متاحة على المنصة'], [bk, 'حجز مؤكد'], [us, 'لاعب مسجّل'], ['من ' + min, UI_CUR() + ' للساعة']]
      .map(x => '<div class="stat-item"><div class="stat-number">' + x[0] + '</div><div class="stat-label">' + x[1] + '</div></div>').join('');
  }
  const UI_CUR = () => CONFIG.currency;
  function featured() { feat.innerHTML = Store.stadiums().slice().sort((a, b) => b.rating - a.rating).slice(0, 3).map(UI.card).join(''); }
  function run(q, type) {
    const list = UI.search(q, type), active = (q || '').trim() || (type && type !== 'all');
    sec.hidden = !active; document.getElementById('featuredSection').hidden = !!active;
    if (!active) return;
    document.getElementById('resultsTitle').textContent = list.length ? 'نتائج البحث (' + list.length + ')' : 'نتائج البحث';
    res.innerHTML = list.length ? list.map(UI.card).join('') :
      '<div style="grid-column:1/-1">' + UI.emptyHtml('لا توجد ملاعب تطابق «' + UI.esc(q.trim() || 'هذا الفلتر') + '». جرّب اسمًا أو منطقة أخرى.', '<a class="btn-primary" href="stadium.html">عرض كل الملاعب</a>') + '</div>';
    sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  form.addEventListener('submit', e => { e.preventDefault(); run(form.q.value, form.type.value); });
  document.getElementById('clearSearch').onclick = () => { form.reset(); run('', 'all'); };
  const refresh = () => { stats(); featured(); if (!sec.hidden) run(form.q.value, form.type.value); };
  stats(); featured(); Store.onChange(refresh);
});
