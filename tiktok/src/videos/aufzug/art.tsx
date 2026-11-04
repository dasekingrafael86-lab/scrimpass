// Illustrations for "Der Aufzug stürzt ab: Rettet dich ein Sprung im letzten Moment?"
// Same look as the sniper video: dark silhouettes, rim light, neon accents.
import React from 'react';
import {C, fontFamily} from '../../lib/theme';

export const SIL = '#060a10';
export const RIM = '#6fa8ff';
const WALL = '#0c1622';

// ---------------------------------------------------------------------------------------
// physics: 10th floor = 30 m, free fall
export const G = 9.81;
export const H0 = 30;
export const T_FALL = Math.sqrt((2 * H0) / G); // 2.47 s
export const V_IMPACT = G * T_FALL * 3.6; // 87 km/h
export const V_JUMP = Math.sqrt(2 * G * 0.4) * 3.6; // 10 km/h (a 40 cm jump)
export const V_LEFT = V_IMPACT - V_JUMP; // 77 km/h
export const heightAt = (t: number) => Math.max(0, H0 - 0.5 * G * t * t);
export const speedAt = (t: number) => G * Math.min(t, T_FALL) * 3.6;

// shaft scene: 100 px per metre, ground at GROUND
export const PXM = 100;
export const GROUND = 3200;
export const CAB = {x: 350, w: 380, h: 260};
export const cabBottom = (h: number) => GROUND - h * PXM;

// person facing the camera, feet at (0,0), ~1000 units tall at s = 1 (as in the sniper video)
export const Person: React.FC<{x: number; y: number; s: number; rot?: number; rim?: string; o?: number}> = ({x, y, s, rot = 0, rim = C.teal, o = 1}) => {
  const sw = 4 / s;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} opacity={o} strokeOpacity={0.6}>
      <rect x={-98} y={-440} width={74} height={440} rx={34} fill={SIL} stroke={rim} strokeWidth={sw} />
      <rect x={24} y={-440} width={74} height={440} rx={34} fill={SIL} stroke={rim} strokeWidth={sw} />
      <rect x={-222} y={-770} width={62} height={350} rx={30} fill={SIL} stroke={rim} strokeWidth={sw} />
      <rect x={160} y={-770} width={62} height={350} rx={30} fill={SIL} stroke={rim} strokeWidth={sw} />
      <rect x={-165} y={-800} width={330} height={400} rx={90} fill={SIL} stroke={rim} strokeWidth={sw} />
      <rect x={-36} y={-850} width={72} height={70} fill={SIL} />
      <ellipse cx={0} cy={-915} rx={86} ry={100} fill={SIL} stroke={rim} strokeWidth={sw} />
    </g>
  );
};

// crouching person (knees bent), feet at (0,0)
export const Crouch: React.FC<{x: number; y: number; s: number; k: number}> = ({x, y, s, k}) => {
  // k = 0 standing ... 1 deep crouch
  const sw = 4 / s;
  const drop = 260 * k;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} strokeOpacity={0.6}>
      <path d={`M -90 0 L ${-90 - 120 * k} ${-220 + 40 * k} L -60 ${-440 + drop}`} stroke={SIL} strokeWidth={74} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d={`M 90 0 L ${90 + 120 * k} ${-220 + 40 * k} L 60 ${-440 + drop}`} stroke={SIL} strokeWidth={74} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <g transform={`translate(0 ${drop})`}>
        <rect x={-222} y={-770} width={62} height={350} rx={30} fill={SIL} stroke={C.teal} strokeWidth={sw} transform={`rotate(${-30 * k} -190 -760)`} />
        <rect x={160} y={-770} width={62} height={350} rx={30} fill={SIL} stroke={C.teal} strokeWidth={sw} transform={`rotate(${30 * k} 190 -760)`} />
        <rect x={-165} y={-800} width={330} height={400} rx={90} fill={SIL} stroke={C.teal} strokeWidth={sw} />
        <rect x={-36} y={-850} width={72} height={70} fill={SIL} />
        <ellipse cx={0} cy={-915} rx={86} ry={100} fill={SIL} stroke={C.teal} strokeWidth={sw} />
      </g>
    </g>
  );
};

