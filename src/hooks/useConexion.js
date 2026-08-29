import { useEffect, useRef, useState } from "react";

const NIVELES = [
  { nivel: 5, etiqueta: "Excelente", maxMs: 80 },
  { nivel: 4, etiqueta: "Muy buena", maxMs: 150 },
  { nivel: 3, etiqueta: "Buena", maxMs: 300 },
  { nivel: 2, etiqueta: "Regular", maxMs: 600 },
  { nivel: 1, etiqueta: "Débil", maxMs: Infinity },
];

const clasificar = (ms) => NIVELES.find((n) => ms <= n.maxMs);

const mediana = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

/**
 * Estado real de la conexión del dispositivo.
 *
 * Combina tres fuentes:
 *  - `navigator.onLine` y los eventos online/offline.
 *  - la Network Information API (`navigator.connection`), donde exista:
 *    tipo de red, ancho de banda estimado y ahorro de datos.
 *  - una medición propia de latencia: pide un recurso chico del mismo
 *    origen cada `intervaloMs` y se queda con la mediana de las últimas
 *    muestras, que es lo que termina definiendo la calidad de señal.
 */
export function useConexion({ intervaloMs = 6000, muestras = 5 } = {}) {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [latenciaMs, setLatenciaMs] = useState(null);
  const [red, setRed] = useState(() => leerNetworkInfo());
  const historial = useRef([]);

  // online / offline
  useEffect(() => {
    const arriba = () => setOnline(true);
    const abajo = () => {
      setOnline(false);
      historial.current = [];
      setLatenciaMs(null);
    };
    window.addEventListener("online", arriba);
    window.addEventListener("offline", abajo);
    return () => {
      window.removeEventListener("online", arriba);
      window.removeEventListener("offline", abajo);
    };
  }, []);

  // Network Information API (Chrome / Android; en otros navegadores no existe)
  useEffect(() => {
    const c = navigator.connection;
    if (!c) return;
    const alCambiar = () => setRed(leerNetworkInfo());
    c.addEventListener("change", alCambiar);
    return () => c.removeEventListener("change", alCambiar);
  }, []);

  // sonda de latencia contra el mismo origen
  useEffect(() => {
    let activo = true;
    let timer;

    async function medir() {
      if (!activo) return;
      if (!navigator.onLine) {
        timer = setTimeout(medir, intervaloMs);
        return;
      }
      const t0 = performance.now();
      try {
        await fetch(`/favicon.svg?ping=${Date.now()}`, { cache: "no-store" });
        if (!activo) return;
        const ms = performance.now() - t0;
        historial.current = [...historial.current, ms].slice(-muestras);
        setLatenciaMs(Math.round(mediana(historial.current)));
      } catch {
        if (activo) setLatenciaMs(null);
      }
      if (activo) timer = setTimeout(medir, intervaloMs);
    }

    medir();
    return () => {
      activo = false;
      clearTimeout(timer);
    };
  }, [intervaloMs, muestras]);

  const midiendo = online && latenciaMs == null;
  const calidad = !online
    ? { nivel: 0, etiqueta: "Sin conexión" }
    : latenciaMs == null
      ? { nivel: 0, etiqueta: "Midiendo…" }
      : clasificar(latenciaMs);

  return { online, latenciaMs, midiendo, calidad, ...red };
}

function leerNetworkInfo() {
  const c = navigator.connection;
  if (!c) return { tipoRed: null, anchoBandaMbps: null, ahorroDatos: false };
  return {
    tipoRed: c.effectiveType ?? null,
    anchoBandaMbps: typeof c.downlink === "number" ? c.downlink : null,
    ahorroDatos: Boolean(c.saveData),
  };
}
