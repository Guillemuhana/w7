import { useState } from "react";
import { W7Logo } from "./Brand.jsx";

const NODES = [
  { id: "A1043", alias: "Nueva Córdoba Centro", distancia: "40 m", señal: 5, precio: "USD 0,60 / 500MB" },
  { id: "B2210", alias: "Plaza San Martín", distancia: "180 m", señal: 4, precio: "USD 0,60 / 500MB" },
  { id: "C0871", alias: "Alto Alberdi Norte", distancia: "310 m", señal: 3, precio: "USD 0,50 / 500MB" },
];

const PACKAGES = [
  { id: "s", nombre: "500 MB", precio: "USD 0,60", detalle: "Ideal para mensajería y redes" },
  { id: "m", nombre: "1 GB", precio: "USD 1,00", detalle: "Navegación + streaming liviano", featured: true },
  { id: "l", nombre: "3 GB", precio: "USD 2,50", detalle: "Uso intensivo del día" },
];

const HISTORY = [
  { fecha: "27 ago", nodo: "Nueva Córdoba Centro", mb: 420, costo: "USD 0,50" },
  { fecha: "24 ago", nodo: "Plaza San Martín", mb: 890, costo: "USD 1,00" },
  { fecha: "19 ago", nodo: "Nueva Córdoba Centro", mb: 310, costo: "USD 0,40" },
];

function SignalBars({ level }) {
  return (
    <div className="w7-minibars" aria-label={`Señal ${level} de 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= level ? "on" : ""} style={{ height: 4 + i * 3 }} />
      ))}
    </div>
  );
}

function NetworkMap({ nodes, selected }) {
  const positions = [
    { x: 62, y: 40 }, { x: 22, y: 68 }, { x: 82, y: 74 },
  ];
  return (
    <svg viewBox="0 0 100 100" className="w7-map-svg">
      <defs>
        <radialGradient id="mapGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#17A5AE" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#17A5AE" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill="url(#mapGlow)" />
      <circle cx="50" cy="50" r="4.5" fill="#0A2A5C" stroke="#fff" strokeWidth="1.5" />
      <circle cx="50" cy="50" r="4.5" fill="none" stroke="#8FDCE2" strokeWidth="1">
        <animate attributeName="r" values="4.5;16;4.5" dur="2.8s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.7;0;0.7" dur="2.8s" repeatCount="indefinite" />
      </circle>
      {nodes.map((n, i) => (
        <g key={n.id} transform={`translate(${positions[i].x} ${positions[i].y})`}>
          <circle r={n.id === selected ? "6.5" : "5"} fill={n.id === selected ? "#17A5AE" : "#8FDCE2"} stroke="#fff" strokeWidth="1.4" />
        </g>
      ))}
    </svg>
  );
}

export default function ClientDashboard() {
  const [balance] = useState(3.4);
  const [selected, setSelected] = useState(NODES[0].id);

  return (
    <div className="w7-page">
      <header className="w7-page-header">
        <div className="w7-page-title-block">
          <W7Logo size={34} />
          <div>
            <h1 className="w7-page-title">Explorar redes W-7</h1>
            <span className="w7-page-sub">Nueva Córdoba, Córdoba</span>
          </div>
        </div>
        <div className="w7-balance-chip">
          <span className="w7-balance-label">Saldo</span>
          <span className="w7-balance-value">USD {balance.toFixed(2)}</span>
        </div>
      </header>

      <section className="w7-grid w7-grid-split">
        <div className="w7-card">
          <div className="w7-card-header">
            <h2>Redes cercanas</h2>
            <span className="w7-card-sub">3 nodos disponibles a menos de 400 m</span>
          </div>
          <div className="w7-node-list">
            {NODES.map((n) => (
              <button
                key={n.id}
                className={`w7-node-card ${selected === n.id ? "is-selected" : ""}`}
                onClick={() => setSelected(n.id)}
              >
                <div className="w7-node-main">
                  <span className="w7-node-alias">{n.alias}</span>
                  <span className="w7-node-meta">{n.distancia} · {n.precio}</span>
                </div>
                <SignalBars level={n.señal} />
              </button>
            ))}
          </div>
          <button className="w7-btn w7-btn-primary" style={{ width: "100%", marginTop: 14 }}>
            Conectarme al nodo seleccionado
          </button>
        </div>

        <div className="w7-card w7-card-dark">
          <div className="w7-card-header w7-card-header-dark">
            <h2>Vista de red</h2>
            <span className="w7-card-sub w7-card-sub-dark">Ilustrativa · no geolocaliza en esta demo</span>
          </div>
          <NetworkMap nodes={NODES} selected={selected} />
          <p className="w7-dark-note" style={{ textAlign: "center" }}>
            El punto central sos vos. Los puntos claros son nodos W-7 activos cerca tuyo.
          </p>
        </div>
      </section>

      <section className="w7-card">
        <div className="w7-card-header">
          <h2>Comprar datos</h2>
          <span className="w7-card-sub">Se descuentan de tu saldo al conectarte</span>
        </div>
        <div className="w7-pricing-row">
          {PACKAGES.map((p) => (
            <div key={p.id} className={`w7-pricing-card ${p.featured ? "is-featured" : ""}`}>
              {p.featured && <span className="w7-pricing-tag">Más elegido</span>}
              <div className="w7-pricing-name">{p.nombre}</div>
              <div className="w7-pricing-price">{p.precio}</div>
              <div className="w7-pricing-detail">{p.detalle}</div>
              <button className={`w7-btn ${p.featured ? "w7-btn-primary" : "w7-btn-secondary"}`} style={{ width: "100%", marginTop: 12 }}>
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
            {HISTORY.map((h, i) => (
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
