import { useCallback, useEffect, useRef, useState } from "react";
import { UBICACION_FALLBACK } from "../lib/demoBackend.js";

/**
 * Geolocalización real del dispositivo (Geolocation API).
 *
 * Sigue la posición con watchPosition, así el mapa se actualiza si el
 * usuario se mueve. Si el navegador no la soporta o se rechaza el permiso,
 * cae en una ubicación de ejemplo para que la demo siga siendo mostrable.
 *
 * Nota: los navegadores sólo entregan la posición en contextos seguros
 * (HTTPS o localhost). En Vercel eso está cubierto.
 */
export function useGeolocalizacion() {
  const [estado, setEstado] = useState("pidiendo"); // pidiendo | ok | denegado | error | no-soportado
  const [coords, setCoords] = useState(null);
  const [precision, setPrecision] = useState(null);
  const [intento, setIntento] = useState(0);
  const watchId = useRef(null);

  const reintentar = useCallback(() => setIntento((n) => n + 1), []);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setEstado("no-soportado");
      setCoords(UBICACION_FALLBACK);
      return;
    }

    setEstado("pidiendo");

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setPrecision(pos.coords.accuracy);
        setEstado("ok");
      },
      (err) => {
        setCoords(UBICACION_FALLBACK);
        setPrecision(null);
        setEstado(err.code === err.PERMISSION_DENIED ? "denegado" : "error");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );

    return () => {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, [intento]);

  return {
    coords,
    precision,
    estado,
    esReal: estado === "ok",
    reintentar,
  };
}