// the elevator shaft with floor numbers, 0 .. 10
export const Shaft: React.FC = () => (
  <g>
    <rect x={-400} y={-800} width={1880} height={GROUND + 1600} fill={WALL} />
    <rect x={CAB.x - 30} y={-800} width={CAB.w + 60} height={GROUND + 800} fill="#081019" />
    {Array.from({length: 11}, (_, i) => {
      const y = GROUND - i * 3 * PXM;
      return (
        <g key={i}>
          <line x1={CAB.x - 30} x2={CAB.x - 120} y1={y} y2={y} stroke={C.border} strokeWidth={6} />
          <text x={CAB.x - 140} y={y - 20} textAnchor="end" fontFamily={fontFamily} fontWeight={800} fontSize={64} fill={i === 10 ? C.text : C.muted}>{i}</text>
          <rect x={CAB.x + CAB.w + 30} y={y - 240} width={14} height={240} fill={C.border} />
        </g>
      );
    })}
    {/* guide rails */}
    <rect x={CAB.x - 22} y={-800} width={10} height={GROUND + 800} fill="#2a3a4c" />
    <rect x={CAB.x + CAB.w + 12} y={-800} width={10} height={GROUND + 800} fill="#2a3a4c" />
    <rect x={-400} y={GROUND} width={1880} height={800} fill="#05080c" />
    <line x1={-400} x2={1480} y1={GROUND} y2={GROUND} stroke={C.border} strokeWidth={6} />
    {/* buffer at the bottom of the pit */}
    <rect x={CAB.x + CAB.w / 2 - 50} y={GROUND - 60} width={100} height={60} rx={10} fill="#1d2a38" />
  </g>
);

// the cabin, bottom at (CAB.x, y); squash = 0..1 after the impact
export const Cabin: React.FC<{y: number; squash?: number; light?: number; children?: React.ReactNode}> = ({y, squash = 0, light = 1, children}) => {
  const h = CAB.h * (1 - 0.18 * squash);
  return (
    <g>
      <rect x={CAB.x} y={y - h} width={CAB.w} height={h} rx={10} fill="#132233" stroke={C.orange} strokeWidth={6} />
      <rect x={CAB.x + 10} y={y - h + 10} width={CAB.w - 20} height={18} rx={6} fill="#ffd25a" opacity={0.5 * light} />
      {children}
      <rect x={CAB.x} y={y - h} width={CAB.w} height={h} rx={10} fill="none" stroke={C.orange} strokeWidth={6} />
    </g>
  );
};

// ten-storey building for the floor comparison
export const Building: React.FC<{x: number; ground: number; floorH: number}> = ({x, ground, floorH}) => (
  <g>
    <rect x={x} y={ground - 10.4 * floorH} width={420} height={10.4 * floorH} rx={12} fill={WALL} stroke={RIM} strokeOpacity={0.4} strokeWidth={4} />
    {Array.from({length: 10}, (_, i) => (
      <g key={i}>
        {[0, 1, 2].map((k) => (
          <rect key={k} x={x + 40 + k * 125} y={ground - (i + 1) * floorH + 24} width={90} height={floorH - 48} rx={8} fill="#13283b" />
        ))}
      </g>
    ))}
  </g>
);

// brake wedges clamping a guide rail; c = 0 open .. 1 clamped
export const Wedge: React.FC<{x: number; y: number; c: number; side: number}> = ({x, y, c, side}) => (
  <path d={`M ${x + side * (40 - 30 * c)} ${y} l ${side * 30} -50 l 0 100 Z`} fill={C.orange} />
);
