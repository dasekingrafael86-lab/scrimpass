// Design kit for the 16:9 explainers: one palette, one rounded font, faces with living
// expressions, simple characters, and text that lives inside the scene (tags, labels, bubbles).
// Every new scene should be built from these pieces so the whole video shares one style.
import React from 'react';
import {Easing, interpolate} from 'remotion';
import {loadFont} from '@remotion/google-fonts/Fredoka';

export const {fontFamily: kitFont} = loadFont('normal', {weights: ['500', '600', '700'], subsets: ['latin', 'latin-ext']});

// ---------------------------------------------------------------------------------------
// palette (taken from the Kurzgesagt reference frames): deep base, strong saturated accents

export const P = {
  night: '#0b0d3a',
  navy: '#141a6b',
  indigo: '#2a1f8f',
  violet: '#5b3cc4',
  lilac: '#9b7cf0',
  magenta: '#e04fd0',
  pink: '#ff6fae',
  skin: '#f39a8c',
  skinDark: '#c96a5a',
  skinPink: '#e8739e',
  cream: '#fdf4cf',
  yellow: '#ffd23f',
  orange: '#ff8a1f',
  red: '#ff4d5a',
  teal: '#2fd6a5',
  green: '#3fe27a',
  sky: '#3ec6f0',
  blue: '#2f6bff',
  white: '#ffffff',
  ink: '#120a3a', // eyes, mouths, outlines
};

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = Easing.bezier(0.45, 0, 0.25, 1);
export const rnd = (i: number) => {
  const x = Math.sin(i * 91.17 + 12.3) * 43758.5453;
  return x - Math.floor(x);
};
export const pop = (f: number, at: number, dur = 10) => {
  // 0 -> overshoot -> 1, for things popping into view
  const t = clamp((f - at) / dur);
  return t <= 0 ? 0 : Easing.out(Easing.back(2.2))(t);
};

// ---------------------------------------------------------------------------------------
// faces

export type Mood = 'neutral' | 'happy' | 'joy' | 'curious' | 'worried' | 'shocked' | 'sad' | 'sleepy' | 'determined';

type MoodShape = {brow: number; browY: number; lid: number; mw: number; mh: number; curve: number; open: number};
// brow: tilt (+ = worried, inner ends up), browY: lift, lid: 0 open .. 1 closed,
// mouth: width, height, curve (+ smile / - frown), open (0 line .. 1 wide)
const MOODS: Record<Mood, MoodShape> = {
  neutral: {brow: 0, browY: 0, lid: 0.1, mw: 0.26, mh: 0.05, curve: 0.2, open: 0},
  happy: {brow: -0.05, browY: 0.04, lid: 0.15, mw: 0.34, mh: 0.12, curve: 1, open: 0.25},
  joy: {brow: -0.1, browY: 0.1, lid: 0.0, mw: 0.42, mh: 0.2, curve: 1, open: 0.9},
  curious: {brow: -0.2, browY: 0.08, lid: 0.0, mw: 0.16, mh: 0.1, curve: 0.1, open: 0.5},
  worried: {brow: 0.35, browY: 0.06, lid: 0.15, mw: 0.24, mh: 0.08, curve: -0.6, open: 0.2},
  shocked: {brow: 0.15, browY: 0.16, lid: -0.1, mw: 0.22, mh: 0.24, curve: 0, open: 1},
  sad: {brow: 0.45, browY: 0.0, lid: 0.35, mw: 0.26, mh: 0.08, curve: -1, open: 0},
  sleepy: {brow: 0, browY: -0.04, lid: 0.7, mw: 0.18, mh: 0.06, curve: 0.3, open: 0.1},
  determined: {brow: -0.35, browY: -0.02, lid: 0.25, mw: 0.3, mh: 0.06, curve: 0.3, open: 0},
};

