(function(){
"use strict";
const allowed=new Set(["application/pdf","image/jpeg","image/png"]),maxSize=8*1024*1024;
function message(form,text,type){const box=form.querySelector(".status");box.textContent=text;box.className="status "+type;}
function arabicValidity(form){form.querySelectorAll("input,select,textarea").forEach(el=>{el.addEventListener("invalid",()=>{if(el.validity.valueMissing)el.setCustomValidity("هذا الحقل مطلوب.");else if(el.validity.typeMismatch)el.setCustomValidity("يرجى إدخال قيمة صحيحة.");});el.addEventListener("input",()=>el.setCustomValidity(""));el.addEventListener("change",()=>el.setCustomValidity(""));});}
document.querySelectorAll("form[data-rafiq-intake]").forEach(form=>{
 arabicValidity(form);
 form.addEventListener("submit",async ev=>{
  ev.preventDefault();if(!form.reportValidity())return;
  const submit=form.querySelector('button[type="submit"]');const original=submit.textContent;
  const data=new FormData(form);if(form.dataset.role!=="institution")data.set("role",form.dataset.role);const fields=Array.from(form.querySelectorAll('input[type="file"][data-doc-category]'));
  let count=0;
  for(const input of fields){for(const f of Array.from(input.files||[])){if(!allowed.has(f.type)||f.size>maxSize){message(form,"الملف «"+f.name+"» غير مقبول. استخدم PDF أو JPG أو PNG، وبحجم لا يتجاوز 8MB.", "error");return;}data.append("files",f);data.append("document_category",input.dataset.docCategory);count++;}}
  if(count>8){message(form,"يمكن إرفاق 8 ملفات كحد أقصى.","error");return;}
  for(const input of fields)data.delete(input.name);
  submit.disabled=true;submit.textContent="جارٍ إرسال الطلب…";
  try{
   const response=await fetch(form.dataset.endpoint||"/api/public/intake",{method:"POST",body:data,headers:{"Accept":"application/json"}});
   const result=await response.json().catch(()=>({ok:false}));
   if(!response.ok||!result.ok)throw new Error(result.error||"تعذر إرسال الطلب. حاول مرة أخرى.");
   form.reset();message(form,"تم استلام طلبك وسنتواصل معك بعد مراجعته من إدارة رفيق. رقم الطلب: "+(result.request_id||result.application_number||"قيد التسجيل")+".","success");
  }catch(err){message(form,err&&err.message?err.message:"تعذر الاتصال حالياً. حاول مرة أخرى لاحقاً.","error");}
  finally{submit.disabled=false;submit.textContent=original;}
 });
});
})();