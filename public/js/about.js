document.addEventListener('ui:ready', () => {
  const all = Store.stadiums(), S = Store.stats(), bk = S.bookings, us = S.players;
  document.getElementById('aboutStats').innerHTML = [[all.length, 'ملاعب'], [bk, 'حجز مؤكد'], [us, 'لاعب مسجّل']].map(x => '<div class="stat-item"><div class="stat-number">' + x[0] + '</div><div class="stat-label">' + x[1] + '</div></div>').join('');
});
