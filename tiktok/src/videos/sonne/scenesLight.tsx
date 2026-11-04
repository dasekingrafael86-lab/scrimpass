// Scenes 35 s – 109 s: why you notice nothing, the speed of light, the distance, the past, the shell of light.
import React from 'react';
import {Easing} from 'remotion';
import {C} from '../../lib/theme';
import {kitFont as fontFamily} from '../../design/kit';
import {rise} from '../../lib/timing';
import {
  Cam, EARTH, Earth, Label, LightStream, Nebula, PC, ParkScene, SKY_SUN, SUN, Stars, Sun, Tree,
  camAt, clamp01, layer, lerp, rnd,
} from './Intro';
import {SH, SW} from './Video';
import {Character, MIA, PAPA, cycle} from '../../design/kit';

export const SpaceBack: React.FC<{f: number; cam: Cam; c?: {x: number; y: number}; dim?: number}> = ({f, cam, c = {x: 960, y: 540}, dim = 1}) => (
  <>
    <rect width={SW} height={SH} fill="url(#spaceBg)" />
    <g transform={layer(cam, 0.12, c)} opacity={dim}><Nebula /></g>
    <g transform={layer(cam, 0.25, c)}><Stars f={f} dim={dim * 0.8} /></g>
    <g transform={layer(cam, 0.45, {x: c.x + 300, y: c.y})}><Stars f={f + 40} dim={dim * 0.5} /></g>
  </>
);

// a photon: bright head with a soft comet tail along the direction it came from
export const Photon: React.FC<{x: number; y: number; dx: number; dy: number; len?: number; r?: number; color?: string}> = ({x, y, dx, dy, len = 160, r = 9, color = '#fff2c4'}) => {
  const n = Math.hypot(dx, dy) || 1;
  const ux = dx / n;
  const uy = dy / n;
  return (
    <g>
      {Array.from({length: 14}, (_, i) => (
        <circle key={i} cx={x - ux * len * (i / 14)} cy={y - uy * len * (i / 14)} r={r * (1 - i / 16)} fill={color} opacity={0.5 * (1 - i / 14)} />
      ))}
      <circle cx={x} cy={y} r={r * 3.2} fill="url(#photonGlow)" />
      <circle cx={x} cy={y} r={r} fill="#fff" />
    </g>
  );
};

export const LightDefs: React.FC = () => (
  <defs>
    <radialGradient id="photonGlow"><stop offset="0" stopColor="#fff3c0" stopOpacity="0.9" /><stop offset="1" stopColor="#ffb547" stopOpacity="0" /></radialGradient>
    <radialGradient id="ball" cx="38%" cy="35%" r="70%"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#c9d3e6" /></radialGradient>
    <linearGradient id="nightSky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#0b0d2e" /><stop offset="0.65" stopColor="#1d1f5c" /><stop offset="1" stopColor="#3b2f78" />
    </linearGradient>
    <radialGradient id="moonGlow"><stop offset="0.45" stopColor="#e9eeff" stopOpacity="0.5" /><stop offset="1" stopColor="#e9eeff" stopOpacity="0" /></radialGradient>
    <radialGradient id="moonBody" cx="40%" cy="38%" r="70%"><stop offset="0" stopColor="#fbfbff" /><stop offset="1" stopColor="#b9bfd8" /></radialGradient>
    <radialGradient id="shellIn"><stop offset="0.9" stopColor="#020310" stopOpacity="0.55" /><stop offset="1" stopColor="#020310" stopOpacity="0" /></radialGradient>
    <linearGradient id="fieldSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4d9df5" /><stop offset="1" stopColor="#bfe8ff" /></linearGradient>
  </defs>
);

// ---------------------------------------------------------------------------------------
// 1) "Warum merkst du nichts? Weil Licht Zeit braucht." — flashback: sun still there, light slows down

