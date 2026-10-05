/* RAFIQ universal PWA installer */
(function () {
  'use strict';
  var deferredPrompt = null;

  function qsAll(selector) { return document.querySelectorAll(selector); }
  function standalone() {
    try { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; }
    catch (_) { return false; }
  }
  function isIOS() {
    var ua=navigator.userAgent||'';
    return /iPad|iPhone|iPod/.test(ua) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
  }
  function isAndroid() { return /Android/i.test(navigator.userAgent||''); }
  function isMacSafari() {
    var ua=navigator.userAgent||'';
    return /Macintosh/i.test(ua) && /Safari/i.test(ua) && !/Chrome|Chromium|Edg/i.test(ua);
  }
  function t(key, fallback) {
    try {
      if (window.RAFIQ_I18N && typeof window.RAFIQ_I18N.translate === 'function') {
        var v=window.RAFIQ_I18N.translate(key); if (v) return v;
      }
    } catch (_) {}
    return fallback;
  }
  function setHint(key, fallback) {
    var text=t(key,fallback);
    qsAll('[data-rafiq-install-hint],#installHint').forEach(function(el){ el.textContent=text; el.hidden=false; });
  }
  function hideAll() {
    qsAll('[data-rafiq-install],#installApp').forEach(function(el){ el.hidden=true; });
    qsAll('[data-rafiq-install-hint],#installHint').forEach(function(el){ el.hidden=true; });
  }
  function showAll() {
    if (standalone()) { hideAll(); return; }
    qsAll('[data-rafiq-install],#installApp').forEach(function(el){ el.hidden=false; });
  }
  function manualHint() {
    if (!window.isSecureContext) {
      setHint('install.https','التثبيت المباشر يحتاج رابط HTTPS. افتح منصة رفيق عبر الرابط الرسمي الآمن.');
    } else if (isIOS()) {
      setHint('reason.ios','على iPhone/iPad: اضغط مشاركة ⬆︎ ثم «إضافة إلى الشاشة الرئيسية» ثم «إضافة».');
    } else if (isMacSafari()) {
      setHint('install.steps.desktop','في Safari على Mac: من القائمة «File» اختر «Add to Dock».');
    } else if (isAndroid()) {
      setHint('install.steps.android','إذا لم يظهر التثبيت المباشر: افتح قائمة ⋮ ثم «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».');
    } else {
      setHint('install.steps.desktop','في Chrome/Edge: استخدم زر التثبيت ⊕ في شريط العنوان أو القائمة ثم «تثبيت».');
    }
  }
  function clickInstall(event) {
    if (event) event.preventDefault();
    if (deferredPrompt) {
      var p=deferredPrompt;
      deferredPrompt=null;
      p.prompt();
      p.userChoice.then(function(choice){
        if (choice && choice.outcome === 'accepted') hideAll();
        else manualHint();
      }).catch(manualHint);
      return;
    }
    manualHint();
  }

  window.addEventListener('beforeinstallprompt', function(event) {
    event.preventDefault();
    deferredPrompt=event;
    showAll();
    setHint('install.ready','اضغط «تثبيت التطبيق» الآن لإضافة رفيق إلى جهازك.');
  });
  window.addEventListener('appinstalled', function(){ deferredPrompt=null; hideAll(); });
  document.addEventListener('click', function(event){
    var target=event.target && event.target.closest ? event.target.closest('[data-rafiq-install],#installApp') : null;
    if (target) clickInstall(event);
  });
  document.addEventListener('rafiq:i18n', function(){ if (!standalone() && !deferredPrompt) manualHint(); });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function(){
      navigator.serviceWorker.register('/sw.js?v=73', {updateViaCache:'none'})
        .then(function(reg){ if (reg.update) reg.update(); })
        .catch(function(){});
    });
  }

  function boot() {
    if (standalone()) { hideAll(); return; }
    showAll();
    setTimeout(function(){ if (!deferredPrompt) manualHint(); }, 900);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();

  window.RAFIQ_INSTALL = {
    install: clickInstall,
    canPrompt: function(){ return !!deferredPrompt; },
    isInstalled: standalone
  };
})();