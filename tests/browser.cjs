const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const {chromium}=require('playwright');
(async()=>{
 const html=fs.readFileSync('index.html');
 const assetSet=new Set(['edt-fisica.js','aim03-ui.js','datos-servicios.js','modelo-ifc.html','datos-reales-aim03.js']);
 const server=http.createServer((req,res)=>{
   if(req.url==='/muelle03-demo/'){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(html)}
   const name=req.url?.split('/').pop();
   if(req.url?.startsWith('/muelle03-demo/')&&assetSet.has(name)){
     res.setHeader('Content-Type',name.endsWith('.html')?'text/html; charset=utf-8':'application/javascript; charset=utf-8');
     return res.end(fs.readFileSync(name));
   }
   res.statusCode=404;res.end();
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let browser;
 try{
  browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/muelle03-demo/');
  await page.locator('#packageCards .aim-card').first().waitFor();
  await page.waitForFunction(()=>window.AIM03_XML?.P02?.bloques?.length===21,undefined,{timeout:20000});
  assert.equal(await page.locator('#packageCards [data-aim-service="P02"] .aim-card-grid').innerText().then(x=>x.includes('92.8%')),true);
  assert.match(await page.locator('#packageCards [data-aim-service="P02"]').innerText(),/0\.969/);
  assert.match(await page.locator('#packageCards [data-aim-service="P05"]').innerText(),/7\.0%/);
  assert.ok(await page.locator('#packageCards [data-aim-service="P01"]').innerText().then(x=>x.includes('—')));
  assert.equal(await page.locator('#packageCards .aim-card').count(),7);
  // Resumen ejecutivo equilibrado: jerarquía legible sin tarjetas sobredimensionadas.
  const typography=await page.locator('#packageCards .aim-card').first().evaluate(card=>({
    title:parseFloat(getComputedStyle(card.querySelector('.aim-card-title')).fontSize),
    metric:parseFloat(getComputedStyle(card.querySelector('.aim-card-grid b')).fontSize)
  }));
  assert.ok(typography.title>=16&&typography.title<=19,'Título de servicio de escala equilibrada');
  assert.ok(typography.metric>=19&&typography.metric<=22,'Indicadores legibles sin dominar la tarjeta');
  const cardHeights=await page.locator('#packageCards .aim-card').evaluateAll(cards=>cards.map(card=>card.getBoundingClientRect().height));
  assert.ok(cardHeights.every(height=>height<=280),'Siete tarjetas compactas en el resumen de escritorio');
  const gridColumns=()=>page.locator('#packageCards').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length);
  assert.equal(await gridColumns(),4);
  for(const [width,columns] of [[1200,3],[900,2],[390,1]]){
    await page.setViewportSize({width,height:1000});assert.equal(await gridColumns(),columns);
  }
  await page.setViewportSize({width:1440,height:1000});
  const verifyMatrix=async(axisCount)=>{
    const matrix=page.locator('#frontDetail .aim-activity-matrix');
    const headings=await matrix.locator('thead th').allInnerTexts();
    assert.equal(headings.length,axisCount+1);
    assert.match(headings[0],/Actividad/i);
    for(let i=1;i<=axisCount;i++)assert.match(headings[i],new RegExp('E'+String(i).padStart(2,'0')));
    const names=await matrix.locator('tbody tr > th:first-child').allInnerTexts();
    assert.ok(names.length>20,'Una fila por actividad del cronograma');
    assert.ok(names.every(n=>n.trim().length>5&&!/^A\d{2}$/.test(n.trim())),'Nombres de actividades completos en la primera columna');
    assert.equal(await matrix.locator('thead [data-aim-front]').count(),axisCount);
    const density=await matrix.evaluate(table=>({
      firstColumn:table.querySelector('thead th').getBoundingClientRect().width,
      axes:[...table.querySelectorAll('tbody tr:first-child td')].map(el=>el.getBoundingClientRect().width),
      rows:[...table.querySelectorAll('tbody tr')].map(el=>el.getBoundingClientRect().height),
      scrollHeight:table.closest('.aim-matrix-wrap').getBoundingClientRect().height,
      horizontalOverflow:table.closest('.aim-matrix-wrap').scrollWidth>table.closest('.aim-matrix-wrap').clientWidth
    }));
    assert.ok(density.firstColumn>=200&&density.firstColumn<=250,'Actividad visible en una columna proporcionada');
    assert.ok(density.axes.every(width=>width>=40&&width<=54),'Columnas de eje compactas');
    assert.ok(density.rows.every(height=>height>=28&&height<=50),'Filas densas y legibles, incluido texto en dos líneas');
    assert.ok(density.scrollHeight<=460,'La matriz permite monitorear varias actividades en una altura acotada');
    assert.ok(density.horizontalOverflow,'Se conserva desplazamiento horizontal para todos los ejes');
    const labels=await matrix.locator('tbody tr > th:first-child').evaluateAll(headings=>headings.map(th=>({
      full:th.querySelector('b')?.textContent.trim()||'',title:th.getAttribute('title')||''
    })));
    assert.ok(labels.every(label=>label.full&&label.title.includes(label.full)),'El tooltip conserva el nombre completo aunque se limite a dos líneas');

  };
  const verifySheet=async(service,kind,axis)=>{
    const expected=await page.evaluate(({service,kind,axis})=>{
      const doc=window.AIM03_XML,front=doc[service][kind].find(f=>f[0]===axis),template=doc.types[front[4]];
      return template.names.map((name,i)=>({
        name:doc.names[name],physical:parseInt(front[6].slice(4*i+2,4*i+4),16),
        predecessors:(template.pred[i]||[]).map(p=>'ID '+(front[1]+template.offsets[p[0]])+' ('+({0:'FF',1:'FS',2:'SF',3:'SS'}[p[1]]||p[1])+')')
      }));
    },{service,kind,axis});
    const sheet=page.locator('#aimFrontSheet');
    await sheet.waitFor({state:'visible'});
    assert.match(await sheet.innerText(),new RegExp('E'+String(axis).padStart(2,'0')));
    const rows=sheet.locator('.aim-source-table tbody tr');assert.equal(await rows.count(),expected.length);
    assert.equal(await sheet.locator('.aim-activity-progress[role=progressbar]').count(),expected.length);
    for(let i=0;i<expected.length;i++){
      const text=(await rows.nth(i).innerText()).replace(/\s+/g,' ');
      assert.ok(text.includes(expected[i].name.replace(/\s+/g,' ')));
      for(const predecessor of expected[i].predecessors)assert.ok(text.includes(predecessor),'Conserva la predecesora '+predecessor);
      assert.equal(Number(await rows.nth(i).locator('.aim-activity-progress').getAttribute('aria-valuenow')),expected[i].physical);
    }
    assert.match(await sheet.locator('.aim-source-table').innerText(),/Predecesoras|Sin predecesoras/);
    await page.waitForFunction(()=>document.activeElement?.id==='aimFrontSheet');
    await page.waitForFunction(()=>{const box=document.getElementById('aimFrontSheet').getBoundingClientRect();return box.y>=0&&box.y<innerHeight});
  };
  assert.equal(await page.locator('.topbar').count(),0);
  assert.match(await page.locator('#packageCards [data-aim-service="P02"] .aim-cut-card').innerText(),/03\/11\/2026/);
  assert.match(await page.locator('#packageCards [data-aim-service="P02"] .aim-cut-card').innerText(),/08\/11\/2026/);
  assert.match(await page.locator('#packageCards [data-aim-service="P05"] .aim-cut-card').innerText(),/08\/11\/2026/);
  assert.ok(await page.locator('#packageCards [data-aim-service="P02"].aim-sema-green').count()>0);
  assert.ok(await page.locator('#packageCards [data-aim-service="P05"].aim-sema-none').count()>0);

  assert.equal(await page.locator('#globalMetrics .metric').count(),3);
  assert.match(await page.locator('#globalMetrics').innerText(),/SERVICIOS CON ATRASO/);
  assert.equal(await page.locator('#screen-home').locator('input[type="file"]').count(),0);
  assert.equal(await page.locator('input[type="file"]').count(),0);
  assert.match(await page.locator('[data-screen="services"]').first().innerText(),/Paquetes constructivos/);
  assert.equal(await page.locator('#homeCurveSelector [type="checkbox"]').count(),7);
  await page.locator('#packageCards [data-aim-service="P02"]').click();
  assert.ok(await page.locator('#screen-services').isVisible());
  assert.match(await page.locator('#serviceTitle').innerText(),/P02/);
  assert.equal(await page.locator('#serviceStats .aim-stat').count(),6);
  const rings=page.locator('#serviceProcessOverview .aim-progress-ring');
  assert.equal(await rings.count(),7);
  assert.match(await page.locator('#serviceProcessOverview').innerText(),/Reposición de vía férrea/);
  assert.match(await page.locator('#serviceProcessOverview').innerText(),/Nueva red eléctrica/);
  assert.ok(await page.locator('#serviceProcessOverview .aim-progress-ring[style*="100%"]').count()>0);

  assert.ok(await page.locator('#serviceFollowupView').isVisible());
  assert.equal(await page.locator('#serviceSegmented button').count(),2);
  await page.locator('[data-aim-section="frentes"]').click();
  assert.ok(await page.locator('#serviceFrontsView').isVisible());
  assert.equal(await page.locator('#frontComponents button').count(),5);
  await page.locator('[data-aim-component="bloques"]').click();
  assert.match(await page.locator('#frontDetailTitle').innerText(),/Bloques de defensa/);
  assert.equal(await page.locator('#frontDetail .aim-front-picker [data-aim-front]').count(),44);
  await verifyMatrix(44);
  await page.setViewportSize({width:390,height:844});
  const mobileColumnWidth=await page.locator('#frontDetail .aim-activity-matrix thead th').first().evaluate(el=>el.getBoundingClientRect().width);
  assert.ok(mobileColumnWidth>=150&&mobileColumnWidth<=180,'Primera columna proporcionada en móvil');
  await page.setViewportSize({width:1440,height:1000});

  assert.match(await page.locator('#frontDetail .aim-activity-matrix tbody tr').first().locator('td').nth(2).innerText(),/—/);
  assert.equal(await page.locator('#frontDetail .aim-activity-matrix tbody [data-aim-front="3"]').count(),0);
  // E10/E12/E36 tienen plantillas sin las dos primeras tareas: no alinear por posición A01.
  for(const axis of [10,12,36]){
    const expected=await page.evaluate(axis=>{
      const doc=window.AIM03_XML,front=doc.P02.bloques.find(f=>f[0]===axis),template=doc.types[front[4]],seen={};
      return template.names.map((name,i)=>({key:name+'-'+(seen[name]=(seen[name]||0)+1),name:doc.names[name],physical:parseInt(front[6].slice(4*i+2,4*i+4),16)}));
    },axis);
    for(const task of expected){
      const cell=page.locator('#frontDetail .aim-activity-matrix tbody [data-aim-front="'+axis+'"][data-aim-activity="'+task.key+'"]');
      assert.equal(await cell.count(),1);
      assert.ok((await cell.getAttribute('aria-label')).includes(task.physical+'% físico'));
      assert.ok((await cell.locator('xpath=ancestor::tr').locator('th').innerText()).replace(/\s+/g,' ').includes(task.name.replace(/\s+/g,' ')));
    }
    const absentKeys=await page.evaluate(axis=>{
      const doc=window.AIM03_XML,reference=doc.P02.bloques.find(f=>f[0]===4),front=doc.P02.bloques.find(f=>f[0]===axis),own=new Set(doc.types[front[4]].names),seen={};
      return doc.types[reference[4]].names.map(name=>({name,key:name+'-'+(seen[name]=(seen[name]||0)+1)})).filter(t=>!own.has(t.name)).map(t=>t.key);
    },axis);
    assert.equal(absentKeys.length,2);
    for(const key of absentKeys){
      const row=page.locator('#frontDetail .aim-activity-matrix tbody tr').filter({has:page.locator('[data-aim-front="4"][data-aim-activity="'+key+'"]')});
      assert.equal((await row.locator('td').nth(axis-1).innerText()).trim(),'—');
    }
  }
  assert.match(await page.locator('#frontDetail .aim-legend').innerText(),/100%/);
  assert.match(await page.locator('#frontDetail .aim-front-picker [data-aim-front="4"]').getAttribute('style'),/--front-border:#1b975c/);
  assert.equal(await page.locator('#frontDetail .aim-front-picker button.needs-check').count(),9);
  assert.match(await page.locator('#frontDetail .aim-no-map').first().innerText(),/9 bloques/);

  assert.match(await page.locator('#frontDetail .aim-front-picker [data-aim-front="3"]').innerText(),/—/);

    await page.locator('#frontComponents [data-aim-component="viga_tierra"]').click();
  assert.match(await page.locator('#frontDetail').innerText(),/Tramo 01/);
  assert.match(await page.locator('#frontDetail').innerText(),/equivalencia con intervalos/);
  await page.locator('#frontComponents [data-aim-component="losa"]').click();
  assert.match(await page.locator('#frontDetail').innerText(),/Paño 01/);
  await page.locator('#frontComponents [data-aim-component="bloques"]').click();
  await page.locator('#frontDetail .aim-activity-matrix thead [data-aim-front="4"]').click();
  await verifySheet('P02','bloques',4);
  assert.match(await page.locator('#frontDetail .aim-front-head + .aim-no-map').innerText(),/Inconsistencia del cronograma/);
  await page.locator('#frontDetail .aim-activity-matrix tbody [data-aim-front="18"][data-aim-activity]').first().click();
  await verifySheet('P02','bloques',18);
  assert.match(await page.locator('#frontDetail').innerText(),/E18/);
  assert.match(await page.locator('#frontDetail').innerText(),/47%/);
  assert.match(await page.locator('#frontDetail').innerText(),/17%/);
  assert.equal(await page.locator('#frontDetail .aim-source-table tbody tr').count(),25);
  assert.match(await page.locator('#frontDetail .aim-source-table').innerText(),/ID \d+/);
  await page.locator('[data-aim-section="seguimiento"]').click();
  assert.ok(await page.locator('#serviceFollowupView').isVisible());
  assert.ok(await page.locator('#servicePpcChart svg').count()>0);
  await page.locator('#serviceNav [data-aim-service="P05"]').click();
  assert.match(await page.locator('#serviceTitle').innerText(),/P05/);
  await page.locator('[data-aim-section="frentes"]').click();
  assert.equal(await page.locator('#frontComponents button').count(),1);
  assert.equal(await page.locator('#frontDetail .aim-front-picker [data-aim-front]').count(),39);
  await verifyMatrix(39);
  await page.locator('#frontDetail .aim-activity-matrix thead [data-aim-front="18"]').click();
  await verifySheet('P05','ejes',18);
  await page.locator('#frontDetail .aim-activity-matrix tbody [data-aim-front="1"][data-aim-activity]').first().click();
  await verifySheet('P05','ejes',1);
  await page.locator('#frontDetail .aim-front-picker [data-aim-front="18"]').click();
  await verifySheet('P05','ejes',18);
  assert.equal(await page.locator('#frontDetail .aim-source-table tbody tr').count(),28);
  assert.match(await page.locator('#frontDetail').innerText(),/13%/);
  await page.locator('#serviceNav [data-aim-service="P07"]').click();
  assert.match(await page.locator('#serviceStats').innerText(),/—/);
  await page.locator('[data-screen="home"]').first().click();
  assert.ok(await page.locator('#screen-home').isVisible());
  await page.locator('#homeCurveSelector [data-aim-curve="P01"]').check();
  assert.equal(await page.locator('#homeCurveSelector [data-aim-curve="P01"]').isChecked(),true);
  // El motor previo sigue cargado para matrices y proceso hasta diseñar la siguiente etapa.
  await page.evaluate(()=>showScreen('matrix'));
  assert.equal(await page.locator('#fullAxisGrid button').count(),44);
  assert.deepEqual(errors,[]);
  console.log('OK: resumen equilibrado y adaptable, matrices densas actividad × eje 44/39, selección de cabecera/celda, fichas enfocadas con barras físicas XML, predecesoras, navegación y motor previo disponible.');
 }finally{await browser?.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
