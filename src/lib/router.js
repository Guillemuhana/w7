/**
 * ───────────────────────────────────────────────────────────────
 *  PUENTE CON EL ROUTER DEL NODO
 * ───────────────────────────────────────────────────────────────
 *
 * Cuando el dispositivo se asocia al WiFi del nodo, el router (OpenWrt +
 * openNDS) lo deja en estado `preauth`: tiene IP y DNS, pero nftables le
 * bloquea la salida. Para mostrar el portal lo redirige acá agregando en la
 * query quién es el dispositivo y desde qué nodo entra.
 *
 * Este módulo hace dos cosas:
 *   1. leer esos parámetros (`leerSesionRouter`);
 *   2. armar la URL con la que después se le pide al router que abra la
 *      puerta para esa MAC (`urlDeAutorizacion`).
 *
 * El detalle completo del handshake está en `docs/arquitectura-red.md`.
 */

/** Puerto en el que openNDS escucha en el router. */
export const PUERTO_GATEWAY = 2050;

/**
 * Cada dato puede llegar con distinto nombre según el firmware
 * (openNDS, nodogsplash y CoovaChilli no se pusieron de acuerdo).
 */
const ALIAS = {
  mac: ["clientmac", "client_mac", "mac"],
  ip: ["clientip", "client_ip", "ip"],
  nodo: ["gatewayname", "gwname", "nasid", "nodo"],
  gateway: ["gatewayaddress", "gwaddress", "gw_address"],
  token: ["hid", "tok", "token", "sessionid"],
  destino: ["redir", "userurl", "url"],
};

const primero = (params, claves) => {
  for (const clave of claves) {
    const valor = params.get(clave);
    if (valor) return valor;
  }
  return null;
};

/** `aa-bb-cc…` o `aabbccddeeff` -> `AA:BB:CC:DD:EE:FF`. Si no es MAC, null. */
export function normalizarMac(valor) {
  if (!valor) return null;
  const hex = valor.replace(/[^0-9a-fA-F]/g, "").toUpperCase();
  if (hex.length !== 12) return null;
  return hex.match(/.{2}/g).join(":");
}

/** Muestra sólo el fabricante y los dos últimos bytes: `AA:BB:…:EE:FF`. */
export function macAbreviada(mac) {
  if (!mac) return null;
  const b = mac.split(":");
  return `${b[0]}:${b[1]}:…:${b[4]}:${b[5]}`;
}

/**
 * Datos del dispositivo y del nodo, tal como los mandó el router.
 *
 * Si el portal se abre fuera de un nodo (la demo en Vercel, `npm run dev`)
 * no hay parámetros: devuelve `presente: false` y valores de ejemplo, así la
 * demo sigue funcionando igual.
 */
export function leerSesionRouter(busqueda) {
  const params = new URLSearchParams(
    busqueda ?? (typeof window === "undefined" ? "" : window.location.search)
  );

  const mac = normalizarMac(primero(params, ALIAS.mac));
  const gateway = primero(params, ALIAS.gateway);
  const token = primero(params, ALIAS.token);

  // Sin MAC ni gateway no hay router del otro lado: estamos en la demo.
  const presente = Boolean(mac && gateway);

  return {
    presente,
    mac: mac ?? "DE:M0:00:DE:M0:00",
    ip: primero(params, ALIAS.ip) ?? "10.7.0.53",
    nodo: primero(params, ALIAS.nodo) ?? "A1043",
    gateway: gateway ?? "10.7.0.1",
    token,
    destino: primero(params, ALIAS.destino) ?? "http://w-7.net/",
  };
}

/**
 * URL del router que efectivamente habilita al dispositivo.
 *
 * Los dos valores los devuelve `POST /autorizar` y ninguno se puede fabricar
 * desde el navegador:
 *
 *   `tok`    sha256(hid + faskey). Es lo único que openNDS acepta como prueba
 *            de que la autorización la dio W-7.
 *   `custom` el ticket firmado, que openNDS le pasa tal cual al script
 *            binauth del router; de ahí sale la cuota de la sesión.
 *
 * Después el router manda al visitante a `destino`, la página que estaba
 * intentando abrir cuando saltó el portal.
 */
export function urlDeAutorizacion({ gateway, tok, custom, destino }) {
  const url = new URL(`http://${gateway}:${PUERTO_GATEWAY}/opennds_auth/`);
  url.searchParams.set("tok", tok);
  if (custom) url.searchParams.set("custom", custom);
  if (destino) url.searchParams.set("redir", destino);
  return url.toString();
}
