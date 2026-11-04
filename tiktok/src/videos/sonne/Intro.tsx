// Test: the first ~35 s of the sun video fully animated (vector scenes, no stills), Kurzgesagt-style.
// Everything is drawn here; every scene keeps moving (camera, parallax, particles, characters).
import React from 'react';
import {AbsoluteFill, Audio, Easing, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {C} from '../../lib/theme';
import {Character, Face, Label as KLabel, MoodKeys, P as KP, cycle, kitFont} from '../../design/kit';
import {makeTiming, rise} from '../../lib/timing';
import timingJson from './timing.json';
import {Clock, SH, SW} from './Video';

const T = makeTiming(timingJson);
export const INTRO_DURATION = T.s('l1') - 4;

// ---------------------------------------------------------------------------------------
// helpers

export const rnd = (i: number) => {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};
export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const inOut = Easing.bezier(0.45, 0, 0.25, 1);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export type Cam = {x: number; y: number; z: number};
export type Key = [number, Cam];
// camera from keyframes: holds before the first and after the last key, eases between
export const camAt = (f: number, keys: Key[]): Cam => {
  if (f <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [fa, a] = keys[i];
    const [fb, b] = keys[i + 1];
    if (f <= fb) {
      const t = inOut(clamp01((f - fa) / Math.max(1, fb - fa)));
      return {x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t)};
    }
  }
  return keys[keys.length - 1][1];
};

// a layer at depth d (1 = moves with the camera, 0 = fixed to the screen) around world centre c
export const layer = (cam: Cam, d: number, c: {x: number; y: number}) => {
  const z = 1 + (cam.z - 1) * d;
  const x = c.x + (cam.x - c.x) * d;
  const y = c.y + (cam.y - c.y) * d;
  return `translate(${SW / 2} ${SH / 2}) scale(${z}) translate(${-x} ${-y})`;
};

export const Label: React.FC<{x: number; y: number; text: string; o: number; size?: number; color?: string; anchor?: 'start' | 'middle' | 'end'}> = ({
  x, y, text, o, size = 34, color = '#fff', anchor = 'middle',
}) => (
  <text x={x} y={y} fontFamily={kitFont} fontWeight={600} fontSize={size} fill={color} textAnchor={anchor} opacity={o}
    style={{paintOrder: 'stroke', stroke: 'rgba(5,8,25,0.55)', strokeWidth: size * 0.18}}>
    {text}
  </text>
);

// ---------------------------------------------------------------------------------------
// space pieces

export const STARS = Array.from({length: 260}, (_, i) => ({
  x: rnd(i) * 3400 - 700, y: rnd(i + 500) * 2000 - 460, r: 0.8 + rnd(i + 900) * 2.2, tw: rnd(i + 1300) * 6.28,
}));

export const Stars: React.FC<{f: number; dim?: number}> = ({f, dim = 1}) => (
  <g>
    {STARS.map((s, i) => (
      <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={dim * (0.35 + 0.45 * (0.5 + 0.5 * Math.sin(f * 0.07 + s.tw)))} />
    ))}
  </g>
);

export const Nebula: React.FC = () => (
  <g opacity={0.55}>
    <ellipse cx={1500} cy={250} rx={900} ry={320} fill="url(#neb1)" />
    <ellipse cx={300} cy={900} rx={800} ry={300} fill="url(#neb2)" />
  </g>
);

export const SUN = {x: 420, y: 540, r: 230};
export const EARTH = {x: 1560, y: 540, r: 110};

const GRAN = Array.from({length: 46}, (_, i) => ({a: rnd(i + 40) * 6.28, d: Math.sqrt(rnd(i + 80)) * 0.9, s: 0.06 + rnd(i + 120) * 0.1}));

