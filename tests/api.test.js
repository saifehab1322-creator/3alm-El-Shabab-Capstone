/* اختبار API الأمني والوظيفي. التشغيل من مجلد المشروع: node --no-warnings tests/api.test.js
   يشغّل خادمًا مؤقتًا بقاعدة بيانات مؤقتة ولا يمس بياناتك. */
const { spawn } = require('child_process'), fs = require('fs'), os = require('os'), path = require('path');
const { DatabaseSync } = require('node:sqlite');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), '3alm-')), PORT = 3200 + Math.floor(Math.random() * 500), B = 'http://localhost:' + PORT;
const ADMIN_PW = 'Adm1nTest99';
let pass = 0, fail = 0;
const ok = (name, cond, extra) => { cond ? pass++ : fail++; console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  -> ' + extra : '')); };

class Client {
  constructor() { this.sid = ''; }
  async call(method, url, body, opts = {}) {
    const h = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {}); if (this.sid) h.Cookie = 'sid=' + this.sid;
    const r = await fetch(B + url, { method, headers: h, body: body === undefined ? undefined : (opts.raw ? body : JSON.stringify(body)) });
    const sc = r.headers.get('set-cookie'); if (sc) { const m = sc.match(/sid=([a-f0-9]*)/); if (m) this.sid = m[1]; }
    let j = null; try { j = await r.json(); } catch (e) {} return { status: r.status, body: j };
  }
  get(u) { return this.call('GET', u); }
  post(u, b) { return this.call('POST', u, b === undefined ? {} : b); }
}
const strong = 'Passw0rdX';
const ownerBody = (n, code, extra) => Object.assign({ name: 'Owner ' + n, phone: '0101234567' + (n % 10), email: 'owner' + n + '@t.com', password: strong, stadiumName: 'Arena ' + n, address: 'Sohag, Street ' + n, code }, extra);
const future = d => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);

