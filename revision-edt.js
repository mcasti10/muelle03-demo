"use strict";
(function(){
const NS="http://schemas.microsoft.com/project",state={P02:null,P05:null},notes=new Map(),checks=new Set();
let service="P02",selected="",search="",alertsOnly=false;
const $=s=>document.getElementById(s),esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function val(e,name){return [...(e?.children||[])].find(x=>x.localName===name)?.textContent||""}
function ch(e,name){return [...(e?.children||[])].filter(x=>x.localName===name)}
function n(x){return Number(x)||0}
function perc(x){return n(x).toLocaleString("es-PE",{maximumFractionDigits:1})+"%"}
function dt(x){return x?x.slice(0,10).split("-").reverse().join("/"):"—"}
function short(s){
const a=String(s||"").replace(/\s+/g," ").trim(),t=a.toUpperCase();
const p=[[/REPLANTEO|TRAZOS|NIVELES/,"Replanteo"],[/DESMONTAJE.*FENDER|DESMONTAJE Y RETIRO DE DEFENSAS/,"Desmontaje de defensa"],[/CORTE.*ELEMENTOS METÁLICOS/,"Retiro de fijaciones"],[/PICADO|DEMOLICI[ÓO]N/,"Demolición / picado"],[/EXCAVACI[ÓO]N.*ESCORIA/,"Excavación de escoria"],[/EXCAVACI[ÓO]N/,"Excavación"],[/ELIMINACI[ÓO]N DE MATERIAL/,"Eliminación de material"],[/GROUT/,"Retiro de grout"],[/RETIRO DE TIRANTES/,"Retiro de tirantes"],[/SUMINISTRO DE BARRAS/,"Suministro de barras"],[/INSTALACI[ÓO]N DE BARRAS/,"Anclajes DYWIDAG"],[/INSTALACI[ÓO]N DE TIRANTES/,"Tirantes nuevos"],[/SUMINISTRO DE VIGAS/,"Suministro de vigas"],[/MONTAJE DE VIGAS/,"Montaje de vigas"],[/ANCLAJES/,"Anclajes"],[/ACERO DE REFUERZO/,"Acero"],[/ENCOFRADO/,"Encofrado"],[/CURADO|MEMBRANA DE CURADO/,"Curado"],[/CONCRETO PREMEZCLADO|MORTERO DE REPARACI[ÓO]N/,"Concreto / mortero"],[/PUENTE ADHERENTE/,"Puente adherente"],[/GEOTEXTIL/,"Geotextil"],[/PIEDRA FILTRO/,"Piedra filtro"],[/COMPACTACI[ÓO]N/,"Compactación"],[/RELLENO/,"Relleno"],[/MONTAJE Y FIJACI[ÓO]N DE COMPONENTES|MONTAJE Y FIJACI[ÓO]N DE DEFENSAS/,"Montaje de componentes"],[/CADENAS|GRILLETES/,"Cadenas y accesorios"],[/ALINEAMIENTO.*TORQUES/,"Alineamiento y torque"],[/VERIFICACI[ÓO]N|INSPECCI[ÓO]N/,"Verificación"],[/SELLADO DE JUNTAS/,"Sellado de juntas"]];
for(let i=0;i<p.length;i++)if(p[i][0].test(t))return p[i][1];return a.length>57?a.slice(0,55)+"…":a;
}
function parse(source,code,file){
const doc=new DOMParser().parseFromString(source,"application/xml");
if(doc.querySelector("parsererror")||doc.documentElement.localName!=="Project")throw Error("No es un XML Microsoft Project válido");
const elements=[...doc.getElementsByTagNameNS(NS,"Task")];if(elements.length>15000)throw Error("Archivo demasiado grande");
const tasks=[],byUid=new Map(),stack=[];
elements.forEach(el=>{
const uid=val(el,"UID"),level=n(val(el,"OutlineLevel"));if(!uid)return;
const t={uid,name:val(el,"Name"),level,summary:val(el,"Summary")==="1",id:val(el,"ID"),wbs:val(el,"WBS"),general:n(val(el,"PercentComplete")),physical:n(val(el,"PhysicalPercentComplete")),start:val(el,"Start"),finish:val(el,"Finish"),pred:[],kids:[],parent:null};
ch(el,"PredecessorLink").forEach(l=>t.pred.push({uid:val(l,"PredecessorUID"),type:({0:"FF",1:"FS",2:"SF",3:"SS"})[n(val(l,"Type"))]||"?",lag:val(l,"LinkLag")===""?null:Number(val(l,"LinkLag"))}));
while(stack.length&&stack[stack.length-1].level>=level)stack.pop();
t.parent=stack[stack.length-1]||null;if(t.parent)t.parent.kids.push(t);
stack.push(t);tasks.push(t);byUid.set(uid,t);
});
let places=[];
tasks.forEach(t=>{if(!t.summary)return;let m=code==="P02"?t.name.match(/^SECTOR\s+[AB]\s*\d+[\s\-–]*BLOQUE\s+(\d+)/i):t.name.match(/^EJES?\s+DE\s+INTERVENCI[ÓO]N\s+(\d+)/i);if(m){t.number=n(m[1]);t.key=(code==="P02"?"B":"E")+String(t.number).padStart(2,"0");t.label=(code==="P02"?"Bloque ":"Eje ")+String(t.number).padStart(2,"0");places.push(t)}});
places.sort((a,b)=>a.number-b.number);
const descendants=root=>{let result=[],pending=[...root.kids];while(pending.length){const t=pending.shift();result.push(t);pending.unshift(...t.kids)}return result};
return {file,code,tasks,places,byUid,descendants,links:tasks.reduce((k,t)=>k+t.pred.length,0),status:doc.getElementsByTagNameNS(NS,"StatusDate")[0]?.textContent||""};
}
function leaves(d,p){return d.descendants(p).filter(t=>t.kids.length===0)}
function flags(d,p){
let out=[];leaves(d,p).forEach(t=>{
if(t.general>0&&t.physical===0)out.push({uid:t.uid,t,kind:"Avance general > 0 y físico 0"});
t.pred.forEach(l=>{const pre=d.byUid.get(l.uid);if(!pre)return;
if(t.general>0&&pre.general<100&&l.type==="FS")out.push({uid:t.uid,t,kind:(l.lag!==null&&l.lag<0?"FS con adelanto: revisar solape":"FS con predecesora aún incompleta")+": "+short(pre.name)+" ("+perc(pre.general)+")"});
});
});return out;
}
function render(){
$("tab-p02").classList.toggle("active",service==="P02");$("tab-p05").classList.toggle("active",service==="P05");
const d=state[service];
$("metrics").innerHTML=[["TAREAS",d?d.tasks.length:"—","Incluye resúmenes"],["VÍNCULOS",d?d.links:"—","Predecesoras del XML"],["UBICACIONES",d?d.places.length:"—","Ejes o bloques"],["FECHA DE CORTE",d?dt(d.status):"—","Project"]].map(a=>'<div class="stat"><div class="label">'+a[0]+'</div><b>'+a[1]+'</b><small>'+a[2]+'</small></div>').join("");
$("export-review").disabled=!state.P02&&!state.P05;$("search").disabled=!d;$("location").disabled=!d;
if(!d){$("tiles").innerHTML="";$("location").innerHTML="<option>Sin XML</option>";$("details").innerHTML='<div class="empty">Selecciona el XML del servicio para comenzar.</div>';return}
if(!d.places.some(p=>p.key===selected))selected=d.places[0]?.key||"";
$("location").innerHTML=d.places.map(p=>'<option value="'+p.key+'" '+(p.key===selected?"selected":"")+'>'+p.label+'</option>').join("");
$("tiles").innerHTML=d.places.map(p=>'<button class="tile '+(p.key===selected?"active":"")+'" data-pick="'+p.key+'"><strong>'+p.label+'</strong><span>General '+perc(p.general)+' · Físico '+perc(p.physical)+'</span><div class="bar"><i style="width:'+p.physical+'%"></i></div><em>'+flags(d,p).length+' alertas</em></button>').join("");
document.querySelectorAll("[data-pick]").forEach(b=>b.onclick=()=>{selected=b.dataset.pick;search="";$("search").value="";render()});
const p=d.places.find(p=>p.key===selected);if(!p){$("details").innerHTML='<div class="empty">No se reconocen ubicaciones en este XML.</div>';return}
const all=leaves(d,p),found=flags(d,p),flagged=new Set(found.map(f=>f.uid));
let html='<div class="detail-header"><div><div class="eyebrow">'+service+' · '+p.label+'</div><h2>'+esc(p.name)+'</h2><p>'+all.length+' partidas · General Project '+perc(p.general)+' · Físico Project '+perc(p.physical)+'</p></div><div class="pills"><span class="pill '+(all.every(t=>t.physical===100)?"ok":"warn")+'">'+all.filter(t=>t.physical<100).length+' partidas físicas pendientes</span><span class="pill '+(found.length?"bad":"ok")+'">'+found.length+' alertas</span><span class="pill warn">Liberación técnica no verificada</span></div></div>';
html+='<div class="alert info"><b>Interpretación:</b> los vínculos provienen de Microsoft Project. Un adelanto FS puede permitir solapes. El cierre físico y la liberación técnica son independientes. No se acredita inspección, torque, curado, ensayos ni estabilidad temporal por el solo porcentaje.</div>';
html+=service==="P02"?'<div class="alert">Fender: antes de liberarlo, validar reparación aplicable del bloque, anclajes, montaje, cadenas, alineamiento, torque e inspección. El XML no acredita todas estas condiciones.</div>':'<div class="alert">Arriostre: verificar secuencia de retiro de tirantes, estabilidad temporal y aceptación del sistema de anclajes contra ingeniería aprobada.</div>';
if(found.length)html+='<details style="margin:12px 0"><summary style="cursor:pointer;font-weight:800;color:#925c21">Ver '+found.length+' alertas de coherencia</summary><ul>'+found.slice(0,25).map(f=>'<li>'+esc(short(f.t.name))+' · '+esc(f.kind)+'</li>').join("")+'</ul></details>';
const groups=new Map();
all.forEach(t=>{if(search&&!((t.name+" "+short(t.name)+" "+t.uid).toLowerCase().includes(search)))return;if(alertsOnly&&!flagged.has(t.uid))return;
let a=t;while(a.parent&&a.parent.uid!==p.uid)a=a.parent;const group=short(a.name);if(!groups.has(group))groups.set(group,[]);groups.get(group).push(t)});
for(const [title,ts] of groups){
html+='<section class="stage"><h3>'+esc(title)+' <span>'+ts.length+' partidas</span></h3><div class="table-wrap"><table><thead><tr><th>Partida simplificada y original</th><th>General</th><th>Físico</th><th>Predecesoras reales</th><th>Fechas</th><th>Revisión</th></tr></thead><tbody>';
ts.forEach(t=>{const key=service+":"+t.uid;
const preds=t.pred.map(l=>{const pre=d.byUid.get(l.uid);if(!pre)return "UID "+esc(l.uid);return '<button class="link" data-uid="'+esc(pre.uid)+'" title="'+esc(pre.name)+'">'+esc(l.type)+' '+esc(short(pre.name))+(l.lag!==null&&l.lag!==0?' · '+(l.lag<0?"adelanto ":"retraso ")+Math.abs(l.lag)/600+' h':"")+'</button>'}).join(" ")||'<span class="muted">Sin predecesora</span>';
html+='<tr style="'+(flagged.has(t.uid)?"background:#fffaf3":"")+'"><td class="name"><div class="short">'+esc(short(t.name))+'</div><div class="original">'+esc(t.name)+'</div><div class="hint">UID '+esc(t.uid)+' · ID '+esc(t.id)+'</div></td><td class="num">'+perc(t.general)+'</td><td class="num">'+perc(t.physical)+'<div class="progress"><i style="width:'+t.physical+'%"></i></div></td><td>'+preds+'</td><td class="num">'+dt(t.start)+'<br>'+dt(t.finish)+'</td><td><label class="check"><input type="checkbox" data-check="'+esc(key)+'" '+(checks.has(key)?"checked":"")+'> Revisada</label><br><input type="text" data-note="'+esc(key)+'" placeholder="Observación" value="'+esc(notes.get(key)||"")+'" style="max-width:150px;border:1px solid #dce5f0;border-radius:5px;padding:4px;margin-top:6px"></td></tr>';
});html+='</tbody></table></div></section>';
}
$("details").innerHTML=html+(groups.size?"":'<div class="empty">No hay partidas con los filtros seleccionados.</div>');
document.querySelectorAll("[data-check]").forEach(e=>e.onchange=()=>e.checked?checks.add(e.dataset.check):checks.delete(e.dataset.check));
document.querySelectorAll("[data-note]").forEach(e=>e.oninput=()=>e.value?notes.set(e.dataset.note,e.value):notes.delete(e.dataset.note));
document.querySelectorAll("[data-uid]").forEach(e=>e.onclick=()=>{const t=d.byUid.get(e.dataset.uid);if(!t)return;let par=t;while(par&&!d.places.includes(par))par=par.parent;if(par){selected=par.key;search=short(t.name).toLowerCase();$("search").value=search;alertsOnly=false;$("only-alerts").checked=false;render();$("details").scrollIntoView({behavior:"smooth"})}else alert("Predecesora fuera de la ubicación seleccionada: "+t.name)});
}
async function load(code,input){
const file=input.files?.[0];if(!file)return;
try{
if(file.size>60000000)throw Error("El XML excede 60 MB");
$("file-status").textContent="Procesando "+file.name+"…";
await new Promise(r=>setTimeout(r,0));
const d=parse(await file.text(),code,file.name);state[code]=d;service=code;selected="";search="";$("search").value="";alertsOnly=false;$("only-alerts").checked=false;
$("file-status").textContent=code+": "+d.tasks.length+" tareas, "+d.links+" dependencias y "+d.places.length+" ubicaciones. Archivo leído solo en tu navegador.";
render();
}catch(e){$("file-status").textContent="No se pudo leer el XML: "+e.message}finally{input.value=""}
}
$("file-p02").onchange=e=>load("P02",e.target);$("file-p05").onchange=e=>load("P05",e.target);
$("tab-p02").onclick=()=>{service="P02";selected="";search="";$("search").value="";render()};
$("tab-p05").onclick=()=>{service="P05";selected="";search="";$("search").value="";render()};
$("location").onchange=e=>{selected=e.target.value;render()};
$("search").oninput=e=>{search=e.target.value.trim().toLowerCase();render()};
$("only-alerts").onchange=e=>{alertsOnly=e.target.checked;render()};
$("export-review").onclick=()=>{
const rows=[["Servicio","UID","Ubicación","Actividad original","Actividad resumida","Revisada","Observación"]];
for(const code of ["P02","P05"]){const d=state[code];if(!d)continue;d.places.forEach(p=>leaves(d,p).forEach(t=>{const k=code+":"+t.uid;if(checks.has(k)||notes.has(k))rows.push([code,t.uid,p.label,t.name,short(t.name),checks.has(k)?"Sí":"No",notes.get(k)||""])}))}
const content="\ufeff"+rows.map(row=>row.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(";")).join("\r\n"),url=URL.createObjectURL(new Blob([content],{type:"text/csv;charset=utf-8"})),a=document.createElement("a");a.href=url;a.download="Muelle03_Observaciones_EDT.csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
render();
})();