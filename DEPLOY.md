# RAFIQ | رفيق — دليل التشغيل والإطلاق

منصة رعاية منزلية وخدمات صحية في لبنان.
الموقع: **https://rafiq-o6qd.onrender.com**

---

## 1) ما الذي يعمل الآن (متحقَّق منه بالاختبار)

| المجال | الحالة | كيف تم التحقق |
|---|---|---|
| 27 صفحة HTML | ✅ 200 | طلب مباشر لكل صفحة |
| 14 أصل (شعار، أيقونات، JS) | ✅ 200 | طلب مباشر + نوع المحتوى |
| الشعار `assets/rafig-logo.png` | ✅ 512×512 في كل الصفحات | `naturalWidth` في المتصفح |
| لا تمرير أفقي على أي مقاس | ✅ | قياس `scrollWidth` مقابل `viewport` |
| لا أخطاء JavaScript | ✅ 0 | console على 7 صفحات |
|GSee / FAQ Schema | ✅ FAQPage (10 أسئلة) + MedicalBusiness | قراءة `application/ld+json` |
| sitemap / robots | ✅ 21 رابط + استبعاد الإداري | فحص الملفات |
| PWA | ✅ manifest + sw v68 + 3 أيقونات | تسجيل Service Worker |
| الوكيل (المتصفح) | ✅ **27/27** اختبار | `live/_test/agent-tests.html` |
| الوكيل (واتساب) | ✅ نفس brain | `auto-reply.mjs` يستورد نفس الملفات |
| استقبال الطلب (نموذج) | ✅ يصل Supabase | اختبار حقيقي |
| **التسجيل بالبريد** | 🔴 **محجوب** | `429 email rate limit exceeded` |

---

## 2) 🔴 العائق الوحيد المتبقي: التسجيل محجوب

Supabase أوقف إنشاء الحسابات:

```
POST /auth/v1/signup  ->  429  "email rate limit exceeded"
```

**السبب:** المصادقة بالبريد مفعّلة مع «تأكيد البريد»، والباقة المجانية تضع حداً
بسيطاً على عدد رسائل البريد الإلكتروني المرسلة.

**الحل — دقيقة واحدة في لوحة Supabase:**

```
Supabase Dashboard
  -> Authentication
  -> Sign In / Providers
  -> Email
  -> Confirm email        ❌  أطفئه
  -> Save
```

بعد الإطفاء لا تُرسَل أي رسالة تأكيد، فيرتفع الحد ولا يُحظر التسجيل.
هذا آمن هنا لأن **كل طلب يراجعه المدير قبل القبول** — لا يوجد وصول بلا مراجعة.

> إن أُريد إبقاء التأكيد: ارفع باقة Supabase، أو انتظر إعادة ضبط الحد.

حتى يُحل ذلك، يعرض الموقع رسالة واضحة مع زر واتساب البديل (مُفعَّل ومُختبَر).

---

## 3) خطوات النشر

### الطريقة أ — GitHub (3 دقائق)

1. أنشئ رمزاً: <https://github.com/settings/tokens/new>
   - Note: `RAFIQ` · Expiration: `30 days` · Scope: **`repo`**
2. انسخ الرمز.
3. **زر الفأرة الأيمن** على `PUBLISH.bat` ← **تشغيل كمسؤول** ← اسم المستخدم + الرمز.
4. Render يعيد النشر تلقائياً (GitHub → Build).

### الطريقة ب — رفع ZIP (5 دقائق)

`RAFIQ-FINAL.zip` جاهز. في **Render → Shell**:

```bash
cd /opt/render/project/src
unzip -o /tmp/RAFIQ-FINAL.zip -d /opt/render/project/src
# أو: ارفع الملف من Files ثم:
ls -la
```

ثم **Restart** من لوحة Render.

