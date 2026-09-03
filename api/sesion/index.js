/**
 * ───────────────────────────────────────────────────────────────
 *  POST /sesion
 * ───────────────────────────────────────────────────────────────
 *
 * Accounting. Lo llama el script binauth del nodo (no el navegador) cuando
 * abre o cierra una sesión, y el heartbeat del router cada pocos minutos.
 *
 * Entrada: { nodo, mac, evento, motivo, bytesSubida, bytesBajada }
 *          evento: "inicio" | "fin" | "latido"
 *
 * Se autentica con el header `x-w7-nodo-clave`, que es la `clave_ticket` del
 * nodo: el mismo secreto con el que binauth verifica los tickets, así el
 * router no guarda una credencial más. Va por el túnel WireGuard.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { json, error, preflight, normalizarMac, igualesEnTiempoConstante } from "../_shared/http.js";

const EVENTOS = new Set(["inicio", "fin", "latido"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "POST") return error("metodo_no_permitido", 405);

  let cuerpo;
  try {
    cuerpo = await req.json();
  } catch {
    return error("json_invalido");
  }

  const nodoId = typeof cuerpo.nodo === "string" ? cuerpo.nodo.trim() : "";
  const evento = EVENTOS.has(cuerpo.evento) ? cuerpo.evento : null;
  const clave = req.headers.get("x-w7-nodo-clave") ?? "";

  if (!nodoId || !evento) return error("parametros_invalidos");

  const db = createClient(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } }
  );

  const { data: nodo } = await db
    .from("nodos")
    .select("id, clave_ticket")
    .eq("id", nodoId)
    .maybeSingle();

  if (!nodo || !igualesEnTiempoConstante(clave, nodo.clave_ticket)) {
    return error("nodo_no_autenticado", 401);
  }

  const ahora = new Date().toISOString();
  await db.from("nodos").update({ visto_en: ahora }).eq("id", nodo.id);

  if (evento === "latido") return json({ ok: true });

  const mac = normalizarMac(cuerpo.mac);
  if (!mac) return error("mac_invalida");

  if (evento === "inicio") {
    const { data: dispositivo } = await db
      .from("dispositivos")
      .select("usuario_id")
      .eq("mac", mac)
      .maybeSingle();

    await db.from("sesiones").insert({
      nodo_id: nodo.id,
      mac,
      usuario_id: dispositivo?.usuario_id ?? null,
      metodo: typeof cuerpo.metodo === "string" ? cuerpo.metodo.slice(0, 20) : "suscripcion",
      inicio: ahora,
    });
    return json({ ok: true });
  }

  // "fin": cerramos la última sesión abierta de esa MAC en este nodo.
  const { data: abierta } = await db
    .from("sesiones")
    .select("id")
    .eq("nodo_id", nodo.id)
    .eq("mac", mac)
    .is("fin", null)
    .order("inicio", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!abierta) return json({ ok: true, motivo: "sin_sesion_abierta" });

  await db
    .from("sesiones")
    .update({
      fin: ahora,
      motivo_fin: typeof cuerpo.motivo === "string" ? cuerpo.motivo.slice(0, 40) : null,
      bytes_subida: Number(cuerpo.bytesSubida) || 0,
      bytes_bajada: Number(cuerpo.bytesBajada) || 0,
    })
    .eq("id", abierta.id);

  return json({ ok: true });
});
