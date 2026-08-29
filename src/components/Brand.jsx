/**
 * Identidad W-7 Social Network.
 *
 * El wordmark está dibujado como SVG (trazos redondeados, igual que el
 * logo original) para que escale sin perder nitidez y tome los colores
 * de marca desde un único lugar.
 */

export const W7_NAVY = "#123C7E";
export const W7_TEAL = "#17A5AE";

// Proporciones del lockup, en unidades del viewBox.
const MARK_W = 220;
const MARK_H = 145;
const TAG_H = 205;

// Centro del punto del que salen las ondas wifi.
const DOT_X = 177.5;
const DOT_Y = 50.7;

export function W7Logo({ size = 44, pulsing = false, tagline = false, className = "" }) {
  const boxH = tagline ? TAG_H : MARK_H;
  const gradId = tagline ? "w7grad-tag" : "w7grad";

  return (
    <svg
      className={`w7-logo ${pulsing ? "is-pulsing" : ""} ${className}`}
      viewBox={`0 0 ${MARK_W} ${boxH}`}
      height={size}
      width={(size * MARK_W) / boxH}
      role="img"
      aria-label="W-7 Social Network"
    >
      <title>W-7 Social Network</title>

      {/* La W: un zigzag de trazo grueso que sube a la derecha y se curva
          formando el brazo que sostiene la señal. */}
      <path
        d="M 25.8 50.7 L 52.7 127.6 L 76 53 L 101.7 127.6 L 129 52 Q 140 22 152.9 20.3"
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth="25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Guion */}
      <path
        d="M 141 91.5 L 157 91.5"
        fill="none"
        stroke={W7_TEAL}
        strokeWidth="25"
        strokeLinecap="round"
      />

      {/* El 7 */}
      <path
        d="M 160 57.7 L 202 57.7 L 170.5 123"
        fill="none"
        stroke={W7_TEAL}
        strokeWidth="25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Calado blanco que separa el punto y las ondas del resto del trazo,
          tal como en el logo original. */}
      <circle cx={DOT_X} cy={DOT_Y} r="13.5" fill="#fff" />
      <path
        d="M 149.5 20.3 Q 178.7 -3.9 207.9 20.3 M 161.2 33.1 Q 178.7 16.5 196.2 33.1"
        fill="none"
        stroke="#fff"
        strokeWidth="20"
        strokeLinecap="round"
      />

      <circle cx={DOT_X} cy={DOT_Y} r="8.9" fill={W7_TEAL} />
      <path
        className="w7-wave w7-wave-1"
        d="M 161.2 33.1 Q 178.7 16.5 196.2 33.1"
        fill="none"
        stroke={W7_TEAL}
        strokeWidth="13"
        strokeLinecap="round"
      />
      <path
        className="w7-wave w7-wave-2"
        d="M 149.5 20.3 Q 178.7 -3.9 207.9 20.3"
        fill="none"
        stroke={W7_TEAL}
        strokeWidth="13"
        strokeLinecap="round"
      />

      {tagline && (
        <text
          x={MARK_W / 2}
          y="190"
          textAnchor="middle"
          fontFamily="Sora, Poppins, Inter, sans-serif"
          fontWeight="700"
          fontSize="24"
          fill={W7_NAVY}
          /* Fija el ancho de la bajada al del wordmark para que el lockup
             se vea igual con cualquier fuente disponible. */
          textLength="196"
          lengthAdjust="spacingAndGlyphs"
        >
          W-7 Social Network
        </text>
      )}

      <defs>
        <linearGradient id={gradId} x1="25" y1="0" x2="153" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor={W7_NAVY} />
          <stop offset="0.35" stopColor="#14498A" />
          <stop offset="0.78" stopColor="#1899A6" />
          <stop offset="1" stopColor={W7_TEAL} />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** Lockup completo: wordmark + bajada "W-7 Social Network". */
export function Wordmark({ size = 78, pulsing = false }) {
  return <W7Logo size={size} pulsing={pulsing} tagline />;
}
