export function W7Logo({ pulsing = false, size = 44 }) {
  return (
    <div className="w7-logo-wrap" style={{ width: size, height: size }}>
      {pulsing && (
        <>
          <span className="w7-ring w7-ring-1" />
          <span className="w7-ring w7-ring-2" />
        </>
      )}
      <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
        <path
          d="M8 26c7.5-9 20.5-9 28 0"
          stroke="url(#g1)"
          strokeWidth="3.4"
          strokeLinecap="round"
          fill="none"
          opacity="0.55"
        />
        <path
          d="M13 30.5c4.8-5.6 13.2-5.6 18 0"
          stroke="url(#g1)"
          strokeWidth="3.4"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="22" cy="35" r="2.6" fill="#0F9B8E" />
        <defs>
          <linearGradient id="g1" x1="8" y1="18" x2="36" y2="18">
            <stop stopColor="#14B8A8" />
            <stop offset="1" stopColor="#0B7A70" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export function Wordmark({ align = "center" }) {
  return (
    <div style={{ textAlign: align }}>
      <div className="w7-word">
        W<span className="w7-dash">-</span>7
      </div>
      <div className="w7-tagline">W-7 Social Network</div>
    </div>
  );
}
