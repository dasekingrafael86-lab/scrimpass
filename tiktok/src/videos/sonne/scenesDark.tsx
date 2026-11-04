// Scenes 159 s – 264 s: what happens at zero (city, grid, planes, satellites, moon, planets, drift).
import React from 'react';
import {Easing} from 'remotion';
import {C, fontFamily} from '../../lib/theme';
import {rise} from '../../lib/timing';
import {Cam, Earth, Label, Stars, Sun, Tree, camAt, clamp01, layer, lerp, rnd} from './Intro';
import {Photon, SpaceBack} from './scenesLight';
import {O, earthPos} from './scenesGravity';
import {SH, SW} from './Video';

export const DarkDefs: React.FC = () => (
  <defs>
    <linearGradient id="daySky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3f8ff0" /><stop offset="1" stopColor="#bfe6ff" /></linearGradient>
    <linearGradient id="nightSky2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#050720" /><stop offset="1" stopColor="#1a1d52" /></linearGradient>
    <radialGradient id="lampGlow"><stop offset="0" stopColor="#ffe6a0" stopOpacity="0.9" /><stop offset="1" stopColor="#ffb547" stopOpacity="0" /></radialGradient>
    <linearGradient id="lampCone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffe6a0" stopOpacity="0.45" /><stop offset="1" stopColor="#ffe6a0" stopOpacity="0" /></linearGradient>
    <radialGradient id="jup" cx="40%" cy="38%" r="70%"><stop offset="0" stopColor="#f6d7a8" /><stop offset="1" stopColor="#b9774a" /></radialGradient>
    <radialGradient id="sat" cx="40%" cy="38%" r="70%"><stop offset="0" stopColor="#f8e7b0" /><stop offset="1" stopColor="#c49a55" /></radialGradient>
    <radialGradient id="tele"><stop offset="0.82" stopColor="#000" stopOpacity="0" /><stop offset="0.86" stopColor="#000" stopOpacity="1" /></radialGradient>
  </defs>
);

// ---------------------------------------------------------------------------------------
// big stopwatch: "what happens when the clock hits zero?"

export const ClockScene: React.FC<{f: number; t0: number; remaining: (f: number) => number}> = ({f, t0, remaining}) => {
  const r = remaining(f);
  const z = 1 + 0.08 * rise(f, t0, 60);
  const a = ((r % 60) / 60) * 360;
  const mm = String(Math.floor(r / 60)).padStart(2, '0');
  const ss = String(Math.floor(r % 60)).padStart(2, '0');
  return (
    <>
      <SpaceBack f={f} cam={{x: 960, y: 540, z: 1}} dim={0.6} />
      <g transform={`translate(960 560) scale(${z})`}>
        <circle r={330} fill="#10133a" stroke="#2c3170" strokeWidth={18} />
        {Array.from({length: 60}, (_, i) => (
          <line key={i} x1={0} y1={-300} x2={0} y2={i % 5 ? -285 : -262} stroke={i % 5 ? '#4b5199' : '#fff'} strokeWidth={i % 5 ? 3 : 7} transform={`rotate(${i * 6})`} />
        ))}
        {/* the remaining seconds as an orange wedge running out */}
        <path d={`M 0 0 L 0 -250 A 250 250 0 ${a > 180 ? 1 : 0} 1 ${Math.sin((a * Math.PI) / 180) * 250} ${-Math.cos((a * Math.PI) / 180) * 250} Z`} fill={C.orange} opacity={0.25} />
        <line x1={0} y1={30} x2={0} y2={-255} stroke={C.orange} strokeWidth={8} strokeLinecap="round" transform={`rotate(${a})`} />
        <circle r={16} fill={C.orange} />
        <rect x={-50} y={-410} width={100} height={60} rx={14} fill="#2c3170" />
        <text y={130} textAnchor="middle" fontFamily={fontFamily} fontWeight={900} fontSize={110} fill="#fff" style={{fontVariantNumeric: 'tabular-nums'}}>{mm}:{ss}</text>
      </g>
      <Label x={SW / 2} y={1020} text="Was passiert bei 00:00?" o={rise(f, t0 + 8, 14)} size={56} />
    </>
  );
};

