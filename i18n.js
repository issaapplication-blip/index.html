/* ==========================================================
   RAFIQ | rafiQ - language engine, ALL FIVE LANGUAGES, ONE FILE.

   This file is generated. Edit js/i18n.js or js/locales/*.js and
   rebuild with:  powershell -File _tools/build-single-file.ps1
   Do not edit below this line by hand.

   It lives at the site root because the live index.html already
   loads /i18n.js - so no page needed changing to use it.

   Order below matters: the engine must define RAFIQ_I18N before
   the bundles call RAFIQ_I18N.register().
   ========================================================== */

/* ---------- the engine ---------- */
/* ==========================================================
   RAFIQ | رفيق — language engine
   ------------------------------------------------------------
   One button at the top-left of every page, five languages.

   Design rules, in order of importance:
     1. Never show a blank string. Anything with no translation
        falls back to the Arabic text already in the page.
     2. Never break the layout. Long Latin words wrap instead of
        overflowing, and the page stays readable at 320px.
     3. Remember the choice, and set <html lang> and <html dir>
        so screen readers and the browser agree with what is shown.

   Translations live in js/locales/<lang>.js and are keyed. A page
   marks its text with data-i18n="key"; the engine fills it in.
   ========================================================== */

/* Cache-buster. install-app.js defines RAFIQ_VERSION, but the language
   engine must work on pages that never load it, so we fall back. */
if (typeof globalThis.RAFIQ_VERSION === 'undefined') globalThis.RAFIQ_VERSION = '72';

const RAFIQ_I18N = (function () {
  'use strict';

  var LANGS = [
    { code: 'ar', label: 'العربية',  flag: '🇱🇧', dir: 'rtl' },
    { code: 'en', label: 'English',  flag: '🇬🇧', dir: 'ltr' },
    { code: 'fr', label: 'Français', flag: '🇫🇷', dir: 'ltr' },
    { code: 'it', label: 'Italiano', flag: '🇮🇹', dir: 'ltr' },
    { code: 'de', label: 'Deutsch', flag: '🇩🇪', dir: 'ltr' }
  ];

  var DEFAULT = 'ar';
  var KEY = 'rafiq.lang';
  var bundles = {};      // code -> { key: text }
  var current = DEFAULT;

  function langMeta(code) {
    for (var i = 0; i < LANGS.length; i++) if (LANGS[i].code === code) return LANGS[i];
    return LANGS[0];
  }

  function isKnown(code) {
    for (var i = 0; i < LANGS.length; i++) if (LANGS[i].code === code) return true;
    return false;
  }

  function read() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function write(code) {
    try { localStorage.setItem(KEY, code); } catch (e) { /* private mode */ }
  }

  /* ---------- which language does this visitor actually read? ----------

     A member who opens the site on a phone set to French should not
     have to hunt for the button. On the very first visit the browser's
     own language list decides, and the answer is remembered from then
     on so the site never flip-flops between visits.

     The whole list is walked, not just the first entry. A phone set to
     Spanish with English listed second gets English, which is a
     language that person actually reads; dropping them into Arabic
     instead would be worse. Only when nothing in the list is
     supported does it fall back to Arabic, the source language. */
  var detected = null;

  function detect() {
    var list = [];
    try {
      if (navigator.languages && navigator.languages.length) {
        list = Array.prototype.slice.call(navigator.languages);
      }
    } catch (e) { /* older browser */ }
    try { if (navigator.language) list.push(navigator.language); } catch (e) {}

    for (var i = 0; i < list.length; i++) {
      var raw = String(list[i] || '').toLowerCase().replace(/_/g, '-');
      if (!raw) continue;
      // "fr-CA" -> "fr"; an exact match on the full tag wins first
      if (isKnown(raw)) { detected = raw; return raw; }
      var base = raw.split('-')[0];
      if (isKnown(base)) { detected = base; return base; }
    }
    return DEFAULT;
  }

  function loadScript(code) {
    if (bundles[code]) return Promise.resolve(bundles[code]);
    return new Promise(function (resolve) {
      var s = document.createElement('script');
      s.src = '/js/locales/' + code + '.js?v=' + RAFIQ_VERSION;
      s.async = true;
      s.onload = function () {
        resolve(bundles[code] || null);
      };
      s.onerror = function () {
        resolve(null);          // a missing translation is not a crash
      };
      document.head.appendChild(s);
    });
  }

  /* Register a bundle: called by every js/locales/<lang>.js file */
  function register(code, dict) {
    bundles[code] = dict || {};
  }

  function translate(key, lang) {
    var d = bundles[lang || current];
    if (d && Object.prototype.hasOwnProperty.call(d, key)) return d[key];
    return null;
  }

  /* Apply a language to the current page */
  function apply(code, opts) {
    opts = opts || {};
    // an unknown code must never blank the page: fall back to the source
    if (!isKnown(code)) code = DEFAULT;
    current = code;
    write(code);

    var m = langMeta(code);
    document.documentElement.setAttribute('lang', code);
    document.documentElement.setAttribute('dir', m.dir);
    document.documentElement.classList.toggle('ra-ltr', m.dir === 'ltr');

    // a translated <title> when we have one
    var titleKey = document.body.getAttribute('data-i18n-title');
    var t = titleKey ? translate(titleKey, code) : null;
    if (t) document.title = t;

    // fill every marked string; anything without a translation keeps
    // whatever the page already had, which is the Arabic original
    var marked = document.querySelectorAll('[data-i18n]');
    var filled = 0, missing = 0;
    for (var i = 0; i < marked.length; i++) {
      var el = marked[i];
      var key = el.getAttribute('data-i18n');
      var val = translate(key, code);
      if (val !== null && val !== '') { el.textContent = val; filled++; }
      else { missing++; }
    }

    // placeholder attributes, so inputs are never in the wrong language
    var ph = document.querySelectorAll('[data-i18n-placeholder]');
    for (var j = 0; j < ph.length; j++) {
      var p = translate(ph[j].getAttribute('data-i18n-placeholder'), code);
      if (p) ph[j].setAttribute('placeholder', p);
    }

    // aria-labels
    var al = document.querySelectorAll('[data-i18n-aria]');
    for (var k = 0; k < al.length; k++) {
      var a = translate(al[k].getAttribute('data-i18n-aria'), code);
      if (a) al[k].setAttribute('aria-label', a);
    }

    // tell the page - and anything that renders its own text, such as the
    // install hint - that the language just changed
    document.dispatchEvent(new CustomEvent('rafiq:i18n', {
      detail: { lang: code, dir: m.dir, filled: filled, missing: missing }
    }));
    if (!opts.silent) showBanner(code, missing, filled);
    return { lang: code, dir: m.dir, filled: filled, missing: missing };
  }

  /* How much of the visible page is still Arabic?
     Counting missing keys is not enough: a page can have every shared
     label translated and still be almost entirely Arabic. So measure the
     Arabic text that is actually on screen, ignoring the language menu
     itself (which always shows each language in its own language) and
     anything not rendered, such as the contents of a <template>.

     Returns both the Arabic count and the total, because what matters is
     the share of the page, not an absolute number: a 260-character page
     that is entirely Arabic needs the notice just as much as a long one. */
  var ARABIC = /[؀-ۿݐ-ݿ]/;
  function arabicShare() {
    var root = document.querySelector('main') || document.body;
    if (!root) return { arabic: 0, total: 0, ratio: 0 };

    var arabic = 0, total = 0;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        var s = node.nodeValue;
        if (!s || !s.trim()) return NodeFilter.FILTER_REJECT;
        var el = node.parentElement;
        if (!el || el.closest('.ra-lang, script, style')) return NodeFilter.FILTER_REJECT;
        if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var node;
    while ((node = walker.nextNode())) {
      var len = node.nodeValue.trim().length;
      total += len;
      if (ARABIC.test(node.nodeValue)) arabic += len;
    }
    return { arabic: arabic, total: total, ratio: total ? arabic / total : 0 };
  }

  function showBanner(code, missing, filled) {
    var old = document.querySelector('.ra-untranslated');
    if (old) old.remove();
    if (code === DEFAULT) return;              // Arabic is the source language

    // Internal tooling (admin, dashboard, barcode) and the error page are
    // used by the manager only. Putting "this page is still in Arabic" at
    // the top of a page nobody should be on would only advertise it, so
    // those pages opt out with data-rafiq-internal on <body>.
    if (document.body && document.body.hasAttribute('data-rafiq-internal')) return;

    // More than a tenth of the page still in Arabic means a visitor will
    // hit text they cannot read. A few stray labels do not.
    var share = arabicShare();
    var mostlyArabic = share.arabic > 40 && share.ratio > 0.10;
    if (!mostlyArabic && !missing) return;

    var b = document.createElement('p');
    b.className = 'ra-untranslated';
    b.textContent = translate(mostlyArabic ? 'notice.page' : 'notice.partial', code) ||
      (mostlyArabic
        ? 'The navigation is translated, but the text of this page is still in Arabic.'
        : 'Some sections on this page are still shown in Arabic.');
    var main = document.querySelector('main');
    (main || document.body).insertBefore(b, main ? main.firstChild : document.body.firstChild);
  }

  /* ---------------- the switcher button ---------------- */
  function buildButton() {
    if (document.querySelector('.ra-lang')) return;
    var meta = langMeta(current);

    // the bar spans the page; the inner group holds the button and the
    // menu hangs off the button, not off the far edge of the screen
    var bar = document.createElement('div');
    bar.className = 'ra-lang';

    var wrap = document.createElement('div');
    wrap.className = 'ra-lang-inner';
    wrap.style.cssText = 'position:relative;display:inline-block';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ra-lang-btn';
    btn.setAttribute('aria-haspopup', 'true');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Language / اللغة');
    btn.innerHTML =
      '<span class="gl">' + meta.flag + '</span>' +
      '<span class="lbl"></span>' +
      '<span aria-hidden="true">▾</span>';

    var menu = document.createElement('div');
    menu.className = 'ra-lang-menu';
    menu.hidden = true;

    LANGS.forEach(function (L) {
      var b = document.createElement('button');
      b.type = 'button';
      b.dataset.lang = L.code;
      b.innerHTML = '<span class="gl">' + L.flag + '</span>' +
                    '<span class="nm"></span>' +
                    '<span class="tick" aria-hidden="true">✓</span>';
      b.addEventListener('click', function () {
        close();
        setLanguage(L.code);
      });
      menu.appendChild(b);
    });

    var note = document.createElement('div');
    note.className = 'note';
    menu.appendChild(note);

    wrap.appendChild(btn);
    wrap.appendChild(menu);
    bar.appendChild(wrap);
    document.body.appendChild(bar);

    function open() {
      menu.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
    }
    function close() {
      menu.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
    }

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (menu.hidden) open(); else close();
    });
    // tapping anywhere else closes it, but a tap inside the menu is a
    // language choice, so stop it from reaching the document handler
    menu.addEventListener('click', function (e) { e.stopPropagation(); });
    document.addEventListener('click', function (e) {
      if (!bar.contains(e.target)) close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' || e.key === 'Esc') close();
    });

    paintButton(btn, menu, note, current);
  }

  function paintButton(btn, menu, note, code) {
    var m = langMeta(code);
    btn.querySelector('.gl').textContent = m.flag;
    var lbl = btn.querySelector('.lbl');
    // the button label is always in its own language, so it is never lost
    lbl.textContent = m.label;
    Array.prototype.forEach.call(menu.querySelectorAll('button'), function (b) {
      var L = langMeta(b.dataset.lang);
      b.querySelector('.nm').textContent = L.label;
      b.setAttribute('aria-current', String(b.dataset.lang === code));
      b.querySelector('.tick').style.visibility = b.dataset.lang === code ? 'visible' : 'hidden';
    });
    var nt = translate('lang.note', code);
    if (nt !== null) note.textContent = nt;
  }

  function setLanguage(code) {
    var run = function () {
      var r = apply(code);
      var w = document.querySelector('.ra-lang');
      if (w) paintButton(w.querySelector('.ra-lang-btn'), w.querySelector('.ra-lang-menu'),
                         w.querySelector('.note'), code);
      return r;
    };
    if (bundles[code] || code === DEFAULT) return run();
    return loadScript(code).then(function () { return run(); });
  }

  function start() {
    var saved = read();
    var auto = false;
    var want;
    if (saved && isKnown(saved)) {
      want = saved;                     // an explicit choice always wins
    } else {
      want = detect();                  // first visit: follow the browser
      auto = detected !== null;
      write(want);                      // and remember it from now on
    }
    buildButton();
    return loadScript(want).then(function () {
      var r = setLanguage(want);
      r.auto = auto;
      r.detected = detected;
      return r;
    });
  }

  return {
    start: start,
    setLanguage: setLanguage,
    apply: apply,
    register: register,
    translate: translate,
    langMeta: langMeta,
    isKnown: isKnown,
    detect: detect,
    LANGS: LANGS,
    get current() { return current; },
    get detected() { return detected; },
    version: '2'
  };
})();

if (typeof globalThis !== 'undefined') globalThis.RAFIQ_I18N = RAFIQ_I18N;
if (typeof module !== 'undefined' && module.exports) module.exports = RAFIQ_I18N;


/* ===================== bundled: %s ===================== */

/* RAFIQ — Arabic source bundle.
   Arabic is the original language, so this file records the source text and
   lets the engine fall back to it. Every key here is also the anchor that the
   other four languages translate from. */
