// Flat vector illustrations for the explainer videos: the "real" pictures the data is built on.
import React from 'react';
import {random, useCurrentFrame} from 'remotion';
import {C, fontFamily} from '../lib/theme';

const SIL = '#060a10'; // silhouettes
const RIM = '#6fa8ff'; // monitor light on edges

// ---------------------------------------------------------------------------------------
// the game on the monitor: 1600 x 900 view box

export const VB = {w: 1600, h: 900};
const FEET = 760;

export const Fighter: React.FC<{x: number; s?: number; o?: number; run?: number; outline?: boolean}> = ({x, s = 1, o = 1, run, outline}) => {
  const swing = run === undefined ? 0 : Math.sin(run) * 24;
  const fill = outline ? 'none' : C.red;
  const dark = outline ? 'none' : '#b8382f';
  const stroke = outline ? C.red : undefined;
  const sw = outline ? 4 : undefined;
  return (
    <g transform={`translate(${x} ${FEET}) scale(${s})`} opacity={o} style={outline ? undefined : {filter: `drop-shadow(0 0 14px ${C.red}aa)`}}>
      {!outline && <ellipse cx={0} cy={4} rx={70} ry={12} fill="#000" opacity={0.35} />}
      <rect x={-30} y={-112} width={26} height={112} rx={12} fill={dark} stroke={stroke} strokeWidth={sw} transform={`rotate(${swing} -17 -112)`} />
      <rect x={4} y={-112} width={26} height={112} rx={12} fill={fill} stroke={stroke} strokeWidth={sw} transform={`rotate(${-swing} 17 -112)`} />
      <rect x={-68} y={-198} width={24} height={92} rx={12} fill={dark} stroke={stroke} strokeWidth={sw} transform={`rotate(${-swing * 0.7} -56 -190)`} />
      <rect x={-48} y={-208} width={96} height={108} rx={32} fill={fill} stroke={stroke} strokeWidth={sw} />
      <rect x={44} y={-198} width={24} height={92} rx={12} fill={fill} stroke={stroke} strokeWidth={sw} transform={`rotate(${swing * 0.7} 56 -190)`} />
      <circle cx={0} cy={-242} r={33} fill={fill} stroke={stroke} strokeWidth={sw} />
      {!outline && <rect x={-4} y={-252} width={34} height={12} rx={6} fill="#ffe1b0" />}
    </g>
  );
};

export const Crosshair: React.FC<{x: number; y: number; o?: number; size?: number}> = ({x, y, o = 1, size = 1}) => (
  <g transform={`translate(${x} ${y}) scale(${size})`} opacity={o} stroke="#fff" strokeWidth={5} fill="none">
    <circle r={34} />
    <line x1={-58} x2={-20} y1={0} y2={0} />
    <line x1={20} x2={58} y1={0} y2={0} />
    <line y1={-58} y2={-20} x1={0} x2={0} />
    <line y1={20} y2={58} x1={0} x2={0} />
  </g>
);

