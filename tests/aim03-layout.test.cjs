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
test('summary has no unsupported project-level SPI or fictitious project advance',()=>{
 assert.match(ui,/AVANCE GLOBAL PONDERADO/);
 assert.match(ui,/Pendiente de pesos relativos presupuestales autorizados/);
 assert.doesNotMatch(html,/PRESUPUESTO CONTROL DEMO/);
 assert.doesNotMatch(html,/Revisión EDT/);
 assert.doesNotMatch(html,/<b>Obra digital<\/b>/);
 assert.match(ui,/status==='closed'[\s\S]{0,210}status==='active'/);
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
 for(const src of [ui,edtsrc])assert.doesNotThrow(()=>new Function(src));
 const model=ifc.match(/<script type="module">([\s\S]*?)<\/script>/);
 assert.ok(model,'module script missing');
 const tmp=path.join(process.cwd(),'tests','_ifc_syntax_check.mjs');
 try{fs.writeFileSync(tmp,model[1]);const r=spawnSync(process.execPath,['--check',tmp],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);}finally{if(fs.existsSync(tmp))fs.unlinkSync(tmp)}
});
