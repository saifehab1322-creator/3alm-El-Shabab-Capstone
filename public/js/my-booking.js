document.addEventListener('ui:ready', () => {
  const list = document.getElementById('list'), tabs = document.getElementById('tabs'), modal = document.getElementById('cancelModal');
  let tab = 'all', pending = null;
  const kind = b => b.status === 'cancelled' ? 'cancelled' : (Store.startOf(b) <= new Date() ? 'past' : 'upcoming');
  const label = { upcoming: ['confirmed', 'مؤكد'], past: ['done', 'منتهي'], cancelled: ['cancelled', 'ملغي'] };
  const WHO = { owner: 'ألغاه صاحب الملعب', admin: 'ألغته إدارة المنصة' };
  const cancelNote = b => b.status === 'cancelled' && WHO[b.cancelledBy] ? '<br><small class="hint">' + WHO[b.cancelledBy] + (b.cancelReason ? ': <span data-no-i18n>' + UI.esc(b.cancelReason) + '</span>' : '') + '</small>' : '';
  function render() {
    const u = Store.current(); if (!u) return location.replace('login.html');
    const all = Store.userBookings(u.id), rows = all.filter(b => tab === 'all' || kind(b) === tab);
    document.getElementById('countBadge').textContent = all.length + ' حجز';
    if (!rows.length) {
      list.innerHTML = UI.emptyHtml(all.length ? 'لا توجد حجوزات في هذا القسم.' : 'لا توجد حجوزات بعد. احجز ملعبك الأول الآن!', '<a class="btn-primary" href="stadium.html">تصفّح الملاعب</a>'); return;
    }
    list.innerHTML = '<div class="table-wrap"><table class="bookings-table"><thead><tr><th>الملعب</th><th>التاريخ</th><th>الموعد</th><th>السعر</th><th>الحالة</th><th></th></tr></thead><tbody>' +
      rows.map(b => { const k = kind(b), c = Store.canCancel(b, u), l = label[k];
        return '<tr><td><b style="color:var(--text)">' + UI.esc(b.stadiumName) + '</b><br><small class="hint">' + UI.esc(b.id) + '</small></td><td>' + UI.dateLabel(b.date) + '</td><td>' + UI.hourLabel(b.hour) + ' – ' + UI.hourLabel(b.hour + b.duration) +
          '</td><td>' + UI.money(b.price) + '</td><td><span class="status ' + l[0] + '">' + l[1] + '</span>' + cancelNote(b) + '</td><td class="actions">' +
          (k === 'upcoming' ? '<button class="btn-danger" data-c="' + b.id + '"' + (c.ok ? '' : ' disabled title="' + UI.esc(c.why) + '"') + '>إلغاء</button>' + (c.ok ? '' : '<small class="hint">' + UI.esc(c.why) + '</small>') : '') + '</td></tr>'; }).join('') + '</tbody></table></div>';
  }
  tabs.onclick = e => { const b = e.target.closest('.filter-tab'); if (!b) return; tab = b.dataset.t; tabs.querySelectorAll('.filter-tab').forEach(x => x.classList.toggle('active-tab', x === b)); render(); };
  list.onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; pending = Store.userBookings().find(x => x.id === b.dataset.c);
    document.getElementById('cancelText').textContent = pending.stadiumName + ' — ' + UI.dateLabel(pending.date) + ' ' + UI.hourLabel(pending.hour); modal.classList.add('open'); };
  document.getElementById('cancelNo').onclick = () => modal.classList.remove('open');
  document.getElementById('cancelYes').onclick = async () => { try { await Store.cancelBooking(pending.id); UI.toast('تم إلغاء الحجز'); } catch (err) { UI.toast(err.message); } modal.classList.remove('open'); };
  render(); Store.onChange(render);
  setInterval(render, 60000); // تحديث حالة الإلغاء/الانتهاء مع مرور الوقت
});
