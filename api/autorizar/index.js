/**
 * ───────────────────────────────────────────────────────────────
 *  POST /autorizar
 * ───────────────────────────────────────────────────────────────
 *
 * Paso 6 del handshake (ver docs/arquitectura-red.md). Lo llama el portal
 * desde el navegador del visitante, que en ese momento sólo tiene salida al
 * walled garden.
 *
 * Entrada:  { nodo, mac, ip, hid, metodo }
 * Salida:   { ok, tok, custom, minutosSesion }
 *
 *   `tok`    -> sha256(hid + faskey). Es lo único que openNDS acepta como
 *               prueba de que la autorización la dio W-7. El visitante no lo
 *               puede calcular porque el faskey nunca sale de acá.
 *   `custom` -> el ticket firmado, en base64url. openNDS se lo pasa tal cual
 *               al script binauth del router, que lo verifica sin internet y
 *               saca de ahí la cuota de la sesión.
 *
 * Con esos dos valores el navegador va a
 * `http://<gateway>:2050/opennds_auth/?tok=...&custom=...&redir=...` y el
 * router abre la puerta.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { calcularRhid, firmarTicket, aB64url, VENTANA_TICKET_SEG } from "../_shared/ticket.js";
import { json, error, preflight, normalizarMac } from "../_shared/http.js";

/** Cuánto dura la sesión que abre el router. Se renueva volviendo al portal. */
const MINUTOS_SESION = 120;

const METODOS = new Set(["suscripcion", "whatsapp", "sms"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "POST") return error("metodo_no_permitido", 405);

  let cuerpo;
  try {
    cuerpo = await req.json();
  } catch {
    return error("json_invalido");
  }

  const mac = normalizarMac(cuerpo.mac);
  const nodoId = typeof cuerpo.nodo === "string" ? cuerpo.nodo.trim() : "";
  const hid = typeof cuerpo.hid === "string" ? cuerpo.hid.trim() : "";
  const metodo = METODOS.has(cuerpo.metodo) ? cuerpo.metodo : "suscripcion";

  if (!mac) return error("mac_invalida");
  if (!nodoId) return error("nodo_invalido");
  if (!hid) return error("hid_faltante");

  // service_role: esta función necesita leer las claves del nodo, que ninguna
  // policy expone. Esos campos nunca vuelven en la respuesta.
  const db = createClient(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } }
  );

  const { data: nodo } = await db
    .from("nodos")
    .select("id, fas_key, clave_ticket, activo")
    .eq("id", nodoId)
    .maybeSingle();

  if (!nodo) return error("nodo_desconocido", 404);
  if (!nodo.activo) return error("nodo_inactivo", 403);

  // Quién es esta MAC. Con sesión iniciada llega el JWT; si no, alcanza con
  // que el dispositivo ya esté registrado: eso es el roaming entre nodos.
  const jwt = req.headers.get("authorization")?.replace(/^Bearer /i, "");
  let usuarioId = null;

  if (jwt) {
    const { data } = await db.auth.getUser(jwt);
    usuarioId = data?.user?.id ?? null;
  }
  if (!usuarioId) {
    const { data: dispositivo } = await db
      .from("dispositivos")
      .select("usuario_id")
      .eq("mac", mac)
      .maybeSingle();
    usuarioId = dispositivo?.usuario_id ?? null;
  }
  if (!usuarioId) return error("dispositivo_no_registrado", 401);

  const { data: suscripcion } = await db
    .from("suscripciones")
    .select("id, vence_en")
    .eq("usuario_id", usuarioId)
    .eq("estado", "activa")
    .gt("vence_en", new Date().toISOString())
    .order("vence_en", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!suscripcion) return error("sin_suscripcion", 402);

  const ahora = Math.floor(Date.now() / 1000);
  const ticket = await firmarTicket(
    { nodo: nodo.id, mac, min: MINUTOS_SESION, exp: ahora + VENTANA_TICKET_SEG },
    nodo.clave_ticket
  );

  // Registro del dispositivo. La sesión la abre binauth desde el nodo, que es
  // el único que sabe si la puerta terminó de abrirse.
  await db
    .from("dispositivos")
    .upsert({ mac, usuario_id: usuarioId, visto_en: new Date().toISOString() });

  return json({
    ok: true,
    tok: await calcularRhid(hid, nodo.fas_key),
    custom: aB64url(new TextEncoder().encode(ticket)),
    minutosSesion: MINUTOS_SESION,
  });
});
