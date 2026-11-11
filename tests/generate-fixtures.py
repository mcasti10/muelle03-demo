from zipfile import ZipFile,ZIP_DEFLATED
from pathlib import Path
for name,date,pr,sheet in [('valid','2026-11-11','','Indicadores Diarios'),('invalid-date','2026-02-31','','Indicadores Diarios'),('date1904','2026-11-11','<workbookPr date1904="1"/>','Indicadores Diarios'),('wrong-sheet','2026-11-11','','Otra')]:
 with ZipFile('tests/fixtures/'+name+'.xlsx','w',ZIP_DEFLATED) as z:
  z.writestr('xl/workbook.xml',f'<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">{pr}<sheets><sheet name="{sheet}" r:id="rId1"/></sheets></workbook>')
  z.writestr('xl/_rels/workbook.xml.rels','<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>')
  rows=[['FECHA','PPC','SPI','EV','PV'],[date,'1%',1,'0,5%','0,5%']]
  xml='<worksheet><sheetData>'
  for i,row in enumerate(rows,1):
   xml+='<row>'
   for col,v in zip('ABCDE',row):
    xml+=f'<c r="{col}{i}" t="inlineStr"><is><t>{v}</t></is></c>' if isinstance(v,str) else f'<c r="{col}{i}"><v>{v}</v></c>'
   xml+='</row>'
  z.writestr('xl/worksheets/sheet1.xml',xml+'</sheetData></worksheet>')

# Variante habitual de Excel: shared strings, fecha serial y fórmulas cacheadas.
with ZipFile('tests/fixtures/valid.xlsx') as src:
 with ZipFile('tests/fixtures/cached-formulas.xlsx','w',ZIP_DEFLATED) as z:
  for entry in src.namelist():
   if entry!='xl/worksheets/sheet1.xml': z.writestr(entry,src.read(entry))
  z.writestr('xl/sharedStrings.xml','<sst>'+''.join('<si><t>'+h+'</t></si>' for h in ['FECHA','PPC','SPI','EV','PV'])+'</sst>')
  header=''.join(f'<c r="{col}1" t="s"><v>{i}</v></c>' for i,col in enumerate('ABCDE'))
  row=''.join(f'<c r="{col}2"><f>1/100</f><v>{v}</v></c>' for col,v in zip('ABCDE',[46337,.01,1,.005,.005]))
  z.writestr('xl/worksheets/sheet1.xml','<worksheet><sheetData><row>'+header+'</row><row>'+row+'</row></sheetData></worksheet>')

# Flujo diario ficticio: dos cortes listos y un último corte en preparación.
from xml.sax.saxutils import escape
complete=[['2026-11-11','1%',1,.01,.01],['2026-11-12','2%',1,.02,.02]]
pending=['2026-11-13','',None,.03,'']
variants={
 'trailing-incomplete':complete+[pending],
 'intermediate-incomplete':[complete[0],['2026-11-12','',None,.02,''],['2026-11-13','3%',1,.03,.03]],
 'pending-invalid-date':complete+[['2026-02-31','',None,.03,'']],
 'pending-invalid-value':complete+[['2026-11-13','',None,'oops','']],
}
for name,records in variants.items():
 with ZipFile('tests/fixtures/valid.xlsx') as src, ZipFile('tests/fixtures/'+name+'.xlsx','w',ZIP_DEFLATED) as z:
  for entry in src.namelist():
   if entry!='xl/worksheets/sheet1.xml': z.writestr(entry,src.read(entry))
  xml='<worksheet><sheetData>'
  for i,row in enumerate([['FECHA','PPC','SPI','EV','PV']]+records,1):
   xml+=f'<row r="{i}">'
   for col,v in zip('ABCDE',row):
    if v is None: continue # Celda ausente: debe seguir vacía, nunca cero.
    if v=='': xml+=f'<c r="{col}{i}"><f>""</f><v></v></c>'
    elif isinstance(v,str): xml+=f'<c r="{col}{i}" t="inlineStr"><is><t>{escape(v)}</t></is></c>'
    else: xml+=f'<c r="{col}{i}"><v>{v}</v></c>'
   xml+='</row>'
  z.writestr('xl/worksheets/sheet1.xml',xml+'</sheetData></worksheet>')
