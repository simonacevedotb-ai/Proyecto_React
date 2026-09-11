// Traduce el campo `icono` que guarda la base de datos al nombre del
// icono correspondiente en components/ui/Icon.jsx.
//
// Vive aparte del componente Icon para que ese archivo exporte solo un
// componente: así el recambio en caliente de Vite funciona bien durante
// el desarrollo.

export const ICONOS_CATEGORIA = {
  phone: "telefono",
  plug: "enchufe",
  headphones: "auriculares",
  watch: "reloj",
  tablet: "tableta",
};

export const ICONOS_SERVICIO = {
  screen: "pantalla",
  battery: "bateria",
  shield: "escudo",
  search: "buscar",
  unlock: "llave",
  cloud: "nube",
};
