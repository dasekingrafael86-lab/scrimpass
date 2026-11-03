// Illustrations for "Kannst du einer Sniper-Kugel ausweichen?"
import React from 'react';
import {random, useCurrentFrame} from 'remotion';
import {C, fontFamily} from '../../lib/theme';

const SIL = '#060a10';
const RIM = '#6fa8ff';

// ---------------------------------------------------------------------------------------
// physics (.308 sniper rifle, 175 gr): 790 m/s at the muzzle, ~541 m/s at 500 m

export const V0 = 790;
const K = 0.498; // m/s lost per metre flown
export const SOUND = 343;
export const tof = (d: number) => -(1 / K) * Math.log(1 - (K * d) / V0); // seconds to fly d metres
export const distAt = (t: number) => (V0 / K) * (1 - Math.exp(-K * t)); // metres flown after t seconds

// ---------------------------------------------------------------------------------------
// people

// standing person facing the camera, feet at (0,0), ~1000 units tall at scale 1
export const Person: React.FC<{x: number; y: number; s: number; rim?: string; outline?: string; o?: number}> = ({x, y, s, rim = C.teal, outline, o = 1}) => {
  const fill = outline ? 'none' : SIL;
  const stroke = outline ?? rim;
  const sw = (outline ? 6 : 4) / s;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={o} strokeOpacity={outline ? 0.9 : 0.6}>
      <rect x={-98} y={-440} width={74} height={440} rx={34} fill={fill} stroke={stroke} strokeWidth={sw} />
      <rect x={24} y={-440} width={74} height={440} rx={34} fill={fill} stroke={stroke} strokeWidth={sw} />
      <rect x={-222} y={-770} width={62} height={350} rx={30} fill={fill} stroke={stroke} strokeWidth={sw} />
      <rect x={160} y={-770} width={62} height={350} rx={30} fill={fill} stroke={stroke} strokeWidth={sw} />
      <rect x={-165} y={-800} width={330} height={400} rx={90} fill={fill} stroke={stroke} strokeWidth={sw} />
      <rect x={-36} y={-850} width={72} height={70} fill={fill} />
      <ellipse cx={0} cy={-915} rx={86} ry={100} fill={fill} stroke={stroke} strokeWidth={sw} />
    </g>
  );
};

// the same person from the side (scene coordinates); signal path eye -> brain -> legs
export const SIGNAL: [number, number][] = [
  [980, 548], [688, 548], [560, 500], [560, 760], [570, 1150], [625, 1350], [705, 1545],
];

export const PersonSide: React.FC<{think: number; legs: number}> = ({think, legs}) => (
  <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
    <defs>
      <radialGradient id="sn-brain">
        <stop offset="0" stopColor={C.orange} stopOpacity={0.9} />
        <stop offset="1" stopColor={C.orange} stopOpacity={0} />
      </radialGradient>
    </defs>
    <line x1={200} x2={1000} y1={1560} y2={1560} stroke={C.border} strokeWidth={4} />
    <path d="M490 1150 L515 1555 L590 1555 L600 1150 Z" fill={SIL} stroke={RIM} strokeOpacity={0.35} strokeWidth={3} />
    <path d="M590 1150 L680 1545 L748 1545 L672 1140 Z" fill={SIL} stroke={legs > 0 ? C.orange : RIM} strokeOpacity={0.35 + 0.6 * legs} strokeWidth={3 + 3 * legs} />
    <path d="M470 750 L660 740 C705 820 705 1000 682 1150 L482 1160 C452 1000 452 850 470 750 Z" fill={SIL} stroke={RIM} strokeOpacity={0.35} strokeWidth={3} />
    <path d="M640 800 L690 980 L650 1100" stroke={SIL} strokeWidth={50} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <path d="M440 540 C430 430 510 375 600 385 C690 395 730 460 722 530 L752 585 L716 598 C716 640 694 676 652 688 L648 745 L478 760 C455 700 445 620 440 540 Z" fill={SIL} stroke={RIM} strokeOpacity={0.55} strokeWidth={3} />
    <circle cx={560} cy={480} r={120} fill="url(#sn-brain)" opacity={think} />
    <circle cx={688} cy={548} r={7} fill="#fff" />
  </svg>
);

