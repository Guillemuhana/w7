import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { W7Logo } from "./Brand.jsx";
import { BarrasSeñal, ChipConexion, AvisoUbicacion } from "./Conexion.jsx";
import { useGeolocalizacion } from "../hooks/useGeolocalizacion.js";
import { useConexion } from "../hooks/useConexion.js";
import {
  activarSuscripcion,
  buscarNodosCercanos,
  obtenerHistorialConexiones,
  obtenerSuscripcion,
  BILLETERAS,
  PRECIO_MENSUAL_USD,
} from "../lib/demoBackend.js";
import { formatearDistancia } from "../lib/geo.js";

// MapLibre pesa bastante: se carga recién cuando hace falta.
const MapaRed = lazy(() => import("./MapaRed.jsx"));

const RADIO_BUSQUEDA_M = 600;
const PRECIO_TEXTO = `USD ${PRECIO_MENSUAL_USD.toFixed(2).replace(".", ",")}`;

const INCLUYE = [
  "Todos los nodos W-7 del país, sin límite de cuál usás",
  "Cambiás de ciudad y seguís conectado con el mismo mes pago",
  "Sin descuento por MB: el consumo no te resta saldo",
];

function ChipSuscripcion({ suscripcion, onActivar }) {
  if (!suscripcion) {
    return (
      <div className="w7-plan-chip">
        <span className="w7-plan-chip-label">Estado</span>
        <span className="w7-plan-chip-value">—</span>
      </div>
    );
  }

  if (suscripcion.estado === "activa") {
    return (
      <div className="w7-plan-chip is-activa">
        <span className="w7-plan-chip-label">Estado</span>
        <span className="w7-plan-chip-value">● Usuario activo</span>
        <span className="w7-plan-chip-note">vence el {suscripcion.vence}</span>
      </div>
    );
  }

  return (
    <button className="w7-plan-chip is-inactiva" onClick={onActivar}>
      <span className="w7-plan-chip-label">Usuario inactivo</span>
      <span className="w7-plan-chip-value">Pagar {PRECIO_TEXTO} para activar</span>
    </button>
  );
}

function SelectorBilleteras({ elegida, onElegir, deshabilitado }) {
  return (
    <div className="w7-wallet-grid">
      {BILLETERAS.map((b) => (
        <button
          key={b.id}
          className={`w7-wallet ${elegida === b.id ? "is-selected" : ""}`}
          onClick={() => onElegir(b.id)}
          disabled={deshabilitado}
        >
          <span className="w7-wallet-logo" style={{ background: b.color }}>{b.sigla}</span>
          <span className="w7-wallet-name">{b.nombre}</span>
        </button>
      ))}
    </div>
  );
}

