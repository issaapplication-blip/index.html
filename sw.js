/* ==========================================================
   RAFIQ | رفيق — Service Worker
   Required for the install button to appear.
   ========================================================== */
self.addEventListener("message", function (e) {
  if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
});

var CACHE = "rafig-v72-20261002";
var ASSETS = [
  "/",
  "/index.html",
  "/agent.html",
  "/app.html",
  "/faq.html",
  "/about.html",
  "/services.html",
  "/caregivers.html",
  "/regions.html",
  "/guide.html",
  "/lebanon.html",
  "/elderly-care.html",
  "/patient-care.html",
  "/home-nursing.html",
  "/physiotherapy.html",
  "/manifest.webmanifest",
  "/install-app.js",
  "/css/device.css",
  "/js/i18n.js",
  "/js/locales/ar.js",
  "/js/locales/en.js",
  "/js/locales/fr.js",
  "/js/locales/it.js",
  "/js/locales/de.js",
  "/js/rafiq-kb.js",
  "/js/rafiq-agent.js",
  "/js/rafiq-welcome.js",
  "/assets/rafig-logo.png",
  "/assets/icon-192.png",
  "/assets/icon-512.png",
  "/assets/icon-maskable-512.png",
  "/assets/apple-touch-icon.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      // cache each file separately so one 404 cannot break the whole install
      return Promise.all(ASSETS.map(function (u) {
        return c.add(new Request(u, { cache: "reload" })).catch(function () { return null; });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
        return null;
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* When the host cannot serve a page, the visitor must still see RAFIQ and a
   way forward - never a blank screen. Order: the cached copy of the page they
   asked for, then the home page, then a small built-in page. */
function fallbackPage(req, status) {
  return caches.match(req, { ignoreSearch: true }).then(function (hit) {
    if (hit) return hit;
    return caches.match("/", { ignoreSearch: true }).then(function (home) {
      if (home) return home;
      return new Response(BLANK_FALLBACK, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    });
  });
}

var BLANK_FALLBACK = [
  '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width,initial-scale=1">',
  '<title>RAFIQ | رفيق</title>',
  '<style>body{margin:0;font-family:system-ui,Tahoma,Arial,sans-serif;',
  'background:#f4f8f6;color:#17372d;display:flex;align-items:center;',
  'justify-content:center;min-height:100vh;padding:20px}',
  '.b{max-width:520px;text-align:center}',
  'img{width:150px;border-radius:16px;background:#fff;padding:8px;',
  'box-shadow:0 6px 20px rgba(0,0,0,.08)}',
  'a{display:block;background:#087f58;color:#fff;text-decoration:none;',
  'border-radius:12px;padding:14px;margin:10px 0;font-weight:800}',
  'a.g{background:#eaf2ef;color:#17372d}',
  'a.w{background:#25D366;color:#06331a}',
  'p{color:#5c6f67}</style></head><body><div class="b">',
  '<img src="/assets/rafig-logo.png" alt="RAFIQ" width="150" height="150">',
  '<h1>رفيق | RAFIQ</h1>',
  '<p>هذه الصفحة غير متاحة حالياً. اختر من الروابط التالية:</p>',
  '<a href="/app.html">طلب خدمة</a>',
  '<a class="w" href="https://wa.me/96181506299">واتساب 81 506 299</a>',
  '<a class="g" href="/agent.html">اسأل الوكيل</a>',
  '<a class="g" href="/">الصفحة الرئيسية</a>',
  '</div></body></html>'
].join("");

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;

  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;

  // pages: network first, but never let a gateway error reach the user.
  // The host answers 404 with {"ok":false,"error":"not found"} as JSON, which
  // renders as a blank white page. If the response is not real HTML, serve the
  // cached copy of that page, and failing that a real page from the site.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req, { cache: "no-store" })
        .then(function (res) {
          var type = res.headers.get("content-type") || "";
          var looksLikePage = res.ok && type.indexOf("text/html") !== -1;
          if (looksLikePage) {
            var copy = res.clone();
            caches.open(CACHE).then(function (k) { return k.put(req, copy); }).catch(function () {});
            return res;
          }
          // the host refused this page - fall back to something real
          return fallbackPage(req, res.status);
        })
        .catch(function () { return fallbackPage(req, 0); })
    );
    return;
  }

  // assets: network first, cache as fallback
  e.respondWith(
    fetch(req, { cache: "no-store" }).then(function (res) {
      if (res && res.ok) {
        var copy = res.clone();
        caches.open(CACHE).then(function (k) {
          return k.put(req, copy);
        }).catch(function () {});
      }
      return res;
    }).catch(function () {
      return caches.match(req).then(function (c) {
        return c || new Response("unavailable", { status: 503 });
      });
    })
  );
});