// peek: 0 = enemy hidden behind the crate, 1 = fully out. runX: enemy running in the open.
export const GameView: React.FC<{peek?: number; runX?: number; runPhase?: number; ghostX?: number; aimX?: number; aimO?: number; tag?: string; tagO?: number}> = ({
  peek = 0, runX, runPhase, ghostX, aimX, aimO = 0, tag, tagO = 0,
}) => (
  <g>
    <defs>
      <linearGradient id="gv-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#1d2d52" />
        <stop offset="1" stopColor="#5b4a7e" />
      </linearGradient>
      <linearGradient id="gv-floor" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#2d3554" />
        <stop offset="1" stopColor="#1a2036" />
      </linearGradient>
    </defs>
    <rect width={VB.w} height={VB.h} fill="url(#gv-sky)" />
    <circle cx={1150} cy={400} r={130} fill="#ffb37a" opacity={0.25} />
    <polygon points="0,430 180,330 380,410 560,300 800,420 1040,320 1260,400 1460,310 1600,380 1600,440 0,440" fill="#232c4c" />
    <rect y={430} width={VB.w} height={470} fill="url(#gv-floor)" />
    {Array.from({length: 13}, (_, i) => (
      <line key={i} x1={800} y1={430} x2={-700 + i * 250} y2={900} stroke="#3c4670" strokeWidth={2} opacity={0.6} />
    ))}
    {[520, 620, 760].map((y) => <line key={y} x1={0} x2={VB.w} y1={y} y2={y} stroke="#3c4670" strokeWidth={2} opacity={0.5} />)}
    {/* left wall, close to the camera */}
    <polygon points="0,120 300,200 300,900 0,900" fill="#3a4568" />
    <polygon points="300,200 360,230 360,900 300,900" fill="#2b3453" />
    <line x1={0} y1={120} x2={300} y2={200} stroke="#56638f" strokeWidth={6} />
    {/* enemy behind the crate */}
    {runX === undefined && peek > 0 && <Fighter x={1230 + 190 * peek} />}
    {/* crates */}
    <g>
      <rect x={1060} y={560} width={260} height={200} fill="#8a5a36" />
      <rect x={1060} y={560} width={260} height={200} fill="none" stroke="#b07a4a" strokeWidth={8} />
      <line x1={1060} y1={560} x2={1320} y2={760} stroke="#b07a4a" strokeWidth={8} />
      <rect x={1110} y={420} width={170} height={140} fill="#7a4f30" />
      <rect x={1110} y={420} width={170} height={140} fill="none" stroke="#a56f42" strokeWidth={7} />
    </g>
    {runX !== undefined && (
      <>
        {ghostX !== undefined && <Fighter x={ghostX} outline o={0.55} />}
        <Fighter x={runX} run={runPhase} />
        {tag && (
          <g opacity={tagO}>
            <text x={runX} y={FEET - 330} textAnchor="middle" fontFamily={fontFamily} fontWeight={800} fontSize={54} fill={C.orange}>{tag}</text>
          </g>
        )}
      </>
    )}
    {aimX !== undefined && <Crosshair x={aimX} y={FEET - 170} o={aimO} />}
  </g>
);

// nested svg that shows a GameView in any rectangle
export const Screen: React.FC<{x: number; y: number; w: number; h: number; children: React.ReactNode}> = ({x, y, w, h, children}) => (
  <svg x={x} y={y} width={w} height={h} viewBox={`0 0 ${VB.w} ${VB.h}`} preserveAspectRatio="xMidYMid slice">
    {children}
  </svg>
);

// ---------------------------------------------------------------------------------------
// apartment block at night (scene coordinates 1080 x 1920)

export const BUILDING = {
  cols: 5, rows: 8, x0: 165, y0: 960, dx: 160, dy: 140, w: 110, h: 92,
};
export const windowCenter = (col: number, row: number) => ({
  x: BUILDING.x0 + col * BUILDING.dx + BUILDING.w / 2,
  y: BUILDING.y0 + row * BUILDING.dy + BUILDING.h / 2,
});

const GamerWindow: React.FC<{x: number; y: number}> = ({x, y}) => {
  const f = useCurrentFrame();
  const flicker = 0.85 + 0.15 * Math.sin(f / 4);
  const {w, h} = BUILDING;
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={w} height={h} fill="#1a2c55" />
      <rect width={w} height={h} fill={RIM} opacity={0.35 * flicker} />
      <rect x={30} y={30} width={50} height={30} fill="#bfe0ff" opacity={flicker} />
      <rect x={52} y={60} width={6} height={10} fill={SIL} />
      <circle cx={55} cy={74} r={13} fill={SIL} />
      <path d={`M25 ${h} Q55 70 85 ${h} Z`} fill={SIL} />
      <rect width={w} height={h} fill="none" stroke="#2a3a55" strokeWidth={6} />
    </g>
  );
};

