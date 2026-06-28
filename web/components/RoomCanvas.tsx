"use client";

interface RoomCanvasProps {
  distanceM: number;
  roomGainDb: number;
  hasSpeakers: boolean;
  hasHeadphones: boolean;
}

export default function RoomCanvas({ distanceM, hasSpeakers, hasHeadphones }: RoomCanvasProps) {
  if (hasHeadphones && !hasSpeakers) {
    return (
      <div style={{ textAlign: "center", padding: "24px 0" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: "8px" }}>🎧</div>
        <p style={{ fontSize: "0.7rem", color: "var(--pa-muted)", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--pa-font-ui)" }}>
          Headphone chain
        </p>
      </div>
    );
  }

  const VW = 680;
  const VH = 230;

  // Listener position (fraction of floor depth)
  const frac = Math.min(distanceM / 6, 0.9);
  // Floor spans Y 100..210, listener moves between them
  const floorTop = 100;
  const floorBot = 210;
  const listenY = floorTop + (floorBot - floorTop) * frac;

  // Speaker left/right X positions (near back wall)
  const spkLx = 90;
  const spkRx = 590;
  const chairX = 340;

  return (
    <div>
      <p style={{
        fontSize: "0.62rem",
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "var(--pa-accent)",
        fontFamily: "var(--pa-font-ui)",
        marginBottom: "8px",
        fontWeight: 700,
      }}>
        Room acoustics — isometric view
      </p>
      <svg width="100%" viewBox={`0 0 ${VW} ${VH}`} style={{ display: "block" }}>
        <defs>
          <linearGradient id="floorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fde8c0" stopOpacity={0.6} />
            <stop offset="100%" stopColor="#fcd34d" stopOpacity={0.2} />
          </linearGradient>
          <filter id="spkrShadow">
            <feDropShadow dx="2" dy="3" stdDeviation="3" floodColor="#d97706" floodOpacity={0.2} />
          </filter>
        </defs>

        {/* Floor */}
        <polygon points="100,210 580,210 640,100 40,100" fill="url(#floorGrad)" stroke="#e8d5b7" strokeWidth={1.5} />
        {/* Back wall */}
        <polygon points="40,100 640,100 640,30 40,30" fill="rgba(254,243,226,0.5)" stroke="#e8d5b7" strokeWidth={1.5} />
        {/* Ceiling line */}
        <line x1="40" y1="30" x2="640" y2="30" stroke="#d4b896" strokeWidth={1} />

        {/* Left Speaker */}
        <rect x={spkLx - 20} y="50" width="40" height="70" rx={6} fill="#3d2200" stroke="#d97706" strokeWidth={2} filter="url(#spkrShadow)" />
        <ellipse cx={spkLx} cy="75" rx="13" ry="13" fill="#2d1a0a" stroke="#d97706" strokeWidth={1.5} />
        <ellipse cx={spkLx} cy="75" rx="6" ry="6" fill="#92400e" />
        <ellipse cx={spkLx} cy="100" rx="7" ry="7" fill="#2d1a0a" stroke="#a87940" strokeWidth={1} />
        <text x={spkLx} y="130" textAnchor="middle" fill="#d97706" fontSize="8" fontFamily="monospace">L</text>

        {/* Right Speaker */}
        <rect x={spkRx - 20} y="50" width="40" height="70" rx={6} fill="#3d2200" stroke="#d97706" strokeWidth={2} filter="url(#spkrShadow)" />
        <ellipse cx={spkRx} cy="75" rx="13" ry="13" fill="#2d1a0a" stroke="#d97706" strokeWidth={1.5} />
        <ellipse cx={spkRx} cy="75" rx="6" ry="6" fill="#92400e" />
        <ellipse cx={spkRx} cy="100" rx="7" ry="7" fill="#2d1a0a" stroke="#a87940" strokeWidth={1} />
        <text x={spkRx} y="130" textAnchor="middle" fill="#d97706" fontSize="8" fontFamily="monospace">R</text>

        {/* Listening chair */}
        {/* Chair back */}
        <rect x={chairX - 20} y={listenY - 5} width="40" height="42" rx={8} fill="#5c3a1e" stroke="#a87940" strokeWidth={1.5} />
        {/* Chair seat */}
        <ellipse cx={chairX} cy={listenY + 40} rx="22" ry="10" fill="#5c3a1e" stroke="#a87940" strokeWidth={1.5} />
        {/* Head */}
        <circle cx={chairX} cy={listenY - 18} r="16" fill="#3d2200" stroke="#a87940" strokeWidth={1.5} />
        {/* Ear position (dashed circle) */}
        <circle cx={chairX} cy={listenY - 18} r="8" fill="none" stroke="#d97706" strokeWidth={1.5} strokeDasharray="3,2" />

        {/* Sound arcs L (double) */}
        <path d={`M ${spkLx + 20},70 Q ${(spkLx + chairX) / 2},80 ${chairX - 10},${listenY - 18}`} stroke="#d97706" strokeWidth={1} fill="none" strokeDasharray="6,4" opacity={0.4} />
        <path d={`M ${spkLx + 20},70 Q ${(spkLx + chairX) / 2 - 20},100 ${chairX - 12},${listenY - 12}`} stroke="#d97706" strokeWidth={0.75} fill="none" strokeDasharray="6,4" opacity={0.25} />
        {/* Sound arcs R (double) */}
        <path d={`M ${spkRx - 20},70 Q ${(spkRx + chairX) / 2},80 ${chairX + 10},${listenY - 18}`} stroke="#d97706" strokeWidth={1} fill="none" strokeDasharray="6,4" opacity={0.4} />
        <path d={`M ${spkRx - 20},70 Q ${(spkRx + chairX) / 2 + 20},100 ${chairX + 12},${listenY - 12}`} stroke="#d97706" strokeWidth={0.75} fill="none" strokeDasharray="6,4" opacity={0.25} />

        {/* Dimension lines */}
        <line x1={spkLx} y1="215" x2={chairX - 10} y2="215" stroke="#d4b896" strokeWidth={0.75} />
        <line x1={spkLx} y1="210" x2={spkLx} y2="220" stroke="#d4b896" strokeWidth={0.75} />
        <line x1={chairX} y1="210" x2={chairX} y2="220" stroke="#d4b896" strokeWidth={0.75} />
        <text x={(spkLx + chairX) / 2} y="225" textAnchor="middle" fill="#a87940" fontSize="8" fontFamily="monospace">{distanceM} m</text>

        {/* Top label */}
        <text x="340" y="22" textAnchor="middle" fill="#a87940" fontSize="8" fontFamily="monospace" letterSpacing="1">ROOM — TOP/ISOMETRIC VIEW</text>
      </svg>
    </div>
  );
}
