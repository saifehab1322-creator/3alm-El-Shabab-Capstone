"""اختبار واجهة كاملة (Playwright) على خادم مؤقت بقاعدة بيانات مؤقتة.
التشغيل: python3 tests/ui.test.py   (يتطلب: pip install playwright && playwright install chromium)"""
import os, subprocess, tempfile, time, sys, datetime, base64, shutil, random
from playwright.sync_api import sync_playwright
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
PORT = str(3800 + random.randint(0, 150)); BASE = 'http://localhost:' + PORT + '/'
DATA = tempfile.mkdtemp(prefix='3alm-ui-'); ADMIN_PW = 'Adm1nUiTest9'; PW = 'Passw0rdX'
env = dict(os.environ, PORT=PORT, DATA_DIR=DATA, ADMIN_PASSWORD=ADMIN_PW, OWNER_REG_LIMIT='60')
srv = subprocess.Popen(['node', '--no-warnings', os.path.join(ROOT, 'server', 'server.js')], env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
for _ in range(60):
    time.sleep(0.2)
    try:
        import urllib.request; urllib.request.urlopen(BASE + 'api/me'); break
    except Exception: pass
res = []; errs = []
def ok(n, c, x=''):
    res.append(bool(c)); print(('PASS ' if c else 'FAIL ') + n + ((' -> ' + str(x)) if x else ''))
PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==')
LEFT = """()=>{const o=[];const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){const e=n.parentElement;if(e.closest('[data-no-i18n],script,style'))continue;if(/[\\u0600-\\u06FF]/.test(n.nodeValue))o.push(n.nodeValue.trim().slice(0,70))}
document.querySelectorAll('[placeholder],[title],[aria-label]').forEach(e=>['placeholder','title','aria-label'].forEach(a=>{const v=e.getAttribute(a);if(v&&/[\\u0600-\\u06FF]/.test(v))o.push(a+':'+v)}));return o}"""
def until(page, expr, timeout=10):
    # بديل wait_for_function: لا يستخدم eval داخل الصفحة (سياسة CSP على الخادم تمنعه عمدًا)
    end = time.time() + timeout
    while time.time() < end:
        if page.evaluate(expr): return True
        time.sleep(0.1)
    raise AssertionError('timeout waiting for: ' + expr[:90])
def login(pg, email, pw, owner=False):
    pg.goto(BASE + ('owner-login.html' if owner else 'login.html')); pg.wait_for_selector('form')
    pg.fill('input[name=email]', email); pg.fill('input[name=password]', pw); pg.click('form button[type=submit]')
def logout(pg):
    pg.click('#logoutLink'); pg.wait_for_url('**/login.html')
try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    def hook(page): page.on('pageerror', lambda e: errs.append(page.url + ' :: ' + str(getattr(e, 'stack', e))[:500]))
    _nc = b.new_context
    def new_context(**kw):
        c = _nc(**kw); c.on('page', hook); return c
    b.new_context = new_context
    ctx = b.new_context(viewport={'width': 1280, 'height': 900}); pg = ctx.new_page()
    pg.on('console', lambda m: errs.append(pg.url + ' :: ' + m.text[:200] + ' @ ' + str(m.location)) if m.type == 'error' and 'Failed to load' not in m.text and 'net::' not in m.text and 'status of 4' not in m.text else None)
    # --- مستخدم عادي ---
    pg.goto(BASE); pg.wait_for_selector('#featured .s-card'); ok('home loads stadiums from server DB', pg.locator('#featured .s-card').count() == 3)
    ok('guest nav shows owner links', pg.locator('.sidebar a[href="owner-register.html"]').count() == 1 and pg.locator('.sidebar a[href="owner-login.html"]').count() == 1)
    pg.goto(BASE + 'register.html'); pg.fill('#rname', 'Normal User'); pg.fill('#remail', 'user@t.com'); pg.fill('#rphone', '01012345678'); pg.fill('#rpass', PW); pg.fill('#rpass2', PW); pg.click('#registerForm button[type=submit]')
    pg.wait_for_url('**/index.html'); pg.wait_for_selector('#logoutLink', state='attached'); ok('user registers and is logged in', 'Normal User' in pg.inner_text('.acct-box'))
    day = (datetime.date.today() + datetime.timedelta(days=3)).isoformat()
    pg.goto(BASE + 'booking.html?stadium=c'); pg.wait_for_selector('.slot'); pg.fill('#dt', day); pg.dispatch_event('#dt', 'change'); pg.wait_for_selector('.slot')
    pg.click('.slot[data-h="20"]'); pg.click('#confirmBtn'); pg.wait_for_selector('.success-box'); ok('regular booking works end-to-end', 'تم تأكيد حجزك' in pg.inner_text('.success-box'))
    pg.goto(BASE + 'booking.html?stadium=c'); pg.wait_for_selector('.slot'); pg.fill('#dt', day); pg.dispatch_event('#dt', 'change'); pg.wait_for_selector('.slot'); ok('booked slot disabled (from server)', pg.is_disabled('.slot[data-h="20"]'))
    pg.goto(BASE + 'my-booking.html'); pg.wait_for_selector('.bookings-table'); ok('my bookings lists server booking', 'Stadium C' in pg.inner_text('.bookings-table'))
    # --- 8) صلاحيات المستخدم العادي ---
    pg.goto(BASE + 'owner-dashboard.html'); pg.wait_for_selector('main .gate'); ok('8. user blocked from owner dashboard page', 'لأصحاب الملاعب' in pg.inner_text('main'))
    pg.goto(BASE + 'admin.html'); pg.wait_for_selector('main .gate'); ok('8. user blocked from admin page', 'للمسؤولين' in pg.inner_text('main'))
    codes = pg.evaluate("Promise.all(['/api/owner/stadiums','/api/admin/overview','/api/owner/bookings'].map(u=>fetch(u).then(r=>r.status)))"); ok('8. server returns 403 for user on owner/admin APIs', codes == [403, 403, 403], codes)
    logout_pg = pg.goto(BASE + 'index.html'); pg.wait_for_selector('#logoutLink', state='attached'); logout(pg)
    pg.goto(BASE + 'owner-login.html'); pg.fill('#olemail', 'user@t.com'); pg.fill('#olpass', PW); pg.click('#ownerLoginForm button[type=submit]'); pg.wait_for_selector('.form-msg.err'); ok('normal user rejected at owner login', 'ليس حساب صاحب ملعب' in pg.inner_text('.form-msg'))
    # --- المسؤول يولّد كود ---
    login(pg, 'admin@3almelshabab.com', ADMIN_PW); pg.wait_for_url('**/index.html')
    pg.goto(BASE + 'admin.html'); pg.wait_for_selector('.kpi'); ok('admin dashboard loads', pg.locator('#codeForm').count() == 1)
    pg.click('#codeForm button[type=submit]'); ok('code form validates label', 'مطلوب' in pg.inner_text('#clabel >> xpath=..'))
    pg.fill('#clabel', 'Ali Hassan - verified by phone'); pg.fill('#cdays', '7'); pg.click('#codeForm button[type=submit]'); pg.wait_for_selector('#codeText')
    code1 = pg.inner_text('#codeText').strip(); ok('admin creates code, shown once', code1.startswith('OWN-') and len(code1) == 18, code1)
    pg.wait_for_selector('#codesActive table'); ok('unused code listed (masked, not plaintext)', code1 not in pg.inner_text('#codesActive') and 'Ali Hassan' in pg.inner_text('#codesActive'))
    pg.fill('#clabel', 'Revoke me'); pg.click('#codeForm button[type=submit]'); until(pg, "document.querySelectorAll('#codesActive tbody tr').length===2"); code2 = pg.inner_text('#codeText').strip()
    pg.on('dialog', lambda d: d.accept('Pitch flooded') if d.type == 'prompt' else d.accept())
    pg.click('#codesActive tbody tr:has-text("Revoke me") [data-revoke]'); until(pg, "document.querySelectorAll('#codesActive tbody tr').length===1"); ok('admin revokes unused code', 'ملغى' in pg.inner_text('#codesDead'))
    logout_btn = pg.click('#logoutLink'); pg.wait_for_url('**/login.html')
    # --- تسجيل المالك ---
    pg.goto(BASE + 'owner-register.html'); pg.click('#ownerRegForm button[type=submit]'); ok('4. owner form blocks empty fields incl. code', 'مطلوب' in pg.inner_text('#ocode >> xpath=..'))
    def fill_owner(code, email, n='Ali Hassan'):
        pg.goto(BASE + 'owner-register.html'); pg.fill('#oname', n); pg.fill('#ophone', '01098765432'); pg.fill('#oemail', email); pg.fill('#opass', PW); pg.fill('#opass2', PW); pg.fill('#ostadium', 'Nile Arena'); pg.fill('#oaddr', 'Sohag, Nile Corniche'); pg.fill('#ocode', code)
        pg.click('#ownerRegForm button[type=submit]')
    fill_owner('OWN-AAAA-BBBB-CCCC', 'ali@t.com'); until(pg, "document.querySelector('#ocode').closest('.form-group').innerText.includes('غير صحيح')"); ok('2. wrong code -> message next to code field', True)
    fill_owner(code2, 'ali@t.com'); until(pg, "document.querySelector('#ocode').closest('.form-group').innerText.includes('إلغاء')"); ok('5. revoked code -> clear message', True)
    fill_owner(code1, 'ali@t.com'); pg.wait_for_url('**/owner-dashboard.html'); pg.wait_for_selector('#editForm'); ok('1. valid code -> owner account created & redirected to owner dashboard', 'Nile Arena' in pg.input_value('#editForm_name'))
    ok('owner nav shows owner dashboard, no admin link', pg.locator('.sidebar a[href="owner-dashboard.html"]').count() == 1 and pg.locator('.sidebar a[href="admin.html"]').count() == 0)
    # --- لوحة المالك: تعديل + صورة + نشر ---
    ok('new stadium starts unpublished (banner)', pg.locator('.banner').count() == 1)
    pg.fill('#editForm_price', '150'); pg.select_option('#editForm_open', '10'); pg.select_option('#editForm_close', '23'); pg.fill('#editForm_surface', 'Artificial turf'); pg.fill('#editForm_features', 'Parking, Showers, Floodlights'); pg.fill('#editForm_desc', 'A nice pitch on the Nile.')
    pg.check('input[name=bookable]'); pg.check('input[name=published]'); pg.click('#editForm button[type=submit]'); until(pg, "document.querySelector('#editForm .form-msg.ok') && document.querySelectorAll('.banner').length===0"); until(pg, "document.querySelectorAll('.banner').length===0"); ok('owner saves details (price/hours/features/publish)', pg.locator('.banner').count() == 0)
    pg.set_input_files('#imgInput', files=[{'name': 'pitch.png', 'mimeType': 'image/png', 'buffer': PNG}]); pg.wait_for_selector('.thumb img'); ok('owner uploads a photo', pg.locator('.thumb').count() == 1)
    pg.set_input_files('#imgInput', files=[{'name': 'pitch2.png', 'mimeType': 'image/png', 'buffer': PNG}]); until(pg, "document.querySelectorAll('.thumb').length===2"); ok('owner uploads a second photo', True)
    pg.fill('#editForm_price', '-4'); pg.click('#editForm button[type=submit]'); until(pg, "document.querySelector('#editForm_price').closest('.form-group').querySelector('.field-error').textContent.length>0"); ok('owner price validation', True)
    pg.fill('#editForm_price', '150')
    # المستخدم يحجز ملعب المالك ثم يظهر عند المالك فقط
    ctx2 = b.new_context(viewport={'width': 1280, 'height': 900}); u = ctx2.new_page(); u.on('pageerror', lambda e: errs.append('USER ' + u.url + ' :: ' + str(getattr(e, 'stack', e))[:400])); login(u, 'user@t.com', PW); u.wait_for_url('**/index.html')
    u.goto(BASE + 'stadium.html'); u.wait_for_selector('.s-card'); ok('published owner stadium appears publicly with price & photo', u.locator('.s-card:has-text("Nile Arena")').count() == 1 and '150' in u.inner_text('.s-card:has-text("Nile Arena")'))
    ok('public card uses owner photo', 'uploads/' in (u.get_attribute('.s-card:has-text("Nile Arena") img', 'src') or ''))
    txt = u.inner_text('.s-card:has-text("Nile Arena")'); ok('new stadium shows "New" instead of 0.0 rating', 'جديد' in txt and '0.0' not in txt, txt[:60])
    u.click('.s-card:has-text("Nile Arena") [data-details]'); u.wait_for_selector('#sm-next:not([hidden])'); ok('public gallery: 2 photos, counter 1 / 2', u.inner_text('#sm-count').strip() == '1 / 2')
    src1 = u.get_attribute('#sm-img', 'src'); u.click('#sm-next'); ok('gallery next shows the second photo', u.inner_text('#sm-count').strip() == '2 / 2' and u.get_attribute('#sm-img', 'src') != src1); u.keyboard.press('Escape')
    href2 = u.get_attribute('.s-card:has-text("Nile Arena") a.btn-primary', 'href')
    u.click('.s-card:has-text("Nile Arena") a.btn-primary'); u.wait_for_selector('.slot'); u.fill('#dt', day); u.dispatch_event('#dt', 'change'); u.wait_for_selector('.slot')
    ok('opening hours enforced in booking UI (10-23)', u.locator('.slot').count() == 13 and u.locator('.slot[data-h="9"]').count() == 0)
    u.click('.slot[data-h="18"]'); u.click('#confirmBtn'); u.wait_for_selector('.success-box'); ok('user books owner stadium', True)
    pg.reload(); pg.wait_for_selector('#ownBookings table'); ok('owner sees that booking with customer details', 'Normal User' in pg.inner_text('#ownBookings') and '01012345678' in pg.inner_text('#ownBookings'))
    ok('owner does NOT see bookings of platform stadium C', 'Stadium C' not in pg.inner_text('#ownBookings'))
    day5 = (datetime.date.today() + datetime.timedelta(days=5)).isoformat()
    pg.fill('#bfDate', day5); pg.select_option('#bfFrom', '10'); pg.select_option('#bfTo', '12'); pg.fill('#bfReason', 'Maintenance'); pg.click('#blockForm button[type=submit]'); pg.wait_for_selector('#blockList table'); ok('owner blocks a period (UI)', 'Maintenance' in pg.inner_text('#blockList'))
    u.goto(BASE + href2); u.wait_for_selector('.slot'); u.fill('#dt', day5); u.dispatch_event('#dt', 'change'); u.wait_for_selector('.slot')
    ok('blocked hours are disabled for customers', u.is_disabled('.slot[data-h="10"]') and u.is_disabled('.slot[data-h="11"]') and not u.is_disabled('.slot[data-h="12"]'))
    pg.click('[data-bdel]'); until(pg, "document.querySelectorAll('#blockList table').length===0"); u.reload(); u.wait_for_selector('.slot'); u.fill('#dt', day5); u.dispatch_event('#dt', 'change'); u.wait_for_selector('.slot')
    ok('after reopening, hours are bookable again', not u.is_disabled('.slot[data-h="10"]'))
    pg.click('#ownBookings [data-ocancel]'); until(pg, "document.querySelectorAll('#ownBookings [data-ocancel]').length===0"); ok('owner cancels a customer booking (UI)', 'ألغيته أنت' in pg.inner_text('#ownBookings'))
    u.goto(BASE + 'my-booking.html'); u.wait_for_selector('.bookings-table'); bt = u.inner_text('.bookings-table'); ok('customer sees owner cancellation + reason', 'ألغاه صاحب الملعب' in bt and 'Pitch flooded' in bt)
    pg.goto(BASE + 'admin.html'); pg.wait_for_selector('main .gate'); ok('8. owner blocked from admin page', 'للمسؤولين' in pg.inner_text('main'))
    # --- 3) إعادة استخدام الكود ---
    pg.click('#logoutLink'); pg.wait_for_url('**/login.html'); fill_owner(code1, 'other@t.com', 'Someone Else'); until(pg, "document.querySelector('#ocode').closest('.form-group').innerText.includes('مستخدم')"); ok('3. reusing a used code is rejected in the UI', True)
    # --- 6) دخول المالك ---
    login(pg, 'ali@t.com', PW, owner=True); pg.wait_for_url('**/owner-dashboard.html'); pg.wait_for_selector('#editForm'); ok('6. owner login via owner portal -> dashboard', pg.locator('#editForm').count() == 1)
    # --- المسؤول يرى الاستخدام ---
    ctx3 = b.new_context(viewport={'width': 1280, 'height': 900}); a = ctx3.new_page(); a.on('pageerror', lambda e: errs.append('ADMIN ' + a.url + ' :: ' + str(getattr(e, 'stack', e))[:400])); a.on('dialog', lambda d: d.accept()); login(a, 'admin@3almelshabab.com', ADMIN_PW); a.wait_for_url('**/index.html')
    a.goto(BASE + 'admin.html'); a.wait_for_selector('#codesUsed table'); ok('admin: used code linked to owner account', 'ali@t.com' in a.inner_text('#codesUsed') and 'Ali Hassan' in a.inner_text('#adminOwners'))
    a.click('#adminOwners [data-sus]'); until(a, "document.querySelectorAll('#adminOwners [data-unsus]').length===1"); ok('admin suspends the owner (UI)', 'موقوف' in a.inner_text('#adminOwners'))
    u.goto(BASE + 'stadium.html'); u.wait_for_selector('.s-card'); ok('suspended owner stadium hidden from the public', u.locator('.s-card:has-text("Nile Arena")').count() == 0)
    pg.goto(BASE + 'owner-dashboard.html'); pg.wait_for_url('**/owner-login.html*'); ok('suspended owner session is dead -> sent to login', True)
    pg.fill('#olemail', 'ali@t.com'); pg.fill('#olpass', PW); pg.click('#ownerLoginForm button[type=submit]'); pg.wait_for_selector('.form-msg.err'); ok('suspended owner login shows a clear message', 'إيقاف' in pg.inner_text('.form-msg'))
    a.click('#adminOwners [data-unsus]'); until(a, "document.querySelectorAll('#adminOwners [data-sus]').length===1"); u.reload(); u.wait_for_selector('.s-card'); ok('after reactivation the stadium is public again', u.locator('.s-card:has-text("Nile Arena")').count() == 1)
    login(pg, 'ali@t.com', PW, owner=True); pg.wait_for_url('**/owner-dashboard.html'); pg.wait_for_selector('#editForm')
    a.click('#adminStadiums tr:has-text("Nile Arena") [data-edit]'); a.wait_for_selector('#adminEditForm'); a.fill('#adminEditForm_name', 'Nile Arena Pro'); a.fill('#adminEditForm_price', '175'); a.click('#adminEditForm button[type=submit]')
    until(a, "!!document.querySelector('#adminEditForm .form-msg.ok')"); ok('admin edits an owner stadium (UI)', 'Nile Arena Pro' in a.inner_text('#adminStadiums') and a.input_value('#adminStadiums tr:has-text("Nile Arena Pro") [data-price]') == '175')
    a.click('#adminEdit [data-adel] >> nth=0'); until(a, "document.querySelectorAll('#adminEdit .thumb').length===1"); ok('admin removes a photo (UI)', True)
    a.fill('#clabel', 'To replace'); a.click('#codeForm button[type=submit]'); a.wait_for_selector('#codesActive tbody tr'); old = a.inner_text('#codeText').strip()
    a.click('#codesActive tbody tr:has-text("To replace") [data-replace]'); until(a, "document.getElementById('codeText').innerText.trim()!=='%s'" % old); ok('admin issues replacement code', a.inner_text('#codeText').strip() != old and 'Replacement' not in '' )
    # --- إنجليزي + تمرير فحص عدم وجود عربي ---
    ctx_en = b.new_context(viewport={'width': 1280, 'height': 900})   # جلسة زائر (بدون تسجيل دخول) حتى لا يحوّلنا للوحة
    for path in ['owner-register.html', 'owner-login.html']:
        e = ctx_en.new_page(); e.goto(BASE + path); e.evaluate("localStorage.setItem('3alm_lang','en')"); e.reload(); e.wait_for_selector('form'); e.wait_for_timeout(300)
        left = e.evaluate(LEFT); ok('EN %s fully translated' % path, not left, left); e.close()
    pg.evaluate("localStorage.setItem('3alm_lang','en')"); pg.goto(BASE + 'owner-dashboard.html'); pg.wait_for_selector('#editForm'); pg.wait_for_selector('#ownBookings table'); pg.wait_for_timeout(300)
    left = pg.evaluate(LEFT); ok('EN owner-dashboard fully translated', not left, left)
    a.evaluate("localStorage.setItem('3alm_lang','en')"); a.goto(BASE + 'admin.html'); a.wait_for_selector('#codesUsed table'); a.click('#adminStadiums tr:has-text("Nile Arena") [data-edit]'); a.wait_for_selector('#adminEditForm'); a.wait_for_timeout(400)
    left = a.evaluate(LEFT); ok('EN admin (codes/owners) fully translated', not left, left)
    a.screenshot(path='/home/claude/en_admin_codes.png', full_page=True)
    pg.screenshot(path='/home/claude/en_owner.png', full_page=True)
    # --- موبايل ---
    m = b.new_context(viewport={'width': 390, 'height': 800}).new_page()
    for path in ['owner-register.html', 'owner-login.html']:
        m.goto(BASE + path); m.wait_for_timeout(250); ok('mobile no horizontal overflow: ' + path, m.evaluate('document.documentElement.scrollWidth') <= 392)
    m.goto(BASE + 'owner-register.html'); m.screenshot(path='/home/claude/m_owner_reg.png')
    ok('no JS errors', not errs, errs[:3]); b.close()
finally:
    srv.terminate(); shutil.rmtree(DATA, ignore_errors=True)
print('\n%d / %d passed' % (sum(res), len(res))); sys.exit(0 if all(res) else 1)
