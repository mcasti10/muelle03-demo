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