export default function ClientDashboard() {
  const geo = useGeolocalizacion();
  const conexion = useConexion();

  const [suscripcion, setSuscripcion] = useState(null);
  const [nodos, setNodos] = useState([]);
  const [cargandoNodos, setCargandoNodos] = useState(true);
  const [seleccionado, setSeleccionado] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [billetera, setBilletera] = useState(BILLETERAS[0].id);
  const [pagando, setPagando] = useState(false);
  const refPlan = useRef(null);

  useEffect(() => {
    let activo = true;
    obtenerSuscripcion().then((s) => activo && setSuscripcion(s));
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

  const activa = suscripcion?.estado === "activa";
  const nodoActual = nodos.find((n) => n.id === seleccionado) ?? null;

  const irAlPlan = () => refPlan.current?.scrollIntoView({ behavior: "smooth", block: "center" });

  // El pago deja registro de dónde se activó: nodo + coordenadas del momento.
  const pagarMes = async () => {
    setPagando(true);
    const nueva = await activarSuscripcion({
      billeteraId: billetera,
      coords: geo.coords,
      nodo: nodoActual,
    });
    setSuscripcion(nueva);
    setPagando(false);
  };

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
          <ChipSuscripcion suscripcion={suscripcion} onActivar={irAlPlan} />
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
                        {formatearDistancia(n.distancia)} · {activa ? "Incluido en tu mes" : "Requiere estado activo"}
                      </span>
                    </div>
                    <BarrasSeñal nivel={n.señal} />
                  </button>
                ))}
          </div>

          <button
            className="w7-btn w7-btn-primary"
            style={{ width: "100%", marginTop: 14 }}
            disabled={!seleccionado || !conexion.online || !activa}
          >
            {!conexion.online
              ? "Sin conexión"
              : activa
                ? "Conectarme al nodo seleccionado"
                : `Activá tu mes por ${PRECIO_TEXTO}`}
          </button>
          {!activa && suscripcion && (
            <button className="w7-link" style={{ marginTop: 10 }} onClick={irAlPlan}>
              Ver cómo activar
            </button>
          )}
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

      <section className="w7-grid w7-grid-split" ref={refPlan}>
        <div className="w7-card">
          <div className="w7-card-header">
            <h2>Tu acceso W-7</h2>
            <span className="w7-card-sub">
              {PRECIO_TEXTO} por mes · un solo pago para toda la red, en cualquier ciudad
            </span>
          </div>

          {!suscripcion ? (
            <div className="w7-skeleton w7-skeleton-node" />
          ) : (
            <>
              <div className={`w7-plan-state ${activa ? "is-activa" : "is-inactiva"}`}>
                <div>
                  <div className="w7-plan-state-title">
                    {activa ? "● Usuario activo" : "● Usuario inactivo"}
                  </div>
                  <div className="w7-plan-state-note">
                    {activa
                      ? `Vence el ${suscripcion.vence} · quedan ${suscripcion.diasRestantes} días`
                      : "Activá el mes para entrar a cualquier nodo de la red"}
                  </div>
                </div>
                <div className="w7-plan-price">
                  {PRECIO_TEXTO}
                  <span>/mes</span>
                </div>
              </div>

              <ul className="w7-plan-benefits">
                {INCLUYE.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>

              {activa ? (
                <>
                  <div className="w7-plan-record">
                    <span className="w7-plan-record-label">Registro de activación</span>
                    <span className="w7-plan-record-value">
                      {suscripcion.activacion.fecha} · {suscripcion.activacion.zona}
                    </span>
                    <span className="w7-plan-record-note">
                      Nodo {suscripcion.activacion.nodo} · pago por {suscripcion.activacion.billetera} · guardado cifrado
                    </span>
                  </div>
                  <button
                    className="w7-btn w7-btn-secondary"
                    style={{ width: "100%", marginTop: 12 }}
                    onClick={() => setSuscripcion({ ...suscripcion, estado: "inactiva" })}
                  >
                    Simular vencimiento (demo)
                  </button>
                </>
              ) : (
                <>
                  <div className="w7-plan-subtitle">Pagá con tu billetera virtual</div>
                  <SelectorBilleteras elegida={billetera} onElegir={setBilletera} deshabilitado={pagando} />
                  <button
                    className="w7-btn w7-btn-primary"
                    style={{ width: "100%", marginTop: 14 }}
                    onClick={pagarMes}
                    disabled={pagando}
                  >
                    {pagando ? "Confirmando el pago…" : `Pagar ${PRECIO_TEXTO} y activarme`}
                  </button>
                  <p className="w7-plan-fineprint">
                    El cobro lo procesa la billetera: W-7 no guarda datos de tarjeta ni de cuenta.
                  </p>
                </>
              )}
            </>
          )}
        </div>

        <div className="w7-card w7-card-dark">
          <div className="w7-card-header w7-card-header-dark">
            <h2>Seguridad y privacidad</h2>
            <span className="w7-card-sub w7-card-sub-dark">Qué se guarda y cómo</span>
          </div>
          <ul className="w7-sec-list">
            <li>
              <strong>Sesión cifrada.</strong> El tráfico entre tu equipo y el nodo va por WPA2/WPA3 y
              sale por un túnel TLS: el host no ve lo que navegás.
            </li>
            <li>
              <strong>Pago tokenizado.</strong> La billetera devuelve un token de la operación; W-7
              nunca recibe ni almacena tus credenciales de pago.
            </li>
            <li>
              <strong>Registro de activación cifrado.</strong> Guardamos dónde y en qué nodo se activó
              cada mes (AES-256 en reposo) para auditoría de la red. No limita dónde te conectás.
            </li>
            <li>
              <strong>Identidad mínima.</strong> Sólo el celular validado por OTP; sin datos de más.
            </li>
          </ul>
        </div>
      </section>

      <section className="w7-card">
        <div className="w7-card-header">
          <h2>Historial de conexiones</h2>
          <span className="w7-card-sub">Últimas sesiones · todas dentro del mes pago</span>
        </div>
        <table className="w7-table">
          <thead>
            <tr><th>Fecha</th><th>Nodo</th><th>Zona</th><th>Consumo</th></tr>
          </thead>
          <tbody>
            {historial.map((h, i) => (
              <tr key={i}>
                <td>{h.fecha}</td>
                <td>{h.nodo}</td>
                <td>{h.zona}</td>
                <td>{h.mb} MB</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