export const signalAt = (p: number): [number, number] => {
  const seg = SIGNAL.slice(1).map((pt, i) => Math.hypot(pt[0] - SIGNAL[i][0], pt[1] - SIGNAL[i][1]));
  let d = Math.min(1, Math.max(0, p)) * seg.reduce((a, b) => a + b, 0);
  for (let i = 0; i < seg.length; i++) {
    if (d <= seg[i]) {
      const t = d / seg[i];
      return [SIGNAL[i][0] + (SIGNAL[i + 1][0] - SIGNAL[i][0]) * t, SIGNAL[i][1] + (SIGNAL[i + 1][1] - SIGNAL[i][1]) * t];
    }
    d -= seg[i];
  }
  return SIGNAL[SIGNAL.length - 1];
};

// shooter lying on a roof, muzzle at (x, y)
export const Sniper: React.FC<{x: number; y: number; s?: number}> = ({x, y, s = 1.6}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <line x1={-70} y1={0} x2={0} y2={0} stroke="#5a6886" strokeWidth={5} strokeLinecap="round" />
    <rect x={-48} y={-9} width={22} height={6} rx={3} fill="#5a6886" />
    <line x1={-12} y1={0} x2={-20} y2={16} stroke="#5a6886" strokeWidth={3} />
    <line x1={-12} y1={0} x2={-4} y2={16} stroke="#5a6886" strokeWidth={3} />
    <circle cx={-60} cy={-4} r={11} fill={SIL} stroke={C.red} strokeOpacity={0.9} strokeWidth={2.5} />
    <rect x={-160} y={-2} width={100} height={18} rx={9} fill={SIL} stroke={C.red} strokeOpacity={0.8} strokeWidth={2.5} />
  </g>
);

export const Flash: React.FC<{x: number; y: number; o: number; s?: number}> = ({x, y, o, s = 1}) =>
  o <= 0 ? null : (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={o}>
      <circle r={60} fill={C.orange} opacity={0.25} />
      <polygon points="0,-26 10,-8 40,0 10,8 0,26 -6,8 -16,0 -6,-8" fill="#fff4d0" />
      <circle r={12} fill="#fff" />
    </g>
  );

export const Bullet: React.FC<{x: number; y: number; o?: number}> = ({x, y, o = 1}) => (
  <g opacity={o}>
    <line x1={x - 70} y1={y} x2={x} y2={y} stroke={C.orange} strokeWidth={3} strokeLinecap="round" opacity={0.5} />
    <ellipse cx={x} cy={y} rx={9} ry={4} fill="#ffe2a8" style={{filter: `drop-shadow(0 0 8px ${C.orange})`}} />
  </g>
);

export const Car: React.FC<{x: number; y: number; s?: number; color?: string}> = ({x, y, s = 1, color = C.orange}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-60 0 L-56 -14 L-20 -18 L-6 -30 L24 -30 L36 -16 L62 -12 L64 0 Z" fill={color} />
    <circle cx={-36} cy={2} r={11} fill="#0b1018" stroke={color} strokeWidth={4} />
    <circle cx={40} cy={2} r={11} fill="#0b1018" stroke={color} strokeWidth={4} />
  </g>
);

// ---------------------------------------------------------------------------------------
// two rooftops at night, 1 m = PXM px

export const PXM = 8;
export const MUZZLE = {x: 300, y: 1020};
export const YOU = {x: MUZZLE.x + 300 * PXM, y: 1085}; // feet
export const YOU_S = 0.075;
export const lineY = (x: number) => MUZZLE.y + ((x - MUZZLE.x) / (YOU.x - MUZZLE.x)) * (YOU.y - 620 * YOU_S - MUZZLE.y);

const Tower: React.FC<{x: number; top: number; w: number; seed: string; dim?: boolean}> = ({x, top, w, seed, dim}) => {
  const cols = Math.floor((w - 30) / 44);
  const rows = 40;
  return (
    <g>
      <rect x={x} y={top} width={w} height={4000} fill={dim ? '#0b1420' : '#0f1a29'} />
      <rect x={x} y={top} width={w} height={10} fill="#1e2d44" />
      {Array.from({length: cols * rows}, (_, i) => {
        const c = i % cols;
        const r = Math.floor(i / cols);
        if (random(`${seed}${i}`) < 0.6) return null;
        return <rect key={i} x={x + 22 + c * 44} y={top + 40 + r * 56} width={20} height={24} fill="#e8b65e" opacity={dim ? 0.25 : 0.55} />;
      })}
    </g>
  );
};

