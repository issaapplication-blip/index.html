/* ==========================================================
   RAFIQ | رفيق — install button, kept deliberately simple.

   One rule: the button is always there. If the browser can install the app
   itself we use that; if it cannot, the same button shows the two taps to
   do it by hand. No floating bar, no alerts, no hidden buttons.

   Markup contract - put this anywhere you want the button:
       <button data-rafiq-install>تثبيت التطبيق</button>
       <p data-rafiq-install-hint hidden></p>
   ========================================================== */
(function () {
  'use strict';

  var deferred = null;

  function standalone() {
    try {
      return window.matchMedia('(display-mode: standalone)').matches ||
             window.navigator.standalone === true;
    } catch (e) { return false; }
  }

  function isIOS() {
    var ua = navigator.userAgent;
    return /iPad|iPhone|iPod/.test(ua) ||
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  /* the manual steps, as one short block */
  function steps() {
    if (isIOS()) {
      return 'اضغط زر المشاركة ⬆︎ في الأسفل ← "إضافة إلى الشاشة الرئيسية" ← "إضافة".';
    }
    if (/Android/i.test(navigator.userAgent)) {
      return 'افتح قائمة المتصفح ⋮ ← "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية".';
    }
    return 'اضغط أيقونة التثبيت ⊕ في شريط عنوان المتصفح.';
  }

  function buttons() {
    return document.querySelectorAll('[data-rafiq-install], #installApp');
  }

  function hints() {
    return document.querySelectorAll('[data-rafiq-install-hint], #installHint');
  }

  function say(text) {
    hints().forEach(function (el) {
      el.textContent = text;
      el.hidden = false;
    });
  }

  function hide() {
    buttons().forEach(function (b) { b.hidden = true; });
    hints().forEach(function (h) { h.hidden = true; });
  }

  function show() {
    if (standalone()) { hide(); return false; }
    buttons().forEach(function (b) { b.hidden = false; });
    return true;
  }

  /* ---------- the browser can install it: use its own prompt ---------- */
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferred = e;
    show();
  });

  window.addEventListener('appinstalled', function () {
    deferred = null;
    hide();
    say('تم التثبيت ✅ التطبيق الآن على شاشتك.');
  });

  /* ---------- service worker: required for installability ---------- */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js?v=71', { updateViaCache: 'none' })
        .catch(function () { /* the site still works without it */ });
    });
  }

  /* ---------- one click, whatever the platform ---------- */
  function install(e) {
    if (e) e.preventDefault();
    if (deferred) {
      deferred.prompt();
      deferred.userChoice.then(function (choice) {
        deferred = null;
        if (choice && choice.outcome === 'accepted') hide();
        else say('تم إلغاء التثبيت. ' + steps());
      }).catch(function () { say(steps()); });
      return;
    }
    say(steps());
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-rafiq-install], #installApp');
    if (b) install(e);
  });

  /* a short, honest fallback for browsers that hide the button entirely
     (plain HTTP, or a browser with no install path at all) */
  function unsupported() {
    if (!window.isSecureContext) {
      return 'التثبيت يحتاج اتصالاً آمناً (https). الموقع يعمل عادياً الآن.';
    }
    return 'المتصفح لا يعرض زر التثبيت. ' + steps();
  }

  window.RAFIQ_INSTALL = {
    install: install,
    steps: steps,
    show: show,
    hide: hide,
    canPrompt: function () { return !!deferred; },
    unsupported: unsupported
  };

  /* ---------- wire up on load ---------- */
  function boot() {
    if (standalone()) { hide(); return; }
    show();

    // give the browser a moment to fire beforeinstallprompt
    setTimeout(function () {
      if (deferred) { say('اضغط «تثبيت التطبيق» لإضافته إلى جهازك.'); return; }
      // no native prompt on this platform - say so, but keep the button useful
      if (!window.isSecureContext || /Android/i.test(navigator.userAgent) || isIOS()) {
        say(steps());
      }
    }, 1200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();