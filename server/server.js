'use strict';
/* خادم 3ALM ELSHABAB — بدون أي حزم خارجية. يتطلب Node.js 22.13 أو أحدث (يستخدم node:sqlite المدمج).
   - كل التحقق والصلاحيات هنا على الخادم؛ الواجهة الأمامية للعرض فقط.
   - كلمات المرور: scrypt مع ملح عشوائي. أكواد المالكين: تُخزَّن كتجزئة SHA-256 ولا تظهر كاملة إلا لحظة إنشائها. */
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

const PORT = +process.env.PORT || 3000;
const ROOT = path.join(__dirname, '..', 'public');
const DATA = process.env.DATA_DIR || path.join(__dirname, 'data');
const UPLOADS = path.join(DATA, 'uploads');
const TRUST_PROXY = process.env.TRUST_PROXY === '1';
const SECURE_COOKIE = process.env.COOKIE_SECURE === '1';
const SESSION_MS = 7 * 24 * 3600 * 1000, CANCEL_HOURS = 24, MAX_DAYS = 60, MAX_DURATION = 3, MAX_IMAGES = 8;
fs.mkdirSync(UPLOADS, { recursive: true });

const db = new DatabaseSync(path.join(DATA, process.env.DB_FILE || 'app.db'));
db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE COLLATE NOCASE, phone TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'user' CHECK(role IN('user','owner','admin')), pass_hash TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS owner_codes(id INTEGER PRIMARY KEY, code_hash TEXT NOT NULL UNIQUE, hint TEXT NOT NULL, label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN('active','used','revoked')), expires_at INTEGER NOT NULL, created_by INTEGER NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL, used_by INTEGER REFERENCES users(id), used_at INTEGER, replaced_by INTEGER);
CREATE TABLE IF NOT EXISTS stadiums(id TEXT PRIMARY KEY, owner_id INTEGER REFERENCES users(id), name TEXT NOT NULL, location TEXT NOT NULL, location_ar TEXT NOT NULL,
  type TEXT NOT NULL, type_label TEXT NOT NULL, players INTEGER NOT NULL, price INTEGER NOT NULL, rating REAL NOT NULL DEFAULT 0, features TEXT NOT NULL DEFAULT '[]',
  images TEXT NOT NULL DEFAULT '[]', bookable INTEGER NOT NULL DEFAULT 1, published INTEGER NOT NULL DEFAULT 1, open INTEGER NOT NULL DEFAULT 8, close INTEGER NOT NULL DEFAULT 24,
  surface TEXT NOT NULL DEFAULT '', size TEXT NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS bookings(id TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), stadium_id TEXT NOT NULL REFERENCES stadiums(id), date TEXT NOT NULL,
  hour INTEGER NOT NULL, duration INTEGER NOT NULL, price INTEGER NOT NULL, name TEXT NOT NULL, phone TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'confirmed', created_at INTEGER NOT NULL, cancelled_at INTEGER);
