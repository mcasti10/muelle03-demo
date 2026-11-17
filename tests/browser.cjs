const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const {chromium}=require('playwright');
(async()=>{
 const html=fs.readFileSync('index.html');
 const assetSet=new Set(['edt-fisica.js','aim03-ui.js','datos-servicios.js','modelo-ifc.html']);
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
  assert.equal(await page.locator('#packageCards .aim-card').count(),7);
  assert.equal(await page.locator('#globalMetrics .metric').count(),3);
  assert.match(await page.locator('#globalMetrics').innerText(),/SERVICIOS CON ATRASO/);
  assert.equal(await page.locator('#screen-home').locator('input[type="file"]').count(),0);
  assert.equal(await page.locator('input[type="file"]').count(),0);
  assert.equal(await page.locator('[data-screen="services"]').first().innerText(),'Paquetes constructivos');
  assert.equal(await page.locator('#homeCurveSelector [type="checkbox"]').count(),7);
  await page.locator('#packageCards [data-aim-service="P02"]').click();
  assert.ok(await page.locator('#screen-services').isVisible());
  assert.match(await page.locator('#serviceTitle').innerText(),/P02/);
  assert.equal(await page.locator('#serviceStats .aim-stat').count(),6);
  assert.ok(await page.locator('#serviceFollowupView').isVisible());
  assert.equal(await page.locator('#serviceSegmented button').count(),2);
  await page.locator('[data-aim-section="frentes"]').click();
  assert.ok(await page.locator('#serviceFrontsView').isVisible());
  assert.equal(await page.locator('#frontComponents button').count(),4);
  await page.locator('[data-aim-component="bloques"]').click();
  assert.match(await page.locator('#frontDetailTitle').innerText(),/Bloques de defensa/);
  assert.match(await page.locator('#frontDetail').innerText(),/No se han asignado porcentajes/);
  await page.locator('[data-aim-section="seguimiento"]').click();
  assert.ok(await page.locator('#serviceFollowupView').isVisible());
  assert.match(await page.locator('#servicePpcChart').innerText(),/Sin historial PPC/);
  await page.locator('#serviceNav [data-aim-service="P05"]').click();
  assert.match(await page.locator('#serviceTitle').innerText(),/P05/);
  await page.locator('[data-aim-section="frentes"]').click();
  assert.equal(await page.locator('#frontComponents button').count(),1);
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