export type MoodKeys = Mood | [number, Mood][];
// a mood that keeps changing on its own (e.g. happy -> joy -> happy ...), so faces never freeze
export const cycle = (moods: Mood[], period = 80, seed = 0, until = 18000): [number, Mood][] =>
  Array.from({length: Math.ceil(until / period)}, (_, i) => [i * period + Math.floor(rnd(i + seed * 7) * 20), moods[(i + seed) % moods.length]]);
const moodAt = (f: number, keys: MoodKeys): MoodShape => {
  if (typeof keys === 'string') return MOODS[keys];
  let cur = MOODS[keys[0][1]];
  for (let i = 0; i < keys.length; i++) {
    const [at, m] = keys[i];
    if (f < at) break;
    const prev = cur;
    const t = ease(clamp((f - at) / 8));
    const next = MOODS[m];
    cur = Object.fromEntries(Object.keys(next).map((k) => [k, (prev as any)[k] + ((next as any)[k] - (prev as any)[k]) * t])) as MoodShape;
  }
  return cur;
};

// eyes wander on their own (small saccades) unless a direction is given
const gaze = (f: number, seed: number) => {
  const slot = Math.floor((f + seed * 37) / 55);
  const t = ease(clamp(((f + seed * 37) % 55) / 7));
  const a = {x: rnd(slot * 3 + seed) * 2 - 1, y: (rnd(slot * 5 + seed) * 2 - 1) * 0.6};
  const b = {x: rnd((slot + 1) * 3 + seed) * 2 - 1, y: (rnd((slot + 1) * 5 + seed) * 2 - 1) * 0.6};
  return {x: (a.x + (b.x - a.x) * t) * 0.6, y: (a.y + (b.y - a.y) * t) * 0.6};
};
const blinkAt = (f: number, seed: number) => {
  const period = 85 + Math.floor(rnd(seed) * 60);
  const k = (f + seed * 13) % period;
  return k < 6 ? Math.sin((k / 6) * Math.PI) : 0;
};

export type FaceProps = {
  f: number;
  x: number;
  y: number;
  w: number; // face width
  mood?: MoodKeys;
  look?: {x: number; y: number}; // -1..1, overrides the wandering
  talk?: boolean;
  seed?: number;
  kind?: 'object' | 'human'; // big white eyes for things, dark dot eyes for people
  blush?: boolean;
  ink?: string;
  skin?: string; // colour of the eyelids (the surface the face sits on)
};

