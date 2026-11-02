import { answer } from "./core.mjs";
const DEFAULT_ORIGIN = "https://index-html.issaapplication.workers.dev";
const allowedOrigins = (Deno.env.get("RAFIQ_ALLOWED_ORIGINS") || DEFAULT_ORIGIN).split(",").map((x)=>x.trim()).filter(Boolean);
function response(body,status=200,origin=null){const headers=new Headers({"content-type":"application/json; charset=utf-8","cache-control":"no-store","vary":"Origin"});if(origin&&allowedOrigins.includes(origin)){headers.set("access-control-allow-origin",origin);headers.set("access-control-allow-headers","authorization, apikey, content-type, x-client-info");headers.set("access-control-allow-methods","POST, OPTIONS");}return new Response(JSON.stringify(body),{status,headers});}
Deno.serve(async(req)=>{const origin=req.headers.get("origin");if(req.method==="OPTIONS"){if(origin&&!allowedOrigins.includes(origin))return response({ok:false,error:"origin_not_allowed"},403);return response({ok:true},200,origin);}
if(req.method!=="POST")return response({ok:false,error:"method_not_allowed"},405,origin);if(origin&&!allowedOrigins.includes(origin))return response({ok:false,error:"origin_not_allowed"},403);
let body;try{body=await req.json();}catch{return response({ok:false,error:"invalid_json"},400,origin);}const message=String(body?.message||"").trim();if(!message||message.length>2000)return response({ok:false,error:"message_required_or_too_long"},400,origin);const result=answer(message,body?.locale);return response({ok:true,...result,mode:"knowledge_base"},200,origin);
});
