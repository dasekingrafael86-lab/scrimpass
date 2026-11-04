// Illustrations for "Wie lange müsstest du deinen Kaffee anschreien, bis er heiß ist?"
// Same look as the sniper video: dark silhouettes with a rim light, neon outlines.
import React from 'react';
import {C, fontFamily} from '../../lib/theme';

export const SIL = '#060a10';
const RIM = '#6fa8ff';

// ---------------------------------------------------------------------------------------
// physics
export const Q = 250 * 4.18 * 40; // J: 250 ml water from 20 to 60 °C = 41 800 J
export const P_SHOUT = 0.01; // W: a very loud shout, ~89 dB at 1 m
export const T_IN = (4 * 413 * 1.48e6) / (413 + 1.48e6) ** 2; // share of sound energy that enters water (~0.11 %)
export const DAYS = Q / P_SHOUT / 86400; // ~48 days if every bit of sound went in
export const YEARS = Q / P_SHOUT / T_IN / 86400 / 365.25; // ~119 years

// ---------------------------------------------------------------------------------------
// shouting head in profile, facing right. mouth at MOUTH.
export const MOUTH = {x: 470, y: 975};
export const Shouter: React.FC<{x?: number; y?: number; s?: number; open?: number}> = ({x = 0, y = 0, s = 1, open = 1}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path
      d={`M 150 1260 L 190 1080 C 140 1000 120 860 200 770 C 270 690 400 680 450 760 C 470 800 470 830 465 860
          L 505 925 L 478 940 L 482 ${955 - 6 * open} L 420 ${968} L 480 ${1000 + 26 * open}
          C 478 ${1040 + 20 * open} 450 ${1070 + 20 * open} 405 ${1072 + 20 * open} L 395 1130 L 380 1260 Z`}
      fill={SIL} stroke={RIM} strokeOpacity={0.6} strokeWidth={4}
    />
    {/* open mouth */}
    <path d={`M 482 ${955 - 6 * open} L 420 968 L 480 ${1000 + 26 * open} Z`} fill="#000" />
    <path d={`M 470 ${958 - 4 * open} L 436 968`} stroke="#fff" strokeWidth={6} strokeLinecap="round" opacity={0.7} />
    {/* eye squeezed shut */}
    <path d="M 392 842 Q 410 832 428 842" stroke={RIM} strokeWidth={6} fill="none" strokeLinecap="round" opacity={0.8} />
    <path d="M 380 812 L 432 822" stroke={RIM} strokeWidth={6} strokeLinecap="round" opacity={0.5} />
  </g>
);

// sound waves leaving the mouth towards +x
export const Waves: React.FC<{f: number; x: number; y: number; reach?: number; o?: number; color?: string}> = ({f, x, y, reach = 360, o = 1, color = C.teal}) => (
  <g opacity={o}>
    {[0, 1, 2, 3, 4].map((k) => {
      const t = ((f * 5 + k * (reach / 5)) % reach) / reach;
      const r = 30 + t * reach;
      const a = 0.55;
      return (
        <path key={k} d={`M ${x + r * Math.cos(-a)} ${y + r * Math.sin(-a)} A ${r} ${r} 0 0 1 ${x + r * Math.cos(a)} ${y + r * Math.sin(a)}`}
          fill="none" stroke={color} strokeWidth={10 - 6 * t} strokeLinecap="round" opacity={(1 - t) * 0.9} />
      );
    })}
  </g>
);

// mug with coffee, neon outline. top-left of the body at (x, y), body 300 x 340
export const Mug: React.FC<{x: number; y: number; s?: number; steam?: number; f?: number}> = ({x, y, s = 1, steam = 0, f = 0}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    {steam > 0 && [0, 1, 2].map((k) => (
      <path key={k} d={`M ${80 + k * 70} -30 q 26 -40 0 -80 q -26 -40 0 -80`} stroke={C.text} strokeWidth={10} fill="none" strokeLinecap="round"
        opacity={steam * (0.35 + 0.25 * Math.sin(f * 0.12 + k))} transform={`translate(0 ${-((f * 1.2 + k * 20) % 30)})`} />
    ))}
    <path d="M 300 70 C 400 70 400 260 300 260" stroke={C.orange} strokeWidth={26} fill="none" opacity={0.9} />
    <path d="M 0 0 L 300 0 L 300 280 Q 300 340 240 340 L 60 340 Q 0 340 0 280 Z" fill="#14100c" stroke={C.orange} strokeWidth={8} />
    <ellipse cx={150} cy={34} rx={136} ry={22} fill="#6b4426" />
    <ellipse cx={150} cy={34} rx={136} ry={22} fill="none" stroke="#8a5a34" strokeWidth={4} />
    <ellipse cx={150} cy={0} rx={150} ry={26} fill="none" stroke={C.orange} strokeWidth={8} />
  </g>
);

// thermometer: bulb at the bottom, tube from y to y+h; t in °C (0..100)
export const Thermo: React.FC<{x: number; y: number; h?: number; t: number; color?: string}> = ({x, y, h = 420, t, color = C.red}) => {
  const lvl = Math.max(0, Math.min(100, t)) / 100;
  return (
    <g>
      <rect x={x - 24} y={y} width={48} height={h} rx={24} fill={C.panel} stroke={C.border} strokeWidth={4} />
      <rect x={x - 12} y={y + h - (h - 30) * lvl} width={24} height={(h - 30) * lvl + 30} rx={12} fill={color} />
      <circle cx={x} cy={y + h + 30} r={44} fill={color} stroke={C.border} strokeWidth={4} />
      {[20, 40, 60, 80].map((d) => (
        <g key={d}>
          <line x1={x + 30} x2={x + 52} y1={y + h - (h - 30) * (d / 100)} y2={y + h - (h - 30) * (d / 100)} stroke={C.muted} strokeWidth={4} />
          <text x={x + 62} y={y + h - (h - 30) * (d / 100) + 10} fontFamily={fontFamily} fontWeight={700} fontSize={30} fill={C.muted}>{d}°</text>
        </g>
      ))}
    </g>
  );
};

// microwave, front view, 600 x 380 at (x, y)
export const Microwave: React.FC<{x: number; y: number; f: number; on: number; time: string}> = ({x, y, f, on, time}) => (
  <g transform={`translate(${x} ${y})`}>
    <rect x={0} y={0} width={600} height={380} rx={34} fill="#0d1824" stroke={C.border} strokeWidth={6} />
    <rect x={36} y={40} width={380} height={300} rx={20} fill={on > 0 ? '#3b2a0c' : '#0a121b'} stroke={C.border} strokeWidth={4} />
    <ellipse cx={226} cy={300} rx={150} ry={20} fill="#000" opacity={0.4} />
    <g opacity={on}>
      <rect x={36} y={40} width={380} height={300} rx={20} fill={C.orange} opacity={0.18 + 0.06 * Math.sin(f * 0.4)} />
    </g>
    <rect x={446} y={50} width={118} height={70} rx={12} fill="#000" />
    <text x={505} y={100} textAnchor="middle" fontFamily={fontFamily} fontWeight={800} fontSize={40} fill={C.teal}>{time}</text>
    {[0, 1, 2].map((k) => <circle key={k} cx={505} cy={170 + k * 56} r={20} fill={C.panel} stroke={C.border} strokeWidth={3} />)}
  </g>
);
