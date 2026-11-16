const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const {chromium}=require('playwright');
(async()=>{
 const html=fs.readFileSync('index.html');
 // Se sirve bajo la misma subruta que Pages; no se modifica el documento para las pruebas.
 const server=http.createServer((req,res)=>{if(req.url==='/muelle03-demo/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html)}else if(req.url==='/muelle03-demo/edt-fisica.js'){res.setHeader('Content-Type','application/javascript; charset=utf-8');res.end(fs.readFileSync('edt-fisica.js'))}else{res.statusCode=404;res.end()}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let browser;
 try{
  browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/muelle03-demo/`);
  for(const name of ['matrix','process','model','contractor','data','photos']){await page.locator(`[data-screen="${name}"]`).first().click();assert.ok(await page.locator('#screen-'+name).isVisible())}
  await page.locator('[data-screen="matrix"]').first().click();
  for(const [pkg,applicable] of [['P02',44],['P05',39]]){
   await page.locator(`[data-module="${pkg}"]`).click();assert.equal(await page.locator('#fullAxisGrid button').count(),44);assert.equal(await page.locator('#fullAxisGrid button:not([disabled])').count(),applicable);
  }
  await page.locator('#fullAxisGrid [data-ax="E20"]').click();assert.match(await page.locator('#axisDetail').innerText(),/E20/);
  assert.ok((await page.locator('#globalMetrics').innerText()).includes('AVANCE FÍSICO'));
  assert.ok(!(await page.locator('#globalMetrics').innerText()).includes('PRESUPUESTO'));
  const id='P05-E20-AR03';
  await page.locator('[data-screen="data"]').first().click();
  const upload=async text=>page.locator('#csvFile').setInputFiles({name:'demo.csv',mimeType:'text/csv',buffer:Buffer.from(text)});
  await upload(`id,avance_real_pct\n${id},1%`);await page.locator('#msg').filter({hasText:'Importadas 1'}).waitFor();
  assert.equal(await page.evaluate(id=>data.activities.find(a=>a.id===id).avance_real_pct,id),1);
  await upload(`id;avance_real_pct\n${id};0,5%`);await page.waitForFunction(id=>data.activities.find(a=>a.id===id).avance_real_pct===.5,id);
  await upload(`id,avance_real_pct\n${id},80\nP05-E20-AR04, `);await page.locator('#msg').filter({hasText:'Error:'}).waitFor();assert.equal(await page.evaluate(id=>data.activities.find(a=>a.id===id).avance_real_pct,id),.5);
  await page.locator('[data-screen="matrix"]').first().click();await page.locator('#axisDetail [data-edit-activity="'+id+'"]').click();assert.equal(await page.locator('#editValue').inputValue(),'0.5');await page.locator('#cancelEdit').click();
  await page.locator('[data-screen="process"]').first().click();assert.ok(await page.locator('#processTable td button').count()>400);
  await page.locator('[data-screen="model"]').first().click();await page.locator('#modelService').selectOption('P05');
  await page.locator('[data-model-mode="plan"]').click();await page.locator('[data-model-mode="gap"]').click();await page.locator('[data-view="top"]').click();await page.locator('#zoomIn').click();
  await page.locator('#weekSlider').fill('6');assert.equal(await page.evaluate(()=>week),6);
  await page.locator('#playBtn').click();await page.waitForFunction(()=>week>6);await page.locator('#playBtn').click();
  assert.ok(await page.locator('canvas').evaluate(c=>c.width>0&&c.height>0));
  await page.locator('[data-screen="contractor"]').first().click();
  const report='FECHA;PPC;SPI;EV;PV\n2026-11-11;1%;1;0,5%;0,5%';
  const kpiUpload=async text=>page.locator('#kpiFile').setInputFiles({name:'indicadores.csv',mimeType:'text/csv',buffer:Buffer.from(text)});
  await kpiUpload(report);await page.locator('#kpiToast').filter({hasText:'1 cortes'}).waitFor();assert.match(await page.locator('.kpi-metrics').innerText(),/0.50%/);
  const snapshot=await page.locator('.kpi-metrics').innerText();
  await kpiUpload(report+'\n31/02/2026;1;1;1;1');await page.locator('#kpiToast').filter({hasText:'No se pudo importar'}).waitFor();assert.equal(await page.locator('.kpi-metrics').innerText(),snapshot);
  for(const name of ['valid.xlsx','cached-formulas.xlsx','invalid-date.xlsx','date1904.xlsx','wrong-sheet.xlsx']){
   await page.locator('#kpiFile').setInputFiles('tests/fixtures/'+name);
   await page.locator('#kpiToast').filter({hasText:['valid.xlsx','cached-formulas.xlsx'].includes(name)?'1 cortes':'No se pudo importar'}).waitFor();
   assert.equal(await page.locator('.kpi-metrics').innerText(),snapshot);
  }
  // XLSX real del flujo diario: cancelación, errores sin diálogo y aceptación explícita.
  const exportSeries=async()=>{
   const download=page.waitForEvent('download');await page.locator('#kpiExport').click();
   const stream=await (await download).createReadStream();let text='';for await(const chunk of stream)text+=chunk.toString();return text;
  };
  const originalCSV=await exportSeries();
  const originalSource=await page.locator('.kpi-snapshot').innerText();
  const originalActivities=await page.evaluate(()=>JSON.stringify({data,totals:agg(data.activities)}));
  const pendingFile='tests/fixtures/trailing-incomplete.xlsx';
  let dialogMessage='';
  page.once('dialog',async dialog=>{dialogMessage=dialog.message();await dialog.dismiss()});
  await page.locator('#kpiFile').setInputFiles(pendingFile);
  await page.locator('#kpiToast').filter({hasText:'Importación cancelada'}).waitFor();
  assert.match(dialogMessage,/2026-11-13/);assert.match(dialogMessage,/faltan PPC, SPI, PV/);assert.match(dialogMessage,/2 cortes completos y validados/);
  assert.equal(await exportSeries(),originalCSV);assert.equal(await page.locator('.kpi-snapshot').innerText(),originalSource);
  assert.equal(await page.locator('.kpi-metrics').innerText(),snapshot);
  // Ni una fecha mala ni un dato inválido se pueden excluir con confirmación.
  let unexpectedDialogs=0;
  const rejectDialog=async dialog=>{unexpectedDialogs++;await dialog.dismiss()};page.on('dialog',rejectDialog);
  for(const name of ['intermediate-incomplete.xlsx','pending-invalid-date.xlsx','pending-invalid-value.xlsx']){
   await page.locator('#kpiFile').setInputFiles('tests/fixtures/'+name);
   await page.locator('#kpiToast').filter({hasText:'No se pudo importar'}).waitFor();
   assert.equal(await exportSeries(),originalCSV);assert.equal(await page.locator('.kpi-snapshot').innerText(),originalSource);
  }
  page.off('dialog',rejectDialog);assert.equal(unexpectedDialogs,0);
  page.once('dialog',async dialog=>{await dialog.accept()});
  await page.locator('#kpiFile').setInputFiles(pendingFile);
  await page.locator('#kpiToast').filter({hasText:'2 cortes'}).waitFor();
  assert.match(await page.locator('#kpiToast').innerText(),/excluidas con tu confirmación/);
  assert.match(await page.locator('.kpi-quality').innerText(),/1 fila.*excluidas con confirmación/);
  const acceptedCSV=await exportSeries();assert.notEqual(acceptedCSV,originalCSV);
  assert.match(acceptedCSV,/2026-11-12/);assert.doesNotMatch(acceptedCSV,/2026-11-13/);
  assert.equal(acceptedCSV.trim().split('\n').length,3);assert.match(await page.locator('.kpi-metrics').innerText(),/2.00%/);
  assert.equal(await page.evaluate(()=>JSON.stringify({data,totals:agg(data.activities)})),originalActivities);
  assert.deepEqual(errors,[]);console.log('OK: navegación, matrices 44/39, fichas, procesos, edición, CSV/XLSX atómicos, cancelación/confirmación de cortes en preparación, indicadores y visor 4D.');
 }finally{await browser?.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
