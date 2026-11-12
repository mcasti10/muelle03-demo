/* Muelle 03 · EDT física de demostración
   Catálogo resumido a partir de la revisión técnica de cronogramas P02/P05.
   Sin cantidades, avances, importes, precios o fechas reales del contratista.
   Los coeficientes son técnicos, provisionales y adimensionales; requieren validación.
*/
(function(global){
"use strict";
const P02=[
["PL01","Preparación","Liberación de frente","und",1,0.7,[], "todos"],
["PL02","Losa superior","Demolición y saneo","m²",18,0.12,["PL01"],"todos"],
["PL03","Losa superior","Acero y conectores","kg",310,0.008,["PL02"],"todos"],
["PL04","Losa superior","Puente adherente","m²",18,0.025,["PL02"],"todos"],
["PL05","Losa superior","Concreto","m³",5,0.9,["PL03","PL04"],"todos"],
["PL06","Losa superior","Curado","m²",18,0.055,["PL05"],"todos"],
["PL07","Viga tierra","Picado de viga","m",6,0.22,["PL01"],"todos"],
["PL08","Viga tierra","Tratamiento y acero","kg",85,0.011,["PL07"],"todos"],
["PL09","Viga tierra","Reparación con mortero","m³",1,1.1,["PL08"],"todos"],
["PL10","Viga mar","Picado de viga","m",6,0.22,["PL01"],"todos"],
["PL11","Viga mar","Acero","kg",110,0.011,["PL10"],"todos"],
["PL12","Viga mar","Encofrado","m²",12,0.11,["PL11"],"todos"],
["PL13","Viga mar","Concreto","m³",2.5,0.95,["PL12"],"todos"],
["PL14","Viga mar","Curado","m²",12,0.05,["PL13"],"todos"],
["PL15","Bloque defensa","Desmontaje de defensa existente","und",1,1.5,["PL01"],"fender"],
["PL16","Bloque defensa","Picado de bloque","und",1,1.3,["PL15"],"fender"],
["PL17","Bloque defensa","Anclajes y acero","und",6,0.25,["PL16"],"tipoII-III"],
["PL18","Bloque defensa","Encofrado","m²",8,0.11,["PL17"],"tipoII-III"],
["PL19","Bloque defensa","Reparación con mortero","m³",1.5,0.9,["PL16"],"fender"],
["PL20","Bloque defensa","Curado","m²",8,0.055,["PL19"],"fender"],
["PL21","Montaje fender","Replanteo","und",1,0.4,["PL20"],"fender"],
["PL22","Montaje fender","Anclajes de defensa","und",6,0.3,["PL21"],"fender"],
["PL23","Montaje fender","Montaje de componentes","und",1,2.3,["PL22"],"fender"],
["PL24","Montaje fender","Cadenas y accesorios","und",1,1.1,["PL23"],"fender"],
["PL25","Montaje fender","Alineamiento y torque","und",1,1.1,["PL24"],"fender"],
["PL26","Montaje fender","Inspección final","und",1,0.5,["PL25"],"fender"],
["PL27","Rieles","Retiro de rieles","m",6,0.12,["PL01"],"todos"],
["PL28","Rieles","Montaje y alineamiento de rieles","m",6,0.26,["PL06","PL27"],"todos"],
["PL29","Cierre","Inspección y liberación del tramo","und",1,0.6,["PL06","PL09","PL14","PL28"],"todos"]
];
const P05=[
["AR01","Demolición y excavación","Demolición de pavimento","m³",12,0.32,[]],
["AR02","Demolición y excavación","Excavación de escoria","m³",18,0.16,["AR01"]],
["AR03","Demolición y excavación","Excavación de terreno","m³",28,0.12,["AR02"]],
["AR04","Demolición y excavación","Eliminación de material","m³",28,0.045,["AR03"]],
["AR05","Retiro de existentes","Picado local","m³",3,0.45,["AR03"]],
["AR06","Retiro de existentes","Retiro de grout","und",2,0.35,["AR05"]],
["AR07","Retiro de existentes","Retiro de tirantes","und",2,0.75,["AR06"]],
["AR08","Retiro de existentes","Retiro de estructura metálica","und",2,0.45,["AR07"]],
["AR09","Preparación de superficies","Limpieza y protección de placas","m²",8,0.15,["AR08"]],
["AR10","Sistema de anclaje","Suministro de barras DYWIDAG","und",2,0.4,["AR03"]],
["AR11","Sistema de anclaje","Instalación de anclajes DYWIDAG","und",2,1.2,["AR09","AR10"]],
["AR12","Nuevo arriostre","Suministro de tirantes","und",2,0.35,["AR03"]],
["AR13","Nuevo arriostre","Suministro de viga metálica","kg",1600,0.0012,["AR03"]],
["AR14","Nuevo arriostre","Montaje de viga W8x24","und",1,2,["AR11","AR13"]],
["AR15","Nuevo arriostre","Montaje de tirantes nuevos","und",2,0.95,["AR12","AR14"]],
["AR16","Bloque de concreto","Acero","kg",450,0.006,["AR15"]],
["AR17","Bloque de concreto","Encofrado","m²",50,0.07,["AR16"]],
["AR18","Bloque de concreto","Concreto","m³",22,0.4,["AR17"]],
["AR19","Bloque de concreto","Curado","m²",50,0.024,["AR18"]],
["AR20","Restitución","Geotextil","m²",30,0.04,["AR19"]],
["AR21","Restitución","Piedra filtro","m³",12,0.14,["AR20"]],
["AR22","Restitución","Relleno compactado","m³",24,0.12,["AR21"]],
["AR23","Restitución","Subbase y base","m³",12,0.17,["AR22"]],
["AR24","Restitución","Acero de pavimento","kg",300,0.006,["AR23"]],
["AR25","Restitución","Encofrado de pavimento","m²",15,0.06,["AR24"]],
["AR26","Restitución","Concreto de pavimento","m³",5,0.55,["AR25"]],
["AR27","Restitución","Curado de pavimento","m²",20,0.03,["AR26"]],
["AR28","Restitución","Sellado de juntas","m",12,0.04,["AR27"]],
["AR29","Cierre","Inspección y liberación del eje","und",1,0.7,["AR19","AR28"]]
];
function applies(kind,axis){return kind==="todos"||((kind==="fender"||kind==="tipoII-III")&&axis.requiere_defensa&&(kind!=="tipoII-III"||axis.tipologia!=="I"))}
function generate(template,svc,axis,rate){
 const usable=template.filter(x=>svc==="P05"||applies(x[7],axis));
 const set=new Set(usable.map(x=>x[0]));
 const n=Number(axis.num)||1;
 return usable.map((x,i)=>{
  const [code,grupo,actividad,unidad,q,coef,preds]=x;
  const predecessor=preds.filter(c=>set.has(c));
  if(code==="PL19" && set.has("PL18"))predecessor.push("PL18");
  if(code==="PL29" && set.has("PL26"))predecessor.push("PL26");
  const fraction=i/Math.max(1,usable.length-1);
  const completion=rate>=99.99?100:rate<=0?0:Math.max(0,Math.min(100,Math.round((rate+(0.42-fraction)*75)/5)*5));
  const scale=0.9+((n*7+i*3)%9)/40;
  return {id:svc+"-"+axis.id+"-"+code,servicio:svc,subalcance:svc==="P02"?"Reparación de plataforma":"Reparación de pilotes de arriostre",eje:axis.id,codigo_actividad:code,actividad,grupo,unidad,metrado_aprobado:Number((q*scale).toFixed(2)),peso_tecnico:coef,inicio_plan_sem:Math.max(1,Math.min(11,1+Math.round(fraction*7)+(n%3))),fin_plan_sem:Math.max(2,Math.min(12,2+Math.round(fraction*8)+(n%3))),avance_real_pct:completion,predecesoras:predecessor,observacion:"Demo · EDT propuesta pendiente de validación"};
 });
}
function apply(input){
 const d=JSON.parse(JSON.stringify(input));
 d.meta.version="V0.3-EDT-FISICA";
 d.meta.legend="DATOS SINTÉTICOS. Sub-EDT resumida a partir de tipologías del cronograma; cantidades, pesos, fechas y avances NO son datos reales.";
 d.meta.excluded_arr_axes=[40,41,42,43,44];
 d.meta.pesos="Coeficientes técnicos adimensionales provisionales, sin relación con precios ni presupuesto.";
 const fenders=new Set(d.meta.fender_axes);
 d.axes.forEach(a=>{a.arriostre=a.num>=1&&a.num<=39;a.requiere_defensa=fenders.has(a.num);a.tipologia=a.requiere_defensa?["I","II","III"][a.num%3]:null});
 const old=d.activities;
 const rates=new Map();for(const a of d.axes)for(const svc of ["P02","P05"]){const list=old.filter(t=>t.servicio===svc&&t.eje===a.id);rates.set(svc+"-"+a.id,list.length?list.reduce((s,t)=>s+(Number(t.avance_real_pct)||0),0)/list.length:0)}
 const extras=old.filter(t=>!["P02","P05"].includes(t.servicio)||(!/^E\d\d$/.test(t.eje)&&t.servicio==="P02")).map(t=>{
  delete t.pu_control;
  t.peso_tecnico=({kg:0.006,"m³":0.38,"m²":0.1,m:0.15,und:1.5,glb:2})[t.unidad]||0.4;
  t.predecesoras=[];return t;
 });
 d.activities=[...extras];
 for(const axis of d.axes){
  d.activities.push(...generate(P02,"P02",axis,rates.get("P02-"+axis.id)));
  if(axis.arriostre)d.activities.push(...generate(P05,"P05",axis,rates.get("P05-"+axis.id)));
 }
 d.services.find(s=>s.id==="P05").description="39 frentes de arriostre (E01–E39), EDT sintética revisada.";
 d.services.find(s=>s.id==="P02").description="44 ejes de plataforma y 21 bloques con defensa. Tipologías de ejemplo; no aplicabilidad validada.";
 return d;
}
global.aplicarEdtFisica=apply;
global.EDT_FISICA={P02,P05};
})(window);