export const Face: React.FC<FaceProps> = ({f, x, y, w, mood = 'neutral', look, talk, seed = 1, kind = 'object', blush = true, ink = P.ink, skin = P.skin}) => {
  const m = moodAt(f, mood);
  const g = look ?? gaze(f, seed);
  const blink = blinkAt(f, seed);
  const lid = clamp(m.lid + blink * (1 - m.lid), -0.1, 1);
  const ex = w * 0.24;
  const eyeR = kind === 'object' ? w * 0.15 : w * 0.075;
  const ey = -w * 0.06;
  const talkOpen = talk ? 0.35 + 0.35 * Math.abs(Math.sin(f * 0.55 + seed)) : 0;
  const open = clamp(m.open + talkOpen, 0, 1);
  const mw = w * m.mw;
  const mh = w * m.mh * (0.4 + open);
  const my = w * 0.2;
  const c = m.curve * w * 0.08;
  return (
    <g transform={`translate(${x} ${y})`}>
      {blush && <>
        <ellipse cx={-ex - w * 0.06} cy={w * 0.1} rx={w * 0.08} ry={w * 0.05} fill={P.pink} opacity={0.45} />
        <ellipse cx={ex + w * 0.06} cy={w * 0.1} rx={w * 0.08} ry={w * 0.05} fill={P.pink} opacity={0.45} />
      </>}
      {[-1, 1].map((sd) => {
        const cx = sd * ex;
        const cy = ey;
        const px = cx + g.x * eyeR * (kind === 'object' ? 0.45 : 0.3);
        const py = cy + g.y * eyeR * 0.4;
        const lidH = eyeR * 2 * clamp(lid);
        return (
          <g key={sd}>
            {kind === 'object' ? (
              <>
                <ellipse cx={cx} cy={cy} rx={eyeR} ry={eyeR * 1.08} fill={P.white} />
                <circle cx={px} cy={py} r={eyeR * 0.55} fill={ink} />
                <circle cx={px + eyeR * 0.18} cy={py - eyeR * 0.2} r={eyeR * 0.16} fill={P.white} opacity={0.9} />
              </>
            ) : (
              <ellipse cx={px} cy={py} rx={eyeR} ry={eyeR * 1.15} fill={ink} />
            )}
            {/* eyelid closing from the top for blinks and sleepy looks */}
            {lid > 0.02 && (kind === 'object' ? (
              <>
                <clipPath id={`lid-${seed}-${sd}-${Math.round(w)}`}><ellipse cx={cx} cy={cy} rx={eyeR * 1.02} ry={eyeR * 1.1} /></clipPath>
                <rect clipPath={`url(#lid-${seed}-${sd}-${Math.round(w)})`} x={cx - eyeR * 1.1} y={cy - eyeR * 1.15} width={eyeR * 2.2} height={lidH + 1} fill={skin} />
              </>
            ) : (
              <rect x={cx - eyeR * 1.15} y={cy - eyeR * 1.2} width={eyeR * 2.3} height={lidH + 1} rx={eyeR * 0.5} fill={skin} />
            ))}
            {/* brows */}
            <path
              d={`M ${cx - eyeR * 1.0} ${cy - eyeR * (1.55 + m.browY * 6) + sd * m.brow * eyeR * -0.8} Q ${cx} ${cy - eyeR * (1.85 + m.browY * 6)} ${cx + eyeR * 1.0} ${cy - eyeR * (1.55 + m.browY * 6) - sd * m.brow * eyeR * -0.8}`}
              stroke={ink} strokeWidth={w * 0.045} strokeLinecap="round" fill="none"
            />
          </g>
        );
      })}
      {/* mouth: a smile/frown line that opens into a shape */}
      {open < 0.08 ? (
        <path d={`M ${-mw / 2} ${my - c * 0.3} Q 0 ${my + c} ${mw / 2} ${my - c * 0.3}`} stroke={ink} strokeWidth={w * 0.04} strokeLinecap="round" fill="none" />
      ) : (
        <g>
          <path d={`M ${-mw / 2} ${my - c * 0.3} Q 0 ${my + c - mh * 0.2} ${mw / 2} ${my - c * 0.3} Q 0 ${my + c + mh * 1.2} ${-mw / 2} ${my - c * 0.3} Z`} fill={ink} />
          <ellipse cx={0} cy={my + c * 0.4 + mh * 0.45} rx={mw * 0.22} ry={mh * 0.22} fill={P.pink} opacity={0.9} />
        </g>
      )}
    </g>
  );
};

// ---------------------------------------------------------------------------------------
// people: big round head, small body, mitten hands, flat two-tone shading

export type Hair = 'short' | 'pony' | 'bald' | 'bun' | 'curly' | 'cap';
export type CharProps = {
  f: number; x: number; y: number; s?: number; // y = feet
  skin?: string; hair?: string; hairStyle?: Hair; shirt?: string; pants?: string;
  mood?: MoodKeys; talk?: boolean; look?: {x: number; y: number}; seed?: number;
  arms?: 'down' | 'wave' | 'up' | 'hold' | 'cheer' | 'kite' | 'shade' | 'raise'; walk?: number; flip?: boolean;
  armAngles?: [number, number]; // override [left, right] in degrees (0 = hanging down)
  rightHand?: React.ReactNode; leftHand?: React.ReactNode; // props held in the hands (drawn upright)
  sit?: boolean; glasses?: boolean; tilt?: number; // head tilt in degrees
};