// ---------------------------------------------------------------------------------------
// the city street at the moment the light stops

const CC = {x: 1300, y: 640};
const STREET = 900;
const BUILD_BACK = Array.from({length: 22}, (_, i) => ({x: -500 + i * 170, w: 130 + rnd(i) * 60, h: 260 + rnd(i + 4) * 320}));
const BUILD_FRONT = Array.from({length: 11}, (_, i) => ({x: -400 + i * 330, w: 290, h: 300 + rnd(i + 30) * 240, c: ['#e86a5a', '#f0b23a', '#5aa2e8', '#8a6ad8', '#3fc2a2'][i % 5]}));

export const CityScene: React.FC<{f: number; cam: Cam; night: number; lampsAt?: number; starsAt?: number; solarOff?: number; flicker?: number}> = ({
  f, cam, night, lampsAt, starsAt, solarOff, flicker,
}) => {
  const lamp = (i: number) => (lampsAt === undefined ? 0 : rise(f, lampsAt + i * 5, 4));
  const stars = starsAt === undefined ? 0 : rise(f, starsAt, 30);
  const win = (i: number) => night * (rnd(i) > 0.35 ? 1 : 0) * rise(f, (lampsAt ?? 0) + rnd(i + 5) * 60, 3);
  const flick = flicker !== undefined && f >= flicker && f < flicker + 50 ? (Math.sin(f * 2.3) > 0.2 ? 1 : 0.25) : 1;
  return (
    <>
      <g transform={layer(cam, 0.1, CC)}>
        <rect x={-1500} y={-1000} width={5000} height={3000} fill="url(#daySky)" />
        <rect x={-1500} y={-1000} width={5000} height={3000} fill="url(#nightSky2)" opacity={night} />
      </g>
      <g transform={layer(cam, 0.2, CC)} opacity={stars}><Stars f={f} dim={1} /></g>
      <g transform={layer(cam, 0.3, CC)} opacity={1 - night}>
        <Sun f={f} x={1900} y={150} r={70} scale={1} />
      </g>
      <g transform={layer(cam, 0.6, CC)}>
        {BUILD_BACK.map((b, i) => (
          <g key={i}>
            <rect x={b.x} y={STREET - 80 - b.h} width={b.w} height={b.h + 80} fill={night ? '#22285e' : '#86a9e6'} opacity={1} />
            <rect x={b.x} y={STREET - 80 - b.h} width={b.w} height={b.h + 80} fill="#86a9e6" opacity={1 - night} />
            {Array.from({length: Math.floor(b.h / 46)}, (_, j) => (
              <rect key={j} x={b.x + 16} y={STREET - 60 - b.h + j * 46} width={b.w - 32} height={16} fill="#ffd77a" opacity={0.85 * win(i * 31 + j)} />
            ))}
          </g>
        ))}
        {/* power line with pylons */}
        {[0, 1, 2, 3].map((i) => (
          <g key={i} transform={`translate(${-200 + i * 900} ${STREET - 70})`}>
            <path d="M -40 0 L 0 -300 L 40 0 M -60 -240 L 60 -240 M -45 -200 L 45 -200" stroke={night ? '#0e1236' : '#5a6a90'} strokeWidth={8} fill="none" />
          </g>
        ))}
        <path d={`M -200 ${STREET - 310} Q 250 ${STREET - 250} 700 ${STREET - 310} Q 1150 ${STREET - 250} 1600 ${STREET - 310} Q 2050 ${STREET - 250} 2500 ${STREET - 310}`} stroke={night ? '#0e1236' : '#5a6a90'} strokeWidth={3} fill="none" />
        {flicker !== undefined && f >= flicker && f < flicker + 50 && flick > 0.5 && (
          <circle cx={700} cy={STREET - 310} r={30} fill="url(#lampGlow)" />
        )}
      </g>
      <g transform={layer(cam, 1, CC)}>
        {BUILD_FRONT.map((b, i) => {
          const top = STREET - b.h;
          const panelsOff = solarOff === undefined ? 0 : rise(f, solarOff + i * 3, 6);
          return (
            <g key={i}>
              <rect x={b.x} y={top} width={b.w} height={b.h} fill={b.c} />
              <rect x={b.x} y={top} width={b.w} height={b.h} fill="#060820" opacity={night * 0.62} />
              {/* solar panels on the roof */}
              {[0, 1, 2].map((p) => (
                <g key={p} transform={`translate(${b.x + 24 + p * 88} ${top - 30}) skewX(-20)`}>
                  <rect width={76} height={30} fill={panelsOff > 0.5 ? '#2a2f45' : '#2f6bd8'} stroke="#cfd8ea" strokeWidth={3} />
                  <line x1={38} x2={38} y1={0} y2={30} stroke="#cfd8ea" strokeWidth={2} />
                  {night < 0.5 && <rect x={((f * 3 + p * 30 + i * 17) % 140) - 40} width={14} height={30} fill="#fff" opacity={0.35} />}
                </g>
              ))}
              {Array.from({length: 3}, (_, r) => Array.from({length: 3}, (_, c) => {
                const id = i * 9 + r * 3 + c;
                const lit = win(id + 400);
                return <rect key={`${r}${c}`} x={b.x + 30 + c * 85} y={top + 40 + r * 80} width={60} height={50} rx={6} fill={lit > 0.5 ? '#ffd77a' : night > 0.5 ? '#141943' : '#bfe0ff'} />;
              }))}
              <rect x={b.x + 30} y={STREET - 110} width={230} height={110} rx={8} fill={night > 0.5 ? '#ffcf70' : '#d3ecff'} opacity={0.9} />
              <rect x={b.x + 20} y={STREET - 130} width={250} height={26} rx={6} fill={['#ff5d50', '#3fd2c2', '#ffb547'][i % 3]} />
            </g>
          );
        })}
        <rect x={-1000} y={STREET} width={5000} height={600} fill="#3a3f5c" />
        <rect x={-1000} y={STREET} width={5000} height={40} fill="#9aa0b8" />
        {Array.from({length: 30}, (_, i) => <rect key={i} x={-1000 + i * 200 - ((f * 6) % 200) * 0} y={STREET + 180} width={100} height={12} fill="#e8e8f0" opacity={0.6} />)}
        {/* street lamps */}
        {Array.from({length: 10}, (_, i) => {
          const x = -300 + i * 360;
          const o = lamp(i);
          return (
            <g key={i}>
              <rect x={x - 6} y={STREET - 230} width={12} height={250} fill="#2a2d44" />
              <path d={`M ${x} ${STREET - 230} Q ${x + 10} ${STREET - 262} ${x + 50} ${STREET - 250}`} stroke="#2a2d44" strokeWidth={10} fill="none" />
              <rect x={x + 34} y={STREET - 256} width={40} height={16} rx={6} fill={o > 0.5 ? '#fff1b8' : '#666a80'} />
              <g opacity={o}>
                <path d={`M ${x + 40} ${STREET - 244} L ${x - 70} ${STREET + 60} L ${x + 160} ${STREET + 60} L ${x + 68} ${STREET - 244} Z`} fill="url(#lampCone)" />
                <circle cx={x + 54} cy={STREET - 244} r={60} fill="url(#lampGlow)" />
              </g>
            </g>
          );
        })}
        {/* cars */}
        {[0, 1, 2].map((i) => {
          const dir = i % 2 ? -1 : 1;
          const x = ((i * 900 + f * 7 * dir) % 3600 + 3600) % 3600 - 600;
          const y = STREET + (dir > 0 ? 230 : 120);
          return (
            <g key={i} transform={`translate(${x} ${y}) scale(${dir} 1)`}>
              <rect x={-110} y={-60} width={220} height={56} rx={22} fill={['#ff5d50', '#3fd2c2', '#f0b23a'][i]} />
              <path d="M -60 -60 L -30 -100 L 50 -100 L 80 -60 Z" fill={['#ff5d50', '#3fd2c2', '#f0b23a'][i]} />
              <path d="M -48 -62 L -24 -92 L 12 -92 L 12 -62 Z M 22 -62 L 22 -92 L 46 -92 L 68 -62 Z" fill="#cfe8ff" />
              <circle cx={-60} cy={-4} r={24} fill="#1c1d2e" /><circle cx={64} cy={-4} r={24} fill="#1c1d2e" />
              <g opacity={night}>
                <path d="M 106 -40 L 420 -90 L 420 20 Z" fill="url(#lampCone)" transform="rotate(-90 106 -40) rotate(90 106 -40)" />
                <circle cx={106} cy={-40} r={14} fill="#fff6c8" />
              </g>
            </g>
          );
        })}
        {/* pedestrians */}
        {[0, 1, 2, 3].map((i) => {
          const dir = i % 2 ? -1 : 1;
          const x = ((300 + i * 700 + f * 1.6 * dir) % 3000 + 3000) % 3000 - 400;
          const st = Math.sin(f * 0.3 + i) * 10;
          return (
            <g key={i} transform={`translate(${x} ${STREET + 30})`}>
              <line x1={-6} y1={-50} x2={-6 - st} y2={0} stroke="#232046" strokeWidth={11} strokeLinecap="round" />
              <line x1={6} y1={-50} x2={6 + st} y2={0} stroke="#232046" strokeWidth={11} strokeLinecap="round" />
              <rect x={-20} y={-120} width={40} height={76} rx={18} fill={['#7a5cff', '#ff5d50', '#3fd2c2', '#f0b23a'][i]} />
              <circle cx={0} cy={-142} r={22} fill={['#f2b98d', '#c98a60', '#8a5a3c', '#f2c9a0'][i]} />
            </g>
          );
        })}
      </g>
    </>
  );
};

