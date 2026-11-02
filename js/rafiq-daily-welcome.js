(function(){
"use strict";
function start(){
 var path=location.pathname.split("/").pop()||"index.html";
 var pageByPath={"index.html":"home","nurses.html":"nurses","caregiver-application.html":"caregivers","physiotherapist-application.html":"physio","advertise.html":"ads","doctors.html":"doctors","family-care-request.html":"family","membership.html":"members"};
 var key=pageByPath[path];if(!key)return;
 var main=document.querySelector("main")||document.body;
 var banner=document.createElement("aside");banner.className="rafiq-daily-welcome";banner.setAttribute("role","status");banner.setAttribute("aria-live","polite");banner.setAttribute("aria-atomic","true");
 var style=document.createElement("style");style.textContent=".rafiq-daily-welcome{max-width:1040px;margin:12px auto 0;padding:12px 18px;border:1px solid #dcebe2;border-inline-start:4px solid #0b8059;border-radius:13px;background:#f7fbf8;color:#245442;font:500 15px/1.7 Arial,Tahoma,sans-serif;text-align:center;box-shadow:0 2px 10px #1231}.rafiq-daily-welcome[hidden]{display:none}@media(max-width:600px){.rafiq-daily-welcome{margin:10px 12px 0;padding:10px 13px;font-size:14px}}@media(prefers-reduced-motion:reduce){.rafiq-daily-welcome{scroll-behavior:auto}}";
 document.head.appendChild(style);main.insertBefore(banner,main.firstChild);
 fetch("./data/welcome-messages.json",{cache:"force-cache"}).then(function(r){if(!r.ok)throw new Error("welcome data unavailable");return r.json();}).then(function(data){
  var list=data.pages&&data.pages[key];if(!Array.isArray(list)||!list.length)throw new Error("welcome messages missing");
  var idx=window.RAFIQ_WELCOME_ROTATION.indexForDate(new Date(),list.length);var item=list[idx];
  function render(lang){lang=(lang||document.documentElement.lang||"ar").slice(0,2).toLowerCase();if(["ar","en","fr"].indexOf(lang)<0)lang="ar";banner.textContent=item[lang]||item.ar;banner.lang=lang;banner.dir=lang==="ar"?"rtl":"ltr";}
  render(document.documentElement.lang);
  document.addEventListener("rafiq:i18n",function(e){render(e.detail&&e.detail.lang);});
 }).catch(function(){banner.hidden=true;});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();