export const Sun: React.FC<{f: number; x: number; y: number; r: number; scale: number; mood?: MoodKeys}> = ({f, x, y, r, scale, mood = cycle(['happy', 'joy', 'happy', 'curious'], 90, 3)}) => {
  if (scale <= 0.001) return null;
  const pulse = 1 + 0.025 * Math.sin(f * 0.12);
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <circle r={r * 2.1 * pulse} fill="url(#corona)" />
      <circle r={r * 1.35 * (1 + 0.04 * Math.sin(f * 0.09 + 1))} fill="url(#corona2)" />
      {/* slow rays */}
      <g transform={`rotate(${f * 0.15})`} opacity={0.35}>
        {Array.from({length: 12}, (_, i) => (
          <path key={i} d={`M ${-r * 0.12} 0 L 0 ${-r * (1.75 + 0.25 * Math.sin(f * 0.05 + i))} L ${r * 0.12} 0 Z`} fill="#ffd27a" transform={`rotate(${i * 30})`} />
        ))}
      </g>
      <circle r={r} fill="url(#sunBody)" />
      <clipPath id="sunClip"><circle r={r} /></clipPath>
      <g clipPath="url(#sunClip)">
        {GRAN.map((g, i) => {
          const a = g.a + f * 0.004;
          return <circle key={i} cx={Math.cos(a) * g.d * r} cy={Math.sin(a) * g.d * r} r={r * g.s * (1 + 0.2 * Math.sin(f * 0.1 + i))} fill="#fff3c4" opacity={0.18} />;
        })}
      </g>
      <circle r={r} fill="none" stroke="#fff1c0" strokeWidth={6} opacity={0.5} />
      {r >= 50 && <Face f={f} x={0} y={r * 0.08} w={r * 0.95} mood={mood} seed={11} skin="#ffd46b" />}
    </g>
  );
};

// continents as blobs on a strip that scrolls behind a circular window (= rotation)
const LAND = [
  [0.2, -0.35, 0.42, 0.28], [0.55, -0.05, 0.3, 0.45], [0.35, 0.45, 0.2, 0.25],
  [1.3, -0.4, 0.5, 0.25], [1.55, 0.05, 0.25, 0.5], [1.1, 0.25, 0.2, 0.18],
  [2.3, -0.2, 0.55, 0.35], [2.7, 0.35, 0.3, 0.22], [3.3, -0.5, 0.35, 0.2], [3.5, 0.2, 0.22, 0.3],
];
const CLOUDS = Array.from({length: 9}, (_, i) => [rnd(i + 7) * 4, rnd(i + 17) * 1.6 - 0.8, 0.25 + rnd(i + 27) * 0.35, 0.06 + rnd(i + 37) * 0.06]);

export const Earth: React.FC<{f: number; x: number; y: number; r: number; frozen?: boolean; id: string; mood?: MoodKeys; face?: boolean}> = ({f, x, y, r, frozen, id, mood, face = true}) => {
  const P = 4 * r;
  const off = (f * (frozen ? 0.15 : 0.5)) % P;
  const land = frozen ? '#dfe9f5' : '#4cc36f';
  const sea = frozen ? 'url(#iceSea)' : 'url(#sea)';
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={r * 1.22} fill={frozen ? 'url(#atmoCold)' : 'url(#atmo)'} />
      <clipPath id={`clip-${id}`}><circle r={r} /></clipPath>
      <g clipPath={`url(#clip-${id})`}>
        <circle r={r} fill={sea} />
        {[0, P].map((base) => (
          <g key={base} transform={`translate(${base - off - r * 2} 0)`}>
            {LAND.map(([lx, ly, rx, ry], i) => (
              <ellipse key={i} cx={lx * r} cy={ly * r} rx={rx * r} ry={ry * r} fill={land} />
            ))}
            {!frozen && LAND.map(([lx, ly, rx, ry], i) => (
              <ellipse key={`h${i}`} cx={lx * r + rx * r * 0.2} cy={ly * r - ry * r * 0.2} rx={rx * r * 0.45} ry={ry * r * 0.4} fill="#7ad98a" />
            ))}
          </g>
        ))}
        {!frozen && [0, P].map((base) => (
          <g key={`c${base}`} transform={`translate(${base - ((f * 0.8) % P) - r * 2} 0)`}>
            {CLOUDS.map(([cx, cy, rx, ry], i) => (
              <ellipse key={i} cx={cx * r} cy={cy * r} rx={rx * r} ry={ry * r} fill="#fff" opacity={0.8} />
            ))}
          </g>
        ))}
        {frozen && <circle r={r} fill="#0b1630" opacity={0.25} />}
        {/* lit from the left */}
        <circle r={r} fill="url(#shade)" />
      </g>
      {face && r >= 30 && (
        <Face f={f} x={-r * 0.05} y={r * 0.05} w={r * 0.95} seed={id.length + 5} skin={frozen ? '#5a7aa8' : '#3a8fe8'}
          mood={mood ?? (frozen ? cycle(['sad', 'sleepy'], 120, 2) : cycle(['happy', 'curious', 'happy', 'joy'], 85, 1))} />
      )}
    </g>
  );
};