CREATE TABLE IF NOT EXISTS booking_slots(stadium_id TEXT NOT NULL, date TEXT NOT NULL, hour INTEGER NOT NULL, booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  PRIMARY KEY(stadium_id, date, hour));
CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, subject TEXT NOT NULL, message TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS stadium_blocks(id INTEGER PRIMARY KEY, stadium_id TEXT NOT NULL REFERENCES stadiums(id) ON DELETE CASCADE, date TEXT NOT NULL, hour_from INTEGER NOT NULL, hour_to INTEGER NOT NULL, reason TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_blocks ON stadium_blocks(stadium_id, date);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id); CREATE INDEX IF NOT EXISTS idx_bookings_stadium ON bookings(stadium_id);`);

function ensureCol(t, c, ddl) { if (!db.prepare('PRAGMA table_info(' + t + ')').all().some(x => x.name === c)) db.exec('ALTER TABLE ' + t + ' ADD COLUMN ' + c + ' ' + ddl); }
ensureCol('users', 'status', "TEXT NOT NULL DEFAULT 'active'");
ensureCol('bookings', 'cancelled_by', 'TEXT');
ensureCol('bookings', 'cancel_reason', "TEXT NOT NULL DEFAULT ''");

const TYPES = { '11': ['Stadium 11', 22], '7': ['7-a-Side', 14], '5': ['5-a-Side', 10], indoor: ['Indoor', 10] };
const now = () => Date.now();
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const pad = n => String(n).padStart(2, '0');
const pub = a => { const p = a ? a + '.' : ''; return p + 'published=1 AND (' + p + "owner_id IS NULL OR " + p + "owner_id IN (SELECT id FROM users WHERE status='active'))"; };

/* ---------- كلمات المرور ---------- */
const scrypt = (pw, salt) => new Promise((res, rej) => crypto.scrypt(pw, salt, 64, { N: 16384, r: 8, p: 1 }, (e, k) => e ? rej(e) : res(k)));
async function hashPw(pw) { const salt = crypto.randomBytes(16); return 'scrypt$' + salt.toString('hex') + '$' + (await scrypt(pw, salt)).toString('hex'); }
async function checkPw(pw, stored) {
  const [alg, salt, h] = String(stored).split('$'); if (alg !== 'scrypt') return false;
  const k = await scrypt(pw, Buffer.from(salt, 'hex')), b = Buffer.from(h, 'hex');
  return k.length === b.length && crypto.timingSafeEqual(k, b);
}
const DUMMY_HASH = 'scrypt$' + '00'.repeat(16) + '$' + '00'.repeat(64);

/* ---------- حساب المسؤول الأول + بيانات الملاعب الأولية ---------- */
async function bootstrap() {
  if (!db.prepare("SELECT 1 FROM users WHERE role='admin'").get()) {
    const email = (process.env.ADMIN_EMAIL || 'admin@3almelshabab.com').toLowerCase();
    const given = process.env.ADMIN_PASSWORD, pw = given || crypto.randomBytes(12).toString('base64url');
    if (given && !pwOk(given)) { console.error('ADMIN_PASSWORD لا يحقق شروط كلمة المرور (8 أحرف على الأقل، حرف كبير وصغير ورقم).'); process.exit(1); }
    db.prepare("INSERT INTO users(name,email,phone,role,pass_hash,created_at) VALUES(?,?,?,?,?,?)").run('Admin', email, '', 'admin', await hashPw(pw), now());
    console.log('\n=== تم إنشاء حساب المسؤول ===\n البريد: ' + email + (given ? '\n كلمة المرور: (من ADMIN_PASSWORD)' : '\n كلمة المرور: ' + pw + '   <-- تظهر مرة واحدة فقط، احفظها الآن') + '\n=============================\n');
  }
  if (!db.prepare('SELECT 1 FROM stadiums').get()) {
    const ins = db.prepare('INSERT INTO stadiums(id,owner_id,name,location,location_ar,type,type_label,players,price,rating,features,images,bookable,published,open,close,surface,size,description,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?,?,?,?,?,?)');
    for (const s of JSON.parse(fs.readFileSync(path.join(__dirname, 'seed-stadiums.json'), 'utf8')))
      ins.run(s.id, null, s.name, s.location, s.locationAr, s.type, s.typeLabel, s.players, s.price, s.rating, JSON.stringify(s.features), JSON.stringify([s.image]), s.bookable ? 1 : 0, s.open, s.close, s.surface, s.size, s.desc, now(), now());
  }
}

/* ---------- أدوات ---------- */
const MSG = {
  required: 'هذا الحقل مطلوب', email: 'صيغة البريد الإلكتروني غير صحيحة', phone: 'أدخل رقم موبايل مصري صحيح (مثال: 01012345678)',
  password: 'كلمة المرور 8 أحرف على الأقل وتحتوي على حرف كبير وحرف صغير ورقم'
};
const pwOk = v => typeof v === 'string' && v.length >= 8 && v.length <= 100 && /[a-z]/.test(v) && /[A-Z]/.test(v) && /\d/.test(v);
const emailOk = v => typeof v === 'string' && v.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
const phoneOk = v => typeof v === 'string' && /^(\+?20|0)?1[0125]\d{8}$/.test(v.replace(/[\s-]/g, ''));
const text = (v, min, max) => typeof v === 'string' && v.trim().length >= min && v.trim().length <= max;
class HttpError extends Error { constructor(status, msg, field) { super(msg); this.status = status; this.field = field; } }
const bad = (msg, field) => new HttpError(400, msg, field);

function cairoNow() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).map(x => [x.type, x.value]));
  return { date: p.year + '-' + p.month + '-' + p.day, hour: +p.hour, wall: Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) };
}
const wall = (date, hour) => Date.parse(date + 'T' + pad(hour) + ':00:00Z');
const validDate = d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && new Date(d + 'T00:00:00Z').toISOString().slice(0, 10) === d;

const hits = new Map();
function limited(key, max, ms) {
  const t = now(); let h = hits.get(key);
  if (!h || h.reset < t) { h = { n: 0, reset: t + ms }; hits.set(key, h); }
  if (++h.n > max) return Math.ceil((h.reset - t) / 1000);
  return 0;
}
setInterval(() => { const t = now(); for (const [k, v] of hits) if (v.reset < t) hits.delete(k); db.prepare('DELETE FROM sessions WHERE expires_at<?').run(t); }, 600000).unref();
const ipOf = req => (TRUST_PROXY && req.headers['x-forwarded-for'] ? String(req.headers['x-forwarded-for']).split(',')[0].trim() : req.socket.remoteAddress) || 'x';

function send(res, status, obj, headers) { const b = JSON.stringify(obj); res.writeHead(status, Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, headers || {})); res.end(b); }
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    if (!/^application\/json/i.test(req.headers['content-type'] || '')) return reject(new HttpError(415, 'نوع الطلب غير مدعوم'));
    let n = 0; const chunks = [];
    req.on('data', c => { n += c.length; if (n > limit) { reject(new HttpError(413, 'حجم الطلب كبير جدًا')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { const o = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); resolve(o && typeof o === 'object' && !Array.isArray(o) ? o : {}); } catch (e) { reject(bad('بيانات غير صالحة')); } });
    req.on('error', reject);
  });
}
function cookies(req) { const o = {}; String(req.headers.cookie || '').split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) o[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); }); return o; }
function sessionUser(req) {
  const t = cookies(req).sid; if (!t || !/^[a-f0-9]{64}$/.test(t)) return null;
  return db.prepare('SELECT u.id,u.name,u.email,u.phone,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? AND u.status=\'active\'').get(sha(t), now()) || null;
}
function startSession(res, userId) {
  const t = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)').run(sha(t), userId, now() + SESSION_MS);
  return 'sid=' + t + '; HttpOnly; SameSite=Lax; Path=/; Max-Age=' + SESSION_MS / 1000 + (SECURE_COOKIE ? '; Secure' : '');
}
const pubUser = u => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role });
const needRole = (u, ...roles) => { if (!u) throw new HttpError(401, 'يجب تسجيل الدخول أولًا'); if (!roles.includes(u.role)) throw new HttpError(403, 'ليست لديك صلاحية للوصول'); };

function stadiumOut(r) {
  const images = JSON.parse(r.images);
  return { id: r.id, name: r.name, location: r.location, locationAr: r.location_ar, type: r.type, typeLabel: r.type_label, players: r.players, price: r.price, rating: r.rating,
    features: JSON.parse(r.features), image: images[0] || 'images/placeholder.svg', images, bookable: !!r.bookable, published: !!r.published, open: r.open, close: r.close,
    surface: r.surface, size: r.size, desc: r.description };
}
const bookingOut = r => ({ id: r.id, userId: r.user_id, stadiumId: r.stadium_id, stadiumName: r.stadium_name, date: r.date, hour: r.hour, duration: r.duration, price: r.price, name: r.name, phone: r.phone, notes: r.notes, status: r.status, createdAt: r.created_at, cancelledBy: r.cancelled_by || null, cancelReason: r.cancel_reason || '' });
const BOOKING_SQL = 'SELECT b.*, s.name AS stadium_name FROM bookings b JOIN stadiums s ON s.id=b.stadium_id';

/* ---------- تنظيف وتحقق من بيانات الملعب (يستخدمها المالك) ---------- */
function cleanStadium(b, partial) {
  const o = {};
  const has = k => b[k] !== undefined;
  if (!partial || has('name')) { if (!text(b.name, 3, 80)) throw bad('اسم الملعب من 3 إلى 80 حرفًا', 'name'); o.name = b.name.trim(); }
  if (!partial || has('address')) { if (!text(b.address, 3, 120)) throw bad('أدخل عنوان الملعب (3 إلى 120 حرفًا)', 'address'); o.location = o.location_ar = b.address.trim(); }
  if (has('type')) { if (!TYPES[b.type]) throw bad('نوع الملعب غير صحيح', 'type'); o.type = b.type; o.type_label = TYPES[b.type][0]; o.players = TYPES[b.type][1]; }
  if (has('price')) { if (!Number.isInteger(b.price) || b.price < 1 || b.price > 100000) throw bad('أدخل سعرًا صحيحًا للساعة', 'price'); o.price = b.price; }
  if (has('open') || has('close')) {
    if (!Number.isInteger(b.open) || !Number.isInteger(b.close) || b.open < 0 || b.close > 24 || b.open >= b.close) throw bad('مواعيد العمل غير صحيحة (وقت الفتح يسبق وقت الإغلاق)', 'open');
    o.open = b.open; o.close = b.close;
  }
  if (has('surface')) { if (typeof b.surface !== 'string' || b.surface.length > 40) throw bad('نوع الأرض طويل جدًا', 'surface'); o.surface = b.surface.trim(); }
  if (has('size')) { if (typeof b.size !== 'string' || b.size.length > 40) throw bad('المساحة طويلة جدًا', 'size'); o.size = b.size.trim(); }
  if (has('desc')) { if (typeof b.desc !== 'string' || b.desc.length > 600) throw bad('الوصف طويل جدًا (600 حرف كحد أقصى)', 'desc'); o.description = b.desc.trim(); }
  if (has('features')) {
    if (!Array.isArray(b.features) || b.features.length > 10 || b.features.some(f => !text(f, 1, 30))) throw bad('المميزات: حتى 10 عناصر، كل عنصر حتى 30 حرفًا', 'features');
    o.features = JSON.stringify(b.features.map(f => f.trim()));
  }
  if (has('bookable')) o.bookable = b.bookable ? 1 : 0;
  if (has('published')) o.published = b.published ? 1 : 0;
  return o;
}
function updateStadium(id, o, ownerId) {
  const keys = Object.keys(o); if (!keys.length) return 0;
  const sql = 'UPDATE stadiums SET ' + keys.map(k => k + '=?').join(',') + ',updated_at=? WHERE id=?' + (ownerId != null ? ' AND owner_id=?' : '');
  const args = keys.map(k => o[k]).concat([now(), id]); if (ownerId != null) args.push(ownerId);
  return db.prepare(sql).run(...args).changes;
}
const blocksOf = sid => db.prepare('SELECT * FROM stadium_blocks WHERE stadium_id=? AND date>=? ORDER BY date, hour_from').all(sid, cairoNow().date).map(r => ({ id: r.id, date: r.date, from: r.hour_from, to: r.hour_to, reason: r.reason }));
function dropImage(sid, pth, ownerId) {
  const s = ownerId != null ? db.prepare('SELECT * FROM stadiums WHERE id=? AND owner_id=?').get(sid, ownerId) : db.prepare('SELECT * FROM stadiums WHERE id=?').get(sid);
  if (!s) throw new HttpError(404, 'الملعب غير موجود');
  const imgs = JSON.parse(s.images), i = imgs.indexOf(pth); if (i < 0) throw new HttpError(404, 'الصورة غير موجودة');
  imgs.splice(i, 1); db.prepare('UPDATE stadiums SET images=?, updated_at=? WHERE id=?').run(JSON.stringify(imgs), now(), s.id);
  if (/^uploads\/[a-f0-9]+\.(jpg|png|webp)$/.test(pth)) fs.rmSync(path.join(UPLOADS, path.basename(pth)), { force: true });
  return stadiumOut(db.prepare('SELECT * FROM stadiums WHERE id=?').get(s.id));
}
const newStadiumId = () => 's' + crypto.randomBytes(5).toString('hex');

/* ---------- أكواد أصحاب الملاعب ---------- */
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const normCode = c => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
function genCode() { let s = ''; for (let i = 0; i < 12; i++) s += ALPHA[crypto.randomInt(ALPHA.length)]; return { plain: 'OWN-' + s.slice(0, 4) + '-' + s.slice(4, 8) + '-' + s.slice(8), hash: sha('OWN' + s), hint: s.slice(8) }; }
function createCode(adminId, label, days, replaces) {
  const c = genCode(), t = now();
  const id = Number(db.prepare('INSERT INTO owner_codes(code_hash,hint,label,status,expires_at,created_by,created_at) VALUES(?,?,?,?,?,?,?)').run(c.hash, c.hint, label, 'active', t + days * 86400000, adminId, t).lastInsertRowid);
  if (replaces) db.prepare('UPDATE owner_codes SET replaced_by=? WHERE id=?').run(id, replaces);
  return { id, code: c.plain, expiresAt: t + days * 86400000 };
}
const codeState = r => r.status === 'active' && r.expires_at <= now() ? 'expired' : r.status;

/* ---------- المسارات ---------- */
async function api(req, res, url) {
  const m = req.method, p = url.pathname, user = sessionUser(req), ip = ipOf(req);
  if (m !== 'GET') {   // حماية CSRF: Origin مطابق + JSON فقط (والكوكي SameSite=Lax)
    const o = req.headers.origin; if (o) { let h; try { h = new URL(o).host; } catch (e) { h = ''; } if (h !== req.headers.host) throw new HttpError(403, 'طلب غير مسموح'); }
  }
  let mm;
  /* عام */
  if (m === 'GET' && p === '/api/me') return send(res, 200, { user: user ? pubUser(user) : null });
  if (m === 'GET' && p === '/api/stadiums') return send(res, 200, { stadiums: db.prepare('SELECT * FROM stadiums WHERE ' + pub() + ' ORDER BY created_at, name').all().map(stadiumOut) });
  if (m === 'GET' && p === '/api/slots') {
    const today = cairoNow().date;
    const out = db.prepare('SELECT bs.stadium_id s, bs.date d, bs.hour h FROM booking_slots bs JOIN stadiums st ON st.id=bs.stadium_id WHERE ' + pub('st') + ' AND bs.date>=?').all(today).map(r => [r.s, r.d, r.h]);
    db.prepare('SELECT b.stadium_id s, b.date d, b.hour_from f, b.hour_to t FROM stadium_blocks b JOIN stadiums st ON st.id=b.stadium_id WHERE ' + pub('st') + ' AND b.date>=?').all(today)
      .forEach(b => { for (let h = b.f; h < b.t; h++) out.push([b.s, b.d, h]); });   // الفترات المغلقة من المالك تظهر كمواعيد غير متاحة
    return send(res, 200, { slots: out });
  }
  if (m === 'GET' && p === '/api/stats') {
    const c = q => db.prepare(q).get().c;
    return send(res, 200, { stadiums: c('SELECT COUNT(*) c FROM stadiums WHERE ' + pub()), bookings: c("SELECT COUNT(*) c FROM bookings WHERE status='confirmed'"), players: c("SELECT COUNT(*) c FROM users WHERE role='user'") });
  }
  if (m === 'POST' && p === '/api/contact') {
    if (limited('contact:' + ip, 5, 600000)) throw new HttpError(429, 'محاولات كثيرة، حاول لاحقًا');
    const b = await readBody(req, 20000);
    if (!text(b.name, 3, 80)) throw bad(MSG.required, 'name'); if (!emailOk(b.email)) throw bad(MSG.email, 'email');
    if (!text(b.subject, 3, 120)) throw bad(MSG.required, 'subject'); if (!text(b.message, 10, 2000)) throw bad('الرسالة من 10 إلى 2000 حرف', 'message');
    db.prepare('INSERT INTO messages(name,email,subject,message,created_at) VALUES(?,?,?,?,?)').run(b.name.trim(), b.email.trim(), b.subject.trim(), b.message.trim(), now());
    return send(res, 201, { ok: true });
  }
  /* الحسابات */
  if (m === 'POST' && p === '/api/register') {
    if (limited('reg:' + ip, 20, 3600000)) throw new HttpError(429, 'محاولات كثيرة، حاول لاحقًا');
    const b = await readBody(req, 20000);   // الدور دائمًا "user" مهما أُرسل
    if (!text(b.name, 3, 80)) throw bad(MSG.required, 'name'); if (!emailOk(b.email)) throw bad(MSG.email, 'email');
    if (!phoneOk(b.phone)) throw bad(MSG.phone, 'phone'); if (!pwOk(b.password)) throw bad(MSG.password, 'password');
    const h = await hashPw(b.password);
    try {
      const id = Number(db.prepare("INSERT INTO users(name,email,phone,role,pass_hash,created_at) VALUES(?,?,?,'user',?,?)").run(b.name.trim(), b.email.trim().toLowerCase(), b.phone.trim(), h, now()).lastInsertRowid);
      return send(res, 201, { user: pubUser({ id, name: b.name.trim(), email: b.email.trim().toLowerCase(), phone: b.phone.trim(), role: 'user' }) }, { 'Set-Cookie': startSession(res, id) });
    } catch (e) { if (/UNIQUE/.test(e.message)) throw new HttpError(409, 'هذا البريد الإلكتروني مسجّل بالفعل', 'email'); throw e; }
  }
  if (m === 'POST' && p === '/api/login') {
    const b = await readBody(req, 5000), email = String(b.email || '').trim().toLowerCase();
    if (limited('login:' + ip, 30, 900000) || limited('loginE:' + email, 10, 900000)) throw new HttpError(429, 'محاولات كثيرة، حاول بعد بضع دقائق');
    const u = typeof b.password === 'string' ? db.prepare('SELECT * FROM users WHERE email=?').get(email) : null;
    const okPw = await checkPw(String(b.password || ''), u ? u.pass_hash : DUMMY_HASH);
    if (!u || !okPw) throw new HttpError(401, 'البريد الإلكتروني أو كلمة المرور غير صحيحة');
    if (u.status !== 'active') throw new HttpError(403, 'تم إيقاف هذا الحساب، تواصل مع إدارة المنصة');
    if (b.portal === 'owner' && u.role !== 'owner') throw new HttpError(403, 'هذا الحساب ليس حساب صاحب ملعب');
    return send(res, 200, { user: pubUser(u) }, { 'Set-Cookie': startSession(res, u.id) });
  }
  if (m === 'POST' && p === '/api/logout') {
    const t = cookies(req).sid; if (t) db.prepare('DELETE FROM sessions WHERE token_hash=?').run(sha(t));
    return send(res, 200, { ok: true }, { 'Set-Cookie': 'sid=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0' });
  }
  if (m === 'POST' && p === '/api/me') {
    needRole(user, 'user', 'owner', 'admin'); const b = await readBody(req, 5000);
    if (!text(b.name, 3, 80)) throw bad(MSG.required, 'name'); if (!phoneOk(b.phone)) throw bad(MSG.phone, 'phone');
    db.prepare('UPDATE users SET name=?, phone=? WHERE id=?').run(b.name.trim(), b.phone.trim(), user.id);   // لا يمكن تغيير الدور من هنا
    return send(res, 200, { user: pubUser(Object.assign({}, user, { name: b.name.trim(), phone: b.phone.trim() })) });
  }
  if (m === 'POST' && p === '/api/me/password') {
    needRole(user, 'user', 'owner', 'admin'); const b = await readBody(req, 5000);
    if (limited('pw:' + user.id, 10, 900000)) throw new HttpError(429, 'محاولات كثيرة، حاول لاحقًا');
    if (!pwOk(b.password)) throw bad(MSG.password, 'password');
    const u = db.prepare('SELECT pass_hash FROM users WHERE id=?').get(user.id);
    if (!(await checkPw(String(b.old || ''), u.pass_hash))) throw new HttpError(400, 'كلمة المرور الحالية غير صحيحة', 'old');
    db.prepare('UPDATE users SET pass_hash=? WHERE id=?').run(await hashPw(b.password), user.id);
    db.prepare('DELETE FROM sessions WHERE user_id=? AND token_hash<>?').run(user.id, sha(cookies(req).sid));
    return send(res, 200, { ok: true });
  }
  /* تسجيل صاحب ملعب بكود تفعيل — كل الفحوصات هنا على الخادم */
  if (m === 'POST' && p === '/api/owner/register') {
    if (limited('own:' + ip, +process.env.OWNER_REG_LIMIT || 10, 3600000)) throw new HttpError(429, 'محاولات كثيرة، حاول بعد ساعة');
    const b = await readBody(req, 20000);
    if (!text(b.name, 3, 80)) throw bad(MSG.required, 'name'); if (!phoneOk(b.phone)) throw bad(MSG.phone, 'phone'); if (!emailOk(b.email)) throw bad(MSG.email, 'email');
    if (!pwOk(b.password)) throw bad(MSG.password, 'password');
    let st; try { st = cleanStadium({ name: b.stadiumName, address: b.address }); } catch (e) { if (e.field === 'name') e.field = 'stadiumName'; throw e; }
    const code = normCode(b.code);
    if (code.length !== 15 || !code.startsWith('OWN')) throw bad(code ? 'كود التفعيل غير صحيح' : 'كود التفعيل مطلوب', 'code');
    const h = await hashPw(b.password), email = b.email.trim().toLowerCase();
    let out;
    db.exec('BEGIN IMMEDIATE');
    try {
      const c = db.prepare('SELECT * FROM owner_codes WHERE code_hash=?').get(sha(code));
      if (!c) throw new HttpError(400, 'كود التفعيل غير صحيح', 'code');
      if (c.status === 'used') throw new HttpError(400, 'هذا الكود مستخدم بالفعل', 'code');
      if (c.status === 'revoked') throw new HttpError(400, 'تم إلغاء هذا الكود، تواصل مع إدارة المنصة', 'code');
      if (c.expires_at <= now()) throw new HttpError(400, 'انتهت صلاحية هذا الكود، تواصل مع إدارة المنصة', 'code');
      if (db.prepare('SELECT 1 FROM users WHERE email=?').get(email)) throw new HttpError(409, 'هذا البريد الإلكتروني مسجّل بالفعل', 'email');
      const uid = Number(db.prepare("INSERT INTO users(name,email,phone,role,pass_hash,created_at) VALUES(?,?,?,'owner',?,?)").run(b.name.trim(), email, b.phone.trim(), h, now()).lastInsertRowid);
      const claim = db.prepare("UPDATE owner_codes SET status='used', used_by=?, used_at=? WHERE id=? AND status='active' AND expires_at>?").run(uid, now(), c.id, now());
      if (claim.changes !== 1) throw new HttpError(400, 'هذا الكود مستخدم بالفعل', 'code');   // ضمان عدم الاستخدام المزدوج
      const sid = newStadiumId(), d = TYPES['11'];
      db.prepare('INSERT INTO stadiums(id,owner_id,name,location,location_ar,type,type_label,players,price,rating,features,images,bookable,published,open,close,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,0,?,?,0,0,8,24,?,?)')
        .run(sid, uid, st.name, st.location, st.location_ar, '11', d[0], d[1], 100, '[]', '[]', now(), now());
      db.exec('COMMIT');
      out = { id: uid, name: b.name.trim(), email, phone: b.phone.trim(), role: 'owner' };
    } catch (e) { db.exec('ROLLBACK'); if (e instanceof HttpError) throw e; if (/UNIQUE/.test(e.message)) throw new HttpError(409, 'هذا البريد الإلكتروني مسجّل بالفعل', 'email'); throw e; }
    return send(res, 201, { user: pubUser(out) }, { 'Set-Cookie': startSession(res, out.id) });
  }
  /* الحجوزات */
  if (m === 'GET' && p === '/api/bookings/mine') { needRole(user, 'user', 'owner', 'admin'); return send(res, 200, { bookings: db.prepare(BOOKING_SQL + ' WHERE b.user_id=? ORDER BY b.date DESC, b.hour DESC').all(user.id).map(bookingOut) }); }
  if (m === 'POST' && p === '/api/bookings') {
    needRole(user, 'user', 'owner', 'admin'); const b = await readBody(req, 5000);
    if (limited('book:' + user.id, 30, 600000)) throw new HttpError(429, 'محاولات كثيرة، حاول لاحقًا');
    const s = typeof b.stadiumId === 'string' ? db.prepare('SELECT * FROM stadiums WHERE id=? AND ' + pub()).get(b.stadiumId) : null;
    if (!s) throw bad('الملعب غير موجود'); if (!s.bookable) throw bad('هذا الملعب غير متاح للحجز حاليًا');
    if (!validDate(b.date)) throw bad('اختر التاريخ', 'date');
    if (!Number.isInteger(b.hour) || !Number.isInteger(b.duration) || b.duration < 1 || b.duration > MAX_DURATION) throw bad('بيانات الموعد غير صحيحة');
    if (b.hour < s.open || b.hour + b.duration > s.close) throw bad('الموعد خارج ساعات عمل الملعب');
    const n = cairoNow(); if (wall(b.date, b.hour) <= n.wall) throw bad('لا يمكن حجز موعد في الماضي');
    if (Date.parse(b.date + 'T00:00:00Z') - Date.parse(n.date + 'T00:00:00Z') > MAX_DAYS * 86400000) throw bad('لا يمكن الحجز لأكثر من ' + MAX_DAYS + ' يومًا قادمة');
    if (!text(b.name, 3, 80)) throw bad(MSG.required, 'name'); if (!phoneOk(b.phone)) throw bad(MSG.phone, 'phone');
    if (b.notes != null && (typeof b.notes !== 'string' || b.notes.length > 300)) throw bad('الملاحظات طويلة جدًا', 'notes');
    const id = 'BK-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    db.exec('BEGIN IMMEDIATE');
    try {
      if (db.prepare('SELECT 1 FROM stadium_blocks WHERE stadium_id=? AND date=? AND hour_from<? AND hour_to>?').get(s.id, b.date, b.hour + b.duration, b.hour)) throw new HttpError(409, 'هذا الموعد غير متاح حاليًا (مغلق من صاحب الملعب)');
      db.prepare('INSERT INTO bookings(id,user_id,stadium_id,date,hour,duration,price,name,phone,notes,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(id, user.id, s.id, b.date, b.hour, b.duration, s.price * b.duration, b.name.trim(), b.phone.trim(), (b.notes || '').trim(), 'confirmed', now());
      const ins = db.prepare('INSERT INTO booking_slots(stadium_id,date,hour,booking_id) VALUES(?,?,?,?)');
      for (let k = 0; k < b.duration; k++) ins.run(s.id, b.date, b.hour + k, id);   // المفتاح الأساسي يمنع الحجز المكرر
      db.exec('COMMIT');
    } catch (e) { db.exec('ROLLBACK'); if (/UNIQUE|PRIMARY/.test(e.message)) throw new HttpError(409, 'عذرًا، تم حجز هذا الموعد للتو. اختر موعدًا آخر'); throw e; }
    return send(res, 201, { booking: bookingOut(db.prepare(BOOKING_SQL + ' WHERE b.id=?').get(id)) });
  }
  if (m === 'POST' && (mm = p.match(/^\/api\/bookings\/(BK-[A-F0-9]+)\/cancel$/))) {
    needRole(user, 'user', 'owner', 'admin');
    const b = db.prepare('SELECT * FROM bookings WHERE id=?').get(mm[1]);
    if (!b || (user.role !== 'admin' && b.user_id !== user.id)) throw new HttpError(404, 'الحجز غير موجود');
    if (b.status !== 'confirmed') throw bad('الحجز ملغي بالفعل');
    const n = cairoNow(), start = wall(b.date, b.hour);
    if (start <= n.wall) throw bad('انتهى موعد الحجز');
    if (user.role !== 'admin' && start - n.wall < CANCEL_HOURS * 3600000) throw bad('الإلغاء متاح قبل الموعد بـ ' + CANCEL_HOURS + ' ساعة على الأقل');
    db.exec('BEGIN IMMEDIATE');
    try { db.prepare("UPDATE bookings SET status='cancelled', cancelled_at=?, cancelled_by=? WHERE id=?").run(now(), user.role === 'admin' && b.user_id !== user.id ? 'admin' : 'user', b.id); db.prepare('DELETE FROM booking_slots WHERE booking_id=?').run(b.id); db.exec('COMMIT'); } catch (e) { db.exec('ROLLBACK'); throw e; }
    return send(res, 200, { ok: true });
  }
  /* لوحة صاحب الملعب — كل استعلام مقيّد بـ owner_id = المستخدم الحالي */
  if (p.startsWith('/api/owner/') && p !== '/api/owner/register') {
    needRole(user, 'owner');
    if (m === 'GET' && p === '/api/owner/stadiums') return send(res, 200, { stadiums: db.prepare('SELECT * FROM stadiums WHERE owner_id=? ORDER BY created_at').all(user.id).map(stadiumOut) });
    if (m === 'GET' && p === '/api/owner/bookings') return send(res, 200, { bookings: db.prepare(BOOKING_SQL + ' WHERE s.owner_id=? ORDER BY b.date DESC, b.hour DESC').all(user.id).map(bookingOut) });
    if (m === 'POST' && p === '/api/owner/stadiums') {
      if (db.prepare('SELECT COUNT(*) c FROM stadiums WHERE owner_id=?').get(user.id).c >= 10) throw bad('وصلت للحد الأقصى من الملاعب');
      const b = await readBody(req, 20000), st = cleanStadium(Object.assign({ type: '11' }, b)), id = newStadiumId();
      db.prepare('INSERT INTO stadiums(id,owner_id,name,location,location_ar,type,type_label,players,price,rating,features,images,bookable,published,open,close,surface,size,description,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,0,?,?,0,0,?,?,?,?,?,?,?)')
        .run(id, user.id, st.name, st.location, st.location_ar, st.type, st.type_label, st.players, st.price || 100, st.features || '[]', '[]', st.open || 8, st.close || 24, st.surface || '', st.size || '', st.description || '', now(), now());
      return send(res, 201, { stadium: stadiumOut(db.prepare('SELECT * FROM stadiums WHERE id=?').get(id)) });
    }
    if ((mm = p.match(/^\/api\/owner\/stadiums\/(s[a-f0-9]+)$/)) && m === 'PUT') {
      const b = await readBody(req, 20000), o = cleanStadium(b, true);
      if (o.published === 1) { const cur = db.prepare('SELECT price FROM stadiums WHERE id=? AND owner_id=?').get(mm[1], user.id); if (cur && (o.price || cur.price) < 1) throw bad('حدّد السعر قبل النشر'); }
      if (!updateStadium(mm[1], o, user.id)) throw new HttpError(404, 'الملعب غير موجود');
      return send(res, 200, { stadium: stadiumOut(db.prepare('SELECT * FROM stadiums WHERE id=?').get(mm[1])) });
    }
    if ((mm = p.match(/^\/api\/owner\/stadiums\/(s[a-f0-9]+)\/images$/))) {
      const s = db.prepare('SELECT * FROM stadiums WHERE id=? AND owner_id=?').get(mm[1], user.id); if (!s) throw new HttpError(404, 'الملعب غير موجود');
      const imgs = JSON.parse(s.images);
      if (m === 'POST') {
        if (imgs.length >= MAX_IMAGES) throw bad('الحد الأقصى ' + MAX_IMAGES + ' صور');
        const b = await readBody(req, 2600000), mt = typeof b.dataUrl === 'string' && b.dataUrl.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
        if (!mt) throw bad('الصورة يجب أن تكون JPG أو PNG أو WEBP');
        const buf = Buffer.from(mt[2], 'base64'); if (buf.length > 1800000) throw bad('حجم الصورة كبير (الحد 1.8 ميجابايت)');
        const magic = buf.subarray(0, 4).toString('hex'), ext = magic.startsWith('ffd8ff') ? 'jpg' : magic === '89504e47' ? 'png' : (buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP') ? 'webp' : null;
        if (!ext) throw bad('ملف الصورة غير صالح');
        const name = crypto.randomBytes(12).toString('hex') + '.' + ext; fs.writeFileSync(path.join(UPLOADS, name), buf);
        imgs.push('uploads/' + name); db.prepare('UPDATE stadiums SET images=?, updated_at=? WHERE id=?').run(JSON.stringify(imgs), now(), s.id);
        return send(res, 201, { stadium: stadiumOut(db.prepare('SELECT * FROM stadiums WHERE id=?').get(s.id)) });
      }
      if (m === 'DELETE') { const b = await readBody(req, 2000); return send(res, 200, { stadium: dropImage(s.id, b.path, user.id) }); }
    }
    /* إغلاق فترات معيّنة (صيانة / حجز خاص / إجازة) */
    if ((mm = p.match(/^\/api\/owner\/stadiums\/(s[a-f0-9]+)\/blocks(?:\/(\d+))?$/))) {
      const s = db.prepare('SELECT * FROM stadiums WHERE id=? AND owner_id=?').get(mm[1], user.id); if (!s) throw new HttpError(404, 'الملعب غير موجود');
      if (m === 'GET' && !mm[2]) return send(res, 200, { blocks: blocksOf(s.id) });
      if (m === 'POST' && !mm[2]) {
        const b = await readBody(req, 3000), n = cairoNow();
        if (!validDate(b.date) || b.date < n.date || Date.parse(b.date + 'T00:00:00Z') - Date.parse(n.date + 'T00:00:00Z') > 365 * 86400000) throw bad('اختر تاريخًا صحيحًا لا يسبق اليوم', 'date');
        if (!Number.isInteger(b.from) || !Number.isInteger(b.to) || b.from < 0 || b.to > 24 || b.from >= b.to) throw bad('حدّد فترة صحيحة (من/إلى)', 'from');
        if (b.reason != null && (typeof b.reason !== 'string' || b.reason.length > 100)) throw bad('السبب طويل جدًا', 'reason');
        if (db.prepare('SELECT COUNT(*) c FROM stadium_blocks WHERE stadium_id=?').get(s.id).c >= 300) throw bad('وصلت للحد الأقصى من الفترات المغلقة');
        db.exec('BEGIN IMMEDIATE');
        try {
          if (db.prepare("SELECT 1 FROM bookings WHERE stadium_id=? AND date=? AND status='confirmed' AND hour<? AND hour+duration>?").get(s.id, b.date, b.to, b.from)) throw new HttpError(409, 'يوجد حجز مؤكد في هذه الفترة؛ ألغِ الحجز أولًا ثم أغلق الفترة');
          db.prepare('INSERT INTO stadium_blocks(stadium_id,date,hour_from,hour_to,reason,created_at) VALUES(?,?,?,?,?,?)').run(s.id, b.date, b.from, b.to, (b.reason || '').trim(), now());
          db.exec('COMMIT');
        } catch (e) { db.exec('ROLLBACK'); throw e; }
        return send(res, 201, { blocks: blocksOf(s.id) });
      }
      if (m === 'DELETE' && mm[2]) { if (!db.prepare('DELETE FROM stadium_blocks WHERE id=? AND stadium_id=?').run(+mm[2], s.id).changes) throw new HttpError(404, 'الفترة غير موجودة'); return send(res, 200, { blocks: blocksOf(s.id) }); }
    }
    /* المالك يلغي حجزًا على ملعبه (يُسجَّل السبب ويظهر للعميل في «حجوزاتي») */
    if (m === 'POST' && (mm = p.match(/^\/api\/owner\/bookings\/(BK-[A-F0-9]+)\/cancel$/))) {
      const b = db.prepare('SELECT b.* FROM bookings b JOIN stadiums s ON s.id=b.stadium_id WHERE b.id=? AND s.owner_id=?').get(mm[1], user.id);
      if (!b) throw new HttpError(404, 'الحجز غير موجود');
      const body = await readBody(req, 2000);
      if (body.reason != null && (typeof body.reason !== 'string' || body.reason.length > 200)) throw bad('السبب طويل جدًا');
      if (b.status !== 'confirmed') throw bad('الحجز ملغي بالفعل');
      if (wall(b.date, b.hour) <= cairoNow().wall) throw bad('انتهى موعد الحجز');
      db.exec('BEGIN IMMEDIATE');
      try { db.prepare("UPDATE bookings SET status='cancelled', cancelled_at=?, cancelled_by='owner', cancel_reason=? WHERE id=?").run(now(), (body.reason || '').trim(), b.id); db.prepare('DELETE FROM booking_slots WHERE booking_id=?').run(b.id); db.exec('COMMIT'); } catch (e) { db.exec('ROLLBACK'); throw e; }
      return send(res, 200, { ok: true });
    }
    throw new HttpError(404, 'غير موجود');
  }
  /* لوحة المسؤول */
  if (p.startsWith('/api/admin/')) {
    needRole(user, 'admin');
    if (m === 'GET' && p === '/api/admin/overview') {
      const codes = db.prepare('SELECT c.*, u.name used_name, u.email used_email FROM owner_codes c LEFT JOIN users u ON u.id=c.used_by ORDER BY c.created_at DESC').all()
        .map(c => ({ id: c.id, hint: c.hint, label: c.label, state: codeState(c), expiresAt: c.expires_at, createdAt: c.created_at, usedAt: c.used_at, usedBy: c.used_by ? { name: c.used_name, email: c.used_email } : null, replacedBy: c.replaced_by }));
      return send(res, 200, {
        bookings: db.prepare(BOOKING_SQL + ' ORDER BY b.created_at DESC').all().map(r => Object.assign(bookingOut(r), { userEmail: (db.prepare('SELECT email FROM users WHERE id=?').get(r.user_id) || {}).email })),
        users: db.prepare("SELECT id,name,email,phone,role,status,created_at createdAt, (SELECT COUNT(*) FROM bookings b WHERE b.user_id=users.id) bookings FROM users ORDER BY id").all(),
        messages: db.prepare('SELECT * FROM messages ORDER BY created_at DESC').all().map(x => ({ id: x.id, name: x.name, email: x.email, subject: x.subject, message: x.message, createdAt: x.created_at })),
        stadiums: db.prepare('SELECT s.*, u.name owner_name FROM stadiums s LEFT JOIN users u ON u.id=s.owner_id ORDER BY s.created_at').all().map(r => Object.assign(stadiumOut(r), { ownerName: r.owner_name || null })),
        codes,
        owners: db.prepare("SELECT u.id,u.name,u.email,u.phone,u.status,u.created_at createdAt,(SELECT group_concat(name, ' | ') FROM stadiums WHERE owner_id=u.id) stadiums,(SELECT hint FROM owner_codes WHERE used_by=u.id) codeHint FROM users u WHERE u.role='owner' ORDER BY u.id").all()
      });
    }
    if (m === 'POST' && p === '/api/admin/codes') {
      const b = await readBody(req, 2000);
      if (!text(b.label, 3, 80)) throw bad('اكتب اسم صاحب الملعب أو ملاحظة التحقق (3 أحرف على الأقل)', 'label');
      const days = Number.isInteger(b.days) ? b.days : 7; if (days < 1 || days > 90) throw bad('مدة الصلاحية من 1 إلى 90 يومًا', 'days');
      return send(res, 201, createCode(user.id, b.label.trim(), days));
    }
    if ((mm = p.match(/^\/api\/admin\/codes\/(\d+)\/(revoke|replace)$/)) && m === 'POST') {
      const c = db.prepare('SELECT * FROM owner_codes WHERE id=?').get(+mm[1]); if (!c) throw new HttpError(404, 'الكود غير موجود');
      if (c.status === 'used') throw new HttpError(409, 'لا يمكن تعديل كود مستخدم بالفعل');
      if (mm[2] === 'revoke') { db.prepare("UPDATE owner_codes SET status='revoked' WHERE id=? AND status='active'").run(c.id); return send(res, 200, { ok: true }); }
      const b = await readBody(req, 2000), days = Number.isInteger(b.days) ? b.days : 7; if (days < 1 || days > 90) throw bad('مدة الصلاحية من 1 إلى 90 يومًا', 'days');
      db.exec('BEGIN IMMEDIATE');
      try { db.prepare("UPDATE owner_codes SET status='revoked' WHERE id=? AND status='active'").run(c.id); const r = createCode(user.id, c.label, days, c.id); db.exec('COMMIT'); return send(res, 201, r); }
      catch (e) { db.exec('ROLLBACK'); throw e; }
    }
    if ((mm = p.match(/^\/api\/admin\/stadiums\/(s?[a-z0-9]+)$/)) && m === 'PATCH') {
      const b = await readBody(req, 2000), o = {};
      if (b.price !== undefined) { if (!Number.isInteger(b.price) || b.price < 1 || b.price > 100000) throw bad('أدخل سعرًا صحيحًا'); o.price = b.price; }
      if (b.bookable !== undefined) o.bookable = b.bookable ? 1 : 0;
      if (b.published !== undefined) o.published = b.published ? 1 : 0;
      if (!updateStadium(mm[1], o)) throw new HttpError(404, 'الملعب غير موجود');
      return send(res, 200, { ok: true });
    }
    if ((mm = p.match(/^\/api\/admin\/stadiums\/(s?[a-z0-9]+)$/)) && m === 'PUT') {
      const o = cleanStadium(await readBody(req, 20000), true); if (!Object.keys(o).length) throw bad('لا توجد بيانات للتحديث');
      if (!updateStadium(mm[1], o)) throw new HttpError(404, 'الملعب غير موجود');
      return send(res, 200, { stadium: stadiumOut(db.prepare('SELECT * FROM stadiums WHERE id=?').get(mm[1])) });
    }
    if ((mm = p.match(/^\/api\/admin\/stadiums\/(s?[a-z0-9]+)\/images$/)) && m === 'DELETE') { const b = await readBody(req, 2000); return send(res, 200, { stadium: dropImage(mm[1], b.path) }); }
    if ((mm = p.match(/^\/api\/admin\/users\/(\d+)\/(suspend|unsuspend)$/)) && m === 'POST') {
      const t = db.prepare('SELECT id, role FROM users WHERE id=?').get(+mm[1]);
      if (!t) throw new HttpError(404, 'هذا الحساب غير موجود');
      if (t.role === 'admin' || t.id === user.id) throw bad('لا يمكن إيقاف حساب المسؤول');
      if (mm[2] === 'suspend') { db.prepare("UPDATE users SET status='suspended' WHERE id=?").run(t.id); db.prepare('DELETE FROM sessions WHERE user_id=?').run(t.id); }
      else db.prepare("UPDATE users SET status='active' WHERE id=?").run(t.id);
      return send(res, 200, { ok: true });
    }
    if ((mm = p.match(/^\/api\/admin\/messages\/(\d+)$/)) && m === 'DELETE') { db.prepare('DELETE FROM messages WHERE id=?').run(+mm[1]); return send(res, 200, { ok: true }); }
    throw new HttpError(404, 'غير موجود');
  }
  throw new HttpError(404, 'غير موجود');
}

/* ---------- الملفات الثابتة ---------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src https://fonts.gstatic.com https://cdnjs.cloudflare.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";
function serveStatic(req, res, url) {
  let rel; try { rel = decodeURIComponent(url.pathname); } catch (e) { res.writeHead(400); return res.end(); }
  if (rel === '/') rel = '/index.html';
  const base = rel.startsWith('/uploads/') ? UPLOADS : ROOT, sub = rel.startsWith('/uploads/') ? rel.slice(9) : rel.slice(1);
  const file = path.resolve(base, sub);
  if (!file.startsWith(base + path.sep) || sub.includes('\0')) { res.writeHead(403); return res.end('Forbidden'); }
  const ext = path.extname(file).toLowerCase();
  if (!MIME[ext] || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Not found'); }
  res.writeHead(200, { 'Content-Type': MIME[ext], 'Cache-Control': ext === '.jpg' || ext === '.png' || ext === '.webp' ? 'public, max-age=86400' : 'no-cache' });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('X-Frame-Options', 'DENY'); res.setHeader('Referrer-Policy', 'same-origin'); res.setHeader('Content-Security-Policy', CSP);
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname.startsWith('/api/')) await api(req, res, url);
    else if (req.method === 'GET' || req.method === 'HEAD') serveStatic(req, res, url);
    else { res.writeHead(405); res.end(); }
  } catch (e) {
    if (e instanceof HttpError) { if (!res.headersSent) send(res, e.status, { error: e.message, field: e.field }); }
    else { console.error(e); if (!res.headersSent) send(res, 500, { error: 'حدث خطأ في الخادم' }); }
  }
});
bootstrap().then(() => server.listen(PORT, () => console.log('3ALM ELSHABAB يعمل على http://localhost:' + PORT))).catch(e => { console.error(e); process.exit(1); });