export const Building: React.FC<{gamers: [number, number][]}> = ({gamers}) => {
  const f = useCurrentFrame();
  const {cols, rows, x0, y0, dx, dy, w, h} = BUILDING;
  const isGamer = (c: number, r: number) => gamers.some(([gc, gr]) => gc === c && gr === r);
  return (
    <svg width={1080} height={2400} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
      <defs>
        <radialGradient id="moon">
          <stop offset="0.55" stopColor="#f4f1e6" />
          <stop offset="0.62" stopColor="#f4f1e6" stopOpacity={0.25} />
          <stop offset="1" stopColor="#f4f1e6" stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle cx={880} cy={190} r={95} fill="url(#moon)" />
      {/* far skyline */}
      {Array.from({length: 9}, (_, i) => {
        const bw = 90 + random(`bw${i}`) * 90;
        const bh = 300 + random(`bh${i}`) * 420;
        const bx = -120 + i * 150;
        return (
          <g key={i}>
            <rect x={bx} y={1500 - bh} width={bw} height={bh + 900} fill="#0c1522" />
            {Array.from({length: 14}, (_, k) => (
              random(`lw${i}-${k}`) > 0.6 && (
                <rect key={k} x={bx + 14 + (k % 3) * 26} y={1520 - bh + Math.floor(k / 3) * 60} width={12} height={16} fill="#f2c46b" opacity={0.35} />
              )
            ))}
          </g>
        );
      })}
      {/* the block */}
      <rect x={110} y={860} width={860} height={1600} fill="#101b2b" />
      <rect x={110} y={860} width={860} height={18} fill="#1e2d44" />
      <rect x={480} y={790} width={120} height={70} fill="#101b2b" />
      <line x1={540} y1={790} x2={540} y2={700} stroke="#1e2d44" strokeWidth={6} />
      <circle cx={540} cy={700} r={7} fill={C.red} opacity={0.5 + 0.5 * Math.sin(f / 8)} />
      {Array.from({length: cols * rows}, (_, i) => {
        const c = i % cols;
        const r = Math.floor(i / cols);
        const x = x0 + c * dx;
        const y = y0 + r * dy;
        if (isGamer(c, r)) return <GamerWindow key={i} x={x} y={y} />;
        const lit = random(`win${i}`) > 0.55;
        return <rect key={i} x={x} y={y} width={w} height={h} fill={lit ? '#e8b65e' : '#17243a'} opacity={lit ? 0.75 : 1} />;
      })}
      <rect x={-400} y={2080} width={1880} height={400} fill="#070c13" />
      {[60, 330, 760, 1020].map((x) => (
        <g key={x}>
          <rect x={x} y={1960} width={6} height={120} fill="#1e2d44" />
          <circle cx={x + 3} cy={1956} r={10} fill="#f2c46b" opacity={0.8} />
        </g>
      ))}
    </svg>
  );
};

// ---------------------------------------------------------------------------------------
// gamer's room, seen over the shoulder (scene coordinates 1080 x 1920)

export const ROOM = {screen: {x: 205, y: 615, w: 670, h: 377}, pc: {x: 860, y: 1300, w: 180, h: 470}};

