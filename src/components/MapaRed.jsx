import { useEffect, useRef, useState } from "react";
import { Map as MapLibreMap, Marker, NavigationControl, LngLatBounds, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
// MapLibre deduce la URL de su worker de `import.meta.url`, que apunta al
// chunk empaquetado y no al archivo del worker. Lo dejamos que lo empaquete
// Vite y le pasamos la URL resultante.
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { circuloGeoJSON } from "../lib/geo.js";

/**
 * Mapa real de los nodos W-7 alrededor del usuario.
 *
 * Se carga con `lazy()` desde el panel del cliente para que MapLibre no
 * entre en el bundle inicial.
 *
 * Usamos OpenFreeMap (tiles vectoriales, gratis y sin API key ni límite de
 * uso), así el deploy no necesita ninguna variable de entorno. "Positron"
 * es un estilo claro que combina con la paleta W-7.
 */
const ESTILO = "https://tiles.openfreemap.org/styles/positron";

setWorkerUrl(workerUrl);

const VACIO = { type: "FeatureCollection", features: [] };

export default function MapaRed({ centro, nodos = [], seleccionado, onSeleccionar, precision }) {
  const [falla, setFalla] = useState(null);
  const contenedor = useRef(null);
  const mapa = useRef(null);
  const marcadorUsuario = useRef(null);
  const marcadoresNodos = useRef([]);
  const yaEncuadro = useRef(false);
  const onSeleccionarRef = useRef(onSeleccionar);

  onSeleccionarRef.current = onSeleccionar;

  // --- creación del mapa (una sola vez) ---
  useEffect(() => {
    if (!contenedor.current) return;

    const m = new MapLibreMap({
      container: contenedor.current,
      style: ESTILO,
      center: [centro.lng, centro.lat],
      zoom: 15.5,
      attributionControl: { compact: true },
      cooperativeGestures: true,
    });
    m.addControl(new NavigationControl({ showCompass: false }), "top-right");
    mapa.current = m;
    // Si los tiles no cargan (red del cliente, bloqueo, etc.) mostramos un
    // aviso en vez de dejar un rectángulo gris sin explicación.
    m.on("error", (e) => setFalla(e?.error?.message ?? "No pudimos cargar el mapa"));

    m.on("load", () => {
      m.addSource("cobertura", { type: "geojson", data: VACIO });
      m.addLayer({
        id: "cobertura-fill",
        type: "fill",
        source: "cobertura",
        paint: { "fill-color": "#17A5AE", "fill-opacity": 0.14 },
      });
      m.addLayer({
        id: "cobertura-linea",
        type: "line",
        source: "cobertura",
        paint: { "line-color": "#17A5AE", "line-width": 2, "line-opacity": 0.55 },
      });
    });

    const el = document.createElement("div");
    el.className = "w7-marker-yo";
    el.innerHTML = '<span class="w7-marker-pulso"></span><span class="w7-marker-punto"></span>';
    marcadorUsuario.current = new Marker({ element: el })
      .setLngLat([centro.lng, centro.lat])
      .addTo(m);

    return () => {
      marcadoresNodos.current.forEach((mk) => mk.remove());
      marcadoresNodos.current = [];
      m.remove();
      mapa.current = null;
    };
    // el mapa se crea una vez; el centro se sigue en el efecto de abajo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- seguir la posición del usuario ---
  useEffect(() => {
    if (!mapa.current || !centro) return;
    marcadorUsuario.current?.setLngLat([centro.lng, centro.lat]);
  }, [centro]);

  // --- marcadores de nodos ---
  useEffect(() => {
    const m = mapa.current;
    if (!m) return;

    marcadoresNodos.current.forEach((mk) => mk.remove());
    marcadoresNodos.current = nodos.map((n) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = `w7-marker-nodo ${n.id === seleccionado ? "is-selected" : ""}`;
      el.setAttribute("aria-label", `Nodo ${n.alias}`);
      el.innerHTML = `<span class="w7-marker-nodo-punto"></span><span class="w7-marker-nodo-alias">${n.alias}</span>`;
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSeleccionarRef.current?.(n.id);
      });
      return new Marker({ element: el, anchor: "bottom" })
        .setLngLat([n.lng, n.lat])
        .addTo(m);
    });
  }, [nodos, seleccionado]);

  // --- área de cobertura del nodo elegido ---
  useEffect(() => {
    const m = mapa.current;
    if (!m) return;

    const pintar = () => {
      const fuente = m.getSource("cobertura");
      if (!fuente) return;
      const n = nodos.find((x) => x.id === seleccionado);
      fuente.setData(n ? circuloGeoJSON({ lat: n.lat, lng: n.lng }, n.cobertura) : VACIO);
    };

    if (m.isStyleLoaded()) pintar();
    else m.once("load", pintar);
  }, [nodos, seleccionado]);

  // --- encuadrar usuario + nodos la primera vez que llegan ---
  useEffect(() => {
    const m = mapa.current;
    if (!m || !nodos.length || yaEncuadro.current) return;
    const limites = new LngLatBounds([centro.lng, centro.lat], [centro.lng, centro.lat]);
    nodos.forEach((n) => limites.extend([n.lng, n.lat]));
    m.fitBounds(limites, { padding: 64, maxZoom: 16.5, duration: 900 });
    yaEncuadro.current = true;
  }, [nodos, centro]);

  return (
    <div className="w7-mapa">
      <div ref={contenedor} className="w7-mapa-lienzo" />
      {precision != null && !falla && (
        <div className="w7-mapa-precision">Precisión ±{Math.round(precision)} m</div>
      )}
      {falla && <div className="w7-mapa-error">{falla}</div>}
    </div>
  );
}