(function () {
  var dict = {

    /* ---- language UI ---- */
    'lang.note': 'اختر اللغة — يتبدّل النص فوراً.',
    'notice.partial': 'بعض الأقسام في هذه الصفحة ما زالت بالعربية. نعمل على إكمالها.',
    'notice.page': 'القائمة مترجمة إلى لغتك، لكن نص هذه الصفحة ما زال بالعربية. نعمل على إكماله.',

    /* ---- install button: every message the button can show ---- */
    'install.steps.ios': 'اضغط زر المشاركة ⬆︎ في الأسفل ← "إضافة إلى الشاشة الرئيسية" ← "إضافة".',
    'install.steps.android': 'افتح قائمة المتصفح ⋮ ← "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية".',
    'install.steps.desktop': 'اضغط أيقونة التثبيت ⊕ في شريط عنوان المتصفح.',
    'install.ready': 'اضغط «تثبيت التطبيق» لإضافته إلى جهازك.',
    'install.done': 'تم التثبيت ✅ التطبيق الآن على شاشتك.',
    'install.https': 'التثبيت يحتاج اتصالاً آمناً (https). الموقع يعمل عادياً الآن.',
    'install.noButton': 'المتصفح لا يعرض زر التثبيت. ',
    'reason.installed': 'التطبيق مثبَّت بالفعل على هذا الجهاز.',
    'reason.https': 'التثبيت يحتاج رابطاً آمناً https — سيعمل الزر مباشرة عند فتحه.',
    'reason.noSW': 'هذا المتصفح لا يدعم تثبيت التطبيقات. افتح الموقع في Chrome.',
    'reason.noManifest': 'ملف التطبيق غير متاح على هذا الخادم بعد.',
    'reason.ios': 'على iPhone: زر المشاركة ⬆︎ ← "إضافة إلى الشاشة الرئيسية" ← "إضافة".',
    'reason.noPrompt': 'اضغط قائمة المتصفح ⋮ ← "تثبيت التطبيق". إن لم يظهر الخيار، أعد فتح الموقع من الرابط المباشر.',

    /* ---- home ---- */
    'home.title': "RAFIQ | رفيق — دليل المراكز الطبية المعتمدة في لبنان",
    'home.h1': 'رفيق | RAFIQ',
    'home.tagline': 'نصل بالحب والأمان لرعاية العائلة',
    'home.who': "دليل المراكز الطبية والعروض المعتمدة في لبنان.",
    'home.cta.main': "تصفح المراكز",
    'home.cta.main.sub': "الفئات والمناطق المعتمدة",
    'home.cta.wa': 'واتساب',
    'home.cta.wa.sub': "مراسلات يدوية",
    'home.cta.bot': "قناة Telegram",
    'home.cta.bot.sub': "الإعلانات المعتمدة",
    'home.install': '📲 تثبيت التطبيق',

    'home.pick.title': "اختر نوع الخدمة",
    'home.pick.1.t': "المختبرات الطبية",
    'home.pick.1.d': "مراكز التحاليل والفحوص الطبية المعتمدة.",
    'home.pick.2.t': "الأشعة والتصوير",
    'home.pick.2.d': "مراكز الأشعة والتصوير الطبي المعتمدة.",
    'home.pick.3.t': "العلاج الفيزيائي",
    'home.pick.3.d': "مراكز العلاج والتأهيل الفيزيائي.",
    'home.pick.4.t': "بيع المعدات الطبية",
    'home.pick.4.d': "مراكز بيع وتجهيز المعدات الطبية.",
    'home.pick.5.t': "تأجير المعدات الطبية",
    'home.pick.5.d': "مراكز تأجير المعدات الطبية.",
    'home.pick.6.t': 'المناطق',
    'home.pick.6.d': "طرابلس، الضنية، زغرتا، الكورة، البترون، بيروت، وباقي لبنان.",
    'home.pick.7.t': "دليل الاستخدام",
    'home.pick.7.d': "طريقة تصفح المراكز والعروض المعتمدة.",
    'home.pick.8.t': 'الأسئلة الشائعة',
    'home.pick.8.d': "إجابات حول الخدمات والخصومات المعتمدة.",

    'home.about.h': 'ما هي منصة رفيق؟',
    'home.about.lead': "RAFIQ | رفيق دليل لبناني للمراكز الطبية والخدمات المساندة والعروض التي تعتمدها الإدارة مسبقاً.",
    'home.about.1.h': 'ماذا نفعل؟',
    'home.about.1.d': "نعرض فئات الخدمات والمراكز التي تمت مراجعة بياناتها واعتمادها، مع توضيح قنوات التواصل الرسمية.",
    'home.about.2.h': 'لماذا عبر منصة؟',
    'home.about.2.d': "لا ننشر اسم مركز أو شعاراً أو إعلاناً أو خصماً قبل مراجعة الإدارة والموافقة عليه.",
    'home.about.3.h': 'ما الذي لا نفعله؟',
    'home.about.3.d': 'لا نشخّص، ولا نصف دواءً، ولا نعد بسعر مؤكّد أو بتوفّر مؤكّد، ولا نتعامل مع الأموال عبر المحادثة.',
    'home.about.4.h': "من يعتمد المعلومات والعروض؟",
    'home.about.4.d': "إدارة RAFIQ حصراً؛ لا يُنشر أي مركز أو عرض أو خصم دون موافقتها.",
    'home.about.steps.h': "كيف يعمل الدليل؟",
    'home.about.steps.1': "اختر نوع الخدمة والمنطقة.",
    'home.about.steps.2': "تصفح المراكز التي اعتمدتها إدارة RAFIQ فقط.",
    'home.about.steps.3': "راجع قيمة الخصم وشروطه المنشورة بعد اعتمادها.",
    'home.about.steps.4': "تواصل مع المركز مباشرة وادفع له عند تلقي الخدمة.",

    'home.svc.h': "فئات المراكز الطبية",
    'home.svc.1.h': "المختبرات الطبية",
    'home.svc.1.d': "مراكز التحاليل والفحوص الطبية التي اعتمدتها الإدارة.",
    'home.svc.2.h': "الأشعة والتصوير الطبي",
    'home.svc.2.d': "مراكز الأشعة والتصوير الطبي المعتمدة.",
    'home.svc.3.h': "العلاج الفيزيائي",
    'home.svc.3.d': "مراكز العلاج والتأهيل الفيزيائي المعتمدة.",
    'home.svc.4.h': "بيع المعدات الطبية",
    'home.svc.4.d': "مراكز بيع وتجهيز المعدات الطبية المعتمدة.",
    'home.svc.more': 'التفاصيل الكاملة في صفحة الخدمات.',
    'home.svc.5.h': "تأجير المعدات الطبية",
    'home.svc.5.d': "مراكز تأجير المعدات الطبية المعتمدة.",
    'home.svc.more.pre': "تصفح جميع الفئات في",
    'home.svc.more.link': "صفحة الخدمات",

    'home.roles.h': 'قاعدة أساسية تفرّق بين المهن',
    'home.roles.th1': 'من هو',
    'home.roles.th2': 'ماذا يقوم به',
    'home.roles.th3': 'متى تحتاجه',
    'home.roles.1': 'مقدّم الرعاية',
    'home.roles.1.d': 'النظافة، اللباس، الطعام، الحركة، المرافقة، الروتين اليومي',
    'home.roles.1.w': 'حين تكون الحاجة للرعاية اليومية فقط',
    'home.roles.2': 'ممرض/ة مجاز/ة',
    'home.roles.2.d': 'إجراءات طبية، متابعة أدوية، قياسات، تحويل جروح',
    'home.roles.2.w': 'حين تكون هناك حاجة تمريضية',
    'home.roles.3': 'معالج فيزيائي',
    'home.roles.3.d': 'تمارين حركية وإعادة تأهيل',
    'home.roles.3.w': 'بعد الجلطة أو الإصابة أو العملية',
    'home.roles.note': 'RAFIQ لا تشخّص ولا تصف دواءً ولا تغيّر علاج الطبيب. نحن ننظّم الطلب ونوجّهه للخدمة المناسبة.',

    'home.contact.h': '📲 التواصل',
    'home.contact.1.h': "المراسلات الرسمية",
    'home.contact.1.d': "للمراسلات الإدارية اليدوية عبر WhatsApp.",
    'home.contact.2.h': 'الطلب الإلكتروني',
    'home.contact.2.d': 'تعبئة النموذج أسهل وأسرع من الاتصال.',
    'home.contact.3.h': "المعلومات والشروط",
    'home.contact.3.d': "راجع الأسئلة الشائعة قبل التواصل مع المركز.",

    /* ---- shared / nav ---- */
    'nav.home': 'الرئيسية',
    'nav.homeBrand': 'RAFIQ الرئيسية',
    'nav.homePage': 'الصفحة الرئيسية',
    'nav.allRegions': 'كل المناطق',
    'nav.services': 'الخدمات',
    'nav.about': 'عن المنصة',
    'nav.faq': 'الأسئلة الشائعة',
    'nav.allServices': 'كل الخدمات',
    'nav.lebanon': '🇱🇧 كل لبنان',
    'nav.guide': 'الدليل',
    'nav.guideAlt': 'دليل الرعاية',
    'nav.regions': 'المناطق',
    'nav.agent': "مساعد رفيق",

    /* ---- services ---- */
    'services.title': 'خدمات RAFIQ | رعاية منزلية وتمريض منزلي في لبنان',
    'services.h1': 'خدمات RAFIQ',
    'services.tagline': 'ما نقدّمه اليوم، وما سيأتي قريبًا',
    'services.home.h': 'الرعاية المنزلية',
    'services.home.p': 'هذه هي الخدمات الأربع العاملة اليوم. كل طلب يمرّ على الإدارة قبل المطابقة.',
    'services.item.1.d': 'تنظيم طلبات الرعاية اليومية والليلية والمساعدة للأشخاص غير المستقلين: النظافة، اللباس، الطعام، الحركة، والمرافقة داخل المنزل.',
    'services.item.2.d': 'طلبات الرعاية المنزلية ومتابعة احتياجات الحالة وفق المعلومات المقدمة من الأسرة وتعليمات الطبيب.',
    'services.item.3.d': 'ربط طلبات التمريض بالممرضين والممرضات وفق الاختصاص والخبرة والموقع، للإجراءات ومتابعة الأدوية.',
    'services.item.4.d': 'تنظيم طلبات العلاج الفيزيائي وربطها بالمعالجين ضمن شبكة RAFIQ، بعد تقييم الحالة من الاختصاصي.',
    'services.soon.h': 'قريبًا على المنصة',
    'services.soon.p': 'هذه الخدمات قيد الإضافة. لا نَعِد بتوفّرها ولا بأسعارها قبل الاتفاق الرسمي.',
    'services.soon.badge': '⏳ انتظرونا قريبًا',
    'services.soon.1.h': 'أطباء من مختلف الاختصاصات',
    'services.soon.1.d': 'مع إمكانية التعاقد مع أطباء من جميع الاختصاصات ضمن توسع شبكة الخدمات.',
    'services.soon.2.h': 'اختصاصيو التغذية',
    'services.soon.2.d': 'ضمن تطوير شبكة الخدمات الصحية والمساندة في RAFIQ.',
    'services.soon.3.h': 'أطباء الأسنان',
    'services.soon.3.d': 'ضمن شبكة الخدمات الطبية المتخصصة في RAFIQ.',
    'services.soon.4.h': 'اختصاصيو النطق',
    'services.soon.4.d': 'ضمن تطوير شبكة الخدمات الصحية والمساندة في RAFIQ.',
    'services.soon.5.h': 'المعدات الطبية',
    'services.soon.5.d': 'موردو كراسي المتحركة والأسرة وأجهزة القياس المنزلي.',
    'services.barcode.h': '🎫 باركود المنصة',
    'services.barcode.p': 'لكل منتسب باركود خاص يوثّق نوع خدمته وأسعاره وخصوماته، ولكل جهة متعاقدة باركود خاص يُسجَّل به العمل المنجز.',
    'services.barcode.p2': 'يُسلَّم الباركود بعد توقيع الاتفاق، ويُفتح بمسح رمز QR أو من لوحة المدير — لا برابط عام على الموقع.',
    'services.barcode.note': 'لا يظهر أي رقم هاتف أو بيانات خاصة قبل توقيع الاتفاق وموافقة الإدارة.',

    /* ---- about ---- */
    'about.title': 'عن منصة RAFIQ | خصوصيتنا قبل كل شيء',
    'about.h1': 'عن منصة RAFIQ',
    'about.why.h': "كيف يعمل نموذج RAFIQ؟",
    'about.why.1.h': "مراكز بعد الاعتماد",
    'about.why.1.d': "نعرض فقط المراكز التي راجعت الإدارة بياناتها ووافقت على إدراجها.",
    'about.why.2.h': "عروض واضحة",
    'about.why.2.d': "تظهر قيمة الخصم وشروطه بعد مراجعتها والموافقة عليها صراحة.",
    'about.why.3.h': "مراجعة إدارية",
    'about.why.3.d': "قرار إدراج المركز أو الإعلان أو العرض يعود إلى إدارة RAFIQ وحدها.",
    'about.why.4.h': "الدفع مباشرة للمركز",
    'about.why.4.d': "يتواصل المستفيد مع المركز ويدفع له مباشرة؛ RAFIQ لا تستقبل أموال العملاء.",
    'about.privacy.h': "الاعتماد والخصوصية",
    'about.privacy.p': "لا ننشر بيانات مركز أو تفاصيل عرض أو خصم قبل مراجعتها وموافقة الإدارة. ولا نطلب عبر القنوات العامة معلومات طبية أو مستندات شخصية.",
    'about.privacy.1.h': "موافقة الإدارة أولاً",
    'about.privacy.1.d': "لا يُدرج مركز أو شعار أو خصم قبل مراجعة البيانات والموافقة المسبقة.",
    'about.privacy.2.h': "سجل مراجعة",
    'about.privacy.2.d': "تُوثّق قرارات اعتماد المراكز والعروض والخصومات إدارياً.",
    'about.privacy.3.h': "لا أموال عبر RAFIQ",
    'about.privacy.3.d': "يدفع المستفيد للمركز مباشرة. لا تحتفظ RAFIQ بأموال العملاء ولا تنفذ تحويلات.",
    'about.privacy.4.h': "المساعد لا يقرر",
    'about.privacy.4.d': "المساعد يقدم معلومات عامة ولا يعتمد مركزاً أو يحدد خصماً أو يصدر كوداً من تلقاء نفسه.",
    'about.partners.h': "المراكز والخدمات الصحية",
    'about.partners.p1': "يشمل الدليل المختبرات الطبية، مراكز الأشعة والتصوير، العلاج الفيزيائي، ومراكز بيع وتأجير المعدات الطبية.",
    'about.partners.p2': "لا تعتبر أي جهة شريكاً معتمداً ولا يظهر اسمها أو شعارها أو عرضها إلا بعد موافقة الإدارة.",
    'about.contact.h': '📱 تواصل معنا',
    'about.contact.1.h': "المراسلات الإدارية",
    'about.contact.1.d': "للتواصل الإداري اليدوي عبر رقم WhatsApp الرسمي.",
    'about.contact.2.h': "قنوات RAFIQ الرسمية",
    'about.contact.2.d': "البوت والقناة على Telegram، وقناة WhatsApp للنشر اليدوي.",
    'about.contact.3.h': "اعتماد المراكز والعروض",
    'about.contact.3.d': "مراجعة واعتماد إدراج المراكز والعروض والخصومات قبل نشرها.",

    /* ---- the CV service: prices are public and fixed ---- */

    /* ---- footer ---- */
    'footer.rights': '© RAFIQ | رفيق للخدمات · نصل بالحب والأمان لرعاية العائلة',

    /* ---- the four service pages (the top four picks on the home page) ---- */
    'nav.caregivers': 'لمقدمي الرعاية',
    'cta.wa': 'واتساب RAFIQ',
    'cta.waShort': 'واتساب',

    'elderly.h1': 'رعاية كبار السن في المنزل في لبنان',
    'elderly.p': 'تساعد RAFIQ العائلات على تنظيم طلبات رعاية كبار السن في المنزل، مع جمع معلومات الحالة والاحتياجات والجدول والمنطقة لمراجعتها ومطابقتها مع مقدمي الرعاية المناسبين.',
    'elderly.h2': 'الخدمات الممكنة',
    'elderly.li1': 'المساعدة في العناية الشخصية والنظافة.',
    'elderly.li2': 'المساعدة في التغذية وإعداد ما يتفق عليه ضمن نطاق الخدمة.',
    'elderly.li3': 'المرافقة والدعم للأشخاص غير المستقلين.',
    'elderly.li4': 'رعاية نهارية أو ليلية وفق الطلب.',
    'elderly.li5': 'المساعدة في الخروج أو التنقل وفق الاتفاق.',
    'elderly.p2': 'الأعمال الطبية أو إعطاء الأدوية تكون وفق تعليمات الطبيب واتفاق العائلة ونطاق مقدم الخدمة.',

    'patient.h1': 'رعاية المرضى في المنزل في لبنان',
    'patient.p': 'يمكن للعائلة إرسال طلب يتضمن معلومات المريض والحالة والموقع والجدول والاحتياجات، ثم تتم مراجعة الطلب وتنظيم المطابقة المناسبة.',
    'patient.h2': 'لماذا التفاصيل مهمة؟',
    'patient.p2': 'نوع الحالة، درجة الاستقلالية، الجدول، الخبرة المطلوبة ومكان الرعاية تساعد الإدارة على فهم الطلب واختيار مقدمي الخدمة المناسبين.',
    'patient.p3': 'RAFIQ لا تستبدل الطبيب أو المستشفى، وأي رعاية طبية أو دوائية يجب أن تتم ضمن الاختصاص والتعليمات الطبية المعتمدة.',

    'nursing.h1': 'التمريض المنزلي في لبنان',
    'nursing.p': 'تعمل RAFIQ على تنظيم طلبات التمريض المنزلي وربط العائلات بالممرضين والممرضات المسجلين في شبكة المنصة بعد مراجعة البيانات والوثائق المهنية.',
    'nursing.h2a': 'المطابقة',
    'nursing.p2': 'يمكن أن تعتمد المطابقة على نوع الحالة، الاختصاص، الخبرة، المنطقة، الجدول والخدمات المطلوبة.',
    'nursing.h2b': 'للممرضين والممرضات',
    'nursing.p3': 'لا يوجد اشتراك شهري أو سنوي للانضمام إلى نموذج RAFIQ الأولي. يتم تقديم الخدمات والطلبات وفق نظام المنصة واتفاقات العمل.',

    'physio.h1': 'العلاج الفيزيائي المنزلي في لبنان',
    'physio.p': 'RAFIQ تعمل على تنظيم طلبات العلاج الفيزيائي المنزلي وربط العائلات بالمعالجين الفيزيائيين وفق المنطقة والخبرة والخدمات المتاحة.',
    'physio.p2': 'يتم تحديد الحاجة العلاجية والبرنامج المناسب من قبل الاختصاصي وفق الحالة، ولا تحل المنصة محل التقييم الطبي أو العلاجي المهني.',
    'physio.h2': 'للمعالجين الفيزيائيين',
    'physio.p3': 'الانضمام إلى نموذج RAFIQ الأولي لا يتطلب اشتراكًا شهريًا أو سنويًا.',

    /* ---- the seven area pages: one template, seven regions ---- */
    'cta.request': 'تقديم طلب',
    'reg.lebanon.h1': 'رعاية منزلية في لبنان',
    'reg.lebanon.p': 'تعمل RAFIQ على بناء شبكة وطنية للرعاية المنزلية تبدأ بالمناطق التي يتوفر فيها مقدمو خدمات مناسبون وتتوسع تدريجيًا إلى باقي لبنان.',
    'reg.beirut.h1': 'رعاية منزلية في بيروت',
    'reg.beirut.p': 'تعمل RAFIQ على توفير شبكة خدمات في بيروت تشمل الرعاية والتمريض والعلاج الفيزيائي والخدمات المساندة وفق التوفر والاتفاقات.',
    'reg.tripoli.h1': 'رعاية منزلية في طرابلس | RAFIQ',
    'reg.tripoli.p': 'تنظم RAFIQ طلبات الرعاية المنزلية في طرابلس وتربطها بمقدمي الرعاية والتمريض والخدمات المساندة المتاحين في المنطقة.',
    'reg.zgharta.h1': 'رعاية منزلية في زغرتا',
    'reg.zgharta.p': 'تعمل RAFIQ على توسيع شبكة مقدمي الخدمات في زغرتا وتنظيم طلبات الرعاية المنزلية بحسب احتياجات العائلات وتوفر مقدمي الخدمات.',
    'reg.koura.h1': 'رعاية منزلية في الكورة',
    'reg.koura.p': 'تنظم RAFIQ طلبات العائلات في الكورة وتعمل على مطابقتها مع مقدمي الرعاية والتمريض والخدمات المساندة بحسب التوفر.',
    'reg.batroun.h1': 'رعاية منزلية في البترون',
    'reg.batroun.p': 'تتوسع شبكة RAFIQ تدريجيًا في البترون مع تسجيل مقدمي الخدمات ومراجعة بياناتهم وتنظيم طلبات العائلات.',
    'reg.dinniyeh.h1': 'رعاية منزلية في الضنية',
    'reg.dinniyeh.p': 'يمكن للعائلات في الضنية إرسال طلب رعاية منزلية يتضمن معلومات الحالة والموقع والجدول، وتتم مراجعته وفق مقدمي الخدمات المتاحين في المنطقة.',

    /* ---- the four guides reachable from the care guide ---- */
    'g.choose.h1': 'كيف تختار مقدم رعاية للمسن؟',
    'g.choose.p': 'حدد مستوى الاستقلالية والاحتياجات اليومية والجدول. ثم راجع خبرة مقدم الرعاية والخدمات التي يقدمها والمنطقة واللغات والتوفر. في الحالات الطبية أو المعقدة يجب تحديد الحاجة المهنية المناسبة مع الطبيب أو الفريق الطبي.',
    'g.vsnurse.h1': 'الفرق بين مقدم الرعاية والممرض',
    'g.vsnurse.p': 'مقدم الرعاية يركز على المساعدة اليومية والرعاية الشخصية والمرافقة ضمن نطاق الخدمة. الممرض مؤهل لأعمال تمريضية ضمن اختصاصه وترخيصه. اختيار الخدمة يعتمد على حالة الشخص واحتياجاته وتعليمات الفريق الطبي عند الحاجة.',
    'g.elderlyhome.h1': 'رعاية المسن في المنزل',
    'g.elderlyhome.p': 'تبدأ الرعاية الجيدة بفهم احتياجات الشخص وروتينه وقدرته على الحركة والتغذية والعناية الشخصية. يجب الحفاظ على بيئة آمنة، ومراقبة أي تغيرات صحية وإبلاغ الطبيب أو العائلة عند الحاجة، وعدم تجاوز نطاق مقدم الخدمة.',
    'g.hospital.h1': 'رعاية مريض بعد الخروج من المستشفى',
    'g.hospital.p': 'قبل العودة إلى المنزل، من المفيد للعائلة معرفة تعليمات الطبيب والأدوية والمتابعة والحركة والغذاء وأي أجهزة أو عناية مطلوبة. بعد ذلك يمكن إرسال طلب RAFIQ بالمعلومات المناسبة للمساعدة في تحديد نوع مقدم الخدمة المطلوب.',

    /* ---- ranks 5, 6 and 7 on the home page ---- */
    'care.h1': 'لمقدمي الرعاية في لبنان',
    'care.i1.h': 'التسجيل',
    'care.i1.d': 'تسجيل الخبرة والخدمات واللغات والمناطق والوثائق المهنية لمراجعتها.',
    'care.i2.h': 'وظائف الرعاية',
    'care.i2.d': 'تنظيم فرص وطلبات الرعاية وربطها بالملفات المناسبة وفق متطلبات العائلة.',
    'care.i3.h': 'CV احترافي ATS',
    'care.i3.d': 'خدمة إعداد CV احترافي بالعربية والإنجليزية وفق المعلومات المقدمة.',
    'care.i4.h': 'بدون اشتراك',
    'care.i4.d': 'لا يوجد اشتراك شهري أو سنوي لمقدمي الرعاية في نموذج RAFIQ الأولي.',

    'regions.h1': 'مناطق خدمات RAFIQ في لبنان',
    'regions.p': 'نبدأ ببناء شبكة خدمات قابلة للتوسع في لبنان، مع أولوية للمناطق التي يتوفر فيها مقدمو خدمات مناسبون.',
    'regions.i1.h': 'طرابلس',
    'regions.i1.d': 'رعاية منزلية، رعاية مسنين، تمريض منزلي وخدمات مساندة وفق التوفر.',
    'regions.i2.h': 'الضنية',
    'regions.i2.d': 'طلبات الرعاية المنزلية ومقدمو الخدمات بحسب المنطقة والتوفر.',
    'regions.i3.h': 'زغرتا',
    'regions.i3.d': 'تنظيم الطلبات وربطها بمقدمي الخدمات ضمن الشبكة.',
    'regions.i4.h': 'الكورة',
    'regions.i4.d': 'خدمات الرعاية المنزلية وفق التغطية المتاحة.',
    'regions.i5.h': 'البترون',
    'regions.i5.d': 'التوسع في شبكة مقدمي الخدمات بحسب التوفر.',
    'regions.i6.h': 'بيروت',
    'regions.i6.d': 'خدمات الرعاية والتمريض ضمن توسع الشبكة.',
    'regions.i7.h': 'باقي لبنان',
    'regions.i7.d': 'نوسع الشبكة تدريجيًا حسب توفر مقدمي الخدمات والطلبات.',

    'guide.h1': 'دليل الرعاية المنزلية RAFIQ',
    'guide.i1.h': 'كيف تختار مقدم رعاية للمسن؟',
    'guide.i1.d': 'ابدأ بتحديد درجة الاستقلالية، الجدول، الخدمات المطلوبة والخبرة المناسبة للحالة.',
    'guide.i2.h': 'مقدم الرعاية أم الممرض؟',
    'guide.i2.d': 'مقدم الرعاية يركز على المساعدة والرعاية اليومية ضمن نطاق الخدمة، بينما الممرض مؤهل لأعمال تمريضية ضمن اختصاصه وترخيصه.',
    'guide.i3.h': 'رعاية المسن في المنزل',
    'guide.i3.d': 'تنظيم الروتين اليومي، السلامة، النظافة، التغذية والمرافقة بحسب احتياجات الشخص.',
    'guide.i4.h': 'بعد الخروج من المستشفى',
    'guide.i4.d': 'تحدد العائلة مع الطبيب أو الفريق الطبي الاحتياجات المنزلية، ثم يمكن تقديم طلب مناسب عبر RAFIQ.',
    'guide.faq.h': 'أسئلة العائلات الشائعة',
    'guide.q1': 'هل يوجد اشتراك للعائلة؟',
    'guide.a1': 'يعتمد ذلك على نموذج الخدمة المعتمد لكل طلب، وتظهر الشروط قبل الاتفاق.',
    'guide.q2': 'هل يوجد اشتراك لمقدم الرعاية؟',
    'guide.a2': 'لا يوجد اشتراك شهري أو سنوي للمنتسبين إلى نموذج RAFIQ الأولي.',
    'guide.q3': 'هل ستتوفر خصومات؟',
    'guide.a3': 'تعمل RAFIQ على بناء اتفاقات مع مختبرات ومراكز تصوير ومقدمي معدات وخدمات صحية، وتعلن أي خصم بعد اعتماده واتفاقه رسميًا.',

    /* ---- the FAQ: the page every navigation bar links to ---- */
    'faq.h1': 'الأسئلة الشائعة حول الرعاية المنزلية',
    'faq.p': 'إجابات واضحة قبل أن تتخذ قرارك',
    'faq.s1.h': '🏠 استقبال الطلبات',
    'faq.s1.q1': 'استقبال طلبات كبار السن',
    'faq.s1.a1': 'نرتب الرعاية اليومية أو الليلية أو الإقامة وفق حالة المسن والمنطقة والدوام. نبدأ بجمع: العمر، المنطقة، قدرته على المشي، احتياجات الرعاية، وهل يحتاج تمريضاً أو علاجاً فيزيائياً.',
    'faq.s1.q2': 'استقبال طلبات المرضى',
    'faq.s1.a2': 'نرتب الرعاية المنزلية للمرضى وفق تعليمات الطبيب. نعرف: سبب الرعاية كما يصفه الأهل، هل المريض في المنزل أم خرج من المستشفى، الدوام، الحركة، واحتياجات التمريض والعلاج الفيزيائي.',
    'faq.s2.h': '👥 الفرق بين مقدمي الخدمة',
    'faq.th1': 'الاختصاص',
    'faq.th2': 'ما يقوم به',
    'faq.th3': 'متى تحتاجه',
    'faq.r1': 'مقدم رعاية',
    'faq.r1.d': 'نظافة، لباس، طعام، حركة، مرافقة، روتين يومي',
    'faq.r1.w': 'حين تكون الحاجة للرعاية اليومية فقط',
    'faq.r2': 'ممرض/ة مجاز/ة',
    'faq.r2.d': 'إجراءات طبية، متابعة أدوية، قياسات، تحويل جروح',
    'faq.r2.w': 'حين تكون هناك حاجة تمريضية',
    'faq.r3': 'معالج فيزيائي',
    'faq.r3.d': 'تمارين حركية وإعادة تأهيل',
    'faq.r3.w': 'بعد الجلطة أو الإصابة أو العملية',
    'faq.s3.h': '🏥 حالات ما بعد الخروج من المستشفى',
    'faq.s3.q1': 'ما الذي نحتاج معرفته؟',
    'faq.s3.a1': 'نوع العملية، تعليمات الطبيب بعد الخروج، هل يستطيع المريض المشي، هل يحتاج مساعدة في الاستحمام أو اللباس، هل يحتاج متابعة الأدوية، هل توجد جروح أو أجهزة، عدد الساعات، والمنطقة.',
    'faq.s3.note': 'RAFIQ لا تشخّص ولا تصف دواءً ولا تغيّر علاج الطبيب. نحن ننظّم الطلب ونوجّهه للخدمة المناسبة.',
    'faq.s4.h': '🌙 الرعاية الليلية و24 ساعة',
    'faq.s4.q1': 'هل يوجد دوام 24 ساعة؟',
    'faq.s4.a1': 'نعم، ويمكن تقديم طلب لنظام مقسم حسب توفر مقدمي الخدمة. نعرف: حالة المريض، هل يحتاج مراقبة مستمرة، هل يستطيع الحركة، هل يحتاج رعاية ليلية، وهل توجد احتياجات تمريضية.',
    'faq.s5.h': '💊 الأدوية والضمادات',
    'faq.s5.q1': 'من يعطي الدواء؟',
    'faq.s5.a1': 'الأدوية تُدار وفق وصفة الطبيب وتعليماته واتفاق الأسرة. إذا كانت الحالة تحتاج مهارة أو متابعة تمريضية، نوجّه الطلب إلى ممرض/ة مجاز/ة.',
    'faq.s6.h': '🧹 الطبخ والتنظيف والقيادة',
    'faq.s6.q1': 'ما المشمول وما الإضافي؟',
    'faq.s6.a1': 'الرعاية الشخصية تشمل النظافة والمساعدة في الطعام وترتيب الاحتياجات اليومية. الطبخ والتنظيف والقيادة والمرافقة خارج المنزل تُحدد كمهام إضافية عند الاتفاق عليها مسبقاً.',
    'faq.s7.h': '💰 الأسعار والتوفر',
    'faq.s7.q1': 'لماذا لا يظهر سعر مؤكد؟',
    'faq.s7.a1': 'لأن السعر يعتمد على نوع الرعاية وعدد الساعات والحالة والخبرة. تُعرض الأسعار بعد مراجعة الطلب وتأكيد مقدم الخدمة. لا نَعِد بسعر غير مؤكد ولا بتوفر غير مؤكد.',
    'faq.s8.h': '🛡️ الثقة والمسؤولية',
    'faq.s8.q1': 'كيف أعرف أن الشخص مناسب؟',
    'faq.s8.a1': 'تُجمع المعلومات المهنية والخبرة وتُراجع وفق إجراءات المنصة. المطابقة تتم بناءً على الحالة والخبرة والخدمات والمنطقة والتوفر.',
    'faq.s8.q2': 'من يتحمل المسؤولية عن خطأ؟',
    'faq.s8.a2': 'تُحدد المسؤوليات في العقد. مقدم الرعاية يتحمل المسؤولية المهنية والقانونية عن أي خطأ أو إهمال يثبت صدوره عنه.',

    /* ---- safety line, must never change meaning ---- */
    'safety.nodiagnose': 'لا نشخّص ولا نصف دواءً ولا نغيّر علاج الطبيب.'
  };

  RAFIQ_I18N.register('ar', dict);
})();


