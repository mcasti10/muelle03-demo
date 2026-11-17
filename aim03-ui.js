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
  let selected="P02",section="seguimiento",component=null,frontNum=null,curveSelection=new Set(["P02","P05"]),cutOverrides={};
  const pack=code=>(window.AIM03_SERIES?.servicios||{})[code]||{estado:null,registros:[]};
  function records(code){
    const rows=(pack(code).registros||[]).filter(r=>typeof r.fecha==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(r.fecha)&&Number.isFinite(+r.ev)&&Number.isFinite(+r.pv)&&+r.ev>=0&&+r.ev<=1.01&&+r.pv>=0&&+r.pv<=1.01);
    rows.sort((a,b)=>a.fecha.localeCompare(b.fecha));
    return rows.filter((r,i)=>i===rows.length-1||r.fecha!==rows[i+1].fecha);
  }
  function at(code){const rows=records(code);const cutDate=cutOverrides[code];return cutDate?rows.filter(r=>r.fecha<=cutDate):rows}
  function mean(values){const v=values.filter(Number.isFinite);return v.length?v.reduce((a,b)=>a+b,0)/v.length:null}
  function measure(code){
    const svc=data.services.find(s=>s.id===code),rows=at(code),r=rows.at(-1),p=pack(code);
    const xml=window.AIM03_XML,summary=code==="P05"?xml?.P05?.overall:null;
    const physicalXml=Array.isArray(summary)&&Number.isFinite(summary[1])?summary[1]/100:null;
    const real=r?+r.ev:physicalXml,planv=r?+r.pv:null;
    const spi=r?(r.spi!=null&&Number.isFinite(+r.spi)?+r.spi:planv>0?real/planv:null):null;
    const finished=p.estado==="cerrado"&&real>=.999;
    const measured=Number.isFinite(real);
    const state=finished?"cerrado":measured?(real>=.999?"cierre-pendiente":real>0?"en-ejecucion":"sin-iniciar"):"sin-base";
    return {svc,code,rows,latest:r,real,plan:planv,spi,state,hasSource:!!r||!!summary,isDemo:false,ppc:r&&r.ppc!=null&&Number.isFinite(+r.ppc)?+r.ppc:null,
      ppcAvg:r?mean(rows.map(v=>v.ppc==null?null:+v.ppc)):null,
      variance:Number.isFinite(real)&&Number.isFinite(planv)?real-planv:null,
      start:rows[0]?.fecha||null,end:r?.fecha||(summary?xml.status.P05:null),
      origin:r?"Excel diario · P02":summary?"Cronograma XML · P05":"Sin fuente"};
  }
    const statusText=m=>({"cerrado":"Cerrado","en-ejecucion":"En ejecución","cierre-pendiente":"100% físico · cierre pendiente","sin-iniciar":"Sin iniciar","sin-base":"Sin datos"})[m.state];
  const semColor=m=>m.state==="cerrado"?"done":m.state==="sin-base"||!Number.isFinite(m.spi)?"none":m.spi<.7?"red":m.spi<.85?"orange":"green";
  const isDelayed=m=>m.state==="en-ejecucion"&&Number.isFinite(m.spi)&&m.spi<.85;
  const niceDate=iso=>/^\d{4}-\d{2}-\d{2}$/.test(iso||"")?iso.slice(8,10)+"/"+iso.slice(5,7)+"/"+iso.slice(0,4):"Sin fecha reportada";
  const tone=v=>v==null||!Number.isFinite(Number(v))?"missing":Number(v)>=100?"green":Number(v)>=85?"blue":Number(v)>=50?"yellow":Number(v)>=25?"orange":"red";
  const toneHex={green:"#199964",blue:"#179baa",yellow:"#d5ac32",orange:"#df9030",red:"#cc515c",missing:"#a0aebd"};
  function legend(){
    return '<div class="aim-legend"><b class="aim-legend-title">Avance físico</b>'+
      [["green","100%"],["blue","85–99%"],["yellow","50–84%"],["orange","25–49%"],["red","0–24%"],["missing","Sin dato"]].map(([c,t])=>'<span><i style="--state-color:'+toneHex[c]+'"></i>'+t+'</span>').join("")+'</div>';
  }
  function empty(message){return '<div class="aim-empty">'+esc(message)+'</div>'}
  function lineChart(series,opt={}){
    const cfg={height:210,ratio:false,title:"",...opt},list=series.filter(s=>s.values?.length>=2);
    if(!list.length)return empty(cfg.emptyText||"Sin datos publicados para este gráfico.");
    const minT=Math.min(...list.map(s=>s.values[0][0])),maxT=Math.max(...list.map(s=>s.values.at(-1)[0]));
    const W=800,H=cfg.height,L=43,R=785,T=16,B=H-34,span=Math.max(1,maxT-minT);
    const top=cfg.max??Math.max(1,...list.flatMap(s=>s.values.map(p=>p[1]))),bottom=cfg.min??0;
    const yy=v=>B-(v-bottom)/Math.max(.0001,top-bottom)*(B-T),xx=t=>L+(t-minT)/span*(R-L);
    let svg='<svg viewBox="0 0 '+W+' '+H+'" class="aim-curve" role="img" aria-label="'+esc(cfg.title)+'">';
    for(let n=0;n<=4;n++){const v=bottom+(top-bottom)*n/4;svg+='<line x1="'+L+'" y1="'+yy(v)+'" x2="'+R+'" y2="'+yy(v)+'" stroke="#e4eaf2" stroke-dasharray="3 4"/><text x="'+(L-7)+'" y="'+(yy(v)+3)+'" font-size="10" text-anchor="end" fill="#7287a2">'+(cfg.ratio?v.toFixed(2):cfg.pp?(v*100).toFixed(1)+" p.p.":Math.round(v*100)+"%")+'</text>'}
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
      return '<button type="button" class="aim-card aim-card-v05 aim-sema-'+color+'" data-aim-service="'+m.code+'">'+
        '<span class="aim-card-top"><b class="aim-code">'+m.code+'</b><span class="aim-traffic '+color+'" title="Estado según SPI">'+tag+'</span></span>'+
        '<strong>'+esc(m.svc?.name||m.code)+'</strong><span class="aim-status">'+statusText(m)+'</span>'+
        '<span class="aim-card-grid">'+vals.map(([title,value])=>'<span><small>'+title+'</small><b>'+value+'</b></span>').join("")+'</span>'+
        '<span class="aim-cut-card"><b>Fecha de corte</b><br>'+(
          m.code==="P02"?"Indicadores "+niceDate(m.end)+" · Actividades "+niceDate(window.AIM03_XML?.status?.P02):
          m.code==="P05"?"Actividades "+niceDate(window.AIM03_XML?.status?.P05):
          "Sin reporte validado"
        )+'</span></button>';
    }).join("");
    const selector=$("homeCurveSelector");
    selector.innerHTML=ms.map(m=>'<label class="aim-curve-check"><input type="checkbox" data-aim-curve="'+m.code+'" '+(curveSelection.has(m.code)?"checked":"")+'><span>'+m.code+'</span></label>').join("");
    const selected=[...curveSelection].filter(id=>ids().includes(id));const live=selected.flatMap(serviceCurves);
    const calendar=live.length>0;
    const curves=live;
    $("homeServiceCurve").innerHTML=lineChart(curves,{calendar,title:"Curvas S por servicio",emptyText:"No se dispone de curvas para los servicios seleccionados."});
    $("homeCurveExplanation").textContent=calendar?"Fechas calendario reales del Excel publicado. Cada serie comienza en su primera fecha válida. P05 no dispone todavía de una serie histórica EV/PV comparable.":"Sin curvas históricas publicadas para la selección. No se muestran avances simulados.";
  }
  function historical(code,field,{ratio=false,threshold,emptyText,min,max}={}){
    const rows=at(code).filter(r=>r[field]!=null&&Number.isFinite(+r[field]));
    return lineChart([{name:field.toUpperCase(),color:field==="ppc"?"#c99524":"#755ac7",values:rows.map(r=>[tDate(r.fecha),+r[field]])}],
     {calendar:true,ratio,pp:field==="desvio",max:max??(ratio?1.2:1),min:min??0,threshold,emptyText:emptyText||"El Excel del servicio todavía no tiene una serie vinculada."});
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
    $("serviceNote").textContent=m.hasSource?"Fuente: "+m.origin+". Corte "+m.end+". Los porcentajes de actividades XML corresponden al 08/11/2026, y la serie diaria de plataforma llega al 03/11/2026.":"Sin indicadores reportados para este servicio. No se asignan avances de demostración.";
    const picker=$("serviceCutDate");picker.disabled=!m.rows.length;picker.min=m.start||"";picker.max=records(selected).at(-1)?.fecha||"";picker.value=m.end||"";
    $("serviceCutLabel").textContent=m.end?"Corte "+m.end:"Sin corte";
    $("serviceCurve").innerHTML=lineChart(serviceCurves(selected),{calendar:true,title:"Curva S por servicio",emptyText:"No se dispone de serie histórica real y planificada comparable para este servicio."});
    $("servicePpcChart").innerHTML=historical(selected,"ppc",{max:1,emptyText:"Sin historial PPC publicado para este servicio."});
    $("serviceSpiChart").innerHTML=historical(selected,"spi",{ratio:true,threshold:.85,emptyText:"Sin historial SPI publicado para este servicio."});
    $("serviceDeltaChart").innerHTML=historical(selected,"desvio",{min:-.10,max:.05,emptyText:"Sin historial de desvíos publicado para este servicio."});
    $("serviceDailyChart").innerHTML=dailyBars(selected);
    renderProcessOverview();
    renderFronts();
  }

  const src=()=>window.AIM03_XML;
  const srcName=id=>src()?.names?.[id]||"Actividad sin título";
  const fmtSource=v=>Number.isFinite(v)?v.toFixed(0)+"%":"—";
  function circle(name,phys,pc,comment){
    const p=phys==null||!Number.isFinite(Number(phys))?null:Number(phys),
          v=p==null?0:Math.max(0,Math.min(100,p)),c=tone(p),
          diff=pc!=null&&p!=null&&Math.abs(Number(pc)-p)>=20;
    return '<div class="aim-process-item" style="--ring:'+toneHex[c]+'"><div class="aim-progress-ring '+(p===0?'is-zero':'')+' '+(p===null?'is-missing':'')+'" style="--aim-p:'+v+'%"><span>'+fmtSource(p)+'</span></div>'+
      '<b>'+esc(name)+'</b><small>Físico XML: '+fmtSource(p)+'<br>Avance cronograma: '+fmtSource(pc)+
      (diff?'<br><span class="data-warning">Indicadores diferentes</span>':'')+'</small>'+
      (comment?'<div class="aim-subscope-note">'+esc(comment)+'</div>':'')+'</div>';
  }
  function renderProcessOverview(){
    const target=$("serviceProcessOverview"),doc=src();
    if(!doc){target.innerHTML=empty("Cargando información de actividades desde los XML verificados.");return}
    if(!["P02","P05"].includes(selected)){target.innerHTML=empty("No tenemos cronograma XML de este servicio.");return}
    const all=doc.summary[selected]||[];
    const filtered=selected==="P02"?
      all.filter(t=>/DESMONTAJE DE RIELES|DESMONTAJE DE FENDERS|REPARACIÓN DE VIGAS DE BORDE LADO TIERRA|MOV\. DE TIERRAS Y LOSA|REPARACIÓN DE VIGAS DE BORDE LADO MAR|REPARACIÓN DE BLOQUES DE DEFENSA, DESMONTAJE|REPOSICIÓN DE LÍNEAS FERROVIARIAS|RED DE BANCODUCTOS|TORRE DE TRANSFERENCIA/i.test(srcName(t[1]))):
      all.filter(t=>t[4]===3&&/^SECTOR\s+[1-5](?:\b|[- ])/i.test(srcName(t[1])));
    target.innerHTML='<div class="aim-source-banner">Valores reportados en XML con fecha de estado '+doc.status[selected]+'. Los porcentajes físicos y los del cronograma se muestran por separado. No representan aceptación técnica.</div>'+
      (filtered.length?'<div class="aim-process-grid">'+filtered.map(t=>circle(srcName(t[1]),t[3],t[2])).join("")+'</div>':empty("Sin etapas agrupadas directamente en este XML."));
  }
  const componentMap={
    P02:[
      ["bloques","Bloques de defensa","21 bloques identificados por eje"],
      ["losa","Losa superior","21 sectores L1–L21 del XML"],
      ["viga_tierra","Vigas de borde tierra","21 sectores del XML"],
      ["viga_mar","Vigas de borde mar","21 sectores del XML"],
      ["rieles","Línea ferroviaria","Sin correspondencia por eje validada"]
    ],
    P05:[["arriostres","Pilotes de arriostre","39 ejes de intervención del XML"]],
    P07:[["revestimiento","Revestimiento sobre tablero","Sin cronograma publicado"]]
  };
  function sourceFrontLabel(kind,num){
    return kind==="bloques"||kind==="arriostres"?"E"+String(num).padStart(2,"0"):
      kind==="losa"?"L"+num:"Sector "+num;
  }
  const typeLink={0:"FF",1:"FS",2:"SF",3:"SS"};
  function showFrontDetail(doc,key,front){
    const [num,rootID,complete,physical,templateId,stages,progressHex,external]=front;
    const template=doc.types[templateId]||{names:[],pred:[],offsets:[]};
    const title=sourceFrontLabel(key,num);
    const stageCards=stages.map(s=>circle(srcName(s[0]),s[2],s[1])).join("");
    const activities=template.names.map((nm,ix)=>{
      const pc=parseInt(progressHex.slice(4*ix,4*ix+2),16),
            ph=parseInt(progressHex.slice(4*ix+2,4*ix+4),16),
            taskID=rootID+template.offsets[ix];
      const internal=(template.pred[ix]||[]).map(p=>{
        const targetId=rootID+template.offsets[p[0]];
        return 'ID '+targetId+' ('+(typeLink[p[1]]||p[1])+')';
      });
      const ext=external.filter(p=>p[0]===ix).map(p=>{
        const meta=doc.external[p[1]],refLabel=meta&&meta[0]!==null?srcName(meta[0]):"actividad externa";
        return 'UID '+p[1]+' · '+refLabel+' ('+(typeLink[p[2]]||p[2])+')';
      });
      const preds=[...internal,...ext];
      const discrepancy=pc>=100&&ph<100;
      return '<tr><td><b>'+esc(srcName(nm))+'</b><small>Actividad ID '+taskID+' · cronograma Project XML</small></td>'+
        '<td>'+fmtSource(pc)+'</td><td class="'+(discrepancy?'data-warning':'')+'">'+fmtSource(ph)+(discrepancy?'<small>Verificar diferencia</small>':'')+'</td>'+
        '<td>'+esc(preds.join('; ')||"Sin predecesoras registradas")+'</td></tr>';
    }).join("");
    return '<div class="aim-front-head"><h4>'+title+' · Seguimiento al '+esc(doc.status[selected])+'</h4>'+
      '<p>Avance del cronograma '+fmtSource(complete)+' · Avance físico reportado '+fmtSource(physical)+'</p>'+
      '<p>La estructura de dependencias procede del XML. Un 100% físico no certifica liberación técnica.</p></div>'+
      '<h4 style="font-size:13px;margin:15px 0 10px">Etapas del frente</h4>'+
      '<div class="aim-process-grid">'+stageCards+'</div>'+
      '<h4 style="font-size:13px;margin:17px 0 10px">Actividades y predecesoras</h4>'+
      '<div class="aim-scroll"><table class="aim-source-table"><thead><tr><th>Actividad</th><th>Avance del cronograma</th><th>Avance físico XML</th><th>Predecesoras</th></tr></thead><tbody>'+
      activities+'</tbody></table></div>';
  }
  function renderFronts(){
    const list=componentMap[selected]||[],doc=src();
    $("frontComponents").innerHTML=list.length?list.map(c=>
      '<button type="button" class="aim-front-card '+(component===c[0]?"sel":"")+'" data-aim-component="'+esc(c[0])+'"><b>'+esc(c[1])+'</b><small>'+esc(c[2])+'</small></button>').join(""):
      empty("Sin categorías de frente definidas para este servicio.");
    const label=list.find(c=>c[0]===component);
    $("frontDetailTitle").textContent=label?label[1]:"Selecciona un componente";
    if(!label){$("frontDetail").innerHTML=empty("Selecciona el frente que deseas consultar.");return}
    if(!doc){$("frontDetail").innerHTML=empty("Cargando porcentajes y predecesoras de los archivos XML.");return}
    const kind=component==="arriostres"?"ejes":component,items=doc[selected]?.[kind]||[];
    if(!items.length){
      const isRail=selected==="P02"&&kind==="rieles";
      const rail=(doc.summary.P02||[]).filter(x=>/REPOSICIÓN DE LÍNEAS FERROVIARIAS|DESMONTAJE DE RIELES/.test(srcName(x[1])));
      $("frontDetail").innerHTML=isRail&&rail.length?
        '<div class="aim-source-banner">El XML informa avance del servicio ferroviario, pero no aporta una relación inequívoca entre sectores y ejes. No se dibuja un mapa supuesto.</div><div class="aim-process-grid">'+rail.map(t=>circle(srcName(t[1]),t[3],t[2])).join("")+'</div>':
        empty("No existe una relación espacial validada para este componente.");
      return;
    }
    const isAxis=kind==="bloques"||kind==="ejes",sourceNote=isAxis?
      "Selección longitudinal por eje identificado en XML; no equivale todavía a una geometría 2D o IFC validada.":
      "La numeración de los sectores procede del XML. No se ha asignado cada sector a los ejes E00–E44.";
    const chosen=items.find(f=>f[0]===frontNum);
    $("frontDetail").innerHTML='<div class="aim-front-note">'+esc(sourceNote)+' · Corte de actividades '+doc.status[selected]+'.</div>'+
      '<div class="aim-front-picker">'+items.map(f=>{
        const id=sourceFrontLabel(kind,f[0]),sel=chosen?.[0]===f[0];
        return '<button type="button" data-aim-front="'+f[0]+'" class="'+(sel?'sel':'')+'" title="Avance físico XML '+f[3]+'%">'+
          '<b>'+esc(id)+'</b><span>'+fmtSource(f[3])+'</span></button>';
      }).join("")+'</div>'+
      (chosen?showFrontDetail(doc,kind,chosen):'<div class="aim-empty" style="margin-top:14px">Selecciona un eje o sector para consultar sus etapas, porcentajes por actividad y predecesoras.</div>');
  }
  function refresh(){renderHome();renderService()}
  window.aim03Refresh=refresh;
  document.addEventListener("click",e=>{
    const btn=e.target.closest("button");if(!btn)return;
    if(btn.dataset.aimService){selected=btn.dataset.aimService;section="seguimiento";component=null;frontNum=null;showScreen("services");refresh();}
    if(btn.dataset.aimSection){section=btn.dataset.aimSection;if(section==="frentes"&&!component){component=selected==="P02"?"bloques":selected==="P05"?"arriostres":null;}renderService();}
    if(btn.dataset.aimComponent){component=btn.dataset.aimComponent;frontNum=null;renderFronts();}
    if(btn.dataset.aimFront){frontNum=Number(btn.dataset.aimFront);renderFronts();}
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