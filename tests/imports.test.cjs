const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
function context(){
 const data={activities:[{id:'A',avance_real_pct:73},{id:'B',avance_real_pct:42}]};
 const c=vm.createContext({data,str:v=>String(v??'')});
 vm.runInContext(html.slice(html.indexOf('function parseCSV'),html.indexOf('function downloadCSV'))+'\n'+html.slice(html.indexOf('function slug'),html.indexOf('function demoFor'))+'\nconst nv=decimalInput;',c);
 return c;
}
const headers=['FECHA','PPC','SPI','EV','PV'];
const valid=['2026-11-11','1%',1,'0,5%','0,5%'];
test('porcentajes explícitos, fracciones compatibles y vacíos',()=>{
 const c=context();for(const [raw,expected] of [['1%',.01],['0,5%',.005],['100%',1],['0%',0],[.5,.5],[1,1],[25,.25],['-1%',-.01]])assert.equal(c.frac(raw),expected);
 for(const raw of ['', ' ',null,undefined,'NaN','Infinity','0x10','1%%'])assert.ok(Number.isNaN(c.frac(raw)),String(raw));
});
test('fechas completas, calendario, bisiestos y seriales Excel 1900',()=>{
 const c=context();for(const raw of ['', ' ',null,undefined,'2026-02-29','31/02/2026','2026-99-99','2026-11-11junk','2026-11-11T00:00','11/11-2026',0,60,NaN,Infinity,2958466])assert.equal(c.excelToISO(raw),'',String(raw));
 for(const [raw,want] of [['2024-02-29','2024-02-29'],['11/11/2026','2026-11-11'],['1-2-2026','2026-02-01'],[1,'1900-01-01'],[59,'1900-02-28'],[61,'1900-03-01'],[46337.5,'2026-11-11']])assert.equal(c.excelToISO(raw),want);
});
test('CSV actividades: 1% y 0,5% conservan puntos porcentuales',()=>{
 const c=context();assert.equal(c.loadCSV('id;AVANCE REAL %\nA;1%\nB;0,5%'),2);assert.equal(c.data.activities[0].avance_real_pct,1);assert.equal(c.data.activities[1].avance_real_pct,.5);
 c.loadCSV('id,avance_real_pct\nA,0');assert.equal(c.data.activities[0].avance_real_pct,0);
});
test('CSV actividades: rechazo atómico, incluidos vacíos y precios',()=>{
 for(const row of ['B,','B, ','B,-1','B,101','B,NaN','B,0x10','X,10','A,10','B,10,extra']){
 const c=context(),before=JSON.stringify(c.data);assert.throws(()=>c.loadCSV('id,avance_real_pct\nA,20\n'+row));assert.equal(JSON.stringify(c.data),before,row);
 }
 const c=context();assert.throws(()=>c.loadCSV('id,avance_real_pct,pu_control\nA,20,8'));assert.throws(()=>c.loadCSV('id,avance_real_pct\nA,"20'));assert.throws(()=>c.loadCSV('id,id,avance_real_pct\nA,A,20'));assert.throws(()=>c.loadCSV('id,avance_real_pct,metrado_aprobado\nA,20, '));
});
test('indicadores: cabecera completa, orden, porcentajes y duplicados',()=>{
 const c=context();const r=c.normalizeTable([['Título'],headers,valid,['2026-11-10','25%',1,.25,.25]]);assert.equal(r.rows[1].ppc,.01);assert.equal(r.rows[1].ev,.005);assert.equal(r.rows[0].fecha,'2026-11-10');assert.equal(r.quality.headRow,2);
 assert.throws(()=>c.normalizeTable([headers,valid,valid]),/duplicada/);
 assert.throws(()=>c.normalizeTable([['FECHA','PPC','EV'],valid]),/cabecera/);
});
test('indicadores: no retorna un subconjunto válido de un archivo inválido',()=>{
 for(const [index,value] of [[0,''],[0,'31/02/2026'],[1,' '],[1,'101%'],[2,''],[2,-1],[3,'0x10'],[4,'Infinity']]){
 const c=context(),bad=[...valid];bad[index]=value;assert.throws(()=>c.normalizeTable([headers,['2026-11-10',1,1,.5,.5],bad]),/No se aplicó ningún cambio/);
 }
 const c=context();assert.throws(()=>c.normalizeTable([[...headers,'CANT APR'],[...valid,'oops']]));assert.throws(()=>c.normalizeTable([[...headers,'PPC'],[...valid,1]]));
});
test('SPI reportado: PV cero genera advertencia, no cociente inventado',()=>{
 const c=context(),r=c.normalizeTable([headers,['2026-11-11',1,0,0,0]]);assert.match(r.quality.warnings[0],/PV cero/);
});
test('CSV contratista rechaza comillas sin cerrar',()=>{
 const c=context();vm.runInContext(html.slice(html.indexOf('function csvEsc'),html.indexOf('function slug')),c);assert.throws(()=>c.csvParse('FECHA,PPC\n"2026-11-11,1%'),/comillas/);assert.throws(()=>c.csvParse('FECHA,PPC\n2026-11-11,"1"2'),/comillas/);assert.equal(c.csvParse('FECHA\tPPC\n2026-11-11\t1%')[1][1],'1%');
});
