import test from "node:test";
import assert from "node:assert/strict";
import { answer } from "./core.mjs";
const cases=[
  [
    "مرحباً",
    "أهلاً بك"
  ],
  [
    "ما الخدمات التي تقدمونها؟",
    "الخدمات الأساسية"
  ],
  [
    "هل لديكم رعاية لكبار السن؟",
    "كبار السن"
  ],
  [
    "هل ترعون المرضى في المنزل؟",
    "رعاية منزلية للمريض"
  ],
  [
    "هل يوجد تمريض منزلي؟",
    "ممرضين مؤهلين"
  ],
  [
    "أريد علاجاً فيزيائياً",
    "العلاج الفيزيائي"
  ],
  [
    "هل تقدمون تحاليل مخبرية؟",
    "قيد الإضافة"
  ],
  [
    "هل لديكم أشعة؟",
    "قيد الإضافة"
  ],
  [
    "هل توفرون معدات طبية؟",
    "قيد الإضافة"
  ],
  [
    "هل لديكم طبيب أسنان؟",
    "قيد الإضافة"
  ],
  [
    "من يستطيع التقديم؟",
    "يمكن لمقدمي الرعاية"
  ],
  [
    "أنا مقدم رعاية، هل يمكنني الانضمام؟",
    "نرحب بمقدمي الرعاية"
  ],
  [
    "أنا ممرض، كيف أنضم؟",
    "المؤهلات والترخيص"
  ],
  [
    "أنا معالج فيزيائي، هل أستطيع التسجيل؟",
    "يمكن للمعالجين الفيزيائيين"
  ],
  [
    "كيف أقدم طلباً؟",
    "افتح صفحة اختصاصك"
  ],
  [
    "ما المستندات المطلوبة؟",
    "تختلف المستندات"
  ],
  [
    "هل التقديم مجاني؟",
    "مجاني"
  ],
  [
    "هل هناك اشتراك شهري؟",
    "لا توجد رسوم"
  ],
  [
    "كيف أطلب رعاية لوالدتي؟",
    "طلب العائلي"
  ],
  [
    "متى ترد الإدارة؟",
    "لا أستطيع تأكيد وقت"
  ],
  [
    "هل القبول تلقائي؟",
    "لا. إرسال الطلب"
  ],
  [
    "كيف تحمون بياناتي؟",
    "تُستخدم البيانات"
  ],
  [
    "هل أرسل جواز السفر؟",
    "لا تطلب رفيق جواز السفر"
  ],
  [
    "كيف أتواصل معكم؟",
    "واتساب الرسمي"
  ],
  [
    "أريد رابط قناة واتساب",
    "whatsapp.com/channel"
  ],
  [
    "أريد رابط قناة Telegram",
    "t.me/+"
  ],
  [
    "هل تعطيني تشخيصاً ودواء؟",
    "لا يقدم وكيل رفيق تشخيصاً"
  ],
  [
    "هناك حالة طارئة ولا يتنفس",
    "خدمات الطوارئ المحلية"
  ],
  [
    "كم سعر الرعاية؟",
    "لا أعتمد سعراً"
  ],
  [
    "ما رقم فرعكم في كوكب المريخ؟",
    "لا أعرف الإجابة المؤكدة"
  ]
];
for(const [question,expected] of cases){test(question,()=>{const r=answer(question);assert.ok(r.reply.includes(expected),JSON.stringify(r));});}
test("English question receives English",()=>assert.match(answer("What services do you provide?").reply,/Core services/));
test("French question receives French",()=>assert.match(answer("Quels services proposez-vous ?").reply,/Les services principaux/));
test("explicit locale overrides detection",()=>assert.equal(answer("What services do you provide?","ar").locale,"ar"));
test("unknown question is escalated, not fabricated",()=>assert.match(answer("What is the status of my unlisted case?").reply,/don’t know/));
