document.addEventListener('ui:ready', () => {
  const R = Validate.R, next = () => { const n = UI.qs.get('next'); if (n && /^[\w\-]+\.html(\?.*)?$/.test(n)) return n; const u = Store.current(); return u && u.role === 'owner' ? 'owner-dashboard.html' : 'index.html'; };
  if (Store.current()) { location.replace(next()); return; }
  const login = document.getElementById('loginForm'), reg = document.getElementById('registerForm');
  async function handle(form, rules, action, okText) {
    const btn = form.querySelector('button[type=submit]');
    const v = Validate.validate(form, rules);
    if (!v.ok) { Validate.message(form, 'err', 'يرجى تصحيح الحقول المحددة'); return; }
    btn.disabled = true;
    try { await action(v.data); Validate.message(form, 'ok', okText); setTimeout(() => location.href = next(), 700); }
    catch (e) { Validate.serverError(form, e); btn.disabled = false; }
  }
  if (login) {
    const rules = { email: [R.required, R.email], password: [R.required] };
    Validate.live(login, rules);
    login.addEventListener('submit', e => { e.preventDefault(); handle(login, rules, d => Store.login(d.email, d.password), 'تم تسجيل الدخول بنجاح، جارٍ التحويل...'); });
  }
  if (reg) {
    const rules = { name: [R.required, R.min(3)], email: [R.required, R.email], phone: [R.required, R.phone], password: [R.required, R.password],
      confirm: [R.required, (v, d) => v === d.password ? '' : 'كلمتا المرور غير متطابقتين'] };
    Validate.live(reg, rules);
    reg.addEventListener('submit', e => { e.preventDefault(); handle(reg, rules, d => Store.register(d), 'تم إنشاء الحساب بنجاح، جارٍ التحويل...'); });
  }
});
