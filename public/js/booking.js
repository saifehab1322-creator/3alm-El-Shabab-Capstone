document.addEventListener('ui:ready', () => {
  const root = document.getElementById('bookingRoot'), user = Store.current();
  const stadiums = Store.stadiums();
  const today = Store.dateStr(new Date());
  const maxDate = Store.dateStr(new Date(Date.now() + CONFIG.maxDaysAhead * 864e5));
  const pre = UI.qs.get('stadium');
  const st = { id: stadiums.some(s => s.id === pre && s.bookable) ? pre : '', date: today, hour: null, duration: 1 };
  let done = null;
  st.name = user.name; st.phone = user.phone; st.notes = '';

  function slotsHtml(s) {
    const taken = Store.taken(s.id, st.date), hrs = Store.hours(s);
    return hrs.map(h => {
      let dis = Store.isPast(st.date, h);
      for (let k = 0; k < st.duration; k++) if (taken.has(h + k) || h + k >= s.close) dis = true;
      return '<button type="button" class="slot' + (st.hour === h ? ' selected' : '') + '" data-h="' + h + '"' + (dis ? ' disabled' : '') + '>' + UI.hourLabel(h) + '</button>';
    }).join('');
  }
  function draw() {
    if (done) {
      root.innerHTML = '<div class="panel success-box"><div class="big"><i class="fa-solid fa-circle-check"></i></div><h2>تم تأكيد حجزك</h2><p class="hint" style="margin-bottom:14px;">رقم الحجز: <code>' + UI.esc(done.id) + '</code></p>' +
        '<p style="color:var(--text-dim);margin-bottom:18px;line-height:1.9;">' + UI.esc(done.stadiumName) + '<br>' + UI.dateLabel(done.date) + ' — ' + UI.hourLabel(done.hour) + ' (' + done.duration + ' ساعة)<br>الإجمالي: ' + UI.money(done.price) + '</p>' +
        '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;"><a class="btn-primary" href="my-booking.html">حجوزاتي</a><button class="btn-secondary" id="again" type="button">حجز آخر</button></div></div>';
      document.getElementById('again').onclick = () => { done = null; st.hour = null; draw(); };
      return;
    }
    const s = st.id ? Store.stadium(st.id) : null;
    const opts = '<option value="">— اختر الملعب —</option>' + stadiums.map(x => '<option value="' + x.id + '"' + (x.id === st.id ? ' selected' : '') + (x.bookable ? '' : ' disabled') + '>' + UI.esc(x.name) + ' — ' + UI.money(x.price) + (x.bookable ? '' : ' (محجوز بالكامل)') + '</option>').join('');
    root.innerHTML = '<div class="book-layout"><form class="panel" id="bookForm" novalidate>' +
      '<div class="book-section"><div class="step-title"><b>1</b> اختر الملعب</div><div class="form-group"><select name="stadium" id="selS" aria-label="الملعب">' + opts + '</select></div></div>' +
      '<div class="book-section"><div class="step-title"><b>2</b> التاريخ والمدة</div><div class="form-grid"><div class="form-group"><label for="dt">التاريخ</label><input type="date" id="dt" name="date" min="' + today + '" max="' + maxDate + '" value="' + st.date + '"></div>' +
      '<div class="form-group"><label for="du">المدة</label><select id="du" name="duration">' + [1, 2, 3].filter(n => n <= CONFIG.maxDuration).map(n => '<option value="' + n + '"' + (st.duration === n ? ' selected' : '') + '>' + n + ' ساعة</option>').join('') + '</select></div></div></div>' +
      '<div class="book-section"><div class="step-title"><b>3</b> اختر الموعد</div>' + (s ? '<div class="slots" id="slots">' + slotsHtml(s) + '</div><div class="legend"><span>الخيارات المعطّلة محجوزة أو انتهى وقتها</span></div>' : '<p class="hint">اختر الملعب أولًا لعرض المواعيد المتاحة.</p>') +
      '<div class="field-error" id="slotErr"></div></div>' +
      '<div class="book-section"><div class="step-title"><b>4</b> بيانات الحجز</div><div class="form-grid"><div class="form-group"><label for="bn">الاسم</label><input id="bn" name="name" value="' + UI.esc(st.name) + '"></div>' +
      '<div class="form-group"><label for="bp">رقم الموبايل</label><input id="bp" name="phone" dir="ltr" value="' + UI.esc(st.phone) + '" placeholder="01012345678"></div>' +
      '<div class="form-group full"><label for="bno">ملاحظات (اختياري)</label><textarea id="bno" name="notes" rows="2">' + UI.esc(st.notes) + '</textarea></div></div></div></form>' +
      '<aside class="panel summary"><h3>ملخص الحجز</h3><dl><dt>الملعب</dt><dd>' + (s ? UI.esc(s.name) : '—') + '</dd><dt>الموقع</dt><dd>' + (s ? UI.esc(UI.loc(s)) : '—') + '</dd><dt>التاريخ</dt><dd>' + UI.dateLabel(st.date) +
      '</dd><dt>الموعد</dt><dd>' + (st.hour != null ? UI.hourLabel(st.hour) + ' – ' + UI.hourLabel(st.hour + st.duration) : '—') + '</dd></dl><div class="total"><span>الإجمالي</span><b>' + (s ? UI.money(s.price * st.duration) : '—') + '</b></div>' +
      '<button class="btn-primary btn-block" id="confirmBtn" type="button">تأكيد الحجز</button></aside></div>';
    wire();
  }
  function wire() {
    const form = document.getElementById('bookForm');
    document.getElementById('selS').onchange = e => { st.id = e.target.value; st.hour = null; draw(); };
    document.getElementById('dt').onchange = e => { st.date = e.target.value >= today && e.target.value <= maxDate ? e.target.value : today; st.hour = null; draw(); };
    document.getElementById('du').onchange = e => { st.duration = +e.target.value; st.hour = null; draw(); };
    const sl = document.getElementById('slots');
    form.addEventListener('input', () => { st.name = form.name.value; st.phone = form.phone.value; st.notes = form.notes.value; });
    if (sl) sl.onclick = e => { const b = e.target.closest('.slot'); if (!b || b.disabled) return; st.hour = +b.dataset.h; draw(); };
    document.getElementById('confirmBtn').onclick = () => confirmBooking(form);
  }
  async function confirmBooking(form) {
    const R = Validate.R, slotErr = document.getElementById('slotErr'); slotErr.textContent = '';
    const v = Validate.validate(form, { name: [R.required, R.min(3)], phone: [R.required, R.phone] });
    const s = st.id ? Store.stadium(st.id) : null;
    let ok = v.ok;
    if (!s) { Validate.setError(form.stadium, 'اختر الملعب'); ok = false; }
    if (!st.date) { Validate.setError(form.date, 'اختر التاريخ'); ok = false; }
    if (s && st.hour == null) { slotErr.textContent = 'اختر موعدًا متاحًا'; ok = false; }
    if (!ok) { Validate.message(form, 'err', 'يرجى تصحيح الحقول المحددة قبل تأكيد الحجز'); return; }
    try {
      done = await Store.createBooking({ stadiumId: s.id, date: st.date, hour: st.hour, duration: st.duration, name: v.data.name.trim(), phone: v.data.phone.trim(), notes: form.notes.value.trim() });
      UI.toast('تم تأكيد الحجز'); draw();
    } catch (err) { st.hour = null; draw(); Validate.message(document.getElementById('bookForm'), 'err', err.message); }
  }
  draw();
  // التحديث الدوري يغيّر خانات المواعيد فقط حتى لا تضيع بيانات النموذج
  Store.onChange(() => { if (done) return; const s = st.id && Store.stadium(st.id), sl = document.getElementById('slots'); if (s && sl) { if (st.hour != null && Store.taken(s.id, st.date).has(st.hour)) st.hour = null; sl.innerHTML = slotsHtml(s); } });
});
