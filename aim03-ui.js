"use strict";
/* Presentación AIM03 V0.4. No calcula avance global sin pesos aprobados. */
(function () {
  let serviceId = "P05", axisId = "E20", homeCurve = "P02", stageFilter = "ALL";
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const percent = value => Number.isFinite(value) ? Number(value).toFixed(1) + "%" : "—";
  const detail = service => {
    const tasks = scoped(service.id);
    if (!tasks.length) return {service, tasks, status:"pending", title:"Sin línea base", g:null};
    const g = agg(tasks), closed = tasks.every(t => Number(t.avance_real_pct) >= 100);
    return {service, tasks, g, status:closed?"closed":g.a>0?"active":"notstarted", title:closed?"Cerrado (demo)":g.a>0?"En seguimiento (demo)":"Sin iniciar (demo)"};
  };
  const services = () => data.services.map(detail);
  function chart(code) {
    const tasks = scoped(code);
    if (!tasks.length) return '<p class="aim-empty">Sin curva. La EDT y la línea base están pendientes.</p>';
    const g=agg(tasks), w=770,h=175,L=35,R=760,B=145,T=12;
    const X=k=>L+(k-1)/(cut-1)*(R-L), Y=v=>B-v/100*(B-T);
    const path=type=>Array.from({length:cut},(_,i)=> (i?'L':'M')+X(i+1).toFixed(1)+' '+Y(agg(tasks,i+1)[type]).toFixed(1)).join(' ');
    let grid='';for(let i=0;i<=100;i+=25)grid+='<line x1="'+L+'" y1="'+Y(i)+'" x2="'+R+'" y2="'+Y(i)+'" stroke="#e2eaf4" stroke-dasharray="3 5"/><text x="28" y="'+(Y(i)+4)+'" font-size="10" fill="#8192a8" text-anchor="end">'+i+'%</text>';
    const closed=tasks.every(t=>Number(t.avance_real_pct)>=100);
    return '<div class="aim-chart-meta"><span>Real <b>'+percent(g.a)+'</b></span><span>Plan <b>'+percent(g.p)+'</b></span>'+(g.p>0&&!closed?'<span>SPI físico (demo) <b>'+(g.a/g.p).toFixed(2)+'</b></span>':'')+'</div>'+
      '<svg class="aim-curve" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Curva S de demostración">'+grid+'<path d="'+path('p')+'" stroke="#2b6bf0" stroke-width="2.5" fill="none"/><path d="'+path('a')+'" stroke="#13a471" stroke-width="3" fill="none"/><line x1="'+X(week)+'" x2="'+X(week)+'" y1="'+T+'" y2="'+B+'" stroke="#a0b6d3" stroke-dasharray="4 5"/><text x="'+X(week)+'" y="169" fill="#7c8ca5" font-size="10" text-anchor="middle">S'+week+'</text></svg><div class="aim-chart-key"><span><i style="background:#2b6bf0"></i>Plan</span><span><i style="background:#13a471"></i>Real</span><small>Datos de demostración</small></div>';
  }
  function renderHome() {
    const info=services(), closed=info.filter(s=>s.status==='closed').length, active=info.filter(s=>s.status==='active').length, other=info.filter(s=>['notstarted','pending'].includes(s.status)).length;
    const stats=[['SERVICIOS CERRADOS',closed,'Datos de demostración'],['SERVICIOS CON AVANCE',active,'Datos de demostración'],['SIN AVANCE O SIN LÍNEA BASE',other,'Requieren actualización'],['AVANCE GLOBAL PONDERADO','—','Pendiente de pesos relativos presupuestales autorizados']];
    $('globalMetrics').innerHTML=stats.map(x=>'<div class="metric"><div class="cap">'+x[0]+'</div><div class="num">'+x[1]+'</div><div class="foot">'+x[2]+'</div></div>').join('');
    $('packageCards').innerHTML=info.map(s=>{
      const g=s.g; let sub=g?'<div class="aim-card-numbers"><span>Real <b>'+percent(g.a)+'</b></span>'+(s.status==='closed'?'':'<span>Plan <b>'+percent(g.p)+'</b></span>')+(s.status==='active'&&g.p>0?'<span>SPI físico (demo) <b>'+g.spi.toFixed(2)+'</b></span>':'')+'</div><div class="bar"><i class="actual" style="width:'+g.a+'%"></i></div>':'<p class="aim-muted">Sin avance calculado.</p>';
      return '<button type="button" class="aim-card" data-aim-service="'+s.service.id+'"><span class="aim-code">'+s.service.id+'</span><strong>'+esc(s.service.name)+'</strong><span class="aim-status '+s.status+'">'+s.title+'</span>'+sub+'</button>';
    }).join('');
    $('homeCurveService').innerHTML=info.map(s=>'<option value="'+s.service.id+'">'+s.service.id+' · '+esc(s.service.name)+'</option>').join('');
    $('homeCurveService').value=homeCurve;
    $('homeServiceCurve').innerHTML=chart(homeCurve);
  }
  function renderService(){
    const svc=data.services.find(s=>s.id===serviceId)||data.services[0];if(!svc)return;
    const info=detail(svc), tasks=info.tasks, g=info.g, spatial=serviceId==='P02'||serviceId==='P05';
    $('serviceNav').innerHTML=data.services.map(s=>'<button type="button" data-aim-service="'+s.id+'" class="aim-service-selector '+(s.id===serviceId?'sel':'')+'"><small>'+s.id+'</small>'+esc(s.name)+'</button>').join('');
    $('serviceTitle').textContent=svc.id+' · '+svc.name;
    $('serviceDescription').textContent=svc.description||'';
    const vals=g?[['AVANCE FÍSICO',percent(g.a)],['PROGRAMADO',percent(g.p)],['ESTADO',info.title],['SPI FÍSICO',info.status==='closed'?'No aplica':g.p>0?g.spi.toFixed(2)+' (demo)':'Sin base']]:[['ESTADO','Sin línea base'],['AVANCE FÍSICO','No calculado']];
    $('serviceStats').innerHTML=vals.map(x=>'<div class="aim-stat"><small>'+x[0]+'</small><b>'+x[1]+'</b></div>').join('');
    $('serviceCurve').innerHTML=chart(serviceId);
    $('serviceLocationTitle').textContent=serviceId==='P05'?'Ubicación por eje':serviceId==='P02'?'Control provisional por tramo':'Actividades del servicio';
    if(spatial){const ids=serviceId==='P05'?data.axes.filter(a=>a.arriostre).map(a=>a.id):data.axes.filter(a=>a.plataforma).map(a=>a.id);
      if(!ids.includes(axisId))axisId=ids[0];
      $('serviceLocation').innerHTML='<div class="aim-axis-grid">'+ids.map(id=>{const x=agg(scoped(serviceId,id));return '<button type="button" data-aim-axis="'+id+'" class="'+(axisId===id?'sel':'')+'"><b>'+id+'</b><span>'+percent(x.a)+'</span></button>'}).join('')+'</div>';
      $('serviceLocationNote').textContent=serviceId==='P02'?'La sectorización por áreas del tablero y sus límites transversales aún deben vincularse al IFC y al plano. No se han supuesto superficies.':'Los 39 frentes corresponden al esquema de control. La equivalencia con los ejes físicos requiere validación.';
    }else{$('serviceLocation').innerHTML='<p class="aim-muted">Sin sectorización espacial definida para este servicio.</p>';$('serviceLocationNote').textContent='';}
    $('serviceScope').textContent=spatial?'Ubicación '+axisId:'Servicio completo';
    let rows=spatial?scoped(serviceId,axisId):tasks;
    const groups=[...new Set(rows.map(t=>t.grupo))];if(stageFilter!=='ALL'&&!groups.includes(stageFilter))stageFilter='ALL';
    $('serviceStageTabs').innerHTML='<div class="aim-stage-tabs"><button data-aim-group="ALL" class="'+(stageFilter==='ALL'?'sel':'')+'">Todas</button>'+groups.map(s=>'<button data-aim-group="'+esc(s)+'" class="'+(stageFilter===s?'sel':'')+'">'+esc(s)+'</button>').join('')+'</div>';
    if(stageFilter!=='ALL')rows=rows.filter(t=>t.grupo===stageFilter);
    $('serviceActivities').innerHTML=rows.length?'<div class="aim-scroll"><table class="data-table"><thead><tr><th>Actividad</th><th>Etapa</th><th>Unidad</th><th>Real</th><th>Plan</th><th>Predecesoras</th></tr></thead><tbody>'+rows.map(t=>'<tr><td><b>'+esc(t.actividad)+'</b><small style="display:block;color:#8496ad">'+esc(t.codigo_actividad)+' · '+esc(t.id)+'</small></td><td>'+esc(t.grupo)+'</td><td>'+esc(t.unidad)+'</td><td>'+percent(actual(t,week))+'</td><td>'+percent(plan(t,week))+'</td><td>'+esc((t.predecesoras||[]).join(', ')||'—')+'</td></tr>').join('')+'</tbody></table></div>':'<p class="aim-empty">No hay actividades definidas para este servicio.</p>';
    $('serviceModelLink').hidden=!spatial;$('serviceModelLink').dataset.aimModel=spatial?serviceId:'';
    $('serviceNote').textContent=spatial?'Los avances, metrados y fechas son sintéticos. Las dependencias no equivalen a autorizaciones para ejecución.':'Sin cronograma real incorporado. La EDT, ubicación y ponderación deben definirse.';
  }
  function refresh(){renderHome();renderService()}
  window.aim03Refresh=refresh;
  document.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.aimService){serviceId=b.dataset.aimService;axisId=serviceId==='P05'?'E20':'E18';stageFilter='ALL';showScreen('services');refresh();}
    if(b.dataset.aimAxis){axisId=b.dataset.aimAxis;stageFilter='ALL';renderService();}
    if(b.dataset.aimGroup){stageFilter=b.dataset.aimGroup;renderService();}
    if(b.dataset.aimModel){showScreen('ifc');$('ifcFrame').contentWindow?.postMessage({kind:'aim03.filter',service:b.dataset.aimModel},location.origin);}
  });
  $('homeCurveService').addEventListener('change',e=>{homeCurve=e.target.value;$('homeServiceCurve').innerHTML=chart(homeCurve)});
  window.addEventListener('message',e=>{
    if(e.origin!==location.origin||e.data?.kind!=='aim03.ifc-selection')return;
    const {service,name,expressID}=e.data;
    $('ifcSelection').textContent='Elemento '+expressID+' · '+(name||'Sin nombre')+' · Vinculación sugerida '+service+'. Eje y actividad por validar.';
  });
  refresh();
})();