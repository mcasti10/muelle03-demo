const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const html=fs.readFileSync('index.html','utf8');
const ifc=fs.readFileSync('modelo-ifc.html','utf8');
const ui=fs.readFileSync('aim03-ui.js','utf8');
const edtsrc=fs.readFileSync('edt-fisica.js','utf8');
const dataSource=JSON.parse(html.match(/<script type="application\/json" id="initialData">([\s\S]*?)<\/script>/)[1]);
const sandbox={window:{}};vm.runInNewContext(edtsrc,sandbox);
const data=sandbox.window.aplicarEdtFisica(dataSource);
test('new AIM03 platform and seven services without inventing P07 data',()=>{
 assert.match(html,/Gestión de la Construcción/);
 assert.match(html,/Arreglo de Infraestructura del Muelle 03 \(AIM03\)/);
 assert.match(html,/id="screen-services"/);
 assert.match(html,/id="screen-ifc"/);
 assert.equal(data.services.length,7);
 assert.equal(data.services.find(s=>s.id==='P07').name,'Revestimiento sobre tablero');
 assert.equal(data.activities.filter(t=>t.servicio==='P07').length,0);
});
test('approved summary and Paquetes constructivos structure',()=>{
 assert.match(html,/id="screen-home"/);
 assert.match(html,/id="screen-services"/);
 assert.match(html,/Paquetes constructivos/);
 assert.match(html,/id="serviceSegmented"/);
 assert.match(html,/id="serviceFrontsView"/);
 assert.match(html,/id="serviceFollowupView"/);
 for(const id of ["servicePpcChart","serviceSpiChart","serviceDeltaChart","serviceDailyChart","frontComponents","homeCurveSelector"])
   assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(ui,/SERVICIOS CON ATRASO/);
 assert.match(ui,/m\.spi<\.85/);
 assert.match(ui,/m\.spi<\.7/);
 assert.match(ui,/PPC PROMEDIO/);
 assert.match(ui,/percentual|p\.p\./i);
 assert.doesNotMatch(html,/PRESUPUESTO CONTROL DEMO/);
 assert.doesNotMatch(html,/Revisión EDT/);
 assert.doesNotMatch(html,/<b>Obra digital<\/b>/);
 assert.doesNotMatch(html,/type="file"/); // Neither CSV nor Excel can be uploaded through main site.
});
test('per-service public series are empty until confirmed and authorized',()=>{
 const raw=fs.readFileSync('datos-servicios.js','utf8'),sandbox={window:{}};
 vm.runInNewContext(raw,sandbox);
 const records=sandbox.window.AIM03_SERIES.servicios;
 for(const id of ["P01","P02","P03","P04","P05","P06","P07"]){
  assert.deepEqual(Array.from(records[id].registros),[]);
  assert.equal(records[id].estado,null);
 }
 assert.match(ui,/fecha/);
 assert.match(ui,/Sin historial PPC/);
 assert.match(ui,/cierre-pendiente/);
 assert.match(ui,/data-aim-component/);
});
test('verified P02 Excel and P02/P05 XML source projections retain progress and predecessor data',()=>{
 const zlib=require('node:zlib');
 const js=fs.readFileSync('datos-reales-aim03.js','utf8');
 const get=k=>{
  const re=new RegExp('const '+k+"='([^']+)'"),m=js.match(re);
  assert.ok(m,'Missing '+k);return zlib.gunzipSync(Buffer.from(m[1],'base64')).toString('utf8');
 };
 const data=JSON.parse(get('PROJECT_DATA_GZIP'));
 assert.equal(data.status.P02,'2026-11-08');
 assert.equal(data.status.P05,'2026-11-08');
 assert.equal(data.P02.bloques.length,21);
 assert.equal(data.P02.losa.length,21);
 assert.equal(data.P02.viga_tierra.length,21);
 assert.equal(data.P02.viga_mar.length,21);
 assert.equal(data.P05.ejes.length,39);
 assert.deepEqual([...data.P02.bloques.map(x=>x[0])],Array.from({length:21},(_,i)=>4+i*2));
 assert.deepEqual([...data.P05.ejes.map(x=>x[0])],Array.from({length:39},(_,i)=>i+1));
 assert.deepEqual(Array.from(data.P05.overall),[11,7]);
 const p2=data.P02.bloques.find(x=>x[0]===18);
 const p5=data.P05.ejes.find(x=>x[0]===18);
 assert.deepEqual([p2[2],p2[3]],[47,17]);
 assert.deepEqual([p5[2],p5[3]],[27,13]);
 assert.equal(data.P02.bloques.reduce((n,f)=>n+f[6].length/4,0),519);
 assert.equal(data.P05.ejes.reduce((n,f)=>n+f[6].length/4,0),1092);
 const predecessors=Object.values(data.types).reduce((n,t)=>n+t.pred.flat().length,0);
 assert.ok(predecessors>40);
 const daily=get('DAILY_DATA_GZIP').split(';');
 assert.equal(daily.length,181);
 const last=daily.at(-1).split(',').map(Number);
 assert.equal(last[1],730000);
 assert.equal(last[3],928300);
 assert.equal(last[4],958400);
 assert.equal(last[2],968593);
 assert.match(js,/2026-11-04/);
});
test('IFC viewer keeps file local and exposes real mesh API, orbit and selection',()=>{
 assert.match(ifc,/input id="ifcFile" type="file"/);
 assert.match(ifc,/StreamAllMeshes/);
 assert.match(ifc,/GetGeometry/);
 assert.match(ifc,/GetVertexArray/);
 assert.match(ifc,/GetIndexArray/);
 assert.match(ifc,/OrbitControls/);
 assert.match(ifc,/raycaster\.intersectObjects/);
 assert.match(ifc,/WebIFC\.IfcAPI/);
 assert.match(ifc,/postMessage/);
 assert.doesNotMatch(ifc,/fetch\(\s*file|XMLHttpRequest|api\.github\.com/);
});
test('source JavaScript syntax and IFC module syntax',()=>{
 for(const src of [ui,edtsrc,fs.readFileSync('datos-servicios.js','utf8'),fs.readFileSync('datos-reales-aim03.js','utf8')])assert.doesNotThrow(()=>new Function(src));
 const model=ifc.match(/<script type="module">([\s\S]*?)<\/script>/);
 assert.ok(model,'module script missing');
 const tmp=path.join(process.cwd(),'tests','_ifc_syntax_check.mjs');
 try{fs.writeFileSync(tmp,model[1]);const r=spawnSync(process.execPath,['--check',tmp],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);}finally{if(fs.existsSync(tmp))fs.unlinkSync(tmp)}
});
