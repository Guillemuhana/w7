import { lazy, Suspense, useEffect, useState } from "react";
import { W7Logo } from "./Brand.jsx";
import { BarrasSeñal, ChipConexion, AvisoUbicacion } from "./Conexion.jsx";
import { useGeolocalizacion } from "../hooks/useGeolocalizacion.js";
import { useConexion } from "../hooks/useConexion.js";
import { buscarNodosCercanos, obtenerCuenta, obtenerHistorialConexiones, PAQUETES } from "../lib/demoBackend.js";
import { formatearDistancia } from "../lib/geo.js";

// MapLibre pesa bastante: se carga recién cuando hace falta.
const MapaRed = lazy(() => import("./MapaRed.jsx"));

const RADIO_BUSQUEDA_M = 600;

export default function ClientDashboard() {
  const geo = useGeolocalizacion();
  const conexion = useConexion();

  const [cuenta, setCuenta] = useState(null);
  const [nodos, setNodos] = useState([]);
  const [cargandoNodos, setCargandoNodos] = useState(true);
  const [seleccionado, setSeleccionado] = useState(null);
  const [historial, setHistorial] = useState([]);

  useEffect(() => {
    let activo = true;
    obtenerCuenta().then((c) => activo && setCuenta(c));
    obtenerHistorialConexiones().then((h) => activo && setHistorial(h));
    return () => { activo = false; };
  }, []);

  // Los nodos dependen de dónde esté el usuario.
  useEffect(() => {
    if (!geo.coords) return;
    let activo = true;
    setCargandoNodos(true);
    buscarNodosCercanos({ ...geo.coords, radioMetros: RADIO_BUSQUEDA_M }).then((res) => {
      if (!activo) return;
      setNodos(res);
      setSeleccionado((actual) => (res.some((n) => n.id === actual) ? actual : res[0]?.id ?? null));
      setCargandoNodos(false);
    });
    return () => { activo = false; };
    // sólo re-consultamos si el usuario se movió de verdad
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.coords?.lat?.toFixed(4), geo.coords?.lng?.toFixed(4)]);

  const subtitulo = geo.esReal
    ? `Ubicación detectada · ${geo.coords.lat.toFixed(4)}, ${geo.coords.lng.toFixed(4)}`
    : "Ubicación de ejemplo";

  return (
    <div className="w7-page">
      <header className="w7-page-header">
        <div className="w7-page-title-block">
          <W7Logo size={34} />
          <div>
            <h1 className="w7-page-title">Explorar redes W-7</h1>
            <span className="w7-page-sub">{subtitulo}</span>
          </div>
        </div>
        <div className="w7-header-aside">
          <ChipConexion conexion={conexion} detallado />
          <div className="w7-balance-chip">
            <span className="w7-balance-label">Saldo</span>
            <span className="w7-balance-value">
              {cuenta ? `USD ${cuenta.saldoUSD.toFixed(2)}` : "—"}
            </span>
          </div>
        </div>
      </header>

      <AvisoUbicacion geo={geo} />

      <section className="w7-grid w7-grid-split">
        <div className="w7-card">
          <div className="w7-card-header">
            <h2>Redes cercanas</h2>
            <span className="w7-card-sub">
              {cargandoNodos
                ? "Buscando nodos alrededor tuyo…"
                : `${nodos.length} ${nodos.length === 1 ? "nodo disponible" : "nodos disponibles"} a menos de ${RADIO_BUSQUEDA_M} m`}
            </span>
          </div>

          <div className="w7-node-list">
            {cargandoNodos
              ? [0, 1, 2].map((i) => <div key={i} className="w7-skeleton w7-skeleton-node" />)
              : nodos.map((n) => (
                  <button
                    key={n.id}
                    className={`w7-node-card ${seleccionado === n.id ? "is-selected" : ""}`}
                    onClick={() => setSeleccionado(n.id)}
                  >
                    <div className="w7-node-main">
                      <span className="w7-node-alias">{n.alias}</span>
                      <span className="w7-node-meta">
                        {formatearDistancia(n.distancia)} · {n.precioTexto}
                      </span>
                    </div>
                    <BarrasSeñal nivel={n.señal} />
                  </button>
                ))}
          </div>

          <button
            className="w7-btn w7-btn-primary"
            style={{ width: "100%", marginTop: 14 }}
            disabled={!seleccionado || !conexion.online}
          >
            {conexion.online ? "Conectarme al nodo seleccionado" : "Sin conexión"}
          </button>
        </div>

        <div className="w7-card w7-card-dark w7-card-mapa">
          <div className="w7-card-header w7-card-header-dark">
            <h2>Vista de red</h2>
            <span className="w7-card-sub w7-card-sub-dark">
              {geo.esReal ? "Geolocalización real del dispositivo" : "Zona de ejemplo · sin permiso de ubicación"}
            </span>
          </div>

          {geo.coords ? (
            <Suspense fallback={<div className="w7-skeleton w7-skeleton-mapa" />}>
              <MapaRed
                centro={geo.coords}
                nodos={nodos}
                seleccionado={seleccionado}
                onSeleccionar={setSeleccionado}
                precision={geo.esReal ? geo.precision : null}
              />
            </Suspense>
          ) : (
            <div className="w7-skeleton w7-skeleton-mapa" />
          )}

          <p className="w7-dark-note" style={{ textAlign: "center" }}>
            El punto azul sos vos. Tocá un nodo para ver su área de cobertura.
          </p>
        </div>
      </section>

      <section className="w7-card">
        <div className="w7-card-header">
          <h2>Comprar datos</h2>
          <span className="w7-card-sub">Se descuentan de tu saldo al conectarte</span>
        </div>
        <div className="w7-pricing-row">
          {PAQUETES.map((p) => (
            <div key={p.id} className={`w7-pricing-card ${p.featured ? "is-featured" : ""}`}>
              {p.featured && <span className="w7-pricing-tag">Más elegido</span>}
              <div className="w7-pricing-name">{p.nombre}</div>
              <div className="w7-pricing-price">{p.precio}</div>
              <div className="w7-pricing-detail">{p.detalle}</div>
              <button
                className={`w7-btn ${p.featured ? "w7-btn-primary" : "w7-btn-secondary"}`}
                style={{ width: "100%", marginTop: 12 }}
              >
                Comprar
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="w7-card">
        <div className="w7-card-header">
          <h2>Historial de conexiones</h2>
          <span className="w7-card-sub">Últimas sesiones</span>
        </div>
        <table className="w7-table">
          <thead>
            <tr><th>Fecha</th><th>Nodo</th><th>Consumo</th><th>Costo</th></tr>
          </thead>
          <tbody>
            {historial.map((h, i) => (
              <tr key={i}>
                <td>{h.fecha}</td>
                <td>{h.nodo}</td>
                <td>{h.mb} MB</td>
                <td>{h.costo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