// a plane in the sudden night, with a gauge for the power grid
export const PlaneScene: React.FC<{f: number; t0: number; end: number}> = ({f, t0, end}) => {
  const k = clamp01((f - t0) / (end - t0));
  const x = lerp(-300, SW + 300, k);
  const y = 520 - Math.sin(k * Math.PI) * 60;
  const blink = Math.floor(f / 12) % 2;
  return (
    <>
      <rect width={SW} height={SH} fill="url(#nightSky2)" />
      <g transform={`translate(${-k * 120} 0)`}><Stars f={f} dim={1} /></g>
      {Array.from({length: 7}, (_, i) => (
        <ellipse key={i} cx={((i * 400 - f * 3) % 2600 + 2600) % 2600 - 300} cy={880 + (i % 2) * 60} rx={340} ry={70} fill="#2a2f6a" opacity={0.85} />
      ))}
      <g transform={`translate(${x} ${y}) rotate(-3) scale(1.4)`}>
        <path d="M -230 0 Q -230 -36 -170 -36 L 170 -36 Q 250 -30 260 0 Q 250 30 170 36 L -170 36 Q -230 36 -230 0 Z" fill="#dfe4f5" />
        <path d="M -40 10 L 80 160 L 130 160 L 60 10 Z" fill="#c4cbe4" />
        <path d="M -40 -10 L 50 -110 L 90 -110 L 50 -10 Z" fill="#aeb6d6" />
        <path d="M -200 -30 L -250 -130 L -200 -130 L -150 -30 Z" fill="#c4cbe4" />
        {Array.from({length: 12}, (_, i) => <circle key={i} cx={-140 + i * 26} cy={-6} r={7} fill="#ffd77a" />)}
        <circle cx={105} cy={160} r={8} fill={blink ? '#ff5d50' : '#40101a'} />
        <circle cx={-235} cy={-130} r={8} fill={blink ? '#fff' : '#333'} />
        {blink === 1 && <circle cx={105} cy={160} r={30} fill="#ff5d50" opacity={0.3} />}
      </g>
    </>
  );
};

