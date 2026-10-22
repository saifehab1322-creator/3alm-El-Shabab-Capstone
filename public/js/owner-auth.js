/* تسجيل ودخول أصحاب الملاعب. التحقق من كود التفعيل يتم على الخادم فقط؛ هنا فحص شكلي للتسهيل. */
document.addEventListener('ui:ready', () => {
  const R = Validate.R, me = Store.current();
  if (me) { location.replace(me.role === 'owner' ? 'owner-dashboard.html' : 'index.html'); return; }
  const go = () => { const n = UI.qs.get('next'); return n && /^[\w\-]+\.html(\?.*)?$/.test(n) ? n : 'owner-dashboard.html'; };
  async function handle(form, rules, action, okText) {
    const btn = form.querySelector('button[type=submit]'), v = Validate.validate(form, rules);
    if (!v.ok) return Validate.message(form, 'err', 'يرجى تصحيح الحقول المحددة');
    btn.disabled = true;
    try { await action(v.data); Validate.message(form, 'ok', okText); setTimeout(() => location.href = go(), 700); }
    catch (e) { Validate.serverError(form, e); btn.disabled = false; }
  }
  const reg = document.getElementById('ownerRegForm'), login = document.getElementById('ownerLoginForm');
  if (reg) {
    const rules = { name: [R.required, R.min(3)], phone: [R.required, R.phone], email: [R.required, R.email], password: [R.required, R.password],
      confirm: [R.required, (v, d) => v === d.password ? '' : 'كلمتا المرور غير متطابقتين'], stadiumName: [R.required, R.min(3)], address: [R.required, R.min(3)], code: [R.required] };
    Validate.live(reg, rules);
    reg.addEventListener('submit', e => { e.preventDefault();
      handle(reg, rules, d => Store.ownerRegister({ name: d.name.trim(), phone: d.phone.trim(), email: d.email.trim(), password: d.password, stadiumName: d.stadiumName.trim(), address: d.address.trim(), code: d.code.trim() }), 'تم إنشاء حساب صاحب الملعب بنجاح، جارٍ التحويل...'); });
  }
  if (login) {
    const rules = { email: [R.required, R.email], password: [R.required] };
    Validate.live(login, rules);
    login.addEventListener('submit', e => { e.preventDefault(); handle(login, rules, d => Store.login(d.email, d.password, 'owner'), 'تم تسجيل الدخول بنجاح، جارٍ التحويل...'); });
  }
});
