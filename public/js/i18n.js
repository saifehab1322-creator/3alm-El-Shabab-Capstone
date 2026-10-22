/* عربي / إنجليزي: العربية هي اللغة الأصلية للنصوص، والإنجليزية تُطبَّق بترجمة النصوص وقت التحميل (والمحتوى الديناميكي عبر MutationObserver).
   لإضافة نص جديد: اكتب النص بالعربية في الصفحة ثم أضف ترجمته في القاموس D أدناه. يتغير اتجاه الصفحة تلقائيًا (RTL/LTR). */
(function () {
  const lang = localStorage.getItem('3alm_lang') === 'en' ? 'en' : 'ar';
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  window.I18N = { lang, set(l) { localStorage.setItem('3alm_lang', l); location.reload(); }, t: s => s };
  if (lang === 'ar') return;

  const D = {
    // --- التنقل والعام ---
    'منصة حجز ملاعب سوهاج': 'Sohag Stadium Booking', 'القائمة': 'Menu', 'المزيد': 'More', 'الحساب': 'Account', 'الرئيسية': 'Home', 'الملاعب': 'Stadiums',
    'الحجز': 'Booking', 'حجوزاتي': 'My bookings', 'حسابي': 'My account', 'تسجيل الدخول': 'Log in', 'تسجيل الخروج': 'Log out', 'دخول': 'Log in',
    'إنشاء حساب': 'Sign up', 'تواصل': 'Contact', 'عنا': 'About', 'لوحة التحكم': 'Admin dashboard', 'الوضع النهاري': 'Light mode', 'الوضع الليلي': 'Dark mode',
    'مسؤول الموقع': 'Site admin', 'تواصل معنا': 'Contact us', 'من نحن': 'About us', 'إغلاق': 'Close',
    // --- الرئيسية ---
    'احجز ملعبك في دقيقة': 'Book your pitch in a minute', 'ابحث عن ملعبك': 'Find your pitch', 'واحجز الآن': 'and book now',
    'قارن الأسعار، شاهد المواعيد المتاحة، وأكّد حجزك أونلاين. ملاعب في سوهاج بكل الأحجام والأنواع.': 'Compare prices, see available times and confirm your booking online. Pitches in Sohag of every size and type.',
    'ابحث باسم الملعب أو الموقع (مثال: سوهاج)': 'Search by stadium name or location (e.g. Sohag)', 'بحث عن ملعب': 'Search for a stadium', 'نوع الملعب': 'Stadium type',
    'كل الأنواع': 'All types', 'بحث': 'Search', 'ابحث': 'Search', 'نتائج البحث': 'Search results', 'مسح البحث': 'Clear search', 'عرض كل الملاعب': 'View all stadiums',
    'الأعلى تقييمًا': 'Highest-rated stadiums', 'كل الملاعب': 'All stadiums', 'كيف تحجز؟': 'How to book', 'ابحث': 'Search', 'اختر الموعد': 'Pick a time', 'أكّد الحجز': 'Confirm',
    'اكتب اسم الملعب أو المنطقة، أو تصفّح كل الملاعب حسب النوع.': 'Type a stadium name or area, or browse all stadiums by type.',
    'المواعيد المحجوزة تظهر معطّلة، فتختار فقط من المتاح.': 'Booked times appear disabled, so you can only pick what is available.',
    'تصلك رسالة تأكيد برقم الحجز، وتجد حجوزاتك في صفحة «حجوزاتي».': 'You get a confirmation with your booking number, and find your bookings on the “My bookings” page.',
    'ملاعب متاحة على المنصة': 'Stadiums on the platform', 'حجز مؤكد': 'Confirmed bookings', 'لاعب مسجّل': 'Registered players', 'للساعة': 'per hour', 'ملاعب': 'Stadiums', 'هذا الفلتر': 'this filter',
    // --- الملاعب والبطاقات والتفاصيل ---
    'اختر': 'Choose', 'ملعبك': 'your pitch', 'أفضل الملاعب المتاحة للحجز — قارن الأسعار واحجز مباشرة.': 'The best stadiums available — compare prices and book directly.',
    'متاح للحجز': 'Available', 'متاح': 'Available', 'محجوز بالكامل': 'Fully booked', 'مكتمل اليوم': 'Full today', 'محجوز': 'Booked', 'غير متاح': 'Unavailable', 'التفاصيل': 'Details',
    'احجز الآن': 'Book now', 'لكل ساعة': 'per hour', 'ساعة': 'hour', '● متاح للحجز': '● Available', '● محجوز بالكامل': '● Fully booked',
    'النوع': 'Type', 'اللاعبون': 'Players', 'التقييم': 'Rating', 'ساعات العمل': 'Opening hours', 'نوع الأرض': 'Surface', 'المساحة': 'Size', 'الإلغاء': 'Cancellation',
    'عشب صناعي': 'Artificial turf', 'عشب صناعي ممتاز': 'Premium artificial turf', 'عشب طبيعي': 'Natural grass', 'أرضية مغلقة': 'Indoor floor',
    'ملعب 11 لاعب بإضاءة كاملة وموقف سيارات وغرف استحمام.': 'Full-size 11-a-side pitch with floodlights, parking and showers.',
    'ملعب خماسي مضاء مع كافيه بجانب الملعب.': '5-a-side floodlit pitch with a café next to it.',
    'ملعب مميز في وسط المدينة مع صالة VIP وموقف سيارات.': 'Premium pitch in the city center with a VIP lounge and parking.',
    'ملعب مغطى ومكيّف داخل مجمع رياضي، مناسب لكل الفصول.': 'Covered, air-conditioned pitch in a sports complex, suitable all year round.',
    'ملعب سباعي بأسعار مخفضة لمباريات المساء.': '7-a-side pitch with discounted rates for evening matches.',
    'ملعب 11 لاعب بعشب طبيعي. محجوز بالكامل حاليًا.': '11-a-side natural grass pitch. Currently fully booked.',
    'لا توجد ملاعب مطابقة. جرّب تغيير كلمات البحث أو الفلتر.': 'No matching stadiums. Try changing your search words or filter.', 'إعادة ضبط': 'Reset',
    // --- الحجز ---
    'احجز ملعبك': 'Book your pitch', 'اختر الملعب': 'Choose a stadium', '— اختر الملعب —': '— Choose a stadium —', 'الملعب': 'Stadium', '(محجوز بالكامل)': '(fully booked)',
    'التاريخ والمدة': 'Date and duration', 'التاريخ': 'Date', 'المدة': 'Duration', 'بيانات الحجز': 'Booking details', 'الاسم': 'Name', 'رقم الموبايل': 'Mobile number', 'الموبايل': 'Mobile',
    'ملاحظات (اختياري)': 'Notes (optional)', 'اختر الملعب أولًا لعرض المواعيد المتاحة.': 'Choose a stadium first to see the available times.',
    'الخيارات المعطّلة محجوزة أو انتهى وقتها': 'Disabled options are booked or already passed', 'ملخص الحجز': 'Booking summary', 'الموقع': 'Location', 'الموعد': 'Time',
    'الإجمالي': 'Total', 'تأكيد الحجز': 'Confirm booking', 'تم تأكيد حجزك': 'Your booking is confirmed', 'رقم الحجز': 'Booking no.', 'حجز آخر': 'Book another',
    'اختر موعدًا متاحًا': 'Pick an available time', 'اختر التاريخ': 'Pick a date',
    // --- حجوزاتي ---
    'الكل': 'All', 'القادمة': 'Upcoming', 'السابقة': 'Past', 'الملغية': 'Cancelled', 'السعر': 'Price', 'الحالة': 'Status', 'مؤكد': 'Confirmed', 'منتهي': 'Completed', 'ملغي': 'Cancelled',
    'إلغاء': 'Cancel', 'تراجع': 'Back', 'إلغاء الحجز؟': 'Cancel this booking?', 'نعم، ألغِ الحجز': 'Yes, cancel booking', 'تصفّح الملاعب': 'Browse stadiums',
    'لا توجد حجوزات بعد. احجز ملعبك الأول الآن!': 'No bookings yet. Book your first pitch now!', 'لا توجد حجوزات في هذا القسم.': 'No bookings in this section.',
    // --- الدخول والتسجيل والحساب ---
    'دخول': 'Log in', 'البريد الإلكتروني': 'Email', 'البريد': 'Email', 'كلمة المرور': 'Password', 'ليس لديك حساب؟': "Don't have an account?", 'أنشئ حسابًا': 'Sign up',
    'لديك حساب بالفعل؟': 'Already have an account?', 'سجّل الدخول': 'Log in', 'إنشاء الحساب': 'Create account', 'إنشاء حساب جديد': 'Create a new account', 'الاسم الكامل': 'Full name',
    'مثال: أحمد محمد': 'e.g. Ahmed Mohamed', 'تأكيد كلمة المرور': 'Confirm password', '8 أحرف على الأقل، وبها حرف كبير وحرف صغير ورقم.': 'At least 8 characters, with an uppercase letter, a lowercase letter and a number.',
    'نسخة تجريبية: الحسابات محفوظة داخل هذا المتصفح فقط، وليست نظام مصادقة آمنًا.': 'Demo version: accounts are stored in this browser only and are not a secure authentication system.',
    'نسخة تجريبية: الحسابات محفوظة داخل هذا المتصفح فقط، وليست نظام مصادقة آمنًا. لاستخدام حقيقي يلزم خادم وقاعدة بيانات.': 'Demo version: accounts are stored in this browser only and are not a secure authentication system. A real deployment needs a server and database.',
    'البيانات الشخصية': 'Personal details', 'حفظ التغييرات': 'Save changes', 'تغيير كلمة المرور': 'Change password', 'كلمة المرور الحالية': 'Current password', 'كلمة المرور الجديدة': 'New password',
    'تأكيد الجديدة': 'Confirm new', 'تحديث كلمة المرور': 'Update password', 'تم حفظ التغييرات': 'Changes saved', 'تم تحديث كلمة المرور': 'Password updated',
    'غير مصرّح': 'Not authorized', 'هذه الصفحة للمسؤولين فقط.': 'This page is for administrators only.', 'العودة للرئيسية': 'Back to home',
    // --- التواصل ---
    'لأي استفسار عن الحجز أو إضافة ملعبك للمنصة، راسلنا وسنرد في أقرب وقت.': 'For any question about booking, or to add your stadium to the platform, write to us and we will reply soon.',
    'الموضوع': 'Subject', 'الرسالة': 'Message', 'إرسال الرسالة': 'Send message',
    'ملاحظة للمطوّر: لا توجد خدمة بريد مربوطة بعد، لذا تُحفظ الرسائل داخل المتصفح وتظهر في لوحة التحكم فقط. ضع رابط خدمة (مثل Formspree) في CONFIG.contactEndpoint داخل js/data.js لتصل إلى بريدك.':
      'Developer note: no email service is connected yet, so messages are saved in the browser and only appear in the admin dashboard. Put a service URL (e.g. Formspree) in CONFIG.contactEndpoint inside js/data.js to receive them by email.',
    'تم إرسال رسالتك بنجاح، شكرًا لتواصلك معنا': 'Your message was sent successfully. Thank you for contacting us.', 'تعذّر إرسال الرسالة، حاول مرة أخرى لاحقًا': 'Could not send the message, please try again later.',
    // --- من نحن ---
    'الملعب المناسب': 'The right pitch', 'في الوقت المناسب': 'at the right time',
    '3ALM ELSHABAB منصة لحجز ملاعب كرة القدم في سوهاج أونلاين. هدفنا أن توفّر على اللاعبين مكالمات الاستفسار وتعارض المواعيد، وأن تمنح أصحاب الملاعب جدول حجوزات واضحًا ومنظمًا.':
      '3ALM ELSHABAB is an online platform for booking football pitches in Sohag. Our goal is to save players the inquiry calls and schedule clashes, and to give pitch owners a clear, organized booking schedule.',
    'ماذا تقدّم المنصة؟': 'What does the platform offer?', 'ابحث عن الملاعب': 'Find stadiums', 'قارن الأسعار': 'Compare prices', 'اعرف المواعيد واحجز': 'See times and book',
    'ابحث بالاسم أو الموقع وتصفّح الملاعب حسب النوع: 11 لاعب، 7، خماسي، أو مغطّى.': 'Search by name or location and browse stadiums by type: 11-a-side, 7-a-side, 5-a-side or indoor.',
    'سعر الساعة وتقييم وتجهيزات كل ملعب في مكان واحد، لتختار ما يناسب ميزانية فريقك.': 'Each stadium’s hourly price, rating and facilities in one place, so you pick what fits your team’s budget.',
    'تعرف المواعيد المتاحة فورًا، وتحجز أونلاين بدون تعارض مع حجز آخر.': 'See available times instantly and book online without clashing with another booking.',
    'جاهز للمباراة؟': 'Ready for the match?',
    // --- لوحة التحكم ---
    'كل الأرقام محسوبة من بيانات الحجوزات والمستخدمين المحفوظة في هذا المتصفح.': 'All figures are calculated from the bookings and users data saved in this browser.',
    'أقسام لوحة التحكم': 'Dashboard sections', 'نظرة عامة': 'Overview', 'الحجوزات': 'Bookings', 'المستخدمون': 'Users', 'الرسائل': 'Messages', 'رسائل التواصل': 'Contact messages',
    'إجمالي الحجوزات': 'Total bookings', 'حجوزات مؤكدة': 'Confirmed bookings', 'حجوزات ملغية': 'Cancelled bookings', 'قيمة الحجوزات المؤكدة': 'Value of confirmed bookings',
    'مستخدمون مسجّلون': 'Registered users', 'رسائل تواصل': 'Contact messages', 'العميل': 'Customer', 'السعر/ساعة': 'Price/hour', 'نعم': 'Yes', 'الدور': 'Role', 'تاريخ التسجيل': 'Registered on',
    'عدد الحجوزات': 'Bookings', 'مسؤول': 'Admin', 'مستخدم': 'User', 'حذف': 'Delete', 'لا توجد رسائل.': 'No messages.', 'لا توجد حجوزات بعد.': 'No bookings yet.', 'لا يوجد مستخدمون.': 'No users.',
    'تم التحديث': 'Updated', 'تم تحديث السعر': 'Price updated', 'أدخل سعرًا صحيحًا': 'Enter a valid price', 'إلغاء هذا الحجز؟': 'Cancel this booking?', 'حذف هذه الرسالة؟': 'Delete this message?', 'سعر': 'Price of',
    // --- الرسائل والتحقق ---
    'هذا الحقل مطلوب': 'This field is required', 'صيغة البريد الإلكتروني غير صحيحة': 'Invalid email format',
    'أدخل رقم موبايل مصري صحيح (مثال: 01012345678)': 'Enter a valid Egyptian mobile number (e.g. 01012345678)',
    'كلمة المرور 8 أحرف على الأقل وتحتوي على حرف كبير وحرف صغير ورقم': 'Password must be at least 8 characters with an uppercase letter, a lowercase letter and a number',
    'كلمتا المرور غير متطابقتين': 'Passwords do not match', 'يرجى تصحيح الحقول المحددة': 'Please fix the highlighted fields',
    'يرجى تصحيح الحقول المحددة قبل تأكيد الحجز': 'Please fix the highlighted fields before confirming', 'تم تسجيل الدخول بنجاح، جارٍ التحويل...': 'Logged in successfully, redirecting...',
    'تم إنشاء الحساب بنجاح، جارٍ التحويل...': 'Account created successfully, redirecting...', 'البريد الإلكتروني أو كلمة المرور غير صحيحة': 'Incorrect email or password',
    'هذا البريد الإلكتروني مسجّل بالفعل': 'This email is already registered', 'كلمة المرور الحالية غير صحيحة': 'Current password is incorrect',
    'عذرًا، تم حجز هذا الموعد للتو. اختر موعدًا آخر': 'Sorry, this time was just booked. Please choose another time', 'هذا الملعب غير متاح للحجز حاليًا': 'This stadium is not available for booking right now',
    'الموعد خارج ساعات عمل الملعب': 'This time is outside the stadium’s opening hours', 'لا يمكن حجز موعد في الماضي': 'You cannot book a time in the past', 'الحجز غير موجود': 'Booking not found',
    'الحجز ملغي بالفعل': 'This booking is already cancelled', 'انتهى موعد الحجز': 'The booking time has passed', 'لا تملك صلاحية إلغاء هذا الحجز': 'You do not have permission to cancel this booking',
    'تم إلغاء الحجز': 'Booking cancelled', 'تم تأكيد الحجز': 'Booking confirmed',
    // --- أصحاب الملاعب: تسجيل ودخول ---
    'أصحاب الملاعب': 'Stadium owners', 'تسجيل صاحب ملعب': 'Stadium owner sign-up', 'دخول أصحاب الملاعب': 'Stadium owner login', 'لوحة صاحب الملعب': 'Owner dashboard',
    'التسجيل متاح فقط لأصحاب الملاعب الحاصلين على كود تفعيل من إدارة المنصة. ليس لديك كود؟': 'Sign-up is only available to stadium owners who hold an activation code issued by the platform. Don’t have a code?',
    'وسنراجع بياناتك ونرسل لك الكود.': 'and we will review your details and send you the code.',
    'الاسم الكامل لصاحب الملعب': 'Owner full name', 'رقم الهاتف': 'Phone number', 'اسم الملعب': 'Stadium name', 'عنوان الملعب وموقعه': 'Stadium address and location', 'سوهاج، شارع ...': 'Sohag, ... St.',
    'كود تفعيل صاحب الملعب (Owner Activation Code)': 'Owner Activation Code', 'لديك حساب بالفعل؟': 'Already have an account?',
    'لديك كود تفعيل ولم تسجّل بعد؟': 'Have an activation code but not registered yet?', 'سجّل ملعبك': 'Register your stadium', 'لست صاحب ملعب؟': 'Not a stadium owner?', 'دخول المستخدمين': 'User login',
    'تم إنشاء حساب صاحب الملعب بنجاح، جارٍ التحويل...': 'Owner account created successfully, redirecting...', 'هذا الحساب ليس حساب صاحب ملعب': 'This account is not a stadium owner account',
    'هذه الصفحة لأصحاب الملاعب فقط.': 'This page is for stadium owners only.',
    // --- كود التفعيل (رسائل الخادم) ---
    'كود التفعيل غير صحيح': 'The activation code is incorrect', 'كود التفعيل مطلوب': 'The activation code is required', 'هذا الكود مستخدم بالفعل': 'This code has already been used',
    'تم إلغاء هذا الكود، تواصل مع إدارة المنصة': 'This code has been revoked, please contact the platform administration',
    'انتهت صلاحية هذا الكود، تواصل مع إدارة المنصة': 'This code has expired, please contact the platform administration',
    // --- لوحة صاحب الملعب ---
    'ملاعبي': 'My stadiums', 'حجوزات قادمة': 'Upcoming bookings', 'قيمة الحجوزات المؤكدة': 'Value of confirmed bookings', '+ إضافة ملعب': '+ Add stadium', 'إضافة ملعب جديد': 'Add a new stadium', 'إضافة': 'Add',
    'تمت إضافة الملعب': 'Stadium added', 'بيانات الملعب': 'Stadium details', 'ملعبك غير ظاهر للجمهور بعد. أكمل البيانات وفعّل «نشر الملعب» ثم احفظ.': 'Your stadium is not visible to the public yet. Complete the details, enable “Publish stadium”, then save.',
    'العنوان والموقع': 'Address and location', 'يفتح الساعة': 'Opens at', 'يغلق الساعة': 'Closes at', 'وصف الملعب': 'Stadium description', 'المميزات (افصل بينها بفاصلة)': 'Features (separate with commas)',
    'متاح للحجز': 'Open for booking', 'نشر الملعب للجمهور': 'Publish stadium to the public', 'حفظ بيانات الملعب': 'Save stadium details', 'تم حفظ بيانات الملعب': 'Stadium details saved',
    'صور الملعب': 'Stadium photos', 'لم تضف صورًا بعد.': 'No photos added yet.', '+ إضافة صور': '+ Add photos', 'حتى 8 صور. تُصغَّر الصورة تلقائيًا قبل الرفع، وتظهر كلها للزوار في معرض صور الملعب.': 'Up to 8 photos. Images are resized automatically before upload, and all of them are shown to visitors in the stadium photo gallery.', 'حتى 8 صور. تُصغَّر الصورة تلقائيًا قبل الرفع.': 'Up to 8 photos. Images are resized automatically before upload.',
    'جارٍ رفع الصورة...': 'Uploading photo...', 'حذف هذه الصورة؟': 'Delete this photo?', 'المواعيد المتاحة': 'Available times', 'ساعات العمل:': 'Opening hours:',
    'غيّرها من نموذج بيانات الملعب أعلاه.': 'Change them in the stadium details form above.', 'حجوزات ملاعبك': 'Your stadiums’ bookings', 'ملاحظات': 'Notes', 'العميل': 'Customer',
    // --- لوحة المسؤول: الأكواد ---
    'كل الأرقام محسوبة من بيانات قاعدة البيانات الفعلية.': 'All figures are calculated from the actual database.', 'أكواد أصحاب الملاعب': 'Owner activation codes', 'أصحاب الملاعب المسجلون': 'Registered stadium owners',
    'إنشاء كود تفعيل جديد': 'Create a new activation code', 'اسم صاحب الملعب / ملاحظة التحقق': 'Owner name / verification note', 'مثال: أحمد علي — تم التحقق هاتفيًا': 'e.g. Ahmed Ali — verified by phone',
    'مدة الصلاحية (بالأيام)': 'Validity (days)', 'إنشاء كود جديد': 'Create new code', 'أكواد لم تُستخدم بعد': 'Unused codes', 'أكواد مستخدمة': 'Used codes', 'أكواد ملغاة أو منتهية': 'Revoked or expired codes',
    'الكود': 'Code', 'لصالح / ملاحظة': 'For / note', 'تاريخ الإنشاء': 'Created', 'ينتهي في': 'Expires', 'غير مستخدم': 'Unused', 'تم استخدامه': 'Used', 'ملغى': 'Revoked', 'منتهي الصلاحية': 'Expired',
    'إلغاء الكود': 'Revoke code', 'كود بديل': 'Replacement code', 'الحساب الذي استخدمه': 'Account that used it', 'تاريخ الاستخدام': 'Used on', 'تم إصدار بديل': 'Replacement issued',
    'لا توجد أكواد غير مستخدمة.': 'No unused codes.', 'لا توجد أكواد مستخدمة بعد.': 'No used codes yet.', 'لا توجد أكواد ملغاة أو منتهية.': 'No revoked or expired codes.', 'لا يوجد أصحاب ملاعب مسجلون بعد.': 'No registered stadium owners yet.',
    'الهاتف': 'Phone', 'كود التفعيل': 'Activation code', 'صاحب الملعب': 'Stadium owner', 'المنصة': 'Platform', 'منشور': 'Published', 'أصحاب ملاعب': 'Stadium owners', 'أكواد غير مستخدمة': 'Unused codes',
    'تم إنشاء الكود': 'Code created', 'تم إنشاء الكود البديل': 'Replacement code created', 'نسخ الكود': 'Copy code', 'تم نسخ الكود': 'Code copied', 'حدّد الكود وانسخه يدويًا': 'Select the code and copy it manually', 'تم إلغاء الكود': 'Code revoked',
    'انسخ الكود الآن وسلّمه لصاحب الملعب بعد التحقق من بياناته. لن يظهر كاملًا مرة أخرى.': 'Copy the code now and hand it to the stadium owner after verifying their details. It will not be shown in full again.',
    'إلغاء هذا الكود؟ لن يمكن استخدامه بعد ذلك.': 'Revoke this code? It cannot be used afterwards.', 'إنشاء كود بديل؟ سيُلغى الكود القديم إن كان ما زال صالحًا.': 'Create a replacement code? The old code will be revoked if it is still valid.',
    'مدة الصلاحية من 1 إلى 90 يومًا': 'Validity must be from 1 to 90 days',
    'اكتب اسم صاحب الملعب أو ملاحظة التحقق (3 أحرف على الأقل)': 'Enter the owner name or a verification note (at least 3 characters)', 'لا يمكن تعديل كود مستخدم بالفعل': 'A code that has been used cannot be modified', 'الكود غير موجود': 'Code not found',
    // --- رسائل الخادم الأخرى ---
    'اسم الملعب من 3 إلى 80 حرفًا': 'Stadium name must be 3 to 80 characters', 'أدخل عنوان الملعب (3 إلى 120 حرفًا)': 'Enter the stadium address (3 to 120 characters)', 'نوع الملعب غير صحيح': 'Invalid stadium type',
    'أدخل سعرًا صحيحًا للساعة': 'Enter a valid hourly price', 'مواعيد العمل غير صحيحة (وقت الفتح يسبق وقت الإغلاق)': 'Invalid opening hours (opening time must be before closing time)', 'نوع الأرض طويل جدًا': 'Surface text is too long',
    'المساحة طويلة جدًا': 'Size text is too long', 'الوصف طويل جدًا (600 حرف كحد أقصى)': 'Description is too long (600 characters max)', 'المميزات: حتى 10 عناصر، كل عنصر حتى 30 حرفًا': 'Features: up to 10 items, each up to 30 characters',
    'محاولات كثيرة، حاول لاحقًا': 'Too many attempts, please try again later', 'محاولات كثيرة، حاول بعد بضع دقائق': 'Too many attempts, please try again in a few minutes', 'محاولات كثيرة، حاول بعد ساعة': 'Too many attempts, please try again in an hour',
    'نوع الطلب غير مدعوم': 'Unsupported request type', 'حجم الطلب كبير جدًا': 'Request is too large', 'بيانات غير صالحة': 'Invalid data', 'يجب تسجيل الدخول أولًا': 'You must log in first', 'ليست لديك صلاحية للوصول': 'You do not have permission to access this',
    'طلب غير مسموح': 'Request not allowed', 'حدث خطأ في الخادم': 'A server error occurred', 'غير موجود': 'Not found', 'الملعب غير موجود': 'Stadium not found', 'بيانات الموعد غير صحيحة': 'Invalid time details',
    'الملاحظات طويلة جدًا': 'Notes are too long', 'وصلت للحد الأقصى من الملاعب': 'You have reached the maximum number of stadiums', 'حدّد السعر قبل النشر': 'Set the price before publishing',
    'الصورة يجب أن تكون JPG أو PNG أو WEBP': 'The image must be JPG, PNG or WEBP', 'حجم الصورة كبير (الحد 1.8 ميجابايت)': 'Image is too large (limit 1.8 MB)', 'ملف الصورة غير صالح': 'Invalid image file', 'الصورة غير موجودة': 'Image not found',
    'الرسالة من 10 إلى 2000 حرف': 'The message must be 10 to 2000 characters', 'تعذّر الاتصال بالخادم': 'Could not reach the server', 'حدث خطأ، حاول مرة أخرى': 'Something went wrong, please try again',
    'تم إلغاء هذا الكود': 'This code was revoked', 'سعر الساعة': 'Hourly price', 'صاحب ملعب': 'Stadium owner',
    // --- المعرض، الإغلاقات، إلغاء المالك، إيقاف الحساب، تعديل المسؤول ---
    'الصورة السابقة': 'Previous photo', 'الصورة التالية': 'Next photo', 'جديد': 'New',
    'إغلاق فترة معيّنة (صيانة / حجز خاص / إجازة)': 'Block a specific period (maintenance / private event / holiday)',
    'الفترات المغلقة تظهر للزوار كمواعيد غير متاحة. لا يمكن إغلاق فترة بها حجز مؤكد؛ ألغِ الحجز أولًا.': 'Blocked periods appear to visitors as unavailable. A period with a confirmed booking cannot be blocked; cancel the booking first.',
    'السبب (اختياري)': 'Reason (optional)', 'من الساعة': 'From', 'إلى الساعة': 'To', 'اليوم كاملًا': 'Whole day', 'إغلاق هذه الفترة': 'Block this period', 'الفترات المغلقة القادمة': 'Upcoming blocked periods',
    'لا توجد فترات مغلقة.': 'No blocked periods.', 'الفترة': 'Period', 'السبب': 'Reason', 'مغلق': 'Closed', 'تم إغلاق الفترة': 'Period blocked', 'تم فتح الفترة': 'Period reopened',
    'ألغيته أنت': 'You cancelled it', 'ألغاه العميل': 'Cancelled by the customer', 'ألغته الإدارة': 'Cancelled by the administration', 'سبب الإلغاء (اختياري) — سيظهر للعميل': 'Cancellation reason (optional) — shown to the customer',
    'ألغاه صاحب الملعب': 'Cancelled by the stadium owner', 'ألغته إدارة المنصة': 'Cancelled by the platform administration',
    'وصلت للحد الأقصى من الفترات المغلقة': 'You have reached the maximum number of blocked periods', 'الفترة غير موجودة': 'Period not found', 'السبب طويل جدًا': 'The reason is too long',
    'اختر تاريخًا صحيحًا لا يسبق اليوم': 'Choose a valid date that is not before today', 'حدّد فترة صحيحة (من/إلى)': 'Select a valid period (from/to)',
    'يوجد حجز مؤكد في هذه الفترة؛ ألغِ الحجز أولًا ثم أغلق الفترة': 'There is a confirmed booking in this period; cancel the booking first, then block the period',
    'هذا الموعد غير متاح حاليًا (مغلق من صاحب الملعب)': 'This time is currently unavailable (closed by the stadium owner)',
    'نشط': 'Active', 'موقوف': 'Suspended', 'تفعيل الحساب': 'Reactivate account', 'إيقاف الحساب': 'Suspend account', 'تم إيقاف الحساب': 'Account suspended', 'تم تفعيل الحساب': 'Account reactivated',
    'إيقاف هذا الحساب؟ سيُسجَّل خروجه فورًا وتُخفى ملاعبه عن الجمهور.': 'Suspend this account? It will be logged out immediately and its stadiums hidden from the public.',
    'تعديل': 'Edit', 'تعديل بيانات الملعب': 'Edit stadium details', 'حسابات موقوفة': 'Suspended accounts', 'لا توجد صور.': 'No photos.',
    'تم إيقاف هذا الحساب، تواصل مع إدارة المنصة': 'This account has been suspended, please contact the platform administration', 'لا يمكن إيقاف حساب المسؤول': 'An administrator account cannot be suspended',
    'هذا الحساب غير موجود': 'Account not found', 'لا توجد بيانات للتحديث': 'No data to update',
    'تظهر كلها للزوار في معرض صور الملعب': 'all shown to visitors in the stadium photo gallery'
  };

  const AR = /[\u0600-\u06FF]/, L = '\\u0621-\\u064A\\u064B-\\u0652';
  const one = n => n == 1 ? '1 hour' : n + ' hours';
  const PAT = [ // قواعد للنصوص التي تحمل أرقامًا
    [/نتائج البحث \((\d+)\)/g, 'Search results ($1)'],
    [/لا توجد ملاعب تطابق «(.*?)». جرّب اسمًا أو منطقة أخرى\./g, 'No stadiums match “$1”. Try another name or area.'],
    [/متبقي (\d+) مواعيد اليوم/g, '$1 times left today'],
    [/حتى (\d+) لاعب/g, 'Up to $1 players'], [/(\d+) لاعب(?![\u0621-\u064A])/g, '$1 players'],
    [/(\d+) حجز(?![\u0621-\u064A])/g, '$1 bookings'], [/\((\d+)س\)/g, '($1h)'],
    [/مجاني قبل (\d+) ساعة/g, 'Free up to $1 hours before'],
    [/الإلغاء متاح قبل الموعد بـ ?(\d+) ساعة على الأقل/g, 'Cancellation is allowed at least $1 hours before the booking'],
    [/(\d+) ساعة(?![\u0621-\u064A])/g, (m, n) => one(+n)],
    [/يجب ألا يقل عن (\d+) أحرف/g, 'Must be at least $1 characters'],
    [/عدد حجوزاتك: (\d+) — المؤكدة: (\d+)/g, 'Your bookings: $1 — Confirmed: $2'],
    [/^(\s*)من (\d+)/g, '$1From $2'], [/× (\d+) م(?![\u0621-\u064A])/g, '× $1 m'], [/(\d+) م(?![\u0621-\u064A])/g, '$1 m'],
    [/الحد الأقصى (\d+) صور/g, 'Maximum $1 photos'], [/لا يمكن الحجز لأكثر من (\d+) يومًا قادمة/g, 'You cannot book more than $1 days ahead'],
    [/ينتهي في /g, 'Expires '], [/ساعات العمل: /g, 'Opening hours: '],
    [/الإجمالي: /g, 'Total: ']
  ];
  const PH = Object.keys(D).sort((a, b) => b.length - a.length).map(k => [new RegExp('(?<![' + L + '])' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![' + L + '])', 'g'), D[k]]);
  function tr(s) {
    if (!AR.test(s)) return s;
    const t = s.trim(); if (D[t]) return s.replace(t, D[t]);
    let o = s; PAT.forEach(p => { o = o.replace(p[0], p[1]); }); PH.forEach(p => { o = o.replace(p[0], p[1]); });
    return o;
  }
  window.I18N.t = tr;

  const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
  let busy = false;
  const skip = n => { const e = n.nodeType === 1 ? n : n.parentElement; return !e || e.closest('[data-no-i18n],script,style,textarea'); };
  function node(n) {
    if (n.nodeType === 3) { if (!skip(n) && AR.test(n.nodeValue)) n.nodeValue = tr(n.nodeValue); return; }
    if (n.nodeType !== 1 || skip(n)) return;
    ATTRS.forEach(a => { const v = n.getAttribute && n.getAttribute(a); if (v && AR.test(v)) n.setAttribute(a, tr(v)); });
    n.childNodes.forEach(node);
  }
  const mo = new MutationObserver(list => {
    if (busy) return; busy = true;
    list.forEach(m => {
      if (m.type === 'childList') m.addedNodes.forEach(node);
      else if (m.type === 'characterData') node(m.target);
      else if (m.type === 'attributes') node(m.target);
    });
    mo.takeRecords(); busy = false;
  });
  function start() {
    document.title = tr(document.title); node(document.body);
    mo.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
