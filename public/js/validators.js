/* التحقق من النماذج: رسائل بجانب كل حقل + رسالة عامة للنجاح أو الخطأ */
(function () {
  const R = {
    required: v => (v || '').trim() ? '' : 'هذا الحقل مطلوب',
    email: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((v || '').trim()) ? '' : 'صيغة البريد الإلكتروني غير صحيحة',
    // رقم مصري: 01x ثم 8 أرقام، مع إمكانية +20
    phone: v => /^(\+?20|0)?1[0125]\d{8}$/.test((v || '').replace(/[\s-]/g, '')) ? '' : 'أدخل رقم موبايل مصري صحيح (مثال: 01012345678)',
    // متطلبات مفترضة (لم تُرفق متطلبات أمان أصلية): 8 أحرف على الأقل، حرف كبير وصغير ورقم
    password: v => (v || '').length >= 8 && /[a-z]/.test(v) && /[A-Z]/.test(v) && /\d/.test(v) ? '' : 'كلمة المرور 8 أحرف على الأقل وتحتوي على حرف كبير وحرف صغير ورقم',
    min: n => v => (v || '').trim().length >= n ? '' : 'يجب ألا يقل عن ' + n + ' أحرف'
  };
  // مساحة رسالة الخطأ محجوزة مسبقًا حتى لا يتحرك الزر أثناء الضغط عليه (مشكلة blur)
  function errBox(input) {
    const g = input.closest('.form-group'); if (!g) return null;
    let e = g.querySelector('.field-error');
    if (!e) { e = document.createElement('div'); e.className = 'field-error'; e.setAttribute('role', 'alert'); g.appendChild(e); }
    return e;
  }
  function setError(input, msg) {
    const g = input.closest('.form-group'); if (!g) return;
    const e = errBox(input);
    e.textContent = msg; g.classList.toggle('invalid', !!msg); g.classList.toggle('valid', !msg && !!input.value);
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }
  /* rules: { fieldName: [fn | fn, ...] } — الدالة ترجع نص الخطأ أو '' ، وتستقبل (value, formData) */
  function validate(form, rules) {
    const data = {}; let first = null;
    Object.keys(rules).forEach(name => {
      const input = form.elements[name]; if (!input) return;
      data[name] = input.value;
    });
    Object.keys(rules).forEach(name => {
      const input = form.elements[name]; if (!input) return;
      let msg = ''; for (const fn of rules[name]) { msg = fn(input.value, data); if (msg) break; }
      setError(input, msg); if (msg && !first) first = input;
    });
    if (first) first.focus();
    return { ok: !first, data };
  }
  function live(form, rules) {
    Object.keys(rules).forEach(name => {
      const input = form.elements[name]; if (!input) return;
      errBox(input);
      input.addEventListener('blur', () => { let m = ''; for (const fn of rules[name]) { m = fn(input.value, validateData(form, rules)); if (m) break; } setError(input, m); });
    });
  }
  function validateData(form, rules) { const d = {}; Object.keys(rules).forEach(n => { if (form.elements[n]) d[n] = form.elements[n].value; }); return d; }
  function message(form, type, text) {
    let m = form.querySelector('.form-msg');
    if (!m) { m = document.createElement('div'); m.className = 'form-msg'; m.setAttribute('role', 'status'); form.appendChild(m); }
    m.className = 'form-msg show ' + type; m.textContent = text;
  }
  // يعرض خطأ الخادم بجانب الحقل المعني (إن وُجد) وكرسالة عامة
  function serverError(form, e) {
    const input = e.field && form.elements[e.field];
    if (input) setError(input, e.message);
    message(form, 'err', input ? 'يرجى تصحيح الحقول المحددة' : e.message);
  }
  window.Validate = { R, validate, live, message, setError, serverError };
})();
