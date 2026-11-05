// Flow engine for neon explainers: a video is a few long "acts". Inside an act the picture keeps
// changing (phases keyed to spoken words); acts hand over with an iris (Kurzgesagt circle with a
// glowing ring) or a zoom-through, never a plain slideshow cut.
import React from 'react';
import {AbsoluteFill, Audio, Easing, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {FPS} from '../lib/theme';
import {kitFont} from './kit';

export const FW = 1920;
export const FH = 1080;

// neon palette
export const N = {
  bg: '#1b0b3b', bg2: '#2a0f55', deep: '#0b0a2a', navy: '#101a5a',
  magenta: '#ff3fb4', pink: '#ff7ad0', cyan: '#3ff0ff', blue: '#2f5bff', violet: '#7a3cff',
  orange: '#ff8a2a', yellow: '#ffe14a', green: '#4dff9a', teal: '#1fd6b0', red: '#ff4a5a',
  cream: '#fff4d6', white: '#ffffff', ink: '#14092e', skin: '#f2a07a', skinDark: '#c06a4a',
};

export type FLine = {start: number; end: number; words: {w: string; start: number; end: number}[]};
export type FTiming = {duration: number; lines: Record<string, FLine>};
export type ActProps = {f: number; dur: number; at: (word: string, nth?: number) => number; lineAt: (id: string) => number};
export type Enter = {type: 'cut' | 'iris' | 'zoom' | 'irisOut'; x?: number; y?: number; dur?: number};
export type Act = {lines: string[]; enter?: Enter; draw: (p: ActProps) => React.ReactNode};

const fr = (s: number) => Math.round(s * FPS);
const ease = Easing.bezier(0.6, 0, 0.3, 1);
export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const ramp = (f: number, a: number, d = 12) => ease(clamp01((f - a) / Math.max(1, d)));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Kurzgesagt-like glowing ring segments (yellow / orange / blue)
export const NeonRing: React.FC<{x: number; y: number; r: number; w?: number; spin?: number; o?: number}> = ({x, y, r, w = 10, spin = 0, o = 1}) => {
  const segs = [N.yellow, N.blue, N.orange, N.violet, N.yellow, N.blue, N.orange, N.blue];
  const C = 2 * Math.PI * r;
  return (
    <g opacity={o} transform={`rotate(${spin} ${x} ${y})`}>
      {segs.map((c, i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="none" stroke={c} strokeWidth={w} strokeLinecap="round"
          strokeDasharray={`${C / segs.length - 26} ${C}`} strokeDashoffset={-(C / segs.length) * i} />
      ))}
    </g>
  );
};

// hexagon label banner, e.g. "Zeitstrahl"
export const Banner: React.FC<{x: number; y: number; text: string; color?: string; size?: number; show?: number}> = ({x, y, text, color = N.blue, size = 56, show = 1}) => {
  if (show <= 0) return null;
  const w = text.length * size * 0.56 + size * 1.6;
  const h = size * 1.5;
  const pts = `${-w / 2},0 ${-w / 2 + h * 0.35},${-h / 2} ${w / 2 - h * 0.35},${-h / 2} ${w / 2},0 ${w / 2 - h * 0.35},${h / 2} ${-w / 2 + h * 0.35},${h / 2}`;
  const s = Easing.out(Easing.back(2))(clamp01(show));
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <polygon points={pts} fill="#000" opacity={0.35} transform="translate(10 10)" />
      <polygon points={pts} fill={color} />
      <text x={0} y={size * 0.36} textAnchor="middle" fontFamily={kitFont} fontWeight={700} fontSize={size} fill={N.white}>{text}</text>
    </g>
  );
};

// soft blue blobs behind vignettes
export const Blobs: React.FC<{f: number; x: number; y: number; r: number; color?: string; o?: number}> = ({f, x, y, r, color = N.blue, o = 0.8}) => (
  <g opacity={o}>
    {Array.from({length: 9}, (_, i) => {
      const a = (i / 9) * Math.PI * 2 + Math.sin(f * 0.02 + i) * 0.2;
      const d = r * (0.95 + 0.12 * Math.sin(f * 0.05 + i * 2));
      return <circle key={i} cx={x + Math.cos(a) * d} cy={y + Math.sin(a) * d} r={r * (0.3 + 0.08 * Math.sin(f * 0.07 + i))} fill={color} opacity={0.55} />;
    })}
    <circle cx={x} cy={y} r={r * 1.08} fill={N.orange} opacity={0.25} />
  </g>
);