// where the right hand is for a given arm angle (character coordinates, before scaling)
export const handAt = (ang: number, side = 1) => {
  const r = (ang * Math.PI) / 180;
  return {x: side * 34 - 66 * Math.sin(r), y: -118 + 66 * Math.cos(r)};
};

export const Character: React.FC<CharProps> = ({
  f, x, y, s = 1, skin = P.skin, hair = P.ink, hairStyle = 'short', shirt = P.teal, pants = P.indigo,
  mood = 'happy', talk, look, seed = 1, arms = 'down', walk = 0, flip, armAngles, rightHand, leftHand, sit, glasses, tilt = 0,
}) => {
  const breathe = Math.sin(f * 0.08 + seed) * 2;
  const step = Math.sin(f * 0.4 + seed) * walk;
  const bob = Math.abs(Math.sin(f * 0.4 + seed)) * 6 * walk;
  const shade = 'rgba(18,10,58,0.18)';
  const armA = {down: [12, -12], wave: [12, -125 + Math.sin(f * 0.3) * 18], up: [125, -125], hold: [40, -40], kite: [12, -120 + Math.sin(f * 0.1 + seed) * 4], shade: [12, -172], raise: [12, -150 + Math.sin(f * 0.08 + seed) * 4], cheer: [130 + Math.sin(f * 0.4) * 10, -130 - Math.sin(f * 0.4) * 10]}[arms];
  const A = armAngles ?? armA;
  const Arm = ({side, ang, prop}: {side: number; ang: number; prop?: React.ReactNode}) => {
    const a = ang + (arms === 'down' && !armAngles ? step * 14 * side : 0);
    return (
      <g transform={`translate(${side * 34} -118) rotate(${a})`}>
        <rect x={-11} y={0} width={22} height={62} rx={11} fill={shirt} />
        <circle cx={0} cy={66} r={14} fill={skin} />
        {prop && <g transform={`translate(0 66) rotate(${-a})`}>{prop}</g>}
      </g>
    );
  };
  return (
    <g transform={`translate(${x} ${y - bob}) scale(${(flip ? -1 : 1) * s} ${s})`}>
      <ellipse cx={0} cy={4} rx={48} ry={9} fill="#000" opacity={0.12} />
      {/* legs (sitting: short, knees towards the camera) */}
      {sit ? (
        <g>
          <rect x={-30} y={-40} width={26} height={42} rx={13} fill={pants} />
          <rect x={4} y={-40} width={26} height={42} rx={13} fill={pants} />
          <ellipse cx={-17} cy={0} rx={16} ry={8} fill={P.ink} />
          <ellipse cx={17} cy={0} rx={16} ry={8} fill={P.ink} />
        </g>
      ) : (
        <g>
          <rect x={-26 - step * 6} y={-62} width={22} height={64} rx={11} fill={pants} />
          <rect x={4 + step * 6} y={-62} width={22} height={64} rx={11} fill={pants} />
          <ellipse cx={-16 - step * 6} cy={0} rx={16} ry={8} fill={P.ink} />
          <ellipse cx={16 + step * 6} cy={0} rx={16} ry={8} fill={P.ink} />
        </g>
      )}
      <g transform={sit ? 'translate(0 22)' : undefined}>
      <Arm side={-1} ang={A[0]} prop={leftHand} />
      {/* torso */}
      <path d={`M -38 -56 Q -42 ${-130 + breathe} 0 ${-136 + breathe} Q 42 ${-130 + breathe} 38 -56 Z`} fill={shirt} />
      <path d={`M 6 -56 Q 40 -60 38 -56 Q 42 ${-130 + breathe} 0 ${-136 + breathe} Q 30 -110 6 -56 Z`} fill={shade} />
      {sit && <rect x={-34} y={-62} width={68} height={30} rx={15} fill={pants} />}
      <Arm side={1} ang={A[1]} prop={rightHand} />
      {/* head */}
      <g transform={`translate(0 ${-196 + breathe}) rotate(${tilt})`}>
        <rect x={-10} y={40} width={20} height={26} fill={skin} />
        <ellipse cx={-50} cy={6} rx={10} ry={14} fill={skin} />
        <ellipse cx={50} cy={6} rx={10} ry={14} fill={skin} />
        <ellipse cx={0} cy={0} rx={50} ry={56} fill={skin} />
        <path d="M 22 -51 Q 50 -30 50 0 Q 50 40 18 54 Q 40 20 22 -51 Z" fill={shade} />
        {hairStyle === 'short' && <path d="M -52 -6 Q -56 -64 0 -64 Q 56 -64 52 -6 Q 40 -40 0 -40 Q -40 -40 -52 -6 Z" fill={hair} />}
        {hairStyle === 'pony' && <>
          <path d="M -54 10 Q -60 -66 0 -64 Q 60 -66 54 10 Q 46 -38 0 -36 Q -46 -38 -54 10 Z" fill={hair} />
          <ellipse cx={58} cy={10} rx={14} ry={34} fill={hair} transform={`rotate(${-12 + Math.sin(f * 0.1 + seed) * 6} 58 -20)`} />
        </>}
        {hairStyle === 'bun' && <>
          <path d="M -52 -4 Q -56 -62 0 -62 Q 56 -62 52 -4 Q 40 -36 0 -38 Q -40 -36 -52 -4 Z" fill={hair} />
          <circle cx={0} cy={-70} r={20} fill={hair} />
        </>}
        {hairStyle === 'curly' && [[-34, -44], [-12, -56], [12, -56], [34, -44], [-46, -20], [46, -20]].map(([hx, hy], i) => <circle key={i} cx={hx} cy={hy} r={20} fill={hair} />)}
        {hairStyle === 'cap' && <>
          <path d="M -50 -14 Q -50 -64 0 -64 Q 50 -64 50 -14 Z" fill={hair} />
          <rect x={-6} y={-24} width={78} height={14} rx={7} fill={hair} />
        </>}
        <Face f={f} x={0} y={8} w={84} mood={mood} talk={talk} look={look} seed={seed} kind="human" skin={skin} />
        {glasses && (
          <g>
            <rect x={-38} y={-8} width={32} height={22} rx={10} fill={P.ink} />
            <rect x={6} y={-8} width={32} height={22} rx={10} fill={P.ink} />
            <rect x={-8} y={-2} width={16} height={5} rx={2} fill={P.ink} />
            <rect x={-32} y={-4} width={10} height={5} rx={2} fill="#fff" opacity={0.6} />
            <rect x={12} y={-4} width={10} height={5} rx={2} fill="#fff" opacity={0.6} />
          </g>
        )}
      </g>
      </g>
    </g>
  );
};

