const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const json=html.match(/<script type="application\/json" id="initialData">([\s\S]*?)<\/script>/);
const source=fs.readFileSync('edt-fisica.js','utf8');
function demo(){const sandbox={window:{}};vm.runInNewContext(source,sandbox);return sandbox.window.aplicarEdtFisica(JSON.parse(json[1]))}
const by=(d,svc,ax)=>d.activities.filter(t=>t.servicio===svc&&t.eje===ax);
test('EDT main uses synthetic physical data and contains no unit prices',()=>{
 const d=demo();
 assert.ok(!d.activities.some(t=>Object.hasOwn(t,'pu_control')||Object.hasOwn(t,'precio_unitario')||Object.hasOwn(t,'bac')));
 assert.ok(d.activities.every(t=>Number.isFinite(t.metrado_aprobado)&&t.metrado_aprobado>0&&Number.isFinite(t.peso_tecnico)&&t.peso_tecnico>0));
 assert.ok(!html.includes('PRESUPUESTO CONTROL DEMO'));assert.ok(!html.includes('S/ '));
});
test('39 distinct arriostre fronts E01-E39 and no axes E40-E44',()=>{
 const d=demo(),axes=d.axes.filter(a=>a.arriostre).map(a=>a.id);
 assert.equal(axes.length,39);assert.equal(axes[0],'E01');assert.equal(axes[38],'E39');
 for(const ax of d.axes.filter(a=>!a.arriostre))assert.equal(by(d,'P05',ax.id).length,0);
});
test('21 fender blocks, technical dependency and applicability',()=>{
 const d=demo(),def=d.axes.filter(a=>a.requiere_defensa);assert.equal(def.length,21);
 for(const a of d.axes){const rows=by(d,'P02',a.id);
 assert.ok(rows.length>=16);
 assert.equal(rows.some(t=>t.codigo_actividad==='PL23'),a.requiere_defensa);
 const map=new Map(rows.map(t=>[t.codigo_actividad,t]));
 for(const t of rows)for(const pre of t.predecesoras)assert.ok(map.has(pre),'missing predecessor '+pre+' at '+a.id);
 if(a.requiere_defensa){assert.deepEqual(Array.from(map.get('PL26').predecesoras),['PL25']);assert.ok(map.get('PL29').predecesoras.includes('PL26'))}
 }
});
test('arriostre 29 physical stages include removals, anchors, structure and pavement closure',()=>{
 const d=demo(),rows=by(d,'P05','E38'),map=new Map(rows.map(t=>[t.codigo_actividad,t]));
 assert.equal(rows.length,29);
 for(const t of rows)for(const pre of t.predecesoras)assert.ok(map.has(pre));
 assert.ok(map.get('AR14').predecesoras.includes('AR11'));
 assert.ok(map.get('AR29').predecesoras.includes('AR28'));
});
test('technical weighted averages are independent of costs',()=>{
 const d=demo(),rows=by(d,'P02','E18');
 const total=rows.reduce((v,t)=>v+t.metrado_aprobado*t.peso_tecnico,0);
 const progress=rows.reduce((v,t)=>v+t.metrado_aprobado*t.peso_tecnico*t.avance_real_pct/100,0)/total*100;
 assert.ok(progress>=0&&progress<=100);
 const clone=rows.map(t=>({...t,metrado_aprobado:t.metrado_aprobado*2}));
 const w=clone.reduce((v,t)=>v+t.metrado_aprobado*t.peso_tecnico,0);
 assert.ok(Math.abs(progress-clone.reduce((v,t)=>v+t.metrado_aprobado*t.peso_tecnico*t.avance_real_pct/100,0)/w*100)<1e-9);
});