export const Rooftops: React.FC = () => (
  <svg width={3000} height={5000} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
    <defs>
      <radialGradient id="sn-moon">
        <stop offset="0.55" stopColor="#f4f1e6" />
        <stop offset="0.62" stopColor="#f4f1e6" stopOpacity={0.25} />
        <stop offset="1" stopColor="#f4f1e6" stopOpacity={0} />
      </radialGradient>
    </defs>
    <circle cx={1500} cy={520} r={120} fill="url(#sn-moon)" />
    {Array.from({length: 14}, (_, i) => (
      <Tower key={i} x={560 + i * 130} top={1250 + random(`st${i}`) * 500} w={110 + random(`sw${i}`) * 40} seed={`m${i}`} dim />
    ))}
    <Tower x={-60} top={MUZZLE.y + 25} w={560} seed="L" />
    <Tower x={YOU.x - 280} top={YOU.y} w={560} seed="R" />
  </svg>
);

// ---------------------------------------------------------------------------------------
// view through the scope: you on the roof, crosshair on your chest

export const SCOPE = {cx: 540, cy: 840, r: 460};

export const ScopeView: React.FC<{dx: number; dy: number; personX: number}> = ({dx, dy, personX}) => {
  const {cx, cy, r} = SCOPE;
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
      <defs>
        <clipPath id="sn-scope"><circle cx={cx} cy={cy} r={r} /></clipPath>
        <linearGradient id="sn-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0d1a2e" />
          <stop offset="1" stopColor="#1c2c48" />
        </linearGradient>
        <radialGradient id="sn-vig">
          <stop offset="0.75" stopColor="#000" stopOpacity={0} />
          <stop offset="1" stopColor="#000" stopOpacity={0.75} />
        </radialGradient>
      </defs>
      <g clipPath="url(#sn-scope)">
        <g transform={`translate(${dx} ${dy})`}>
          <rect x={-200} y={-200} width={1480} height={2400} fill="url(#sn-sky)" />
          {Array.from({length: 9}, (_, i) => (
            <rect key={i} x={-150 + i * 170} y={760 + random(`sb${i}`) * 260} width={140} height={1200} fill="#0b1522" />
          ))}
          {Array.from({length: 40}, (_, i) => (
            <rect key={i} x={-100 + random(`sx${i}`) * 1300} y={820 + random(`sy${i}`) * 400} width={14} height={18} fill="#e8b65e" opacity={0.35} />
          ))}
          <rect x={-200} y={1150} width={1480} height={1000} fill="#111d2e" />
          <rect x={-200} y={1150} width={1480} height={16} fill="#22324b" />
          <Person x={cx + personX} y={1160} s={0.5} />
        </g>
        <circle cx={cx} cy={cy} r={r} fill="url(#sn-vig)" />
        {/* reticle */}
        <g stroke="#000" strokeOpacity={0.85}>
          <line x1={cx - r} x2={cx - 40} y1={cy} y2={cy} strokeWidth={3} />
          <line x1={cx + 40} x2={cx + r} y1={cy} y2={cy} strokeWidth={3} />
          <line y1={cy - r} y2={cy - 40} x1={cx} x2={cx} strokeWidth={3} />
          <line y1={cy + 40} y2={cy + r} x1={cx} x2={cx} strokeWidth={3} />
          <line x1={cx - r} x2={cx - 220} y1={cy} y2={cy} strokeWidth={12} />
          <line x1={cx + 220} x2={cx + r} y1={cy} y2={cy} strokeWidth={12} />
          <line y1={cy + 220} y2={cy + r} x1={cx} x2={cx} strokeWidth={12} />
        </g>
        {[-3, -2, -1, 1, 2, 3].map((k) => (
          <g key={k} fill="#000" opacity={0.85}>
            <circle cx={cx + k * 55} cy={cy} r={5} />
            <circle cx={cx} cy={cy + k * 55} r={5} />
          </g>
        ))}
        <circle cx={cx} cy={cy} r={4} fill={C.red} />
        <text x={cx + 70} y={cy - 70} fontFamily={fontFamily} fontWeight={700} fontSize={30} fill="#000" opacity={0.7}>300 m</text>
      </g>
      <path d={`M0 0 H1080 V1920 H0 Z M${cx - r} ${cy} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0 Z`} fill="#03060a" fillRule="evenodd" />
      <circle cx={cx} cy={cy} r={r + 8} fill="none" stroke="#1a2333" strokeWidth={18} />
    </svg>
  );
};

// sway of a scope held by hand
export const useSway = () => {
  const f = useCurrentFrame();
  return {dx: 10 * Math.sin(f / 23) + 5 * Math.sin(f / 9), dy: 8 * Math.sin(f / 31 + 1) + 4 * Math.cos(f / 11)};
};