/* ===================== bundled: %s ===================== */

/* RAFIQ — English bundle.
   Translated from the Arabic source. A missing key falls back to the Arabic
   original rather than showing an empty box. */
(function () {
  var dict = {

    'lang.note': 'Choose a language — the text changes instantly.',
    'notice.partial': 'Some sections on this page are still in Arabic. We are completing them.',
    'notice.page': 'The navigation is in your language, but the text of this page is still in Arabic. We are completing it.',

    /* ---- install button: every message the button can show ---- */
    'install.steps.ios': 'Tap the Share button ⬆︎ at the bottom, then "Add to Home Screen", then "Add".',
    'install.steps.android': 'Open the browser menu ⋮, then "Install app" or "Add to Home screen".',
    'install.steps.desktop': 'Click the install icon ⊕ in the browser address bar.',
    'install.ready': 'Tap “Install the app” to add it to your device.',
    'install.done': 'Installed ✅ the app is now on your screen.',
    'install.https': 'Installing needs a secure connection (https). The site works normally right now.',
    'install.noButton': 'This browser is not showing the install button. ',
    'reason.installed': 'The app is already installed on this device.',
    'reason.https': 'Installing needs a secure https link — the button will work as soon as you open it there.',
    'reason.noSW': 'This browser does not support installing apps. Open the site in Chrome.',
    'reason.noManifest': 'The app file is not available on this server yet.',
    'reason.ios': 'On iPhone: the Share button ⬆︎, then "Add to Home Screen", then "Add".',
    'reason.noPrompt': 'Open the browser menu ⋮, then "Install app". If the option is not there, reopen the site from its direct link.',

    'home.title': "RAFIQ | Approved Medical Centre Directory in Lebanon",
    'home.h1': 'Rafiq | RAFIQ',
    'home.tagline': 'We connect love and safety to family care',
    'home.who': "Directory of medical centres and offers approved in Lebanon.",
    'home.cta.main': "Browse centres",
    'home.cta.main.sub': "Approved categories and areas",
    'home.cta.wa': 'WhatsApp',
    'home.cta.wa.sub': "Manual correspondence",
    'home.cta.bot': "Telegram channel",
    'home.cta.bot.sub': "Approved announcements",
    'home.install': '📲 Install the app',

    'home.pick.title': "Choose a service category",
    'home.pick.1.t': "Medical laboratories",
    'home.pick.1.d': "Approved medical testing and laboratory centres.",
    'home.pick.2.t': "Imaging and radiology",
    'home.pick.2.d': "Approved medical imaging and radiology centres.",
    'home.pick.3.t': "Physiotherapy",
    'home.pick.3.d': "Approved physiotherapy and rehabilitation centres.",
    'home.pick.4.t': "Medical equipment sales",
    'home.pick.4.d': "Approved medical equipment sales centres.",
    'home.pick.5.t': "Medical equipment rental",
    'home.pick.5.d': "Approved medical equipment rental centres.",
    'home.pick.6.t': 'Areas',
    'home.pick.6.d': "Tripoli, Danniyeh, Zgharta, Koura, Batroun, Beirut, and the rest of Lebanon.",
    'home.pick.7.t': "Directory guide",
    'home.pick.7.d': "How to browse approved centres and offers.",
    'home.pick.8.t': 'Frequently asked',
    'home.pick.8.d': "Answers about services and approved discounts.",

    'home.about.h': 'What is the Rafiq platform?',
    'home.about.lead': "RAFIQ is a Lebanese directory of medical centres, supporting services, and offers approved in advance by the management.",
    'home.about.1.h': 'What do we do?',
    'home.about.1.d': "We list service categories and centres whose details have been reviewed and approved, with official contact channels.",
    'home.about.2.h': 'Why go through a platform?',
    'home.about.2.d': "We do not publish a centre, logo, advertisement, or discount before management review and approval.",
    'home.about.3.h': 'What do we not do?',
    'home.about.3.d': 'We do not diagnose, do not prescribe, do not promise a fixed price or a fixed availability, and do not handle money in chat.',
    'home.about.4.h': "Who approves listings and offers?",
    'home.about.4.d': "Only RAFIQ management. No centre, offer, or discount is published without its approval.",
    'home.about.steps.h': "How the directory works",
    'home.about.steps.1': "Choose a service category and area.",
    'home.about.steps.2': "Browse only centres approved by RAFIQ management.",
    'home.about.steps.3': "Review the discount value and terms after approval.",
    'home.about.steps.4': "Contact the centre and pay it directly when receiving the service.",

    'home.svc.h': "Medical centre categories",
    'home.svc.1.h': "Medical laboratories",
    'home.svc.1.d': "Medical testing and laboratory centres approved by management.",
    'home.svc.2.h': "Imaging and radiology",
    'home.svc.2.d': "Approved medical imaging and radiology centres.",
    'home.svc.3.h': "Physiotherapy",
    'home.svc.3.d': "Approved physiotherapy and rehabilitation centres.",
    'home.svc.4.h': "Medical equipment sales",
    'home.svc.4.d': "Approved medical equipment sales centres.",
    'home.svc.more': 'Full details on the services page.',
    'home.svc.5.h': "Medical equipment rental",
    'home.svc.5.d': "Approved medical equipment rental centres.",
    'home.svc.more.pre': "Browse all categories on the",
    'home.svc.more.link': "services page",

    'home.roles.h': 'The basic rule that separates the professions',
    'home.roles.th1': 'Who they are',
    'home.roles.th2': 'What they do',
    'home.roles.th3': 'When you need them',
    'home.roles.1': 'Caregiver',
    'home.roles.1.d': 'Washing, dressing, food, movement, company, daily routine',
    'home.roles.1.w': 'When the need is daily care only',
    'home.roles.2': 'Licensed nurse',
    'home.roles.2.d': 'Medical procedures, medication follow-up, measurements, wound dressing',
    'home.roles.2.w': 'When there is a nursing need',
    'home.roles.3': 'Physiotherapist',
    'home.roles.3.d': 'Movement exercises and rehabilitation',
    'home.roles.3.w': 'After a stroke, an injury or an operation',
    'home.roles.note': 'RAFIQ does not diagnose, does not prescribe, and does not change a doctor’s treatment. We organise the request and point it to the right service.',

    'home.contact.h': '📲 Contact',
    'home.contact.1.h': "Official correspondence",
    'home.contact.1.d': "Manual administrative correspondence through WhatsApp.",
    'home.contact.2.h': 'Online request',
    'home.contact.2.d': 'Filling the form is quicker than calling.',
    'home.contact.3.h': "Information and terms",
    'home.contact.3.d': "Review the frequently asked questions before contacting a centre.",

    'nav.home': 'Home',
    'nav.homeBrand': 'RAFIQ home',
    'nav.homePage': 'Home page',
    'nav.allRegions': 'All areas',
    'nav.services': 'Services',
    'nav.about': 'About',
    'nav.faq': 'FAQ',
    'nav.allServices': 'All services',
    'nav.lebanon': '🇱🇧 All of Lebanon',
    'nav.guide': 'The guide',
    'nav.guideAlt': 'The care guide',
    'nav.regions': 'Areas',
    'nav.agent': "RAFIQ assistant",

    'services.title': 'RAFIQ services | Home care and home nursing in Lebanon',
    'services.h1': 'RAFIQ services',
    'services.tagline': 'What we offer today, and what is coming soon',
    'services.home.h': 'Home care',
    'services.home.p': 'These four services are operating today. Every request passes the management before matching.',
    'services.item.1.d': 'We organise requests for day and night care, and for people who cannot manage alone: washing, dressing, food, movement, and company inside the home.',
    'services.item.2.d': 'Home-care requests, and follow-up on what the person needs, based on the information the family provides and on the doctor’s instructions.',
    'services.item.3.d': 'We match nursing requests with licensed nurses by specialisation, experience and location, for procedures and medication follow-up.',
    'services.item.4.d': 'We organise physiotherapy requests and match them with physiotherapists on the RAFIQ network, after the specialist has assessed the case.',
    'services.soon.h': 'Coming soon to the platform',
    'services.soon.p': 'These services are being added. We promise neither their availability nor their prices before a formal agreement.',
    'services.soon.badge': '⏳ Coming soon',
    'services.soon.1.h': 'Doctors of various specialities',
    'services.soon.1.d': 'With the possibility of contracting doctors of every speciality as the service network grows.',
    'services.soon.2.h': 'Nutritionists',
    'services.soon.2.d': 'As part of developing the RAFIQ health and support network.',
    'services.soon.3.h': 'Dentists',
    'services.soon.3.d': 'As part of the RAFIQ network of specialised medical services.',
    'services.soon.4.h': 'Speech therapists',
    'services.soon.4.d': 'As part of developing the RAFIQ health and support network.',
    'services.soon.5.h': 'Medical equipment',
    'services.soon.5.d': 'Suppliers of wheelchairs, beds and measuring devices for the home.',
    'services.barcode.h': '🎫 The platform barcode',
    'services.barcode.p': 'Every member has a barcode recording their service type, prices and discounts, and every contracted party has a barcode that logs the work performed.',
    'services.barcode.p2': 'The barcode is handed over after the agreement is signed, and is opened by scanning a QR code or from the manager dashboard — there is no public link.',
    'services.barcode.note': 'No phone number or private data appears before the agreement is signed and management approves.',

    'about.title': 'About the RAFIQ platform | Privacy comes first',
    'about.h1': 'About the RAFIQ platform',
    'about.why.h': "How the RAFIQ directory works",
    'about.why.1.h': "Centres after approval",
    'about.why.1.d': "We list only centres whose details have been reviewed and approved by management.",
    'about.why.2.h': "Clear offers",
    'about.why.2.d': "Discount values and terms appear only after review and explicit approval.",
    'about.why.3.h': "Management review",
    'about.why.3.d': "Only RAFIQ management decides whether a centre, advertisement, or offer is listed.",
    'about.why.4.h': "Pay the centre directly",
    'about.why.4.d': "The visitor contacts and pays the centre directly. RAFIQ does not receive customer funds.",
    'about.privacy.h': "Approval and privacy",
    'about.privacy.p': "We do not publish a centre’s details or an offer or discount before review and management approval. Public channels do not request medical information or personal documents.",
    'about.privacy.1.h': "Management approval first",
    'about.privacy.1.d': "No centre, logo, or discount is listed before review and prior approval.",
    'about.privacy.2.h': "Review record",
    'about.privacy.2.d': "Centre, offer, and discount approval decisions are documented administratively.",
    'about.privacy.3.h': "No customer funds handled by RAFIQ",
    'about.privacy.3.d': "The visitor pays the centre directly. RAFIQ does not hold customer money or make transfers.",
    'about.privacy.4.h': "The assistant does not decide",
    'about.privacy.4.d': "The assistant provides general information; it does not approve centres, set discounts, or issue codes independently.",
    'about.partners.h': "Medical centres and services",
    'about.partners.p1': "The directory covers medical laboratories, imaging and radiology centres, physiotherapy centres, and medical equipment sales and rental centres.",
    'about.partners.p2': "No organisation is presented as an approved partner, and no name, logo, or offer is displayed, without management approval.",
    'about.contact.h': '📱 Contact us',
    'about.contact.1.h': "Administrative correspondence",
    'about.contact.1.d': "Manual administrative contact through the official WhatsApp number.",
    'about.contact.2.h': "Official RAFIQ channels",
    'about.contact.2.d': "The Telegram bot and channel, and the WhatsApp channel for manual publishing.",
    'about.contact.3.h': "Centre and offer approval",
    'about.contact.3.d': "Centres, offers, and discounts are reviewed and approved before publication.",

    /* ---- the CV service: the prices are public and fixed ---- */

    'footer.rights': '© RAFIQ | Rafiq — We connect love and safety to family care',

    /* ---- the four service pages (the top four picks on the home page) ---- */
    'nav.caregivers': 'For caregivers',
    'cta.wa': 'WhatsApp RAFIQ',
    'cta.waShort': 'WhatsApp',

    'elderly.h1': 'Elderly care at home in Lebanon',
    'elderly.p': 'RAFIQ helps families organise requests for elderly care at home, collecting the person’s details, the needs, the schedule and the area so they can be reviewed and matched with the right caregivers.',
    'elderly.h2': 'What the service can include',
    'elderly.li1': 'Help with personal care and washing.',
    'elderly.li2': 'Help with meals and preparing whatever is agreed within the scope of the service.',
    'elderly.li3': 'Company and support for people who cannot manage alone.',
    'elderly.li4': 'Daytime or night-time care, as requested.',
    'elderly.li5': 'Help with going out or getting around, as agreed.',
    'elderly.p2': 'Any medical task or the giving of medication follows the doctor’s instructions, the family’s agreement and the scope of the service provider.',

    'patient.h1': 'Patient care at home in Lebanon',
    'patient.p': 'A family can send a request with the patient’s details, the condition, the location, the schedule and the needs. The request is then reviewed and the right match organised.',
    'patient.h2': 'Why the details matter',
    'patient.p2': 'The type of condition, the level of independence, the schedule, the experience required and the place of care help the management understand the request and choose the right providers.',
    'patient.p3': 'RAFIQ does not replace the doctor or the hospital, and any medical or medication-related care must take place within the relevant scope and the approved medical instructions.',

    'nursing.h1': 'Home nursing in Lebanon',
    'nursing.p': 'RAFIQ organises requests for home nursing and connects families with the nurses registered on the platform network, after the details and the professional documents have been reviewed.',
    'nursing.h2a': 'Matching',
    'nursing.p2': 'Matching can take into account the type of condition, the specialisation, the experience, the area, the schedule and the services required.',
    'nursing.h2b': 'For nurses',
    'nursing.p3': 'There is no monthly or annual subscription to join the first RAFIQ model. Services and requests are handled under the platform rules and the working agreements.',

    'physio.h1': 'Home physiotherapy in Lebanon',
    'physio.p': 'RAFIQ organises requests for home physiotherapy and connects families with physiotherapists by area, experience and the services available.',
    'physio.p2': 'The therapeutic need and the right programme are determined by the specialist according to the condition. The platform does not replace a medical assessment or a professional therapy assessment.',
    'physio.h2': 'For physiotherapists',
    'physio.p3': 'Joining the first RAFIQ model requires no monthly or annual subscription.',

    /* ---- the seven area pages: one template, seven regions ---- */
    'cta.request': 'Send a request',
    'reg.lebanon.h1': 'Home care in Lebanon',
    'reg.lebanon.p': 'RAFIQ is building a national network for home care. It starts in the areas where suitable providers are available and grows gradually into the rest of Lebanon.',
    'reg.beirut.h1': 'Home care in Beirut',
    'reg.beirut.p': 'RAFIQ provides a service network in Beirut covering care, nursing, physiotherapy and supporting services, according to availability and agreements.',
    'reg.tripoli.h1': 'Home care in Tripoli | RAFIQ',
    'reg.tripoli.p': 'RAFIQ organises home-care requests in Tripoli and connects them with the caregivers, nurses and supporting providers available in the area.',
    'reg.zgharta.h1': 'Home care in Zgharta',
    'reg.zgharta.p': 'RAFIQ is expanding its network of providers in Zgharta and organising home-care requests according to what families need and what is available.',
    'reg.koura.h1': 'Home care in Koura',
    'reg.koura.p': 'RAFIQ organises requests from families in Koura and matches them with caregivers, nurses and supporting providers according to availability.',
    'reg.batroun.h1': 'Home care in Batroun',
    'reg.batroun.p': 'The RAFIQ network is growing gradually in Batroun, registering providers, reviewing their details and organising family requests.',
    'reg.dinniyeh.h1': 'Home care in Dinniyeh',
    'reg.dinniyeh.p': 'Families in Dinniyeh can send a home-care request with the details of the person, the location and the schedule. It is reviewed against the providers available in the area.',

    /* ---- the four guides reachable from the care guide ---- */
    'g.choose.h1': 'How do I choose a caregiver for an elderly person?',
    'g.choose.p': 'Start by defining the level of independence, the daily needs and the schedule. Then look at the caregiver’s experience, the services offered, the area, the languages and the availability. In medical or complex cases, define the right professional need together with the doctor or the medical team.',
    'g.vsnurse.h1': 'The difference between a caregiver and a nurse',
    'g.vsnurse.p': 'A caregiver focuses on daily help, personal care and company within the scope of the service. A nurse is qualified for nursing tasks within their specialisation and licence. Which service is right depends on the person’s condition and needs, and on the instructions of the medical team where relevant.',
    'g.elderlyhome.h1': 'Caring for an elderly person at home',
    'g.elderlyhome.p': 'Good care starts with understanding the person’s needs, their routine, and how well they can move, eat and look after themselves. Keep the environment safe, watch for any change in health and tell the doctor or the family when needed, and do not go beyond the provider’s scope.',
    'g.hospital.h1': 'Caring for a patient after leaving hospital',
    'g.hospital.p': 'Before going home, it helps the family to know the doctor’s instructions, the medication, the follow-up, movement and food, and any equipment or care that is needed. A RAFIQ request can then be sent with the right details to help identify the type of provider required.',

    /* ---- ranks 5, 6 and 7 on the home page ---- */
    'care.h1': 'For caregivers in Lebanon',
    'care.i1.h': 'Registration',
    'care.i1.d': 'Register your experience, services, languages, areas and professional documents so they can be reviewed.',
    'care.i2.h': 'Care work',
    'care.i2.d': 'Organising care opportunities and requests and matching them with the right profiles, according to what the family needs.',
    'care.i3.h': 'An ATS-friendly professional CV',
    'care.i3.d': 'A professional CV in Arabic and English, built from the information you provide.',
    'care.i4.h': 'No subscription',
    'care.i4.d': 'There is no monthly or annual subscription for caregivers in the first RAFIQ model.',

    'regions.h1': 'RAFIQ service areas in Lebanon',
    'regions.p': 'We are building a service network in Lebanon that can scale, starting with the areas where suitable providers are available.',
    'regions.i1.h': 'Tripoli',
    'regions.i1.d': 'Home care, elderly care, home nursing and supporting services, according to availability.',
    'regions.i2.h': 'Dinniyeh',
    'regions.i2.d': 'Home-care requests and providers, by area and availability.',
    'regions.i3.h': 'Zgharta',
    'regions.i3.d': 'Requests are organised and connected with providers within the network.',
    'regions.i4.h': 'Koura',
    'regions.i4.d': 'Home-care services, according to the coverage available.',
    'regions.i5.h': 'Batroun',
    'regions.i5.d': 'Expanding the network of providers, according to availability.',
    'regions.i6.h': 'Beirut',
    'regions.i6.d': 'Care and nursing services as the network grows.',
    'regions.i7.h': 'The rest of Lebanon',
    'regions.i7.d': 'We grow the network gradually, according to the providers available and the requests received.',

    'guide.h1': 'The RAFIQ home-care guide',
    'guide.i1.h': 'How do I choose a caregiver for an elderly person?',
    'guide.i1.d': 'Start by defining the level of independence, the schedule, the services required and the experience the situation calls for.',
    'guide.i2.h': 'Caregiver or nurse?',
    'guide.i2.d': 'A caregiver focuses on help and daily care within the scope of the service, while a nurse is qualified for nursing tasks within their specialisation and licence.',
    'guide.i3.h': 'Caring for an elderly person at home',
    'guide.i3.d': 'Organising the daily routine, safety, washing, food and company, according to what the person needs.',
    'guide.i4.h': 'After leaving hospital',
    'guide.i4.d': 'The family defines the needs at home with the doctor or the medical team, and can then send a suitable request through RAFIQ.',
    'guide.faq.h': 'Common questions from families',
    'guide.q1': 'Is there a subscription for the family?',
    'guide.a1': 'That depends on the service model approved for each request. The terms are shown before any agreement.',
    'guide.q2': 'Is there a subscription for the caregiver?',
    'guide.a2': 'There is no monthly or annual subscription for members of the first RAFIQ model.',
    'guide.q3': 'Will there be discounts?',
    'guide.a3': 'RAFIQ is building agreements with laboratories, imaging centres and providers of equipment and health services. Any discount is announced only after it has been approved and formally agreed.',

    /* ---- the FAQ: the page every navigation bar links to ---- */
    'faq.h1': 'Frequently asked questions about home care',
    'faq.p': 'Clear answers before you decide',
    'faq.s1.h': '🏠 Taking a request',
    'faq.s1.q1': 'Requests for elderly care',
    'faq.s1.a1': 'We arrange daily, night-time or live-in care according to the person’s condition, the area and the schedule. We start by collecting the age, the area, how well the person can walk, the care needs, and whether nursing or physiotherapy is needed.',
    'faq.s1.q2': 'Requests for patient care',
    'faq.s1.a2': 'We arrange home care for patients following the doctor’s instructions. We establish the reason for the care as the family describes it, whether the patient is at home or has just left hospital, the schedule, mobility, and any nursing or physiotherapy needs.',
    'faq.s2.h': '👥 The difference between the providers',
    'faq.th1': 'Role',
    'faq.th2': 'What they do',
    'faq.th3': 'When you need them',
    'faq.r1': 'Caregiver',
    'faq.r1.d': 'Washing, dressing, food, movement, company, daily routine',
    'faq.r1.w': 'When the need is daily care only',
    'faq.r2': 'Licensed nurse',
    'faq.r2.d': 'Medical procedures, medication follow-up, measurements, wound dressing',
    'faq.r2.w': 'When there is a nursing need',
    'faq.r3': 'Physiotherapist',
    'faq.r3.d': 'Movement exercises and rehabilitation',
    'faq.r3.w': 'After a stroke, an injury or an operation',
    'faq.s3.h': '🏥 After leaving hospital',
    'faq.s3.q1': 'What do we need to know?',
    'faq.s3.a1': 'The type of operation, the doctor’s instructions after discharge, whether the patient can walk, whether help is needed with washing or dressing, whether medication needs follow-up, whether there are wounds or equipment, the number of hours, and the area.',
    'faq.s3.note': 'RAFIQ does not diagnose, prescribe, or change a doctor’s treatment. We organise the request and point it to the right service.',
    'faq.s4.h': '🌙 Night-time and 24-hour care',
    'faq.s4.q1': 'Is there a 24-hour shift?',
    'faq.s4.a1': 'Yes, and a request can be made for a shared arrangement according to what the providers have available. We establish the patient’s condition, whether continuous monitoring is needed, whether they can move, whether night care is needed, and whether there are nursing needs.',
    'faq.s5.h': '💊 Medication and dressings',
    'faq.s5.q1': 'Who gives the medication?',
    'faq.s5.a1': 'Medication is managed according to the doctor’s prescription and instructions and the family’s agreement. If the situation needs nursing skill or follow-up, we send the request to a licensed nurse.',
    'faq.s6.h': '🧹 Cooking, cleaning and driving',
    'faq.s6.q1': 'What is included and what is extra?',
    'faq.s6.a1': 'Personal care covers washing, help with meals and managing daily needs. Cooking, cleaning, driving and accompaniment outside the home are set as additional tasks when agreed in advance.',
    'faq.s7.h': '💰 Prices and availability',
    'faq.s7.q1': 'Why is no fixed price shown?',
    'faq.s7.a1': 'Because the price depends on the type of care, the number of hours, the condition and the experience. Prices are shown after the request has been reviewed and the provider confirmed. We promise neither a price that is not certain nor an availability that is not certain.',
    'faq.s8.h': '🛡️ Trust and responsibility',
    'faq.s8.q1': 'How do I know the person is suitable?',
    'faq.s8.a1': 'Professional information and experience are collected and reviewed under the platform’s procedures. Matching is based on the condition, the experience, the services, the area and the availability.',
    'faq.s8.q2': 'Who is responsible for a mistake?',
    'faq.s8.a2': 'Responsibilities are set out in the agreement. The caregiver carries professional and legal responsibility for any mistake or neglect proven to have come from them.',

    'safety.nodiagnose': 'We do not diagnose, prescribe, or change a doctor’s treatment.'
  };

  RAFIQ_I18N.register('en', dict);
})();


