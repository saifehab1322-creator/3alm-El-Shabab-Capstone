/* لوحة المسؤول. كل البيانات من /api/admin/* والخادم يرفض أي حساب غير مسؤول. */
document.addEventListener('ui:ready', () => {
  const E = UI.esc, $ = id => document.getElementById(id), api = Store.api;
  let D = null;
  const fmt = t => t ? new Date(t).toLocaleString(I18N.lang === 'en' ? 'en-GB' : 'ar-EG', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
  const table = (head, rows, empty) => rows.length ? '<table class="bookings-table"><thead><tr>' + head.map(h => '<th>' + h + '</th>').join('') + '</tr></thead><tbody>' + rows.join('') + '</tbody></table>' : '<p class="hint">' + empty + '</p>';
  const masked = c => '<span class="mono">OWN-••••-••••-' + E(c.hint) + '</span>';
  const STATE = { active: ['confirmed', 'غير مستخدم'], used: ['done', 'تم استخدامه'], revoked: ['cancelled', 'ملغى'], expired: ['cancelled', 'منتهي الصلاحية'] };
  const stBadge = u => u.status === 'suspended' ? '<span class="status cancelled">موقوف</span>' : '<span class="status confirmed">نشط</span>';
  const stBtn = u => u.role === 'admin' ? '' : (u.status === 'suspended' ? '<button class="btn-secondary btn-small" data-unsus="' + u.id + '">تفعيل الحساب</button>' : '<button class="btn-danger" data-sus="' + u.id + '">إيقاف الحساب</button>');
  let editId = null;
  const badge = s => '<span class="status ' + STATE[s][0] + '">' + STATE[s][1] + '</span>';

  async function load() { D = await api('GET', '/api/admin/overview'); render(); }
  function render() {
    const ok = D.bookings.filter(b => b.status === 'confirmed'), rev = ok.reduce((s, b) => s + b.price, 0);
    const owners = D.users.filter(u => u.role === 'owner'), activeCodes = D.codes.filter(c => c.state === 'active');
    $('kpis').innerHTML = [[D.bookings.length, 'إجمالي الحجوزات'], [ok.length, 'حجوزات مؤكدة'], [D.bookings.length - ok.length, 'حجوزات ملغية'], [UI.money(rev), 'قيمة الحجوزات المؤكدة'],
      [D.users.filter(u => u.role === 'user').length, 'مستخدمون مسجّلون'], [owners.length, 'أصحاب ملاعب'], [activeCodes.length, 'أكواد غير مستخدمة'], [D.users.filter(u => u.status === 'suspended').length, 'حسابات موقوفة'], [D.messages.length, 'رسائل تواصل']]
      .map(k => '<div class="kpi"><div class="kv">' + k[0] + '</div><div class="kl">' + k[1] + '</div></div>').join('');

    const cr = c => '<tr><td>' + masked(c) + '</td><td data-no-i18n>' + E(c.label) + '</td><td>' + badge(c.state) + '</td><td>' + fmt(c.createdAt) + '</td><td>' + fmt(c.expiresAt) + '</td>';
    $('codesActive').innerHTML = table(['الكود', 'لصالح / ملاحظة', 'الحالة', 'تاريخ الإنشاء', 'ينتهي في', ''], D.codes.filter(c => c.state === 'active').map(c =>
      cr(c) + '<td class="actions"><button class="btn-danger" data-revoke="' + c.id + '">إلغاء الكود</button><button class="btn-secondary btn-small" data-replace="' + c.id + '">كود بديل</button></td></tr>'), 'لا توجد أكواد غير مستخدمة.');
    $('codesUsed').innerHTML = table(['الكود', 'لصالح / ملاحظة', 'الحساب الذي استخدمه', 'تاريخ الاستخدام'], D.codes.filter(c => c.state === 'used').map(c =>
      '<tr><td>' + masked(c) + '</td><td data-no-i18n>' + E(c.label) + '</td><td data-no-i18n>' + E(c.usedBy.name) + '<br><small class="hint mono">' + E(c.usedBy.email) + '</small></td><td>' + fmt(c.usedAt) + '</td></tr>'), 'لا توجد أكواد مستخدمة بعد.');
    $('codesDead').innerHTML = table(['الكود', 'لصالح / ملاحظة', 'الحالة', 'ينتهي في', ''], D.codes.filter(c => c.state === 'revoked' || c.state === 'expired').map(c =>
      '<tr><td>' + masked(c) + '</td><td data-no-i18n>' + E(c.label) + '</td><td>' + badge(c.state) + '</td><td>' + fmt(c.expiresAt) + '</td><td>' + (c.replacedBy ? '<small class="hint">تم إصدار بديل</small>' : '<button class="btn-secondary btn-small" data-replace="' + c.id + '">كود بديل</button>') + '</td></tr>'), 'لا توجد أكواد ملغاة أو منتهية.');

    $('adminOwners').innerHTML = table(['الاسم', 'البريد', 'الهاتف', 'الملاعب', 'كود التفعيل', 'تاريخ التسجيل', 'الحالة', ''], D.owners.map(o =>
      '<tr><td data-no-i18n>' + E(o.name) + '</td><td dir="ltr">' + E(o.email) + '</td><td dir="ltr">' + E(o.phone) + '</td><td data-no-i18n>' + E(o.stadiums || '—') + '</td><td>' + (o.codeHint ? '<span class="mono">…' + E(o.codeHint) + '</span>' : '—') + '</td><td>' + fmt(o.createdAt) + '</td><td>' + stBadge(o) + '</td><td>' + stBtn({ id: o.id, role: 'owner', status: o.status }) + '</td></tr>'), 'لا يوجد أصحاب ملاعب مسجلون بعد.');

    $('adminBookings').innerHTML = table(['رقم الحجز', 'الملعب', 'العميل', 'الموبايل', 'الموعد', 'السعر', 'الحالة', ''], D.bookings.map(b => {
      const c = Store.canCancel(b, { role: 'admin' });
      return '<tr><td><small class="mono">' + E(b.id) + '</small></td><td>' + E(b.stadiumName) + '</td><td data-no-i18n>' + E(b.name) + '<br><small class="hint mono">' + E(b.userEmail || '') + '</small></td><td dir="ltr">' + E(b.phone) + '</td><td>' + E(b.date) + ' ' + UI.hourLabel(b.hour) + ' (' + b.duration + 'س)</td><td>' + UI.money(b.price) +
        '</td><td><span class="status ' + (b.status === 'confirmed' ? 'confirmed' : 'cancelled') + '">' + (b.status === 'confirmed' ? 'مؤكد' : 'ملغي') + '</span></td><td>' + (c.ok ? '<button class="btn-danger" data-cb="' + E(b.id) + '">إلغاء</button>' : '') + '</td></tr>';
    }), 'لا توجد حجوزات بعد.');
    $('adminStadiums').innerHTML = table(['الملعب', 'صاحب الملعب', 'الموقع', 'السعر/ساعة', 'متاح للحجز', 'منشور', 'حجوزات مؤكدة', ''], D.stadiums.map(s =>
      '<tr><td data-no-i18n>' + E(s.name) + '</td><td' + (s.ownerName ? ' data-no-i18n' : '') + '>' + E(s.ownerName || 'المنصة') + '</td><td data-no-i18n>' + E(UI.loc(s)) + '</td><td><input class="inline-input" type="number" min="1" value="' + s.price + '" data-price="' + E(s.id) + '" aria-label="سعر ' + E(s.name) + '"></td>' +
      '<td><label><input type="checkbox" data-bk="' + E(s.id) + '"' + (s.bookable ? ' checked' : '') + '> نعم</label></td><td><label><input type="checkbox" data-pub="' + E(s.id) + '"' + (s.published ? ' checked' : '') + '> نعم</label></td><td>' + ok.filter(b => b.stadiumId === s.id).length + '</td><td><button class="btn-secondary btn-small" data-edit="' + E(s.id) + '">تعديل</button></td></tr>'), '');
    $('adminUsers').innerHTML = table(['الاسم', 'البريد', 'الموبايل', 'الدور', 'تاريخ التسجيل', 'عدد الحجوزات', 'الحالة', ''], D.users.map(u =>
      '<tr><td data-no-i18n>' + E(u.name) + '</td><td dir="ltr">' + E(u.email) + '</td><td dir="ltr">' + E(u.phone || '—') + '</td><td>' + ({ admin: 'مسؤول', owner: 'صاحب ملعب', user: 'مستخدم' })[u.role] + '</td><td>' + fmt(u.createdAt) + '</td><td>' + u.bookings + '</td><td>' + stBadge(u) + '</td><td>' + stBtn(u) + '</td></tr>'), 'لا يوجد مستخدمون.');
    $('adminMessages').innerHTML = D.messages.length ? D.messages.map(m => '<div class="msg-item"><div style="display:flex;justify-content:space-between;gap:10px;"><div><h4 data-no-i18n>' + E(m.subject) + '</h4><small data-no-i18n>' + E(m.name) + ' — <span dir="ltr">' + E(m.email) + '</span> — ' + fmt(m.createdAt) + '</small></div><button class="btn-danger" data-dm="' + m.id + '">حذف</button></div><p data-no-i18n>' + E(m.message) + '</p></div>').join('') : '<p class="hint">لا توجد رسائل.</p>';
  }

  function openEdit(id) {
    const s = D.stadiums.find(x => x.id === id); if (!s) return; editId = id;
    const box = $('adminEdit'); box.hidden = false;
    box.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:14px;"><h3 style="margin:0;">تعديل بيانات الملعب — <span data-no-i18n>' + E(s.name) + '</span></h3><button type="button" class="btn-secondary btn-small" data-aclose="1">إغلاق</button></div>' +
      UI.stadiumForm(s, 'adminEditForm') + '<h3 style="margin:22px 0 10px;">صور الملعب</h3>' + (s.images.length ? '<div class="thumbs">' + s.images.map(p => '<div class="thumb"><img src="' + E(p) + '" alt=""><button type="button" data-adel="' + E(p) + '" aria-label="حذف">×</button></div>').join('') + '</div>' : '<p class="hint">لا توجد صور.</p>');
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function showCode(r, title) {
    $('newCode').innerHTML = '<div class="code-reveal"><b>' + title + '</b><code class="code-big" id="codeText">' + E(r.code) + '</code><p class="hint warn" style="margin-bottom:10px;">انسخ الكود الآن وسلّمه لصاحب الملعب بعد التحقق من بياناته. لن يظهر كاملًا مرة أخرى. ينتهي في ' + fmt(r.expiresAt) + '.</p><button type="button" class="btn-primary btn-small" id="copyCode">نسخ الكود</button></div>';
    $('copyCode').onclick = async () => { try { await navigator.clipboard.writeText(r.code); UI.toast('تم نسخ الكود'); } catch (e) { const t = $('codeText'), s = getSelection(), rg = document.createRange(); rg.selectNodeContents(t); s.removeAllRanges(); s.addRange(rg); UI.toast('حدّد الكود وانسخه يدويًا'); } };
  }
  const fail = e => UI.toast(e.message);

  $('codeForm').addEventListener('submit', async e => {
    e.preventDefault(); const f = e.target;
    const v = Validate.validate(f, { label: [Validate.R.required, Validate.R.min(3)], days: [Validate.R.required, x => +x >= 1 && +x <= 90 ? '' : 'مدة الصلاحية من 1 إلى 90 يومًا'] });
    if (!v.ok) return;
    try { const r = await api('POST', '/api/admin/codes', { label: v.data.label.trim(), days: parseInt(v.data.days, 10) }); showCode(r, 'تم إنشاء الكود'); f.label.value = ''; Validate.setError(f.label, ''); await load(); } catch (err) { Validate.serverError(f, err); }
  });
  document.addEventListener('submit', async e => {
    if (e.target.id !== 'adminEditForm') return; e.preventDefault(); const f = e.target, R = Validate.R;
    const v = Validate.validate(f, { name: [R.required, R.min(3)], address: [R.required, R.min(3)], price: [R.required, x => +x >= 1 ? '' : 'أدخل سعرًا صحيحًا للساعة'] });
    if (!v.ok) return Validate.message(f, 'err', 'يرجى تصحيح الحقول المحددة');
    try { await api('PUT', '/api/admin/stadiums/' + encodeURIComponent(editId), UI.stadiumBody(f)); await load(); Store.refresh(); openEdit(editId); Validate.message($('adminEditForm'), 'ok', 'تم حفظ بيانات الملعب'); } catch (err) { Validate.serverError(f, err); }
  });
  document.addEventListener('click', async e => {
    const t = e.target.closest('button'); if (!t) return;
    try {
      if (t.dataset.edit) openEdit(t.dataset.edit);
      if (t.dataset.aclose) { $('adminEdit').hidden = true; editId = null; }
      if (t.dataset.adel && confirm(I18N.t('حذف هذه الصورة؟'))) { await api('DELETE', '/api/admin/stadiums/' + encodeURIComponent(editId) + '/images', { path: t.dataset.adel }); await load(); Store.refresh(); openEdit(editId); }
      if (t.dataset.sus && confirm(I18N.t('إيقاف هذا الحساب؟ سيُسجَّل خروجه فورًا وتُخفى ملاعبه عن الجمهور.'))) { await api('POST', '/api/admin/users/' + t.dataset.sus + '/suspend'); UI.toast('تم إيقاف الحساب'); await load(); Store.refresh(); }
      if (t.dataset.unsus) { await api('POST', '/api/admin/users/' + t.dataset.unsus + '/unsuspend'); UI.toast('تم تفعيل الحساب'); await load(); Store.refresh(); }
      if (t.dataset.revoke && confirm(I18N.t('إلغاء هذا الكود؟ لن يمكن استخدامه بعد ذلك.'))) { await api('POST', '/api/admin/codes/' + t.dataset.revoke + '/revoke'); UI.toast('تم إلغاء الكود'); await load(); }
      if (t.dataset.replace && confirm(I18N.t('إنشاء كود بديل؟ سيُلغى الكود القديم إن كان ما زال صالحًا.'))) { const r = await api('POST', '/api/admin/codes/' + t.dataset.replace + '/replace', { days: 7 }); showCode(r, 'تم إنشاء الكود البديل'); await load(); location.hash = '#sec-codes'; }
      if (t.dataset.cb && confirm(I18N.t('إلغاء هذا الحجز؟'))) { await Store.cancelBooking(t.dataset.cb); UI.toast('تم إلغاء الحجز'); await load(); }
      if (t.dataset.dm && confirm(I18N.t('حذف هذه الرسالة؟'))) { await api('DELETE', '/api/admin/messages/' + t.dataset.dm); await load(); }
    } catch (err) { fail(err); }
  });
  document.addEventListener('change', async e => {
    const p = e.target.closest('[data-price]'), b = e.target.closest('[data-bk]'), u = e.target.closest('[data-pub]');
    try {
      if (p) { const v = parseInt(p.value, 10); if (v > 0) { await api('PATCH', '/api/admin/stadiums/' + p.dataset.price, { price: v }); UI.toast('تم تحديث السعر'); Store.refresh(); } else { UI.toast('أدخل سعرًا صحيحًا'); await load(); } }
      if (b) { await api('PATCH', '/api/admin/stadiums/' + b.dataset.bk, { bookable: b.checked }); UI.toast('تم التحديث'); Store.refresh(); }
      if (u) { await api('PATCH', '/api/admin/stadiums/' + u.dataset.pub, { published: u.checked }); UI.toast('تم التحديث'); Store.refresh(); }
    } catch (err) { fail(err); await load(); }
  });
  load().catch(fail);
  setInterval(() => { if (!document.hidden && (!document.activeElement || document.activeElement.tagName !== 'INPUT')) load().catch(() => {}); }, 30000);
});
