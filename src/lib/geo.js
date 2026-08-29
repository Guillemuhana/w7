/** Utilidades geográficas (sin dependencias). */

const RADIO_TIERRA_M = 6371000;
const rad = (g) => (g * Math.PI) / 180;
const grados = (r) => (r * 180) / Math.PI;

/** Distancia en metros entre dos coordenadas (fórmula de haversine). */
export function distanciaEnMetros(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * RADIO_TIERRA_M * Math.asin(Math.sqrt(h));
}

/** Devuelve la coordenada resultante de moverse `metros` hacia `rumbo` (0° = norte). */
export function desplazar({ lat, lng }, metros, rumbo) {
  const d = metros / RADIO_TIERRA_M;
  const br = rad(rumbo);
  const lat1 = rad(lat);
  const lng1 = rad(lng);

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(br)
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(br) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
    );

  return { lat: grados(lat2), lng: ((grados(lng2) + 540) % 360) - 180 };
}

/** Polígono circular en GeoJSON, para dibujar el área de cobertura de un nodo. */
export function circuloGeoJSON(centro, radioMetros, pasos = 64) {
  const anillo = [];
  for (let i = 0; i <= pasos; i++) {
    const p = desplazar(centro, radioMetros, (i * 360) / pasos);
    anillo.push([p.lng, p.lat]);
  }
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "Polygon", coordinates: [anillo] },
  };
}

/** "180 m" / "1,2 km" */
export function formatearDistancia(metros) {
  if (metros == null) return "—";
  if (metros < 1000) return `${Math.round(metros)} m`;
  return `${(metros / 1000).toFixed(1).replace(".", ",")} km`;
}