### بعد النشر — تحقّق (دقيقة)

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://rafiq-o6qd.onrender.com/dashboard.html   # 200
curl -s -o /dev/null -w "%{http_code}\n" https://rafiq-o6qd.onrender.com/barcode.html     # 200
curl -s -o /dev/null -w "%{http_code}\n" https://rafiq-o6qd.onrender.com/js/rafiq-kb.js  # 200
curl -s -o /dev/null -w "%{http_code}\n" https://rafiq-o6qd.onrender.com/assets/rafig-logo.png # 200
```

إن بقيت `404`، فالخادم المُشغَّل على Render يستخدم
قائمة مسارات ثابتة — راجع `server.js` داخل الخدمة وأضف المسارات المفقودة.

### على الهاتف

الشاشة السوداء القديمة سببها `sw.js` مكسور مخزَّن في الذاكرة المؤقتة.
بعد النشر:

1. Chrome ← `rafiq-o6qd.onrender.com` ← ⚙️ ← **حذف بيانات الموقع**.
2. احذف التطبيق المثبَّت إن وُجد، ثم أعد فتح الموقع.
3. ⋮ ← **تثبيت التطبيق / إضافة إلى الشاشة الرئيسية**.

---

## 4) قواعد Supabase — شغّلها مرة واحدة

في **Supabase → SQL Editor**، شغّل بالترتيب:

```
supabase/migrations/20260927_barcode_and_commission.sql
supabase/migrations/20260927_barcode_and_commission_rls.sql
supabase/migrations/20260927_manager_dashboard.sql
supabase/migrations/20260927_manager_barcode.sql
supabase/migrations/20260927_privacy_gate.sql
supabase/migrations/20260927_public_visibility.sql
```

كلها **إضافة فقط** — لا تحذف جدولاً ولا بيانات.
لوحة المراجعة تعمل قبلها بفضل الإحصاءات الاحتياطية.

---

## 5) الوكيل

### طبقاته

```
1. guard      قواعد السلامة          — دائماً
2. RAFIQ_KB   15 جواباً مُراجَعاً     — دائماً، فوري، بلا إنترنت
3. OpenAI     ذكاء أعمق               — فقط عند وجود مفتاح
```

الطبقة 2 وحدها تجيب على كل السيناريوهات. وOpenAI تحسين لا شرط.
إن تعطّل، الوكيل **لا يسكت أبداً**.

### أين تُفتح الطبقة 3

**Supabase → Edge Functions → rafiq-agent → Secrets:**

| الاسم | مطلوب؟ | القيمة |
|---|---|---|
| `OPENAI_API_KEY` | اختياري | `sk-…` |
| `OPENAI_MODEL` | اختياري | `gpt-4o-mini` |

ثم **Deploy** الدالة `supabase/functions/rafiq-agent/index.ts`.

### ما لا يفعله الوكيل أبداً

- لا يشخّص ولا يصف دواءً ولا يغيّر علاجاً
- لا يخترع سعراً ولا خصماً ولا وقتاً متاحاً
- لا يوافق على مقدم خدمة ولا يوقّع عقداً
- لا يتعامل مع أموال ولا يذكر الرقم المالي
- لا يعطي رقم هاتف لمقدم خدمة
- الحالات الطارئة → إسعاف 112 + المدير
- كل ما عداه → المدير على **81 506 299**

### الاختبار

```
http://127.0.0.1/_test/agent-tests.html     # 27/27
```

---

## 6) واتساب — الرد التلقائي 24/7

```bash
npm i
KAPSO_API_KEY=…  KAPSO_PHONE_NUMBER_ID=1324609540731383  node auto-reply.mjs
```

| المتغيّر | مطلوب؟ |
|---|---|
| `KAPSO_API_KEY` | ✅ |
| `KAPSO_PHONE_NUMBER_ID` | ✅ `1324609540731383` |
| `OPENAI_API_KEY` | اختياري |
| `POLL_MS` | اختياري، افتراضياً 20000 |

> ⚠️ **مفاتيح Kapso الحالية مكشوفة.** احذفها وأنشئ جديدة قبل التشغيل.
> الرقم المالي `+961 70 600 157` للتحويلات فقط — محجوب في الكود ولا يُرسل إليه شيء.

---

## 7) أشياء يجب تغييرها قبل الإطلاق

| # | الأمر | لماذا |
|---|---|---|
| 1 | إطفاء «Confirm email» في Supabase | التسجيل محجوب الآن بـ 429 |
| 2 | تدوير مفاتيح Kapso | مكشوفة في المحادثة |
| 3 | `supabase/config.toml`: `verify_jwt = false` للدالة | يمنع خطأ 401 على نداءات المتصفح |
| 4 | إدراج الأرقام على `index.html` و`app.html` | الرقم الأول للطلب مفقود |
| 5 | تسمية Display Name لرقم Meta | يجب أن تكون `RAFIQ \| رفيق` |
| 6 | إكمال التحقق التجاري في Meta | البند 6 من 7 |

### `supabase/config.toml`

```toml
[functions.rafiq-agent]
verify_jwt = false
```

---

## 8) بنية الملفات

```
/                      الصفحة الرئيسية (server.js يخدم "/" من home.html)
index.html             يحوّل تلقائياً إلى "/" — لا يربطه أي رابط داخلي
faq.html               الأسئلة الشائعة + FAQ Schema
app.html               التسجيل والطلب (عائلات + مهنيون)
agent.html             مساعد رفيق
dashboard.html         لوحة المراجعة (مدير)
admin.html             دخول المدير
barcode.html           بطاقة مقدم الخدمة
services.html regions.html guide*.html elderly-care.html …
js/rafiq-kb.js         قاعدة المعرفة — 15 جواباً
js/rafiq-agent.js      طبقة السلامة + استخراج البيانات + OpenAI
js/rafiq-welcome.js    رسائل ترحيب يومية (4 أدوار)
auto-reply.mjs         عامل واتساب
supabase/functions/    دالة الوكيل على الخادم
supabase/migrations/   7 ترحيلات — شغّلها مرة واحدة
_test/agent-tests.html 27 اختباراً للوكيل  (لا يُنشر)
```

---

## 9) الأرقام

| | |
|---|---|
| استقبال العملاء / المدير | **+961 81 506 299** |
| التحويلات المالية فقط | +961 70 600 157 — لا يظهر للعميل ولا للوكيل |

CV احترافي: ‎$25‎ / Cover Letter ‎$10‎ / الاثنان ‎$35‎ (بدل ‎$35‎/‎$16‎/‎$51‎)
لغة إضافية ‎+$20‎. الدفع عبر **Whish Money** فقط.