// earth from orbit: satellites with dimming solar wings; then the ISS with a draining battery
export const SatScene: React.FC<{f: number; t0: number; issAt: number; end: number; lightOff: number}> = ({f, t0, issAt, end, lightOff}) => {
  const iss = f >= issAt;
  const issA = (f - t0) * 0.004 - 1.9;
  const ip = {x: 960 + Math.cos(issA) * 560, y: 1100 + Math.sin(issA) * 560 * 0.45};
  const base = camAt(f, [[t0, {x: 960, y: 700, z: 0.9}], [issAt, {x: 960, y: 640, z: 1.0}]]);
  const fol = rise(f, issAt, 30);
  const cam = {x: lerp(base.x, ip.x, fol), y: lerp(base.y, ip.y - 60, fol), z: lerp(base.z, 1.7, fol)};
  const dark = rise(f, lightOff, 20);
  const sats = Array.from({length: 14}, (_, i) => {
    const a = f * (0.006 + rnd(i) * 0.006) + rnd(i + 3) * 6.28;
    const rr = 470 + rnd(i + 8) * 160;
    return {x: 960 + Math.cos(a) * rr, y: 1100 + Math.sin(a) * rr * 0.45, front: Math.sin(a) > 0, i};
  });
  const batt = clamp01(1 - (f - issAt - 20) / 160);
  const Sat = ({x, y, i}: {x: number; y: number; i: number}) => (
    <g transform={`translate(${x} ${y}) rotate(${i * 25})`}>
      <rect x={-46} y={-8} width={34} height={16} fill={dark > 0.5 ? '#3a3f55' : '#3f8ff0'} stroke="#cfd8ea" strokeWidth={2} />
      <rect x={12} y={-8} width={34} height={16} fill={dark > 0.5 ? '#3a3f55' : '#3f8ff0'} stroke="#cfd8ea" strokeWidth={2} />
      <rect x={-10} y={-12} width={20} height={24} rx={4} fill="#d6dbe8" />
      {dark < 0.5 && <circle r={4} fill="#fff" opacity={0.8} />}
    </g>
  );
  return (
    <>
      <SpaceBack f={f} cam={cam} />
      <g transform={layer(cam, 1, {x: 960, y: 540})}>
        {sats.filter((s) => !s.front).map((s) => <Sat key={s.i} {...s} />)}
        <Earth f={f} x={960} y={1100} r={420} id="sat" />
        <circle cx={960} cy={1100} r={420} fill="#020414" opacity={0.55 * dark} />
        {/* city lights appear on the darkened earth */}
        {Array.from({length: 40}, (_, i) => {
          const a = rnd(i) * 6.28;
          const rr = Math.sqrt(rnd(i + 2)) * 380;
          return <circle key={i} cx={960 + Math.cos(a) * rr} cy={1100 + Math.sin(a) * rr} r={3 + rnd(i + 5) * 3} fill="#ffd77a" opacity={dark * 0.8} />;
        })}
        {sats.filter((s) => s.front).map((s) => <Sat key={s.i} {...s} />)}
        {iss && (
          <g transform={`translate(${ip.x} ${ip.y}) scale(1.1)`}>
            {[-1, 1].map((sd) => [0, 1].map((j) => (
              <rect key={`${sd}${j}`} x={sd > 0 ? 40 + j * 46 : -84 - j * 46} y={-50} width={40} height={100} fill="#3a3f55" stroke="#cfd8ea" strokeWidth={2} />
            )))}
            <rect x={-40} y={-6} width={80} height={12} fill="#d6dbe8" />
            <rect x={-20} y={-24} width={40} height={48} rx={10} fill="#eef1f8" />
            <rect x={-8} y={-40} width={16} height={80} rx={6} fill="#cfd5e6" />
            {/* battery */}
            <g transform="translate(-40 -130)">
              <rect width={90} height={44} rx={8} fill="none" stroke="#fff" strokeWidth={5} />
              <rect x={90} y={14} width={8} height={16} rx={2} fill="#fff" />
              <rect x={6} y={6} width={78 * batt} height={32} rx={4} fill={batt > 0.3 ? C.teal : C.red} />
            </g>
            <Label x={5} y={-160} text="ISS" o={rise(f, issAt + 10, 12)} size={34} />
          </g>
        )}
      </g>
    </>
  );
};

