import { useState } from "react";
import CaptivePortal from "./components/CaptivePortal.jsx";
import HostDashboard from "./components/HostDashboard.jsx";
import ClientDashboard from "./components/ClientDashboard.jsx";
import { W7Logo } from "./components/Brand.jsx";

const TABS = [
  { id: "portal", label: "Portal cautivo" },
  { id: "host", label: "Panel del Host" },
  { id: "client", label: "Panel del Cliente" },
];

export default function App() {
  const [tab, setTab] = useState("portal");

  return (
    <div className="w7-app">
      <nav className="w7-topnav">
        <div className="w7-topnav-brand">
          <W7Logo size={26} />
          <span className="w7-topnav-title">Demo interactiva</span>
        </div>
        <div className="w7-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`w7-tab ${tab === t.id ? "is-active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <main>
        {tab === "portal" && <CaptivePortal />}
        {tab === "host" && <HostDashboard />}
        {tab === "client" && <ClientDashboard />}
      </main>
    </div>
  );
}
