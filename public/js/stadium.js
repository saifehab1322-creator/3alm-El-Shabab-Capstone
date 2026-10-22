document.addEventListener('ui:ready', () => {
  const grid = document.getElementById('grid'), form = document.getElementById('stSearch'), bar = document.getElementById('filters');
  let f = 'all';
  form.q.value = UI.qs.get('q') || '';
  function render() {
    let list = UI.search(form.q.value, form.type.value);
    if (f === 'available') list = list.filter(s => s.bookable);
    else if (f !== 'all') list = list.filter(s => s.type === f);
    grid.innerHTML = list.length ? list.map(UI.card).join('') :
      UI.emptyHtml('لا توجد ملاعب مطابقة. جرّب تغيير كلمات البحث أو الفلتر.', '<button class="btn-primary" id="resetF" type="button">إعادة ضبط</button>');
    const r = document.getElementById('resetF'); if (r) r.onclick = () => { form.reset(); setF('all'); };
  }
  function setF(v) { f = v; bar.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b.dataset.f === v)); render(); }
  bar.addEventListener('click', e => { const b = e.target.closest('.filter-btn'); if (b) setF(b.dataset.f); });
  form.addEventListener('submit', e => { e.preventDefault(); render(); });
  form.q.addEventListener('input', render);
  form.type.addEventListener('change', render);
  render(); Store.onChange(render);
});