// props for the hands
export const IceCream: React.FC<{f: number; s?: number; scoop?: string; drip?: number}> = ({f, s = 1, scoop = P.pink, drip = 0}) => (
  <g transform={`scale(${s}) translate(0 -10)`}>
    <path d="M -16 -6 L 0 40 L 16 -6 Z" fill="#e8a24a" />
    <path d="M -10 2 L 6 2 M -8 12 L 8 12 M -5 22 L 5 22" stroke="#b8762a" strokeWidth={3} />
    <circle cx={0} cy={-18} r={20} fill={scoop} />
    <circle cx={-8} cy={-24} r={6} fill="#fff" opacity={0.45} />
    {drip > 0 && <path d={`M 12 -8 Q 16 ${-8 + 14 * drip} 13 ${-6 + 18 * drip}`} stroke={scoop} strokeWidth={6} strokeLinecap="round" fill="none" />}
  </g>
);

// ---------------------------------------------------------------------------------------
// text that belongs to the scene

// banner that slides in from the left screen edge (names, years, chapters)
export const Tag: React.FC<{f: number; at: number; text: string; x?: number; y: number; color?: string; size?: number; out?: number}> = ({
  f, at, text, x = 0, y, color = P.teal, size = 64, out,
}) => {
  const t = Easing.out(Easing.cubic)(clamp((f - at) / 12));
  const o = out !== undefined ? 1 - clamp((f - out) / 10) : 1;
  if (t <= 0 || o <= 0) return null;
  const w = text.length * size * 0.56 + size * 1.6;
  return (
    <g transform={`translate(${x - w * (1 - t)} ${y})`} opacity={o}>
      <rect x={0} y={0} width={w} height={size * 1.45} fill={color} />
      <rect x={0} y={size * 1.3} width={w} height={size * 0.15} fill="rgba(0,0,0,0.15)" />
      <text x={size * 0.8} y={size * 1.05} fontFamily={kitFont} fontWeight={600} fontSize={size} fill={P.white}>{text}</text>
    </g>
  );
};

