/* واجهة مشتركة: الشريط الجانبي/السفلي حسب حالة الدخول، الثيم، التوست، كروت الملاعب، حماية الصفحات */
(function () {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => n + ' ' + window.CONFIG.currency;
  const EN = window.I18N && I18N.lang === 'en';
  const hourLabel = h => { const hh = h % 24; const p = hh >= 12 ? (EN ? 'PM' : 'م') : (EN ? 'AM' : 'ص'); return (hh % 12 || 12) + ':00 ' + p; };
  const loc = s => (EN || !s.locationAr) ? s.location : s.locationAr;
  const dateLabel = d => new Date(d + 'T00:00:00').toLocaleDateString(EN ? 'en-GB' : 'ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const qs = new URLSearchParams(location.search);
  const page = document.body.dataset.page || '';
  const need = document.body.dataset.auth || '';       // user | admin
  const here = location.pathname.split('/').pop() + location.search;

  /* ---- حماية الصفحات ---- */
  function guard() {
    const u = Store.current();
    if (need && !u) { location.replace((need === 'owner' ? 'owner-login.html' : 'login.html') + '?next=' + encodeURIComponent(here)); return false; }
    if ((need === 'admin' && u.role !== 'admin') || (need === 'owner' && u.role !== 'owner')) document.body.dataset.denied = need;   // العرض فقط؛ الخادم يرفض الطلبات فعليًا
    return true;
  }

  /* ---- الشريط الجانبي ---- */
  function nav(href, icon, label, key, cls) {
    return '<li class="nav-item' + (page === key ? ' active' : '') + (cls ? ' ' + cls : '') + '"><a href="' + href + '"><i class="' + icon + '"></i> <span>' + label + '</span></a></li>';
  }
  function buildShell() {
    const u = Store.current();
    const acct = u
      ? '<div class="acct-box"><div class="acct-avatar">' + esc(u.name.trim().charAt(0) || '?') + '</div><div><div class="acct-name" data-no-i18n>' + esc(u.name) + '</div><div class="acct-mail" data-no-i18n>' + esc(u.email) + '</div></div></div>'
      : '';
    const accountLinks = u
      ? nav('profile.html', 'fa-regular fa-user', 'حسابي', 'profile') + nav('my-booking.html', 'fa-solid fa-calendar-days', 'حجوزاتي', 'my-booking') +
        (u.role === 'admin' ? nav('admin.html', 'fa-solid fa-gauge-high', 'لوحة التحكم', 'admin') : '') +
        (u.role === 'owner' ? nav('owner-dashboard.html', 'fa-solid fa-store', 'لوحة صاحب الملعب', 'owner-dashboard') : '') +
        '<li class="nav-item logout"><a href="#" id="logoutLink"><i class="fa-solid fa-right-from-bracket"></i> <span>تسجيل الخروج</span></a></li>'
      : nav('register.html', 'fa-solid fa-user-plus', 'إنشاء حساب', 'register') + nav('login.html', 'fa-solid fa-right-to-bracket', 'تسجيل الدخول', 'login');
    const light = document.body.classList.contains('light-mode');
    const shell = document.createElement('div');
    shell.innerHTML =
      '<div class="sidebar-overlay" id="sidebarOverlay"></div>' +
      '<button class="mobile-menu-btn" id="mobileMenuBtn" aria-label="القائمة"><span></span><span></span><span></span></button>' +
      '<nav class="mobile-bottom-nav"><div class="bottom-nav-items">' +
        bn('index.html', 'fa-solid fa-house', 'الرئيسية', 'index') + bn('stadium.html', 'fa-solid fa-futbol', 'الملاعب', 'stadium') +
        bn('booking.html', 'fa-regular fa-calendar-check', 'الحجز', 'booking') +
        (u ? bn('my-booking.html', 'fa-solid fa-calendar-days', 'حجوزاتي', 'my-booking') : bn('login.html', 'fa-solid fa-right-to-bracket', 'دخول', 'login')) +
        '<button class="bottom-nav-item" id="moreBtn"><i class="fa-solid fa-bars"></i><span>المزيد</span></button>' +
      '</div></nav><div class="toast" id="toast"></div>' +
      '<aside class="sidebar" id="sidebar"><div class="sidebar-logo"><div class="logo-icon"><i class="fa-solid fa-futbol" style="color:#0a0f0d;"></i></div>' +
        '<div class="logo-text">3ALM ELSHABAB<span>منصة حجز ملاعب سوهاج</span></div></div>' + acct +
        '<span class="nav-section-label">القائمة</span><ul class="nav-list">' +
          nav('index.html', 'fa-solid fa-house', 'الرئيسية', 'index') + nav('stadium.html', 'fa-solid fa-futbol', 'الملاعب', 'stadium') + nav('booking.html', 'fa-regular fa-calendar-check', 'الحجز', 'booking') +
        '</ul><span class="nav-section-label" style="margin-top:8px;">الحساب</span><ul class="nav-list">' + accountLinks +
          nav('contact.html', 'fa-regular fa-envelope', 'تواصل', 'contact') + nav('about.html', 'fa-solid fa-circle-info', 'عنا', 'about') + '</ul>' +
        (u ? '' : '<span class="nav-section-label" style="margin-top:8px;">أصحاب الملاعب</span><ul class="nav-list">' + nav('owner-register.html', 'fa-solid fa-store', 'تسجيل صاحب ملعب', 'owner-register') + nav('owner-login.html', 'fa-solid fa-key', 'دخول أصحاب الملاعب', 'owner-login') + '</ul>') +
        '<div style="margin-top:auto;"><button class="theme-toggle lang-btn" id="langBtn" data-no-i18n><div class="theme-toggle-label"><span style="font-size:1rem;">🌐</span><span>' + (EN ? 'العربية' : 'English') + '</span></div><div style="font-size:.65rem;opacity:.6;letter-spacing:1px;">AR / EN</div></button><button class="theme-toggle" id="themeBtn" style="width:100%;cursor:pointer;"><div class="theme-toggle-label"><span class="theme-toggle-icon">' + (light ? '☀️' : '🌙') + '</span>' +
        '<span class="theme-toggle-text">' + (light ? 'الوضع الليلي' : 'الوضع النهاري') + '</span></div><div class="theme-toggle-switch"></div></button></div></aside>';
    while (shell.firstChild) document.body.insertBefore(shell.firstChild, document.body.firstChild);
    const sb = document.getElementById('sidebar'), ov = document.getElementById('sidebarOverlay'), mb = document.getElementById('mobileMenuBtn');
    const toggle = open => { sb.classList.toggle('open', open); ov.classList.toggle('open', open); mb.classList.toggle('open', open); };
    mb.onclick = () => toggle(!sb.classList.contains('open'));
    document.getElementById('moreBtn').onclick = () => toggle(true);
    ov.onclick = () => toggle(false);
    document.getElementById('langBtn').onclick = () => I18N.set(EN ? 'ar' : 'en');
    document.getElementById('themeBtn').onclick = () => {
      const on = document.body.classList.toggle('light-mode'); localStorage.setItem('3alm_theme', on ? 'light' : 'dark');
      document.querySelector('.theme-toggle-icon').textContent = on ? '☀️' : '🌙';
      document.querySelector('.theme-toggle-text').textContent = on ? 'الوضع الليلي' : 'الوضع النهاري';
    };
    const lo = document.getElementById('logoutLink');
    if (lo) lo.onclick = async e => { e.preventDefault(); await Store.logout(); location.href = 'login.html'; };
  }
  function bn(href, icon, label, key) { return '<a href="' + href + '" class="bottom-nav-item' + (page === key ? ' active' : '') + '"><i class="' + icon + '"></i><span>' + label + '</span></a>'; }

  let tt;
  function toast(msg) { const t = document.getElementById('toast'); if (!t) return; t.textContent = msg; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 2800); }

  /* ---- كروت الملاعب ---- */
  const ratingBadge = s => s.rating > 0 ? '<span class="badge badge-green">★ ' + s.rating.toFixed(1) + '</span>' : '<span class="badge badge-yellow">جديد</span>';
  function availBadge(s) {
    if (!s.bookable) return '<span class="badge badge-red">محجوز بالكامل</span>';
    const n = Store.freeSlotsToday(s);
    if (n === 0) return '<span class="badge badge-red">مكتمل اليوم</span>';
    if (n <= 3) return '<span class="badge badge-yellow">متبقي ' + n + ' مواعيد اليوم</span>';
    return '<span class="badge badge-green"><span class="dot"></span> متاح</span>';
  }
  function card(s) {
    return '<div class="s-card" data-id="' + esc(s.id) + '"><div class="s-img" style="padding:0;position:relative;"><img src="' + esc(s.image) + '" alt="' + esc(s.name) + '" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block;">' +
      '<div class="s-img-overlay"></div><div class="s-rating-badge">' + ratingBadge(s) + '</div><div class="s-avail-badge">' + availBadge(s) + '</div></div>' +
      '<div class="s-body"><div class="s-name">' + esc(s.name) + '</div><div class="s-meta"><div class="s-meta-row">📍 ' + esc(loc(s)) + '</div>' +
      '<div class="s-meta-row">👥 حتى ' + s.players + ' لاعب · ' + esc(s.typeLabel) + '</div></div>' +
      '<div class="s-features">' + s.features.map(f => '<span class="s-feature">' + esc(f) + '</span>').join('') + '</div></div>' +
      '<div class="s-footer"><div class="s-price">' + money(s.price) + ' <span>/ ساعة</span></div><div style="display:flex;gap:8px;">' +
      '<button class="btn-details" data-details="' + esc(s.id) + '">التفاصيل</button>' +
      (s.bookable ? '<a class="btn-primary" href="booking.html?stadium=' + encodeURIComponent(s.id) + '">احجز الآن</a>' : '<button class="btn-secondary" style="padding:10px 16px;font-size:.78rem;" disabled>محجوز</button>') +
      '</div></div></div>';
  }
  const emptyHtml = (msg, extra) => '<div class="empty-state"><i class="fa-regular fa-face-frown"></i><p>' + msg + '</p>' + (extra || '') + '</div>';

  /* ---- نافذة التفاصيل ---- */
  function ensureModal() {
    if (document.getElementById('stadium-modal')) return;
    const m = document.createElement('div'); m.className = 'modal-overlay'; m.id = 'stadium-modal';
    m.innerHTML = '<div class="sm-inner" role="dialog" aria-modal="true"><div class="sm-hero" style="padding:0;overflow:hidden;"><img id="sm-img" alt="" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;">' +
      '<div class="sm-hero-overlay"></div><button type="button" class="sm-nav prev" id="sm-prev" aria-label="الصورة السابقة" hidden><span>‹</span></button><button type="button" class="sm-nav next" id="sm-next" aria-label="الصورة التالية" hidden><span>›</span></button><span class="sm-count" id="sm-count" hidden></span><button class="sm-close-btn" id="sm-close" aria-label="إغلاق"><i class="fa-solid fa-xmark"></i></button></div><div class="sm-body">' +
      '<div class="sm-head"><div><div class="sm-title" id="sm-name"></div><div class="sm-location"><i class="fa-solid fa-location-dot" style="color:var(--green);margin-left:5px;"></i><span id="sm-location"></span></div></div>' +
      '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;"><span id="sm-status" class="sm-status-badge"></span><span class="sm-rating" id="sm-rating"></span></div></div><div class="sm-divider"></div>' +
      '<div class="sm-stats-row"><div class="sm-stat"><div class="sk">النوع</div><div class="sv" id="sm-type"></div></div><div class="sm-stat"><div class="sk">اللاعبون</div><div class="sv" id="sm-players"></div></div><div class="sm-stat"><div class="sk">التقييم</div><div class="sv" id="sm-rating2"></div></div></div>' +
      '<p class="sm-desc" id="sm-desc"></p><div class="sm-features-wrap" id="sm-features"></div><div class="sm-divider"></div>' +
      '<div class="sm-info-grid"><div class="sm-info-item"><div class="ik">ساعات العمل</div><div class="iv" id="sm-hours"></div></div><div class="sm-info-item"><div class="ik">نوع الأرض</div><div class="iv" id="sm-surface"></div></div>' +
      '<div class="sm-info-item"><div class="ik">المساحة</div><div class="iv" id="sm-size"></div></div><div class="sm-info-item"><div class="ik">الإلغاء</div><div class="iv">مجاني قبل ' + window.CONFIG.cancelHoursBefore + ' ساعة</div></div></div></div>' +
      '<div class="sm-footer"><div><div class="sm-price-big" id="sm-price"></div><div class="sm-price-label">لكل ساعة</div></div><a id="sm-book" class="btn-primary sm-book">احجز الآن</a></div></div>';
    document.body.appendChild(m);
    m.addEventListener('click', e => { if (e.target === m || e.target.closest('#sm-close')) closeModal(); if (e.target.closest('#sm-prev')) step(-1); if (e.target.closest('#sm-next')) step(1); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeModal();
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && m.classList.contains('open')) step((e.key === 'ArrowRight') === (document.documentElement.dir === 'ltr') ? 1 : -1);
    });
  }
  let gal = { imgs: [], i: 0 };
  function showImg() {
    document.getElementById('sm-img').src = gal.imgs[gal.i]; const many = gal.imgs.length > 1;
    ['sm-prev', 'sm-next', 'sm-count'].forEach(id => document.getElementById(id).hidden = !many);
    document.getElementById('sm-count').textContent = (gal.i + 1) + ' / ' + gal.imgs.length;
  }
  function step(d) { if (gal.imgs.length > 1) { gal.i = (gal.i + d + gal.imgs.length) % gal.imgs.length; showImg(); } }
  function closeModal() { const m = document.getElementById('stadium-modal'); if (m) m.classList.remove('open'); }
  function openDetails(id) {
    const s = Store.stadium(id); if (!s) return; ensureModal();
    const set = (k, v) => document.getElementById(k).textContent = v;
    gal = { imgs: s.images && s.images.length ? s.images : [s.image], i: 0 }; showImg(); document.getElementById('sm-img').alt = s.name;
    set('sm-name', s.name); set('sm-location', loc(s)); set('sm-rating', s.rating > 0 ? '★ ' + s.rating.toFixed(1) : 'جديد'); set('sm-rating2', s.rating > 0 ? s.rating.toFixed(1) : '—');
    set('sm-type', s.typeLabel); set('sm-players', s.players + ' لاعب'); set('sm-desc', s.desc); set('sm-surface', s.surface); set('sm-size', s.size);
    set('sm-hours', hourLabel(s.open) + ' – ' + hourLabel(s.close)); set('sm-price', money(s.price));
    const st = document.getElementById('sm-status'); st.className = 'sm-status-badge ' + (s.bookable ? 'sm-badge-available' : 'sm-badge-full'); st.textContent = s.bookable ? '● متاح للحجز' : '● محجوز بالكامل';
    document.getElementById('sm-features').innerHTML = s.features.map(f => '<span class="sm-feature-tag">' + esc(f) + '</span>').join('');
    const b = document.getElementById('sm-book');
    if (s.bookable) { b.href = 'booking.html?stadium=' + encodeURIComponent(s.id); b.removeAttribute('aria-disabled'); b.style.opacity = ''; b.textContent = 'احجز الآن'; }
    else { b.removeAttribute('href'); b.setAttribute('aria-disabled', 'true'); b.style.opacity = '.45'; b.textContent = 'غير متاح'; }
    document.getElementById('stadium-modal').classList.add('open');
  }
  document.addEventListener('click', e => { const d = e.target.closest('[data-details]'); if (d) openDetails(d.dataset.details); });

  /* ---- بحث مشترك: بالاسم أو الموقع (+ نوع) ---- */
  const norm = s => String(s || '').toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim();
  function search(q, type) {
    const n = norm(q);
    return Store.stadiums().filter(s => (!type || type === 'all' || s.type === type) &&
      (!n || norm(s.name + ' ' + s.location + ' ' + (s.locationAr || '') + ' ' + s.typeLabel).includes(n)));
  }

  const hourOpts = (from, to, v) => { let o = ''; for (let h = from; h <= to; h++) o += '<option value="' + h + '"' + (h === v ? ' selected' : '') + '>' + hourLabel(h) + '</option>'; return o; };
  function stadiumForm(s, formId) {
    const tOpt = [['11', 'Stadium 11'], ['7', '7-a-Side'], ['5', '5-a-Side'], ['indoor', 'Indoor']].map(t => '<option value="' + t[0] + '"' + (s.type === t[0] ? ' selected' : '') + '>' + t[1] + '</option>').join('');
    const html = '<form id="' + formId + '" class="form-grid" novalidate>' +
      '<div class="form-group"><label>اسم الملعب</label><input name="name" value="' + esc(s.name) + '"></div>' +
      '<div class="form-group"><label>العنوان والموقع</label><input name="address" value="' + esc(loc(s)) + '"></div>' +
      '<div class="form-group"><label>نوع الملعب</label><select name="type">' + tOpt + '</select></div>' +
      '<div class="form-group"><label>سعر الساعة (' + CONFIG.currency + ')</label><input name="price" type="number" min="1" step="1" value="' + s.price + '"></div>' +
      '<div class="form-group"><label>يفتح الساعة</label><select name="open">' + hourOpts(0, 23, s.open) + '</select></div>' +
      '<div class="form-group"><label>يغلق الساعة</label><select name="close">' + hourOpts(1, 24, s.close) + '</select></div>' +
      '<div class="form-group"><label>نوع الأرض</label><input name="surface" value="' + esc(s.surface) + '"></div>' +
      '<div class="form-group"><label>المساحة</label><input name="size" value="' + esc(s.size) + '" placeholder="100 × 60 م"></div>' +
      '<div class="form-group full"><label>وصف الملعب</label><textarea name="desc" rows="3">' + esc(s.desc) + '</textarea></div>' +
      '<div class="form-group full"><label>المميزات (افصل بينها بفاصلة)</label><input name="features" value="' + esc(s.features.join(', ')) + '" placeholder="Floodlights, Parking, Showers"></div>' +
      '<div class="full checks"><label><input type="checkbox" name="bookable"' + (s.bookable ? ' checked' : '') + '> متاح للحجز</label><label><input type="checkbox" name="published"' + (s.published ? ' checked' : '') + '> نشر الملعب للجمهور</label></div>' +
      '<div class="full"><button class="btn-primary" type="submit">حفظ بيانات الملعب</button></div></form>';
    // ربط كل label بحقله (إتاحة + ضغط على الاسم يركّز الحقل)
    return html.replace(/<label>([^<]*)<\/label>(<(?:input|select|textarea) name="(\w+)")/g, (m, l, tag, name) => '<label for="' + formId + '_' + name + '">' + l + '</label>' + tag + ' id="' + formId + '_' + name + '"');
  }
  const stadiumBody = f => ({ name: f.name.value.trim(), address: f.address.value.trim(), type: f.type.value, price: parseInt(f.price.value, 10), open: +f.open.value, close: +f.close.value,
    surface: f.surface.value.trim(), size: f.size.value.trim(), desc: f.desc.value.trim(), features: f.features.value.split(/[,،]/).map(x => x.trim()).filter(Boolean), bookable: f.bookable.checked, published: f.published.checked });

  const saved = localStorage.getItem('3alm_theme'); if (saved === 'light') document.body.classList.add('light-mode');
  window.UI = { stadiumForm, stadiumBody, hourOpts, loc, esc, money, hourLabel, dateLabel, qs, toast, card, emptyHtml, openDetails, search, guard, availBadge };

  document.addEventListener('DOMContentLoaded', async () => {
    await Store.init();
    if (!guard()) return;
    buildShell();
    if (document.body.dataset.denied) { const m = document.querySelector('main'); if (m) m.innerHTML = '<div class="page-wrap narrow"><div class="panel gate"><h2>غير مصرّح</h2><p>' + (document.body.dataset.denied === 'owner' ? 'هذه الصفحة لأصحاب الملاعب فقط.' : 'هذه الصفحة للمسؤولين فقط.') + '</p><a class="btn-primary" href="index.html">العودة للرئيسية</a></div></div>'; return; }
    document.dispatchEvent(new Event('ui:ready'));
  });
})();
