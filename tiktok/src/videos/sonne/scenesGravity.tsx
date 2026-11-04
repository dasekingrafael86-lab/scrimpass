// Scenes 109 s – 159 s: gravity is late too (orbit, rubber sheet, neutron stars).
import React from 'react';
import {Easing} from 'remotion';
import {C, fontFamily} from '../../lib/theme';
import {rise} from '../../lib/timing';
import {Cam, Earth, Label, Sun, camAt, clamp01, layer, lerp, rnd} from './Intro';
import {SpaceBack} from './scenesLight';
import {SH, SW} from './Video';

export const O = {x: 960, y: 540};
const OR = 360; // orbit radius
const OMEGA = 0.006; // rad per frame

// earth position on its orbit, or flying straight on along the tangent after `free`
export const earthPos = (f: number, free?: number) => {
  const th = (ff: number) => -0.6 + ff * OMEGA;
  if (free === undefined || f < free) return {x: O.x + Math.cos(th(f)) * OR, y: O.y + Math.sin(th(f)) * OR * 0.62};
  const a = th(free);
  const p = {x: O.x + Math.cos(a) * OR, y: O.y + Math.sin(a) * OR * 0.62};
  const v = {x: -Math.sin(a) * OR * OMEGA, y: Math.cos(a) * OR * 0.62 * OMEGA};
  const dt = f - free;
  return {x: p.x + v.x * dt, y: p.y + v.y * dt};
};

const Ring: React.FC<{r: number; color: string; w?: number; o?: number; cx?: number; cy?: number; flat?: number}> = ({r, color, w = 6, o = 1, cx = O.x, cy = O.y, flat = 0.62}) =>
  r > 0 ? (
    <g opacity={o}>
      <ellipse cx={cx} cy={cy} rx={r} ry={r * flat} fill="none" stroke={color} strokeWidth={w * 3} opacity={0.25} />
      <ellipse cx={cx} cy={cy} rx={r} ry={r * flat} fill="none" stroke={color} strokeWidth={w} />
    </g>
  ) : null;

export const OrbitScene: React.FC<{
  f: number; cam: Cam; sunGone?: number; ghostAt?: number; ghostEnd?: number; waveFrom?: number; free?: number;
  waveLabels?: number; rope?: boolean; planets?: boolean;
}> = ({f, cam, sunGone, ghostAt, ghostEnd, waveFrom, free, waveLabels = 0, rope = true, planets}) => {
  const gone = sunGone !== undefined && f >= sunGone;
  const sunScale = sunGone === undefined || f < sunGone ? 1 : 1 - Easing.in(Easing.cubic)(clamp01((f - sunGone) / 9));
  const e = earthPos(f, free);
  const waveR = waveFrom !== undefined && f >= waveFrom ? (f - waveFrom) * 3.0 : 0;
  const ropeOn = rope && (free === undefined || f < free);
  const trail = Array.from({length: 40}, (_, i) => earthPos(f - i * 3, free));
  const ghost = ghostAt !== undefined && f >= ghostAt && (ghostEnd === undefined || f < ghostEnd + 20) ? earthPos(f, ghostAt) : null;
  const ghostO = ghostAt !== undefined ? rise(f, ghostAt, 10) * (ghostEnd !== undefined ? 1 - rise(f, ghostEnd, 18) : 1) : 0;
  return (
    <>
      <SpaceBack f={f} cam={cam} />
      <g transform={layer(cam, 1, O)}>
        <ellipse cx={O.x} cy={O.y} rx={OR} ry={OR * 0.62} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={3} strokeDasharray="4 12" />
        {planets && [170, 250, 520, 680].map((r, i) => (
          <ellipse key={i} cx={O.x} cy={O.y} rx={r} ry={r * 0.62} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={2} strokeDasharray="4 12" />
        ))}
        <Sun f={f} x={O.x} y={O.y} r={110} scale={sunScale} />
        {gone && (
          <circle cx={O.x} cy={O.y} r={110} fill="none" stroke="#fff" strokeWidth={3} strokeDasharray="12 14" opacity={0.4 * rise(f, sunGone! + 12, 14)} transform={`rotate(${f * 0.3} ${O.x} ${O.y})`} />
        )}
        {gone && f - sunGone! < 30 && (
          <circle cx={O.x} cy={O.y} r={110 + (f - sunGone!) * 30} fill="none" stroke="#fff4cf" strokeWidth={24 * (1 - (f - sunGone!) / 30)} opacity={1 - (f - sunGone!) / 30} />
        )}
        {/* the light shell and the gravity wave travel together */}
        <Ring r={waveR} color="#ffe39a" w={5} />
        <Ring r={waveR + 10} color={C.teal} w={4} />
        {waveR > 0 && waveLabels > 0 && (
          <>
            <Label x={O.x + waveR * 0.7 + 30} y={O.y - waveR * 0.62 * 0.7 - 20} text="Licht" o={waveLabels} size={38} color="#ffe39a" anchor="start" />
            <Label x={O.x + waveR * 0.7 + 30} y={O.y - waveR * 0.62 * 0.7 + 26} text="Schwerkraft" o={waveLabels} size={38} color={C.teal} anchor="start" />
          </>
        )}
        {/* gravity as a stretched band from the sun (or the spot where it was) to the earth */}
        {ropeOn && (
          <g>
            <line x1={O.x} y1={O.y} x2={e.x} y2={e.y} stroke={C.teal} strokeWidth={5} opacity={0.5} strokeDasharray="10 10" strokeDashoffset={-f * 2} />
            {[0.3, 0.55, 0.8].map((k) => {
              const x = lerp(e.x, O.x, k);
              const y = lerp(e.y, O.y, k);
              const a = (Math.atan2(O.y - e.y, O.x - e.x) * 180) / Math.PI;
              return <path key={k} d="M -10 -9 L 6 0 L -10 9" fill="none" stroke={C.teal} strokeWidth={4} transform={`translate(${x} ${y}) rotate(${a})`} opacity={0.8} />;
            })}
          </g>
        )}
        {free !== undefined && f >= free && f - free < 20 && (
          <circle cx={e.x} cy={e.y} r={50 + (f - free) * 6} fill="none" stroke={C.teal} strokeWidth={6} opacity={1 - (f - free) / 20} />
        )}
        {trail.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={6 * (1 - i / 40)} fill="#8fd0ff" opacity={0.35 * (1 - i / 40)} />)}
        {ghost && (
          <g opacity={ghostO * 0.7}>
            <line x1={earthPos(ghostAt!).x} y1={earthPos(ghostAt!).y} x2={ghost.x} y2={ghost.y} stroke="#fff" strokeWidth={3} strokeDasharray="8 10" />
            <circle cx={ghost.x} cy={ghost.y} r={40} fill="#3b7bd8" opacity={0.6} />
            <Label x={ghost.x} y={ghost.y - 60} text="?" o={1} size={70} />
          </g>
        )}
        <Earth f={f} x={e.x} y={e.y} r={40} id="orbit" />
      </g>
    </>
  );
};