export const WhyScene: React.FC<{f: number; t0: number; slowAt: number}> = ({f, t0, slowAt}) => {
  const t = f - t0;
  const cam = camAt(f, [[t0, {x: 990, y: 540, z: 0.92}], [slowAt, {x: 1100, y: 540, z: 1.1}], [slowAt + 120, {x: 1250, y: 540, z: 1.45}]]);
  // the stream slows to a crawl so you can see each photon move
  const slow = rise(f, slowAt, 30);
  const phase = t0 * 3.2 + (Math.min(f, slowAt) - t0) * 3.2 + Math.max(0, f - slowAt) * lerp(3.2, 0.5, slow);
  const tag = rise(f, slowAt + 10, 16);
  const px = lerp(SUN.x + SUN.r + 40, EARTH.x - EARTH.r - 30, clamp01((f - slowAt) / 150));
  return (
    <>
      <SpaceBack f={f} cam={cam} />
      <g transform={layer(cam, 1, {x: 990, y: 540})}>
        <LightStream f={f} tailX={-1e4} phase={phase} o={1 - 0.5 * slow} />
        <Sun f={f} x={SUN.x} y={SUN.y} r={SUN.r} scale={1} />
        <Earth f={f} x={EARTH.x} y={EARTH.y} r={EARTH.r} id="why" />
        <g opacity={tag}>
          <Photon x={px} y={SUN.y} dx={1} dy={0} len={220} r={11} />
          <Label x={px} y={SUN.y - 50} text="unterwegs" o={1} size={30} color="#ffe3a0" />
        </g>
      </g>
      <g opacity={rise(f, t0 + 4, 14) * (1 - rise(f, slowAt - 8, 10))}>
        <Label x={SW / 2} y={190} text="Warum merkst du nichts?" o={1} size={76} />
      </g>
    </>
  );
};

// 2) speed of light: a photon laps the earth 7 times per second
export const LapScene: React.FC<{f: number; t0: number; lapsAt: number; end: number}> = ({f, t0, lapsAt, end}) => {
  const cam = camAt(f, [[t0, {x: 960, y: 560, z: 0.8}], [lapsAt, {x: 960, y: 540, z: 1.0}], [end, {x: 960, y: 530, z: 1.12}]]);
  const R = 250;
  // before: photon flies straight across fast; from lapsAt: 7 laps in 30 frames, then a beat, repeat
  const parts: React.ReactNode[] = [];
  const back: React.ReactNode[] = [];
  let count = 0;
  if (f >= lapsAt) {
    const cyc = (f - lapsAt) % 54;
    const p = Math.min(1, cyc / 30);
    count = Math.min(7, Math.floor(p * 7 + 0.0001) + (p >= 1 ? 0 : 1));
    if (cyc < 34) {
      const ang = p * 7 * Math.PI * 2 - Math.PI / 2;
      for (let i = 0; i < 26; i++) {
        const a = ang - i * 0.09;
        const x = 960 + Math.cos(a) * R * 1.5;
        const y = 540 + Math.sin(a) * R * 0.42;
        const el = <circle key={i} cx={x} cy={y} r={(i === 0 ? 12 : 9) * (1 - i / 30)} fill={i === 0 ? '#fff' : '#ffe39a'} opacity={i === 0 ? 1 : 0.7 * (1 - i / 26)} />;
        (Math.sin(a) < 0 ? back : parts).push(el);
      }
    }
  } else {
    const k = ((f - t0) % 45) / 45;
    parts.push(<Photon key="p" x={lerp(-200, SW + 200, k)} y={300} dx={1} dy={0} len={420} r={10} />);
  }
  return (
    <>
      <SpaceBack f={f} cam={cam} />
      <g transform={layer(cam, 1, {x: 960, y: 540})}>
        <ellipse cx={960} cy={540} rx={R * 1.5} ry={R * 0.42} fill="none" stroke="#ffe39a" strokeWidth={2} strokeDasharray="6 10" opacity={0.35 * rise(f, lapsAt, 10)} />
        {back}
        <Earth f={f} x={960} y={540} r={R} id="lap" />
        {parts}
      </g>
      {f >= lapsAt && (
        <g opacity={rise(f, lapsAt, 10)}>
          <text x={SW / 2} y={190} textAnchor="middle" fontFamily={fontFamily} fontWeight={900} fontSize={120} fill="#ffe39a" style={{fontVariantNumeric: 'tabular-nums'}}>{count}×</text>
          <Label x={SW / 2} y={250} text="um die Erde – in einer Sekunde" o={1} size={36} />
        </g>
      )}
    </>
  );
};

