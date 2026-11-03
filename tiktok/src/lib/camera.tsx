import React from 'react';
import {AbsoluteFill, Easing, useCurrentFrame} from 'remotion';
import {H, W} from './theme';

// A virtual camera over one big "world" in which all scenes of a video sit side by side.
// x/y = world point the camera looks at, z = zoom, r = roll in degrees.
export type Cam = {x: number; y: number; z: number; r: number};

// where the looked-at point lands on screen (a bit above the middle, captions sit below)
export const ANCHOR = {x: W / 2, y: H * 0.47};

const EASE = {
  smooth: Easing.bezier(0.45, 0, 0.2, 1),
  whip: Easing.bezier(0.85, 0, 0.15, 1), // fast in the middle -> strong motion blur
  snap: Easing.bezier(0.15, 0.9, 0.1, 1), // punch-in that settles
  linear: (t: number) => t,
};
export type EaseName = keyof typeof EASE;

type Key = {f: number; c: Cam; ease: (t: number) => number};
type Follow = {from: number; to: number; blend: number; fn: (f: number) => Cam};
type Shake = {f: number; amp: number};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mix = (a: Cam, b: Cam, t: number): Cam => ({
  x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), r: lerp(a.r, b.r, t),
  z: Math.exp(lerp(Math.log(a.z), Math.log(b.z), t)), // zoom feels even in log space
});
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

export class Track {
  private keys: Key[] = [];
  private follows: Follow[] = [];
  private shakes: Shake[] = [];

  cut(f: number, c: Cam) {
    this.keys.push({f, c, ease: EASE.linear});
    return this;
  }

  // hold the current framing until `f`, then move to `c` over `dur` frames
  to(f: number, dur: number, c: Partial<Cam>, ease: EaseName = 'smooth') {
    const last = this.keys[this.keys.length - 1];
    const start = Math.max(f, last.f);
    const from = this.keyed(start);
    this.keys.push({f: start, c: from, ease: EASE.linear});
    this.keys.push({f: start + Math.max(1, dur), c: {...from, ...c}, ease: EASE[ease]});
    return this;
  }

  // between `from` and `to` the camera tracks fn(f) (a moving subject), blended in and out
  follow(from: number, to: number, fn: (f: number) => Cam, blend = 10) {
    this.follows.push({from, to, fn, blend});
    return this;
  }

  shake(f: number, amp = 1) {
    this.shakes.push({f, amp});
    return this;
  }

  private keyed(f: number): Cam {
    const k = this.keys;
    if (f <= k[0].f) return k[0].c;
    for (let i = 0; i < k.length - 1; i++) {
      if (f < k[i + 1].f) {
        const t = (f - k[i].f) / (k[i + 1].f - k[i].f);
        return mix(k[i].c, k[i + 1].c, k[i + 1].ease(t));
      }
    }
    return k[k.length - 1].c;
  }

  at(f: number): Cam {
    let c = this.keyed(f);
    for (const fo of this.follows) {
      if (f <= fo.from || f >= fo.to) continue;
      const w = Math.min(clamp01((f - fo.from) / fo.blend), clamp01((fo.to - f) / fo.blend));
      c = mix(c, fo.fn(f), EASE.smooth(w));
    }
    // handheld drift keeps even a still shot alive
    let x = c.x + 4 * Math.sin(f / 37) / c.z;
    let y = c.y + 4 * Math.sin(f / 29 + 1) / c.z;
    let r = c.r + 0.3 * Math.sin(f / 53);
    for (const s of this.shakes) {
      const d = f - s.f;
      if (d < 0 || d > 30) continue;
      const k = s.amp * Math.exp(-d / 5);
      x += (26 * k * Math.sin(d * 2.3)) / c.z;
      y += (20 * k * Math.cos(d * 1.9)) / c.z;
      r += 1.2 * k * Math.sin(d * 1.7);
    }
    return {x, y, z: c.z, r};
  }
}

// Renders the world through the camera. Motion blur follows the camera speed on screen.
export const World: React.FC<{track: Track; children: React.ReactNode}> = ({track, children}) => {
  const f = useCurrentFrame();
  const c = track.at(f);
  const p = track.at(Math.max(0, f - 1));
  const zoomSpeed = Math.abs(Math.log(c.z / p.z)) * 700;
  const bx = Math.min(40, Math.abs(c.x - p.x) * c.z * 0.32 + zoomSpeed * 0.25);
  const by = Math.min(40, Math.abs(c.y - p.y) * c.z * 0.32 + zoomSpeed * 0.25);
  const blur = bx + by > 1.2;
  const id = `mb${f}`;
  return (
    <AbsoluteFill style={{filter: blur ? `url(#${id})` : undefined, overflow: 'hidden'}}>
      {blur && (
        <svg width={0} height={0} style={{position: 'absolute'}}>
          <filter id={id} x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation={`${bx.toFixed(1)} ${by.toFixed(1)}`} />
          </filter>
        </svg>
      )}
      <div
        style={{
          position: 'absolute', left: 0, top: 0, transformOrigin: '0 0',
          transform: `translate(${ANCHOR.x}px, ${ANCHOR.y}px) rotate(${c.r}deg) scale(${c.z}) translate(${-c.x}px, ${-c.y}px)`,
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};

// puts a scene (laid out like a normal 1080x1920 screen) at a spot in the world
export const Place: React.FC<{at: [number, number]; children: React.ReactNode}> = ({at, children}) => (
  <div style={{position: 'absolute', left: at[0], top: at[1], width: W, height: H}}>{children}</div>
);

// depth of field: blur for whatever the camera is not looking at
export const soft = (px: number): React.CSSProperties => (px > 0.2 ? {filter: `blur(${px.toFixed(1)}px)`} : {});