// circle vignette with contents, ring and blobs
export const Vignette: React.FC<{f: number; x: number; y: number; r: number; id: string; show?: number; children: React.ReactNode}> = ({f, x, y, r, id, show = 1, children}) => {
  if (show <= 0) return null;
  const s = Easing.out(Easing.back(1.6))(clamp01(show));
  return (
    <g transform={`translate(${x} ${y}) scale(${s}) translate(${-x} ${-y})`}>
      <Blobs f={f} x={x} y={y} r={r} />
      <defs><clipPath id={id}><circle cx={x} cy={y} r={r} /></clipPath></defs>
      <g clipPath={`url(#${id})`}>{children}</g>
      <NeonRing x={x} y={y} r={r + 8} w={10} spin={f * 0.3} />
    </g>
  );
};

export const makeFlow = (timing: FTiming, acts: Act[], audio: string, tailSec = 2, Overlay?: React.FC) => {
  const L = timing.lines;
  const duration = Math.ceil((timing.duration + tailSec) * FPS);
  const starts = acts.map((a, i) => (i === 0 ? 0 : fr(L[a.lines[0]].start) - 6));
  const props = (i: number, f: number): ActProps => {
    const start = starts[i];
    const end = i + 1 < acts.length ? starts[i + 1] : duration;
    const act = acts[i];
    return {
      f: f - start,
      dur: end - start,
      at: (word, nth = 0) => {
        const hits = act.lines.flatMap((id) => L[id].words).filter((w) => w.w.toLowerCase().startsWith(word.toLowerCase()));
        const hit = hits[nth] ?? hits[0];
        return hit ? fr(hit.start) - start : 0;
      },
      lineAt: (id) => fr(L[id].start) - start,
    };
  };

  const Video: React.FC = () => {
    const f = useCurrentFrame();
    let i = 0;
    while (i + 1 < acts.length && starts[i + 1] <= f) i++;
    const act = acts[i];
    const en = act.enter ?? {type: 'cut'};
    const td = en.dur ?? 24;
    const t = i > 0 ? clamp01((f - starts[i]) / td) : 1;
    const cur = act.draw(props(i, f));
    let body: React.ReactNode = cur;
    if (i > 0 && t < 1 && en.type !== 'cut') {
      const prev = acts[i - 1].draw(props(i - 1, f));
      const x = en.x ?? FW / 2; const y = en.y ?? FH / 2;
      const e = ease(t);
      if (en.type === 'iris' || en.type === 'irisOut') {
        const out = en.type === 'irisOut';
        const r = out ? lerp(2300, 0, e) : lerp(0, 2300, e);
        const id = `iris${i}`;
        body = out ? (
          // the old picture shrinks into a circle and vanishes, revealing the new one
          <>
            {cur}
            <defs><clipPath id={id}><circle cx={x} cy={y} r={r} /></clipPath></defs>
            <g clipPath={`url(#${id})`}>{prev}</g>
            <NeonRing x={x} y={y} r={r} w={14} spin={f * 2} />
          </>
        ) : (
          <>
            {prev}
            <defs><clipPath id={id}><circle cx={x} cy={y} r={r} /></clipPath></defs>
            <g clipPath={`url(#${id})`}>{cur}</g>
            <NeonRing x={x} y={y} r={r} w={14} spin={f * 2} />
          </>
        );
      } else if (en.type === 'zoom') {
        body = (
          <>
            <g opacity={1 - e} transform={`translate(${x} ${y}) scale(${lerp(1, 6, e)}) translate(${-x} ${-y})`}>{prev}</g>
            <g opacity={e} transform={`translate(${x} ${y}) scale(${lerp(0.3, 1, e)}) translate(${-x} ${-y})`}>{cur}</g>
          </>
        );
      }
    }
    return (
      <AbsoluteFill style={{background: N.bg}}>
        <svg width={FW} height={FH} viewBox={`0 0 ${FW} ${FH}`}>{body}</svg>
        {Overlay && <Overlay />}
        <Audio src={staticFile(audio)} />
      </AbsoluteFill>
    );
  };
  return {Video, duration, starts};
};
