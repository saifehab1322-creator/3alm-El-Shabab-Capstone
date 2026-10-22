/* لوحة صاحب الملعب. كل البيانات من /api/owner/* والخادم يقيّدها بحساب المالك الحالي فقط. */
document.addEventListener('ui:ready', async () => {
  const E = UI.esc, R = Validate.R, $ = id => document.getElementById(id);
  let stadiums = [], bookings = [], blocks = [], sel = null, tab = 'all', availDate = Store.dateStr(new Date());
  const api = Store.api, fail = e => UI.toast(e.message);
  const sUrl = p => '/api/owner/stadiums/' + encodeURIComponent(sel) + p;

  async function loadBlocks() { blocks = sel ? (await api('GET', sUrl('/blocks'))).blocks : []; }
  async function loadAll() {
    const [s, b] = await Promise.all([api('GET', '/api/owner/stadiums'), api('GET', '/api/owner/bookings')]);
    stadiums = s.stadiums; bookings = b.bookings;
    if (!sel || !stadiums.some(x => x.id === sel)) sel = stadiums[0] && stadiums[0].id;
    await loadBlocks(); renderAll();
  }
  async function loadBookings() { bookings = (await api('GET', '/api/owner/bookings')).bookings; renderKpis(); renderGrid(); renderBookings(); }
  const cur = () => stadiums.find(s => s.id === sel);
  const kind = b => b.status === 'cancelled' ? 'cancelled' : (Store.startOf(b) <= new Date() ? 'past' : 'upcoming');

  function renderKpis() {
    const ok = bookings.filter(b => b.status === 'confirmed'), up = ok.filter(b => kind(b) === 'upcoming');
    $('ownKpis').innerHTML = [[stadiums.length, 'ملاعبي'], [up.length, 'حجوزات قادمة'], [ok.length, 'حجوزات مؤكدة'], [UI.money(ok.reduce((s, b) => s + b.price, 0)), 'قيمة الحجوزات المؤكدة'], [bookings.length - ok.length, 'حجوزات ملغية']]
      .map(k => '<div class="kpi"><div class="kv">' + k[0] + '</div><div class="kl">' + k[1] + '</div></div>').join('');
  }
  function renderTabs() {
    $('ownTabs').innerHTML = stadiums.map(s => '<button class="filter-tab' + (s.id === sel ? ' active-tab' : '') + '" data-s="' + E(s.id) + '">' + E(s.name) + '</button>').join('') + '<button class="filter-tab" id="addS" type="button">+ إضافة ملعب</button>';
  }
  function renderEdit() {
    const s = cur(); if (!s) { $('ownEdit').innerHTML = ''; return; }
    $('ownEdit').innerHTML = '<h2>بيانات الملعب</h2>' + (s.published ? '' : '<div class="banner">ملعبك غير ظاهر للجمهور بعد. أكمل البيانات وفعّل «نشر الملعب» ثم احفظ.</div>') + UI.stadiumForm(s, 'editForm');
  }
  function renderImages() {
    const s = cur(); if (!s) { $('ownImages').innerHTML = ''; return; }
    const imgs = s.images;
    $('ownImages').innerHTML = '<h2>صور الملعب</h2>' + (imgs.length ? '<div class="thumbs">' + imgs.map(p => '<div class="thumb"><img src="' + E(p) + '" alt=""><button type="button" data-del="' + E(p) + '" aria-label="حذف">×</button></div>').join('') + '</div>' : '<p class="hint" style="margin-bottom:12px;">لم تضف صورًا بعد.</p>') +
      '<label class="btn-secondary btn-small" style="display:inline-block;cursor:pointer;">+ إضافة صور<input type="file" id="imgInput" accept="image/jpeg,image/png,image/webp" multiple hidden></label><p class="hint" style="margin-top:8px;">حتى 8 صور. تُصغَّر الصورة تلقائيًا قبل الرفع، وتظهر كلها للزوار في معرض صور الملعب.</p>';
  }
  /* --- المواعيد: شبكة اليوم (تتحدث دوريًا) + نموذج الإغلاق (لا يُعاد رسمه حتى لا تضيع البيانات المكتوبة) --- */
  function renderAvailShell() {
    const s = cur(); if (!s) { $('ownAvail').innerHTML = ''; return; }
    $('ownAvail').innerHTML = '<h2>المواعيد المتاحة</h2><div class="form-group" style="max-width:240px;margin-bottom:14px;"><label for="availDate">التاريخ</label><input type="date" id="availDate" value="' + availDate + '"></div><div id="availGrid"></div>' +
      '<h3 style="margin:24px 0 6px;font-size:.98rem;">إغلاق فترة معيّنة (صيانة / حجز خاص / إجازة)</h3><p class="hint" style="margin-bottom:12px;">الفترات المغلقة تظهر للزوار كمواعيد غير متاحة. لا يمكن إغلاق فترة بها حجز مؤكد؛ ألغِ الحجز أولًا.</p>' +
      '<form id="blockForm" class="form-grid" novalidate>' +
      '<div class="form-group"><label for="bfDate">التاريخ</label><input type="date" id="bfDate" name="date" min="' + Store.dateStr(new Date()) + '" value="' + availDate + '"></div>' +
      '<div class="form-group"><label for="bfReason">السبب (اختياري)</label><input id="bfReason" name="reason" maxlength="100"></div>' +
      '<div class="form-group"><label for="bfFrom">من الساعة</label><select id="bfFrom" name="from">' + UI.hourOpts(0, 23, s.open) + '</select></div>' +
      '<div class="form-group"><label for="bfTo">إلى الساعة</label><select id="bfTo" name="to">' + UI.hourOpts(1, 24, s.close) + '</select></div>' +
      '<div class="full checks"><label><input type="checkbox" name="full"> اليوم كاملًا</label></div>' +
      '<div class="full"><button class="btn-primary" type="submit">إغلاق هذه الفترة</button></div></form>' +
      '<h3 style="margin:22px 0 8px;font-size:.95rem;">الفترات المغلقة القادمة</h3><div class="table-wrap" id="blockList"></div>';
    renderGrid(); renderBlockList();
  }
  function renderGrid() {
    const s = cur(), box = $('availGrid'); if (!s || !box) return;
    const taken = new Map(), shut = new Map();
    bookings.filter(b => b.stadiumId === s.id && b.date === availDate && b.status === 'confirmed').forEach(b => { for (let k = 0; k < b.duration; k++) taken.set(b.hour + k, b); });
    blocks.filter(x => x.date === availDate).forEach(x => { for (let h = x.from; h < x.to; h++) shut.set(h, x); });
    const hrs = []; for (let h = s.open; h < s.close; h++) hrs.push(h);
    box.innerHTML = '<div class="slots wide">' + hrs.map(h => {
      const b = taken.get(h), x = shut.get(h);
      if (b) return '<button type="button" class="slot booked" disabled title="' + E(b.name) + '">' + UI.hourLabel(h) + ' — ' + E(b.name) + '</button>';
      if (x) return '<button type="button" class="slot blocked" disabled title="' + E(x.reason) + '">' + UI.hourLabel(h) + ' — مغلق</button>';
      return '<button type="button" class="slot free" disabled>' + UI.hourLabel(h) + ' — متاح</button>';
    }).join('') + '</div><p class="hint" style="margin-top:10px;">ساعات العمل: ' + UI.hourLabel(s.open) + ' – ' + UI.hourLabel(s.close) + '. غيّرها من نموذج بيانات الملعب أعلاه.</p>';
  }
  function renderBlockList() {
    const box = $('blockList'); if (!box) return;
    box.innerHTML = blocks.length ? '<table class="bookings-table"><thead><tr><th>التاريخ</th><th>الفترة</th><th>السبب</th><th></th></tr></thead><tbody>' +
      blocks.map(x => '<tr><td>' + E(x.date) + '</td><td>' + UI.hourLabel(x.from) + ' – ' + UI.hourLabel(x.to) + '</td><td data-no-i18n>' + E(x.reason || '—') + '</td><td><button class="btn-danger" data-bdel="' + x.id + '">حذف</button></td></tr>').join('') + '</tbody></table>'
      : '<p class="hint">لا توجد فترات مغلقة.</p>';
  }
  const BY = { owner: 'ألغيته أنت', user: 'ألغاه العميل', admin: 'ألغته الإدارة' };
  function renderBookings() {
    const rows = bookings.filter(b => tab === 'all' || kind(b) === tab), lab = { upcoming: ['confirmed', 'مؤكد'], past: ['done', 'منتهي'], cancelled: ['cancelled', 'ملغي'] };
    $('ownBookings').innerHTML = rows.length ? '<table class="bookings-table"><thead><tr><th>رقم الحجز</th><th>الملعب</th><th>العميل</th><th>الموبايل</th><th>الموعد</th><th>السعر</th><th>ملاحظات</th><th>الحالة</th><th></th></tr></thead><tbody>' +
      rows.map(b => { const k = kind(b), l = lab[k];
        return '<tr><td><small class="mono">' + E(b.id) + '</small></td><td>' + E(b.stadiumName) + '</td><td data-no-i18n>' + E(b.name) + '</td><td dir="ltr">' + E(b.phone) + '</td><td>' + E(b.date) + ' ' + UI.hourLabel(b.hour) + ' – ' + UI.hourLabel(b.hour + b.duration) + '</td><td>' + UI.money(b.price) + '</td><td data-no-i18n>' + E(b.notes || '—') + '</td>' +
          '<td><span class="status ' + l[0] + '">' + l[1] + '</span>' + (k === 'cancelled' && b.cancelledBy ? '<br><small class="hint">' + BY[b.cancelledBy] + '</small>' : '') + '</td>' +
          '<td>' + (k === 'upcoming' ? '<button class="btn-danger" data-ocancel="' + E(b.id) + '">إلغاء</button>' : '') + '</td></tr>'; }).join('') + '</tbody></table>'
      : '<p class="hint">لا توجد حجوزات في هذا القسم.</p>';
  }
  function renderAll() { renderKpis(); renderTabs(); renderEdit(); renderImages(); renderAvailShell(); renderBookings(); }

  /* --- أحداث --- */
  $('ownTabs').onclick = async e => {
    const b = e.target.closest('.filter-tab'); if (!b) return;
    if (b.id === 'addS') { $('addStadiumBox').innerHTML = '<div class="panel"><h3>إضافة ملعب جديد</h3><form id="addForm" class="form-grid" novalidate><div class="form-group"><label for="an">اسم الملعب</label><input id="an" name="name"></div><div class="form-group"><label for="aa">العنوان والموقع</label><input id="aa" name="address"></div><div class="full"><button class="btn-primary" type="submit">إضافة</button></div></form></div>'; return; }
    sel = b.dataset.s; try { await loadBlocks(); } catch (err) { fail(err); } renderTabs(); renderEdit(); renderImages(); renderAvailShell();
  };
  document.addEventListener('submit', async e => {
    const f = e.target;
    if (f.id === 'addForm') {
      e.preventDefault(); const v = Validate.validate(f, { name: [R.required, R.min(3)], address: [R.required, R.min(3)] }); if (!v.ok) return;
      try { const r = await api('POST', '/api/owner/stadiums', { name: v.data.name.trim(), address: v.data.address.trim() }); sel = r.stadium.id; $('addStadiumBox').innerHTML = ''; await loadAll(); UI.toast('تمت إضافة الملعب'); } catch (err) { Validate.serverError(f, err); }
    }
    if (f.id === 'editForm') {
      e.preventDefault();
      const v = Validate.validate(f, { name: [R.required, R.min(3)], address: [R.required, R.min(3)], price: [R.required, x => +x >= 1 ? '' : 'أدخل سعرًا صحيحًا للساعة'] });
      if (!v.ok) return Validate.message(f, 'err', 'يرجى تصحيح الحقول المحددة');
      try { await api('PUT', sUrl(''), UI.stadiumBody(f)); await Store.refresh(); await loadAll(); Validate.message($('editForm'), 'ok', 'تم حفظ بيانات الملعب'); } catch (err) { Validate.serverError(f, err); }
    }
    if (f.id === 'blockForm') {
      e.preventDefault(); const full = f.elements.full.checked;
      const v = Validate.validate(f, { date: [R.required] }); if (!v.ok) return;
      const body = { date: f.elements.date.value, from: full ? 0 : +f.elements.from.value, to: full ? 24 : +f.elements.to.value, reason: f.elements.reason.value.trim() };
      if (body.from >= body.to) return Validate.setError(f.elements.from, 'حدّد فترة صحيحة (من/إلى)');
      Validate.setError(f.elements.from, '');
      try { blocks = (await api('POST', sUrl('/blocks'), body)).blocks; availDate = body.date; $('availDate').value = availDate; renderGrid(); renderBlockList(); f.elements.reason.value = ''; Validate.message(f, 'ok', 'تم إغلاق الفترة'); await Store.refresh(); } catch (err) { Validate.serverError(f, err); }
    }
  });
  document.addEventListener('change', async e => {
    if (e.target.id === 'availDate') { availDate = e.target.value || availDate; renderGrid(); }
    if (e.target.name === 'full' && e.target.form && e.target.form.id === 'blockForm') { e.target.form.elements.from.disabled = e.target.form.elements.to.disabled = e.target.checked; }
    if (e.target.id === 'imgInput') {
      const files = Array.from(e.target.files); e.target.value = '';
      for (const f of files) { try { UI.toast('جارٍ رفع الصورة...'); const r = await api('POST', sUrl('/images'), { dataUrl: await toJpeg(f) }); stadiums = stadiums.map(s => s.id === sel ? r.stadium : s); renderImages(); } catch (err) { fail(err); break; } }
      Store.refresh();
    }
  });
  document.addEventListener('click', async e => {
    const d = e.target.closest('[data-del]');
    if (d && confirm(I18N.t('حذف هذه الصورة؟'))) { try { const r = await api('DELETE', sUrl('/images'), { path: d.dataset.del }); stadiums = stadiums.map(s => s.id === sel ? r.stadium : s); renderImages(); Store.refresh(); } catch (err) { fail(err); } }
    const bd = e.target.closest('[data-bdel]');
    if (bd) { try { blocks = (await api('DELETE', sUrl('/blocks/' + bd.dataset.bdel))).blocks; renderGrid(); renderBlockList(); UI.toast('تم فتح الفترة'); Store.refresh(); } catch (err) { fail(err); } }
    const oc = e.target.closest('[data-ocancel]');
    if (oc) {
      const reason = prompt(I18N.t('سبب الإلغاء (اختياري) — سيظهر للعميل'), ''); if (reason === null) return;
      try { await api('POST', '/api/owner/bookings/' + encodeURIComponent(oc.dataset.ocancel) + '/cancel', { reason: reason.trim() }); UI.toast('تم إلغاء الحجز'); await loadBookings(); Store.refresh(); } catch (err) { fail(err); }
    }
    const t = e.target.closest('#bkTabs .filter-tab'); if (t) { tab = t.dataset.t; document.querySelectorAll('#bkTabs .filter-tab').forEach(x => x.classList.toggle('active-tab', x === t)); renderBookings(); }
  });
  function toJpeg(file) {
    return new Promise((res, rej) => {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return rej(new Error('الصورة يجب أن تكون JPG أو PNG أو WEBP'));
      const fr = new FileReader(); fr.onerror = () => rej(new Error('ملف الصورة غير صالح'));
      fr.onload = () => { const img = new Image(); img.onerror = () => rej(new Error('ملف الصورة غير صالح'));
        img.onload = () => { const k = Math.min(1, 1400 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.82)); };
        img.src = fr.result; };
      fr.readAsDataURL(file);
    });
  }
  try { await loadAll(); } catch (e) { fail(e); }
  setInterval(() => { if (!document.hidden) loadBookings().catch(() => {}); }, 30000);
});
