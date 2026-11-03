import React from 'react';
import {AbsoluteFill, random, useCurrentFrame} from 'remotion';
import {C, fontFamily, glow, H, W} from '../lib/theme';
import {Timing, rise} from '../lib/timing';

// night sky: gradient, twinkling stars, vignette
export const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const stars = Array.from({length: 90}, (_, i) => ({
    x: random(`x${i}`) * W,
    y: random(`y${i}`) * H * 0.75,
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
