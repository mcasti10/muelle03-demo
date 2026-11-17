/* AIM03 · Publicación controlada de indicadores por servicio.
   Este archivo NO contiene los Excel del contratista ni datos sensibles.
   Cada actualización futura se preparará a partir de archivos compartidos en ChatGPT,
   revisando el servicio de origen y publicando únicamente indicadores autorizados.

   Formato de cada registro, con razones entre 0 y 1:
   {fecha:"2026-11-03",ppc:0.73,spi:0.9686,ev:0.9283,pv:0.9584,
    delta_real:0.0022,delta_plan:0.0021,desvio:-0.0301}
   No asociar el Excel de referencia con P02/P05 sin confirmar el contrato.
*/
window.AIM03_SERIES = Object.freeze({
  esquema: 1,
  fecha_publicacion: null,
  fuente: "Sin series de contratista publicadas por servicio",
  servicios: {
    P01:{estado:null,registros:[]},P02:{estado:null,registros:[]},
    P03:{estado:null,registros:[]},P04:{estado:null,registros:[]},
    P05:{estado:null,registros:[]},P06:{estado:null,registros:[]},
    P07:{estado:null,registros:[]}
  }
});