// the stream of light from the sun to the earth; it only exists right of tailX
export const LightStream: React.FC<{f: number; tailX: number; o?: number; phase?: number}> = ({f, tailX, o = 1, phase}) => {
  const ph = phase ?? f * 3.2;
  const x0 = SUN.x + SUN.r * 0.9;
  const x1 = EARTH.x - EARTH.r * 0.9;
  const len = x1 - x0;
  const start = Math.max(x0, tailX);
  const halfAt = (x: number) => lerp(150, 70, clamp01((x - x0) / len));
  const parts = [];
  for (let i = 0; i < 150; i++) {
    const s = ((ph + i * (len / 150) * 3.7) % len + len) % len;
    const x = x0 + s;
    if (x < start) continue;
    const yy = SUN.y + (rnd(i + 3) * 2 - 1) * halfAt(x) * (0.25 + 0.75 * rnd(i + 11)) + Math.sin(f * 0.05 + i) * 4;
    parts.push(<circle key={i} cx={x} cy={yy} r={2 + rnd(i + 5) * 3.5} fill="#fff4cf" opacity={0.55 + 0.4 * rnd(i + 9)} />);
  }
  if (start >= x1) return null;
  return (
    <g opacity={o}>
      <path
        d={`M ${start} ${SUN.y - halfAt(start)} L ${x1} ${SUN.y - halfAt(x1)} L ${x1} ${SUN.y + halfAt(x1)} L ${start} ${SUN.y + halfAt(start)} Z`}
        fill="url(#beam)"
        opacity={0.55}
      />
      {parts}
      {tailX > x0 && (
        <ellipse cx={start} cy={SUN.y} rx={22} ry={halfAt(start) * 1.1} fill="url(#tailGlow)" />
      )}
    </g>
  );
};

export const Defs: React.FC = () => (
  <defs>
    <radialGradient id="spaceBg" cx="50%" cy="45%" r="75%">
      <stop offset="0" stopColor="#1c1747" />
      <stop offset="1" stopColor="#070a1e" />
    </radialGradient>
    <radialGradient id="neb1"><stop offset="0" stopColor="#7a3fd1" stopOpacity="0.6" /><stop offset="1" stopColor="#7a3fd1" stopOpacity="0" /></radialGradient>
    <radialGradient id="neb2"><stop offset="0" stopColor="#c9407a" stopOpacity="0.45" /><stop offset="1" stopColor="#c9407a" stopOpacity="0" /></radialGradient>
    <radialGradient id="corona"><stop offset="0.35" stopColor="#ffb547" stopOpacity="0.55" /><stop offset="1" stopColor="#ff7a2e" stopOpacity="0" /></radialGradient>
    <radialGradient id="corona2"><stop offset="0.6" stopColor="#ffe08a" stopOpacity="0.7" /><stop offset="1" stopColor="#ffb547" stopOpacity="0" /></radialGradient>
    <radialGradient id="sunBody" cx="42%" cy="40%" r="65%">
      <stop offset="0" stopColor="#fffbe8" /><stop offset="0.45" stopColor="#ffd46b" /><stop offset="1" stopColor="#ff8f2e" />
    </radialGradient>
    <radialGradient id="sea" cx="35%" cy="40%" r="70%"><stop offset="0" stopColor="#4aa3ff" /><stop offset="1" stopColor="#1f4fa8" /></radialGradient>
    <radialGradient id="iceSea" cx="35%" cy="40%" r="70%"><stop offset="0" stopColor="#8fb6e0" /><stop offset="1" stopColor="#2c4673" /></radialGradient>
    <radialGradient id="atmo"><stop offset="0.8" stopColor="#7fd0ff" stopOpacity="0.55" /><stop offset="1" stopColor="#7fd0ff" stopOpacity="0" /></radialGradient>
    <radialGradient id="atmoCold"><stop offset="0.8" stopColor="#9fb4ff" stopOpacity="0.25" /><stop offset="1" stopColor="#9fb4ff" stopOpacity="0" /></radialGradient>
    <linearGradient id="shade" x1="0" x2="1">
      <stop offset="0.35" stopColor="#050a20" stopOpacity="0" /><stop offset="1" stopColor="#050a20" stopOpacity="0.8" />
    </linearGradient>
    <linearGradient id="beam" x1="0" x2="1">
      <stop offset="0" stopColor="#ffd88a" stopOpacity="0.45" /><stop offset="1" stopColor="#ffd88a" stopOpacity="0.12" />
    </linearGradient>
    <radialGradient id="tailGlow"><stop offset="0" stopColor="#fff" stopOpacity="0.85" /><stop offset="1" stopColor="#ffd88a" stopOpacity="0" /></radialGradient>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#3f8ff0" /><stop offset="0.7" stopColor="#8fd0ff" /><stop offset="1" stopColor="#d7f1ff" />
    </linearGradient>
    <linearGradient id="grass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6fd36b" /><stop offset="1" stopColor="#2f9a4f" /></linearGradient>
    <radialGradient id="skySun"><stop offset="0.25" stopColor="#fff6c8" /><stop offset="0.5" stopColor="#ffe68a" stopOpacity="0.6" /><stop offset="1" stopColor="#ffe68a" stopOpacity="0" /></radialGradient>
  </defs>
);