// the moon only reflects; it goes dark almost at once
export const MoonScene: React.FC<{f: number; t0: number; offAt: number; end: number}> = ({f, t0, offAt, end}) => {
  const cam = camAt(f, [[t0, {x: 900, y: 540, z: 0.9}], [end, {x: 1150, y: 540, z: 1.25}]]);
  const lightOn = 1 - rise(f, offAt, 6);
  const moonOff = rise(f, offAt + 39, 10);
  const M = {x: 1250, y: 540};
  return (
    <>
      <SpaceBack f={f} cam={cam} />
      <g transform={layer(cam, 1, {x: 960, y: 540})}>
        {/* sunlight coming in from the left and bouncing off */}
        {Array.from({length: 6}, (_, i) => {
          const y = M.y - 150 + i * 60;
          const ph = ((f * 9 + i * 70) % 700);
          return (
            <g key={i} opacity={lightOn}>
              <line x1={-200} y1={y} x2={M.x - Math.sqrt(Math.max(0, 230 * 230 - (y - M.y) ** 2))} y2={y} stroke="#ffe39a" strokeWidth={3} opacity={0.35} />
              <Photon x={-200 + ph * 1.6} y={y} dx={1} dy={0} r={6} len={90} />
            </g>
          );
        })}
        <circle cx={M.x} cy={M.y} r={330} fill="url(#moonGlow)" opacity={1 - moonOff} />
        <circle cx={M.x} cy={M.y} r={230} fill="url(#moonBody)" />
        {[[-70, -50, 40], [60, 50, 34], [20, -100, 22], [-90, 80, 26], [110, -20, 20], [-10, 20, 16]].map(([dx, dy, r], i) => (
          <circle key={i} cx={M.x + dx} cy={M.y + dy} r={r} fill="#a9afc9" opacity={0.55} />
        ))}
        <circle cx={M.x} cy={M.y} r={230} fill="#050716" opacity={0.88 * moonOff} />
        <Label x={M.x} y={M.y + 300} text="+1,3 s" o={rise(f, offAt + 5, 10)} size={56} color="#e9eeff" />
      </g>
    </>
  );
};