/* ===================== bundled: %s ===================== */

/* RAFIQ — French bundle. Missing keys fall back to Arabic. */
(function () {
  var dict = {

    'lang.note': 'Choisissez la langue — le texte change immédiatement.',
    'notice.partial': 'Certaines sections de cette page sont encore en arabe. Nous les complétons.',
    'notice.page': 'Le menu est dans votre langue, mais le texte de cette page est encore en arabe. Nous le complétons.',

    /* ---- install button: every message the button can show ---- */
    'install.steps.ios': 'Touchez le bouton Partager ⬆︎ en bas, puis « Sur l’écran d’accueil », puis « Ajouter ».',
    'install.steps.android': 'Ouvrez le menu du navigateur ⋮, puis « Installer l’application » ou « Ajouter à l’écran d’accueil ».',
    'install.steps.desktop': 'Cliquez sur l’icône d’installation ⊕ dans la barre d’adresse du navigateur.',
    'install.ready': 'Touchez « Installer l’application » pour l’ajouter à votre appareil.',
    'install.done': 'Installation réussie ✅ l’application est maintenant sur votre écran.',
    'install.https': 'L’installation nécessite une connexion sécurisée (https). Le site fonctionne normalement pour l’instant.',
    'install.noButton': 'Ce navigateur n’affiche pas le bouton d’installation. ',
    'reason.installed': 'L’application est déjà installée sur cet appareil.',
    'reason.https': 'L’installation nécessite un lien https sécurisé — le bouton fonctionnera dès que vous l’ouvrirez là-bas.',
    'reason.noSW': 'Ce navigateur ne permet pas d’installer des applications. Ouvrez le site dans Chrome.',
    'reason.noManifest': 'Le fichier de l’application n’est pas encore disponible sur ce serveur.',
    'reason.ios': 'Sur iPhone : le bouton Partager ⬆︎, puis « Sur l’écran d’accueil », puis « Ajouter ».',
    'reason.noPrompt': 'Ouvrez le menu du navigateur ⋮, puis « Installer l’application ». Si l’option n’apparaît pas, rouvrez le site depuis son lien direct.',

    'home.title': "RAFIQ | Répertoire des centres médicaux approuvés au Liban",
    'home.h1': 'Rafiq | RAFIQ',
    'home.tagline': 'Nous unissons l’amour et la sécurité pour le soin de la famille',
    'home.who': "Répertoire des centres médicaux et offres approuvés au Liban.",
    'home.cta.main': "Voir les centres",
    'home.cta.main.sub': "Catégories et régions approuvées",
    'home.cta.wa': 'WhatsApp',
    'home.cta.wa.sub': "Correspondance manuelle",
    'home.cta.bot': "Canal Telegram",
    'home.cta.bot.sub': "Annonces approuvées",
    'home.install': '📲 Installer l’application',

    'home.pick.title': "Choisissez une catégorie de service",
    'home.pick.1.t': "Laboratoires médicaux",
    'home.pick.1.d': "Laboratoires et centres d’analyses approuvés.",
    'home.pick.2.t': "Imagerie et radiologie",
    'home.pick.2.d': "Centres d’imagerie et de radiologie approuvés.",
    'home.pick.3.t': "Kinésithérapie",
    'home.pick.3.d': "Centres de kinésithérapie et de rééducation approuvés.",
    'home.pick.4.t': "Vente d’équipements médicaux",
    'home.pick.4.d': "Centres agréés de vente d’équipements médicaux.",
    'home.pick.5.t': "Location d’équipements médicaux",
    'home.pick.5.d': "Centres agréés de location d’équipements médicaux.",
    'home.pick.6.t': 'Zones',
    'home.pick.6.d': "Tripoli, Danniyeh, Zgharta, Koura, Batroun, Beyrouth et le reste du Liban.",
    'home.pick.7.t': "Guide du répertoire",
    'home.pick.7.d': "Comment consulter les centres et offres approuvés.",
    'home.pick.8.t': 'Questions fréquentes',
    'home.pick.8.d': "Réponses sur les services et les réductions approuvées.",

    'home.about.h': 'Qu’est-ce que la plateforme Rafiq ?',
    'home.about.lead': "RAFIQ est un répertoire libanais de centres médicaux, de services complémentaires et d’offres approuvés au préalable par la direction.",
    'home.about.1.h': 'Que faisons-nous ?',
    'home.about.1.d': "Nous présentons les catégories et les centres dont les informations ont été vérifiées et approuvées, avec les canaux officiels de contact.",
    'home.about.2.h': 'Pourquoi passer par une plateforme ?',
    'home.about.2.d': "Aucun centre, logo, annonce ou réduction n’est publié avant vérification et approbation de la direction.",
    'home.about.3.h': 'Que ne faisons-nous pas ?',
    'home.about.3.d': 'Nous ne posons pas de diagnostic, ne prescrivons aucun médicament, ne garantissons ni prix ni disponibilité, et ne traitons aucun paiement par messagerie.',
    'home.about.4.h': "Qui approuve les centres et les offres ?",
    'home.about.4.d': "La direction de RAFIQ uniquement. Aucun centre, aucune offre ni réduction n’est publié sans son accord.",
    'home.about.steps.h': "Fonctionnement du répertoire",
    'home.about.steps.1': "Choisissez une catégorie de service et une région.",
    'home.about.steps.2': "Consultez uniquement les centres approuvés par RAFIQ.",
    'home.about.steps.3': "Vérifiez la valeur et les conditions de la réduction approuvée.",
    'home.about.steps.4': "Contactez le centre et payez-le directement lors de la prestation.",

    'home.svc.h': "Catégories de centres médicaux",
    'home.svc.1.h': "Laboratoires médicaux",
    'home.svc.1.d': "Laboratoires et centres d’analyses approuvés par la direction.",
    'home.svc.2.h': "Imagerie et radiologie",
    'home.svc.2.d': "Centres d’imagerie et de radiologie approuvés.",
    'home.svc.3.h': "Kinésithérapie",
    'home.svc.3.d': "Centres de kinésithérapie et de rééducation approuvés.",
    'home.svc.4.h': "Vente d’équipements médicaux",
    'home.svc.4.d': "Centres agréés de vente d’équipements médicaux.",
    'home.svc.more': 'Détails complets sur la page des services.',
    'home.svc.5.h': "Location d’équipements médicaux",
    'home.svc.5.d': "Centres agréés de location d’équipements médicaux.",
    'home.svc.more.pre': "Voir toutes les catégories sur la",
    'home.svc.more.link': "page des services",

    'home.roles.h': 'La règle de base qui distingue les professions',
    'home.roles.th1': 'Qui est-ce',
    'home.roles.th2': 'Ce qu’il fait',
    'home.roles.th3': 'Quand en avoir besoin',
    'home.roles.1': 'Aidant',
    'home.roles.1.d': 'Toilette, habillage, repas, déplacement, compagnie, routine quotidienne',
    'home.roles.1.w': 'Quand seul un soin quotidien est nécessaire',
    'home.roles.2': 'Infirmier diplômé',
    'home.roles.2.d': 'Gestes médicaux, suivi des médicaments, mesures, pansements',
    'home.roles.2.w': 'Quand un soin infirmier est nécessaire',
    'home.roles.3': 'Kinésithérapeute',
    'home.roles.3.d': 'Exercices de mouvement et rééducation',
    'home.roles.3.w': 'Après un AVC, une blessure ou une intervention',
    'home.roles.note': 'RAFIQ ne pose pas de diagnostic, ne prescrit pas de médicament et ne modifie pas le traitement du médecin. Nous organisons la demande et l’orientons vers le bon service.',

    'home.contact.h': '📲 Contact',
    'home.contact.1.h': "Correspondance officielle",
    'home.contact.1.d': "Correspondance administrative manuelle via WhatsApp.",
    'home.contact.2.h': 'Demande en ligne',
    'home.contact.2.d': 'Remplir le formulaire est plus rapide qu’appeler.',
    'home.contact.3.h': "Informations et conditions",
    'home.contact.3.d': "Consultez la foire aux questions avant de contacter un centre.",

    'nav.home': 'Accueil',
    'nav.homeBrand': 'Accueil RAFIQ',
    'nav.homePage': 'Page d’accueil',
    'nav.allRegions': 'Toutes les zones',
    'nav.services': 'Services',
    'nav.about': 'À propos',
    'nav.faq': 'Questions fréquentes',
    'nav.allServices': 'Tous les services',
    'nav.lebanon': '🇱🇧 Tout le Liban',
    'nav.guide': 'Le guide',
    'nav.guideAlt': 'Le guide des soins',
    'nav.regions': 'Zones',
    'nav.agent': "Assistant RAFIQ",

    'services.title': 'Services RAFIQ | Soins à domicile et soins infirmiers au Liban',
    'services.h1': 'Services RAFIQ',
    'services.tagline': 'Ce que nous proposons aujourd’hui, et ce qui arrive bientôt',
    'services.home.h': 'Soins à domicile',
    'services.home.p': 'Ces quatre services sont opérationnels aujourd’hui. Chaque demande passe par la direction avant la mise en relation.',
    'services.item.1.d': 'Nous organisons les demandes de soins de jour et de nuit, ainsi que l’aide aux personnes qui ne peuvent pas vivre seules : toilette, habillage, repas, déplacement et compagnie au domicile.',
    'services.item.2.d': 'Les demandes de soins à domicile et le suivi des besoins de la personne, selon les informations fournies par la famille et les consignes du médecin.',
    'services.item.3.d': 'Nous mettons en relation les demandes de soins infirmiers avec des infirmiers diplômés, selon la spécialité, l’expérience et la localisation, pour les gestes et le suivi des médicaments.',
    'services.item.4.d': 'Nous organisons les demandes de kinésithérapie et les mettons en relation avec des kinésithérapeutes du réseau RAFIQ, après évaluation de la personne par le spécialiste.',
    'services.soon.h': 'Bientôt sur la plateforme',
    'services.soon.p': 'Ces services sont en cours d’ajout. Nous ne garantissons ni leur disponibilité ni leurs prix avant un accord formel.',
    'services.soon.badge': '⏳ Bientôt',
    'services.soon.1.h': 'Médecins de diverses spécialités',
    'services.soon.1.d': 'Avec la possibilité de contractualiser des médecins de toutes les spécialités à mesure que le réseau de services grandit.',
    'services.soon.2.h': 'Nutritionnistes',
    'services.soon.2.d': 'Dans le cadre du développement du réseau de services sanitaires et complémentaires de RAFIQ.',
    'services.soon.3.h': 'Dentistes',
    'services.soon.3.d': 'Dans le réseau de services médicaux spécialisés de RAFIQ.',
    'services.soon.4.h': 'Orthophonistes',
    'services.soon.4.d': 'Dans le cadre du développement du réseau de services sanitaires et complémentaires de RAFIQ.',
    'services.soon.5.h': 'Matériel médical',
    'services.soon.5.d': 'Fournisseurs de fauteuils roulants, de lits et d’appareils de mesure à domicile.',
    'services.barcode.h': '🎫 Le code-barres de la plateforme',
    'services.barcode.p': 'Chaque membre dispose d’un code-barres consignant son type de service, ses prix et ses remises, et chaque partie contractante d’un code-barres enregistrant le travail effectué.',
    'services.barcode.p2': 'Le code-barres est remis après signature de l’accord, et s’ouvre en scannant un code QR ou depuis le tableau de bord — aucun lien public.',
    'services.barcode.note': 'Aucun numéro de téléphone ni donnée privée n’apparaît avant la signature de l’accord et l’approbation de la direction.',

    'about.title': 'À propos de la plateforme RAFIQ | La confidentialité avant tout',
    'about.h1': 'À propos de la plateforme RAFIQ',
    'about.why.h': "Fonctionnement du répertoire RAFIQ",
    'about.why.1.h': "Centres après approbation",
    'about.why.1.d': "Nous référençons uniquement les centres dont les informations ont été vérifiées et approuvées.",
    'about.why.2.h': "Offres transparentes",
    'about.why.2.d': "Les montants et conditions des réductions ne paraissent qu’après vérification et approbation expresse.",
    'about.why.3.h': "Validation par la direction",
    'about.why.3.d': "La direction de RAFIQ décide seule de l’inscription d’un centre, d’une annonce ou d’une offre.",
    'about.why.4.h': "Paiement direct au centre",
    'about.why.4.d': "Le visiteur contacte et paie directement le centre. RAFIQ ne reçoit pas l’argent des clients.",
    'about.privacy.h': "Validation et confidentialité",
    'about.privacy.p': "Aucune information sur un centre, une offre ou une réduction n’est publiée avant vérification et validation. Les canaux publics ne demandent ni données médicales ni documents personnels.",
    'about.privacy.1.h': "Accord de la direction d’abord",
    'about.privacy.1.d': "Aucun centre, logo ou remise n’est inscrit avant vérification et approbation préalable.",
    'about.privacy.2.h': "Trace de validation",
    'about.privacy.2.d': "Les décisions d’approbation des centres, offres et réductions sont consignées par l’administration.",
    'about.privacy.3.h': "Aucun paiement reçu par RAFIQ",
    'about.privacy.3.d': "Le bénéficiaire paie directement le centre. RAFIQ ne conserve pas l’argent des clients et n’effectue aucun transfert.",
    'about.privacy.4.h': "L’assistant ne décide pas",
    'about.privacy.4.d': "L’assistant fournit des informations générales et n’approuve pas les centres, ne fixe pas les remises et n’émet pas de codes de sa propre initiative.",
    'about.partners.h': "Centres et services médicaux",
    'about.partners.p1': "Le répertoire comprend les laboratoires médicaux, les centres d’imagerie et de radiologie, de kinésithérapie, ainsi que la vente et la location d’équipements médicaux.",
    'about.partners.p2': "Aucun organisme n’est présenté comme partenaire approuvé et aucun nom, logo ou offre n’est affiché sans l’accord de la direction.",
    'about.contact.h': '📱 Contactez-nous',
    'about.contact.1.h': "Correspondance administrative",
    'about.contact.1.d': "Contact administratif manuel via le numéro WhatsApp officiel.",
    'about.contact.2.h': "Canaux officiels de RAFIQ",
    'about.contact.2.d': "Le bot et le canal Telegram, ainsi que le canal WhatsApp pour une publication manuelle.",
    'about.contact.3.h': "Approbation des centres et des offres",
    'about.contact.3.d': "Les centres, offres et réductions sont vérifiés et approuvés avant leur publication.",

    /* ---- le service CV : les prix sont publics et fixes ---- */

    'footer.rights': '© RAFIQ | Rafiq — Nous unissons l’amour et la sécurité pour le soin de la famille',

    /* ---- les quatre pages de services (les quatre premiers choix) ---- */
    'nav.caregivers': 'Pour les aidants',
    'cta.wa': 'WhatsApp RAFIQ',
    'cta.waShort': 'WhatsApp',

    'elderly.h1': 'Soins aux personnes âgées à domicile au Liban',
    'elderly.p': 'RAFIQ aide les familles à organiser les demandes de soins aux personnes âgées à domicile, en regroupant les informations sur la personne, les besoins, l’horaire et la zone, afin qu’elles soient examinées et mises en relation avec les bons aidants.',
    'elderly.h2': 'Ce que le service peut inclure',
    'elderly.li1': 'Aide aux soins personnels et à la toilette.',
    'elderly.li2': 'Aide aux repas et préparation de ce qui est convenu dans le cadre du service.',
    'elderly.li3': 'Compagnie et soutien aux personnes qui ne peuvent pas vivre seules.',
    'elderly.li4': 'Prise en charge de jour ou de nuit, selon la demande.',
    'elderly.li5': 'Aide pour sortir ou se déplacer, selon l’accord conclu.',
    'elderly.p2': 'Les actes médicaux et la prise de médicaments relèvent des consignes du médecin, de l’accord de la famille et du périmètre du prestataire.',

    'patient.h1': 'Soins aux patients à domicile au Liban',
    'patient.p': 'Une famille peut envoyer une demande comprenant les informations du patient, l’état de la personne, le lieu, l’horaire et les besoins. La demande est ensuite examinée et la mise en relation organisée.',
    'patient.h2': 'Pourquoi les détails comptent',
    'patient.p2': 'Le type de pathologie, le degré d’autonomie, l’horaire, l’expérience requise et le lieu des soins aident la direction à comprendre la demande et à choisir les bons prestataires.',
    'patient.p3': 'RAFIQ ne remplace ni le médecin ni l’hôpital, et tout soin médical ou médicamenteux doit relever de la compétence concernée et des instructions médicales approuvées.',

    'nursing.h1': 'Soins infirmiers à domicile au Liban',
    'nursing.p': 'RAFIQ organise les demandes de soins infirmiers à domicile et met les familles en relation avec les infirmiers inscrits sur le réseau de la plateforme, après examen des données et des documents professionnels.',
    'nursing.h2a': 'La mise en relation',
    'nursing.p2': 'La mise en relation peut tenir compte du type de pathologie, de la spécialité, de l’expérience, de la zone, de l’horaire et des services demandés.',
    'nursing.h2b': 'Pour les infirmiers',
    'nursing.p3': 'Aucun abonnement mensuel ni annuel n’est requis pour rejoindre le premier modèle RAFIQ. Les services et les demandes sont traités selon les règles de la plateforme et les accords de travail.',

    'physio.h1': 'Kinésithérapie à domicile au Liban',
    'physio.p': 'RAFIQ organise les demandes de kinésithérapie à domicile et met les familles en relation avec des kinésithérapeutes selon la zone, l’expérience et les services disponibles.',
    'physio.p2': 'Le besoin de soins et le programme adapté sont déterminés par le spécialiste selon l’état de la personne. La plateforme ne remplace ni l’évaluation médicale ni le bilan kinithérapique professionnel.',
    'physio.h2': 'Pour les kinésithérapeutes',
    'physio.p3': 'L’adhésion au premier modèle RAFIQ ne nécessite aucun abonnement mensuel ni annuel.',

    /* ---- les sept pages de zones : un modèle, sept régions ---- */
    'cta.request': 'Envoyer une demande',
    'reg.lebanon.h1': 'Soins à domicile au Liban',
    'reg.lebanon.p': 'RAFIQ construit un réseau national de soins à domicile. Il démarre dans les zones où des prestataires adaptés sont disponibles et s’étend progressivement au reste du Liban.',
    'reg.beirut.h1': 'Soins à domicile à Beyrouth',
    'reg.beirut.p': 'RAFIQ met en place à Beyrouth un réseau de services couvrant les soins, les soins infirmiers, la kinésithérapie et les services complémentaires, selon la disponibilité et les accords.',
    'reg.tripoli.h1': 'Soins à domicile à Tripoli | RAFIQ',
    'reg.tripoli.p': 'RAFIQ organise les demandes de soins à domicile à Tripoli et les met en relation avec les aidants, les infirmiers et les prestataires complémentaires disponibles dans la zone.',
    'reg.zgharta.h1': 'Soins à domicile à Zahlé',
    'reg.zgharta.p': 'RAFIQ développe son réseau de prestataires à Zahlé et organise les demandes de soins à domicile selon les besoins des familles et la disponibilité des prestataires.',
    'reg.koura.h1': 'Soins à domicile dans le Koura',
    'reg.koura.p': 'RAFIQ organise les demandes des familles du Koura et les met en relation avec des aidants, des infirmiers et des prestataires complémentaires selon la disponibilité.',
    'reg.batroun.h1': 'Soins à domicile à Batroun',
    'reg.batroun.p': 'Le réseau RAFIQ grandit progressivement à Batroun, avec l’enregistrement des prestataires, la vérification de leurs informations et l’organisation des demandes des familles.',
    'reg.dinniyeh.h1': 'Soins à domicile à Dennié',
    'reg.dinniyeh.p': 'Les familles de Dennié peuvent envoyer une demande de soins à domicile comprenant l’état de la personne, le lieu et l’horaire. Elle est examinée selon les prestataires disponibles dans la zone.',

    /* ---- les quatre guides accessibles depuis le guide des soins ---- */
    'g.choose.h1': 'Comment choisir un aidant pour une personne âgée ?',
    'g.choose.p': 'Commencez par définir le niveau d’autonomie, les besoins quotidiens et l’horaire. Vérifiez ensuite l’expérience de l’aidant, les services proposés, la zone, les langues et la disponibilité. Dans les cas médicaux ou complexes, définissez le besoin professionnel adapté avec le médecin ou l’équipe médicale.',
    'g.vsnurse.h1': 'La différence entre un aidant et un infirmier',
    'g.vsnurse.p': 'L’aidant se concentre sur l’aide quotidienne, les soins personnels et la compagnie dans le cadre du service. L’infirmier est habilité aux gestes de soins dans sa spécialité et sous son autorisation. Le service adapté dépend de l’état et des besoins de la personne, ainsi que des consignes de l’équipe médicale lorsque nécessaire.',
    'g.elderlyhome.h1': 'Prendre soin d’une personne âgée à domicile',
    'g.elderlyhome.p': 'Un bon accompagnement commence par comprendre les besoins de la personne, son rythme et son autonomie pour se déplacer, se nourrir et assurer sa toilette. Il faut maintenir un environnement sûr, surveiller tout changement de santé et prévenir le médecin ou la famille si nécessaire, sans dépasser le périmètre du prestataire.',
    'g.hospital.h1': 'Prendre soin d’un patient après sa sortie de l’hôpital',
    'g.hospital.p': 'Avant le retour à domicile, il aide à la famille de connaître les consignes du médecin, les médicaments, le suivi, la mobilité, l’alimentation et le matériel ou les soins nécessaires. Une demande RAFIQ peut ensuite être envoyée avec les bonnes informations afin d’aider à déterminer le type de prestataire requis.',

    /* ---- les rangs 5, 6 et 7 de la page d’accueil ---- */
    'care.h1': 'Pour les aidants au Liban',
    'care.i1.h': 'Inscription',
    'care.i1.d': 'Déclarer son expérience, ses services, ses langues, ses zones et ses documents professionnels afin qu’ils soient examinés.',
    'care.i2.h': 'Missions de soins',
    'care.i2.d': 'Organiser les opportunités et les demandes de soins et les mettre en relation avec les profils adaptés, selon les besoins de la famille.',
    'care.i3.h': 'Un CV professionnel compatible ATS',
    'care.i3.d': 'Un CV professionnel en arabe et en anglais, établi à partir des informations que vous fournissez.',
    'care.i4.h': 'Sans abonnement',
    'care.i4.d': 'Aucun abonnement mensuel ni annuel pour les aidants dans le premier modèle RAFIQ.',

    'regions.h1': 'Zones de services RAFIQ au Liban',
    'regions.p': 'Nous construisons au Liban un réseau de services capable de s’étendre, en commençant par les zones où des prestataires adaptés sont disponibles.',
    'regions.i1.h': 'Tripoli',
    'regions.i1.d': 'Soins à domicile, soins aux personnes âgées, soins infirmiers et services complémentaires, selon la disponibilité.',
    'regions.i2.h': 'Dennié',
    'regions.i2.d': 'Demandes de soins à domicile et prestataires, selon la zone et la disponibilité.',
    'regions.i3.h': 'Zahlé',
    'regions.i3.d': 'Les demandes sont organisées et reliées aux prestataires du réseau.',
    'regions.i4.h': 'Koura',
    'regions.i4.d': 'Services de soins à domicile, selon la couverture disponible.',
    'regions.i5.h': 'Batroun',
    'regions.i5.d': 'Développement du réseau de prestataires, selon la disponibilité.',
    'regions.i6.h': 'Beyrouth',
    'regions.i6.d': 'Services de soins et de soins infirmiers, avec l’extension du réseau.',
    'regions.i7.h': 'Reste du Liban',
    'regions.i7.d': 'Nous étendons le réseau progressivement, selon les prestataires disponibles et les demandes reçues.',

    'guide.h1': 'Le guide des soins à domicile RAFIQ',
    'guide.i1.h': 'Comment choisir un aidant pour une personne âgée ?',
    'guide.i1.d': 'Commencez par définir le degré d’autonomie, l’horaire, les services nécessaires et l’expérience adaptée à la situation.',
    'guide.i2.h': 'Aidant ou infirmier ?',
    'guide.i2.d': 'L’aidant se concentre sur l’aide et les soins quotidiens dans le cadre du service, tandis que l’infirmier est habilité aux gestes de soins dans sa spécialité et sous son autorisation.',
    'guide.i3.h': 'Soins à une personne âgée à domicile',
    'guide.i3.d': 'Organiser le rythme quotidien, la sécurité, la toilette, les repas et la compagnie, selon les besoins de la personne.',
    'guide.i4.h': 'Après la sortie de l’hôpital',
    'guide.i4.d': 'La famille définit avec le médecin ou l’équipe médicale les besoins à domicile, puis peut envoyer une demande adaptée via RAFIQ.',
    'guide.faq.h': 'Questions fréquentes des familles',
    'guide.q1': 'Y a-t-il un abonnement pour la famille ?',
    'guide.a1': 'Cela dépend du modèle de service approuvé pour chaque demande. Les conditions sont affichées avant tout accord.',
    'guide.q2': 'Y a-t-il un abonnement pour l’aidant ?',
    'guide.a2': 'Il n’y a aucun abonnement mensuel ni annuel pour les membres du premier modèle RAFIQ.',
    'guide.q3': 'Y aura-t-il des remises ?',
    'guide.a3': 'RAFIQ construit des accords avec des laboratoires, des centres d’imagerie et des fournisseurs de matériel et de services de santé. Toute remise n’est annoncée qu’après son approbation et sa conclusion formelle.',

    /* ---- la FAQ : la page vers laquelle mène chaque barre de navigation ---- */
    'faq.h1': 'Questions fréquentes sur les soins à domicile',
    'faq.p': 'Des réponses claires avant de décider',
    'faq.s1.h': '🏠 Prise en charge d’une demande',
    'faq.s1.q1': 'Demandes de soins aux personnes âgées',
    'faq.s1.a1': 'Nous organisons les soins de jour, de nuit ou en résidence selon l’état de la personne, la zone et l’horaire. Nous commençons par recueillir l’âge, la zone, la capacité à marcher, les besoins de soins et la nécessité d’un suivi infirmier ou kinithérapique.',
    'faq.s1.q2': 'Demandes de soins aux patients',
    'faq.s1.a2': 'Nous organisons les soins à domicile des patients selon les consignes du médecin. Nous établissons le motif des soins tel que la famille le décrit, si le patient est à domicile ou sorti de l’hôpital, l’horaire, la mobilité, et les besoins en soins infirmiers et en kinésithérapie.',
    'faq.s2.h': '👥 La différence entre les prestataires',
    'faq.th1': 'Rôle',
    'faq.th2': 'Ce qu’il fait',
    'faq.th3': 'Quand en avoir besoin',
    'faq.r1': 'Aidant',
    'faq.r1.d': 'Toilette, habillage, repas, déplacement, compagnie, routine quotidienne',
    'faq.r1.w': 'Quand seul un soin quotidien est nécessaire',
    'faq.r2': 'Infirmier diplômé',
    'faq.r2.d': 'Gestes médicaux, suivi des médicaments, mesures, pansements',
    'faq.r2.w': 'Quand un soin infirmier est nécessaire',
    'faq.r3': 'Kinésithérapeute',
    'faq.r3.d': 'Exercices de mouvement et rééducation',
    'faq.r3.w': 'Après un AVC, une blessure ou une intervention',
    'faq.s3.h': '🏥 Après la sortie de l’hôpital',
    'faq.s3.q1': 'Que devons-nous savoir ?',
    'faq.s3.a1': 'Le type d’intervention, les consignes du médecin après la sortie, si le patient peut marcher, s’il a besoin d’aide pour la toilette ou l’habillage, s’il faut suivre les médicaments, s’il y a des plaies ou du matériel, le nombre d’heures et la zone.',
    'faq.s3.note': 'RAFIQ ne pose pas de diagnostic, ne prescrit pas et ne modifie pas un traitement. Nous organisons la demande et l’orientons vers le bon service.',
    'faq.s4.h': '🌙 Soins de nuit et 24 heures',
    'faq.s4.q1': 'Existe-t-il une garde de 24 heures ?',
    'faq.s4.a1': 'Oui, et une demande peut être faite pour une organisation partagée selon les disponibilités des prestataires. Nous établissons l’état du patient, s’il faut une surveillance continue, s’il peut se déplacer, s’il faut des soins de nuit et s’il y a des besoins infirmiers.',
    'faq.s5.h': '💊 Médicaments et pansements',
    'faq.s5.q1': 'Qui donne le médicament ?',
    'faq.s5.a1': 'Les médicaments sont gérés selon l’ordonnance et les consignes du médecin et l’accord de la famille. Si la situation demande une compétence ou un suivi infirmier, la demande est envoyée à un infirmier diplômé.',
    'faq.s6.h': '🧹 Cuisine, ménage et conduite',
    'faq.s6.q1': 'Qu’est-ce qui est compris et qu’est-ce qui est en supplément ?',
    'faq.s6.a1': 'Les soins personnels comprennent la toilette, l’aide aux repas et l’organisation des besoins quotidiens. La cuisine, le ménage, la conduite et l’accompagnement hors du domicile sont des tâches supplémentaires fixées à l’avance par accord.',
    'faq.s7.h': '💰 Prix et disponibilité',
    'faq.s7.q1': 'Pourquoi aucun prix certain n’est-il affiché ?',
    'faq.s7.a1': 'Parce que le prix dépend du type de soins, du nombre d’heures, de l’état et de l’expérience. Les prix sont affichés après l’examen de la demande et la confirmation du prestataire. Nous ne garantissons ni un prix incertain ni une disponibilité incertaine.',
    'faq.s8.h': '🛡️ Confiance et responsabilité',
    'faq.s8.q1': 'Comment savoir que la personne convient ?',
    'faq.s8.a1': 'Les informations professionnelles et l’expérience sont recueillies et examinées selon les procédures de la plateforme. La mise en relation se fait sur la base de l’état, de l’expérience, des services, de la zone et de la disponibilité.',
    'faq.s8.q2': 'Qui est responsable d’une erreur ?',
    'faq.s8.a2': 'Les responsabilités sont définies dans le contrat. L’aidant assume la responsabilité professionnelle et juridique de toute erreur ou négligence dont il est démontré qu’elle provient de lui.',

    'safety.nodiagnose': 'Nous ne posons pas de diagnostic, ne prescrivons pas et ne modifions pas un traitement médical.'
  };

  RAFIQ_I18N.register('fr', dict);
})();