// 3) the distance: sun far left, earth far right; the camera has to travel (world is 6000 px wide)
const FAR = {sun: 300, earth: 5600, y: 540};
export const DistanceScene: React.FC<{f: number; t0: number; end: number; photonFrom?: number; timer?: boolean}> = ({f, t0, end, photonFrom, timer}) => {
  const travel = photonFrom !== undefined;
  const k = travel ? clamp01((f - photonFrom!) / (end - photonFrom! - 20)) : 0;
  const px = lerp(FAR.sun + 200, FAR.earth - 60, Easing.inOut(Easing.quad)(k));
  const cam: Cam = travel
    ? {x: Math.max(960, Math.min(FAR.earth - 700, px + 200)), y: 540, z: 1.0}
    : camAt(f, [[t0, {x: 700, y: 540, z: 1.25}], [t0 + 20, {x: 760, y: 540, z: 1.2}], [end - 10, {x: FAR.earth - 500, y: 540, z: 1.05}]]);
  const kmFrac = travel ? k : clamp01((cam.x - 760) / (FAR.earth - 500 - 760));
  const km = Math.round(kmFrac * 150);
  const sec = Math.round(k * 499);
  return (
    <>
      <SpaceBack f={f} cam={cam} c={{x: 2900, y: 540}} />
      <g transform={layer(cam, 1, {x: 2900, y: 540})}>
        <line x1={FAR.sun + 240} x2={FAR.earth - 40} y1={FAR.y + 300} y2={FAR.y + 300} stroke="rgba(255,255,255,0.35)" strokeWidth={4} strokeDasharray="2 18" strokeLinecap="round" />
        {Array.from({length: 16}, (_, i) => {
          const x = lerp(FAR.sun + 240, FAR.earth - 40, i / 15);
          return (
            <g key={i}>
              <line x1={x} x2={x} y1={FAR.y + 280} y2={FAR.y + 320} stroke="rgba(255,255,255,0.5)" strokeWidth={4} />
              {i % 5 === 0 && <Label x={x} y={FAR.y + 370} text={`${i * 10} Mio. km`} o={0.85} size={28} />}
            </g>
          );
        })}
        <Sun f={f} x={FAR.sun} y={FAR.y} r={200} scale={1} />
        {[{d: 58, r: 9, c: '#b9b0a3', n: 'Merkur'}, {d: 108, r: 13, c: '#f0c48a', n: 'Venus'}].map((p) => {
          const x = lerp(FAR.sun + 240, FAR.earth - 40, p.d / 150);
          return (
            <g key={p.n}>
              <circle cx={x} cy={FAR.y - 40} r={p.r * 3} fill="url(#photonGlow)" opacity={0.25} />
              <circle cx={x} cy={FAR.y - 40} r={p.r} fill={p.c} />
              <Label x={x} y={FAR.y + 10} text={p.n} o={0.85} size={26} />
            </g>
          );
        })}
        {Array.from({length: 40}, (_, i) => (
          <circle key={`d${i}`} cx={FAR.sun + 300 + rnd(i + 70) * 5000} cy={FAR.y - 420 + rnd(i + 90) * 840} r={2 + rnd(i + 110) * 5} fill="#8a84b8" opacity={0.5} />
        ))}
        <Earth f={f} x={FAR.earth} y={FAR.y} r={14} id="far" />
        <Label x={FAR.earth} y={FAR.y + 70} text="Erde" o={1} size={30} />
        {travel && <Photon x={px} y={FAR.y} dx={1} dy={0} len={300} r={12} />}
        {travel && timer && (
          <g>
            <Label x={px} y={FAR.y - 70} text={`${sec} s`} o={1} size={54} color="#ffe39a" />
          </g>
        )}
        {!travel && (
          <Label x={cam.x} y={FAR.y - 190} text={`${km} Mio. km`} o={rise(f, t0 + 12, 12)} size={58} />
        )}
      </g>
    </>
  );
};

