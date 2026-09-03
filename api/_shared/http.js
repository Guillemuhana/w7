/**
 * Respuestas HTTP de las Edge Functions.
 *
 * El portal se sirve desde el propio router (`http://10.7.0.1`) y la API vive
 * en otro origen, así que toda respuesta necesita CORS.
 */

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, content-type, apikey, x-w7-nodo-clave",
  "access-control-allow-methods": "POST, OPTIONS",
};

export const preflight = () => new Response(null, { status: 204, headers: CORS });

export const json = (cuerpo, status = 200) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { ...CORS, "content-type": "application/json; charset=utf-8" },
  });

/** `motivo` es un código estable; el portal decide qué texto mostrar. */
export const error = (motivo, status = 400) => json({ ok: false, motivo }, status);

/** MAC en cualquier formato -> `AA:BB:CC:DD:EE:FF`, o null si no lo es. */
export function normalizarMac(valor) {
  const hex = String(valor ?? "").replace(/[^0-9a-fA-F]/g, "").toUpperCase();
  return hex.length === 12 ? hex.match(/.{2}/g).join(":") : null;
}

/** Comparación de largo constante: no filtrar secretos por tiempo. */
export function igualesEnTiempoConstante(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let dif = 0;
  for (let i = 0; i < a.length; i++) dif |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return dif === 0;
}
