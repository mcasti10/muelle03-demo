# Muelle 03 · Obra digital BIM 4D (demo)

## EDT física sin importes

Esta rama implementa una demostración de ponderación técnica **no monetaria** para la reparación de plataforma (P02) y arriostres (P05). La sub-EDT está inspirada en el alcance constructivo, pero **no contiene los cronogramas XML reales, fechas ejecutadas, metrados reales, precios ni presupuestos del contratista**.

- **P02**: 44 ejes de plataforma, de los cuales 21 muestran defensas marítimas, con actividades técnicas específicas y condiciones de cierre.
- **P05**: 39 frentes enumerados E01 a E39, con demolición, excavación, desmontaje, tirantes, DYWIDAG, vigas, concreto, restitución y cierre.
- **Avance físico**: suma de (metrado sintético × coeficiente técnico × % ejecutado) dividida por suma de (metrado sintético × coeficiente técnico). Los coeficientes son provisionales y **no son precios ni equivalen a costo**.
- **Avance programado y SPI**: construidos sobre pesos técnicos y un programa de demostración. Los históricos anteriores en la pantalla 4D siguen siendo simulados.
- **Predecesoras**: identifican actividades que deben revisarse antes de declarar terminada una sucesora. Un solape programado en MS Project no es automáticamente un incumplimiento constructivo.
- **Liberación técnica**: 100% físico no equivale a aceptación. Existe un control de liberación de ejemplo, temporal en el navegador, que no sustituye ensayos, inspección ni autorizaciones reales.

La pestaña **Revisión EDT** permite cargar los XML originales *solo localmente en el navegador*. Los archivos no se almacenan ni publican en GitHub. Los registros reales del contratista todavía **no se han conciliado ni migrado** a los datos de las matrices.

## Pruebas

```bash
npm ci
npm test
npm run test:browser
```

## Desarrollo incremental

- [Contrato de importaciones](docs/importaciones.md)
- [Diseño y límites del avance físico](docs/migracion-avance-fisico.md)

La PR #1 contiene validaciones de importación; PR #2 agrega revisión local de XML y esta funcionalidad física se mantiene en una PR separada sobre esas ramas. No incorporar datos empresariales o contractualizados en el repositorio público.

**Verificación:** la revisión en Codespaces y los controles automatizados preceden a cualquier publicación en `main`.
