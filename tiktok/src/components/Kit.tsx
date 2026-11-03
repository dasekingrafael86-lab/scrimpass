import React from 'react';
import {AbsoluteFill, random, useCurrentFrame} from 'remotion';
import {Cam} from '../lib/camera';
import {C, fontFamily, glow, H, W} from '../lib/theme';
import {Timing, rise} from '../lib/timing';

const wrap = (v: number, m: number) => ((v % m) + m) % m;

// night sky: gradient, twinkling stars, vignette; with a camera the stars drift behind it (parallax)
export const Backdrop: React.FC<{cam?: Cam}> = ({cam}) => {
  const frame = useCurrentFrame();
  const px = cam ? cam.x * 0.12 : 0;
  const py = cam ? cam.y * 0.12 : 0;
  const stars = Array.from({length: 110}, (_, i) => ({
    x: wrap(random(`x${i}`) * W - px * (0.5 + random(`d${i}`)), W),
    y: wrap(random(`y${i}`) * H - py * (0.5 + random(`d${i}`)), H),
    r: 1 + random(`r${i}`) * 2.2,
    p: random(`p${i}`) * Math.PI * 2,
  }));
  return (
    <AbsoluteFill style={{background: `linear-gradient(180deg, ${C.bg0} 0%, ${C.bg1} 70%, ${C.bg0} 100%)`}}>
      <svg width={W} height={H} style={{position: 'absolute'}}>
        {stars.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={0.25 + 0.35 * (0.5 + 0.5 * Math.sin(frame / 25 + s.p))} />
        ))}
      </svg>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(0,0,0,0.55) 100%)'}} />
    </AbsoluteFill>
  );
};

// fades its children in at `from` and out at `to`
export const Scene: React.FC<{from: number; to: number; children: React.ReactNode}> = ({from, to, children}) => {
  const frame = useCurrentFrame();
  if (frame < from - 1 || frame > to + 10) return null;
  const o = Math.min(rise(frame, from, 10), 1 - rise(frame, to, 10));
  return <AbsoluteFill style={{opacity: o}}>{children}</AbsoluteFill>;
};

export const Txt: React.FC<{
  x: number; y: number; size?: number; color?: string; weight?: number; align?: 'left' | 'center' | 'right';
  spacing?: number; style?: React.CSSProperties; children: React.ReactNode;
}> = ({x, y, size = 40, color = C.text, weight = 800, align = 'left', spacing = 0, style, children}) => (
  <div
    style={{
      position: 'absolute', left: align === 'left' ? x : undefined, right: align === 'right' ? W - x : undefined,
      top: y, width: align === 'center' ? W : undefined, marginLeft: align === 'center' ? x - W / 2 : undefined,
      textAlign: align, fontFamily, fontSize: size, fontWeight: weight, color, letterSpacing: spacing,
      fontVariantNumeric: 'tabular-nums', lineHeight: 1.05, whiteSpace: 'nowrap', ...style,
    }}
  >
    {children}
  </div>
);

