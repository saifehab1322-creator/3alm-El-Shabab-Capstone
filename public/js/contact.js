document.addEventListener('ui:ready', () => {
  const R = Validate.R, f = document.getElementById('contactForm'), u = Store.current();
  if (u) { f.name.value = u.name; f.email.value = u.email; }
  document.getElementById('contactNote').textContent = '';
  const rules = { name: [R.required, R.min(3)], email: [R.required, R.email], subject: [R.required, R.min(3)], message: [R.required, R.min(10)] };
  Validate.live(f, rules);
  f.addEventListener('submit', async e => { e.preventDefault();
    const v = Validate.validate(f, rules); if (!v.ok) return Validate.message(f, 'err', 'يرجى تصحيح الحقول المحددة');
    const btn = f.querySelector('button[type=submit]'); btn.disabled = true;
    const msg = { name: v.data.name.trim(), email: v.data.email.trim(), subject: v.data.subject.trim(), message: v.data.message.trim() };
    try {
      await Store.addMessage(msg); f.reset(); f.querySelectorAll('.valid').forEach(g => g.classList.remove('valid'));
      Validate.message(f, 'ok', 'تم إرسال رسالتك بنجاح، شكرًا لتواصلك معنا');
    } catch (err) { Validate.serverError(f, err); }
    btn.disabled = false; });
});
