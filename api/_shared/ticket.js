/**
 * ───────────────────────────────────────────────────────────────
 *  TICKET DE AUTORIZACIÓN
 * ───────────────────────────────────────────────────────────────
 *
 * Dos secretos distintos, uno por cada cosa que hay que probar:
 *
 *  - `faskey`  — lo comparten openNDS y W-7. Con él calculamos el `rhid`,
 *    que es lo único que el router acepta como prueba de que la
 *    autorización la dio W-7 y no el propio visitante. Es la llave del
 *    portón.
 *
 *  - `claveTicket` — firma el ticket con los datos de la sesión (MAC, nodo,
 *    minutos, vencimiento). El script binauth del router lo verifica sin
 *    salir a internet, así que un nodo con el enlace caído igual puede
 *    autorizar. Es el contenido del sobre.
 *
 * Todo con Web Crypto: el mismo archivo corre en Deno (Edge Functions) y en
 * Node (los tests de `api/ticket.test.mjs`).
 */

const utf8 = new TextEncoder();

/** base64url sin padding: viaja en una query string sin escaparse. */
export function aB64url(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function deB64url(texto) {
  const b64 = texto.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, "="));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

const importarHmac = (secreto) =>
  crypto.subtle.importKey(
    "raw",
    utf8.encode(secreto),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );

/**
 * `rhid` = sha256(hid + faskey), en hexadecimal.
 *
 * openNDS manda el `hid` en el redirect al portal y sólo abre la puerta si le
 * devolvemos este valor como `tok`. Como el `faskey` nunca sale del servidor,
 * el visitante no lo puede calcular por su cuenta.
 */
export async function calcularRhid(hid, faskey) {
  const digest = await crypto.subtle.digest("SHA-256", utf8.encode(`${hid}${faskey}`));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** `<payload b64url>.<firma b64url>` */
export async function firmarTicket(datos, claveTicket) {
  const cuerpo = aB64url(utf8.encode(JSON.stringify(datos)));
  const firma = await crypto.subtle.sign("HMAC", await importarHmac(claveTicket), utf8.encode(cuerpo));
  return `${cuerpo}.${aB64url(new Uint8Array(firma))}`;
}

/**
 * Verifica firma y vencimiento. Devuelve `{ ok, datos, motivo }`; nunca
 * lanza, porque del otro lado esto lo llama un script de shell.
 */
export async function verificarTicket(ticket, claveTicket, ahora = Date.now()) {
  const partes = String(ticket ?? "").split(".");
  if (partes.length !== 2) return { ok: false, motivo: "formato" };

  const [cuerpo, firma] = partes;
  let valida;
  try {
    valida = await crypto.subtle.verify(
      "HMAC",
      await importarHmac(claveTicket),
      deB64url(firma),
      utf8.encode(cuerpo)
    );
  } catch {
    return { ok: false, motivo: "formato" };
  }
  if (!valida) return { ok: false, motivo: "firma" };

  let datos;
  try {
    datos = JSON.parse(new TextDecoder().decode(deB64url(cuerpo)));
  } catch {
    return { ok: false, motivo: "formato" };
  }

  if (typeof datos.exp !== "number" || datos.exp * 1000 < ahora) {
    return { ok: false, motivo: "vencido" };
  }
  return { ok: true, datos };
}

/** Minutos de sesión -> la línea que binauth le escribe a openNDS. */
export const VENTANA_TICKET_SEG = 300;