// ---------------------------------------------------------------------------------------
// scene 1: space. The sun vanishes, its last light keeps flying towards the earth.

export const SpaceScene: React.FC<{f: number; cam: Cam; vanish: number; tailX: number; labels: number; title: number}> = ({f, cam, vanish, tailX, labels, title}) => {
  const k = (f - vanish) / 9;
  const swell = f < vanish ? 1 + 0.06 * rise(f, vanish - 8, 8) : 1;
  const sunScale = f < vanish ? swell : 1.06 * (1 - Easing.in(Easing.cubic)(clamp01(k)));
  const k2 = clamp01((f - vanish) / 34);
  const c = {x: 990, y: 540};
  const outline = rise(f, vanish + 18, 20);
  return (
    <>
      <rect width={SW} height={SH} fill="url(#spaceBg)" />
      <g transform={layer(cam, 0.15, c)}><Nebula /></g>
      <g transform={layer(cam, 0.35, c)}><Stars f={f} /></g>
      <g transform={layer(cam, 1, c)}>
        <LightStream f={f} tailX={tailX} />
        <Sun f={f} x={SUN.x} y={SUN.y} r={SUN.r} scale={sunScale} />
        {f >= vanish && k2 < 1 && (
          <circle cx={SUN.x} cy={SUN.y} r={SUN.r + 1100 * Easing.out(Easing.cubic)(k2)} fill="none" stroke="#fff4cf" strokeWidth={40 * (1 - k2)} opacity={1 - k2} />
        )}
        {f >= vanish && (
          <circle cx={SUN.x} cy={SUN.y} r={SUN.r} fill="none" stroke="#fff" strokeWidth={4} strokeDasharray="14 16" opacity={0.45 * outline}
            transform={`rotate(${f * 0.2} ${SUN.x} ${SUN.y})`} />
        )}
        <Earth f={f} x={EARTH.x} y={EARTH.y} r={EARTH.r} id="e1" />
        <KLabel f={f} at={0} show={labels * outline} text="hier war die Sonne" x={SUN.x} y={SUN.y + SUN.r + 60} color={KP.violet} point="none" />
        <KLabel f={f} at={0} show={labels * rise(f, vanish + 40, 16)} text="ihr letztes Licht" x={tailX + 20} y={SUN.y - 190} color={KP.orange} point="left" />
        <KLabel f={f} at={0} show={labels} text="du" x={EARTH.x} y={EARTH.y + EARTH.r + 60} color={KP.teal} point="none" />
      </g>
      {f >= vanish && <rect width={SW} height={SH} fill="#fff8e0" opacity={0.55 * (1 - clamp01((f - vanish) / 12))} />}
      {title > 0 && (
        <g opacity={title} transform={`translate(0 ${(1 - title) * 30})`}>
          <rect width={SW} height={SH} fill="#050818" opacity={0.35} />
          <text x={SW / 2} y={500} textAnchor="middle" fontFamily={kitFont} fontWeight={700} fontSize={150} fill="#fff" letterSpacing={2} style={{paintOrder: 'stroke', stroke: KP.indigo, strokeWidth: 18, strokeLinejoin: 'round'}}>DIE SONNE IST WEG</text>
          <rect x={SW / 2 - 470} y={548} width={940} height={84} fill={KP.orange} />
          <text x={SW / 2} y={608} textAnchor="middle" fontFamily={kitFont} fontWeight={600} fontSize={54} fill="#fff">… und du hast noch 8 Minuten</text>
        </g>
      )}
    </>
  );
};

// ---------------------------------------------------------------------------------------
// scene 2: the park. Sunny, warm, kids with kites — nobody notices anything.

export const PC = {x: 1200, y: 900}; // park world centre
export const SKY_SUN = {x: 1750, y: 260};

