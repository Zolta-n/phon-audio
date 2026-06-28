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
        <p style={{ fontSize: "0.7rem", color: "var(--pa-muted)", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--font-lora), serif" }}>
          Headphone chain
        </p>
      </div>
    );
  }

  // Viewbox coords
  const VW = 440;
  const VH = 300;
  const cx = VW / 2;

  // Trapezoid: narrow top (front wall w/ speakers), wide bottom (back wall)
  // Listener sits at centre, depth driven by distanceM
  const frontW = 160;
  const backW  = 380;
  const frontY = 55;
  const backY  = 260;

  const flx = cx - frontW / 2;   // front-left x
  const frx = cx + frontW / 2;   // front-right x
  const blx = cx - backW  / 2;   // back-left x
  const brx = cx + backW  / 2;   // back-right x

  // Listener position — fraction from front to back capped
  const frac = Math.min(distanceM / 8, 0.88);
  const listenY = frontY + (backY - frontY) * frac;
  // Interpolate x-center stay at cx
  const listenX = cx;

  // Speaker positions — inside the room, against the front wall
  const spkOffset = 28;           // how far inset from the corner
  const spkLx = flx + spkOffset;
  const spkRx = frx - spkOffset;
  const spkY  = frontY + 2;      // just below the front wall line

  // Speaker SVG sub-render
  const Speaker = ({ sx, sy, label }: { sx: number; sy: number; label: string }) => (
    <g>
      {/* Cabinet */}
      <rect x={sx - 10} y={sy} width={20} height={34} rx={3} fill="#1a0f00" />
      {/* Woofer cone + surround */}
      <circle cx={sx} cy={sy + 12} r={8} fill="#2a1a08" stroke="#c96f12" strokeWidth={2} />
      <circle cx={sx} cy={sy + 12} r={4}  fill="#c96f12" />
      <circle cx={sx} cy={sy + 12} r={1.5} fill="#fdf6ec" />
      {/* Tweeter */}
      <circle cx={sx} cy={sy + 26} r={4}  fill="#2a1a08" stroke="#7a5c3a" strokeWidth={1} />
      <circle cx={sx} cy={sy + 26} r={1.5} fill="#7a5c3a" />
      {/* L/R label */}
      <text x={sx} y={sy + 46} textAnchor="middle" fontSize="10" fontWeight="600"
        fill="#7a5c3a" fontFamily="var(--font-lora), serif">{label}</text>
    </g>
  );

  return (
    <div>
      <p style={{
        fontSize: "0.62rem",
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "var(--pa-accent)",
        fontFamily: "var(--font-lora), serif",
        marginBottom: "8px",
        fontWeight: 600,
      }}>
        Room acoustics — isometric view
      </p>
      <svg
        width="100%"
        viewBox={`0 0 ${VW} ${VH}`}
        style={{ display: "block" }}
      >
        {/* Room floor */}
        <polygon
          points={`${flx},${frontY} ${frx},${frontY} ${brx},${backY} ${blx},${backY}`}
          fill="#f5efe4"
          stroke="#c4a882"
          strokeWidth={1.5}
        />

        {/* Side walls (lines along edges) */}
        <line x1={flx} y1={frontY} x2={blx} y2={backY} stroke="#c4a882" strokeWidth={1} />
        <line x1={frx} y1={frontY} x2={brx} y2={backY} stroke="#c4a882" strokeWidth={1} />

        {/* Front wall */}
        <line x1={flx} y1={frontY} x2={frx} y2={frontY} stroke="#2d1a0a" strokeWidth={3} />

        {/* Back wall */}
        <line x1={blx} y1={backY} x2={brx} y2={backY} stroke="#c4a882" strokeWidth={1} />

        {/* Subtle floor grid */}
        {[0.25, 0.5, 0.75].map((t, i) => {
          const lx = flx + (blx - flx) * t;
          const rx = frx + (brx - frx) * t;
          const fy = frontY + (backY - frontY) * t;
          return <line key={i} x1={lx} y1={fy} x2={rx} y2={fy} stroke="#ddd0b8" strokeWidth={0.5} strokeDasharray="3,4" />;
        })}

        {/* Speakers */}
        <Speaker sx={spkLx} sy={spkY} label="L" />
        <Speaker sx={spkRx} sy={spkY} label="R" />

        {/* Dashed lines: speakers to listener */}
        <line x1={spkLx} y1={spkY + 20} x2={listenX - 5} y2={listenY - 14}
          stroke="#c96f12" strokeWidth={1.2} strokeDasharray="5,4" opacity={0.5} />
        <line x1={spkRx} y1={spkY + 20} x2={listenX + 5} y2={listenY - 14}
          stroke="#c96f12" strokeWidth={1.2} strokeDasharray="5,4" opacity={0.5} />

        {/* Listener silhouette */}
        {/* Body */}
        <ellipse cx={listenX} cy={listenY + 8} rx={9} ry={12} fill="#5c3a20" opacity={0.8} />
        {/* Head */}
        <circle cx={listenX} cy={listenY - 10} r={9} fill="#5c3a20" opacity={0.8} />
        {/* Ears */}
        <circle cx={listenX - 9} cy={listenY - 10} r={2.5} fill="#4a2e14" opacity={0.7} />
        <circle cx={listenX + 9} cy={listenY - 10} r={2.5} fill="#4a2e14" opacity={0.7} />

        {/* Distance label */}
        <line x1={cx + 18} y1={spkY + 14} x2={cx + 18} y2={listenY}
          stroke="#c96f12" strokeWidth={1} strokeDasharray="2,2" opacity={0.45} />
        <text x={cx + 24} y={(spkY + 14 + listenY) / 2 + 4} fontSize="10" fontWeight="600"
          fill="#c96f12" fontFamily="var(--font-lora), serif" opacity={0.9}>
          {distanceM} m
        </text>
      </svg>
    </div>
  );
}
