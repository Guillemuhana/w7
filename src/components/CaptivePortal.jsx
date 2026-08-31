import { createContext, useContext, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { W7Logo } from "./Brand.jsx";
import { BarrasSeñal } from "./Conexion.jsx";
import { useConexion } from "../hooks/useConexion.js";

// La señal que muestra el portal es la conexión real del dispositivo.
const ConexionCtx = createContext(null);

// Entrada escalonada de la home: cada bloque sube con un resorte corto.
const subir = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 26 } },
};
const escalonar = {
  hidden: {},
  show: { transition: { staggerChildren: 0.075, delayChildren: 0.04 } },
};
const entradaLogo = {
  hidden: { opacity: 0, scale: 0.78 },
  show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 190, damping: 17 } },
};

function CommunityPanel() {
  return (
    <div className="w7-panel">
      <div className="w7-panel-eyebrow">Anuncios y comunidad</div>
      <div className="w7-panel-body">
        {/* Servida desde el propio portal: antes de conectarse el dispositivo
            no tiene salida a internet y una imagen externa no cargaria. */}
        <img
          className="w7-panel-thumb"
          src="/huerta-comunitaria.jpg"
          width="66"
          height="66"
          loading="lazy"
          decoding="async"
          alt="Vecinos trabajando en la huerta comunitaria"
        />
        <div>
          <div className="w7-panel-title">Nuevo proyecto de huerta comunitaria</div>
          <div className="w7-panel-sub">¡Sumate! Sábado 10 am en la Plaza del Barrio</div>
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
    <motion.button
      className={`w7-btn w7-btn-${variant}`}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.975 }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
      {...props}
    >
      {children}
    </motion.button>
  );
}

/**
 * Isotipo de Mercado Pago: el apreton de manos sobre el celeste de marca.
 * Es una version dibujada a mano; ver nota de marca en el README.
 */
function MercadoPagoIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w7-mp-icon" aria-hidden="true">
      <rect width="48" height="48" rx="13" fill="#fff" />
      <g
        fill="#009EE3"
        stroke="#009EE3"
        strokeWidth="3.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        <path d="M7 21.6 L17.6 18.8 L24 22.7 L13.9 26.3 Z" />
        <path d="M41 21.6 L30.4 18.8 L24 22.7 L34.1 26.3 Z" />
      </g>
      <ellipse cx="24" cy="24.2" rx="7.2" ry="4.5" fill="#009EE3" transform="rotate(-4 24 24.2)" />
    </svg>
  );
}

function PaymentOptionsPanel() {
  return (
    <div className="w7-payment-panel">
      <button className="w7-pay-method w7-pay-method-paypal" type="button">
        <span className="w7-pay-icon">P</span>
        <span>Pagar con PayPal</span>
      </button>

      <div className="w7-price-row">
        <div className="w7-price-amount">
          <span className="w7-price-value">USD 3.50</span>
          <span className="w7-price-caption">otras formas de pago</span>
        </div>
        <motion.button
          className="w7-price-cta"
          type="button"
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 420, damping: 28 }}
        >
          <MercadoPagoIcon />
          <span className="w7-price-cta-text">
            <span className="w7-price-cta-lead">Pagar con</span>
            <span className="w7-price-cta-brand">Mercado Pago</span>
          </span>
        </motion.button>
      </div>
    </div>
  );
}

/** Logo grande arriba de todo: aura que respira + flotación suave. */
function BrandHero() {
  const quieto = useReducedMotion();
  return (
    <motion.div className="w7-hero" variants={entradaLogo}>
      <motion.span
        className="w7-hero-aura"
        aria-hidden="true"
        animate={quieto ? undefined : { scale: [1, 1.16, 1], opacity: [0.4, 0.75, 0.4] }}
        transition={{ duration: 4.6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="w7-hero-mark"
        animate={quieto ? undefined : { y: [0, -8, 0] }}
        transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut" }}
      >
        <W7Logo size={150} pulsing />
      </motion.div>
    </motion.div>
  );
}

function WelcomeScreen({ go }) {
  return (
    <div className="w7-screen w7-screen-welcome">
      <motion.div
        className="w7-content w7-content-welcome"
        variants={escalonar}
        initial="hidden"
        animate="show"
      >
        <BrandHero />

        <motion.p className="w7-welcome-text" variants={subir}>
          ¡Bienvenido a la red solidaria W-7!
        </motion.p>

        <div className="w7-btn-stack">
          <Btn variant="primary" variants={subir} onClick={() => go("connecting")}>Conectarme a Internet</Btn>
          <Btn variant="secondary" variants={subir} onClick={() => go("whatsapp-phone")}>Conectarme con WhatsApp</Btn>
          <Btn variant="secondary" variants={subir} onClick={() => go("cell-phone")}>Validar con mi Celular</Btn>
        </div>

        <motion.div variants={subir}><PaymentOptionsPanel /></motion.div>
        <motion.div variants={subir}><CommunityPanel /></motion.div>
      </motion.div>
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
