import { createContext, useContext, useEffect, useRef, useState } from "react";
import { W7Logo, Wordmark } from "./Brand.jsx";
import { BarrasSeñal } from "./Conexion.jsx";
import { useConexion } from "../hooks/useConexion.js";

// La señal que muestra el portal es la conexión real del dispositivo.
const ConexionCtx = createContext(null);

function CommunityPanel() {
  return (
    <div className="w7-panel">
      <div className="w7-panel-eyebrow">Panel de publicidad y comunidad W-7</div>
      <div className="w7-panel-body">
        <svg width="58" height="58" viewBox="0 0 58 58" style={{ borderRadius: 12, flexShrink: 0 }}>
          <rect width="58" height="58" rx="12" fill="#17A5AE" />
          <circle cx="20" cy="24" r="7" fill="#CDEFF2" />
          <circle cx="34" cy="22" r="9" fill="#8FDCE2" />
          <path d="M8 46c2-9 9-13 21-13s19 4 21 13" fill="#0E8791" />
        </svg>
        <div>
          <div className="w7-panel-title">Visitá nuestra nueva plaza comunitaria</div>
          <div className="w7-panel-sub">Evento W-7 · este fin de semana</div>
        </div>
      </div>
    </div>
  );
}

function PortalFooter() {
  const conexion = useContext(ConexionCtx);
  return (
    <footer className="w7-footer">
      <div className="w7-footer-inner">
        <button className="w7-link">Términos y Condiciones</button>
        <div className={`w7-signal ${conexion.online ? "" : "is-offline"}`}>
          <BarrasSeñal nivel={conexion.calidad.nivel} etiqueta={conexion.calidad.etiqueta} />
          <span>Señal: {conexion.calidad.etiqueta}</span>
        </div>
      </div>
    </footer>
  );
}

function ScreenHeader({ title, onBack }) {
  return (
    <div className="w7-screen-header">
      <button className="w7-back" onClick={onBack} aria-label="Volver">‹</button>
      <span>{title}</span>
    </div>
  );
}

function Btn({ variant = "primary", children, ...props }) {
  return (
    <button className={`w7-btn w7-btn-${variant}`} {...props}>
      {children}
    </button>
  );
}

function PaymentOptionsPanel() {
  return (
    <div className="w7-payment-panel">
      <div className="w7-payment-header">
        <span className="w7-payment-title">Mantenimiento en la red</span>
        <button className="w7-payment-link">Otras formas de pago</button>
      </div>

      <button className="w7-pay-method w7-pay-method-paypal" type="button">
        <span className="w7-pay-icon">P</span>
        <span>Pagar con PayPal</span>
      </button>

      <div className="w7-price-row">
        <div className="w7-price-amount">
          <span className="w7-price-value">USD 3.50</span>
          <span className="w7-price-caption">mantenimiento de la red</span>
        </div>
        <button className="w7-price-cta" type="button">Pagar con Mercado Pago</button>
      </div>

      <div className="w7-payment-footer">Otras formas de pago</div>
    </div>
  );
}

function WelcomeScreen({ go }) {
  return (
    <div className="w7-screen">
      <div className="w7-content">
        <div className="w7-brand-block w7-brand-block-welcome">
          <Wordmark size={132} pulsing />
        </div>
        <p className="w7-welcome-text">¡Bienvenido a la red solidaria W-7!</p>
        <div className="w7-btn-stack">
          <Btn variant="primary" onClick={() => go("connecting")}>Conectarme a Internet</Btn>
          <Btn variant="secondary" onClick={() => go("whatsapp-phone")}>Conectarme con WhatsApp</Btn>
          <Btn variant="secondary" onClick={() => go("cell-phone")}>Validar con mi Celular</Btn>
        </div>

        <PaymentOptionsPanel />
        <CommunityPanel />
      </div>
    </div>
  );
}

function PhoneEntryScreen({ title, buttonLabel, hint, onBack, onSubmit }) {
  const [phone, setPhone] = useState("");
  const valid = phone.replace(/\D/g, "").length >= 8;
  return (
    <div className="w7-screen">
      <ScreenHeader title={title} onBack={onBack} />
      <div className="w7-content">
        <W7Logo size={52} />
        <p className="w7-step-copy">{hint}</p>
        <label className="w7-field">
          <span className="w7-field-label">Número de celular</span>
          <div className="w7-field-input">
            <span className="w7-prefix">+54</span>
            <input inputMode="numeric" placeholder="351 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </label>
        <div className="w7-btn-stack" style={{ marginTop: "auto" }}>
          <Btn variant="primary" disabled={!valid} onClick={() => onSubmit(phone)}>{buttonLabel}</Btn>
        </div>
      </div>
    </div>
  );
}