export const Tree: React.FC<{x: number; y: number; s: number; f: number; ph: number; c1?: string; c2?: string}> = ({x, y, s, f, ph, c1 = '#2fa65a', c2 = '#46c46c'}) => {
  const sway = Math.sin(f * 0.04 + ph) * 2.2;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x={-14} y={-150} width={28} height={150} rx={10} fill="#7a4a2f" />
      <g transform={`rotate(${sway} 0 -150)`}>
        <circle cx={0} cy={-230} r={105} fill={c1} />
        <circle cx={-70} cy={-185} r={70} fill={c1} />
        <circle cx={70} cy={-180} r={75} fill={c1} />
        <circle cx={-25} cy={-260} r={60} fill={c2} />
        <circle cx={40} cy={-215} r={45} fill={c2} />
      </g>
    </g>
  );
};

// kids are kit characters holding a kite string in the raised right hand
export const KID_S = 0.58;
export const kidHand = (x: number, y: number, s: number) => ({x: x + 91 * s * KID_S, y: y - 151 * s * KID_S});
export const Kid: React.FC<{x: number; y: number; f: number; shirt: string; run?: number; ph?: number; s?: number; hairStyle?: 'curly' | 'short' | 'pony'; hair?: string; skin?: string}> = ({
  x, y, f, shirt, run = 0, ph = 0, s = 1, hairStyle = 'short', hair = KP.ink, skin = KP.skin,
}) => (
  <Character f={f} x={x} y={y} s={s * KID_S} shirt={shirt} walk={run} seed={Math.round(ph * 10) + 3} hairStyle={hairStyle} hair={hair} skin={skin}
    arms="kite" mood={cycle(['joy', 'happy', 'joy', 'curious'], 70, Math.round(ph * 3))} look={{x: 0.3, y: -0.8}} />
);

export const Kite: React.FC<{hx: number; hy: number; kx: number; ky: number; f: number; c: string; c2: string; ph: number}> = ({hx, hy, kx, ky, f, c, c2, ph}) => {
  const x = kx + Math.sin(f * 0.05 + ph) * 26;
  const y = ky + Math.sin(f * 0.07 + ph * 2) * 18;
  const rot = Math.sin(f * 0.06 + ph) * 10;
  const tail = Array.from({length: 6}, (_, i) => {
    const t = i + 1;
    return {x: x - t * 8 + Math.sin(f * 0.2 + t + ph) * 14, y: y + 60 + t * 32};
  });
  return (
    <g>
      <path d={`M ${hx} ${hy} Q ${(hx + x) / 2 + 60} ${(hy + y) / 2 + 80} ${x} ${y + 40}`} stroke="rgba(255,255,255,0.8)" strokeWidth={2.5} fill="none" />
      <path d={`M ${x} ${y + 40} ${tail.map((p) => `L ${p.x} ${p.y}`).join(' ')}`} stroke="#fff" strokeWidth={2.5} fill="none" opacity={0.85} />
      {tail.filter((_, i) => i % 2 === 1).map((p, i) => <path key={i} d={`M ${p.x - 10} ${p.y - 7} L ${p.x + 10} ${p.y + 7} L ${p.x + 10} ${p.y - 7} L ${p.x - 10} ${p.y + 7} Z`} fill={c2} />)}
      <g transform={`rotate(${rot} ${x} ${y})`}>
        <path d={`M ${x} ${y - 62} L ${x + 44} ${y} L ${x} ${y + 40} L ${x - 44} ${y} Z`} fill={c} />
        <path d={`M ${x} ${y - 62} L ${x + 44} ${y} L ${x} ${y} Z`} fill={c2} />
        <path d={`M ${x} ${y} L ${x - 44} ${y} L ${x} ${y + 40} Z`} fill={c2} />
      </g>
    </g>
  );
};

export const Dog: React.FC<{f: number; x: number; y: number}> = ({f, x, y}) => {
  const dir = Math.cos(f * 0.025) >= 0 ? 1 : -1;
  const bob = Math.abs(Math.sin(f * 0.6)) * 10;
  const leg = Math.sin(f * 0.6) * 12;
  return (
    <g transform={`translate(${x} ${y - bob}) scale(${dir} 1)`}>
      <line x1={-24} y1={-14} x2={-24 - leg} y2={10} stroke="#8a5a36" strokeWidth={9} strokeLinecap="round" />
      <line x1={22} y1={-14} x2={22 + leg} y2={10} stroke="#8a5a36" strokeWidth={9} strokeLinecap="round" />
      <ellipse cx={0} cy={-26} rx={40} ry={20} fill="#c98a52" />
      <circle cx={42} cy={-46} r={18} fill="#c98a52" />
      <ellipse cx={36} cy={-58} rx={7} ry={13} fill="#8a5a36" />
      <Face f={f} x={46} y={-48} w={26} mood="joy" seed={31} skin="#c98a52" blush={false} />
      <path d={`M -38 -32 Q -60 ${-60 + Math.sin(f * 0.8) * 14} -52 -64`} stroke="#c98a52" strokeWidth={8} fill="none" strokeLinecap="round" />
    </g>
  );
};