// small label + big number, like the HÖHE / FALLZEIT tiles
export const HudTile: React.FC<{x: number; y: number; w?: number; label: string; value: string; unit?: string; color?: string; show: number}> = ({
  x, y, w = 360, label, value, unit, color = C.text, show,
}) => (
  <div
    style={{
      position: 'absolute', left: x, top: y, width: w, padding: '18px 26px', borderRadius: 26,
      background: C.panel, border: `2px solid ${C.border}`, opacity: show, transform: `translateY(${(1 - show) * -20}px)`,
      fontFamily, color: C.text,
    }}
  >
    <div style={{fontSize: 30, fontWeight: 600, letterSpacing: 4, color: C.muted}}>{label}</div>
    <div style={{fontSize: 76, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums', lineHeight: 1.05}}>
      {value}
      {unit && <span style={{fontSize: 36, fontWeight: 600, color: C.muted, marginLeft: 10}}>{unit}</span>}
    </div>
  </div>
);

export const Pill: React.FC<{x: number; y: number; color: string; show: number; children: React.ReactNode; size?: number; filled?: boolean}> = ({
  x, y, color, show, children, size = 40, filled = false,
}) => (
  <div
    style={{
      position: 'absolute', left: x, top: y, transform: `translate(-50%, 0) scale(${0.7 + 0.3 * show})`, opacity: show,
      padding: `${size * 0.35}px ${size * 0.8}px`, borderRadius: 999, fontFamily, fontWeight: 800, fontSize: size,
      color: filled ? '#0b1622' : color, background: filled ? color : `${color}22`, border: `3px solid ${color}`,
      boxShadow: filled ? glow(color, 14) : undefined, whiteSpace: 'nowrap',
    }}
  >
    {children}
  </div>
);

// 2-3 word captions, cut at punctuation, timed to the voice
export const Captions: React.FC<{timing: Timing; y?: number}> = ({timing, y = 1430}) => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const chunks: {text: string; start: number; end: number}[] = [];
  for (const line of Object.values(timing.lines)) {
    let cur: typeof line.words = [];
    line.words.forEach((w, i) => {
      cur.push(w);
      const last = i === line.words.length - 1;
      if (last || cur.length === 3 || /[.,:?!]$/.test(w.w)) {
        chunks.push({text: cur.map((x) => x.w).join(' '), start: cur[0].start, end: last ? line.end + 0.15 : line.words[i + 1].start});
        cur = [];
      }
    });
  }
  const c = chunks.find((k) => t >= k.start && t < k.end);
  if (!c) return null;
  const pop = rise(frame, Math.round(c.start * 30), 5);
  return (
    <div style={{position: 'absolute', top: y, width: W, display: 'flex', justifyContent: 'center'}}>
      <div
        style={{
          fontFamily, fontWeight: 800, fontSize: 58, color: '#fff', padding: '14px 30px', borderRadius: 18,
          background: 'rgba(8,16,26,0.72)', transform: `scale(${0.92 + 0.08 * pop})`, opacity: 0.4 + 0.6 * pop,
        }}
      >
        {c.text.replace(/[.,:]$/, '')}
      </div>
    </div>
  );
};

export const Handle: React.FC<{text: string}> = ({text}) => (
  <Txt x={W - 60} y={H - 330} size={30} weight={700} align="right" color="rgba(255,255,255,0.55)">
    {text}
  </Txt>
);

// status badge under the HUD, like PAUSE / WIEDERHOLUNG in the coin video
export const Badge: React.FC<{text: string; show: number; color?: string}> = ({text, show, color = C.text}) => (
  <div
    style={{
      position: 'absolute', left: 90, top: 345, opacity: show, transform: `translateX(${(1 - show) * -30}px)`,
      padding: '10px 20px', borderRadius: 14, background: 'rgba(8,16,26,0.75)', border: `2px solid ${C.border}`,
      fontFamily, fontWeight: 800, fontSize: 28, letterSpacing: 4, color,
    }}
  >
    {text}
  </div>
);

// the hook question with two answers and a 3-2-1 countdown (from..to = visible, cdFrom..to = countdown)
export const Choice: React.FC<{
  question: string; a: {label: string; color: string}; b: {label: string; color: string};
  from: number; to: number; cdFrom: number; top?: number; size?: number;
}> = ({question, a, b, from, to, cdFrom, top = 760, size = 76}) => {
  const frame = useCurrentFrame();
  const show = rise(frame, from, 8) * (1 - rise(frame, to, 6));
  const btn = rise(frame, from + 8, 8);
  const cd = frame < cdFrom ? 3 : Math.max(1, 3 - Math.floor(((frame - cdFrom) / Math.max(1, to - cdFrom)) * 3));
  if (show <= 0) return null;
  return (
    <div style={{position: 'absolute', left: 0, top, width: W, opacity: show}}>
      <Txt x={W / 2} y={0} size={size} align="center" style={{transform: `scale(${1.15 - 0.15 * show})`, textShadow: '0 4px 30px #000'}}>
        {question}
      </Txt>
      <Pill x={W / 2 - 210} y={size + 44} color={a.color} show={btn} size={46} filled>{a.label}</Pill>
      <Pill x={W / 2 + 210} y={size + 44} color={b.color} show={btn} size={46} filled>{b.label}</Pill>
      <div
        style={{
          position: 'absolute', left: W / 2 - 44, top: size + 46, width: 88, height: 88, borderRadius: 99, opacity: btn,
          background: 'rgba(8,16,26,0.8)', border: `3px solid ${C.text}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Txt x={0} y={0} size={46} style={{position: 'static'}}>{cd}</Txt>
      </div>
    </div>
  );
};
