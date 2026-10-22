/* طبقة البيانات: تتحدث مع الخادم (server/server.js) عبر /api. لا تخزّن أي حسابات أو حجوزات في المتصفح.
   القراءة متزامنة من ذاكرة مؤقتة تُحدَّث من الخادم (عند التحميل، وبعد كل تعديل، وكل 20 ثانية). الصلاحيات والتحقق الحقيقي على الخادم. */
(function () {
  const state = { me: null, stadiums: [], slots: new Map(), mine: [], stats: { stadiums: 0, bookings: 0, players: 0 } };
  const listeners = [];
  const emit = () => listeners.forEach(f => { try { f(); } catch (e) { console.error(e); } });
  const pad = n => String(n).padStart(2, '0');
  const dateStr = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const startOf = b => new Date(b.date + 'T' + pad(b.hour) + ':00:00');

  async function api(method, url, body) {
    let r;
    try {
      r = await fetch(url, { method, credentials: 'same-origin', headers: method === 'GET' ? {} : { 'Content-Type': 'application/json' }, body: method === 'GET' ? undefined : JSON.stringify(body === undefined ? {} : body) });
    } catch (e) { throw new Error('تعذّر الاتصال بالخادم'); }
    let j = {}; try { j = await r.json(); } catch (e) { if (r.ok) throw new Error('تعذّر الاتصال بالخادم'); }   // رد ناقص/مقطوع لا يُعتبر نجاحًا ولا يمسح الذاكرة المؤقتة
    if (!r.ok) { const e = new Error(j.error || 'حدث خطأ، حاول مرة أخرى'); e.status = r.status; e.field = j.field; throw e; }
    return j;
  }
  async function refresh() {
    try {
      const [me, st, sl, stats] = await Promise.all([api('GET', '/api/me'), api('GET', '/api/stadiums'), api('GET', '/api/slots'), api('GET', '/api/stats')]);
      state.me = me.user; state.stadiums = st.stadiums; state.stats = stats;
      state.slots = new Map(); sl.slots.forEach(x => { const k = x[0] + '|' + x[1]; if (!state.slots.has(k)) state.slots.set(k, new Set()); state.slots.get(k).add(x[2]); });
      state.mine = state.me ? (await api('GET', '/api/bookings/mine')).bookings : [];
    } catch (e) { if (e.status) console.error(e); }   // انقطاع الشبكة/إلغاء التنقل: نُبقي آخر بيانات ونعيد المحاولة في الدورة التالية
    emit();
  }

  const Store = {
    api, refresh, dateStr, startOf,
    init() { const p = refresh(); setInterval(() => { if (!document.hidden) refresh(); }, 20000); return p; },
    onChange(fn) { listeners.push(fn); },
    current() { return state.me; },
    stats() { return state.stats; },
    stadiums() { return state.stadiums; },
    stadium(id) { return state.stadiums.find(s => s.id === id) || null; },
    hours(s) { const a = []; for (let h = s.open; h < s.close; h++) a.push(h); return a; },
    taken(stadiumId, date) {
      const set = new Set(), cur = state.slots.get(stadiumId + '|' + date); if (cur) cur.forEach(h => set.add(h)); return set;
    },
    freeSlotsToday(s) { const now = new Date(), t = this.taken(s.id, dateStr(now)); return this.hours(s).filter(h => !t.has(h) && h > now.getHours()).length; },
    isPast(date, hour) { return new Date(date + 'T' + pad(hour) + ':00:00') <= new Date(); },
    userBookings() { return state.mine.slice(); },
    canCancel(b, user) {   // للعرض فقط؛ الخادم يفرض نفس القواعد
      if (b.status !== 'confirmed') return { ok: false, why: 'الحجز ملغي بالفعل' };
      if (startOf(b) <= new Date()) return { ok: false, why: 'انتهى موعد الحجز' };
      if (user && user.role === 'admin') return { ok: true };
      if (startOf(b) - Date.now() < window.CONFIG.cancelHoursBefore * 3600 * 1000) return { ok: false, why: 'الإلغاء متاح قبل الموعد بـ ' + window.CONFIG.cancelHoursBefore + ' ساعة على الأقل' };
      return { ok: true };
    },
    async register(d) { const r = await api('POST', '/api/register', { name: d.name, email: d.email, phone: d.phone, password: d.password }); await refresh(); return r.user; },
    async login(email, password, portal) { const r = await api('POST', '/api/login', { email, password, portal }); await refresh(); return r.user; },
    async ownerRegister(d) { const r = await api('POST', '/api/owner/register', d); await refresh(); return r.user; },
    async logout() { try { await api('POST', '/api/logout'); } catch (e) {} state.me = null; state.mine = []; emit(); },
    async updateUser(patch) { const r = await api('POST', '/api/me', patch); await refresh(); return r.user; },
    changePassword(old, password) { return api('POST', '/api/me/password', { old, password }); },
    async createBooking(d) { const r = await api('POST', '/api/bookings', d); await refresh(); return r.booking; },
    async cancelBooking(id) { await api('POST', '/api/bookings/' + encodeURIComponent(id) + '/cancel'); await refresh(); },
    addMessage(m) { return api('POST', '/api/contact', m); }
  };
  window.Store = Store;
})();
