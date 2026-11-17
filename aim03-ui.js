"use strict";
/* AIM03 · Diseño aprobado hasta tres niveles.
   No atribuye datos de un Excel a ningún servicio sin confirmar su origen. */
(function(){
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const fmt=v=>Number.isFinite(v)?(v*100).toFixed(1)+"%":"—";
  const index=v=>Number.isFinite(v)?v.toFixed(3):"—";
  const pctPoint=v=>Number.isFinite(v)?(v>=0?"+":"")+(v*100).toFixed(2)+" p.p.":"—";
  const ids=()=>data.services.map(s=>s.id);
  const colors=["#2b69d6","#0e9274","#865cc7","#dc832d","#b94b72","#578c9b","#65759b"];
  let selected="P02",section="seguimiento",component=null,curveSelection=new Set(["P02","P05"]),cutOverrides={};
  const pack=code=>(window.AIM03_SERIES?.servicios||{})[code]||{estado:null,registros:[]};
  function records(code){
    const rows=(pack(code).registros||[]).filter(r=>typeof r.fecha==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(r.fecha)&&Number.isFinite(+r.ev)&&Number.isFinite(+r.pv)&&+r.ev>=0&&+r.ev<=1.01&&+r.pv>=0&&+r.pv<=1.01);
    rows.sort((a,b)=>a.fecha.localeCompare(b.fecha));
    return rows.filter((r,i)=>i===rows.length-1||r.fecha!==rows[i+1].fecha);
  }
  function at(code){const rows=records(code);const cutDate=cutOverrides[code];return cutDate?rows.filter(r=>r.fecha<=cutDate):rows}
  function mean(values){const v=values.filter(Number.isFinite);return v.length?v.reduce((a,b)=>a+b,0)/v.length:null}
  function measure(code){
    const svc=data.services.find(s=>s.id===code),rows=at(code),r=rows.at(-1),tasks=scoped(code);
    const demo=tasks.length?agg(tasks):null,p=pack(code);
    let real=r?+r.ev:demo?demo.a/100:null,planv=r?+r.pv:demo?demo.p/100:null;
    let spi=r?(r.spi!=null&&Number.isFinite(+r.spi)?+r.spi:planv>0?real/planv:null):demo&&demo.p>0?demo.spi:null;
    const finished=p.estado==="cerrado"&&r&&real>=.999;
    const measured=!!r ||!!demo;
    const state=finished?"cerrado":measured?(real>=.999?"cierre-pendiente":real>0?"en-ejecucion":"sin-iniciar"):"sin-base";
    return {svc,code,rows,latest:r,real,plan:planv,spi,state,hasSource:!!r,isDemo:!r,ppc:r&&r.ppc!=null&&Number.isFinite(+r.ppc)?+r.ppc:null,
      ppcAvg:r?mean(rows.map(v=>v.ppc==null?null:+v.ppc)):null,
      variance:Number.isFinite(real)&&Number.isFinite(planv)?real-planv:null,
      start:rows[0]?.fecha||null,end:r?.fecha||null};
  }
  const statusText=m=>({"cerrado":"Cerrado","en-ejecucion":"En ejecución","cierre-pendiente":"100% físico · cierre pendiente","sin-iniciar":"Sin iniciar","sin-base":"Sin datos"})[m.state];
  const semColor=m=>m.state==="cerrado"?"done":m.state==="sin-base"||!Number.isFinite(m.spi)?"none":m.spi<.7?"red":m.spi<.85?"orange":"green";
  const isDelayed=m=>m.state==="en-ejecucion"&&Number.isFinite(m.spi)&&m.spi<.85;
  function empty(message){return '<div class="aim-empty">'+esc(message)+'</div>'}
  function lineChart(series,opt={}){
    const cfg={height:210,ratio:false,title:"",...opt},list=series.filter(s=>s.values?.length>=2);
    if(!list.length)return empty(cfg.emptyText||"Sin datos publicados para este gráfico.");
    const minT=Math.min(...list.map(s=>s.values[0][0])),maxT=Math.max(...list.map(s=>s.values.at(-1)[0]));
    const W=800,H=cfg.height,L=43,R=785,T=16,B=H-34,span=Math.max(1,maxT-minT);
    const top=cfg.max??Math.max(1,...list.flatMap(s=>s.values.map(p=>p[1]))),bottom=cfg.min??0;
    const yy=v=>B-(v-bottom)/Math.max(.0001,top-bottom)*(B-T),xx=t=>L+(t-minT)/span*(R-L);
    let svg='<svg viewBox="0 0 '+W+' '+H+'" class="aim-curve" role="img" aria-label="'+esc(cfg.title)+'">';
    for(let n=0;n<=4;n++){const v=bottom+(top-bottom)*n/4;svg+='<line x1="'+L+'" y1="'+yy(v)+'" x2="'+R+'" y2="'+yy(v)+'" stroke="#e4eaf2" stroke-dasharray="3 4"/><text x="'+(L-7)+'" y="'+(yy(v)+3)+'" font-size="10" text-anchor="end" fill="#7287a2">'+(cfg.ratio?v.toFixed(2):Math.round(v*100)+"%")+'</text>'}
    if(cfg.threshold!=null){const y=yy(cfg.threshold);if(y>=T&&y<=B)svg+='<line x1="'+L+'" y1="'+y+'" x2="'+R+'" y2="'+y+'" stroke="#d48a31" stroke-width="1" stroke-dasharray="6 5"/>'}
    for(const s of list){const path=s.values.map((v,i)=>(i?"L":"M")+xx(v[0]).toFixed(1)+" "+yy(v[1]).toFixed(1)).join(" ");
      svg+='<path d="'+path+'" stroke="'+s.color+'" fill="none" stroke-width="'+(s.dashed?2:2.6)+'"'+(s.dashed?' stroke-dasharray="6 4"':'')+' stroke-linecap="round" stroke-linejoin="round"/>';
    }
    for(let i=0;i<=4;i++){
      const x=L+(R-L)*i/4;
      let label;if(cfg.calendar){const date=new Date(minT+span*i/4);label=date.toLocaleDateString("es-PE",{day:"2-digit",month:"short",year:"2-digit",timeZone:"UTC"})}else label="S"+Math.round(1+(maxT-minT)*i/4);
      svg+='<text x="'+x+'" y="'+(H-10)+'" text-anchor="middle" font-size="10" fill="#7187a2">'+label+'</text>';
    }
    svg+="</svg>";
    return svg+'<div class="aim-chart-key">'+list.map(s=>'<span><i style="background:'+s.color+'"></i>'+esc(s.name)+(s.dashed?" (plan)":" (real)")+'</span>').join("")+'</div>';
  }
  const tDate=iso=>new Date(iso+"T00:00:00Z").getTime();
  function demoCurves(code){
    const tasks=scoped(code);if(!tasks.length)return [];
    return [{name:code,values:Array.from({length:cut},(_,i)=>[i+1,agg(tasks,i+1).a/100]),color:colors[ids().indexOf(code)%colors.length],dashed:false},
      {name:code,values:Array.from({length:cut},(_,i)=>[i+1,agg(tasks,i+1).p/100]),color:colors[ids().indexOf(code)%colors.length],dashed:true}];
  }
  function serviceCurves(code){
    const rows=at(code),color=colors[ids().indexOf(code)%colors.length];
    if(rows.length>=2)return [{name:code,values:rows.map(r=>[tDate(r.fecha),+r.ev]),color,dashed:false},
      {name:code,values:rows.map(r=>[tDate(r.fecha),+r.pv]),color,dashed:true}];
    return [];
  }
  function renderHome(){
    const ms=ids().map(measure),active=ms.filter(m=>m.state==="en-ejecucion").length,closed=ms.filter(m=>m.state==="cerrado").length,late=ms.filter(isDelayed).length;
    const states=[["SERVICIOS EN EJECUCIÓN",active],["SERVICIOS CERRADOS",closed],["SERVICIOS CON ATRASO",late]];
    $("globalMetrics").innerHTML=states.map(([label,n])=>'<div class="metric"><div class="cap">'+label+'</div><div class="num">'+n+'</div><div class="foot">'+(label.includes("ATRASO")?"SPI inferior a 0.85":"Según el estado de cada servicio")+'</div></div>').join("");
    $("packageCards").innerHTML=ms.map(m=>{
      const color=semColor(m),tag=m.state==="cerrado"?"✓":color==="none"?"·":"●";
      const vals=[["Plan",fmt(m.plan)],["Real",fmt(m.real)],["SPI",m.state==="cerrado"?"—":index(m.spi)],["PPC promedio",fmt(m.ppcAvg)]];
      return '<button type="button" class="aim-card aim-card-v05" data-aim-service="'+m.code+'">'+
        '<span class="aim-card-top"><b class="aim-code">'+m.code+'</b><span class="aim-traffic '+color+'" title="Estado según SPI">'+tag+'</span></span>'+
        '<strong>'+esc(m.svc?.name||m.code)+'</strong><span class="aim-status">'+statusText(m)+(m.isDemo&&m.real!=null?" · demo":"")+'</span>'+
        '<span class="aim-card-grid">'+vals.map(([title,value])=>'<span><small>'+title+'</small><b>'+value+'</b></span>').join("")+'</span></button>';
    }).join("");
    const selector=$("homeCurveSelector");
    selector.innerHTML=ms.map(m=>'<label class="aim-curve-check"><input type="checkbox" data-aim-curve="'+m.code+'" '+(curveSelection.has(m.code)?"checked":"")+'><span>'+m.code+'</span></label>').join("");
    const selected=[...curveSelection].filter(id=>ids().includes(id));const live=selected.flatMap(serviceCurves);
    const calendar=live.length>0;
    const curves=calendar?live:selected.flatMap(demoCurves);
    $("homeServiceCurve").innerHTML=lineChart(curves,{calendar,title:"Curvas S por servicio",emptyText:"No se dispone de curvas para los servicios seleccionados."});
    $("homeCurveExplanation").textContent=calendar?"Fechas calendario de los archivos publicados. Cada serie comienza en su primera fecha válida.":"Vista preliminar con semanas de DEMOSTRACIÓN. Las fechas calendario se mostrarán cuando se autoricen y vinculen los Excel de cada servicio.";
  }
  function historical(code,field,{ratio=false,threshold,emptyText,min,max}={}){
    const rows=at(code).filter(r=>r[field]!=null&&Number.isFinite(+r[field]));
    return lineChart([{name:field.toUpperCase(),color:field==="ppc"?"#c99524":"#755ac7",values:rows.map(r=>[tDate(r.fecha),+r[field]])}],
     {calendar:true,ratio,max:max??(ratio?1.2:1),min:min??0,threshold,emptyText:emptyText||"El Excel del servicio todavía no tiene una serie vinculada."});
  }
  function dailyBars(code){
    const rows=at(code).filter(r=>r.delta_real!=null&&Number.isFinite(+r.delta_real));
    if(!rows.length)return empty("El avance diario estará disponible cuando se vincule el Excel del servicio.");
    const W=800,H=195,L=40,R=783,B=155,T=14,max=Math.max(.001,...rows.map(r=>+r.delta_real));
    let svg='<svg class="aim-curve" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Avance diario del servicio">';
    rows.forEach((r,i)=>{const x=L+(R-L)*i/Math.max(1,rows.length),w=Math.max(1,(R-L)/rows.length-.7),bh=(+r.delta_real/max)*(B-T);
      svg+='<rect x="'+x+'" y="'+(B-bh)+'" width="'+w+'" height="'+bh+'" fill="#3488dc" opacity=".85"/>'});
    svg+='<line x1="'+L+'" y1="'+B+'" x2="'+R+'" y2="'+B+'" stroke="#a6b7c9"/><text x="'+L+'" y="180" font-size="10" fill="#7c8da2">'+rows[0].fecha+'</text><text x="'+R+'" y="180" text-anchor="end" font-size="10" fill="#7c8da2">'+rows.at(-1).fecha+'</text></svg>';return svg;
  }
  function renderService(){
    if(!ids().includes(selected))selected=ids()[0];
    const m=measure(selected),svc=m.svc; if(!svc)return;
    $("serviceNav").innerHTML=data.services.map(s=>'<button type="button" data-aim-service="'+s.id+'" class="aim-service-selector '+(s.id===selected?"sel":"")+'"><small>'+s.id+'</small>'+esc(s.name)+'</button>').join("");
    $("serviceTitle").textContent=svc.id+" · "+svc.name;
    $("serviceDescription").textContent=svc.description||"";
    $("serviceSegmented").innerHTML='<button type="button" data-aim-section="seguimiento" class="'+(section==="seguimiento"?"sel":"")+'">Seguimiento</button><button type="button" data-aim-section="frentes" class="'+(section==="frentes"?"sel":"")+'">Frentes y componentes</button>';
    $("serviceFollowupView").hidden=section!=="seguimiento";$("serviceFrontsView").hidden=section!=="frentes";
    const vals=[["AVANCE REAL",fmt(m.real)],["PROGRAMADO",fmt(m.plan)],["DESVÍO",pctPoint(m.variance)],["SPI",m.state==="cerrado"?"No aplica":index(m.spi)],["PPC DIARIO",fmt(m.ppc)],["PPC PROMEDIO",fmt(m.ppcAvg)]];
    $("serviceStats").innerHTML=vals.map(([k,v])=>'<div class="aim-stat"><small>'+k+'</small><b>'+v+'</b></div>').join("");
    $("serviceNote").textContent=m.hasSource?"Origen: indicadores publicados del servicio. Los avances se muestran al corte seleccionado.":"Sin serie oficial asignada. Solo avance físico de DEMOSTRACIÓN cuando existe EDT sintética; PPC no disponible.";
    const picker=$("serviceCutDate");picker.disabled=!m.hasSource;picker.min=m.start||"";picker.max=records(selected).at(-1)?.fecha||"";picker.value=m.end||"";
    $("serviceCutLabel").textContent=m.end?"Corte "+m.end:"Corte de demostración";
    $("serviceCurve").innerHTML=lineChart(serviceCurves(selected).length?serviceCurves(selected):demoCurves(selected),{calendar:!!serviceCurves(selected).length,title:"Curva S por servicio"});
    $("servicePpcChart").innerHTML=historical(selected,"ppc",{max:1,emptyText:"Sin historial PPC publicado para este servicio."});
    $("serviceSpiChart").innerHTML=historical(selected,"spi",{ratio:true,threshold:.85,emptyText:"Sin historial SPI publicado para este servicio."});
    $("serviceDeltaChart").innerHTML=historical(selected,"desvio",{min:-.10,max:.05,emptyText:"Sin historial de desvíos publicado para este servicio."});
    $("serviceDailyChart").innerHTML=dailyBars(selected);
    renderFronts();
  }
  const componentMap={
    P02:[["bloques","Bloques de defensa","Control por bloque y sus actividades"],["losa","Losa superior","Control por áreas"],["vigas","Vigas de borde","Lado tierra y lado mar"],["rieles","Rieles","Control por tramos"]],
    P05:[["arriostres","Pilotes de arriostre","Control por eje y componentes"]],
    P07:[["revestimiento","Revestimiento sobre tablero","Control futuro por áreas"]]
  };
  function renderFronts(){
    const list=componentMap[selected]||[];
    const container=$("frontComponents");
    container.innerHTML=list.length?list.map(c=>'<button type="button" class="aim-front-card '+(component===c[0]?"sel":"")+'" data-aim-component="'+esc(c[0])+'"><b>'+esc(c[1])+'</b><small>'+esc(c[2])+'</small></button>').join(""):empty("Los frentes de este servicio se definirán según su EDT aprobada.");
    const label=list.find(c=>c[0]===component);
    $("frontDetailTitle").textContent=label?label[1]:"Selecciona un componente";
    $("frontDetail").innerHTML=label?'<div class="aim-empty">Estructura preparada para vincular el mapa, las actividades y las tarjetas del componente «'+esc(label[1])+'». No se han asignado porcentajes ni estados ficticios de frentes.</div>':
      '<div class="aim-empty">Elige un frente o componente para continuar con el diseño del tercer nivel.</div>';
  }
  function refresh(){renderHome();renderService()}
  window.aim03Refresh=refresh;
  document.addEventListener("click",e=>{
    const btn=e.target.closest("button");if(!btn)return;
    if(btn.dataset.aimService){selected=btn.dataset.aimService;section="seguimiento";component=null;showScreen("services");refresh();}
    if(btn.dataset.aimSection){section=btn.dataset.aimSection;renderService();}
    if(btn.dataset.aimComponent){component=btn.dataset.aimComponent;renderFronts();}
    if(btn.dataset.screen==="ifc"){const frame=$("ifcFrame");if(!frame.getAttribute("src"))frame.src="modelo-ifc.html";}
  });
  document.addEventListener("change",e=>{
    const input=e.target;
    if(input.matches("[data-aim-curve]")){if(input.checked)curveSelection.add(input.dataset.aimCurve);else curveSelection.delete(input.dataset.aimCurve);renderHome();}
    if(input.id==="serviceCutDate"){cutOverrides[selected]=input.value;renderService();}
  });
  window.addEventListener("message",e=>{
    if(e.origin!==location.origin||e.data?.kind!=="aim03.ifc-selection")return;
    const {service,name,expressID,activity}=e.data;
    const block=$("ifcSelection");block.textContent="Elemento "+expressID+" · "+(name||"Sin nombre")+" · "+service+" · "+(activity||"Actividad por definir")+". Eje por validar. ";
    if(ids().includes(service)){const b=document.createElement("button");b.type="button";b.className="btn";b.dataset.aimService=service;b.textContent="Abrir paquete "+service;block.append(b)}
  });
  refresh();
})();