function OtpScreen({ title, phone, onBack, onVerified }) {
  const [digits, setDigits] = useState(["", "", "", ""]);
  const refs = [useRef(), useRef(), useRef(), useRef()];
  const complete = digits.every((d) => d !== "");
  const setDigit = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    if (val && i < 3) refs[i + 1].current?.focus();
  };
  return (
    <div className="w7-screen">
      <ScreenHeader title={title} onBack={onBack} />
      <div className="w7-content">
        <W7Logo size={52} />
        <p className="w7-step-copy">
          Ingresá el código de 4 dígitos que enviamos a <strong>+54 {phone || "351 123 4567"}</strong>
        </p>
        <div className="w7-otp-row">
          {digits.map((d, i) => (
            <input key={i} ref={refs[i]} className="w7-otp-box" inputMode="numeric" maxLength={1} value={d} onChange={(e) => setDigit(i, e.target.value)} />
          ))}
        </div>
        <button className="w7-link" style={{ marginTop: 14 }}>Reenviar código</button>
        <div className="w7-btn-stack" style={{ marginTop: "auto" }}>
          <Btn variant="primary" disabled={!complete} onClick={onVerified}>Validar</Btn>
        </div>
      </div>
    </div>
  );
}

function ConnectingScreen({ onDone }) {
  const conexion = useContext(ConexionCtx);
  useEffect(() => {
    const t = setTimeout(onDone, 1400);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="w7-screen">
      <div className="w7-content" style={{ alignItems: "center" }}>
        <W7Logo pulsing size={64} />
        <p className="w7-connecting-text">Conectando a la red W-7…</p>
        <div className="w7-loadbar"><div className="w7-loadbar-fill" /></div>
        <p className="w7-connecting-meta">
          {conexion.latenciaMs != null
            ? `Latencia medida: ${conexion.latenciaMs} ms · ${conexion.calidad.etiqueta}`
            : "Midiendo la calidad del enlace…"}
        </p>
      </div>
    </div>
  );
}

function ConnectedScreen({ onDisconnect }) {
  return (
    <div className="w7-screen">
      <div className="w7-content">
        <div className="w7-brand-block">
          <W7Logo size={60} />
          <div style={{ height: 10 }} />
          <div className="w7-connected-badge">● Estás conectado</div>
        </div>
        <div className="w7-stats-card">
          <div className="w7-stat">
            <span className="w7-stat-value">128&nbsp;MB</span>
            <span className="w7-stat-label">Usados esta sesión</span>
          </div>
          <div className="w7-stat-divider" />
          <div className="w7-stat">
            <span className="w7-stat-value">00:04:12</span>
            <span className="w7-stat-label">Tiempo conectado</span>
          </div>
        </div>
        <CommunityPanel />
        <div className="w7-btn-stack" style={{ marginTop: 18 }}>
          <Btn variant="ghost" onClick={onDisconnect}>Desconectar</Btn>
        </div>
      </div>
    </div>
  );
}

export default function CaptivePortal() {
  const conexion = useConexion();
  const [screen, setScreen] = useState("welcome");
  const [phone, setPhone] = useState("");
  const go = (next) => setScreen(next);

  let body;
  switch (screen) {
    case "whatsapp-phone":
      body = <PhoneEntryScreen title="Conectarme con WhatsApp" buttonLabel="Enviar código por WhatsApp"
        hint="Te vamos a enviar un código de acceso por WhatsApp para validar tu conexión."
        onBack={() => go("welcome")} onSubmit={(p) => { setPhone(p); go("whatsapp-otp"); }} />;
      break;
    case "whatsapp-otp":
      body = <OtpScreen title="Validar WhatsApp" phone={phone} onBack={() => go("whatsapp-phone")} onVerified={() => go("connecting")} />;
      break;
    case "cell-phone":
      body = <PhoneEntryScreen title="Validar con mi Celular" buttonLabel="Enviar código SMS"
        hint="Validamos tu línea con un SMS para habilitar el acceso a la red solidaria."
        onBack={() => go("welcome")} onSubmit={(p) => { setPhone(p); go("cell-otp"); }} />;
      break;
    case "cell-otp":
      body = <OtpScreen title="Validar Celular" phone={phone} onBack={() => go("cell-phone")} onVerified={() => go("connecting")} />;
      break;
    case "connecting":
      body = <ConnectingScreen onDone={() => go("connected")} />;
      break;
    case "connected":
      body = <ConnectedScreen onDisconnect={() => go("welcome")} />;
      break;
    default:
      body = <WelcomeScreen go={go} />;
  }

  return (
    <ConexionCtx.Provider value={conexion}>
      <div className="w7-portal">
        <main className="w7-portal-body" key={screen}>{body}</main>
        <PortalFooter />
      </div>
    </ConexionCtx.Provider>
  );
}
