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
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/muelle03-demo/');
  await page.locator('#packageCards .aim-card').first().waitFor();
  await page.waitForFunction(()=>window.AIM03_XML?.P02?.bloques?.length===21,undefined,{timeout:20000});
  assert.equal(await page.locator('#packageCards [data-aim-service="P02"] .aim-card-grid').innerText().then(x=>x.includes('92.8%')),true);
  assert.match(await page.locator('#packageCards [data-aim-service="P02"]').innerText(),/0\.969/);
  assert.match(await page.locator('#packageCards [data-aim-service="P05"]').innerText(),/7\.0%/);
  assert.ok(await page.locator('#packageCards [data-aim-service="P01"]').innerText().then(x=>x.includes('—')));
  assert.equal(await page.locator('#packageCards .aim-card').count(),7);
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
  assert.equal(await page.locator('#frontDetail .aim-activity-matrix tbody tr').count(),44);
  assert.match(await page.locator('#frontDetail .aim-legend').innerText(),/100%/);
  assert.match(await page.locator('#frontDetail .aim-front-picker [data-aim-front="4"]').getAttribute('style'),/--front-border:#1b975c/);
  assert.match(await page.locator('#frontDetail .aim-front-picker [data-aim-front="3"]').innerText(),/—/);

    await page.locator('#frontComponents [data-aim-component="viga_tierra"]').click();
  assert.match(await page.locator('#frontDetail').innerText(),/Tramo 01/);
  assert.match(await page.locator('#frontDetail').innerText(),/equivalencia con intervalos/);
  await page.locator('#frontComponents [data-aim-component="losa"]').click();
  assert.match(await page.locator('#frontDetail').innerText(),/Paño 01/);
  await page.locator('#frontComponents [data-aim-component="bloques"]').click();
await page.locator('#frontDetail .aim-front-picker [data-aim-front="18"]').click();
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
  await page.locator('#frontDetail .aim-front-picker [data-aim-front="18"]').click();
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
  console.log('OK: resumen, 7 tarjetas, umbrales, curvas filtrables, paquetes, Seguimiento, Frentes y componentes, sin cargas Excel/CSV, motor previo disponible.');
 }finally{await browser?.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