// the rubber sheet: a grid with a dip; remove the ball and the flattening spreads outwards as a wave
export const SheetScene: React.FC<{f: number; t0: number; liftAt: number; end: number}> = ({f, t0, liftAt, end}) => {
  const cam = camAt(f, [[t0, {x: 960, y: 560, z: 0.95}], [liftAt, {x: 960, y: 540, z: 1.05}], [end, {x: 980, y: 540, z: 1.12}]]);
  const front = f < liftAt ? -1 : (f - liftAt) * 0.014; // in sheet units
  const dip = (r: number) => -1.0 / (1 + (r * r) / 0.035);
  const h = (r: number) => {
    if (front < 0) return dip(r);
    const s = clamp01((r - front + 0.08) / 0.16); // 0 inside (flat), 1 outside (still dipped)
    const ripple = 0.12 * Math.exp(-((r - front) ** 2) / 0.004) * Math.cos((r - front) * 60);
    return dip(r) * s + ripple;
  };
  const proj = (x: number, y: number) => {
    const r = Math.hypot(x, y);
    const d = 1 + y * 0.35; // simple perspective
    return {x: 960 + (x * 900) / d, y: 520 + (y * 330) / d - h(r) * 260};
  };
  const N = 26;
  const lines: string[] = [];
  for (let i = 0; i <= N; i++) {
    const a: string[] = [];
    const b: string[] = [];
    for (let j = 0; j <= 60; j++) {
      const u = -1 + (2 * i) / N;
      const v = -1 + (2 * j) / 60;
      const p = proj(u, v);
      const q = proj(v, u);
      a.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
      b.push(`${q.x.toFixed(1)},${q.y.toFixed(1)}`);
    }
    lines.push(a.join(' '), b.join(' '));
  }
  const lift = clamp01((f - liftAt) / 26);
  const ballP = proj(0, 0);
  const ball = {x: ballP.x, y: lerp(ballP.y - 70, -300, Easing.in(Easing.cubic)(lift))};
  // small marble (earth) orbiting on the sheet
  const ang = f * 0.035;
  const mx = Math.cos(ang) * 0.55;
  const my = Math.sin(ang) * 0.55;
  const m = proj(mx, my);
  return (
    <>
      <SpaceBack f={f} cam={cam} dim={0.7} />
      <g transform={layer(cam, 1, O)}>
        {lines.map((pts, i) => (
          <polyline key={i} points={pts} fill="none" stroke={i % 2 ? '#7a6cff' : '#5fa8ff'} strokeWidth={2.2} opacity={0.75} />
        ))}
        {front > 0 && (() => {
          const pts = Array.from({length: 73}, (_, i) => {
            const a = (i / 72) * Math.PI * 2;
            const p = proj(Math.cos(a) * front, Math.sin(a) * front);
            return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
          }).join(' ');
          return <polyline points={pts} fill="none" stroke={C.teal} strokeWidth={6} opacity={0.9 * (1 - clamp01((front - 1) / 0.4))} />;
        })()}
        {lift < 1 && (
          <g>
            <circle cx={ball.x} cy={ball.y} r={70} fill="url(#corona2)" />
            <circle cx={ball.x} cy={ball.y} r={62} fill="url(#sunBody)" />
          </g>
        )}
        <Earth f={f} x={m.x} y={m.y - 18} r={22} id="marble" />
        <Label x={ball.x} y={ball.y - 100} text="Sonne" o={1 - lift} size={36} />
        <Label x={m.x} y={m.y - 60} text="Erde" o={rise(f, t0 + 20, 12)} size={28} />
      </g>
    </>
  );
};

