// Scenes 264 s – 352 s: the cold (village, heat escaping, weather, pipes, fuel, plants, ocean).
import React from 'react';
import {C} from '../../lib/theme';
import {kitFont as fontFamily} from '../../design/kit';
import {rise} from '../../lib/timing';
import {Cam, Earth, Label, Stars, Tree, camAt, clamp01, layer, lerp, rnd} from './Intro';
import {SpaceBack} from './scenesLight';
import {SH, SW} from './Video';
import {Character, Face, MIA, Mood, NEIGHBOUR_A, NEIGHBOUR_B, P as KP, PAPA, cycle} from '../../design/kit';

export const mix = (a: string, b: string, t: number) => {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const A = p(a);
  const B = p(b);
  const k = clamp01(t);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(',')})`;
};

export const ColdDefs: React.FC = () => (
  <defs>
    <linearGradient id="coldSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#04061a" /><stop offset="1" stopColor="#1b2457" /></linearGradient>
    <radialGradient id="fireGlow"><stop offset="0" stopColor="#ffcf70" stopOpacity="0.85" /><stop offset="1" stopColor="#ff7a2e" stopOpacity="0" /></radialGradient>
    <linearGradient id="sea2" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#1d4f9a" /><stop offset="0.5" stopColor="#0d2350" /><stop offset="1" stopColor="#030816" />
    </linearGradient>
    <linearGradient id="ice" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f2f8ff" /><stop offset="1" stopColor="#9cc6ea" /></linearGradient>
    <linearGradient id="dayLand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#62b8f2" /><stop offset="1" stopColor="#cdeeff" /></linearGradient>
  </defs>
);

const Snow: React.FC<{f: number; n?: number; o?: number; speed?: number; big?: boolean; w?: number; h?: number}> = ({f, n = 120, o = 1, speed = 1.6, big, w = SW, h = SH}) => (
  <g opacity={o}>
    {Array.from({length: n}, (_, i) => {
      const x = ((rnd(i) * w + Math.sin(f * 0.02 + i) * 30) % w + w) % w;
      const y = ((rnd(i + 50) * h + f * speed * (0.6 + rnd(i + 9))) % (h + 40)) - 20;
      const r = (big ? 5 : 2) + rnd(i + 3) * (big ? 6 : 3);
      return <circle key={i} cx={x} cy={y} r={r} fill="#fff" opacity={0.6 + 0.4 * rnd(i + 7)} />;
    })}
  </g>
);

// ---------------------------------------------------------------------------------------
// village at night: warm windows first, then frost, snow, people around a fire barrel

const VC = {x: 1000, y: 600};
const GROUND = 880;
const HOUSES = Array.from({length: 7}, (_, i) => ({x: -200 + i * 360, w: 260 + rnd(i) * 60, h: 220 + rnd(i + 3) * 120, c: ['#c0584a', '#d8a23a', '#4a7fc0', '#7a5cb0'][i % 4]}));

export const VillageScene: React.FC<{f: number; cam: Cam; frost: number; snow: number; people: number; warmGround?: number}> = ({f, cam, frost, snow, people, warmGround = 0}) => (
  <>
    <g transform={layer(cam, 0.1, VC)}><rect x={-1500} y={-1000} width={5000} height={3000} fill="url(#coldSky)" /></g>
    <g transform={layer(cam, 0.2, VC)}><Stars f={f} dim={1 - snow * 0.7} /></g>
    <g transform={layer(cam, 0.5, VC)}>
      <path d={`M -800 ${GROUND - 60} L -300 ${GROUND - 380} L 200 ${GROUND - 90} L 700 ${GROUND - 450} L 1300 ${GROUND - 100} L 1900 ${GROUND - 420} L 2600 ${GROUND - 80} L 3200 ${GROUND - 300} L 3800 ${GROUND} Z`} fill="#1a2152" />
      <path d={`M -300 ${GROUND - 380} L -170 ${GROUND - 300} L -420 ${GROUND - 310} Z M 700 ${GROUND - 450} L 850 ${GROUND - 350} L 550 ${GROUND - 360} Z M 1900 ${GROUND - 420} L 2050 ${GROUND - 320} L 1760 ${GROUND - 330} Z`} fill="#dfe9ff" opacity={0.3 + 0.7 * frost} />
      {Array.from({length: 14}, (_, i) => <Tree key={i} x={-300 + i * 260} y={GROUND - 40} s={0.55} f={f * (1 - frost)} ph={i} c1={mix('#1d4a3a', '#cfdcf0', frost * 0.8)} c2={mix('#245a46', '#eef4ff', frost * 0.8)} />)}
    </g>
    <g transform={layer(cam, 1, VC)}>
      <rect x={-1500} y={GROUND} width={5000} height={1200} fill={mix('#2a3a40', '#dce8f8', frost)} />
      {warmGround > 0 && Array.from({length: 18}, (_, i) => {
        const x = -400 + i * 200 + Math.sin(f * 0.03 + i) * 20;
        const y = GROUND + 60 - ((f * 1.2 + i * 40) % 160);
        return <path key={i} d={`M ${x} ${y + 60} Q ${x + 15} ${y + 30} ${x} ${y} Q ${x - 15} ${y - 30} ${x} ${y - 60}`} stroke="#ff9a5a" strokeWidth={4} fill="none" opacity={warmGround * 0.35 * (1 - ((f * 1.2 + i * 40) % 160) / 160)} />;
      })}
      {HOUSES.map((h, i) => {
        const top = GROUND - h.h;
        return (
          <g key={i}>
            <rect x={h.x} y={top} width={h.w} height={h.h} fill={mix(h.c, '#3a4270', 0.55)} />
            <path d={`M ${h.x - 24} ${top} L ${h.x + h.w / 2} ${top - 120} L ${h.x + h.w + 24} ${top} Z`} fill="#2a2440" />
            <path d={`M ${h.x - 24} ${top} L ${h.x + h.w / 2} ${top - 120} L ${h.x + h.w + 24} ${top} L ${h.x + h.w + 24} ${top + 12} L ${h.x + h.w / 2} ${top - 104} L ${h.x - 24} ${top + 12} Z`} fill="#f4f8ff" opacity={frost} />
            {/* chimney smoke */}
            <rect x={h.x + h.w * 0.7} y={top - 120} width={34} height={70} fill="#2a2440" />
            {Array.from({length: 6}, (_, j) => {
              const t = ((f * 0.8 + j * 25 + i * 13) % 150) / 150;
              return <circle key={j} cx={h.x + h.w * 0.7 + 17 + Math.sin(t * 6 + i) * 20 + t * 60} cy={top - 130 - t * 220} r={14 + t * 30} fill="#9aa3c8" opacity={0.35 * (1 - t)} />;
            })}
            {[0, 1].map((c) => (
              <g key={c}>
                <rect x={h.x + 40 + c * (h.w - 140)} y={top + 50} width={60} height={60} rx={6} fill="#ffc96a" />
                <circle cx={h.x + 70 + c * (h.w - 140)} cy={top + 80} r={70} fill="url(#fireGlow)" opacity={0.35} />
              </g>
            ))}
            <rect x={h.x + h.w / 2 - 30} y={GROUND - 100} width={60} height={100} rx={6} fill="#3a2a2a" />
            {/* icicles */}
            {Array.from({length: 10}, (_, j) => (
              <path key={j} d={`M ${h.x + j * (h.w / 10) + 8} ${top + 4} l 6 ${(18 + rnd(i * 10 + j) * 30) * frost} l 6 ${-(18 + rnd(i * 10 + j) * 30) * frost} Z`} fill="#e6f3ff" opacity={frost} />
            ))}
            <rect x={h.x - 10} y={GROUND - 12} width={h.w + 20} height={24} rx={12} fill="#f4f8ff" opacity={frost} />
          </g>
        );
      })}
      {/* people around a fire barrel */}
      {people > 0 && (
        <g transform={`translate(1200 ${GROUND + 160})`} opacity={people}>
          <circle cx={0} cy={-60} r={260} fill="url(#fireGlow)" opacity={0.5 + 0.1 * Math.sin(f * 0.4)} />
          <rect x={-55} y={-120} width={110} height={130} rx={10} fill="#4a3a3a" />
          <rect x={-55} y={-90} width={110} height={10} fill="#3a2a2a" /><rect x={-55} y={-40} width={110} height={10} fill="#3a2a2a" />
          {Array.from({length: 7}, (_, i) => {
            const t = ((f * 2 + i * 9) % 40) / 40;
            return <path key={i} d={`M ${-40 + i * 13} -120 Q ${-50 + i * 13 + Math.sin(f * 0.3 + i) * 12} ${-160 - 60 * (1 - t)} ${-30 + i * 13} ${-200 - 80 * (1 - t)} Q ${-20 + i * 13} -150 ${-28 + i * 13} -120 Z`} fill={i % 2 ? '#ffb547' : '#ff7a2e'} opacity={0.9} />;
          })}
          <g filter="url(#kitCold)">
            {[{x: -250, c: PAPA, s: 0.95, m: ['worried', 'sad'] as Mood[]}, {x: -120, c: MIA, s: 0.7, m: ['worried', 'curious'] as Mood[]},
              {x: 130, c: NEIGHBOUR_A, s: 0.92, m: ['sad', 'worried'] as Mood[], fl: true}, {x: 250, c: NEIGHBOUR_B, s: 0.9, m: ['worried', 'sleepy'] as Mood[], fl: true}].map((p, i) => (
              <g key={i}>
                <Character f={f} x={p.x} y={0} s={p.s} {...p.c} flip={p.fl} armAngles={[25, -55 + Math.sin(f * 0.1 + i) * 4]} mood={cycle(p.m, 60, i)} look={{x: p.fl ? -0.6 : 0.6, y: 0.2}} talk={Math.floor((f + i * 30) / 60) % 4 === 0} />
                {/* breath in the cold */}
                <circle cx={p.x + (p.fl ? -1 : 1) * (40 + ((f * 0.6 + i * 20) % 40))} cy={-200 * p.s - ((f * 0.4 + i * 10) % 20)} r={8 + ((f * 0.6 + i * 20) % 40) / 3} fill="#fff" opacity={0.35 * (1 - ((f * 0.6 + i * 20) % 40) / 40)} />
              </g>
            ))}
          </g>
        </g>
      )}
    </g>
    {snow > 0 && <Snow f={f} o={snow} />}
  </>
);

// the earth glows warm and radiates its heat into space; nothing comes back
export const HeatScene: React.FC<{f: number; t0: number; end: number}> = ({f, t0, end}) => {
  const cool = clamp01((f - t0) / (end - t0));
  const cam = camAt(f, [[t0, {x: 960, y: 540, z: 1.2}], [end, {x: 960, y: 540, z: 0.95}]]);
  return (
    <>
      <SpaceBack f={f} cam={cam} dim={0.8} />
      <g transform={layer(cam, 1, {x: 960, y: 540})}>
        <circle cx={960} cy={540} r={380} fill="url(#fireGlow)" opacity={0.45 * (1 - cool * 0.6)} />
        {Array.from({length: 16}, (_, i) => {
          const a = (i / 16) * Math.PI * 2 + 0.1;
          const t = ((f * 1.2 + i * 17) % 110) / 110;
          const r0 = 280 + t * 360;
          const pts = Array.from({length: 9}, (_, j) => {
            const rr = r0 + j * 10;
            const off = Math.sin(j * 1.4 + f * 0.2) * 10;
            return `${960 + Math.cos(a) * rr - Math.sin(a) * off},${540 + Math.sin(a) * rr + Math.cos(a) * off}`;
          }).join(' ');
          return <polyline key={i} points={pts} fill="none" stroke={mix('#ff7a50', '#ff4060', cool)} strokeWidth={6} strokeLinecap="round" opacity={(1 - t) * (1 - cool * 0.5)} />;
        })}
        <Earth f={f} x={960} y={540} r={250} id="heat" mood={cycle(['worried', 'sad'], 70, 3)} />
        <circle cx={960} cy={540} r={250} fill="#0a1030" opacity={0.6} />
        <circle cx={960} cy={540} r={250} fill="#ff7a50" opacity={0.22 * (1 - cool)} />
        <Label x={960} y={150} text="Wärme geht ins All" o={rise(f, t0 + 10, 14)} size={50} color="#ffb08a" />
      </g>
    </>
  );
};

// weather fades away: rain clouds dissolve, last rain turns to snow, the sky clears
export const WeatherScene: React.FC<{f: number; t0: number; snowAt: number; clearAt: number; end: number}> = ({f, t0, snowAt, clearAt, end}) => {
  const cam = camAt(f, [[t0, {x: 960, y: 480, z: 1.1}], [end, {x: 1000, y: 560, z: 1.0}]]);
  const toSnow = rise(f, snowAt, 20);
  const clear = rise(f, clearAt, 40);
  const cloudO = 1 - clear;
  const windStop = 1 - rise(f, t0 + 60, 60);
  return (
    <>
      <rect width={SW} height={SH} fill="url(#coldSky)" />
      <g opacity={clear}><Stars f={f} dim={1} /></g>
      <g transform={layer(cam, 0.5, {x: 960, y: 540})}>
        <path d="M -400 860 L 200 600 L 600 820 L 1100 560 L 1600 800 L 2300 620 L 2400 1100 L -400 1100 Z" fill="#1a2152" />
        <path d="M 200 600 L 310 660 L 100 650 Z M 1100 560 L 1220 630 L 990 630 Z M 2300 620 L 2400 660 L 2200 670 Z" fill="#eef4ff" opacity={0.4 + 0.6 * toSnow} />
      </g>
      <g transform={layer(cam, 1, {x: 960, y: 540})}>
        <rect x={-600} y={880} width={3200} height={600} fill={mix('#2a3a40', '#dce8f8', toSnow)} />
        {/* wind streaks */}
        {Array.from({length: 8}, (_, i) => {
          const x = ((i * 300 + f * 14) % 2600) - 300;
          return <path key={i} d={`M ${x} ${300 + i * 60} q 80 -20 160 0 t 160 0`} stroke="#9fb4ff" strokeWidth={4} fill="none" opacity={0.4 * windStop} />;
        })}
        {[[400, 230, 1.3], [1000, 160, 1.6], [1550, 260, 1.2]].map(([x, y, s], i) => (
          <g key={i} transform={`translate(${x + Math.sin(f * 0.01 + i) * 30 * windStop} ${y}) scale(${s * (0.85 + 0.15 * cloudO)})`} opacity={cloudO}>
            <ellipse cx={0} cy={0} rx={170} ry={60} fill="#5a6290" />
            <circle cx={-60} cy={-30} r={70} fill="#5a6290" />
            <circle cx={50} cy={-50} r={86} fill="#6a72a2" />
            <Face f={f} x={0} y={-20} w={110} seed={90 + i} skin="#5a6290" blush={false} mood={toSnow > 0.5 ? 'sleepy' : cycle(['sad', 'worried'], 60, i)} />
            {/* rain or snow under each cloud */}
            {Array.from({length: 22}, (_, j) => {
              const xx = -150 + rnd(j + i * 30) * 300;
              const yy = 50 + ((f * (toSnow > 0.5 ? 2 : 14) + rnd(j + 7) * 600) % 600);
              return toSnow > 0.5 ? (
                <circle key={j} cx={xx + Math.sin(f * 0.05 + j) * 10} cy={yy} r={5} fill="#fff" />
              ) : (
                <line key={j} x1={xx} y1={yy} x2={xx - 6} y2={yy + 30} stroke="#8fc0ff" strokeWidth={4} strokeLinecap="round" />
              );
            })}
          </g>
        ))}
        {/* heat escaping upwards once the sky is clear */}
        {Array.from({length: 10}, (_, i) => {
          const x = 100 + i * 190;
          const t = ((f * 1.5 + i * 23) % 200) / 200;
          return <path key={i} d={`M ${x} ${860 - t * 700} q 14 -30 0 -60 q -14 -30 0 -60`} stroke="#ff8a6a" strokeWidth={5} fill="none" opacity={clear * 0.7 * (1 - t)} />;
        })}
      </g>
    </>
  );
};

// house cut open: a frozen pipe bursts, the heater runs non-stop
export const PipeScene: React.FC<{f: number; t0: number; burstAt: number; end: number}> = ({f, t0, burstAt, end}) => {
  const cam = camAt(f, [[t0, {x: 960, y: 540, z: 1.0}], [burstAt, {x: 760, y: 600, z: 1.5}], [end, {x: 1120, y: 620, z: 1.3}]]);
  const ice = clamp01((f - t0) / (burstAt - t0));
  const burst = f >= burstAt;
  const hot = 0.6 + 0.4 * Math.sin(f * 0.2);
  return (
    <>
      <rect width={SW} height={SH} fill="url(#coldSky)" />
      <Snow f={f} n={70} />
      <g transform={layer(cam, 1, {x: 960, y: 540})}>
        <path d="M 360 420 L 960 120 L 1560 420 Z" fill="#2a2440" />
        <rect x={420} y={420} width={1080} height={560} fill="#e8d8c0" />
        <rect x={420} y={420} width={1080} height={560} fill="none" stroke="#3a2f45" strokeWidth={26} />
        <rect x={420} y={960} width={1080} height={20} fill="#8a6a50" />
        <rect x={-400} y={980} width={2800} height={300} fill="#dce8f8" />
        {/* pipe along the outer wall */}
        <path d="M 520 980 L 520 600 L 900 600" stroke="#8a9ab8" strokeWidth={34} fill="none" strokeLinecap="round" />
        <path d="M 520 980 L 520 600 L 900 600" stroke="#bfe6ff" strokeWidth={22 * ice} fill="none" opacity={0.9} />
        {burst && (
          <g>
            <path d="M 690 585 l 14 18 l -10 10 l 18 14" stroke="#2a2440" strokeWidth={5} fill="none" />
            {Array.from({length: 26}, (_, i) => {
              const t = ((f - burstAt) * 1.5 + i * 7) % 40 / 40;
              const a = -Math.PI / 2 + (rnd(i) - 0.5) * 1.6;
              return <circle key={i} cx={700 + Math.cos(a) * t * 160} cy={590 + Math.sin(a) * t * 160 + t * t * 120} r={7 * (1 - t) + 2} fill="#8fd0ff" opacity={1 - t} />;
            })}
          </g>
        )}
        {/* heater */}
        <g transform="translate(1100 760)">
          <circle cx={90} cy={60} r={200} fill="url(#fireGlow)" opacity={0.5 * hot} />
          {Array.from({length: 7}, (_, i) => <rect key={i} x={i * 28} y={0} width={20} height={140} rx={8} fill={mix('#c9ccd8', '#ff8a5a', hot)} />)}
          {Array.from({length: 4}, (_, i) => {
            const t = ((f * 1.4 + i * 20) % 80) / 80;
            return <path key={i} d={`M ${30 + i * 40} ${-10 - t * 120} q 10 -20 0 -40 q -10 -20 0 -40`} stroke="#ff9a6a" strokeWidth={4} fill="none" opacity={1 - t} />;
          })}
        </g>
        {/* Mia and dad wrapped in a blanket, watching the heater */}
        <g>
          <Character f={f} x={850} y={960} s={0.95} {...PAPA} sit mood={cycle(['worried', 'sad'], 70, 1)} look={{x: 1, y: 0}} />
          <Character f={f} x={1010} y={960} s={0.75} {...MIA} sit mood={cycle(['sad', 'worried'], 60, 2)} look={{x: -0.5, y: -0.6}} />
          <path d="M 750 960 Q 750 880 850 870 Q 930 900 1010 880 Q 1090 885 1090 960 Z" fill={KP.violet} opacity={0.95} />
          <path d="M 780 960 Q 790 910 850 895" stroke={KP.lilac} strokeWidth={10} fill="none" />
        </g>
      </g>
    </>
  );
};

// fuel becomes the most valuable thing: three stockpiles, prices up, supplies down
export const FuelScene: React.FC<{f: number; t0: number; end: number}> = ({f, t0, end}) => {
  const k = clamp01((f - t0 - 30) / (end - t0 - 60));
  const items = [
    {name: 'Öl', c: '#2a2f45'},
    {name: 'Gas', c: '#3f8ff0'},
    {name: 'Holz', c: '#a0663a'},
  ];
  return (
    <>
      <rect width={SW} height={SH} fill="url(#coldSky)" />
      <Snow f={f} n={60} />
      {items.map((it, i) => {
        const x = 300 + i * 430;
        const o = rise(f, t0 + i * 10, 14);
        const lvl = 1 - k * (0.5 + i * 0.12);
        const price = 1 + k * (4 + i * 2) + Math.sin(f * 0.3 + i) * 0.1 * k;
        return (
          <g key={i} opacity={o} transform={`translate(${x} 0)`}>
            <rect x={-150} y={760} width={300} height={36} rx={10} fill="#3a4270" />
            {i === 0 && (
              <g transform="translate(0 600)">
                <rect x={-80} y={-140} width={160} height={300} rx={20} fill={it.c} />
                {[-80, 0, 80].map((y) => <rect key={y} x={-86} y={y - 8} width={172} height={16} rx={8} fill="#4a5070" />)}
                <path d="M 0 -60 q 30 40 0 70 q -30 -30 0 -70 Z" fill="#ffd23f" />
              </g>
            )}
            {i === 1 && (
              <g transform="translate(0 600)">
                <rect x={-70} y={-150} width={140} height={310} rx={70} fill="#cfd8ea" />
                <rect x={-20} y={-180} width={40} height={40} rx={8} fill="#8a9ab8" />
                {Array.from({length: 5}, (_, j) => (
                  <path key={j} d={`M ${-30 + j * 15} 0 q ${-14 + Math.sin(f * 0.3 + j) * 6} -40 ${4} -${70 + 20 * Math.sin(f * 0.2 + j)} q 18 30 6 70 Z`} fill={j % 2 ? '#3f8ff0' : '#7fc4ff'} />
                ))}
              </g>
            )}
            {i === 2 && (
              <g transform="translate(0 680)">
                {[[-90, 40], [0, 40], [90, 40], [-45, -40], [45, -40], [0, -120]].map(([dx, dy], j) => (
                  <g key={j}><rect x={dx - 44} y={dy - 38} width={88} height={76} rx={38} fill={it.c} /><circle cx={dx} cy={dy} r={30} fill="#e0b080" /><circle cx={dx} cy={dy} r={14} fill="none" stroke="#a0663a" strokeWidth={4} /></g>
                ))}
              </g>
            )}
            <text x={0} y={870} textAnchor="middle" fontFamily={fontFamily} fontWeight={800} fontSize={48} fill="#fff">{it.name}</text>
            {/* price tag going up */}
            <g transform={`translate(110 ${360 - k * 60})`}>
              <rect x={-10} y={-44} width={200} height={70} rx={14} fill={C.orange} />
              <text x={90} y={6} textAnchor="middle" fontFamily={fontFamily} fontWeight={900} fontSize={42} fill="#2a1a00">×{price.toFixed(1).replace('.', ',')}</text>
            </g>
            {/* supply bar going down */}
            <rect x={-150} y={930} width={300} height={22} rx={11} fill="rgba(255,255,255,0.2)" />
            <rect x={-150} y={930} width={300 * lvl} height={22} rx={11} fill={lvl > 0.4 ? C.teal : C.red} />
          </g>
        );
      })}
      <Label x={800} y={170} text="Vorräte" o={rise(f, t0 + 20, 14)} size={54} />
    </>
  );
};

// plants: flowers wilt, a big tree lives on its sugar, a deer finds nothing to eat
export const PlantScene: React.FC<{f: number; t0: number; treeAt: number; deerAt: number; end: number}> = ({f, t0, treeAt, deerAt, end}) => {
  const wilt = clamp01((f - t0 - 20) / (treeAt - t0 - 30));
  const cam = camAt(f, [[t0, {x: 700, y: 760, z: 1.35}], [treeAt, {x: 800, y: 700, z: 1.2}], [treeAt + 30, {x: 1350, y: 560, z: 1.05}], [deerAt, {x: 1300, y: 600, z: 1.05}], [deerAt + 30, {x: 700, y: 720, z: 1.25}], [end, {x: 760, y: 720, z: 1.3}]]);
  const sugar = clamp01(1 - (f - treeAt) / 900);
  const C0 = {x: 960, y: 600};
  const dx = lerp(1400, 600, clamp01((f - deerAt) / (end - deerAt)));
  const sniff = Math.sin(f * 0.15) * 6;
  return (
    <>
      <g transform={layer(cam, 0.1, C0)}><rect x={-1000} y={-800} width={4000} height={2600} fill="url(#coldSky)" /></g>
      <g transform={layer(cam, 0.2, C0)}><Stars f={f} dim={0.9} /></g>
      <g transform={layer(cam, 1, C0)}>
        <rect x={-800} y={860} width={3600} height={700} fill={mix('#3f7a4a', '#6a5a48', wilt)} />
        {/* the big tree with a sugar bar */}
        <g transform="translate(1450 880)">
          <rect x={-40} y={-420} width={80} height={420} rx={20} fill="#5a3a2a" />
          {[[0, -560, 220], [-170, -470, 150], [170, -470, 160], [-60, -650, 130], [90, -620, 120]].map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} fill={mix('#2f7a4a', '#3a5a40', clamp01((f - treeAt) / 600) * 0.5)} />
          ))}
          <Face f={f} x={0} y={-520} w={170} seed={95} skin="#2f7a4a" mood={cycle(['determined', 'happy', 'determined'], 70, 1)} />

          <g opacity={rise(f, treeAt + 10, 14)}>
            <rect x={-26} y={-360} width={52} height={300} rx={14} fill="rgba(0,0,0,0.35)" stroke="#fff" strokeWidth={4} />
            <rect x={-18} y={-352 + 284 * (1 - sugar)} width={36} height={284 * sugar} rx={10} fill={C.orange} />
            <Label x={120} y={-200} text="Zucker" o={1} size={36} color="#ffe39a" anchor="start" />
            <Label x={120} y={-150} text="für Jahrzehnte" o={1} size={30} anchor="start" />
          </g>
        </g>
        {/* flowers wilting */}
        {Array.from({length: 26}, (_, i) => {
          const x = 200 + i * 45 + rnd(i) * 30;
          const y = 900 + rnd(i + 2) * 60;
          const bend = wilt * (40 + rnd(i + 4) * 50);
          const head = {x: x + bend * 0.8, y: y - 120 + bend * 0.9};
          const col = mix(['#ff5d50', '#ffd23f', '#b07aff', '#ff8ad0'][i % 4], '#6a5a48', wilt);
          return (
            <g key={i}>
              <path d={`M ${x} ${y} Q ${x} ${y - 80} ${head.x} ${head.y}`} stroke={mix('#3fa25a', '#7a6a4a', wilt)} strokeWidth={6} fill="none" />
              <path d={`M ${x} ${y - 40} q 20 -16 34 -6 q -18 12 -34 6`} fill={mix('#3fa25a', '#7a6a4a', wilt)} />
              {[0, 72, 144, 216, 288].map((a) => <circle key={a} cx={head.x + Math.cos((a * Math.PI) / 180) * 14} cy={head.y + Math.sin((a * Math.PI) / 180) * 14} r={11 * (1 - wilt * 0.4)} fill={col} />)}
              <circle cx={head.x} cy={head.y} r={8} fill={mix('#ffcf5a', '#5a4a38', wilt)} />
            </g>
          );
        })}
        {/* deer */}
        {f >= deerAt - 10 && (
          <g transform={`translate(${dx} 890) scale(-1.3 1.3)`} opacity={rise(f, deerAt - 10, 14)}>
            {[[-50, 0], [-30, 4], [40, 0], [60, 4]].map(([x, y], i) => <line key={i} x1={x} y1={-60} x2={x + Math.sin(f * 0.15 + i) * 6} y2={y} stroke="#7a4a2a" strokeWidth={10} strokeLinecap="round" />)}
            <ellipse cx={0} cy={-80} rx={90} ry={40} fill="#a8683a" />
            <path d={`M 70 -100 L 110 ${-150 + sniff * 6} L 130 ${-140 + sniff * 6}`} stroke="#a8683a" strokeWidth={30} fill="none" strokeLinecap="round" />
            <ellipse cx={140} cy={-130 + sniff * 6 + 40} rx={30} ry={18} fill="#a8683a" />
            <path d={`M 128 ${-154 + sniff * 6 + 40} l -10 -40 m 10 20 l 14 -16 M 145 ${-158 + sniff * 6 + 40} l 6 -44 m -3 22 l 16 -10`} stroke="#5a3a2a" strokeWidth={5} fill="none" />
            <ellipse cx={-70} cy={-96} rx={14} ry={10} fill="#fff" />
            <g transform={`translate(146 ${-88 + sniff * 6}) scale(-1 1)`}><Face f={f} x={0} y={0} w={44} seed={96} skin="#a8683a" blush={false} mood={cycle(['sad', 'worried'], 60, 2)} /></g>
          </g>
        )}
      </g>
    </>
  );
};

// ocean cross-section: ice grows from the top; deep down the water stays liquid
export const OceanScene: React.FC<{f: number; t0: number; blanketAt: number; hopeAt: number; end: number}> = ({f, t0, blanketAt, hopeAt, end}) => {
  const ice = lerp(10, 140, clamp01((f - t0) / (blanketAt - t0 + 60)));
  const cam = camAt(f, [[t0, {x: 960, y: 300, z: 1.25}], [blanketAt, {x: 960, y: 420, z: 1.0}], [hopeAt, {x: 960, y: 700, z: 0.9}], [end, {x: 960, y: 1700, z: 1.2}]]);
  const C0 = {x: 960, y: 800};
  const SURF = 340;
  return (
    <>
      <g transform={layer(cam, 1, C0)}>
        <rect x={-1000} y={-1200} width={4000} height={SURF + 1200} fill="url(#coldSky)" />
        <g transform="translate(0 -500)"><Stars f={f} dim={0.9} /></g>
        <rect x={-1000} y={SURF} width={4000} height={1700} fill="url(#sea2)" />
        <rect x={-1000} y={SURF + 1700} width={4000} height={800} fill="#020510" />
        {/* the deep floor glows faintly where the vents are */}
        <ellipse cx={1100} cy={SURF + 1800} rx={500} ry={120} fill="url(#fireGlow)" opacity={0.25 + 0.1 * Math.sin(f * 0.1)} />
        <path d={`M -1000 ${SURF + 1800} Q 400 ${SURF + 1700} 1000 ${SURF + 1780} T 3000 ${SURF + 1760} L 3000 ${SURF + 2600} L -1000 ${SURF + 2600} Z`} fill="#0a0f24" />
        {/* fish */}
        {Array.from({length: 18}, (_, i) => {
          const dir = i % 2 ? 1 : -1;
          const x = ((rnd(i) * 3000 + f * (1.2 + rnd(i + 3)) * dir) % 3200 + 3200) % 3200 - 600;
          const y = SURF + 260 + rnd(i + 5) * 1100;
          return (
            <g key={i} transform={`translate(${x} ${y + Math.sin(f * 0.05 + i) * 10}) scale(${dir * (0.8 + rnd(i + 2) * 0.8)} 1)`}>
              <ellipse cx={0} cy={0} rx={34} ry={14} fill={i % 3 ? '#4fa8d8' : '#ffb547'} opacity={0.8} />
              <path d={`M -30 0 L -54 ${-14 + Math.sin(f * 0.4 + i) * 4} L -54 ${14 + Math.sin(f * 0.4 + i) * 4} Z`} fill={i % 3 ? '#4fa8d8' : '#ffb547'} opacity={0.8} />
            </g>
          );
        })}
        {/* light rays fade as ice thickens */}
        {Array.from({length: 6}, (_, i) => (
          <path key={i} d={`M ${200 + i * 300} ${SURF} L ${120 + i * 300} ${SURF + 900} L ${260 + i * 300} ${SURF + 900} Z`} fill="#bfe6ff" opacity={0.06 * (1 - clamp01((ice - 10) / 80))} />
        ))}
        {/* ice sheet */}
        <rect x={-1000} y={SURF - 30} width={4000} height={ice + 30} fill="url(#ice)" />
        {Array.from({length: 30}, (_, i) => (
          <path key={i} d={`M ${-900 + i * 140} ${SURF + ice} l 30 ${12 + rnd(i) * 26} l 30 ${-(12 + rnd(i) * 26)} Z`} fill="#bfe0f8" />
        ))}
        <rect x={-1000} y={SURF - 50} width={4000} height={26} rx={12} fill="#ffffff" />
        <Snow f={f} n={60} w={2400} h={SURF} />
        <Label x={960} y={SURF + ice / 2 + 16} text="Eis-Decke" o={rise(f, blanketAt, 14)} size={46} color="#2a4a70" />
        <Label x={960} y={SURF + ice + 180} text="flüssiges Wasser" o={rise(f, blanketAt + 30, 14)} size={44} color="#bfe6ff" />
      </g>
    </>
  );
};
