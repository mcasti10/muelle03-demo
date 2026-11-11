# Propuesta para la segunda PR: control físico ponderado

Estado: diseño para revisión. Esta PR de importaciones NO cambia el motor vigente ni convierte EV/PV reportados en indicadores físicos. No contiene datos reales. La migración requiere otra rama/PR y aprobación expresa antes de fusionar a main.

## Decisión y límites

El modelo definitivo no tendrá precios, monedas, presupuestos contractuales ni inversión. Los criterios de control serán técnicos e independientes de costos. No se obtendrán pesos normalizando los precios o BAC actuales: eso conservaría indirectamente la dependencia económica.

La EDT mantiene P01–P06. Se preservan IDs de actividades, 44 ubicaciones de plataforma y 39 aplicables de arriostre, estados, procesos, restricciones, galería demostrativa y navegación. Las mediciones de magnitudes diferentes nunca se suman directamente.

## Inventario del legado que debe retirarse

Todo se encuentra actualmente en `index.html`:

| Campo o función | Uso existente | Sustitución propuesta |
|---|---|---|
| `activities[].pu_control` | Precio unitario ficticio de cada una de las 1.009 actividades | Eliminar del esquema y del JSON público |
| `pu_control_pen` | Alias admitido anteriormente por el importador | Eliminar; esta primera PR ya bloquea ambos encabezados |
| `metrado_aprobado` | Cantidad física y factor de BAC | Conservar solo como cantidad física positiva, con unidad |
| `bac(t)` | Multiplica metrado por PU | Sustituir por consulta de pesos técnicos versionados |
| `agg()` y `renderKpi()` | EV/PV y avance ponderados por BAC | Selectores físicos por unidad de control y fecha |
| `agg().b`, `g.b`, `p.b`, `base`, `evd` | Totales y acumulados del motor económico | Pesos, ratios y avances físicos; sin equivalencia numérica automática |
| `money()` y factores `/1e6` | Formato de montos y millones | Eliminar; porcentajes y cantidades con unidad |
| `downloadCSV('full')` | Exporta `pu_control` | Exportación física con lista blanca de campos |

Retirar también: tarjetas “PRESUPUESTO CONTROL DEMO”, “costo control”, “EV DEMO/BAC DEMO” monetarios; valores `S/`, `BAC`, la columna “EV / BAC (S/)”; pesos de la ficha derivados de BAC; el diccionario “Metrado y PU” y todas las descripciones de ponderación por costo/presupuesto. Revisar `renderMetrics`, `detailHTML`, `renderMatrix`, `renderData`, `renderKpi`, textos estáticos, banners y plantillas CSV. Reetiquetar curva S y SPI cuando utilicen el nuevo motor.

No añadir números económicos de reemplazo ni esconderlos solamente con CSS. Eliminar datos y código del árbol público y del artefacto Pages. El historial Git seguirá conteniendo los datos ficticios originales; reescribir ese historial es una actuación distinta, no incluida ni propuesta como requisito de esta PR. No se ha identificado información económica real en la base revisada.

El EV/PV importado se conserva conceptualmente como **indicador reportado de metodología no validada**, separado del EV/PV físico. En la segunda PR debe bloquearse su uso si no se acredita que es una razón adimensional no económica. Nunca solicitar ni importar montos para hacer esa validación.

## Esquema físico propuesto

- `Activity`: `id`, `servicio_id`, `ubicacion_id`, `codigo_actividad`, `grupo`, `unidad`, `metrado_aprobado`, `aplicable`, `motivo_no_aplica`.
- `Measurement`: `id`, `actividad_id`, `fecha_corte`, `metrado_ejecutado_acumulado`, `fuente_id`, `revision`, `estado_validacion`. Historial, no sobrescritura destructiva.
- `ControlUnit`: `id`, tipo (eje, subalcance, servicio, proyecto), `parent_id`, versión y vigencia.
- `ControlWeight`: `unidad_control_id`, actividad o unidad hija, `peso_control_pct`, `criterio_tecnico`, `version`, `vigencia`, estado de aprobación.
- `Baseline`: versión, actividad, fecha y metrado programado acumulado. Permite curvas no lineales y calendarios; no depender únicamente de interpolar semanas.
- `ReportedIndicator`: servicio, fecha, PPC/SPI/EV/PV reportados, unidad declarada adimensional, metodología, estado de validación y procedencia. No alimentar el motor físico automáticamente.

Los criterios de ponderación pueden ser hitos verificables, esfuerzo técnico, complejidad o relevancia constructiva. Se documentarán y aprobarán sin referencia contractual económica. Los valores demo se generarán explícitamente bajo esos criterios.

## Fórmulas y normalización

Para actividad aplicable con metrado aprobado positivo:

