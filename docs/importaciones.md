# Contrato de importaciones y pruebas

Primera intervención: corrección de validación y compatibilidad con el corte diario en preparación; no migra el motor de ponderación legado.

## Avances por actividad

Usar la plantilla “Descargar CSV para editar avances”: ID existente y porcentaje en puntos de 0 a 100. `1%` y `1` significan 1%; `0,5%` significa 0,5%. Para coma decimal usar CSV con punto y coma, o comillas si el delimitador es coma. Cero debe escribirse explícitamente. Un vacío, ID desconocido/duplicado, cabecera ambigua, columnas desalineadas o dato fuera de rango rechaza todo el archivo antes de mutar actividades.

Se conservan observaciones y la cantidad física aprobada opcional (positiva). No se admite `pu_control` ni `pu_control_pen`, tampoco en el CSV completo antiguo: ese exportador legado queda inventariado para retirada en la segunda PR. No incorporar datos reales ni utilizar esa exportación económica como entrada.

## Indicadores reportados del contratista

Solo razones adimensionales de demostración, no montos. No se consideran EV/PV físicos validados. El servicio se selecciona manualmente. Cabeceras obligatorias FECHA, PPC, SPI, EV, PV. Los porcentajes explícitos se dividen entre 100 siempre, incluso `1%` y `0,5%`. Por compatibilidad con archivos existentes, sin símbolo: 0..1 son fracciones y >1..100 son puntos porcentuales; `1` significa 100%. Preferir `%` en CSV para evitar ambigüedad. SPI se lee como índice decimal no negativo, sin límite superior artificial.

Fechas aceptadas: AAAA-MM-DD, D/M/AAAA o D-M-AAAA, completas y existentes, años 1900..9999. XLSX: seriales numéricos del calendario 1900; serial 60 rechazado (29/02/1900 inexistente), fracción horaria descartada por tratarse de cortes diarios. Se rechazan fecha vacía, formato ambiguo, fechas numéricas en texto y libros con sistema 1904; exportar estos últimos como CSV con fecha explícita.

Se exige hoja `Indicadores Diarios`, sin usar silenciosamente otra hoja. Se leen resultados cacheados de fórmulas, no se ejecuta Excel: recalcular y guardar antes de cargar. Se mantienen validaciones de compatibilidad y el recurso a CSV para navegadores sin descompresión XLSX.

Filas completamente vacías se ignoran. Cualquier fecha inexistente, duplicada o incorrecta y cualquier indicador suministrado inválido rechaza **todo** el archivo, incluso en el último corte. También se rechazan discrepancias SPI vs EV/PV mayores de 0,025 y disminuciones acumuladas EV/PV mayores de 0,002 (tolerancias existentes); se comprueba también cualquier dato suministrado en cortes pendientes. Semana, si se informa, debe ser entero 1..53; APR debe ser entero no negativo. PV cero no genera un cociente de contraste inventado. Líneas de totales/notas deben excluirse del CSV.

### Excepción controlada: cortes finales en preparación

Solo se propone excluir un sufijo de filas con **fecha válida posterior** a los cortes anteriores y uno o más indicadores obligatorios PPC/SPI/EV/PV vacíos. Todos los valores que sí estén presentes deben superar las mismas validaciones. La ausencia de celda o un resultado de fórmula vacío sigue siendo ausencia, nunca cero. Un error de celda de Excel no se considera un campo pendiente y rechaza el archivo.

La excepción exige que exista al menos un corte completo. Una fila incompleta intermedia, un corte completo posterior a ella o una fecha pendiente anterior/duplicada rechaza todo el archivo. Las filas completamente vacías entre registros no alteran esta regla.

Antes de aplicar cambios, un diálogo de confirmación identifica filas, fechas, campos faltantes, servicio y cantidad de cortes completos. Explica que se sustituirá la serie del servicio y se excluirán los pendientes. **Cancelar conserva la serie previa**, su fuente, corte seleccionado y exportación. Aceptar aplica exclusivamente los cortes completos validados y mantiene una advertencia visible con el número de filas excluidas. No rellena ni importa indicadores pendientes. CSV y XLSX comparten este comportamiento. Un error en cualquier parte del archivo impide la confirmación y conserva los datos anteriores.

## Ejecución

Node 22 o posterior:

```sh
npm ci
npm test
npx playwright install chromium
npm run test:browser
```

Para un Chromium del sistema: `CHROMIUM_PATH=/usr/bin/chromium npm run test:browser`.

Las pruebas unitarias ejecutan las funciones del HTML original en un contexto aislado (sin copias de su implementación). Las de navegador sirven el documento sin alterarlo bajo `/muelle03-demo/`, cargan archivos mediante controles de usuario y comprueban conservación de datos tras errores. Incluyen matrices 44/39, fichas y edición, procesos, indicadores, reproducción temporal y canvas. Para el corte en preparación comprueban cancelación y aceptación mediante el diálogo real, igualdad de la exportación anterior tras cancelación/error y ausencia de cambios en actividades o cálculos. No son una auditoría visual exhaustiva ni prueban todos los navegadores.

Fixtures XLSX mínimos sintéticos, sin datos empresariales: generados con `python3 tests/generate-fixtures.py`. Cubren descompresión, cadenas inline y compartidas, fórmulas cacheadas con serial de fecha, fecha inválida, calendario 1904 y hoja equivocada. Los nuevos libros `trailing-incomplete`, `intermediate-incomplete`, `pending-invalid-date` y `pending-invalid-value` reproducen el proceso diario y sus errores, incluidas celdas ausentes y fórmulas con resultado vacío; no sustituyen la homologación futura con un libro anonimizado autorizado.

El workflow `Validación de importaciones` es de solo lectura y no despliega Pages. Para exigirlo antes del merge debe configurarse su check como obligatorio en las reglas de main; esta PR no modifica esas reglas ni autoriza merges.