(async () => {
  const srv = spawn(process.execPath, ['--no-warnings', path.join(__dirname, '..', 'server', 'server.js')], { env: Object.assign({}, process.env, { PORT, DATA_DIR: dir, ADMIN_PASSWORD: ADMIN_PW, OWNER_REG_LIMIT: '30' }) });
  let log = ''; srv.stdout.on('data', d => log += d); srv.stderr.on('data', d => log += d);
  for (let i = 0; i < 80 && !log.includes('http://localhost'); i++) await new Promise(r => setTimeout(r, 100));
  try {
    const admin = new Client(), user = new Client(), anon = new Client();
    ok('admin login', (await admin.post('/api/login', { email: 'admin@3almelshabab.com', password: ADMIN_PW })).status === 200);
    const gen = async (label, days) => (await admin.post('/api/admin/codes', { label, days })).body;
    const c1 = await gen('Owner 1 - verified by phone', 7);
    ok('admin creates code with expiry', /^OWN-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(c1.code) && c1.expiresAt > Date.now(), c1.code);
    const ov = (await admin.get('/api/admin/overview')).body;
    ok('overview lists code WITHOUT plaintext', ov.codes.length === 1 && JSON.stringify(ov.codes).indexOf(c1.code) < 0 && ov.codes[0].state === 'active');
    const db0 = new DatabaseSync(path.join(dir, 'app.db'));
    ok('DB stores only code hash', !db0.prepare('SELECT group_concat(code_hash) h FROM owner_codes').get().h.includes(c1.code.replace(/-/g, '')));
    const ph = db0.prepare("SELECT pass_hash h FROM users WHERE role='admin'").get().h;
    ok('password stored as salted scrypt hash (not plaintext)', ph.startsWith('scrypt$') && !ph.includes(ADMIN_PW));

    const o1 = new Client(); let r = await o1.post('/api/owner/register', ownerBody(1, c1.code));
    ok('1. register with valid unused code', r.status === 201 && r.body.user.role === 'owner', r.body && r.body.error);
    ok('1b. new owner gets own (unpublished) stadium', (await o1.get('/api/owner/stadiums')).body.stadiums.length === 1);
    r = await new Client().post('/api/owner/register', ownerBody(2, c1.code)); ok('3. reuse of same code rejected', r.status === 400 && /مستخدم/.test(r.body.error), r.body.error);
    ok('3b. rejected attempt created no account', !db0.prepare("SELECT 1 FROM users WHERE email='owner2@t.com'").get());
    r = await new Client().post('/api/owner/register', ownerBody(3, 'OWN-AAAA-BBBB-CCCC')); ok('2. wrong code rejected', r.status === 400 && /غير صحيح/.test(r.body.error));
    r = await new Client().post('/api/owner/register', ownerBody(4, '')); ok('4. empty code rejected', r.status === 400 && r.body.field === 'code');
    r = await new Client().post('/api/owner/register', ownerBody(4, undefined)); ok('4b. code field omitted rejected', r.status === 400);
    const c2 = await gen('revoked one', 7); await admin.post('/api/admin/codes/' + c2.id + '/revoke');
    r = await new Client().post('/api/owner/register', ownerBody(5, c2.code)); ok('5a. revoked code rejected', r.status === 400 && /إلغاء/.test(r.body.error), r.body.error);
    const c3 = await gen('expired one', 1); db0.prepare('UPDATE owner_codes SET expires_at=? WHERE id=?').run(Date.now() - 1000, c3.id);
    r = await new Client().post('/api/owner/register', ownerBody(6, c3.code)); ok('5b. expired code rejected', r.status === 400 && /انتهت/.test(r.body.error), r.body.error);
    ok('5c. no accounts created for bad codes', db0.prepare("SELECT COUNT(*) c FROM users WHERE role='owner'").get().c === 1);

    const c4 = await gen('to be replaced', 7); const rep = await admin.post('/api/admin/codes/' + c4.id + '/replace', { days: 5 });
    ok('replace creates new code & revokes old', rep.status === 201 && rep.body.code !== c4.code);
    r = await new Client().post('/api/owner/register', ownerBody(7, c4.code)); ok('old replaced code no longer works', r.status === 400);
    const o7 = new Client(); r = await o7.post('/api/owner/register', ownerBody(7, rep.body.code.toLowerCase().replace(/-/g, ' '))); ok('replacement code works (case/space tolerant)', r.status === 201);
    ok('cannot revoke a used code', (await admin.post('/api/admin/codes/' + c1.id + '/revoke')).status === 409);

    const c5 = await gen('race', 7);
    const results = await Promise.all(Array.from({ length: 8 }, (_, i) => new Client().post('/api/owner/register', ownerBody(20 + i, c5.code))));
    const wins = results.filter(x => x.status === 201).length;
    ok('concurrent registrations with one code: exactly one wins, the other 7 get a clear 400 (not rate-limited)', wins === 1 && results.filter(x => x.status === 400).length === 7, results.map(x => x.status).join(','));
    ok('concurrent: only one owner account created', db0.prepare("SELECT COUNT(*) c FROM users WHERE email LIKE 'owner2%@t.com' AND role='owner'").get().c === 1);
    const used = (await admin.get('/api/admin/overview')).body.codes.find(c => c.id === c1.id);
    ok('used code is linked to its owner in admin view', used.state === 'used' && used.usedBy.email === 'owner1@t.com');

    r = await new Client().post('/api/login', { email: 'owner1@t.com', password: strong, portal: 'owner' }); ok('6. owner login via owner portal', r.status === 200 && r.body.user.role === 'owner');
    await user.post('/api/register', { name: 'Normal User', email: 'u@t.com', phone: '01012345678', password: strong, role: 'admin' });
    ok('register ignores role=admin (no privilege escalation)', db0.prepare("SELECT role FROM users WHERE email='u@t.com'").get().role === 'user');
    r = await new Client().post('/api/login', { email: 'u@t.com', password: strong, portal: 'owner' }); ok('normal user rejected at owner portal', r.status === 403);
    r = await new Client().post('/api/login', { email: 'u@t.com', password: 'wrong' }); ok('wrong password gives generic 401', r.status === 401);
    await user.post('/api/me', { name: 'Normal User', phone: '01012345678', role: 'admin' }); ok('profile update cannot change role', db0.prepare("SELECT role FROM users WHERE email='u@t.com'").get().role === 'user');

    ok('8a. normal user -> owner API 403', (await user.get('/api/owner/stadiums')).status === 403);
    ok('8b. normal user -> admin API 403', (await user.get('/api/admin/overview')).status === 403);
    ok('8c. normal user cannot create codes', (await user.post('/api/admin/codes', { label: 'hack', days: 5 })).status === 403);
    ok('8d. anonymous -> 401', (await anon.get('/api/owner/bookings')).status === 401 && (await anon.get('/api/admin/overview')).status === 401);
    ok('8e. owner -> admin API 403', (await o1.get('/api/admin/overview')).status === 403 && (await o1.post('/api/admin/codes', { label: 'hack', days: 5 })).status === 403);
    ok('8f. admin -> owner API 403 (roles separated)', (await admin.get('/api/owner/stadiums')).status === 403);

    const s1 = (await o1.get('/api/owner/stadiums')).body.stadiums[0], s7 = (await o7.get('/api/owner/stadiums')).body.stadiums[0];
    r = await o1.call('PUT', '/api/owner/stadiums/' + s7.id, { name: 'HACKED NAME' }); ok('7a. owner cannot edit another owner stadium', r.status === 404);
    ok('7b. other stadium unchanged', db0.prepare('SELECT name FROM stadiums WHERE id=?').get(s7.id).name !== 'HACKED NAME');
    r = await o1.call('POST', '/api/owner/stadiums/' + s7.id + '/images', { dataUrl: 'data:image/png;base64,iVBORw0KGgo=' }); ok('7c. owner cannot add images to another stadium', r.status === 404);
    r = await o1.call('PUT', '/api/owner/stadiums/a', { price: 1 }); ok('7d. owner cannot edit platform (seed) stadium', r.status === 404);
    r = await o1.call('PUT', '/api/owner/stadiums/' + s1.id, { name: 'Arena One Pro', address: 'Sohag, Nile St.', type: '7', price: 130, open: 10, close: 23, surface: 'Turf', size: '60x40', desc: 'Nice', features: ['Parking', 'Showers'], bookable: true, published: true });
    ok('owner updates own stadium (price, hours, features, publish)', r.status === 200 && r.body.stadium.price === 130 && r.body.stadium.open === 10 && r.body.stadium.published, r.body && r.body.error);
    ok('owner price validated', (await o1.call('PUT', '/api/owner/stadiums/' + s1.id, { price: -5 })).status === 400);
    ok('owner hours validated', (await o1.call('PUT', '/api/owner/stadiums/' + s1.id, { open: 20, close: 10 })).status === 400);
    const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    r = await o1.call('POST', '/api/owner/stadiums/' + s1.id + '/images', { dataUrl: png }); ok('owner uploads valid image', r.status === 201 && /^uploads\/[a-f0-9]+\.png$/.test(r.body.stadium.images[0]), r.body && r.body.error);
    const img = r.body.stadium.images[0], got = await fetch(B + '/' + img); ok('uploaded image is served with image MIME', got.status === 200 && got.headers.get('content-type') === 'image/png');
    r = await o1.call('POST', '/api/owner/stadiums/' + s1.id + '/images', { dataUrl: 'data:image/png;base64,' + Buffer.from('<script>alert(1)</script>').toString('base64') }); ok('fake image (bad magic bytes) rejected', r.status === 400);
    r = await o1.call('POST', '/api/owner/stadiums/' + s1.id + '/images', { dataUrl: 'data:text/html;base64,PGI+' }); ok('non-image MIME rejected', r.status === 400);

    const pub = (await anon.get('/api/stadiums')).body.stadiums; ok('published owner stadium visible publicly; unpublished one hidden', pub.some(s => s.id === s1.id) && !pub.some(s => s.id === s7.id));
    const day = future(3), bk = { stadiumId: s1.id, date: day, hour: 12, duration: 2, name: 'Customer One', phone: '01012345678' };
    r = await user.post('/api/bookings', bk); ok('user books owner stadium', r.status === 201 && r.body.booking.price === 260, JSON.stringify(r.body).slice(0, 100));
    r = await o1.get('/api/owner/bookings'); ok('owner sees bookings of own stadium', r.body.bookings.length === 1 && r.body.bookings[0].name === 'Customer One');
    r = await o7.get('/api/owner/bookings'); ok('other owner sees NONE of them', r.body.bookings.length === 0);
    ok('overlap with booked hour rejected (409)', (await user.post('/api/bookings', Object.assign({}, bk, { hour: 13, duration: 1 }))).status === 409);
    ok('outside owner hours rejected', (await user.post('/api/bookings', Object.assign({}, bk, { hour: 9 }))).status === 400);
    const race = await Promise.all(Array.from({ length: 6 }, () => user.post('/api/bookings', Object.assign({}, bk, { date: future(4), hour: 15, duration: 1 }))));
    ok('concurrent bookings of the same slot: exactly one', race.filter(x => x.status === 201).length === 1);
    ok('booking requires login', (await anon.post('/api/bookings', bk)).status === 401);
    const mine = (await user.get('/api/bookings/mine')).body.bookings; ok('user sees own bookings', mine.length === 2);
    ok('another account cannot cancel my booking', (await o7.post('/api/bookings/' + mine[0].id + '/cancel')).status === 404);
    ok('booking owner cancels (more than 24h ahead)', (await user.post('/api/bookings/' + mine[0].id + '/cancel')).status === 200);
    const slots = (await anon.get('/api/slots')).body.slots; ok('cancelled booking frees its slot', !slots.some(s => s[0] === s1.id && s[1] === mine[0].date && s[2] === mine[0].hour));

    r = await user.call('POST', '/api/me', { name: 'Xyz', phone: '01012345678' }, { headers: { Origin: 'http://evil.example' } }); ok('CSRF: foreign Origin blocked', r.status === 403);
    r = await user.call('POST', '/api/me', 'name=x', { headers: { 'Content-Type': 'text/plain' }, raw: true }); ok('non-JSON body blocked (415)', r.status === 415);
    r = await user.call('POST', '/api/me', '{bad', { raw: true }); ok('malformed JSON -> 400', r.status === 400);
    ok('server/DB files not downloadable', (await fetch(B + '/server/server.js')).status === 404 && (await fetch(B + '/%2e%2e/server/data/app.db')).status === 404 && (await fetch(B + '/uploads/../app.db')).status === 404);
    r = await fetch(B + '/'); ok('security headers present (CSP, X-Frame-Options)', r.headers.get('content-security-policy').includes("script-src 'self'") && r.headers.get('x-frame-options') === 'DENY');
    await user.post('/api/logout'); ok('logout invalidates session server-side', (await user.get('/api/bookings/mine')).status === 401);

    /* ================= الميزات الإضافية ================= */
    await user.post('/api/login', { email: 'u@t.com', password: strong });
    const pubNow = (await anon.get('/api/stadiums')).body.stadiums;
    ok('new owner stadium has rating 0 (UI shows "New", not 0.0)', pubNow.find(x => x.id === s1.id).rating === 0);
    /* --- 2) إغلاق فترات معيّنة --- */
    const day5 = future(5), bk5 = h => ({ stadiumId: s1.id, date: day5, hour: h, duration: 1, name: 'Customer One', phone: '01012345678' });
    r = await o1.post('/api/owner/stadiums/' + s1.id + '/blocks', { date: day5, from: 10, to: 12, reason: 'Maintenance' }); ok('owner blocks a time range', r.status === 201 && r.body.blocks.length === 1);
    const blockId = r.body.blocks[0].id;
    let sl = (await anon.get('/api/slots')).body.slots; const has = (d, h) => sl.some(x => x[0] === s1.id && x[1] === d && x[2] === h);
    ok('blocked hours appear unavailable in public slots (10,11 yes / 12 no)', has(day5, 10) && has(day5, 11) && !has(day5, 12));
    ok('booking inside blocked range rejected (409)', (await user.post('/api/bookings', bk5(11))).status === 409);
    ok('booking overlapping block edge rejected (11-13)', (await user.post('/api/bookings', Object.assign(bk5(11), { duration: 2 }))).status === 409);
    r = await user.post('/api/bookings', bk5(12)); ok('booking right after the block is allowed', r.status === 201); const bk12 = r.body.booking;
    r = await o1.post('/api/owner/stadiums/' + s1.id + '/blocks', { date: day5, from: 12, to: 14 }); ok('cannot block a range that has a confirmed booking (409)', r.status === 409);
    ok('block validation: past date / bad range', (await o1.post('/api/owner/stadiums/' + s1.id + '/blocks', { date: '2020-01-01', from: 10, to: 11 })).status === 400 && (await o1.post('/api/owner/stadiums/' + s1.id + '/blocks', { date: day5, from: 15, to: 15 })).status === 400);
    ok('other owner cannot see/add/delete my blocks (404)', (await o7.get('/api/owner/stadiums/' + s1.id + '/blocks')).status === 404 && (await o7.post('/api/owner/stadiums/' + s1.id + '/blocks', { date: day5, from: 20, to: 21 })).status === 404 && (await o7.call('DELETE', '/api/owner/stadiums/' + s1.id + '/blocks/' + blockId)).status === 404);
    ok('normal user cannot manage blocks (403)', (await user.post('/api/owner/stadiums/' + s1.id + '/blocks', { date: day5, from: 20, to: 21 })).status === 403);
    r = await o1.call('DELETE', '/api/owner/stadiums/' + s1.id + '/blocks/' + blockId); ok('owner removes the block', r.status === 200 && r.body.blocks.length === 0);
    ok('after removal the hours are bookable again', (await user.post('/api/bookings', bk5(11))).status === 201);
    /* --- 3) المالك يلغي حجزًا --- */
    ok('normal user cannot use owner cancel (403)', (await user.post('/api/owner/bookings/' + bk12.id + '/cancel', {})).status === 403);
    ok('another owner cannot cancel my customer booking (404)', (await o7.post('/api/owner/bookings/' + bk12.id + '/cancel', {})).status === 404);
    r = await o1.post('/api/owner/bookings/' + bk12.id + '/cancel', { reason: 'Pitch flooded' }); ok('owner cancels a booking on own stadium', r.status === 200);
    const cancelled = (await user.get('/api/bookings/mine')).body.bookings.find(x => x.id === bk12.id);
    ok('customer sees who cancelled and why', cancelled.status === 'cancelled' && cancelled.cancelledBy === 'owner' && cancelled.cancelReason === 'Pitch flooded');
    ok('owner cancel frees the slot', !(sl = (await anon.get('/api/slots')).body.slots).some(x => x[0] === s1.id && x[1] === day5 && x[2] === 12));
    ok('cancelling twice rejected', (await o1.post('/api/owner/bookings/' + bk12.id + '/cancel', {})).status === 400);
    ok('self-cancel is recorded as cancelled_by user', (await user.get('/api/bookings/mine')).body.bookings.some(x => x.cancelledBy === 'user'));
    /* --- 5) المسؤول يعدّل ملعب المالك --- */
    r = await admin.call('PUT', '/api/admin/stadiums/' + s1.id, { name: 'Admin Renamed', price: 175, address: 'Sohag, Admin St.' }); ok('admin edits an owner stadium', r.status === 200 && r.body.stadium.name === 'Admin Renamed' && r.body.stadium.price === 175);
    ok('owner/user cannot call admin edit (403)', (await o1.call('PUT', '/api/admin/stadiums/' + s1.id, { name: 'x' })).status === 403 && (await user.call('PUT', '/api/admin/stadiums/' + s1.id, { name: 'x' })).status === 403);
    ok('admin edit validated', (await admin.call('PUT', '/api/admin/stadiums/' + s1.id, { price: -1 })).status === 400);
    r = await admin.call('DELETE', '/api/admin/stadiums/' + s1.id + '/images', { path: img }); ok('admin removes an inappropriate photo (file deleted)', r.status === 200 && r.body.stadium.images.length === 0 && (await fetch(B + '/' + img)).status === 404);
    /* --- 4) إيقاف الحساب --- */
    const ownerId = (await admin.get('/api/admin/overview')).body.owners.find(o => o.email === 'owner1@t.com').id;
    ok('admin cannot suspend an admin', (await admin.post('/api/admin/users/' + db0.prepare("SELECT id FROM users WHERE role='admin'").get().id + '/suspend')).status === 400);
    ok('normal user/owner cannot suspend (403)', (await user.post('/api/admin/users/' + ownerId + '/suspend')).status === 403 && (await o7.post('/api/admin/users/' + ownerId + '/suspend')).status === 403);
    ok('admin suspends owner', (await admin.post('/api/admin/users/' + ownerId + '/suspend')).status === 200);
    ok('suspended owner session is dead immediately (401)', (await o1.get('/api/owner/stadiums')).status === 401);
    r = await new Client().post('/api/login', { email: 'owner1@t.com', password: strong, portal: 'owner' }); ok('suspended owner cannot log in (403 + message)', r.status === 403 && /إيقاف/.test(r.body.error), r.body.error);
    ok('wrong password still generic 401 for suspended (no status leak)', (await new Client().post('/api/login', { email: 'owner1@t.com', password: 'nope' })).status === 401);
    ok('suspended owner stadium hidden from public list & slots', !(await anon.get('/api/stadiums')).body.stadiums.some(x => x.id === s1.id) && !(await anon.get('/api/slots')).body.slots.some(x => x[0] === s1.id));
    ok('cannot book a suspended owner stadium', (await user.post('/api/bookings', bk5(15))).status === 400);
    ok('admin reactivates owner', (await admin.post('/api/admin/users/' + ownerId + '/unsuspend')).status === 200);
    const o1c = new Client(); ok('reactivated owner logs in again', (await o1c.post('/api/login', { email: 'owner1@t.com', password: strong, portal: 'owner' })).status === 200);
    ok('stadium is public again', (await anon.get('/api/stadiums')).body.stadiums.some(x => x.id === s1.id));
    /* --- ترحيل قاعدة بيانات النسخة السابقة --- */
    const odir = fs.mkdtempSync(path.join(os.tmpdir(), '3alm-old-')), oport = PORT + 600;
    const od = new DatabaseSync(path.join(odir, 'app.db'));
    od.exec(`CREATE TABLE users(id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE COLLATE NOCASE, phone TEXT NOT NULL DEFAULT '', role TEXT NOT NULL DEFAULT 'user' CHECK(role IN('user','owner','admin')), pass_hash TEXT NOT NULL, created_at INTEGER NOT NULL);
      CREATE TABLE bookings(id TEXT PRIMARY KEY, user_id INTEGER NOT NULL, stadium_id TEXT NOT NULL, date TEXT NOT NULL, hour INTEGER NOT NULL, duration INTEGER NOT NULL, price INTEGER NOT NULL, name TEXT NOT NULL, phone TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'confirmed', created_at INTEGER NOT NULL, cancelled_at INTEGER);
      INSERT INTO users(name,email,phone,role,pass_hash,created_at) VALUES('Old User','old@t.com','01011111111','user','scrypt$00$00',1);
      INSERT INTO bookings(id,user_id,stadium_id,date,hour,duration,price,name,phone,status,created_at) VALUES('BK-OLD1',1,'a','2030-01-01',10,1,100,'Old User','01011111111','confirmed',1);`); od.close();
    const srv2 = spawn(process.execPath, ['--no-warnings', path.join(__dirname, '..', 'server', 'server.js')], { env: Object.assign({}, process.env, { PORT: oport, DATA_DIR: odir, ADMIN_PASSWORD: ADMIN_PW }) });
    let log2 = ''; srv2.stdout.on('data', d => log2 += d); srv2.stderr.on('data', d => log2 += d);
    for (let i = 0; i < 80 && !log2.includes('http://localhost') && !log2.includes('Error'); i++) await new Promise(r => setTimeout(r, 100));
    const od2 = new DatabaseSync(path.join(odir, 'app.db')), cols = t => od2.prepare('PRAGMA table_info(' + t + ')').all().map(c => c.name);
    ok('migration: old DB upgraded (new columns added, server starts)', log2.includes('http://localhost') && cols('users').includes('status') && cols('bookings').includes('cancelled_by') && cols('bookings').includes('cancel_reason'), log2.slice(0, 120));
    ok('migration: old users/bookings preserved, status defaults to active', od2.prepare("SELECT status FROM users WHERE email='old@t.com'").get().status === 'active' && od2.prepare('SELECT COUNT(*) c FROM bookings').get().c === 1);
    const r2 = await fetch('http://localhost:' + oport + '/api/stadiums'); ok('migration: API serves seeded stadiums on migrated DB', (await r2.json()).stadiums.length === 6);
    od2.close(); srv2.kill(); fs.rmSync(odir, { recursive: true, force: true });

    let limited = 0; const brute = new Client();
    for (let i = 0; i < 14; i++) { const x = await brute.post('/api/owner/register', ownerBody(90 + i, 'OWN-ZZZZ-ZZZZ-' + String(1000 + i))); if (x.status === 429) limited++; }
    ok('code brute-forcing is rate-limited (429)', limited > 0, limited + ' blocked');
  } catch (e) { fail++; console.log('FAIL (exception)', e); }
  finally { srv.kill(); console.log('\n' + pass + ' passed, ' + fail + ' failed'); try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {} process.exit(fail ? 1 : 0); }
})();