// 4) football and peppercorn, 24 m apart on a meadow
export const BallScene: React.FC<{f: number; t0: number; end: number}> = ({f, t0, end}) => {
  const L = 4200; // 24 m in world px
  const x0 = 500;
  const tape = clamp01((f - t0 - 30) / (end - t0 - 90));
  const cam = camAt(f, [[t0, {x: 760, y: 640, z: 1.35}], [t0 + 40, {x: 900, y: 640, z: 1.1}], [end - 40, {x: x0 + L - 300, y: 690, z: 1.25}], [end, {x: x0 + L - 60, y: 720, z: 2.6}]]);
  const C0 = {x: 2400, y: 640};
  const gy = 820;
  return (
    <>
      <g transform={layer(cam, 0.1, C0)}><rect x={-2000} y={-1000} width={8000} height={3000} fill="url(#fieldSky)" /></g>
      <g transform={layer(cam, 0.35, C0)}>
        {Array.from({length: 10}, (_, i) => (
          <ellipse key={i} cx={-300 + i * 700 + ((f * 0.4) % 700)} cy={180 + (i % 3) * 70} rx={140} ry={38} fill="#fff" opacity={0.9} />
        ))}
      </g>
      <g transform={layer(cam, 0.6, C0)}>
        <path d={`M -1000 ${gy - 60} Q 1200 ${gy - 200} 2400 ${gy - 70} T 6000 ${gy - 90} L 6000 ${gy + 200} L -1000 ${gy + 200} Z`} fill="#58c46e" />
        {Array.from({length: 9}, (_, i) => <Tree key={i} x={-200 + i * 720} y={gy - 40} s={0.6} f={f} ph={i} c1="#3aa864" c2="#52c47a" />)}
      </g>
      <g transform={layer(cam, 1, C0)}>
        <rect x={-1500} y={gy} width={9000} height={1200} fill="url(#grass)" />
        {Array.from({length: 18}, (_, i) => (
          <rect key={i} x={-1000 + i * 500} y={gy} width={250} height={1200} fill="#ffffff" opacity={0.05} />
        ))}
        {/* the tape measure unrolls from the ball */}
        <rect x={x0} y={gy + 26} width={L * tape} height={22} rx={4} fill="#ffd23f" />
        {Array.from({length: 25}, (_, i) => i / 24 <= tape && (
          <g key={i}>
            <line x1={x0 + (L * i) / 24} x2={x0 + (L * i) / 24} y1={gy + 26} y2={gy + 40} stroke="#4a3a10" strokeWidth={3} />
            {i % 4 === 0 && <text x={x0 + (L * i) / 24 + 6} y={gy + 45} fontFamily={fontFamily} fontWeight={800} fontSize={14} fill="#4a3a10">{i} m</text>}
          </g>
        ))}
        <rect x={x0 + L * tape - 40} y={gy + 14} width={60} height={46} rx={10} fill="#e8a417" />
        {/* the ball (sun) and the peppercorn (earth) */}
        <g transform={`translate(${x0 - 40} ${gy - 110}) rotate(${Math.sin(f * 0.03) * 3})`}>
          <ellipse cx={0} cy={112} rx={90} ry={14} fill="#000" opacity={0.15} />
          <circle r={110} fill="#ffcf5a" />
          <circle r={110} fill="url(#ball)" opacity={0.3} />
          {[0, 72, 144, 216, 288].map((a) => <path key={a} d="M 0 -34 L 32 -10 L 20 28 L -20 28 L -32 -10 Z" fill="#d68a17" transform={`rotate(${a}) translate(0 -62) scale(0.75)`} />)}
          <path d="M 0 -34 L 32 -10 L 20 28 L -20 28 L -32 -10 Z" fill="#d68a17" />
        </g>
        <Label x={x0 - 40} y={gy - 260} text="Sonne" o={1 - rise(f, t0 + 90, 20)} size={40} />
        <g transform={`translate(${x0 + L} ${gy - 3})`}>
          <circle r={3.5} fill="#3b2a1e" />
          <circle r={3.5} fill="#3b7bd8" opacity={rise(f, end - 30, 20)} />
        </g>
        <Label x={x0 + L} y={gy - 30} text="Erde" o={rise(f, end - 40, 14)} size={18} />
        <Label x={x0 + L * tape} y={gy - 70} text={`${Math.round(tape * 24)} m`} o={tape > 0.02 && tape < 1 ? 1 : rise(f, end - 50, 10)} size={48} color="#ffd23f" />
      </g>
    </>
  );
};

