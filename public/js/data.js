/* إعدادات الواجهة فقط. بيانات الملاعب أصبحت في قاعدة البيانات (البذرة الأولية: server/seed-stadiums.json).
   قواعد الإلغاء والحجز تُفرض أيضًا على الخادم (server/server.js) — هذه القيم للعرض فقط. */
window.CONFIG = {
  cancelHoursBefore: 24,   // الإلغاء المجاني قبل الموعد بـ 24 ساعة
  maxDaysAhead: 60,
  maxDuration: 3,
  currency: 'EGP'
};
