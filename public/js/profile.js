document.addEventListener('ui:ready', () => {
  const R = Validate.R, u = Store.current(), f = document.getElementById('profileForm'), p = document.getElementById('pwForm');
  f.name.value = u.name; f.phone.value = u.phone; document.getElementById('pmail').value = u.email;
  const n = Store.userBookings(); document.getElementById('profileStats').textContent = 'عدد حجوزاتك: ' + n.length + ' — المؤكدة: ' + n.filter(b => b.status === 'confirmed').length;
  f.addEventListener('submit', async e => { e.preventDefault(); const v = Validate.validate(f, { name: [R.required, R.min(3)], phone: [R.required, R.phone] });
    if (!v.ok) return Validate.message(f, 'err', 'يرجى تصحيح الحقول المحددة');
    try { await Store.updateUser({ name: v.data.name.trim(), phone: v.data.phone.trim() }); Validate.message(f, 'ok', 'تم حفظ التغييرات'); setTimeout(() => location.reload(), 600); } catch (err) { Validate.serverError(f, err); } });
  p.addEventListener('submit', async e => { e.preventDefault();
    const v = Validate.validate(p, { old: [R.required], password: [R.required, R.password], confirm: [R.required, (x, d) => x === d.password ? '' : 'كلمتا المرور غير متطابقتين'] });
    if (!v.ok) return Validate.message(p, 'err', 'يرجى تصحيح الحقول المحددة');
    try { await Store.changePassword(v.data.old, v.data.password); p.reset(); Validate.message(p, 'ok', 'تم تحديث كلمة المرور'); } catch (err) { Validate.serverError(p, err); } });
  document.getElementById('logoutBtn').onclick = async () => { await Store.logout(); location.href = 'login.html'; };
});