// 5) everything you see is the past: night, a person on a hill, the moon and old stars
const PAST_STARS = [
  {x: 520, y: 220, txt: 'vor Jahrhunderten', at: 0},
  {x: 1180, y: 140, txt: 'vor Jahrtausenden', at: 14},
  {x: 300, y: 430, txt: 'vor 50 Jahren', at: 28},
];
export const PastScene: React.FC<{f: number; t0: number; moonAt: number; starsAt: number; upAt: number}> = ({f, t0, moonAt, starsAt, upAt}) => {
  const cam = camAt(f, [[t0, {x: 960, y: 700, z: 1.1}], [moonAt + 20, {x: 1200, y: 560, z: 1.15}], [starsAt + 10, {x: 900, y: 420, z: 1.0}], [upAt, {x: 900, y: 360, z: 1.05}], [upAt + 120, {x: 960, y: 120, z: 1.25}]]);
  const C0 = {x: 960, y: 540};
  const MOON = {x: 1560, y: 260};
  const k = clamp01((f - moonAt - 10) / 40);
  return (
    <>
      <g transform={layer(cam, 0.1, C0)}><rect x={-1000} y={-1500} width={4000} height={3600} fill="url(#nightSky)" /></g>
      <g transform={layer(cam, 0.3, C0)}>
        <Stars f={f} dim={1} />
        <g transform="translate(0 -700)"><Stars f={f + 90} dim={0.9} /></g>
        {/* milky way band */}
        <ellipse cx={900} cy={-100} rx={1400} ry={160} fill="#8a7cff" opacity={0.12} transform="rotate(-18 900 -100)" />
        {PAST_STARS.map((s, i) => {
          const o = rise(f, starsAt + s.at, 14);
          const pul = 1 + 0.15 * Math.sin(f * 0.15 + i);
          return (
            <g key={i} opacity={o}>
              <circle cx={s.x} cy={s.y} r={34 * pul} fill="url(#photonGlow)" />
              <circle cx={s.x} cy={s.y} r={6} fill="#fff" />
              <circle cx={s.x} cy={s.y} r={46} fill="none" stroke="#ffe39a" strokeWidth={2.5} strokeDasharray="5 7" transform={`rotate(${f} ${s.x} ${s.y})`} />
              <Label x={s.x} y={s.y + 86} text={s.txt} o={1} size={30} color="#ffe39a" />
            </g>
          );
        })}
      </g>
      <g transform={layer(cam, 0.55, C0)}>
        <circle cx={MOON.x} cy={MOON.y} r={190} fill="url(#moonGlow)" />
        <circle cx={MOON.x} cy={MOON.y} r={96} fill="url(#moonBody)" />
        {[[-30, -20, 18], [28, 22, 14], [10, -42, 9], [-38, 34, 10], [44, -10, 8]].map(([dx, dy, r], i) => (
          <circle key={i} cx={MOON.x + dx} cy={MOON.y + dy} r={r} fill="#a9afc9" opacity={0.6} />
        ))}
        {/* the moon's light travelling to the person */}
        {f >= moonAt && (
          <g opacity={1 - rise(f, starsAt - 10, 14)}>
            <line x1={MOON.x - 80} y1={MOON.y + 70} x2={760} y2={860} stroke="#e9eeff" strokeWidth={3} strokeDasharray="6 12" opacity={0.6} />
            <Photon x={lerp(MOON.x - 80, 760, k)} y={lerp(MOON.y + 70, 860, k)} dx={760 - MOON.x} dy={860 - MOON.y} r={8} len={120} color="#e9eeff" />
            <Label x={MOON.x} y={MOON.y + 160} text="vor 1,3 Sekunden" o={rise(f, moonAt + 6, 12)} size={34} color="#e9eeff" />
          </g>
        )}
      </g>
      <g transform={layer(cam, 0.8, C0)}>
        <path d="M -600 980 Q 300 780 1100 900 T 2600 860 L 2600 1600 L -600 1600 Z" fill="#191a46" />
        {Array.from({length: 7}, (_, i) => <Tree key={i} x={1300 + i * 170} y={900 + Math.sin(i) * 20} s={0.5} f={f} ph={i} c1="#151639" c2="#1c1d4a" />)}
      </g>
      <g transform={layer(cam, 1, C0)}>
        <path d="M -700 1100 Q 500 830 1300 1020 T 2800 1000 L 2800 1800 L -700 1800 Z" fill="#0f1033" />
        {/* Mia and dad sitting on the hill, looking up */}
        <g filter="url(#kitNight)">
          <Character f={f} x={700} y={930} s={0.95} {...PAPA} sit mood={cycle(['curious', 'happy'], 70, 1)} look={{x: 0.7, y: -1}} armAngles={[20, -150]} talk={Math.floor(f / 50) % 3 === 0} />
          <Character f={f} x={850} y={935} s={0.72} {...MIA} sit mood={cycle(['joy', 'curious'], 60, 2)} look={{x: 0.8, y: -1}} />
        </g>
        {/* fireflies */}
        {Array.from({length: 14}, (_, i) => {
          const x = 300 + rnd(i) * 1400 + Math.sin(f * 0.02 + i) * 40;
          const y = 950 + rnd(i + 4) * 150 + Math.cos(f * 0.03 + i) * 20;
          return <circle key={i} cx={x} cy={y} r={3} fill="#f6ff9a" opacity={0.3 + 0.6 * (0.5 + 0.5 * Math.sin(f * 0.2 + i * 2))} />;
        })}
      </g>
    </>
  );
};