// top-down solar system: the light shell sweeps outwards; planets behind it go dark one after another
const PLANETS = [
  {r: 90, s: 9, c: '#b9b0a3', name: ''},
  {r: 140, s: 14, c: '#f0c48a', name: ''},
  {r: 200, s: 15, c: '#3b7bd8', name: 'Erde'},
  {r: 260, s: 11, c: '#d8633f', name: ''},
  {r: 520, s: 40, c: 'url(#jup)', name: 'Jupiter'},
  {r: 860, s: 34, c: 'url(#sat)', name: 'Saturn', ring: true},
];
export const SystemScene: React.FC<{f: number; t0: number; jupAt: number; satAt: number; end: number}> = ({f, t0, jupAt, satAt, end}) => {
  // shell radius: earth reached at t0, Jupiter around jupAt+60, Saturn near the end
  const shell = interpolate3(f, [t0, satAt + 10, end - 20], [200, 540, 880]);
  const pos = (p: typeof PLANETS[number], i: number) => {
    const a = f * (0.004 / Math.sqrt(p.r / 100)) + i * 1.7;
    return {x: O.x + Math.cos(a) * p.r, y: O.y + Math.sin(a) * p.r * 0.55};
  };
  const jp = pos(PLANETS[4], 4);
  const sp = pos(PLANETS[5], 5);
  const cam = camAt(f, [
    [t0, {x: 960, y: 540, z: 0.75}],
    [jupAt, {x: 960, y: 540, z: 0.62}],
    [jupAt + 30, {x: jp.x, y: jp.y, z: 1.5}],
    [satAt, {x: jp.x, y: jp.y, z: 1.4}],
    [satAt + 30, {x: sp.x, y: sp.y, z: 1.5}],
    [end, {x: sp.x, y: sp.y, z: 1.6}],
  ]);
  return (
    <>
      <SpaceBack f={f} cam={cam} />
      <g transform={layer(cam, 1, O)}>
        {PLANETS.map((p, i) => <ellipse key={i} cx={O.x} cy={O.y} rx={p.r} ry={p.r * 0.55} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={2} strokeDasharray="3 10" />)}
        <ellipse cx={O.x} cy={O.y} rx={shell} ry={shell * 0.55} fill="#02030c" opacity={0.45} />
        <ellipse cx={O.x} cy={O.y} rx={shell} ry={shell * 0.55} fill="none" stroke="#ffe39a" strokeWidth={6} />
        <ellipse cx={O.x} cy={O.y} rx={shell} ry={shell * 0.55} fill="none" stroke="#ffe39a" strokeWidth={22} opacity={0.2} />
        <circle cx={O.x} cy={O.y} r={40} fill="none" stroke="#fff" strokeWidth={3} strokeDasharray="8 10" opacity={0.4} />
        {PLANETS.map((p, i) => {
          const q = pos(p, i);
          const inside = Math.hypot(q.x - O.x, (q.y - O.y) / 0.55) < shell;
          // light from Jupiter/Saturn takes time to come back to us: they fade softly
          return (
            <g key={i}>
              {!inside && <circle cx={q.x} cy={q.y} r={p.s * 2.4} fill="url(#photonGlow)" opacity={0.5} />}
              {p.ring && <ellipse cx={q.x} cy={q.y} rx={p.s * 2.1} ry={p.s * 0.6} fill="none" stroke={inside ? '#3a3640' : '#e9d29a'} strokeWidth={6} transform={`rotate(-15 ${q.x} ${q.y})`} />}
              <circle cx={q.x} cy={q.y} r={p.s} fill={p.c} />
              <circle cx={q.x} cy={q.y} r={p.s} fill="#04050f" opacity={inside ? 0.85 : 0} />
              {p.name && <Label x={q.x} y={q.y + p.s + 40} text={p.name} o={0.9} size={i === 2 ? 26 : 32} />}
            </g>
          );
        })}
      </g>
    </>
  );
};

