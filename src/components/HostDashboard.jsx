import { useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { W7Logo } from "./Brand.jsx";

const PAYOUT = 10;

const HISTORY = [
  { mes: "Mar", monto: 10, estado: "Pagado" },
  { mes: "Abr", monto: 10, estado: "Pagado" },
  { mes: "May", monto: 10, estado: "Pagado" },
  { mes: "Jun", monto: 10, estado: "Pagado" },
  { mes: "Jul", monto: 10, estado: "Pagado" },
  { mes: "Ago", monto: 10, estado: "Pendiente" },
];

function Gauge({ value, target }) {
  const r = 54;
  const c = 2 * Math.PI * r;
  const pct = Math.min(value / 50, 1); // visual scale, 50% = full ring
  const targetPct = Math.min(target / 50, 1);
  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      <circle cx="70" cy="70" r={r} fill="none" stroke="#1B3F72" strokeWidth="12" />
      <circle
        cx="70" cy="70" r={r} fill="none"
        stroke="#2A5B9E" strokeWidth="12"
        strokeDasharray={`${c} ${c}`}
        strokeDashoffset={c - targetPct * c}
        strokeLinecap="round"
        transform="rotate(-90 70 70)"
        opacity="0.5"
      />
      <circle
        cx="70" cy="70" r={r} fill="none"
        stroke="url(#gaugeGrad)" strokeWidth="12"
        strokeDasharray={`${c} ${c}`}
        strokeDashoffset={c - pct * c}
        strokeLinecap="round"
        transform="rotate(-90 70 70)"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      <text x="70" y="64" textAnchor="middle" fontFamily="Sora, sans-serif" fontWeight="800" fontSize="26" fill="#fff">
        {value}%
      </text>
      <text x="70" y="84" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="10.5" fill="#A9BEDC">
        objetivo {target}%
      </text>
      <defs>
        <linearGradient id="gaugeGrad" x1="0" y1="0" x2="140" y2="140">
          <stop stopColor="#2DBFC6" />
          <stop offset="1" stopColor="#0E8791" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function StatCard({ label, children, accent }) {
  return (
    <div className="w7-dcard">
      <div className="w7-dcard-label">{label}</div>
      {children}
      {accent && <div className="w7-dcard-accent">{accent}</div>}
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="w7-tooltip">
      <strong>{label}</strong>
      <div>USD {payload[0].value}</div>
    </div>
  );
}

export default function HostDashboard() {
  const [active, setActive] = useState(true);
  const [sharePct, setSharePct] = useState(30);
  const earned = HISTORY.filter((h) => h.estado === "Pagado").reduce((s, h) => s + h.monto, 0);

  return (
    <div className="w7-page">
      <header className="w7-page-header">
        <div className="w7-page-title-block">
          <W7Logo size={34} />
          <div>
            <h1 className="w7-page-title">Panel del Host</h1>
            <span className="w7-page-sub">Nodo #A1043 · Barrio Nueva Córdoba</span>
          </div>
        </div>
        <button
          className={`w7-pill ${active ? "w7-pill-on" : "w7-pill-off"}`}
          onClick={() => setActive((a) => !a)}
        >
          <span className="w7-pill-dot" />
          {active ? "Nodo activo" : "Nodo pausado"}
        </button>
      </header>

      <section className="w7-grid w7-grid-4">
        <StatCard label="Estado del nodo" accent={active ? "Compartiendo hace 42 días" : "Compartición pausada"}>
          <div className="w7-status-value" style={{ color: active ? "#0E8791" : "#B4302F" }}>
            {active ? "● Activo" : "● Inactivo"}
          </div>
        </StatCard>

        <StatCard label="Próximo pago">
          <div className="w7-status-value">USD {PAYOUT}</div>
          <div className="w7-dcard-note">se acredita el 5 de septiembre</div>
        </StatCard>

        <StatCard label="Ganado acumulado">
          <div className="w7-status-value">USD {earned}</div>
          <div className="w7-dcard-note">{HISTORY.filter(h => h.estado === "Pagado").length} pagos recibidos</div>
        </StatCard>

        <StatCard label="Referidos">
          <div className="w7-status-value">2 vecinos</div>
          <div className="w7-dcard-note">+USD 5 por cada uno activo</div>
        </StatCard>
      </section>

      <section className="w7-grid w7-grid-split">
        <div className="w7-card">
          <div className="w7-card-header">
            <h2>Historial de pagos</h2>
            <span className="w7-card-sub">Últimos 6 meses · USD {PAYOUT} fijos por nodo activo</span>
          </div>
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer>
              <BarChart data={HISTORY} margin={{ top: 8, right: 8, left: -6, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#EDF1F7" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#7C89A0" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#7C89A0" }} axisLine={false} tickLine={false} width={36} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "#E9EFF6" }} />
                <Bar dataKey="monto" radius={[6, 6, 0, 0]} fill="#17A5AE" maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <table className="w7-table">
            <thead>
              <tr><th>Mes</th><th>Monto</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {HISTORY.slice().reverse().map((h) => (
                <tr key={h.mes}>
                  <td>{h.mes} 2026</td>
                  <td>USD {h.monto}</td>
                  <td>
                    <span className={`w7-badge ${h.estado === "Pagado" ? "w7-badge-ok" : "w7-badge-pending"}`}>
                      {h.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="w7-card w7-card-dark">
          <div className="w7-card-header w7-card-header-dark">
            <h2>Compartición en vivo</h2>
            <span className="w7-card-sub w7-card-sub-dark">Meta comprometida: 30% de tu ancho de banda</span>
          </div>
          <div style={{ display: "flex", justifyContent: "center", padding: "6px 0 4px" }}>
            <Gauge value={active ? sharePct : 0} target={30} />
          </div>
          <label className="w7-slider-label">
            Ajustar % compartido
            <input
              type="range" min="10" max="50" value={sharePct}
              onChange={(e) => setSharePct(Number(e.target.value))}
              className="w7-slider"
              disabled={!active}
            />
          </label>
          <p className="w7-dark-note">
            Por debajo del 30% no se libera el pago del mes. Podés pausar el nodo en cualquier momento.
          </p>
          <button className="w7-btn w7-btn-primary" style={{ width: "100%", marginTop: 8 }}>
            Retirar saldo disponible
          </button>
        </div>
      </section>
    </div>
  );
}
