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
 * Modelo comercial: una sola suscripción mensual. El usuario paga y queda
 * activo por 30 días; con el estado activo entra a cualquier nodo W-7 del
 * país, esté hoy en Viedma y mañana en Córdoba. No hay paquetes de datos ni
 * saldo que se descuente: sólo "activo" o "inactivo".
 */
export const PRECIO_MENSUAL_USD = 3.5;
export const DIAS_SUSCRIPCION = 30;

/**
 * Nodos de ejemplo. Se ubican en relación a donde esté el usuario
 * (rumbo + distancia fijos) para que la demo funcione en cualquier ciudad
 * y las posiciones no salten entre renders.
 */
const SEMILLA_NODOS = [
  { id: "A1043", alias: "Centro Vecinal", rumbo: 38, metros: 120, señal: 5, host: "Familia Gómez", cobertura: 90 },
  { id: "B2210", alias: "Plaza del Barrio", rumbo: 215, metros: 240, señal: 4, host: "Club Social", cobertura: 110 },
  { id: "C0871", alias: "Almacén Don José", rumbo: 305, metros: 380, señal: 3, host: "Almacén Don José", cobertura: 70 },
  { id: "D5566", alias: "Escuela N.º 12", rumbo: 128, metros: 520, señal: 2, host: "Cooperadora", cobertura: 120 },
];

/** Billeteras virtuales habilitadas para cobrar la suscripción. */
export const BILLETERAS = [
  { id: "mercadopago", nombre: "Mercado Pago", sigla: "MP", color: "#00A6E0" },
  { id: "uala", nombre: "Ualá", sigla: "U", color: "#F04E23" },
  { id: "modo", nombre: "MODO", sigla: "M", color: "#1B1B3A" },
  { id: "naranjax", nombre: "Naranja X", sigla: "NX", color: "#F25C05" },
  { id: "personalpay", nombre: "Personal Pay", sigla: "PP", color: "#6A2C91" },
  { id: "brubank", nombre: "Brubank", sigla: "B", color: "#7B3FF2" },
  { id: "binance", nombre: "Binance Pay", sigla: "BP", color: "#F0B90B" },
  { id: "usdt", nombre: "USDT (cripto)", sigla: "₮", color: "#26A17B" },
];

/** Simula la latencia de una consulta al backend. */
const demora = (ms) => new Promise((r) => setTimeout(r, ms));

const FORMATO_FECHA = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" });

function sumarDias(fecha, dias) {
  const d = new Date(fecha);
  d.setDate(d.getDate() + dias);
  return d;
}

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

/**
 * Estado de la suscripción del usuario.
 *
 * `activacion` es el registro de dónde se activó el mes en curso: lo
 * guardamos por trazabilidad (qué nodo y qué zona originó el alta), no para
 * limitar el acceso. En el backend ese registro va cifrado.
 */
export async function obtenerSuscripcion() {
  await demora(300);
  const desde = sumarDias(new Date(), -4);
  const vence = sumarDias(desde, DIAS_SUSCRIPCION);
  return {
    estado: "activa",
    precioMensualUSD: PRECIO_MENSUAL_USD,
    vence: FORMATO_FECHA.format(vence),
    diasRestantes: Math.ceil((vence - new Date()) / 86400000),
    activacion: {
      fecha: FORMATO_FECHA.format(desde),
      nodo: "Centro Vecinal",
      zona: "Viedma, Río Negro",
      coords: { lat: -40.8287, lng: -63.0214 },
      billetera: "Mercado Pago",
    },
  };
}

/**
 * Cobra el mes por la billetera elegida y deja al usuario activo.
 * Devuelve la suscripción ya actualizada, con el registro de activación
 * (nodo + coordenadas desde donde se pagó).
 */
export async function activarSuscripcion({ billeteraId, coords, nodo }) {
  await demora(1200);
  const billetera = BILLETERAS.find((b) => b.id === billeteraId);
  const hoy = new Date();
  const vence = sumarDias(hoy, DIAS_SUSCRIPCION);
  return {
    estado: "activa",
    precioMensualUSD: PRECIO_MENSUAL_USD,
    vence: FORMATO_FECHA.format(vence),
    diasRestantes: DIAS_SUSCRIPCION,
    activacion: {
      fecha: FORMATO_FECHA.format(hoy),
      nodo: nodo?.alias ?? "Sin nodo",
      zona: coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : "Zona no informada",
      coords: coords ?? null,
      billetera: billetera?.nombre ?? "Billetera virtual",
    },
  };
}

/** Historial de sesiones: sin costo por sesión, todo entra en el mes pago. */
export async function obtenerHistorialConexiones() {
  await demora(380);
  return [
    { fecha: "27 ago", nodo: "Centro Vecinal", zona: "Viedma, Río Negro", mb: 420 },
    { fecha: "24 ago", nodo: "Plaza del Barrio", zona: "Viedma, Río Negro", mb: 890 },
    { fecha: "19 ago", nodo: "Escuela N.º 12", zona: "Córdoba Capital", mb: 310 },
  ];
}