export const Room: React.FC<{label: string; accent: string; screen: React.ReactNode; fans?: number}> = ({label, accent, screen, fans = 1}) => {
  const f = useCurrentFrame();
  const {x, y, w, h} = ROOM.screen;
  const pc = ROOM.pc;
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
      <defs>
        <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#131d2c" />
          <stop offset="1" stopColor="#0b121c" />
        </linearGradient>
        <radialGradient id="screenglow">
          <stop offset="0" stopColor={RIM} stopOpacity={0.4} />
          <stop offset="1" stopColor={RIM} stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect width={1080} height={1920} fill="url(#wall)" />
      {/* window behind the desk with the city at night */}
      <rect x={230} y={240} width={620} height={330} fill="#0d1a30" />
      {Array.from({length: 10}, (_, i) => (
        <rect key={i} x={240 + i * 62} y={420 - random(`rw${i}`) * 140} width={48} height={300} fill="#0a1422" />
      ))}
      {Array.from({length: 26}, (_, i) => (
        <rect key={i} x={250 + random(`rlx${i}`) * 580} y={330 + random(`rly${i}`) * 220} width={8} height={10} fill="#f2c46b" opacity={0.5} />
      ))}
      <circle cx={760} cy={300} r={26} fill="#f4f1e6" opacity={0.9} />
      <rect x={230} y={240} width={620} height={330} fill="none" stroke="#1d2a3d" strokeWidth={14} />
      <rect x={160} y={220} width={90} height={420} rx={10} fill="#18264d" />
      <rect x={830} y={220} width={90} height={420} rx={10} fill="#18264d" />
      {/* posters */}
      <rect x={30} y={300} width={110} height={150} rx={6} fill="#1b2a40" stroke={accent} strokeOpacity={0.5} strokeWidth={4} />
      <polygon points="50,430 85,330 120,430" fill={accent} opacity={0.5} />
      <rect x={40} y={500} width={90} height={120} rx={6} fill="#1b2a40" stroke="#ffb547" strokeOpacity={0.4} strokeWidth={4} />
      <circle cx={85} cy={560} r={28} fill="#ffb547" opacity={0.35} />
      {/* monitor light on the wall */}
      <ellipse cx={540} cy={800} rx={560} ry={380} fill="url(#screenglow)" />
      {/* desk */}
      <polygon points="40,1080 1040,1080 1080,1190 0,1190" fill="#1d2636" />
      <rect x={0} y={1190} width={1080} height={60} fill="#141b27" />
      <rect x={0} y={1250} width={1080} height={670} fill="#090e15" />
      {/* lamp */}
      <path d="M960 1080 L960 900 L900 860" stroke="#2a3446" strokeWidth={10} fill="none" />
      <polygon points="870,850 930,830 940,880" fill="#2a3446" />
      <ellipse cx={930} cy={1082} rx={60} ry={10} fill="#ffd28a" opacity={0.25} />
      {/* monitor */}
      <rect x={505} y={1000} width={70} height={80} fill="#0a0f16" />
      <rect x={430} y={1070} width={220} height={18} rx={9} fill="#0a0f16" />
      <rect x={x - 16} y={y - 16} width={w + 32} height={h + 62} rx={16} fill="#0a0f16" stroke="#1e2a3c" strokeWidth={3} />
      <Screen x={x} y={y} w={w} h={h}>{screen}</Screen>
      <text x={540} y={y + h + 36} textAnchor="middle" fontFamily={fontFamily} fontWeight={800} fontSize={24} letterSpacing={3} fill={accent}>{label}</text>
      {/* keyboard, mouse */}
      <rect x={320} y={1110} width={420} height={52} rx={8} fill="#0b1018" stroke={accent} strokeOpacity={0.6} strokeWidth={3} />
      <rect x={790} y={1112} width={180} height={60} rx={8} fill="#c9a24a" opacity={0.85} />
      <ellipse cx={880} cy={1140} rx={20} ry={28} fill="#0b1018" stroke={accent} strokeOpacity={0.7} strokeWidth={3} />
      {/* PC tower */}
      <rect x={pc.x} y={pc.y} width={pc.w} height={pc.h} rx={12} fill="#0c121b" stroke="#22304a" strokeWidth={4} />
      <rect x={pc.x + 18} y={pc.y + 26} width={pc.w - 36} height={pc.h - 52} rx={8} fill="#0f1a2c" stroke={accent} strokeOpacity={0.5} strokeWidth={3} />
      {[0, 1, 2].map((k) => {
        const cy = pc.y + 100 + k * 120;
        const a = (f * 18 * fans + k * 40) % 360;
        return (
          <g key={k} transform={`translate(${pc.x + pc.w / 2} ${cy})`}>
            <circle r={46} fill="none" stroke={accent} strokeWidth={4} opacity={0.8} />
            {[0, 90, 180, 270].map((b) => (
              <line key={b} x1={0} y1={0} x2={38} y2={0} stroke={accent} strokeWidth={8} strokeLinecap="round" opacity={0.6} transform={`rotate(${a + b})`} />
            ))}
          </g>
        );
      })}
      <rect x={pc.x + 18} y={pc.y + pc.h - 70} width={pc.w - 36} height={22} rx={6} fill={accent} opacity={0.7} />
      {/* player from behind */}
      <path d="M250 1920 C250 1650 300 1480 440 1440 Q540 1415 640 1440 C780 1480 830 1650 830 1920 Z" fill={SIL} stroke={RIM} strokeOpacity={0.35} strokeWidth={3} />
      <rect x={492} y={1330} width={96} height={130} fill={SIL} />
      <ellipse cx={540} cy={1270} rx={105} ry={118} fill={SIL} stroke={RIM} strokeOpacity={0.45} strokeWidth={3} />
      <path d="M432 1255 Q540 1105 648 1255" stroke="#141c28" strokeWidth={20} fill="none" />
      <rect x={414} y={1222} width={40} height={92} rx={16} fill="#141c28" stroke={accent} strokeWidth={3} />
      <rect x={626} y={1222} width={40} height={92} rx={16} fill="#141c28" stroke={accent} strokeWidth={3} />
      <path d="M380 1920 L380 1580 Q380 1480 470 1470 L610 1470 Q700 1480 700 1580 L700 1920 Z" fill="#0b1119" stroke="#1e2a3c" strokeWidth={4} />
    </svg>
  );
};