// arrow-shaped label pointing at something (like a medicine label)
export const Label: React.FC<{f: number; at: number; text: string; x: number; y: number; color?: string; size?: number; point?: 'left' | 'right' | 'none'; sub?: string; subColor?: string; out?: number; show?: number}> = ({
  f, at, text, x, y, color = P.teal, size = 44, point = 'right', sub, subColor = P.pink, out, show,
}) => {
  const s = show !== undefined ? Easing.out(Easing.back(2))(clamp(show)) : pop(f, at, 12);
  const o = out !== undefined ? 1 - clamp((f - out) / 10) : 1;
  if (s <= 0 || o <= 0) return null;
  const w = text.length * size * 0.56 + size * 1.2;
  const h = size * 1.5;
  const tip = point === 'none' ? 0 : h * 0.45;
  const ox = point === 'right' ? -w - tip : point === 'left' ? tip : -w / 2;
  const path = point === 'right'
    ? `M 0 0 L ${w} 0 L ${w + tip} ${h / 2} L ${w} ${h} L 0 ${h} Z`
    : point === 'left'
      ? `M ${tip} 0 L ${w + tip} 0 L ${w + tip} ${h} L ${tip} ${h} L 0 ${h / 2} Z`
      : `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z`;
  return (
    <g transform={`translate(${x} ${y}) scale(${s}) translate(${ox} ${-h / 2})`} opacity={o}>
      <path d={path} fill={color} />
      <text x={(point === 'left' ? tip : 0) + size * 0.6} y={h * 0.7} fontFamily={kitFont} fontWeight={600} fontSize={size} fill={P.white}>{text}</text>
      {sub && <text x={(point === 'left' ? tip : 0) + size * 0.6} y={h + size * 1.1} fontFamily={kitFont} fontWeight={700} fontSize={size * 0.9} fill={subColor}>{sub}</text>}
    </g>
  );
};

// speech / thought bubble
export const Bubble: React.FC<{f: number; at: number; text: string[]; x: number; y: number; color?: string; size?: number; tail?: 'down-left' | 'down-right' | 'down'; out?: number}> = ({
  f, at, text, x, y, color = P.violet, size = 40, tail = 'down', out,
}) => {
  const s = pop(f, at, 12);
  const o = out !== undefined ? 1 - clamp((f - out) / 10) : 1;
  if (s <= 0 || o <= 0) return null;
  const w = Math.max(...text.map((t) => t.length)) * size * 0.54 + size * 1.6;
  const h = text.length * size * 1.25 + size * 0.9;
  const tx = tail === 'down-left' ? w * 0.22 : tail === 'down-right' ? w * 0.78 : w / 2;
  return (
    <g transform={`translate(${x} ${y}) scale(${s}) translate(${-w / 2} ${-h - size * 0.6})`} opacity={o}>
      <rect x={0} y={0} width={w} height={h} rx={size * 0.7} fill={color} />
      <path d={`M ${tx - size * 0.4} ${h - 2} L ${tx} ${h + size * 0.6} L ${tx + size * 0.4} ${h - 2} Z`} fill={color} />
      {text.map((t, i) => (
        <text key={i} x={w / 2} y={size * 1.1 + i * size * 1.25} textAnchor="middle" fontFamily={kitFont} fontWeight={600} fontSize={size} fill={P.white}>{t}</text>
      ))}
    </g>
  );
};

