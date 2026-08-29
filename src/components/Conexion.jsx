/** Indicadores de conexión, alimentados por `useConexion()`. */

export function BarrasSeñal({ nivel = 0, etiqueta }) {
  return (
    <div className="w7-minibars" role="img" aria-label={etiqueta ? `Señal ${etiqueta}` : `Señal ${nivel} de 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= nivel ? "on" : ""} style={{ height: 4 + i * 3 }} />
      ))}
    </div>
  );
}

/**
 * Resumen de la conexión real del dispositivo: calidad medida por latencia
 * y, donde el navegador lo expone, tipo de red y ancho de banda estimado.
 */
export function ChipConexion({ conexion, detallado = false }) {
  const { online, calidad, latenciaMs, tipoRed, anchoBandaMbps, ahorroDatos } = conexion;

  // Sin conexión los datos de la Network Information API quedan viejos y
  // contradicen el estado, así que no los mostramos.
  const detalles = [];
  if (online) {
    if (latenciaMs != null) detalles.push(`${latenciaMs} ms`);
    if (tipoRed) detalles.push(tipoRed.toUpperCase());
    if (anchoBandaMbps != null) detalles.push(`${anchoBandaMbps} Mb/s`);
    if (ahorroDatos) detalles.push("ahorro de datos");
  }

  return (
    <div className={`w7-conexion ${online ? "" : "is-offline"}`}>
      <BarrasSeñal nivel={calidad.nivel} etiqueta={calidad.etiqueta} />
      <div className="w7-conexion-texto">
        <span className="w7-conexion-estado">{calidad.etiqueta}</span>
        {detallado && detalles.length > 0 && (
          <span className="w7-conexion-detalle">{detalles.join(" · ")}</span>
        )}
      </div>
    </div>
  );
}

/** Aviso del estado del permiso de ubicación. */
export function AvisoUbicacion({ geo }) {
  if (geo.estado === "ok") return null;

  const mensajes = {
    pidiendo: "Buscando tu ubicación…",
    denegado: "Sin permiso de ubicación: mostramos una zona de ejemplo.",
    error: "No pudimos ubicarte: mostramos una zona de ejemplo.",
    "no-soportado": "Tu navegador no soporta geolocalización: zona de ejemplo.",
  };

  return (
    <div className={`w7-aviso ${geo.estado === "pidiendo" ? "is-cargando" : ""}`}>
      <span>{mensajes[geo.estado]}</span>
      {geo.estado !== "pidiendo" && (
        <button className="w7-link" onClick={geo.reintentar}>Reintentar</button>
      )}
    </div>
  );
}