// two neutron stars spiral together, merge; light and gravity waves travel side by side to the earth
export const NeutronScene: React.FC<{f: number; t0: number; mergeAt: number; arriveAt: number; end: number}> = ({f, t0, mergeAt, arriveAt, end}) => {
  const NS = {x: 380, y: 540};
  const EA = {x: 1700, y: 560};
  const cam = camAt(f, [[t0, {x: NS.x + 120, y: 540, z: 1.9}], [mergeAt, {x: NS.x + 60, y: 540, z: 2.1}], [mergeAt + 50, {x: 960, y: 540, z: 1.0}], [end, {x: 1100, y: 540, z: 1.05}]]);
  const pre = f < mergeAt;
  const k = clamp01((f - t0) / Math.max(1, mergeAt - t0));
  const sep = lerp(90, 6, Easing.in(Easing.quad)(k));
  const ang = Math.pow(k, 2.2) * 40 + (f - t0) * 0.05;
  const R = f >= mergeAt ? lerp(0, EA.x - NS.x, clamp01((f - mergeAt) / Math.max(1, arriveAt - mergeAt))) : 0;
  const flash = f >= mergeAt ? 1 - clamp01((f - mergeAt) / 24) : 0;
  const arrived = f >= arriveAt;
  return (
    <>
      <SpaceBack f={f} cam={cam} />
      <g transform={layer(cam, 1, O)}>
        {pre ? (
          [0, 1].map((i) => {
            const a = ang + i * Math.PI;
            const x = NS.x + Math.cos(a) * sep;
            const y = NS.y + Math.sin(a) * sep * 0.5;
            return (
              <g key={i}>
                <circle cx={x} cy={y} r={34} fill="url(#nsGlow)" />
                <circle cx={x} cy={y} r={13} fill="#eaf4ff" />
              </g>
            );
          })
        ) : (
          <g>
            <circle cx={NS.x} cy={NS.y} r={40 + 300 * (1 - flash)} fill="url(#nsGlow)" opacity={flash} />
            <circle cx={NS.x} cy={NS.y} r={16} fill="#fff" opacity={0.6} />
          </g>
        )}
        {/* small ripples while spiralling */}
        {pre && Array.from({length: 5}, (_, i) => {
          const r = ((f * 4 + i * 60) % 300);
          return <circle key={i} cx={NS.x} cy={NS.y} r={r} fill="none" stroke={C.teal} strokeWidth={3} opacity={0.4 * (1 - r / 300) * k} />;
        })}
        {R > 0 && (
          <>
            {[0, 18, 36].map((d, i) => (
              <circle key={i} cx={NS.x} cy={NS.y} r={Math.max(0, R - d)} fill="none" stroke={C.teal} strokeWidth={5 - i} opacity={0.8 - i * 0.2} />
            ))}
            <circle cx={NS.x} cy={NS.y} r={R + 6} fill="none" stroke="#ffe39a" strokeWidth={5} opacity={0.9} />
          </>
        )}
        <line x1={NS.x + 60} x2={EA.x - 60} y1={NS.y + 200} y2={EA.y + 180} stroke="rgba(255,255,255,0.3)" strokeWidth={3} strokeDasharray="3 12" />
        <Label x={(NS.x + EA.x) / 2} y={NS.y + 250} text="130 Mio. Lichtjahre" o={rise(f, mergeAt + 30, 14)} size={40} />
        <Earth f={f} x={EA.x} y={EA.y} r={40} id="ns" />
        {arrived && f - arriveAt < 40 && (
          <circle cx={EA.x} cy={EA.y} r={50 + (f - arriveAt) * 4} fill="none" stroke="#fff" strokeWidth={5} opacity={1 - (f - arriveAt) / 40} />
        )}
        <Label x={EA.x} y={EA.y - 80} text="gleichzeitig" o={arrived ? rise(f, arriveAt, 10) : 0} size={40} color="#ffe39a" />
        <Label x={NS.x} y={NS.y - 110} text="Neutronensterne" o={rise(f, t0 + 6, 12) * (1 - rise(f, mergeAt + 20, 12))} size={30} />
      </g>
      {flash > 0 && <rect width={SW} height={SH} fill="#eaf4ff" opacity={0.5 * flash} />}
    </>
  );
};

export const GravityDefs: React.FC = () => (
  <defs>
    <radialGradient id="nsGlow"><stop offset="0" stopColor="#ffffff" /><stop offset="0.3" stopColor="#a9d8ff" stopOpacity="0.8" /><stop offset="1" stopColor="#6a8cff" stopOpacity="0" /></radialGradient>
  </defs>
);

// re-exported helper used by the drift scene
export const ringAt = (r: number, color: string) => <Ring r={r} color={color} />;
export {fontFamily, rnd};