export const Cloud: React.FC<{x: number; y: number; s: number}> = ({x, y, s}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} opacity={0.95}>
    <ellipse cx={0} cy={0} rx={120} ry={42} fill="#fff" />
    <circle cx={-40} cy={-24} r={46} fill="#fff" />
    <circle cx={30} cy={-36} r={58} fill="#fff" />
  </g>
);

export const Bird: React.FC<{x: number; y: number; f: number; ph: number}> = ({x, y, f, ph}) => {
  const w = Math.sin(f * 0.35 + ph) * 12;
  return <path d={`M ${x - 22} ${y - w} Q ${x - 10} ${y - 6} ${x} ${y} Q ${x + 10} ${y - 6} ${x + 22} ${y - w}`} stroke="#2b3a6b" strokeWidth={4} fill="none" strokeLinecap="round" />;
};

export const ParkScene: React.FC<{f: number; cam: Cam; night: number}> = ({f, cam, night}) => {
  const HZ = 1030; // horizon
  return (
    <>
      <g transform={layer(cam, 0.1, PC)}>
        <rect x={-1200} y={-1400} width={4800} height={3600} fill="url(#sky)" />
      </g>
      {/* the sun in the sky: this is light that left 8 minutes ago */}
      <g transform={layer(cam, 1, PC)} opacity={1 - night}>
        <circle cx={SKY_SUN.x} cy={SKY_SUN.y} r={260} fill="url(#skySun)" />
        <g transform={`rotate(${f * 0.2} ${SKY_SUN.x} ${SKY_SUN.y})`} opacity={0.5}>
          {Array.from({length: 16}, (_, i) => (
            <rect key={i} x={SKY_SUN.x - 5} y={SKY_SUN.y - 190} width={10} height={60} rx={5} fill="#fff3b0" transform={`rotate(${i * 22.5} ${SKY_SUN.x} ${SKY_SUN.y})`} />
          ))}
        </g>
        <circle cx={SKY_SUN.x} cy={SKY_SUN.y} r={95} fill="#fff7cf" />
        <Face f={f} x={SKY_SUN.x} y={SKY_SUN.y + 6} w={100} mood={cycle(['happy', 'joy', 'happy'], 80, 6)} seed={13} skin="#fff7cf" />
      </g>
      <g transform={layer(cam, 0.4, PC)}>
        <Cloud x={((300 + f * 0.6) % 3200) - 600} y={180} s={1.1} />
        <Cloud x={((1500 + f * 0.4) % 3200) - 600} y={420} s={0.8} />
        <Cloud x={((2600 + f * 0.5) % 3200) - 600} y={80} s={0.9} />
        {[0, 1, 2, 3].map((i) => (
          <Bird key={i} x={((i * 220 + f * 2.2) % 3000) - 400} y={350 + i * 30 + Math.sin(f * 0.03 + i) * 20} f={f} ph={i} />
        ))}
      </g>
      {/* skyline far away */}
      <g transform={layer(cam, 0.55, PC)}>
        {Array.from({length: 26}, (_, i) => {
          const w = 90 + rnd(i + 3) * 80;
          const h = 160 + rnd(i + 9) * 300;
          const x = -400 + i * 125;
          return (
            <g key={i}>
              <rect x={x} y={HZ - h} width={w} height={h + 40} fill={i % 2 ? '#7ea7e8' : '#90b6f0'} />
              {Array.from({length: Math.floor(h / 50)}, (_, j) => (
                <rect key={j} x={x + 14} y={HZ - h + 20 + j * 50} width={w - 28} height={14} fill="#b8d4fa" opacity={0.7} />
              ))}
            </g>
          );
        })}
      </g>
      <g transform={layer(cam, 0.75, PC)}>
        <path d={`M -800 ${HZ + 40} Q 400 ${HZ - 80} 1400 ${HZ + 10} T 3600 ${HZ + 20} L 3600 ${HZ + 300} L -800 ${HZ + 300} Z`} fill="#4fbf6a" />
        <Tree x={150} y={HZ + 60} s={0.8} f={f} ph={1} c1="#3aa864" c2="#52c47a" />
        <Tree x={2300} y={HZ + 50} s={0.9} f={f} ph={2} c1="#3aa864" c2="#52c47a" />
      </g>
      <g transform={layer(cam, 1, PC)}>
        <rect x={-800} y={HZ + 60} width={4400} height={1400} fill="url(#grass)" />
        <path d={`M -800 ${HZ + 420} Q 1200 ${HZ + 300} 3600 ${HZ + 460}`} stroke="#e8d8a8" strokeWidth={70} fill="none" opacity={0.8} />
        <Tree x={420} y={HZ + 300} s={1.25} f={f} ph={0} />
        <Tree x={2050} y={HZ + 280} s={1.1} f={f} ph={3} />
        {/* blanket with two people */}
        <g transform={`translate(720 ${HZ + 600}) scale(1.5)`}>
          <ellipse cx={0} cy={20} rx={190} ry={45} fill="#e8505b" />
          <ellipse cx={0} cy={20} rx={150} ry={30} fill="#f37b84" />
          <Character f={f} x={-60} y={30} s={0.46} shirt={KP.blue} hairStyle="short" hair="#3a2418" talk={Math.floor(f / 75) % 2 === 0} look={{x: 0.7, y: 0}} mood={cycle(['happy', 'joy', 'happy'], 75, 1)} seed={21} />
          <Character f={f} x={50} y={34} s={0.44} shirt={KP.yellow} hairStyle="pony" hair={KP.ink} skin={KP.skinDark} flip talk={Math.floor(f / 75) % 2 === 1} look={{x: 0.7, y: 0}} mood={cycle(['joy', 'happy', 'curious'], 75, 2)} seed={22} />
          <path d="M -190 20 A 190 45 0 0 0 190 20 Z" fill="#e8505b" />
          <path d="M -150 20 A 150 30 0 0 0 150 20 Z" fill="#f37b84" />
          <rect x={110} y={-10} width={50} height={36} rx={8} fill="#b5733f" />
        </g>
        {/* kids with kites */}
        <Kite hx={kidHand(1250, HZ + 560, 1.8).x} hy={kidHand(1250, HZ + 560, 1.8).y} kx={1480} ky={520} f={f} c="#ff5d50" c2="#ffb547" ph={0} />
        <Kid x={1250} y={HZ + 560} f={f} shirt="#ff5d50" run={0.2} s={1.8} hairStyle="curly" hair={KP.orange} />
        <Kite hx={kidHand(1640 + Math.sin(f * 0.05) * 90, HZ + 480, 1.62).x} hy={kidHand(1640 + Math.sin(f * 0.05) * 90, HZ + 480, 1.62).y} kx={1900} ky={640} f={f} c="#7a5cff" c2="#3fd2c2" ph={2} />
        <Kid x={1640 + Math.sin(f * 0.05) * 90} y={HZ + 480} f={f} shirt="#7a5cff" run={1} ph={1} s={1.62} skin={KP.skinDark} />
        <g transform={`translate(${1420 + Math.sin(f * 0.025) * 300} ${HZ + 680}) scale(1.6)`}><Dog f={f} x={0} y={0} /></g>
        {/* grass tufts in front */}
        {Array.from({length: 40}, (_, i) => {
          const x = -400 + i * 95 + rnd(i) * 40;
          const y = HZ + 700 + rnd(i + 2) * 300;
          const sw = Math.sin(f * 0.06 + i) * 6;
          return <path key={i} d={`M ${x - 10} ${y} Q ${x - 6 + sw} ${y - 30} ${x - 2 + sw} ${y - 44} M ${x} ${y} Q ${x + 4 + sw} ${y - 34} ${x + 10 + sw} ${y - 50} M ${x + 8} ${y} Q ${x + 14 + sw} ${y - 24} ${x + 22 + sw} ${y - 34}`} stroke="#2a8a46" strokeWidth={5} fill="none" strokeLinecap="round" />;
        })}
      </g>
      {/* a glimpse of what is coming: the scene drops into night for a moment */}
      {night > 0 && (
        <>
          <rect width={SW} height={SH} fill="#060a24" opacity={0.82 * night} />
          <g opacity={night}><Stars f={f} dim={0.7} /></g>
        </>
      )}
    </>
  );
};