```text
ratio_real_i(t) = metrado_ejecutado_acumulado_i(t) / metrado_aprobado_i
ratio_plan_i(t) = metrado_programado_acumulado_i(t) / metrado_aprobado_i
EV_fisico_U(t) = Σ peso_control_i_pct × ratio_real_i(t)
PV_fisico_U(t) = Σ peso_control_i_pct × ratio_plan_i(t)
SPI_fisico_U(t) = EV_fisico_U(t) / PV_fisico_U(t), solo si PV > 0
PPC_periodo = 100 × compromisos_cumplidos / compromisos_exigibles
```

EV/PV físicos se expresan de 0 a 100%; SPI es adimensional. PV cero o ausencia de compromisos: mostrar “No definido”, no cero ni uno artificial.

En cada unidad de control, los pesos de hijos aplicables deben sumar 100% (tolerancia numérica definida, por ejemplo 0,000001 puntos). Rechazar configuraciones incompletas o pesos negativos; no normalizar silenciosamente. Sin actividades aplicables: N/A. Una exclusión debe producir una nueva versión aprobada de pesos que redistribuya el 100% entre las actividades restantes.

Los pesos para avance de un eje y los pesos para agregación del servicio son ámbitos explícitos, no un único campo reutilizado sin contexto. Para plataforma: el servicio incluye ejes y subalcances de bancoductos/manholes, que no deben desaparecer del total. Se deben definir sus unidades y pesos hermanos. Si se presenta avance global, los pesos de servicios también suman 100%.

Ejemplo puramente técnico: una unidad con cuatro fases puede distribuir 10%, 30%, 40% y 20% por hitos aprobados. No sumar m² y kg; primero convertir cada actividad a su ratio.

## Cierre, mediciones y datos de demostración

El cierre sigue exigiendo todas las actividades aplicables completas, incluyendo defensas donde corresponda, y no solo un promedio redondeado a 100%. Una actividad aplicable de peso cero no debe eludir el cierre; preferiblemente exigir pesos positivos. Conservar “bloqueado” por restricción abierta y N/A según aplicabilidad.

Rechazar cantidades negativas, denominador cero y sobreavance mientras no exista un procedimiento explícito de cambio de alcance. No aplicar `clamp` para ocultar mediciones inválidas. Las reducciones de acumulados deben ser revisiones identificadas, no correcciones invisibles.

Para migrar la demo puede obtenerse una cantidad ejecutada sintética como `metrado_aprobado × avance_real_pct / 100`, etiquetando su origen DEMO. Los pesos se diseñan por separado. No cambiar IDs ni convertir los precios en pesos. No exigir equivalencia numérica con los totales ponderados por BAC; el cambio metodológico debe explicarse en la interfaz y el PR.

## Estructura y futuras extensiones

Extraer primero funciones puras en `domain/physical-progress`, validación de pesos en `domain/control-weights` y repositorios de mediciones/líneas base. Un estado central coordina matrices, fichas, procesos, curva y visor mediante selectores del mismo corte.

Seguridad, calidad, restricciones, observaciones de supervisión y evidencias serán registros separados con IDs propios y enlaces a actividad, ubicación y fecha. Una foto o inspección no suma avance por sí sola. Incorporar estados de autorización para evitar publicación de información o imágenes reales sin permiso.

El visor conceptual y un futuro visor IFC implementarán un adaptador común de selección, color, visibilidad y cámara. Enlaces muchos a muchos: actividad ↔ elemento, con modelo/revisión y `GlobalId`; los cálculos físicos permanecen fuera del renderizador. Mantener unidades, coordenadas y revisiones IFC independientes de los IDs de eje.

## Riesgos de compatibilidad y aceptación

1. CSV antiguos con PU/BAC dejan de ser válidos: nueva plantilla y versión de esquema; error explícito, sin importar esos campos.
2. Totales y colores pueden cambiar al abandonar pesos económicos: aprobar pesos técnicos y resultados esperados antes de publicar.
3. El histórico sintético actual no es una serie medida: conservar la etiqueta DEMO hasta disponer de mediciones por corte.
4. EV/PV reportados pueden usar otro universo: comparación solo tras validación de metodología, alcance y fecha; ninguna conversión automática.
5. “No aplica” cambia denominadores: revalidar pesos y versionar; no borrar historia.
6. Distintos ámbitos de pesos pueden producir agregaciones contradictorias: comprobar jerarquía completa, incluidos subalcances fuera de las matrices.

Criterios de aceptación de la segunda PR: cero campos/valores monetarios en datos, código funcional, interfaz o CSV; fórmulas físicas probadas; pesos sumando 100% en cada ámbito aplicable; 44/39 ubicaciones conservadas; cierre y restricciones preservados; mismas acciones de navegación, edición, importación y visor; pruebas de PV cero, N/A, sobreavance y revisiones. Publicación únicamente tras aprobación expresa y merge autorizado.