// big number that pops in with a small caption (replaces the old corner boxes)
export const BigNumber: React.FC<{f: number; at: number; value: string; caption?: string; x: number; y: number; color?: string; size?: number; out?: number}> = ({
  f, at, value, caption, x, y, color = P.yellow, size = 120, out,
}) => {
  const s = pop(f, at, 14);
  const o = out !== undefined ? 1 - clamp((f - out) / 12) : 1;
  if (s <= 0 || o <= 0) return null;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={o}>
      <text x={0} y={0} textAnchor="middle" fontFamily={kitFont} fontWeight={700} fontSize={size} fill={color}
        style={{paintOrder: 'stroke', stroke: P.night, strokeWidth: size * 0.12, strokeLinejoin: 'round'}}>{value}</text>
      {caption && <text x={0} y={size * 0.55} textAnchor="middle" fontFamily={kitFont} fontWeight={600} fontSize={size * 0.32} fill={P.white}
        style={{paintOrder: 'stroke', stroke: P.night, strokeWidth: size * 0.06, strokeLinejoin: 'round'}}>{caption}</text>}
    </g>
  );
};

// soft neon glow behind anything that shines
export const Glow: React.FC<{cx: number; cy: number; r: number; color: string; o?: number}> = ({cx, cy, r, color, o = 0.6}) => (
  <g opacity={o}>
    <circle cx={cx} cy={cy} r={r} fill={color} opacity={0.18} />
    <circle cx={cx} cy={cy} r={r * 0.7} fill={color} opacity={0.22} />
    <circle cx={cx} cy={cy} r={r * 0.45} fill={color} opacity={0.3} />
  </g>
);

export {interpolate};

// ---------------------------------------------------------------------------------------
// the recurring cast of the sun video and colour filters for night/cold scenes

export const MIA = {skin: P.skin, hair: P.orange, hairStyle: 'curly' as const, shirt: P.pink, pants: P.indigo, seed: 41};
export const PAPA = {skin: '#c98a60', hair: '#2a1810', hairStyle: 'short' as const, shirt: P.teal, pants: P.navy, seed: 42};
export const NEIGHBOUR_A = {skin: P.skinPink, hair: P.ink, hairStyle: 'cap' as const, shirt: P.violet, pants: P.navy, seed: 43};
export const NEIGHBOUR_B = {skin: P.skin, hair: P.yellow, hairStyle: 'bun' as const, shirt: P.orange, pants: P.indigo, seed: 44};

// <KitDefs/> once per svg; then filter="url(#kitNight)" darkens and cools anything at night
export const KitDefs: React.FC = () => (
  <defs>
    <filter id="kitNight" colorInterpolationFilters="sRGB">
      <feColorMatrix type="matrix" values="0.45 0 0 0 0.02  0 0.5 0 0 0.04  0 0 0.75 0 0.12  0 0 0 1 0" />
    </filter>
    <filter id="kitCold" colorInterpolationFilters="sRGB">
      <feColorMatrix type="matrix" values="0.7 0 0 0 0.04  0 0.78 0 0 0.06  0 0 0.95 0 0.12  0 0 0 1 0" />
    </filter>
    <filter id="kitWarm" colorInterpolationFilters="sRGB">
      <feColorMatrix type="matrix" values="1 0 0 0 0.06  0 0.9 0 0 0.02  0 0 0.75 0 0  0 0 0 1 0" />
    </filter>
  </defs>
);
