(function(root){
"use strict";
function beirutDayNumber(date){
 var parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Beirut",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(date||new Date());
 var p={};parts.forEach(function(x){if(x.type!=="literal")p[x.type]=x.value;});
 var utc=Date.UTC(Number(p.year),Number(p.month)-1,Number(p.day));
 return Math.floor(utc/86400000);
}
function indexForDate(date,count){if(!Number.isInteger(count)||count<1)throw new RangeError("count must be a positive integer");return ((beirutDayNumber(date)%count)+count)%count;}
var api={beirutDayNumber:beirutDayNumber,indexForDate:indexForDate};
if(typeof module!=="undefined"&&module.exports)module.exports=api;
if(root)root.RAFIQ_WELCOME_ROTATION=api;
})(typeof window!=="undefined"?window:null);