/* ===================== bundled: %s ===================== */

/* RAFIQ — Italian bundle. Missing keys fall back to Arabic. */
(function () {
  var dict = {

    'lang.note': 'Scegli la lingua — il testo cambia subito.',
    'notice.partial': 'Alcune sezioni di questa pagina sono ancora in arabo. Le stiamo completando.',
    'notice.page': 'Il menu è nella tua lingua, ma il testo di questa pagina è ancora in arabo. Lo stiamo completando.',

    /* ---- install button: every message the button can show ---- */
    'install.steps.ios': 'Tocca il pulsante Condividi ⬆︎ in basso, poi «Aggiungi alla schermata Home», poi «Aggiungi».',
    'install.steps.android': 'Apri il menu del browser ⋮, poi «Installa app» oppure «Aggiungi alla schermata Home».',
    'install.steps.desktop': 'Fai clic sull’icona di installazione ⊕ nella barra degli indirizzi del browser.',
    'install.ready': 'Tocca «Installa l’app» per aggiungerla al tuo dispositivo.',
    'install.done': 'Installazione completata ✅ l’app è ora sulla tua schermata.',
    'install.https': 'L’installazione richiede una connessione sicura (https). Il sito funziona normalmente per ora.',
    'install.noButton': 'Questo browser non mostra il pulsante di installazione. ',
    'reason.installed': 'L’app è già installata su questo dispositivo.',
    'reason.https': 'L’installazione richiede un collegamento https sicuro: il pulsante funzionerà appena lo aprirai lì.',
    'reason.noSW': 'Questo browser non supporta l’installazione delle app. Apri il sito in Chrome.',
    'reason.noManifest': 'Il file dell’app non è ancora disponibile su questo server.',
    'reason.ios': 'Su iPhone: il pulsante Condividi ⬆︎, poi «Aggiungi alla schermata Home», poi «Aggiungi».',
    'reason.noPrompt': 'Apri il menu del browser ⋮, poi «Installa app». Se l’opzione non compare, riapri il sito dal link diretto.',

    'home.title': "RAFIQ | Elenco dei centri medici approvati in Libano",
    'home.h1': 'Rafiq | RAFIQ',
    'home.tagline': 'Uniamo amore e sicurezza alla cura della famiglia',
    'home.who': "Elenco dei centri medici e delle offerte approvate in Libano.",
    'home.cta.main': "Consulta i centri",
    'home.cta.main.sub': "Categorie e aree approvate",
    'home.cta.wa': 'WhatsApp',
    'home.cta.wa.sub': "Corrispondenza manuale",
    'home.cta.bot': "Canale Telegram",
    'home.cta.bot.sub': "Annunci approvati",
    'home.install': '📲 Installa l’app',

    'home.pick.title': "Scegli una categoria di servizio",
    'home.pick.1.t': "Laboratori medici",
    'home.pick.1.d': "Laboratori e centri di analisi approvati.",
    'home.pick.2.t': "Diagnostica per immagini",
    'home.pick.2.d': "Centri di diagnostica per immagini e radiologia approvati.",
    'home.pick.3.t': "Fisioterapia",
    'home.pick.3.d': "Centri di fisioterapia e riabilitazione approvati.",
    'home.pick.4.t': "Vendita di attrezzature mediche",
    'home.pick.4.d': "Centri approvati per la vendita di attrezzature mediche.",
    'home.pick.5.t': "Noleggio di attrezzature mediche",
    'home.pick.5.d': "Centri approvati per il noleggio di attrezzature mediche.",
    'home.pick.6.t': 'Zone',
    'home.pick.6.d': "Tripoli, Danniyeh, Zgharta, Koura, Batroun, Beirut e il resto del Libano.",
    'home.pick.7.t': "Guida al catalogo",
    'home.pick.7.d': "Come consultare centri e offerte approvati.",
    'home.pick.8.t': 'Domande frequenti',
    'home.pick.8.d': "Risposte sui servizi e sugli sconti approvati.",

    'home.about.h': 'Cos’è la piattaforma Rafiq?',
    'home.about.lead': "RAFIQ è un catalogo libanese di centri medici, servizi di supporto e offerte approvati in anticipo dalla direzione.",
    'home.about.1.h': 'Cosa facciamo?',
    'home.about.1.d': "Presentiamo categorie e centri i cui dati sono stati verificati e approvati, con i canali ufficiali di contatto.",
    'home.about.2.h': 'Perché passare da una piattaforma?',
    'home.about.2.d': "Non pubblichiamo un centro, un logo, una pubblicità o uno sconto prima della verifica e dell’approvazione della direzione.",
    'home.about.3.h': 'Cosa non facciamo?',
    'home.about.3.d': 'Non formuliamo diagnosi, non prescriviamo farmaci, non garantiamo prezzi o disponibilità, e non gestiamo pagamenti in chat.',
    'home.about.4.h': "Chi approva centri e offerte?",
    'home.about.4.d': "Solo la direzione RAFIQ. Nessun centro, offerta o sconto viene pubblicato senza approvazione.",
    'home.about.steps.h': "Come funziona il catalogo",
    'home.about.steps.1': "Scegli la categoria del servizio e la zona.",
    'home.about.steps.2': "Consulta solo i centri approvati da RAFIQ.",
    'home.about.steps.3': "Verifica valore e condizioni dello sconto approvato.",
    'home.about.steps.4': "Contatta direttamente il centro e paga il centro al momento del servizio.",

    'home.svc.h': "Categorie dei centri medici",
    'home.svc.1.h': "Laboratori medici",
    'home.svc.1.d': "Laboratori e centri di analisi approvati dalla direzione.",
    'home.svc.2.h': "Diagnostica per immagini",
    'home.svc.2.d': "Centri di diagnostica per immagini e radiologia approvati.",
    'home.svc.3.h': "Fisioterapia",
    'home.svc.3.d': "Centri di fisioterapia e riabilitazione approvati.",
    'home.svc.4.h': "Vendita di attrezzature mediche",
    'home.svc.4.d': "Centri approvati per la vendita di attrezzature mediche.",
    'home.svc.more': 'Tutti i dettagli nella pagina dei servizi.',
    'home.svc.5.h': "Noleggio di attrezzature mediche",
    'home.svc.5.d': "Centri approvati per il noleggio di attrezzature mediche.",
    'home.svc.more.pre': "Consulta tutte le categorie nella",
    'home.svc.more.link': "pagina dei servizi",

    'home.roles.h': 'La regola di base che distingue le professioni',
    'home.roles.th1': 'Chi è',
    'home.roles.th2': 'Cosa fa',
    'home.roles.th3': 'Quando serve',
    'home.roles.1': 'Badante',
    'home.roles.1.d': 'Igiene, vestiti, pasti, movimento, compagnia, routine quotidiana',
    'home.roles.1.w': 'Quando serve solo assistenza quotidiana',
    'home.roles.2': 'Infermiere abilitato',
    'home.roles.2.d': 'Procedure mediche, somministrazione di farmaci, misurazioni, medicazioni',
    'home.roles.2.w': 'Quando serve una competenza infermieristica',
    'home.roles.3': 'Fisioterapista',
    'home.roles.3.d': 'Esercizi di movimento e riabilitazione',
    'home.roles.3.w': 'Dopo ictus, infortunio o intervento',
    'home.roles.note': 'RAFIQ non formula diagnosi, non prescrive farmaci e non modifica la cura del medico. Organizziamo la richiesta e la indirizziamo al servizio giusto.',

    'home.contact.h': '📲 Contatti',
    'home.contact.1.h': "Corrispondenza ufficiale",
    'home.contact.1.d': "Corrispondenza amministrativa manuale tramite WhatsApp.",
    'home.contact.2.h': 'Richiesta online',
    'home.contact.2.d': 'Compilare il modulo è più veloce che telefonare.',
    'home.contact.3.h': "Informazioni e condizioni",
    'home.contact.3.d': "Consulta le domande frequenti prima di contattare un centro.",

    'nav.home': 'Home',
    'nav.homeBrand': 'Home RAFIQ',
    'nav.homePage': 'Pagina principale',
    'nav.allRegions': 'Tutte le zone',
    'nav.services': 'Servizi',
    'nav.about': 'Chi siamo',
    'nav.faq': 'Domande frequenti',
    'nav.allServices': 'Tutti i servizi',
    'nav.lebanon': '🇱🇧 Tutto il Libano',
    'nav.guide': 'La guida',
    'nav.guideAlt': 'La guida all’assistenza',
    'nav.regions': 'Zone',
    'nav.agent': "Assistente RAFIQ",

    'services.title': 'Servizi RAFIQ | Assistenza domiciliare e infermieristica in Libano',
    'services.h1': 'Servizi RAFIQ',
    'services.tagline': 'Cosa offriamo oggi e cosa arriva presto',
    'services.home.h': 'Assistenza domiciliare',
    'services.home.p': 'Questi quattro servizi sono attivi oggi. Ogni richiesta passa dalla direzione prima dell’abbinamento.',
    'services.item.1.d': 'Organizziamo le richieste di assistenza diurna e notturna e l’aiuto a chi non riesce a vivere da solo: igiene, vestiti, pasti, movimento e compagnia in casa.',
    'services.item.2.d': 'Richieste di assistenza domiciliare e monitoraggio dei bisogni della persona, in base alle informazioni fornite dalla famiglia e alle indicazioni del medico.',
    'services.item.3.d': 'Colleghiamo le richieste di assistenza infermieristica a infermieri abilitati in base a specializzazione, esperienza e zona, per le procedure e la somministrazione dei farmaci.',
    'services.item.4.d': 'Organizziamo le richieste di fisioterapia e le colleghiamo ai fisioterapisti della rete RAFIQ, dopo che lo specialista ha valutato il paziente.',
    'services.soon.h': 'Presto sulla piattaforma',
    'services.soon.p': 'Questi servizi sono in aggiunta. Non promettiamo disponibilità né prezzi prima di un accordo formale.',
    'services.soon.badge': '⏳ In arrivo',
    'services.soon.1.h': 'Medici di varie specialità',
    'services.soon.1.d': 'Con la possibilità di stipulare accordi con medici di tutte le specialità man mano che la rete dei servizi cresce.',
    'services.soon.2.h': 'Nutrizionisti',
    'services.soon.2.d': 'Nell’ambito dello sviluppo della rete RAFIQ di servizi sanitari e di supporto.',
    'services.soon.3.h': 'Dentisti',
    'services.soon.3.d': 'Nella rete RAFIQ di servizi medici specialistici.',
    'services.soon.4.h': 'Logopedisti',
    'services.soon.4.d': 'Nell’ambito dello sviluppo della rete RAFIQ di servizi sanitari e di supporto.',
    'services.soon.5.h': 'Attrezzature mediche',
    'services.soon.5.d': 'Fornitori di sedie a rotelle, letti e dispositivi di misura per uso domestico.',
    'services.barcode.h': '🎫 Il codice a barre della piattaforma',
    'services.barcode.p': 'Ogni membro ha un codice a barre che registra tipo di servizio, prezzi e sconti, e ogni parte contraente ne ha uno che registra il lavoro svolto.',
    'services.barcode.p2': 'Il codice a barre viene consegnato dopo la firma dell’accordo e si apre scansionando un QR code o dal cruscotto del manager — non esiste un link pubblico.',
    'services.barcode.note': 'Nessun numero di telefono o dato privato compare prima della firma dell’accordo e dell’approvazione della direzione.',

    'about.title': 'Informazioni sulla piattaforma RAFIQ | Prima di tutto la privacy',
    'about.h1': 'Informazioni sulla piattaforma RAFIQ',
    'about.why.h': "Come funziona il catalogo RAFIQ",
    'about.why.1.h': "Centri dopo l’approvazione",
    'about.why.1.d': "Elenco solo i centri i cui dati sono stati verificati e approvati dalla direzione.",
    'about.why.2.h': "Offerte chiare",
    'about.why.2.d': "Valore e condizioni degli sconti appaiono solo dopo verifica e approvazione esplicita.",
    'about.why.3.h': "Verifica della direzione",
    'about.why.3.d': "Solo la direzione RAFIQ decide se inserire un centro, un annuncio o un’offerta.",
    'about.why.4.h': "Pagamento diretto al centro",
    'about.why.4.d': "Il visitatore contatta e paga direttamente il centro. RAFIQ non riceve denaro dai clienti.",
    'about.privacy.h': "Approvazione e privacy",
    'about.privacy.p': "Non pubblichiamo dati di centri, offerte o sconti prima della verifica e dell’approvazione della direzione. I canali pubblici non chiedono dati medici né documenti personali.",
    'about.privacy.1.h': "Prima l’approvazione della direzione",
    'about.privacy.1.d': "Nessun centro, logo o sconto viene inserito prima della verifica e dell’approvazione.",
    'about.privacy.2.h': "Registro delle verifiche",
    'about.privacy.2.d': "Le decisioni di approvazione di centri, offerte e sconti vengono documentate dall’amministrazione.",
    'about.privacy.3.h': "RAFIQ non riceve pagamenti dei clienti",
    'about.privacy.3.d': "Il beneficiario paga direttamente il centro. RAFIQ non trattiene denaro dei clienti e non effettua trasferimenti.",
    'about.privacy.4.h': "L’assistente non decide",
    'about.privacy.4.d': "L’assistente fornisce informazioni generali; non approva centri, non stabilisce sconti e non emette codici autonomamente.",
    'about.partners.h': "Centri e servizi medici",
    'about.partners.p1': "Il catalogo comprende laboratori medici, centri di diagnostica per immagini e radiologia, fisioterapia, vendita e noleggio di attrezzature mediche.",
    'about.partners.p2': "Nessuna organizzazione è presentata come partner approvato e nessun nome, logo o offerta viene mostrato senza il consenso della direzione.",
    'about.contact.h': '📱 Contattaci',
    'about.contact.1.h': "Corrispondenza amministrativa",
    'about.contact.1.d': "Contatto amministrativo manuale tramite il numero WhatsApp ufficiale.",
    'about.contact.2.h': "Canali ufficiali RAFIQ",
    'about.contact.2.d': "Bot e canale Telegram, oltre al canale WhatsApp per la pubblicazione manuale.",
    'about.contact.3.h': "Approvazione di centri e offerte",
    'about.contact.3.d': "Centri, offerte e sconti vengono verificati e approvati prima della pubblicazione.",

    /* ---- il servizio CV: i prezzi sono pubblici e fissi ---- */

    'footer.rights': '© RAFIQ | Rafiq — Uniamo amore e sicurezza alla cura della famiglia',

    /* ---- le quattro pagine dei servizi (le prime quattro scelte) ---- */
    'nav.caregivers': 'Per i badanti',
    'cta.wa': 'WhatsApp RAFIQ',
    'cta.waShort': 'WhatsApp',

    'elderly.h1': 'Assistenza agli anziani a domicilio in Libano',
    'elderly.p': 'RAFIQ aiuta le famiglie a organizzare le richieste di assistenza agli anziani a domicile, raccogliendo i dati della persona, le esigenze, l’orario e la zona, perché vengano verificate e abbinate ai badanti più adatti.',
    'elderly.h2': 'Che cosa può comprendere il servizio',
    'elderly.li1': 'Aiuto all’igiene personale e alla toilette.',
    'elderly.li2': 'Aiuto ai pasti e preparazione di quanto concordato nei limiti del servizio.',
    'elderly.li3': 'Compagnia e sostegno a chi non riesce a vivere da solo.',
    'elderly.li4': 'Assistenza diurna o notturna, come richiesto.',
    'elderly.li5': 'Aiuto per uscire o spostarsi, come concordato.',
    'elderly.p2': 'Gli atti medici e la somministrazione dei farmaci seguono le indicazioni del medico, l’accordo della famiglia e l’ambito di intervento del fornitore.',

    'patient.h1': 'Assistenza ai pazienti a domicilio in Libano',
    'patient.p': 'Una famiglia può inviare una richiesta con i dati del paziente, lo stato di salute, il luogo, l’orario e le esigenze. La richiesta viene poi verificata e organizzato l’abbinamento più adatto.',
    'patient.h2': 'Perché i dettagli contano',
    'patient.p2': 'Il tipo di patologia, il grado di autosufficienza, l’orario, l’esperienza richiesta e il luogo dell’assistenza aiutano la direzione a capire la richiesta e a scegliere i fornitori giusti.',
    'patient.p3': 'RAFIQ non sostituisce il medico né l’ospedale, e ogni assistenza medica o farmacologica deve svolgersi nel rispetto della competenza e delle istruzioni mediche approvate.',

    'nursing.h1': 'Infermieristica domiciliare in Libano',
    'nursing.p': 'RAFIQ organizza le richieste di infermieristica domiciliare e collega le famiglie agli infermieri iscritti sulla rete della piattaforma, dopo la verifica dei dati e dei documenti professionali.',
    'nursing.h2a': 'L’abbinamento',
    'nursing.p2': 'L’abbinamento può tenere conto del tipo di patologia, della specializzazione, dell’esperienza, della zona, dell’orario e dei servizi richiesti.',
    'nursing.h2b': 'Per gli infermieri',
    'nursing.p3': 'Nel primo modello RAFIQ non è richiesto alcun abbonamento mensile o annuale. Servizi e richieste sono gestiti secondo le regole della piattaforma e gli accordi di lavoro.',

    'physio.h1': 'Fisioterapia domiciliare in Libano',
    'physio.p': 'RAFIQ organizza le richieste di fisioterapia domiciliare e collega le famiglie ai fisioterapisti in base alla zona, all’esperienza e ai servizi disponibili.',
    'physio.p2': 'Il bisogno terapeutico e il programma adatto sono stabiliti dallo specialista in base allo stato della persona. La piattaforma non sostituisce né la valutazione medica né la valutazione professionale della fisioterapia.',
    'physio.h2': 'Per i fisioterapisti',
    'physio.p3': 'L’adesione al primo modello RAFIQ non richiede alcun abbonamento mensile o annuale.',

    /* ---- le sette pagine delle aree: un modello, sette regioni ---- */
    'cta.request': 'Invia una richiesta',
    'reg.lebanon.h1': 'Assistenza domiciliare in Libano',
    'reg.lebanon.p': 'RAFIQ sta costruendo una rete nazionale di assistenza domiciliare. Parte dalle aree in cui sono disponibili fornitori adatti e si estende gradualmente al resto del Libano.',
    'reg.beirut.h1': 'Assistenza domiciliare a Beirut',
    'reg.beirut.p': 'RAFIQ mette a Beirut una rete di servizi che comprende assistenza, infermieristica, fisioterapia e servizi di supporto, in base alla disponibilità e agli accordi.',
    'reg.tripoli.h1': 'Assistenza domiciliare a Tripoli | RAFIQ',
    'reg.tripoli.p': 'RAFIQ organizza le richieste di assistenza domiciliare a Tripoli e le collega a badanti, infermieri e fornitori di supporto disponibili nella zona.',
    'reg.zgharta.h1': 'Assistenza domiciliare a Zahlé',
    'reg.zgharta.p': 'RAFIQ sta estendendo la propria rete di fornitori a Zahlé e organizza le richieste di assistenza domiciliare secondo i bisogni delle famiglie e la disponibilità.',
    'reg.koura.h1': 'Assistenza domiciliare nel Koura',
    'reg.koura.p': 'RAFIQ organizza le richieste delle famiglie del Koura e le abina a badanti, infermieri e fornitori di supporto in base alla disponibilità.',
    'reg.batroun.h1': 'Assistenza domiciliare a Batroun',
    'reg.batroun.p': 'La rete RAFIQ cresce gradualmente a Batroun, con la registrazione dei fornitori, la verifica dei loro dati e l’organizzazione delle richieste delle famiglie.',
    'reg.dinniyeh.h1': 'Assistenza domiciliare a Dennié',
    'reg.dinniyeh.p': 'Le famiglie di Dennié possono inviare una richiesta di assistenza domiciliare con i dati della persona, il luogo e l’orario. Viene verificata in base ai fornitori disponibili nella zona.',

    /* ---- le quattro guide raggiungibili dalla guida all’assistenza ---- */
    'g.choose.h1': 'Come si sceglie un badante per una persona anziana?',
    'g.choose.p': 'Iniziate definendo il livello di autosufficienza, i bisogni quotidiani e l’orario. Poi verificate l’esperienza del badante, i servizi offerti, la zona, le lingue e la disponibilità. Nei casi medici o complessi, definite la necessità professionale più adatta insieme al medico o all’équipe medica.',
    'g.vsnurse.h1': 'La differenza tra un badante e un infermiere',
    'g.vsnurse.p': 'Il badante si occupa dell’aiuto quotidiano, della cura della persona e della compagnia nei limiti del servizio. L’infermiere è abilitato agli atti di assistenza infermieristica nella sua specializzazione e sotto la propria abilitazione. Il servizio più adatto dipende dalle condizioni e dai bisogni della persona e dalle indicazioni dell’équipe medica quando necessario.',
    'g.elderlyhome.h1': 'Prendersi cura di una persona anziana a domicilio',
    'g.elderlyhome.p': 'Una buona assistenza comincia dal comprendere i bisogni della persona, la sua routine e quanto sia in grado di muoversi, mangiare ebad curarsi. Va mantenuto un ambiente sicuro, osservare ogni variazione di salute e avvisare il medico o la famiglia quando serve, senza superare l’ambito di intervento del fornitore.',
    'g.hospital.h1': 'Assistenza a un paziente dopo la dimissione',
    'g.hospital.p': 'Prima del rientro a casa, è utile che la famiglia conosca le indicazioni del medico, i farmaci, il follow-up, il movimento, l’alimentazione e l’eventuale materiale o assistenza necessaria. Si può poi inviare una richiesta RAFIQ con i dati giusti per aiutare a individuare il tipo di fornitore necessario.',

    /* ---- le posizioni 5, 6 e 7 della home ---- */
    'care.h1': 'Per i badanti in Libano',
    'care.i1.h': 'Registrazione',
    'care.i1.d': 'Registrate esperienza, servizi, lingue, zone e documenti professionali perché vengano verificati.',
    'care.i2.h': 'Offerte di lavoro assistenziale',
    'care.i2.d': 'Organizziamo offerte e richieste di assistenza e le abbiniamo ai profili più adatti, secondo le esigenze della famiglia.',
    'care.i3.h': 'Un CV professionale compatibile con gli ATS',
    'care.i3.d': 'Un CV professionale in arabo e in inglese, costruito sulle informazioni che fornite.',
    'care.i4.h': 'Nessun abbonamento',
    'care.i4.d': 'Nel primo modello RAFIQ non esiste alcun abbonamento mensile o annuale per i badanti.',

    'regions.h1': 'Zone di servizio RAFIQ in Libano',
    'regions.p': 'Stiamo costruendo in Libano una rete di servizi in grado di crescere, partendo dalle aree in cui sono disponibili fornitori adatti.',
    'regions.i1.h': 'Tripoli',
    'regions.i1.d': 'Assistenza domiciliare, assistenza agli anziani, infermieristica e servizi di supporto, secondo la disponibilità.',
    'regions.i2.h': 'Dennié',
    'regions.i2.d': 'Richieste di assistenza domiciliare e fornitori, in base alla zona e alla disponibilità.',
    'regions.i3.h': 'Zahlé',
    'regions.i3.d': 'Le richieste vengono organizzate e collegate ai fornitori della rete.',
    'regions.i4.h': 'Koura',
    'regions.i4.d': 'Servizi di assistenza domiciliare, secondo la copertura disponibile.',
    'regions.i5.h': 'Batroun',
    'regions.i5.d': 'Estensione della rete di fornitori, secondo la disponibilità.',
    'regions.i6.h': 'Beirut',
    'regions.i6.d': 'Servizi di assistenza e infermieristici con il crescere della rete.',
    'regions.i7.h': 'Resto del Libano',
    'regions.i7.d': 'Estendiamo la rete gradualmente, in base ai fornitori disponibili e alle richieste ricevute.',

    'guide.h1': 'La guida all’assistenza domiciliare RAFIQ',
    'guide.i1.h': 'Come scegliere un badante per una persona anziana?',
    'guide.i1.d': 'Iniziate definendo il grado di autosufficienza, l’orario, i servizi necessari e l’esperienza adatta alla situazione.',
    'guide.i2.h': 'Badante o infermiere?',
    'guide.i2.d': 'Il badante si occupa dell’aiuto e della cura quotidiana nei limiti del servizio, mentre l’infermiere è abilitato agli atti di assistenza nella sua specializzazione e sotto la propria abilitazione.',
    'guide.i3.h': 'Assistenza a una persona anziana a domicilio',
    'guide.i3.d': 'Organizzare la routine quotidiana, la sicurezza, l’igiene, i pasti e la compagnia, secondo i bisogni della persona.',
    'guide.i4.h': 'Dopo la dimissione',
    'guide.i4.d': 'La famiglia definisce con il medico o l’équipe medica i bisogni domestici, e può poi inviare una richiesta adatta tramite RAFIQ.',
    'guide.faq.h': 'Domande frequenti delle famiglie',
    'guide.q1': 'C’è un abbonamento per la famiglia?',
    'guide.a1': 'Dipende dal modello di servizio approvato per ogni richiesta. Le condizioni sono mostrate prima di qualsiasi accordo.',
    'guide.q2': 'C’è un abbonamento per il badante?',
    'guide.a2': 'Non esiste alcun abbonamento mensile o annuale per i membri del primo modello RAFIQ.',
    'guide.q3': 'Ci saranno sconti?',
    'guide.a3': 'RAFIQ sta costruendo accordi con laboratori, centri di diagnostica e fornitori di materiale e servizi sanitari. Qualsiasi sconto viene annunciato solo dopo l’approvazione e la formalizzazione dell’accordo.',

    /* ---- la FAQ: la pagina verso cui porta ogni barra di navigazione ---- */
    'faq.h1': 'Domande frequenti sull’assistenza domiciliare',
    'faq.p': 'Risposte chiare prima di decidere',
    'faq.s1.h': '🏠 Ricezione di una richiesta',
    'faq.s1.q1': 'Richieste di assistenza per anziani',
    'faq.s1.a1': 'Organizziamo l’assistenza diurna, notturna o in coabitazione secondo lo stato della persona, la zona e l’orario. Iniziamo raccogliendo l’età, la zona, quanto riesce a camminare, le esigenze di assistenza e se servono infermieristica o fisioterapia.',
    'faq.s1.q2': 'Richieste di assistenza per pazienti',
    'faq.s1.a2': 'Organizziamo l’assistenza domiciliare per i pazienti secondo le indicazioni del medico. Stabiliamo il motivo dell’assistenza come descritto dalla famiglia, se il paziente è a casa o appena dimesso, l’orario, la mobilità e le esigenze infermieristiche e di fisioterapia.',
    'faq.s2.h': '👥 La differenza tra i fornitori',
    'faq.th1': 'Ruolo',
    'faq.th2': 'Cosa fa',
    'faq.th3': 'Quando serve',
    'faq.r1': 'Badante',
    'faq.r1.d': 'Igiene, vestiti, pasti, movimento, compagnia, routine quotidiana',
    'faq.r1.w': 'Quando serve solo assistenza quotidiana',
    'faq.r2': 'Infermiere abilitato',
    'faq.r2.d': 'Procedure mediche, somministrazione dei farmaci, misurazioni, medicazioni',
    'faq.r2.w': 'Quando serve una competenza infermieristica',
    'faq.r3': 'Fisioterapista',
    'faq.r3.d': 'Esercizi di movimento e riabilitazione',
    'faq.r3.w': 'Dopo ictus, infortunio o intervento',
    'faq.s3.h': '🏥 Dopo la dimissione',
    'faq.s3.q1': 'Cosa dobbiamo sapere?',
    'faq.s3.a1': 'Il tipo di intervento, le indicazioni del medico dopo la dimissione, se il paziente riesce a camminare, se ha bisogno di aiuto per la toilette o per vestirsi, se i farmaci vanno seguiti, se ci sono ferite o materiale, il numero di ore e la zona.',
    'faq.s3.note': 'RAFIQ non formula diagnosi, non prescrive e non modifica una cura medica. Organizziamo la richiesta e la indirizziamo al servizio giusto.',
    'faq.s4.h': '🌙 Assistenza notturna e 24 ore',
    'faq.s4.q1': 'Esiste un turno di 24 ore?',
    'faq.s4.a1': 'Sì, ed è possibile inviare una richiesta per un’organizzazione condivisa secondo la disponibilità dei fornitori. Stabiliamo lo stato del paziente, se serve una sorveglianza continua, se riesce a muoversi, se serve assistenza notturna e se ci sono esigenze infermieristiche.',
    'faq.s5.h': '💊 Farmaci e medicazioni',
    'faq.s5.q1': 'Chi somministra il farmaco?',
    'faq.s5.a1': 'I farmaci sono gestiti secondo la prescrizione e le indicazioni del medico e l’accordo della famiglia. Se la situazione richiede competenza o follow-up infermieristico, la richiesta viene inviata a un infermiere abilitato.',
    'faq.s6.h': '🧹 Cucina, pulizie e guida',
    'faq.s6.q1': 'Che cosa è compreso e che cosa è extra?',
    'faq.s6.a1': 'L’assistenza personale comprende l’igiene, l’aiuto ai pasti e l’organizzazione delle esigenze quotidiane. Cucina, pulizie, guida e accompagnamento fuori casa sono compiti aggiuntivi stabiliti in anticipo.',
    'faq.s7.h': '💰 Prezzi e disponibilità',
    'faq.s7.q1': 'Perché non è mostrato un prezzo certo?',
    'faq.s7.a1': 'Perché il prezzo dipende dal tipo di assistenza, dal numero di ore, dallo stato e dall’esperienza. I prezzi sono mostrati dopo la verifica della richiesta e la conferma del fornitore. Non promettiamo né un prezzo incerto né una disponibilità incerta.',
    'faq.s8.h': '🛡️ Fiducia e responsabilità',
    'faq.s8.q1': 'Come so che la persona è adatta?',
    'faq.s8.a1': 'I dati professionali e l’esperienza sono raccolti e verificati secondo le procedure della piattaforma. L’abbinamento si basa su stato, esperienza, servizi, zona e disponibilità.',
    'faq.s8.q2': 'Chi risponde di un errore?',
    'faq.s8.a2': 'Le responsabilità sono definite nel contratto. Il badante si assume la responsabilità professionale e legale per qualsiasi errore o negligenza dimostrata come suo.',

    'safety.nodiagnose': 'Non formuliamo diagnosi, non prescriviamo e non modifichiamo una cura medica.'
  };

  RAFIQ_I18N.register('it', dict);
})();


