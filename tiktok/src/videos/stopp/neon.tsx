// Shared neon pieces for "Was wäre, wenn die Erde aufhört, sich zu drehen?"
import React from 'react';
import {Face, Glow, MoodKeys, kitFont, rnd} from '../../design/kit';
import {N} from '../../design/flow';

export const DU = {skin: N.skin, hair: N.ink, hairStyle: 'short' as const, shirt: N.cyan, pants: N.navy, seed: 201};

export const Space: React.FC<{f: number; seed?: number; c?: string; stream?: number}> = ({f, seed = 0, c = N.bg, stream = 0}) => (
  <g>
    <rect x={-600} y={-600} width={3120} height={2280} fill={c} />
    <circle cx={960} cy={540} r={1100} fill={N.bg2} opacity={0.6} />
    {Array.from({length: 150}, (_, i) => {
      const x = ((rnd(i + seed) * 2400 - stream * (0.4 + rnd(i * 3)) ) % 2400 + 2400) % 2400 - 240;
      const tw = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(f * 0.1 + i));
      return stream > 0
        ? <rect key={i} x={x} y={rnd(i * 7 + seed) * 1080} width={4 + Math.min(80, stream * 0.02)} height={3} rx={1.5} fill={N.cream} opacity={0.5 * tw} />
        : <circle key={i} cx={x} cy={rnd(i * 7 + seed) * 1080} r={1.2 + rnd(i * 5) * 2.4} fill={N.cream} opacity={0.55 * tw} />;
    })}
  </g>
);

// glowing particle swarm (screenshot style)
export const Swarm: React.FC<{f: number; x: number; y: number; r: number; color?: string; n?: number; seed?: number; o?: number}> = ({f, x, y, r, color = N.blue, n = 50, seed = 0, o = 1}) => (
  <g opacity={o}>
    {Array.from({length: n}, (_, i) => {
      const a = rnd(i + seed) * Math.PI * 2 + f * 0.01 * (rnd(i * 3) - 0.5);
      const d = r * Math.sqrt(rnd(i * 5 + seed));
      return <circle key={i} cx={x + Math.cos(a) * d + Math.sin(f * 0.05 + i) * 8} cy={y + Math.sin(a) * d} r={3 + rnd(i * 7) * 8} fill={color} opacity={0.5 + 0.5 * rnd(i * 11)} />;
    })}
  </g>
);

// the neon earth. spin = continent offset in px; water/land can be swapped for the polar-ocean world
export const NeonEarth: React.FC<{f: number; x: number; y: number; r: number; spin?: number; mood?: MoodKeys; face?: boolean; id: string; night?: number}> = ({
  f, x, y, r, spin = 0, mood = 'happy', face = true, id, night = 0,
}) => {
  const span = r * 4;
  const conts = [[-0.6, -0.35, 0.42, 0.28, 10], [0.25, 0.05, 0.5, 0.34, -15], [-0.1, 0.55, 0.32, 0.2, 25], [1.2, -0.45, 0.35, 0.25, 5], [1.6, 0.25, 0.45, 0.3, -20], [-1.4, 0.3, 0.38, 0.26, 30]];
  return (
    <g>
      <Glow cx={x} cy={y} r={r * 1.5} color={N.cyan} o={0.45} />
      <defs>
        <radialGradient id={`${id}g`} cx="0.35" cy="0.3" r="0.9"><stop offset="0" stopColor="#4f7bff" /><stop offset="1" stopColor="#14207a" /></radialGradient>
        <clipPath id={`${id}c`}><circle cx={x} cy={y} r={r} /></clipPath>
      </defs>
      <circle cx={x} cy={y} r={r} fill={`url(#${id}g)`} />
      <g clipPath={`url(#${id}c)`}>
        {conts.map(([cx, cy, rx, ry, rot], i) => {
          const px = ((cx * r + spin) % span + span * 1.5) % span - span / 2;
          return <ellipse key={i} cx={x + px} cy={y + cy * r} rx={rx * r} ry={ry * r} fill={i % 2 ? N.green : N.teal} transform={`rotate(${rot} ${x + px} ${y + cy * r})`} />;
        })}
        <ellipse cx={x} cy={y - r * 0.97} rx={r * 0.6} ry={r * 0.18} fill={N.white} opacity={0.9} />
        <ellipse cx={x} cy={y + r * 0.98} rx={r * 0.55} ry={r * 0.16} fill={N.white} opacity={0.9} />
        <circle cx={x + r * 0.4} cy={y + r * 0.3} r={r} fill={N.deep} opacity={0.3 + 0.5 * night} />
      </g>
      <circle cx={x} cy={y} r={r} fill="none" stroke={N.cyan} strokeWidth={Math.max(3, r * 0.02)} opacity={0.9} />
      {face && <Face f={f} x={x} y={y + r * 0.08} w={r * 0.85} mood={mood} seed={202} skin={N.teal} />}
    </g>
  );
};