const interpolate3 = (f: number, xs: number[], ys: number[]) => {
  if (f <= xs[0]) return ys[0];
  for (let i = 0; i < xs.length - 1; i++) if (f <= xs[i + 1]) return lerp(ys[i], ys[i + 1], (f - xs[i]) / (xs[i + 1] - xs[i]));
  return ys[ys.length - 1];
};

// through a telescope: Saturn fading out, framed by the round eyepiece
export const TelescopeScene: React.FC<{f: number; t0: number; end: number}> = ({f, t0, end}) => {
  const k = clamp01((f - t0 - 60) / (end - t0 - 90));
  const wob = Math.sin(f * 0.05) * 6;
  return (
    <>
      <rect width={SW} height={SH} fill="#02030a" />
      <g transform={`translate(${960 + wob} ${540 - wob * 0.6})`}>
        <Stars f={f} dim={0.8} />
        <g transform="translate(-960 -540)">
          <circle cx={960} cy={540} r={200} fill="url(#photonGlow)" opacity={0.4 * (1 - k)} />
          <ellipse cx={960} cy={540} rx={260} ry={60} fill="none" stroke="#e9d29a" strokeWidth={26} transform="rotate(-15 960 540)" opacity={1 - k * 0.85} />
          <circle cx={960} cy={540} r={130} fill="url(#sat)" />
          <path d="M 840 500 Q 960 480 1080 500" stroke="#b08a48" strokeWidth={10} fill="none" opacity={0.6} />
          <path d="M 835 560 Q 960 540 1085 560" stroke="#b08a48" strokeWidth={8} fill="none" opacity={0.5} />
          <circle cx={960} cy={540} r={131} fill="#02030a" opacity={0.92 * k} />
        </g>
      </g>
      <circle cx={960} cy={540} r={1100} fill="url(#tele)" />
      <circle cx={960} cy={540} r={470} fill="none" stroke="#1c1f30" strokeWidth={30} />
      {[0, 90, 180, 270].map((a) => <line key={a} x1={960} y1={540 - 470} x2={960} y2={540 - 430} stroke="#555a75" strokeWidth={4} transform={`rotate(${a} 960 540)`} />)}
    </>
  );
};