// 6) "a letter from someone who no longer exists": back in the sunny park, an envelope rides a sunbeam
export const LetterScene: React.FC<{f: number; t0: number; letterAt: number; end: number}> = ({f, t0, letterAt, end}) => {
  const HZ = 1030;
  const cam = camAt(f, [[t0, {x: 900, y: HZ + 300, z: 1.25}], [letterAt, {x: 1200, y: 800, z: 1.0}], [end, {x: 1050, y: 900, z: 1.1}]]);
  const k = clamp01((f - letterAt) / Math.max(1, end - letterAt - 10));
  const ex = lerp(SKY_SUN.x - 60, 780, Easing.inOut(Easing.cubic)(k));
  const ey = lerp(SKY_SUN.y + 40, HZ + 470, Easing.inOut(Easing.cubic)(k)) + Math.sin(f * 0.12) * 18;
  const rot = Math.sin(f * 0.1) * 12;
  return (
    <>
      <ParkScene f={f} cam={cam} night={0} />
      <g transform={layer(cam, 1, PC)}>
        {/* warm sun beams */}
        {[0, 1, 2, 3].map((i) => (
          <path key={i} d={`M ${SKY_SUN.x} ${SKY_SUN.y} L ${300 + i * 380} ${HZ + 700} L ${420 + i * 380} ${HZ + 700} Z`} fill="#fff3b0" opacity={0.08 + 0.04 * Math.sin(f * 0.05 + i)} />
        ))}
        {f >= letterAt && (
          <g transform={`translate(${ex} ${ey}) rotate(${rot}) scale(${1.4 + 0.4 * Math.sin(k * Math.PI)})`}>
            <circle r={70} fill="url(#photonGlow)" />
            <rect x={-48} y={-32} width={96} height={64} rx={6} fill="#fff8e6" stroke="#e3c27a" strokeWidth={3} />
            <path d="M -48 -32 L 0 8 L 48 -32" fill="none" stroke="#e3c27a" strokeWidth={3} />
            <circle cx={0} cy={6} r={9} fill={C.red} />
          </g>
        )}
      </g>
    </>
  );
};

// 7) a thin shell of light races towards us; behind it, nothing
export const ShellScene: React.FC<{f: number; t0: number; nothingAt: number; end: number}> = ({f, t0, nothingAt, end}) => {
  const R = lerp(380, 1000, clamp01((f - t0) / (end - t0)));
  const cam = camAt(f, [[t0, {x: 900, y: 540, z: 0.62}], [nothingAt - 10, {x: 820, y: 540, z: 0.78}], [end, {x: 520, y: 540, z: 1.05}]]);
  return (
    <>
      <SpaceBack f={f} cam={cam} />
      <g transform={layer(cam, 1, {x: 960, y: 540})}>
        <circle cx={SUN.x} cy={SUN.y} r={R} fill="url(#shellIn)" />
        <circle cx={SUN.x} cy={SUN.y} r={R} fill="none" stroke="#ffe7a8" strokeWidth={16} opacity={0.5} />
        <circle cx={SUN.x} cy={SUN.y} r={R} fill="none" stroke="#fff" strokeWidth={4} />
        {/* sparkles riding the shell */}
        {Array.from({length: 60}, (_, i) => {
          const a = (i / 60) * Math.PI * 2 + rnd(i) * 0.1;
          const rr = R + (rnd(i + 3) - 0.5) * 30;
          return <circle key={i} cx={SUN.x + Math.cos(a) * rr} cy={SUN.y + Math.sin(a) * rr} r={2 + rnd(i + 7) * 4} fill="#fff4cf" opacity={0.5 + 0.5 * Math.sin(f * 0.3 + i)} />;
        })}
        <LightStream f={f} tailX={SUN.x + R} />
        <circle cx={SUN.x} cy={SUN.y} r={SUN.r} fill="none" stroke="#fff" strokeWidth={4} strokeDasharray="14 16" opacity={0.45} transform={`rotate(${f * 0.2} ${SUN.x} ${SUN.y})`} />
        <Earth f={f} x={EARTH.x} y={EARTH.y} r={EARTH.r} id="shell" />
        <Label x={SUN.x} y={SUN.y + 40} text="nichts" o={rise(f, nothingAt, 14)} size={64} color="rgba(255,255,255,0.75)" />
        <Label x={SUN.x + R * 0.72} y={SUN.y - R * 0.72 - 30} text="die letzte Lichtschale" o={rise(f, t0 + 50, 14) * (1 - rise(f, nothingAt, 10))} size={44} color="#ffe39a" />
      </g>
    </>
  );
};