/* ===================== bundled: %s ===================== */

/* RAFIQ — German bundle. Missing keys fall back to Arabic. */
(function () {
  var dict = {

    'lang.note': 'Sprache wählen — der Text ändert sich sofort.',
    'notice.partial': 'Einige Abschnitte dieser Seite sind noch auf Arabisch. Wir ergänzen sie.',
    'notice.page': 'Die Navigation ist in Ihrer Sprache, der Text dieser Seite ist aber noch auf Arabisch. Wir ergänzen ihn.',

    /* ---- install button: every message the button can show ---- */
    'install.steps.ios': 'Tippen Sie unten auf „Teilen“ ⬆︎, dann auf „Zum Home-Bildschirm“, dann auf „Hinzufügen“.',
    'install.steps.android': 'Öffnen Sie das Browser-Menü ⋮ und wählen Sie „App installieren“ oder „Zum Startbildschirm hinzufügen“.',
    'install.steps.desktop': 'Klicken Sie auf das Installationssymbol ⊕ in der Adressleiste des Browsers.',
    'install.ready': 'Tippen Sie auf „App installieren“, um sie auf Ihr Gerät zu holen.',
    'install.done': 'Installiert ✅ die App ist jetzt auf Ihrem Bildschirm.',
    'install.https': 'Die Installation braucht eine sichere Verbindung (https). Die Seite funktioniert normal.',
    'install.noButton': 'Dieser Browser zeigt die Installationsschaltfläche nicht an. ',
    'reason.installed': 'Die App ist auf diesem Gerät bereits installiert.',
    'reason.https': 'Die Installation braucht einen sicheren https-Link – die Schaltfläche funktioniert, sobald Sie die Seite dort öffnen.',
    'reason.noSW': 'Dieser Browser unterstützt keine App-Installation. Öffnen Sie die Seite in Chrome.',
    'reason.noManifest': 'Die App-Datei ist auf diesem Server noch nicht verfügbar.',
    'reason.ios': 'Auf dem iPhone: „Teilen“ ⬆︎, dann „Zum Home-Bildschirm“, dann „Hinzufügen“.',
    'reason.noPrompt': 'Öffnen Sie das Browser-Menü ⋮ und wählen Sie „App installieren“. Falls die Option fehlt, öffnen Sie die Seite erneut über ihren direkten Link.',

    'home.title': "RAFIQ | Verzeichnis zugelassener medizinischer Zentren im Libanon",
    'home.h1': 'Rafiq | RAFIQ',
    'home.tagline': 'Wir verbinden Liebe und Sicherheit mit der Pflege der Familie',
    'home.who': "Verzeichnis medizinischer Zentren und genehmigter Angebote im Libanon.",
    'home.cta.main': "Zentren ansehen",
    'home.cta.main.sub': "Genehmigte Kategorien und Gebiete",
    'home.cta.wa': 'WhatsApp',
    'home.cta.wa.sub': "Manuelle Korrespondenz",
    'home.cta.bot': "Telegram-Kanal",
    'home.cta.bot.sub': "Genehmigte Ankündigungen",
    'home.install': '📲 App installieren',

    'home.pick.title': "Dienstleistungskategorie wählen",
    'home.pick.1.t': "Medizinische Labore",
    'home.pick.1.d': "Genehmigte medizinische Labore und Untersuchungszentren.",
    'home.pick.2.t': "Bildgebung und Radiologie",
    'home.pick.2.d': "Genehmigte Zentren für medizinische Bildgebung und Radiologie.",
    'home.pick.3.t': "Physiotherapie",
    'home.pick.3.d': "Genehmigte Physiotherapie- und Rehabilitationszentren.",
    'home.pick.4.t': "Verkauf medizinischer Geräte",
    'home.pick.4.d': "Genehmigte Verkaufsstellen für medizinische Geräte.",
    'home.pick.5.t': "Vermietung medizinischer Geräte",
    'home.pick.5.d': "Genehmigte Vermietungsstellen für medizinische Geräte.",
    'home.pick.6.t': 'Einsatzgebiete',
    'home.pick.6.d': "Tripoli, Danniyeh, Zgharta, Koura, Batroun, Beirut und übrige Gebiete des Libanon.",
    'home.pick.7.t': "Verzeichnis-Leitfaden",
    'home.pick.7.d': "So finden Sie genehmigte Zentren und Angebote.",
    'home.pick.8.t': 'Häufige Fragen',
    'home.pick.8.d': "Antworten zu Dienstleistungen und genehmigten Rabatten.",

    'home.about.h': 'Was ist die Plattform Rafiq?',
    'home.about.lead': "RAFIQ ist ein libanesisches Verzeichnis medizinischer Zentren, ergänzender Dienstleistungen und von der Leitung vorab genehmigter Angebote.",
    'home.about.1.h': 'Was tun wir?',
    'home.about.1.d': "Wir zeigen Kategorien und Zentren, deren Angaben geprüft und genehmigt wurden, sowie offizielle Kontaktwege.",
    'home.about.2.h': 'Warum über eine Plattform?',
    'home.about.2.d': "Wir veröffentlichen kein Zentrum, Logo, keine Anzeige und keinen Rabatt ohne Prüfung und Genehmigung durch die Leitung.",
    'home.about.3.h': 'Was wir nicht tun?',
    'home.about.3.d': 'Wir stellen keine Diagnose, verschreiben keine Medikamente, nennen keinen garantierten Preis und keine garantierte Verfügbarkeit und wickeln keine Zahlungen im Chat ab.',
    'home.about.4.h': "Wer genehmigt Einträge und Angebote?",
    'home.about.4.d': "Ausschließlich die RAFIQ-Leitung. Kein Zentrum, Angebot oder Rabatt wird ohne ihre Genehmigung veröffentlicht.",
    'home.about.steps.h': "So funktioniert das Verzeichnis",
    'home.about.steps.1': "Wählen Sie eine Dienstleistungskategorie und ein Gebiet.",
    'home.about.steps.2': "Sehen Sie nur Zentren, die von RAFIQ genehmigt wurden.",
    'home.about.steps.3': "Prüfen Sie den genehmigten Rabatt und seine Bedingungen.",
    'home.about.steps.4': "Kontaktieren Sie das Zentrum und bezahlen Sie direkt dort.",

    'home.svc.h': "Kategorien medizinischer Zentren",
    'home.svc.1.h': "Medizinische Labore",
    'home.svc.1.d': "Von der Leitung genehmigte Labore und Untersuchungszentren.",
    'home.svc.2.h': "Bildgebung und Radiologie",
    'home.svc.2.d': "Genehmigte Zentren für medizinische Bildgebung und Radiologie.",
    'home.svc.3.h': "Physiotherapie",
    'home.svc.3.d': "Genehmigte Physiotherapie- und Rehabilitationszentren.",
    'home.svc.4.h': "Verkauf medizinischer Geräte",
    'home.svc.4.d': "Genehmigte Verkaufsstellen für medizinische Geräte.",
    'home.svc.more': 'Alle Einzelheiten auf der Leistungsseite.',
    'home.svc.5.h': "Vermietung medizinischer Geräte",
    'home.svc.5.d': "Genehmigte Vermietungsstellen für medizinische Geräte.",
    'home.svc.more.pre': "Alle Kategorien finden Sie auf der",
    'home.svc.more.link': "Dienstleistungsseite",

    'home.roles.h': 'Die Grundregel, die die Berufe trennt',
    'home.roles.th1': 'Wer sie sind',
    'home.roles.th2': 'Was sie tun',
    'home.roles.th3': 'Wann Sie sie brauchen',
    'home.roles.1': 'Betreuungskraft',
    'home.roles.1.d': 'Waschen, Anziehen, Essen, Bewegung, Begleitung, Tagesablauf',
    'home.roles.1.w': 'Wenn nur tägliche Betreuung nötig ist',
    'home.roles.2': 'Zugelassene Pflegekraft',
    'home.roles.2.d': 'Medizinische Maßnahmen, Medikamentenbetreuung, Messungen, Wundversorgung',
    'home.roles.2.w': 'Wenn pflegerische Hilfe nötig ist',
    'home.roles.3': 'Physiotherapeut',
    'home.roles.3.d': 'Bewegungsübungen und Rehabilitation',
    'home.roles.3.w': 'Nach Schlaganfall, Verletzung oder Operation',
    'home.roles.note': 'RAFIQ stellt keine Diagnose, verschreibt keine Medikamente und ändert keine ärztliche Behandlung. Wir organisieren die Anfrage und leiten sie an die passende Leistung weiter.',

    'home.contact.h': '📲 Kontakt',
    'home.contact.1.h': "Offizielle Korrespondenz",
    'home.contact.1.d': "Manuelle administrative Korrespondenz über WhatsApp.",
    'home.contact.2.h': 'Anfrage online',
    'home.contact.2.d': 'Das Formular auszufüllen ist schneller als ein Anruf.',
    'home.contact.3.h': "Informationen und Bedingungen",
    'home.contact.3.d': "Lesen Sie die häufigen Fragen, bevor Sie ein Zentrum kontaktieren.",

    'nav.home': 'Start',
    'nav.homeBrand': 'RAFIQ Startseite',
    'nav.homePage': 'Startseite',
    'nav.allRegions': 'Alle Gebiete',
    'nav.services': 'Leistungen',
    'nav.about': 'Über uns',
    'nav.faq': 'Häufige Fragen',
    'nav.allServices': 'Alle Leistungen',
    'nav.lebanon': '🇱🇧 Ganz Libanon',
    'nav.guide': 'Der Leitfaden',
    'nav.guideAlt': 'Der Pflege-Leitfaden',
    'nav.regions': 'Einsatzgebiete',
    'nav.agent': "RAFIQ-Assistent",

    'services.title': 'RAFIQ Leistungen | Hauspflege und Hauskrankenpflege im Libanon',
    'services.h1': 'RAFIQ Leistungen',
    'services.tagline': 'Was wir heute anbieten und was als Nächstes kommt',
    'services.home.h': 'Hauspflege',
    'services.home.p': 'Diese vier Leistungen laufen heute. Jede Anfrage geht vor der Vermittlung durch die Leitung.',
    'services.item.1.d': 'Wir organisieren Anfragen für Tag- und Nachtpflege sowie Hilfe für Menschen, die nicht allein zurechtkommen: Waschen, Anziehen, Essen, Bewegung und Begleitung im häuslichen Umfeld.',
    'services.item.2.d': 'Anfragen für Hauspflege und die Nachverfolgung der Bedürfnisse der erkrankten Person, auf Grundlage der Angaben der Familie und der ärztlichen Anweisung.',
    'services.item.3.d': 'Wir vermitteln Pflegeanfragen an zugelassene Pflegekräfte nach Fachbereich, Erfahrung und Ort – für Maßnahmen und Medikamentenbetreuung.',
    'services.item.4.d': 'Wir organisieren physiotherapeutische Anfragen und vermitteln sie an Physiotherapeuten im RAFIQ-Netzwerk, nachdem die Fachperson den Fall beurteilt hat.',
    'services.soon.h': 'Bald auf der Plattform',
    'services.soon.p': 'Diese Leistungen werden ergänzt. Wir versprechen weder Verfügbarkeit noch Preise vor einer förmlichen Vereinbarung.',
    'services.soon.badge': '⏳ Bald verfügbar',
    'services.soon.1.h': 'Ärzte verschiedener Fachrichtungen',
    'services.soon.1.d': 'Mit der Möglichkeit, Ärzte aller Fachrichtungen zu vertraglichen, während das Leistungsnetz wächst.',
    'services.soon.2.h': 'Ernährungsberater',
    'services.soon.2.d': 'Im Rahmen des Ausbaus des RAFIQ-Gesundheits- und Unterstützungsnetzes.',
    'services.soon.3.h': 'Zahnärzte',
    'services.soon.3.d': 'Im RAFIQ-Netzwerk für spezialisierte medizinische Leistungen.',
    'services.soon.4.h': 'Sprachtherapeuten',
    'services.soon.4.d': 'Im Rahmen des Ausbaus des RAFIQ-Gesundheits- und Unterstützungsnetzes.',
    'services.soon.5.h': 'Medizinische Geräte',
    'services.soon.5.d': 'Anbieter von Rollstühlen, Betten und Messgeräten für den häuslichen Gebrauch.',
    'services.barcode.h': '🎫 Der Plattform-Barcode',
    'services.barcode.p': 'Jedes Mitglied hat einen Barcode, der Leistungsart, Preise und Rabatte festhält, und jeder Vertragspartner einen Barcode, der die erbrachte Arbeit protokolliert.',
    'services.barcode.p2': 'Der Barcode wird nach Unterzeichnung übergeben und öffnet sich per QR-Scan oder über das Manager-Dashboard — es gibt keinen öffentlichen Link.',
    'services.barcode.note': 'Keine Telefonnummer und keine privaten Daten erscheinen vor Unterzeichnung und Freigabe durch die Leitung.',

    'about.title': 'Über die Plattform RAFIQ | Datenschutz zuerst',
    'about.h1': 'Über die Plattform RAFIQ',
    'about.why.h': "So funktioniert das RAFIQ-Verzeichnis",
    'about.why.1.h': "Zentren erst nach Genehmigung",
    'about.why.1.d': "Wir listen nur Zentren, deren Angaben von der Leitung geprüft und genehmigt wurden.",
    'about.why.2.h': "Klare Angebote",
    'about.why.2.d': "Rabattwerte und Bedingungen erscheinen erst nach Prüfung und ausdrücklicher Genehmigung.",
    'about.why.3.h': "Prüfung durch die Leitung",
    'about.why.3.d': "Nur die RAFIQ-Leitung entscheidet über die Aufnahme eines Zentrums, einer Anzeige oder eines Angebots.",
    'about.why.4.h': "Direkte Zahlung an das Zentrum",
    'about.why.4.d': "Besucher kontaktieren und bezahlen das Zentrum direkt. RAFIQ nimmt kein Kundengeld entgegen.",
    'about.privacy.h': "Genehmigung und Datenschutz",
    'about.privacy.p': "Angaben zu Zentren, Angeboten oder Rabatten werden erst nach Prüfung und Genehmigung veröffentlicht. Öffentliche Kanäle fragen keine medizinischen Daten oder persönlichen Dokumente ab.",
    'about.privacy.1.h': "Zuerst die Genehmigung",
    'about.privacy.1.d': "Kein Zentrum, Logo oder Rabatt wird vor Prüfung und vorheriger Genehmigung aufgenommen.",
    'about.privacy.2.h': "Prüfprotokoll",
    'about.privacy.2.d': "Genehmigungsentscheidungen zu Zentren, Angeboten und Rabatten werden administrativ dokumentiert.",
    'about.privacy.3.h': "RAFIQ verwahrt kein Kundengeld",
    'about.privacy.3.d': "Kunden bezahlen das Zentrum direkt. RAFIQ hält kein Kundengeld und tätigt keine Überweisungen.",
    'about.privacy.4.h': "Der Assistent entscheidet nicht",
    'about.privacy.4.d': "Der Assistent bietet allgemeine Informationen; er genehmigt keine Zentren, legt keine Rabatte fest und stellt keine Codes eigenständig aus.",
    'about.partners.h': "Medizinische Zentren und Dienstleistungen",
    'about.partners.p1': "Das Verzeichnis umfasst medizinische Labore, Bildgebungs- und Radiologiezentren, Physiotherapie sowie Verkaufs- und Vermietungsstellen für medizinische Geräte.",
    'about.partners.p2': "Keine Organisation wird ohne Genehmigung der Leitung als zugelassener Partner dargestellt; Namen, Logos und Angebote werden nicht ohne Zustimmung gezeigt.",
    'about.contact.h': '📱 Kontakt',
    'about.contact.1.h': "Administrative Korrespondenz",
    'about.contact.1.d': "Manuelle administrative Kontaktaufnahme über die offizielle WhatsApp-Nummer.",
    'about.contact.2.h': "Offizielle RAFIQ-Kanäle",
    'about.contact.2.d': "Telegram-Bot und Telegram-Kanal sowie WhatsApp-Kanal für manuelle Veröffentlichungen.",
    'about.contact.3.h': "Genehmigung von Zentren und Angeboten",
    'about.contact.3.d': "Zentren, Angebote und Rabatte werden vor der Veröffentlichung geprüft und genehmigt.",

    /* ---- der Lebenslauf-Service: die Preise sind öffentlich und fest ---- */

    'footer.rights': '© RAFIQ | Rafiq — Wir verbinden Liebe und Sicherheit mit der Pflege der Familie',

    /* ---- die vier Leistungsseiten (die vier wichtigsten Einstiege) ---- */
    'nav.caregivers': 'Für Betreuungskräfte',
    'cta.wa': 'WhatsApp RAFIQ',
    'cta.waShort': 'WhatsApp',

    'elderly.h1': 'Pflege älterer Menschen zu Hause im Libanon',
    'elderly.p': 'RAFIQ hilft Familien, Anfragen für die Pflege älterer Menschen zu Hause zu organisieren. Dabei werden Angaben zur Person, zu den Bedürfnissen, zum Zeitplan und zur Region gesammelt, geprüft und mit den passenden Betreuungskräften abgeglichen.',
    'elderly.h2': 'Was der Service umfassen kann',
    'elderly.li1': 'Hilfe bei Körperpflege und Waschen.',
    'elderly.li2': 'Hilfe bei Mahlzeiten und bei dem, was im Rahmen des Services vereinbart ist.',
    'elderly.li3': 'Begleitung und Unterstützung für Menschen, die nicht allein zurechtkommen.',
    'elderly.li4': 'Betreuung am Tag oder in der Nacht, wie beauftragt.',
    'elderly.li5': 'Hilfe beim Verlassen der Wohnung oder bei der Fortbewegung, wie vereinbart.',
    'elderly.p2': 'Medizinische Handlungen und die Gabe von Medikamenten richten sich nach den ärztlichen Anweisungen, der Zustimmung der Familie und dem Leistungsumfang des Anbieters.',

    'patient.h1': 'Patientenpflege zu Hause im Libanon',
    'patient.p': 'Eine Familie kann eine Anfrage mit den Angaben zur Person, zum Zustand, zum Ort, zum Zeitplan und zu den Bedürfnissen senden. Die Anfrage wird geprüft und die passende Zuordnung organisiert.',
    'patient.h2': 'Warum die Angaben wichtig sind',
    'patient.p2': 'Die Art des Zustands, das Maß der Selbstständigkeit, der Zeitplan, die geforderte Erfahrung und der Ort der Pflege helfen der Leitung, die Anfrage zu verstehen und die richtigen Anbieter auszuwählen.',
    'patient.p3': 'RAFIQ ersetzt weder die Ärztin oder den Arzt noch das Krankenhaus. Jede medizinische oder medikamentöse Versorgung muss innerhalb der jeweiligen Zuständigkeit und der genehmigten ärztlichen Anweisungen erfolgen.',

    'nursing.h1': 'Hauskrankenpflege im Libanon',
    'nursing.p': 'RAFIQ organisiert Anfragen für die Hauskrankenpflege und verbindet Familien mit den im Plattformnetz registrierten Pflegekräften, nachdem die Angaben und die Berufsunterlagen geprüft wurden.',
    'nursing.h2a': 'Die Zuordnung',
    'nursing.p2': 'Bei der Zuordnung können der Zustand, die Fachrichtung, die Erfahrung, die Region, der Zeitplan und die benötigten Leistungen berücksichtigt werden.',
    'nursing.h2b': 'Für Pflegekräfte',
    'nursing.p3': 'Für die Teilnahme am ersten RAFIQ-Modell gibt es kein monatliches oder jährliches Abo. Leistungen und Anfragen werden nach den Plattformregeln und den Arbeitsvereinbarungen bearbeitet.',

    'physio.h1': 'Physiotherapie zu Hause im Libanon',
    'physio.p': 'RAFIQ organisiert Anfragen für die Physiotherapie zu Hause und verbindet Familien anhand von Region, Erfahrung und verfügbaren Leistungen mit Physiotherapeuten.',
    'physio.p2': 'Den Therapiebedarf und das passende Programm bestimmt die Fachperson anhand des Zustands. Die Plattform ersetzt weder die medizinische Beurteilung noch die fachliche physiotherapeutische Befundung.',
    'physio.h2': 'Für Physiotherapeuten',
    'physio.p3': 'Die Teilnahme am ersten RAFIQ-Modell erfordert kein monatliches oder jährliches Abo.',

    /* ---- die sieben Gebietsseiten: ein Muster, sieben Regionen ---- */
    'cta.request': 'Anfrage senden',
    'reg.lebanon.h1': 'Hauspflege im Libanon',
    'reg.lebanon.p': 'RAFIQ baut ein landesweites Netz für Hauspflege auf. Es beginnt in den Gebieten, in denen passende Anbieter verfügbar sind, und wächst schrittweise in den übrigen Libanon.',
    'reg.beirut.h1': 'Hauspflege in Beirut',
    'reg.beirut.p': 'RAFIQ stellt in Beirut ein Leistungsnetz bereit, das Betreuung, Pflege, Physiotherapie und ergänzende Leistungen umfasst – je nach Verfügbarkeit und Vereinbarung.',
    'reg.tripoli.h1': 'Hauspflege in Tripolis | RAFIQ',
    'reg.tripoli.p': 'RAFIQ organisiert Anfragen für Hauspflege in Tripolis und vermittelt sie an die dort verfügbaren Betreuungskräfte, Pflegekräfte und ergänzenden Anbieter.',
    'reg.zgharta.h1': 'Hauspflege in Zahlé',
    'reg.zgharta.p': 'RAFIQ baut sein Anbieternetz in Zahlé aus und organisiert Anfragen für Hauspflege nach den Bedürfnissen der Familien und der verfügbaren Anbieter.',
    'reg.koura.h1': 'Hauspflege im Koura',
    'reg.koura.p': 'RAFIQ organisiert Anfragen von Familien im Koura und gleicht sie nach Verfügbarkeit mit Betreuungskräften, Pflegekräften und ergänzenden Anbietern ab.',
    'reg.batroun.h1': 'Hauspflege in Batroun',
    'reg.batroun.p': 'Das RAFIQ-Netz wächst in Batroun schrittweise: Anbieter werden registriert, ihre Angaben geprüft und die Anfragen der Familien organisiert.',
    'reg.dinniyeh.h1': 'Hauspflege in Dennié',
    'reg.dinniyeh.p': 'Familien in Dennié können eine Anfrage für Hauspflege mit den Angaben zur Person, zum Ort und zum Zeitplan senden. Sie wird anhand der im Gebiet verfügbaren Anbieter geprüft.',

    /* ---- die vier Ratgeber hinter dem Pflege-Leitfaden ---- */
    'g.choose.h1': 'Wie wähle ich eine Betreuungskraft für einen alten Menschen?',
    'g.choose.p': 'Beginnen Sie mit dem Maß der Selbstständigkeit, den täglichen Bedürfnissen und dem Zeitplan. Prüfen Sie dann die Erfahrung der Betreuungskraft, die angebotenen Leistungen, das Gebiet, die Sprachen und die Verfügbarkeit. Bei medizinischen oder komplexen Fällen legen Sie den passenden professionellen Bedarf gemeinsam mit der Ärztin oder dem Arzt bzw. dem Behandlungsteam fest.',
    'g.vsnurse.h1': 'Der Unterschied zwischen Betreuungskraft und Pflegekraft',
    'g.vsnurse.p': 'Die Betreuungskraft konzentriert sich auf tägliche Hilfe, persönliche Pflege und Begleitung im Rahmen des Services. Die Pflegekraft ist für pflegerische Handlungen im Rahmen ihrer Qualifikation und Zulassung befähigt. Welche Leistung die richtige ist, hängt vom Zustand und den Bedürfnissen der Person ab und bei Bedarf von den Anweisungen des Behandlungsteams.',
    'g.elderlyhome.h1': 'Einen alten Menschen zu Hause pflegen',
    'g.elderlyhome.p': 'Gute Betreuung beginnt damit, die Bedürfnisse der Person, ihren Alltag und ihre Fähigkeit zu verstehen, sich zu bewegen, zu essen und sich selbst zu versorgen. Die Umgebung muss sicher bleiben, jede Veränderung des Gesundheitszustands ist zu beobachten und die Ärztin oder der Arzt sowie die Familie sind zu informieren – ohne den Leistungsumfang des Anbieters zu überschreiten.',
    'g.hospital.h1': 'Einen Patienten nach dem Krankenhausaufenthalt pflegen',
    'g.hospital.p': 'Vor der Rückkehr nach Hause hilft der Familie die ärztlichen Anweisungen, die Medikamente, die Nachbetreuung, Bewegung und Ernährung sowie erforderliches Material oder Pflege zu kennen. Danach kann eine RAFIQ-Anfrage mit den passenden Angaben gesendet werden, um die benötigte Art von Anbieter zu bestimmen.',

    /* ---- die Plätze 5, 6 und 7 der Startseite ---- */
    'care.h1': 'Für Betreuungskräfte im Libanon',
    'care.i1.h': 'Registrierung',
    'care.i1.d': 'Erfahrung, Leistungen, Sprachen, Einsatzgebiete und Berufsunterlagen angeben, damit sie geprüft werden können.',
    'care.i2.h': 'Pflegejobs',
    'care.i2.d': 'Pflegechancen und Anfragen werden organisiert und passenden Profilen zugeordnet – nach den Anforderungen der Familie.',
    'care.i3.h': 'Ein ATS-fähiger Lebenslauf',
    'care.i3.d': 'Ein professioneller Lebenslauf auf Arabisch und Englisch, erstellt aus den Angaben, die Sie liefern.',
    'care.i4.h': 'Kein Abo',
    'care.i4.d': 'Für Betreuungskräfte gibt es im ersten RAFIQ-Modell kein monatliches oder jährliches Abo.',

    'regions.h1': 'RAFIQ-Einsatzgebiete im Libanon',
    'regions.p': 'Wir bauen im Libanon ein Leistungsnetz auf, das wachsen kann, und beginnen mit den Gebieten, in denen passende Anbieter verfügbar sind.',
    'regions.i1.h': 'Tripolis',
    'regions.i1.d': 'Hauspflege, Seniorenbetreuung, Hauskrankenpflege und ergänzende Leistungen, je nach Verfügbarkeit.',
    'regions.i2.h': 'Dennié',
    'regions.i2.d': 'Anfragen für Hauspflege und Anbieter, nach Gebiet und Verfügbarkeit.',
    'regions.i3.h': 'Zahlé',
    'regions.i3.d': 'Die Anfragen werden organisiert und mit den Anbietern im Netz verbunden.',
    'regions.i4.h': 'Koura',
    'regions.i4.d': 'Leistungen der Hauspflege, entsprechend der verfügbaren Abdeckung.',
    'regions.i5.h': 'Batroun',
    'regions.i5.d': 'Ausbau des Anbieternetzes, je nach Verfügbarkeit.',
    'regions.i6.h': 'Beirut',
    'regions.i6.d': 'Betreuungs- und Pflegeleistungen im Zuge des Netzaufbaus.',
    'regions.i7.h': 'Übriger Libanon',
    'regions.i7.d': 'Wir wachsen das Netz schrittweise, entsprechend der verfügbaren Anbieter und der eingehenden Anfragen.',

    'guide.h1': 'Der RAFIQ-Leitfaden für Hauspflege',
    'guide.i1.h': 'Wie wähle ich eine Betreuungskraft für einen alten Menschen?',
    'guide.i1.d': 'Beginnen Sie mit dem Maß der Selbstständigkeit, dem Zeitplan, den benötigten Leistungen und der Erfahrung, die die Situation verlangt.',
    'guide.i2.h': 'Betreuungskraft oder Pflegekraft?',
    'guide.i2.d': 'Die Betreuungskraft konzentriert sich auf Hilfe und tägliche Pflege im Rahmen des Services, während die Pflegekraft für pflegerische Handlungen im Rahmen ihrer Qualifikation und Zulassung befähigt ist.',
    'guide.i3.h': 'Einen alten Menschen zu Hause pflegen',
    'guide.i3.d': 'Den Tagesablauf, die Sicherheit, die Körperpflege, die Ernährung und die Begleitung nach den Bedürfnissen der Person organisieren.',
    'guide.i4.h': 'Nach dem Krankenhausaufenthalt',
    'guide.i4.d': 'Die Familie legt mit der Ärztin oder dem Arzt bzw. dem Behandlungsteam den Bedarf zu Hause fest und kann danach eine passende Anfrage über RAFIQ senden.',
    'guide.faq.h': 'Häufige Fragen von Familien',
    'guide.q1': 'Gibt es ein Abo für die Familie?',
    'guide.a1': 'Das hängt vom für die jeweilige Anfrage genehmigten Servicemodell ab. Die Bedingungen werden vor jeder Vereinbarung angezeigt.',
    'guide.q2': 'Gibt es ein Abo für die Betreuungskraft?',
    'guide.a2': 'Für Mitglieder des ersten RAFIQ-Modells gibt es kein monatliches oder jährliches Abo.',
    'guide.q3': 'Gibt es Rabatte?',
    'guide.a3': 'RAFIQ arbeitet an Vereinbarungen mit Laboren, Bildgebungszentren sowie Anbietern von Medizinprodukten und Gesundheitsleistungen. Jeder Rabatt wird erst bekannt gegeben, wenn er genehmigt und förmlich vereinbart ist.',

    /* ---- die FAQ: die Seite, auf die jede Navigationsleiste führt ---- */
    'faq.h1': 'Häufige Fragen zur Hauspflege',
    'faq.p': 'Klare Antworten, bevor Sie entscheiden',
    'faq.s1.h': '🏠 Anfrage annehmen',
    'faq.s1.q1': 'Anfragen für die Pflege älterer Menschen',
    'faq.s1.a1': 'Wir organisieren die Pflege tagsüber, nachts oder als Wohnsitz je nach Zustand der Person, Gebiet und Zeitplan. Wir erheben zunächst Alter, Gebiet, Gehfähigkeit, Pflegebedarf und ob Pflege oder Physiotherapie nötig ist.',
    'faq.s1.q2': 'Anfragen für die Patientenpflege',
    'faq.s1.a2': 'Wir organisieren die Hauspflege für Patienten nach den ärztlichen Anweisungen. Wir klären den Grund der Pflege, wie die Familie ihn schildert, ob der Patient zu Hause oder gerade aus dem Krankenhaus entlassen ist, den Zeitplan, die Mobilität sowie Pflege- und Physiotherapiebedarf.',
    'faq.s2.h': '👥 Der Unterschied zwischen den Anbietern',
    'faq.th1': 'Rolle',
    'faq.th2': 'Was sie tun',
    'faq.th3': 'Wann Sie sie brauchen',
    'faq.r1': 'Betreuungskraft',
    'faq.r1.d': 'Waschen, Anziehen, Essen, Bewegung, Begleitung, Tagesablauf',
    'faq.r1.w': 'Wenn nur tägliche Betreuung nötig ist',
    'faq.r2': 'Zugelassene Pflegekraft',
    'faq.r2.d': 'Medizinische Maßnahmen, Medikamentenbetreuung, Messwerte, Wundversorgung',
    'faq.r2.w': 'Wenn pflegerische Hilfe nötig ist',
    'faq.r3': 'Physiotherapeut',
    'faq.r3.d': 'Bewegungsübungen und Rehabilitation',
    'faq.r3.w': 'Nach Schlaganfall, Verletzung oder Operation',
    'faq.s3.h': '🏥 Nach dem Krankenhausaufenthalt',
    'faq.s3.q1': 'Was müssen wir wissen?',
    'faq.s3.a1': 'Die Art des Eingriffs, die ärztlichen Anweisungen nach der Entlassung, ob der Patient gehen kann, ob Hilfe beim Waschen oder Anziehen nötig ist, ob Medikamente zu überwachen sind, ob Wunden oder Geräte vorhanden sind, die Anzahl der Stunden und das Gebiet.',
    'faq.s3.note': 'RAFIQ stellt keine Diagnose, verschreibt nichts und ändert keine ärztliche Behandlung. Wir organisieren die Anfrage und leiten sie an die passende Leistung weiter.',
    'faq.s4.h': '🌙 Nachtpflege und 24 Stunden',
    'faq.s4.q1': 'Gibt es eine 24-Stunden-Schicht?',
    'faq.s4.a1': 'Ja, und es kann eine Anfrage für eine geteilte Organisation je nach Verfügbarkeit der Anbieter gestellt werden. Wir klären den Zustand der Person, ob eine ständige Überwachung nötig ist, ob sie sich bewegen kann, ob Nachtpflege gebraucht wird und ob pflegerischer Bedarf besteht.',
    'faq.s5.h': '💊 Medikamente und Verbände',
    'faq.s5.q1': 'Wer gibt das Medikament?',
    'faq.s5.a1': 'Medikamente werden nach der Verordnung und den Anweisungen der Ärztin oder des Arztes sowie der Zustimmung der Familie verwaltet. Wenn die Situation pflegerisches Können oder eine Betreuung erfordert, geht die Anfrage an eine zugelassene Pflegekraft.',
    'faq.s6.h': '🧹 Kochen, Putzen und Fahren',
    'faq.s6.q1': 'Was ist enthalten und was ist zusätzlich?',
    'faq.s6.a1': 'Die persönliche Betreuung umfasst Waschen, Hilfe bei Mahlzeiten und das Organisieren des täglichen Bedarfs. Kochen, Putzen, Fahren und Begleitung außerhalb der Wohnung sind vorab vereinbarte Zusatzaufgaben.',
    'faq.s7.h': '💰 Preise und Verfügbarkeit',
    'faq.s7.q1': 'Warum wird kein fester Preis angezeigt?',
    'faq.s7.a1': 'Weil der Preis von der Art der Pflege, der Anzahl der Stunden, dem Zustand und der Erfahrung abhängt. Preise werden angezeigt, nachdem die Anfrage geprüft und der Anbieter bestätigt ist. Wir versprechen weder einen ungewissen Preis noch eine ungewisse Verfügbarkeit.',
    'faq.s8.h': '🛡️ Vertrauen und Verantwortung',
    'faq.s8.q1': 'Woher weiß ich, dass die Person geeignet ist?',
    'faq.s8.a1': 'Berufliche Angaben und Erfahrung werden erhoben und nach den Verfahren der Plattform geprüft. Die Vermittlung richtet sich nach Zustand, Erfahrung, Leistungen, Gebiet und Verfügbarkeit.',
    'faq.s8.q2': 'Wer trägt die Verantwortung für einen Fehler?',
    'faq.s8.a2': 'Die Zuständigkeiten werden im Vertrag festgelegt. Die Betreuungskraft trägt die fachliche und rechtliche Verantwortung für jeden Fehler oder jede Vernachlässigung, der ihr nachgewiesen wird.',

    'safety.nodiagnose': 'Wir stellen keine Diagnose, verschreiben nicht und ändern keine ärztliche Behandlung.'
  };

  RAFIQ_I18N.register('de', dict);
})();
