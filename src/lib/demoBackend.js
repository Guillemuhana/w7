/**
 * ───────────────────────────────────────────────────────────────
 *  CAPA DE DATOS — MODO DEMO
 * ───────────────────────────────────────────────────────────────
 *
 * Los datos de esta demo son simulados en el front: no hay backend
 * todavía. Lo que sí es real es la geolocalización del dispositivo y
 * el estado de la conexión (ver `src/hooks/`).
 *
 * Cuando exista el backend en Supabase, sólo hay que reemplazar el
 * cuerpo de estas funciones respetando la misma firma y forma de
 * respuesta; los componentes no cambian. Por ejemplo:
 *
 *   import { createClient } from "@supabase/supabase-js";
 *   const supabase = createClient(
 *     import.meta.env.VITE_SUPABASE_URL,
 *     import.meta.env.VITE_SUPABASE_ANON_KEY
 *   );
 *
 *   export async function buscarNodosCercanos({ lat, lng, radioMetros }) {
 *     // RPC con PostGIS: ST_DWithin sobre la tabla `nodos`
 *     const { data, error } = await supabase.rpc("nodos_cercanos", {
 *       p_lat: lat, p_lng: lng, p_radio: radioMetros,
 *     });
 *     if (error) throw error;
 *     return data;
 *   }
 */

import { desplazar, distanciaEnMetros } from "./geo.js";

export const MODO_DEMO = true;

/** Ubicación de respaldo si el navegador no da permiso: centro de Córdoba. */
export const UBICACION_FALLBACK = { lat: -31.4201, lng: -64.1888 };

/**
 * Nodos de ejemplo. Se ubican en relación a donde esté el usuario
 * (rumbo + distancia fijos) para que la demo funcione en cualquier ciudad
 * y las posiciones no salten entre renders.
 */
const SEMILLA_NODOS = [
  { id: "A1043", alias: "Centro Vecinal", rumbo: 38, metros: 120, señal: 5, precioTexto: "USD 0,60 / 500MB", host: "Familia Gómez", cobertura: 90 },
  { id: "B2210", alias: "Plaza del Barrio", rumbo: 215, metros: 240, señal: 4, precioTexto: "USD 0,60 / 500MB", host: "Club Social", cobertura: 110 },
  { id: "C0871", alias: "Almacén Don José", rumbo: 305, metros: 380, señal: 3, precioTexto: "USD 0,50 / 500MB", host: "Almacén Don José", cobertura: 70 },
  { id: "D5566", alias: "Escuela N.º 12", rumbo: 128, metros: 520, señal: 2, precioTexto: "USD 0,50 / 500MB", host: "Cooperadora", cobertura: 120 },
];

/** Simula la latencia de una consulta al backend. */
const demora = (ms) => new Promise((r) => setTimeout(r, ms));

export async function buscarNodosCercanos({ lat, lng, radioMetros = 600 }) {
  await demora(450);
  const origen = { lat, lng };
  return SEMILLA_NODOS.map((n) => {
    const pos = desplazar(origen, n.metros, n.rumbo);
    return { ...n, lat: pos.lat, lng: pos.lng, distancia: distanciaEnMetros(origen, pos) };
  })
    .filter((n) => n.distancia <= radioMetros)
    .sort((a, b) => a.distancia - b.distancia);
}

export async function obtenerCuenta() {
  await demora(300);
  return { saldoUSD: 3.4, plan: "Prepago" };
}

export const PAQUETES = [
  { id: "s", nombre: "500 MB", precio: "USD 0,60", detalle: "Ideal para mensajería y redes" },
  { id: "m", nombre: "1 GB", precio: "USD 1,00", detalle: "Navegación + streaming liviano", featured: true },
  { id: "l", nombre: "3 GB", precio: "USD 2,50", detalle: "Uso intensivo del día" },
];

export async function obtenerHistorialConexiones() {
  await demora(380);
  return [
    { fecha: "27 ago", nodo: "Centro Vecinal", mb: 420, costo: "USD 0,50" },
    { fecha: "24 ago", nodo: "Plaza del Barrio", mb: 890, costo: "USD 1,00" },
    { fecha: "19 ago", nodo: "Centro Vecinal", mb: 310, costo: "USD 0,40" },
  ];
}