// ---------------------------------------------------------------------------------------
// the same player from the side: eye -> brain -> hand (scene coordinates 1080 x 1920)

export const SIGNAL: [number, number][] = [
  [960, 560], [688, 548], [560, 500], [560, 720], [690, 800], [730, 960], [860, 1005],
];

export const SideView: React.FC<{think: number; click: number}> = ({think, click}) => (
  <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
    <defs>
      <linearGradient id="beam" x1="1" y1="0" x2="0" y2="0">
        <stop offset="0" stopColor={RIM} stopOpacity={0.35} />
        <stop offset="1" stopColor={RIM} stopOpacity={0} />
      </linearGradient>
      <radialGradient id="brain">
        <stop offset="0" stopColor={C.orange} stopOpacity={0.9} />
        <stop offset="1" stopColor={C.orange} stopOpacity={0} />
      </radialGradient>
    </defs>
    <polygon points="975,380 975,740 600,620 600,470" fill="url(#beam)" />
    {/* desk + monitor seen from the side */}
    <rect x={560} y={1040} width={560} height={30} fill="#1d2636" />
    <rect x={600} y={1070} width={20} height={600} fill="#141b27" />
    <rect x={960} y={370} width={30} height={380} rx={8} fill="#0a0f16" stroke={RIM} strokeWidth={4} />
    <rect x={985} y={540} width={60} height={20} fill="#0a0f16" />
    <rect x={1030} y={540} width={20} height={500} fill="#0a0f16" />
    {/* body, arm, mouse */}
    <path d="M400 760 L690 740 C760 800 790 900 770 1010 L400 1060 Z" fill={SIL} stroke={RIM} strokeOpacity={0.3} strokeWidth={3} />
    <path d="M690 800 L730 960 L860 1005" stroke={SIL} strokeWidth={52} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <ellipse cx={880} cy={1018} rx={44} ry={22} fill="#0b1018" stroke={click > 0 ? C.orange : '#2a3446'} strokeWidth={4} />
    {click > 0 && <circle cx={880} cy={1010} r={30 + 50 * click} fill="none" stroke={C.orange} strokeWidth={5} opacity={1 - click} />}
    {/* head in profile */}
    <path d="M440 540 C430 430 510 375 600 385 C690 395 730 460 722 530 L752 585 L716 598 C716 640 694 676 652 688 L648 745 L478 760 C455 700 445 620 440 540 Z" fill={SIL} stroke={RIM} strokeOpacity={0.55} strokeWidth={3} />
    <path d="M470 470 Q560 330 680 430" stroke="#141c28" strokeWidth={20} fill="none" />
    <rect x={500} y={470} width={56} height={92} rx={22} fill="#141c28" stroke={C.teal} strokeWidth={3} />
    <circle cx={560} cy={480} r={120} fill="url(#brain)" opacity={think} />
    <circle cx={688} cy={548} r={7} fill="#fff" />
    {/* chair */}
    <path d="M330 640 Q310 900 340 1180 L420 1180 L420 640 Z" fill="#0b1119" stroke="#1e2a3c" strokeWidth={4} />
  </svg>
);

// point along the eye -> brain -> hand path, p in 0..1
export const signalAt = (p: number): [number, number] => {
  const seg = SIGNAL.slice(1).map((pt, i) => Math.hypot(pt[0] - SIGNAL[i][0], pt[1] - SIGNAL[i][1]));
  const total = seg.reduce((a, b) => a + b, 0);
  let d = Math.min(1, Math.max(0, p)) * total;
  for (let i = 0; i < seg.length; i++) {
    if (d <= seg[i]) {
      const t = d / seg[i];
      return [SIGNAL[i][0] + (SIGNAL[i + 1][0] - SIGNAL[i][0]) * t, SIGNAL[i][1] + (SIGNAL[i + 1][1] - SIGNAL[i][1]) * t];
    }
    d -= seg[i];
  }
  return SIGNAL[SIGNAL.length - 1];
};
