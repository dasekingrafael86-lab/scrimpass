// Shared pieces for the sun video in the word-flash look (without words):
// flat, saturated kit scenes, one composed picture per sentence, slow drift, hard cuts.
import React from 'react';
import {interpolate} from 'remotion';
import {Face, Glow, MoodKeys, P, kitFont, rnd} from '../../design/kit';

export const lin = (f: number, a: number, b: number, v0: number, v1: number) =>
  interpolate(f, [a, Math.max(b, a + 1)], [v0, v1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
export const mixC = (a: string, b: string, t: number) => {
  const h = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const [x, y] = [h(a), h(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * Math.max(0, Math.min(1, t))).toString(16).padStart(2, '0')).join('')}`;
};

export const BG: React.FC<{c: string}> = ({c}) => <rect x={-400} y={-400} width={2720} height={1880} fill={c} />;

export const Stars: React.FC<{f: number; n?: number; h?: number; seed?: number; o?: number}> = ({f, n = 120, h = 1080, seed = 0, o = 1}) => (
  <g opacity={o}>
    {Array.from({length: n}, (_, i) => (
      <circle key={i} cx={-200 + rnd(i + seed) * 2320} cy={-100 + rnd(i * 3 + 7 + seed) * (h + 200)} r={1.5 + rnd(i * 5 + seed) * 2.8} fill={P.cream}
        opacity={0.25 + 0.65 * (0.5 + 0.5 * Math.sin(f * 0.1 + i * 1.7)) * rnd(i * 11 + seed)} />
    ))}
  </g>
);

export const Text: React.FC<{x: number; y: number; size?: number; color?: string; o?: number; anchor?: 'start' | 'middle' | 'end'; children: React.ReactNode}> = ({
  x, y, size = 56, color = P.cream, o = 1, anchor = 'middle', children,
}) => (
  <text x={x} y={y} textAnchor={anchor} fontFamily={kitFont} fontWeight={700} fontSize={size} fill={color} opacity={o}
    style={{paintOrder: 'stroke', stroke: P.night, strokeWidth: size * 0.1, strokeLinejoin: 'round'}}>{children}</text>
);

// the sun with a face; o = brightness (0 = gone)
export const Sun: React.FC<{f: number; x: number; y: number; r: number; mood?: MoodKeys; o?: number; seed?: number}> = ({f, x, y, r, mood = 'happy', o = 1, seed = 11}) => (
  <g opacity={o}>
    <Glow cx={x} cy={y} r={r * 2.4} color={P.orange} o={0.7} />
    {Array.from({length: 12}, (_, i) => {
      const a = (i / 12) * Math.PI * 2 + f * 0.004;
      return <path key={i} d={`M ${x + Math.cos(a) * r * 1.12} ${y + Math.sin(a) * r * 1.12} L ${x + Math.cos(a) * r * 1.36} ${y + Math.sin(a) * r * 1.36}`} stroke={P.yellow} strokeWidth={r * 0.12} strokeLinecap="round" />;
    })}
    <circle cx={x} cy={y} r={r} fill={P.yellow} />
    <circle cx={x + r * 0.18} cy={y + r * 0.18} r={r * 0.82} fill={P.orange} opacity={0.25} />
    <Face f={f} x={x} y={y + r * 0.08} w={r * 1.05} mood={mood} seed={seed} skin={P.yellow} />
  </g>
);

// the earth; face can be switched off
export const Earth: React.FC<{f: number; x: number; y: number; r: number; mood?: MoodKeys; face?: boolean; night?: number; ice?: number; lights?: number; spin?: number}> = ({
  f, x, y, r, mood = 'happy', face = true, night = 0, ice = 0, lights = 0, spin = 0,
}) => {
  const id = `earthClip${Math.round(x)}${Math.round(y)}${Math.round(r)}`;
  const sh = (f * 0.4 + spin) % (r * 4);
  return (
    <g>
      <defs><clipPath id={id}><circle cx={x} cy={y} r={r} /></clipPath></defs>
      <circle cx={x} cy={y} r={r} fill={mixC(P.blue, '#c9d8ff', ice)} />
      <g clipPath={`url(#${id})`}>
        {[[-0.5, -0.3, 0.45, 0.3], [0.3, 0.1, 0.5, 0.35], [-0.2, 0.55, 0.35, 0.2], [0.9, -0.5, 0.3, 0.25], [-1.2, 0.2, 0.4, 0.3]].map(([cx, cy, rx, ry], i) => (
          <ellipse key={i} cx={x + cx * r + ((sh / r) % 4 > 2 ? 0 : 0) - ((f * 0.4 + spin) % (r * 2.6)) + r * 1.3} cy={y + cy * r} rx={rx * r} ry={ry * r}
            fill={mixC(P.green, '#ffffff', ice)} transform={`rotate(${i * 25} ${x + cx * r} ${y + cy * r})`} />
        ))}
        <ellipse cx={x} cy={y - r * 0.95} rx={r * 0.7} ry={r * 0.22} fill="#fff" opacity={0.9} />
        <ellipse cx={x} cy={y + r * 0.97} rx={r * 0.6} ry={r * 0.18} fill="#fff" opacity={0.9} />
        <circle cx={x + r * 0.35} cy={y + r * 0.25} r={r} fill={P.night} opacity={0.25} />
        <rect x={x - r} y={y - r} width={2 * r} height={2 * r} fill={P.night} opacity={0.82 * night} />
        {lights > 0 && Array.from({length: 14}, (_, i) => (
          <circle key={i} cx={x + (rnd(i * 3) - 0.5) * 1.4 * r} cy={y + (rnd(i * 7) - 0.5) * 1.3 * r} r={r * 0.025} fill={P.yellow} opacity={lights * (0.6 + 0.4 * Math.sin(f * 0.2 + i))} />
        ))}
      </g>
      {face && <Face f={f} x={x} y={y + r * 0.08} w={r * 0.9} mood={mood} seed={12} skin={mixC(P.green, '#ffffff', ice)} kind="object" />}
    </g>
  );
};

export const Planet: React.FC<{f: number; x: number; y: number; r: number; color: string; band?: string; ring?: string; mood?: MoodKeys; face?: boolean; o?: number; seed?: number}> = ({
  f, x, y, r, color, band, ring, mood = 'happy', face = true, o = 1, seed = 20,
}) => (
  <g opacity={o}>
    {ring && <ellipse cx={x} cy={y} rx={r * 1.9} ry={r * 0.45} fill="none" stroke={ring} strokeWidth={r * 0.16} transform={`rotate(-14 ${x} ${y})`} />}
    <circle cx={x} cy={y} r={r} fill={color} />
    {band && <path d={`M ${x - r * 0.95} ${y - r * 0.25} Q ${x} ${y - r * 0.45} ${x + r * 0.95} ${y - r * 0.25} M ${x - r * 0.9} ${y + r * 0.35} Q ${x} ${y + r * 0.15} ${x + r * 0.9} ${y + r * 0.35}`} stroke={band} strokeWidth={r * 0.16} fill="none" />}
    <circle cx={x + r * 0.3} cy={y + r * 0.25} r={r * 0.9} fill={P.night} opacity={0.2} />
    {ring && <path d={`M ${x - r * 1.85} ${y + r * 0.4} Q ${x} ${y + r * 0.9} ${x + r * 1.85} ${y - r * 0.5}`} fill="none" stroke={ring} strokeWidth={r * 0.16} transform={`rotate(-14 ${x} ${y})`} opacity={0.95} />}
    {face && <Face f={f} x={x} y={y + r * 0.08} w={r * 0.95} mood={mood} seed={seed} skin={color} />}
  </g>
);

export const Moon: React.FC<{f: number; x: number; y: number; r: number; mood?: MoodKeys; o?: number}> = ({f, x, y, r, mood = 'sleepy', o = 1}) => (
  <g opacity={o}>
    <Glow cx={x} cy={y} r={r * 2} color={P.cream} o={0.35} />
    <circle cx={x} cy={y} r={r} fill={P.cream} />
    <circle cx={x - r * 0.4} cy={y - r * 0.3} r={r * 0.16} fill={P.lilac} opacity={0.35} />
    <circle cx={x + r * 0.35} cy={y + r * 0.4} r={r * 0.12} fill={P.lilac} opacity={0.35} />
    <Face f={f} x={x} y={y + r * 0.1} w={r * 0.95} mood={mood} seed={13} skin={P.cream} />
  </g>
);

// the family dog, side view, facing right (flip to face left). feet at y
export const Dog: React.FC<{f: number; x: number; y: number; s?: number; flip?: boolean; walk?: number; mood?: MoodKeys; sit?: boolean}> = ({
  f, x, y, s = 1, flip, walk = 0, mood = 'joy', sit,
}) => {
  const leg = Math.sin(f * 0.5) * 14 * walk;
  const wag = Math.sin(f * 0.7) * 16;
  const fur = '#c98a52';
  const dark = '#8a5a36';
  return (
    <g transform={`translate(${x} ${y}) scale(${(flip ? -1 : 1) * s} ${s})`}>
      <ellipse cx={0} cy={2} rx={60} ry={8} fill="#000" opacity={0.12} />
      {sit ? (
        <g>
          <path d={`M -44 -40 Q ${-80} ${-70 + wag * 0.3} -86 -48`} stroke={fur} strokeWidth={12} fill="none" strokeLinecap="round" />
          <ellipse cx={-20} cy={-34} rx={36} ry={30} fill={fur} />
          <rect x={6} y={-60} width={16} height={60} rx={8} fill={dark} />
          <rect x={22} y={-60} width={16} height={60} rx={8} fill={fur} />
          <ellipse cx={8} cy={-72} rx={30} ry={36} fill={fur} />
        </g>
      ) : (
        <g>
          <path d={`M -50 -52 Q -80 ${-80 + wag} -84 -96`} stroke={fur} strokeWidth={12} fill="none" strokeLinecap="round" />
          <rect x={-46 - leg} y={-46} width={16} height={46} rx={8} fill={dark} />
          <rect x={30 + leg} y={-46} width={16} height={46} rx={8} fill={dark} />
          <rect x={-34 + leg} y={-46} width={16} height={46} rx={8} fill={fur} />
          <rect x={18 - leg} y={-46} width={16} height={46} rx={8} fill={fur} />
          <ellipse cx={0} cy={-58} rx={58} ry={26} fill={fur} />
        </g>
      )}
      {/* head */}
      <g transform={sit ? 'translate(-6 -50)' : undefined}>
        <rect x={34} y={-98} width={26} height={36} rx={12} fill={fur} />
        <circle cx={62} cy={-104} r={26} fill={fur} />
        <ellipse cx={86} cy={-96} rx={18} ry={12} fill={fur} />
        <circle cx={102} cy={-98} r={7} fill={P.ink} />
        <ellipse cx={52} cy={-112} rx={10} ry={20} fill={dark} transform="rotate(20 52 -112)" />
        <Face f={f} x={70} y={-104} w={30} mood={mood} seed={31} skin={fur} blush={false} />
      </g>
    </g>
  );
};

export const Tree: React.FC<{x: number; y: number; s?: number; leaf?: string; f?: number}> = ({x, y, s = 1, leaf = P.green, f = 0}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x={-14} y={-150} width={28} height={150} rx={10} fill="#7a4a2a" />
    <g transform={`rotate(${Math.sin(f * 0.04) * 2} 0 -150)`}>
      <circle cx={0} cy={-210} r={80} fill={leaf} />
      <circle cx={-60} cy={-170} r={56} fill={leaf} />
      <circle cx={60} cy={-170} r={56} fill={leaf} />
      <circle cx={20} cy={-240} r={50} fill={leaf} opacity={0.85} />
    </g>
  </g>
);

export const Cloud: React.FC<{x: number; y: number; s?: number; c?: string}> = ({x, y, s = 1, c = '#fff'}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <ellipse cx={0} cy={0} rx={130} ry={44} fill={c} />
    <circle cx={-44} cy={-26} r={48} fill={c} />
    <circle cx={34} cy={-38} r={60} fill={c} />
  </g>
);

// a light pulse travelling from a to b, p = 0..1
export const LightPulse: React.FC<{x0: number; y0: number; x1: number; y1: number; p: number; color?: string; w?: number}> = ({x0, y0, x1, y1, p, color = P.yellow, w = 8}) => {
  const x = x0 + (x1 - x0) * p; const y = y0 + (y1 - y0) * p;
  return (
    <g>
      <line x1={x0} y1={y0} x2={x1} y2={y1} stroke={P.cream} strokeWidth={3} strokeDasharray="8 14" opacity={0.3} />
      <line x1={x0} y1={y0} x2={x} y2={y} stroke={color} strokeWidth={w} strokeLinecap="round" opacity={0.85} />
      <Glow cx={x} cy={y} r={40} color={color} o={0.8} />
      <circle cx={x} cy={y} r={w * 1.4} fill={P.white} />
    </g>
  );
};

// a day/night park on a hill — the home picture of the cast
export const Park: React.FC<{f: number; night?: number; sunO?: number; sunMood?: MoodKeys; sunX?: number; sunY?: number; children?: React.ReactNode}> = ({
  f, night = 0, sunO = 1, sunMood = 'happy', sunX = 1250, sunY = 240, children,
}) => (
  <g>
    <defs>
      <linearGradient id={`parkSky${Math.round(night * 10)}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={mixC(P.sky, P.night, night)} />
        <stop offset="1" stopColor={mixC('#c9f2ff', P.indigo, night)} />
      </linearGradient>
    </defs>
    <BG c={`url(#parkSky${Math.round(night * 10)})`} />
    <Stars f={f} o={night} h={700} seed={4} />
    <Sun f={f} x={sunX} y={sunY} r={90} mood={sunMood} o={sunO * (1 - night)} />
    {night < 0.5 && <><Cloud x={((f * 0.5) % 2600) - 300} y={170} s={0.9} /><Cloud x={((f * 0.5 + 1300) % 2600) - 300} y={300} s={0.6} /></>}
    <path d="M -400 780 Q 300 600 1000 720 Q 1600 820 2300 680 L 2300 1500 L -400 1500 Z" fill={mixC(P.teal, '#13306a', night)} />
    <path d="M -400 880 Q 500 780 1100 860 Q 1600 920 2300 840 L 2300 1500 L -400 1500 Z" fill={mixC(P.green, '#1c3a7a', night)} />
    <Tree x={260} y={790} s={1.1} leaf={mixC(P.green, '#1c3a7a', night * 0.9)} f={f} />
    <Tree x={1720} y={760} s={0.9} leaf={mixC(P.teal, '#1c3a7a', night * 0.9)} f={f + 40} />
    {children}
  </g>
);

export const Blanket: React.FC<{x: number; y: number}> = ({x, y}) => (
  <g>
    <path d={`M ${x - 260} ${y} L ${x + 260} ${y} L ${x + 300} ${y + 70} L ${x - 300} ${y + 70} Z`} fill={P.red} />
    {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={x - 250 + i * 110} y={y} width={50} height={70} fill={P.cream} opacity={0.5} transform={`skewX(${-20 + i * 10})`} />)}
  </g>
);

// box-style house for street scenes; lit = window glow
export const House: React.FC<{x: number; y: number; w?: number; h?: number; c?: string; roof?: string; lit?: number; snow?: number}> = ({x, y, w = 260, h = 220, c = P.pink, roof = P.violet, lit = 0, snow = 0}) => (
  <g>
    <rect x={x} y={y - h} width={w} height={h} fill={c} />
    <path d={`M ${x - 20} ${y - h} L ${x + w / 2} ${y - h - 110} L ${x + w + 20} ${y - h} Z`} fill={roof} />
    {snow > 0 && <path d={`M ${x - 20} ${y - h} L ${x + w / 2} ${y - h - 110} L ${x + w + 20} ${y - h} L ${x + w} ${y - h + 8} L ${x + w / 2} ${y - h - 92} L ${x} ${y - h + 8} Z`} fill="#fff" opacity={snow} />}
    {[0, 1].map((i) => <rect key={i} x={x + 30 + i * (w - 120)} y={y - h + 50} width={60} height={60} rx={6} fill={lit > 0 ? P.yellow : P.navy} opacity={lit > 0 ? 0.4 + 0.6 * lit : 1} />)}
    <rect x={x + w / 2 - 30} y={y - 100} width={60} height={100} rx={8} fill={P.night} opacity={0.6} />
  </g>
);

// a thermometer sign, value in °C
export const ThermoSign: React.FC<{x: number; y: number; t: number; s?: number}> = ({x, y, t, s = 1}) => {
  const lvl = Math.max(0, Math.min(1, (t + 80) / 120));
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x={-70} y={-360} width={140} height={360} rx={30} fill={P.cream} />
      <rect x={-16} y={-330} width={32} height={260} rx={16} fill="#ddd" />
      <rect x={-16} y={-70 - 260 * lvl} width={32} height={260 * lvl} rx={16} fill={t < 0 ? P.sky : P.red} />
      <circle cx={0} cy={-60} r={30} fill={t < 0 ? P.sky : P.red} />
      <text x={0} y={30} textAnchor="middle" fontFamily={kitFont} fontWeight={700} fontSize={60} fill={P.cream}
        style={{paintOrder: 'stroke', stroke: P.night, strokeWidth: 6}}>{Math.round(t)} °C</text>
    </g>
  );
};
