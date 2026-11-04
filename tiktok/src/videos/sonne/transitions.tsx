// Animated transitions between shots, Kurzgesagt-style: during a short overlap both shots are drawn
// and combined (zoom-through, whip pan with motion blur, iris, dissolve). 'cut' keeps a hard cut.
import React from 'react';
import {Easing} from 'remotion';
import {SH, SW} from './Video';

export type Tr =
  | {type: 'cut'}
  | {type: 'dissolve' | 'push' | 'pull'; dur?: number}
  | {type: 'whip'; dir?: 'left' | 'right' | 'up' | 'down'; dur?: number}
  | {type: 'iris'; x?: number; y?: number; dur?: number};

export type Item = {at: number; draw: (f: number) => React.ReactNode; tr?: Tr};

const ease = Easing.bezier(0.65, 0, 0.35, 1);
const scaleAbout = (s: number, x = SW / 2, y = SH / 2) => `translate(${x} ${y}) scale(${s}) translate(${-x} ${-y})`;

const defaultDur = (tr: Tr) => ('dur' in tr && tr.dur ? tr.dur : tr.type === 'whip' ? 12 : tr.type === 'iris' ? 20 : tr.type === 'dissolve' ? 18 : 16);

const Blur: React.FC<{id: string; sx: number; sy: number; children: React.ReactNode}> = ({id, sx, sy, children}) =>
  sx < 0.5 && sy < 0.5 ? (
    <>{children}</>
  ) : (
    <>
      <defs>
        <filter id={id} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={`${sx.toFixed(1)} ${sy.toFixed(1)}`} />
        </filter>
      </defs>
      <g filter={`url(#${id})`}>{children}</g>
    </>
  );

// draw the shot sequence at frame f, blending into each shot with its transition
export const Sequence: React.FC<{f: number; items: Item[]; uid: string}> = ({f, items, uid}) => {
  let i = 0;
  for (let k = 0; k < items.length; k++) if (f >= items[k].at) i = k;
  const cur = items[i];
  const tr = cur.tr ?? {type: 'cut'};
  const dur = defaultDur(tr);
  if (i === 0 || tr.type === 'cut' || f >= cur.at + dur) return <>{cur.draw(f)}</>;

  const prev = items[i - 1];
  const p = ease(Math.min(1, Math.max(0, (f - cur.at) / dur)));
  const A = prev.draw(f);
  const B = cur.draw(f);
  const id = `${uid}-${i}`;

  switch (tr.type) {
    case 'dissolve':
      return (
        <>
          {A}
          <g opacity={p}>{B}</g>
        </>
      );
    case 'push': {
      // fly into the old picture; the new one grows out of its centre
      const blur = 10 * Math.sin(Math.PI * p);
      return (
        <>
          <Blur id={`${id}a`} sx={blur} sy={blur}><g transform={scaleAbout(1 + 1.6 * p)} opacity={1 - p}>{A}</g></Blur>
          <Blur id={`${id}b`} sx={blur} sy={blur}><g transform={scaleAbout(0.55 + 0.45 * p)} opacity={p}>{B}</g></Blur>
        </>
      );
    }
    case 'pull': {
      // pull back out of the old picture; the new one comes from large to normal
      const blur = 10 * Math.sin(Math.PI * p);
      return (
        <>
          <Blur id={`${id}a`} sx={blur} sy={blur}><g transform={scaleAbout(1 - 0.45 * p)} opacity={1 - p}>{A}</g></Blur>
          <Blur id={`${id}b`} sx={blur} sy={blur}><g transform={scaleAbout(1.8 - 0.8 * p)} opacity={p}>{B}</g></Blur>
        </>
      );
    }
    case 'whip': {
      const dir = tr.dir ?? 'left';
      const v = dir === 'left' || dir === 'right';
      const sgn = dir === 'left' || dir === 'up' ? -1 : 1; // direction the old picture moves
      const L = v ? SW : SH;
      const blur = 60 * Math.sin(Math.PI * p);
      const off = (q: number) => (v ? `translate(${q} 0)` : `translate(0 ${q})`);
      return (
        <Blur id={id} sx={v ? blur : 0} sy={v ? 0 : blur}>
          <g transform={off(sgn * L * p)}>{A}</g>
          <g transform={off(-sgn * L * (1 - p))}>{B}</g>
        </Blur>
      );
    }
    case 'iris': {
      const x = tr.x ?? SW / 2;
      const y = tr.y ?? SH / 2;
      const R = Math.hypot(Math.max(x, SW - x), Math.max(y, SH - y)) * p;
      return (
        <>
          {A}
          <defs><clipPath id={`${id}c`}><circle cx={x} cy={y} r={R} /></clipPath></defs>
          <g clipPath={`url(#${id}c)`}>{B}</g>
          <circle cx={x} cy={y} r={R} fill="none" stroke="#fff" strokeWidth={8 * (1 - p)} opacity={0.7} />
        </>
      );
    }
  }
  return <>{B}</>;
};