export const NeonSun: React.FC<{f: number; x: number; y: number; r: number; mood?: MoodKeys}> = ({f, x, y, r, mood = 'happy'}) => (
  <g>
    <Glow cx={x} cy={y} r={r * 2.6} color={N.orange} o={0.8} />
    <circle cx={x} cy={y} r={r * 1.15} fill={N.orange} opacity={0.5} />
    <circle cx={x} cy={y} r={r} fill={N.yellow} />
    <Face f={f} x={x} y={y + r * 0.08} w={r} mood={mood} seed={203} skin={N.yellow} />
  </g>
);

export const NeonMoon: React.FC<{f: number; x: number; y: number; r: number; mood?: MoodKeys}> = ({f, x, y, r, mood = 'determined'}) => (
  <g>
    <Glow cx={x} cy={y} r={r * 1.8} color={N.violet} o={0.5} />
    <circle cx={x} cy={y} r={r} fill="#d8d2ff" />
    <circle cx={x - r * 0.35} cy={y - r * 0.3} r={r * 0.18} fill="#a9a0ef" />
    <circle cx={x + r * 0.3} cy={y + r * 0.35} r={r * 0.13} fill="#a9a0ef" />
    <Face f={f} x={x} y={y + r * 0.1} w={r * 0.9} mood={mood} seed={204} skin="#d8d2ff" />
  </g>
);

export const Lbl: React.FC<{x: number; y: number; size?: number; color?: string; o?: number; anchor?: 'start' | 'middle' | 'end'; children: React.ReactNode}> = ({x, y, size = 48, color = N.cream, o = 1, anchor = 'middle', children}) => (
  <text x={x} y={y} textAnchor={anchor} fontFamily={kitFont} fontWeight={700} fontSize={size} fill={color} opacity={o}
    style={{paintOrder: 'stroke', stroke: N.ink, strokeWidth: size * 0.12, strokeLinejoin: 'round'}}>{children}</text>
);

// neon arrow from (x1,y1) to (x2,y2)
export const Arrow: React.FC<{x1: number; y1: number; x2: number; y2: number; color?: string; w?: number; o?: number}> = ({x1, y1, x2, y2, color = N.yellow, w = 10, o = 1}) => {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const h = w * 2.6;
  return (
    <g opacity={o}>
      <line x1={x1} y1={y1} x2={x2 - Math.cos(a) * h * 0.6} y2={y2 - Math.sin(a) * h * 0.6} stroke={color} strokeWidth={w} strokeLinecap="round" />
      <polygon points={`${x2},${y2} ${x2 - Math.cos(a - 0.5) * h},${y2 - Math.sin(a - 0.5) * h} ${x2 - Math.cos(a + 0.5) * h},${y2 - Math.sin(a + 0.5) * h}`} fill={color} />
    </g>
  );
};

export const House: React.FC<{x: number; y: number; s?: number; c?: string}> = ({x, y, s = 1, c = N.magenta}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x={-80} y={-150} width={160} height={150} fill={c} />
    <path d="M -100 -150 L 0 -240 L 100 -150 Z" fill={N.violet} />
    <rect x={-50} y={-110} width={40} height={40} rx={4} fill={N.yellow} />
    <rect x={14} y={-110} width={40} height={40} rx={4} fill={N.yellow} />
    <rect x={-20} y={-60} width={40} height={60} rx={4} fill={N.ink} />
  </g>
);

export const NTree: React.FC<{x: number; y: number; s?: number}> = ({x, y, s = 1}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x={-12} y={-120} width={24} height={120} rx={8} fill="#7a3a2a" />
    <circle cx={0} cy={-170} r={70} fill={N.green} />
    <circle cx={-45} cy={-130} r={46} fill={N.teal} />
    <circle cx={45} cy={-135} r={46} fill={N.teal} />
  </g>
);

export const Car: React.FC<{x: number; y: number; s?: number; c?: string}> = ({x, y, s = 1, c = N.orange}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x={-90} y={-60} width={180} height={44} rx={16} fill={c} />
    <path d="M -50 -60 L -30 -96 L 40 -96 L 60 -60 Z" fill={c} />
    <rect x={-22} y={-90} width={30} height={26} rx={4} fill={N.cyan} opacity={0.8} />
    <circle cx={-50} cy={-14} r={18} fill={N.ink} />
    <circle cx={50} cy={-14} r={18} fill={N.ink} />
    <circle cx={86} cy={-44} r={8} fill={N.yellow} />
  </g>
);