// the earth loses its hold and flies straight on; then all the planets scatter
export const DriftScene: React.FC<{f: number; t0: number; free: number; scatterAt: number; end: number; waveFrom: number}> = ({f, t0, free, scatterAt, end, waveFrom}) => {
  const e = earthPos(f, free);
  const cam = camAt(f, [
    [t0, {x: 960, y: 540, z: 0.9}],
    [free, {x: earthPos(free).x, y: earthPos(free).y, z: 1.2}],
    [scatterAt - 10, {x: earthPos(scatterAt - 10, free).x, y: earthPos(scatterAt - 10, free).y, z: 1.3}],
    [scatterAt + 40, {x: 960, y: 540, z: 0.42}],
    [end, {x: 960, y: 540, z: 0.32}],
  ]);
  const waveR = (f - waveFrom) * 3.0;
  const scatter = f >= scatterAt;
  const others = [
    {r: 170, s: 9, c: '#b9b0a3', a0: 2.1}, {r: 250, s: 14, c: '#f0c48a', a0: 4.0}, {r: 520, s: 14, c: '#d8633f', a0: 0.9},
    {r: 900, s: 40, c: 'url(#jup)', a0: 3.3}, {r: 1300, s: 34, c: 'url(#sat)', a0: 5.2}, {r: 1700, s: 24, c: '#8fd3e8', a0: 1.6},
  ];
  return (
    <>
      <SpaceBack f={f} cam={cam} />
      <g transform={layer(cam, 1, O)}>
        <ellipse cx={O.x} cy={O.y} rx={360} ry={360 * 0.62} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={3} strokeDasharray="4 12" />
        <circle cx={O.x} cy={O.y} r={110} fill="none" stroke="#fff" strokeWidth={3} strokeDasharray="12 14" opacity={0.4} />
        {waveR > 0 && (
          <g>
            <ellipse cx={O.x} cy={O.y} rx={waveR} ry={waveR * 0.62} fill="none" stroke={C.teal} strokeWidth={5} />
            <ellipse cx={O.x} cy={O.y} rx={waveR} ry={waveR * 0.62} fill="none" stroke={C.teal} strokeWidth={18} opacity={0.2} />
          </g>
        )}
        {f < free + 60 && (
          <line x1={O.x} y1={O.y} x2={e.x} y2={e.y} stroke={C.teal} strokeWidth={5} strokeDasharray="10 10" opacity={0.5 * (1 - rise(f, free, 8))} />
        )}
        {f >= free && <line x1={earthPos(free).x} y1={earthPos(free).y} x2={e.x} y2={e.y} stroke="#8fd0ff" strokeWidth={4} strokeDasharray="6 10" opacity={0.6} />}
        {scatter && others.map((p, i) => {
          const dt = f - scatterAt + 60;
          const a = p.a0;
          const x0 = O.x + Math.cos(a) * p.r;
          const y0 = O.y + Math.sin(a) * p.r * 0.62;
          const sp = 2.6 / Math.sqrt(p.r / 360);
          const x = x0 - Math.sin(a) * sp * dt;
          const y = y0 + Math.cos(a) * sp * dt * 0.62;
          return (
            <g key={i} opacity={rise(f, scatterAt, 20)}>
              <line x1={x0} y1={y0} x2={x} y2={y} stroke="rgba(255,255,255,0.35)" strokeWidth={4} strokeDasharray="6 12" />
              <circle cx={x} cy={y} r={p.s * 1.6} fill={p.c} />
              <circle cx={x} cy={y} r={p.s * 1.6} fill="#04050f" opacity={0.6} />
            </g>
          );
        })}
        <Earth f={f} x={e.x} y={e.y} r={scatter ? 50 : 40} id="drift" />
      </g>
    </>
  );
};

export {Tree, Easing};
