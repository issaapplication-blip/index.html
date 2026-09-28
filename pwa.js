(() => {
  const button = document.getElementById('installApp');
  const help = document.getElementById('installHelp');
  if (!button) return;
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  let prompt;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const setHelp = text => { if (help) { help.textContent = text; help.hidden = false; } };
  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
  if (standalone) { button.hidden = true; return; }
  if (ios) { button.hidden = false; setHelp('على Safari: اضغط زر المشاركة ثم «إضافة إلى الشاشة الرئيسية».'); }
  else { button.hidden = false; setHelp('يمكن تثبيت رفيق من قائمة المتصفح. سيظهر التثبيت المباشر عندما يدعمه المتصفح.'); }
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); prompt = event; button.hidden = false; if (help) help.hidden = true; });
  button.addEventListener('click', async () => {
    if (!prompt) return;
    await prompt.prompt(); await prompt.userChoice; prompt = undefined; button.hidden = true;
  });
  window.addEventListener('appinstalled', () => { prompt = undefined; button.hidden = true; if (help) help.hidden = true; });
})();