export const Thermo: React.FC<{x: number; y: number; lvl: number; hot: boolean; s?: number}> = ({x, y, lvl, hot, s = 1}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x={-26} y={-300} width={52} height={300} rx={26} fill={N.cream} />
    <rect x={-12} y={-280} width={24} height={250} rx={12} fill="#ddd" />
    <rect x={-12} y={-30 - 250 * lvl} width={24} height={250 * lvl} rx={12} fill={hot ? N.red : N.cyan} />
    <circle cx={0} cy={-10} r={34} fill={hot ? N.red : N.cyan} />
  </g>
);

// ---------------------------------------------------------------------------------------
// motion helpers: things fly in from a side with an overshoot, pop, wobble, leave
const back = (t: number) => { const c = 1.9; const u = t - 1; return 1 + (c + 1) * u * u * u + c * u * u; };
const cl = (v: number) => Math.min(1, Math.max(0, v));
export const inT = (f: number, at: number, d = 16) => cl((f - at) / d);

// slide in from 'r' | 'l' | 't' | 'b' with an overshoot; out (optional) flies off to the opposite side
export const FlyIn: React.FC<{f: number; at: number; from?: 'r' | 'l' | 't' | 'b'; dist?: number; d?: number; out?: number; spin?: number; children: React.ReactNode}> = ({
  f, at, from = 'r', dist = 1400, d = 18, out, spin = 0, children,
}) => {
  const t = inT(f, at, d);
  if (t <= 0) return null;
  const k = 1 - back(t);
  const o = out !== undefined ? cl((f - out) / 14) : 0;
  const ko = o * o;
  const dx = from === 'r' ? dist * k - dist * ko : from === 'l' ? -dist * k + dist * ko : 0;
  const dy = from === 'b' ? dist * k - dist * ko : from === 't' ? -dist * k + dist * ko : 0;
  return <g transform={`translate(${dx} ${dy}) rotate(${spin * k})`} opacity={1 - ko}>{children}</g>;
};

// scale pop around a point
export const Pop: React.FC<{f: number; at: number; x: number; y: number; d?: number; out?: number; children: React.ReactNode}> = ({f, at, x, y, d = 14, out, children}) => {
  const t = inT(f, at, d);
  if (t <= 0) return null;
  const s = back(t) * (out !== undefined ? 1 - cl((f - out) / 10) : 1);
  if (s <= 0.001) return null;
  return <g transform={`translate(${x} ${y}) scale(${s}) translate(${-x} ${-y})`}>{children}</g>;
};

// a burst of sparks at a point
export const Burst: React.FC<{f: number; at: number; x: number; y: number; color?: string; n?: number; r?: number}> = ({f, at, x, y, color = N.yellow, n = 16, r = 220}) => {
  const t = (f - at) / 22;
  if (t <= 0 || t >= 1) return null;
  return (
    <g>
      {Array.from({length: n}, (_, i) => {
        const a = (i / n) * Math.PI * 2 + i;
        const d0 = r * t; const d1 = r * Math.min(1, t + 0.25);
        return <line key={i} x1={x + Math.cos(a) * d0} y1={y + Math.sin(a) * d0} x2={x + Math.cos(a) * d1} y2={y + Math.sin(a) * d1} stroke={color} strokeWidth={8 * (1 - t)} strokeLinecap="round" />;
      })}
      <circle cx={x} cy={y} r={r * 0.4 * t} fill="none" stroke={N.white} strokeWidth={6 * (1 - t)} />
    </g>
  );
};

// things that keep crossing the frame from right to left (debris, dust, comets)
export const Crossers: React.FC<{f: number; n?: number; speed?: number; color?: string; y0?: number; y1?: number; seed?: number; size?: number}> = ({
  f, n = 12, speed = 18, color = N.cream, y0 = 0, y1 = 1080, seed = 0, size = 10,
}) => (
  <g>
    {Array.from({length: n}, (_, i) => {
      const sp = speed * (0.6 + rnd(i * 3 + seed));
      const x = 2100 - ((f * sp + rnd(i + seed) * 2400) % 2500);
      const y = y0 + rnd(i * 7 + seed) * (y1 - y0);
      const s = size * (0.5 + rnd(i * 5 + seed));
      return (
        <g key={i}>
          <line x1={x} y1={y} x2={x + sp * 5} y2={y} stroke={color} strokeWidth={s * 0.5} strokeLinecap="round" opacity={0.35} />
          <circle cx={x} cy={y} r={s * 0.5} fill={color} />
        </g>
      );
    })}
  </g>
);