// ---------------------------------------------------------------------------------------
// scene 3: "Für immer." — a frozen, dark earth drifting through empty space

export const FrozenScene: React.FC<{f: number; start: number}> = ({f, start}) => {
  const t = f - start;
  const z = 1.15 + t * 0.0025;
  return (
    <>
      <rect width={SW} height={SH} fill="#03050f" />
      <g transform={`translate(${-t * 0.4} 0)`}><Stars f={f} dim={0.8} /></g>
      <g transform={`translate(${SW / 2} ${SH / 2}) scale(${z}) translate(${-SW / 2 + 30 - t * 0.5} ${-SH / 2})`}>
        <Earth f={f} x={SW / 2} y={SH / 2} r={250} frozen id="frozen" mood={cycle(['sad', 'sleepy', 'sad'], 50, 1)} />
      </g>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.7) 100%)'}} />
    </>
  );
};

// ---------------------------------------------------------------------------------------
// timeline

export const IntroSvg: React.FC<{f: number}> = ({f}) => {

  const vanish = T.w('i1', 'verschwunden') + 4;
  const toEarth = T.s('i3') - 14; // rush into the earth, cut to the park
  const parkStart = T.s('i3') - 2;
  const frozenStart = T.w('i6', 'Für');
  const backToSpace = T.s('i7');
  const titleAt = T.w('i7', 'überlebt');

  // the end of the light stream travels away from where the sun was
  const tailX = (ff: number) => (ff < vanish ? -1e4 : SUN.x + SUN.r * 0.9 + (ff - vanish) * 3.6);

  const spaceCam = camAt(f, [
    [0, {x: 990, y: 540, z: 1.1}],
    [vanish, {x: 900, y: 540, z: 1.16}],
    [T.w('i2', 'Vor'), {x: 990, y: 560, z: 1.22}],
    [toEarth - 6, {x: 1060, y: 560, z: 1.3}],
    [parkStart, {x: EARTH.x, y: EARTH.y, z: 6.5}],
  ]);

  const HZ = 1030;
  const parkCam = camAt(f, [
    [parkStart, {x: 1250, y: 300, z: 1.35}],
    [T.s('i3') + 50, {x: 1200, y: HZ + 40, z: 1.0}],
    [T.w('i3b', 'sogar'), {x: 1300, y: 820, z: 1.05}],
    [T.w('i3b', 'Himmel') + 10, {x: SKY_SUN.x - 120, y: SKY_SUN.y + 120, z: 1.7}],
    [T.s('i4') + 10, {x: SKY_SUN.x - 160, y: SKY_SUN.y + 140, z: 1.75}],
    [T.w('i4', 'Kinder'), {x: 1050, y: HZ + 220, z: 1.1}],
    [T.w('i4', 'Drachen'), {x: 1500, y: HZ + 160, z: 1.12}],
    [T.s('i5'), {x: 1520, y: HZ + 120, z: 1.1}],
    [T.w('i5', 'Uhr'), {x: 1650, y: HZ - 140, z: 1.3}],
    [frozenStart, {x: 1500, y: HZ + 20, z: 1.05}],
  ]);
  const dunkel = T.w('i5', 'dunkel');
  const night = rise(f, dunkel - 2, 6) * (1 - rise(f, dunkel + 22, 18));

  const backCam = camAt(f, [
    [backToSpace, {x: EARTH.x - 40, y: EARTH.y, z: 2.6}],
    [titleAt - 10, {x: 1000, y: 540, z: 1.0}],
    [INTRO_DURATION, {x: 990, y: 540, z: 0.95}],
  ]);

  return (
      <>
        {f < parkStart && (
          <SpaceScene f={f} cam={spaceCam} vanish={vanish} tailX={tailX(f)} labels={rise(f, T.w('i2', 'Vor'), 14) * (1 - rise(f, toEarth - 6, 8))} title={0} />
        )}
        {f >= parkStart && f < frozenStart && <ParkScene f={f} cam={parkCam} night={night} />}
        {f >= frozenStart && f < backToSpace && <FrozenScene f={f} start={frozenStart} />}
        {f >= backToSpace && (
          <SpaceScene f={f} cam={backCam} vanish={-100} tailX={SUN.x + SUN.r * 0.9 + 520 + (f - backToSpace) * 1.2} labels={0} title={rise(f, titleAt, 18)} />
        )}
      </>
  );
};

export const SonneIntro: React.FC = () => {
  const f = useCurrentFrame();
  const flashOut = 1 - rise(f, INTRO_DURATION - 24, 22);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Audio src={staticFile('sonne/voice.wav')} />
      <Audio src={staticFile('sonne/ambient.wav')} volume={0.35} />
      <svg width={SW} height={SH} style={{position: 'absolute', opacity: flashOut}}>
        <Defs />
        <IntroSvg f={f} />
      </svg>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, transparent 60%, rgba(0,0,0,0.4) 100%)'}} />
      <div style={{opacity: flashOut}}><Clock /></div>
    </AbsoluteFill>
  );
};