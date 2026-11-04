// Part 2: gravity, the moment it goes dark, the cold (lines g1 .. c9b)
import React from 'react';
import {Character, Face, Glow, MIA, NEIGHBOUR_A, NEIGHBOUR_B, P, PAPA, kitFont, pop, rnd} from '../../design/kit';
import type {SceneProps} from '../../design/wordflash';
import {BG, Cloud, Dog, Earth, House, LightPulse, Moon, Planet, Stars, Sun, Text, ThermoSign, Tree, lin, mixC} from './common';

// ---------------------------------------------------------------------------------------
// gravity
export const Tether: React.FC<SceneProps & {worried?: boolean}> = ({f, worried}) => {
  const a = f * 0.006 + 0.4;
  const ex = 960 + Math.cos(a) * 640; const ey = 560 + Math.sin(a) * 300;
  return (
    <g>
      <BG c={P.night} />
      <Stars f={f} n={160} seed={21} />
      <ellipse cx={960} cy={560} rx={640} ry={300} fill="none" stroke={P.lilac} strokeWidth={4} strokeDasharray="14 18" opacity={0.4} />
      <path d={`M 960 560 Q ${(960 + ex) / 2} ${(560 + ey) / 2 + 40 * Math.sin(f * 0.1)} ${ex} ${ey}`} stroke={P.orange} strokeWidth={8} fill="none" strokeDasharray="2 14" strokeLinecap="round" />
      <Sun f={f} x={960} y={560} r={170} mood="determined" />
      <Earth f={f} x={ex} y={ey} r={80} mood={worried ? 'worried' : 'happy'} />
    </g>
  );
};

export const GravWave: React.FC<SceneProps> = ({f, dur}) => (
  <g>
    <BG c={P.night} />
    <Stars f={f} n={160} seed={23} />
    <circle cx={300} cy={540} r={170} fill="none" stroke={P.lilac} strokeWidth={6} strokeDasharray="16 20" opacity={0.5} />
    {[0, 1, 2].map((k) => {
      const r = ((f * 6 + k * 300) % 1700);
      return <circle key={k} cx={300} cy={540} r={r} fill="none" stroke={P.teal} strokeWidth={14 - k * 2} opacity={Math.max(0, 0.8 - r / 2200)} />;
    })}
    <LightPulse x0={480} y0={540} x1={1620} y1={540} p={lin(f, 0, dur, 0, 0.95)} />
    <Earth f={f} x={1700} y={540} r={90} mood="curious" />
  </g>
);

// the stretched cloth, Mia and Papa hold it, the ball is taken away
export const Cloth: React.FC<SceneProps> = ({f, at}) => {
  const off = at('weg') + 2;
  const ball = 1 - lin(f, off, off + 10, 0, 1);
  const waveR = lin(f, off + 6, off + 90, 0, 900);
  const dip = (x: number, y: number) => {
    const d = Math.hypot(x - 960, (y - 600) * 2.2);
    const well = 150 * ball * Math.exp(-(d * d) / (2 * 220 * 220));
    const ring = f > off ? 40 * Math.exp(-((d - waveR) ** 2) / (2 * 60 * 60)) * Math.max(0, 1 - waveR / 900) : 0;
    return well + ring;
  };
  const rows = Array.from({length: 13}, (_, j) => 420 + j * 30);
  const cols = Array.from({length: 23}, (_, i) => 300 + i * 60);
  return (
    <g>
      <BG c={P.indigo} />
      <path d="M 300 420 L 1620 420 L 1620 780 L 300 780 Z" fill={P.violet} opacity={0.5} />
      {rows.map((y) => <path key={`r${y}`} d={cols.map((x, i) => `${i ? 'L' : 'M'} ${x} ${y + dip(x, y)}`).join(' ')} stroke={P.lilac} strokeWidth={3} fill="none" />)}
      {cols.map((x) => <path key={`c${x}`} d={rows.map((y, j) => `${j ? 'L' : 'M'} ${x} ${y + dip(x, y)}`).join(' ')} stroke={P.lilac} strokeWidth={3} fill="none" />)}
      {ball > 0.02 && <g opacity={ball}><circle cx={960} cy={600 + 150 * ball - 70} r={70} fill={P.yellow} /><Face f={f} x={960} y={600 + 150 * ball - 64} w={66} mood="happy" seed={11} skin={P.yellow} /></g>}
      <Character f={f} x={220} y={900} s={1.25} {...PAPA} mood={f > off ? 'curious' : 'happy'} armAngles={[12, -100]} look={{x: 0.8, y: 0}} />
      <Character f={f} x={1700} y={900} s={1.0} {...MIA} mood={f > off ? 'joy' : 'curious'} armAngles={[100, -12]} look={{x: -0.8, y: 0}} />
      <rect x={-400} y={900} width={2720} height={500} fill={P.navy} />
    </g>
  );
};

export const Neutron: React.FC<SceneProps> = ({f, dur, at}) => {
  const merge = at('verschmolzen');
  const pre = Math.max(0, merge - f);
  const a = f * (0.08 + 0.4 / (1 + pre * 0.05));
  const d = Math.min(160, 30 + pre * 2.2);
  const flash = f > merge ? Math.max(0, 1 - (f - merge) / 20) : 0;
  const p = lin(f, merge + 10, dur - 10, 0, 1);
  return (
    <g>
      <BG c={P.night} />
      <Stars f={f} n={200} seed={25} />
      {f < merge ? [0, 1].map((k) => (
        <g key={k}>
          <Glow cx={360 + Math.cos(a + k * Math.PI) * d} cy={540 + Math.sin(a + k * Math.PI) * d * 0.6} r={70} color={P.sky} o={0.8} />
          <circle cx={360 + Math.cos(a + k * Math.PI) * d} cy={540 + Math.sin(a + k * Math.PI) * d * 0.6} r={34} fill={P.white} />
        </g>
      )) : <><Glow cx={360} cy={540} r={260 * (0.5 + flash)} color={P.sky} o={0.4 + flash * 0.6} /><circle cx={360} cy={540} r={40} fill={P.white} /></>}
      {f > merge && (
        <g>
          <circle cx={360} cy={540} r={60 + p * 1220} fill="none" stroke={P.teal} strokeWidth={12} opacity={0.7} />
          <LightPulse x0={420} y0={540} x1={1600} y1={540} p={p} />
        </g>
      )}
      <Earth f={f} x={1680} y={540} r={80} mood={p > 0.95 ? 'joy' : 'curious'} />
      <Text x={960} y={200} size={90} color={P.teal} o={lin(f, at('2017') - 4, at('2017') + 6, 0, 1)}>2017</Text>
      <Text x={960} y={920} size={50} o={lin(f, at('gleichzeitig') - 4, at('gleichzeitig') + 6, 0, 1)}>Welle und Licht: gleichzeitig</Text>
    </g>
  );
};

export const Unaware: React.FC<SceneProps> = ({f}) => {
  const a = f * 0.008;
  const ex = 960 + Math.cos(a) * 560; const ey = 560 + Math.sin(a) * 260;
  return (
    <g>
      <BG c={P.night} />
      <Stars f={f} n={160} seed={27} />
      <ellipse cx={960} cy={560} rx={560} ry={260} fill="none" stroke={P.lilac} strokeWidth={4} strokeDasharray="14 18" opacity={0.4} />
      <circle cx={960} cy={560} r={150} fill="none" stroke={P.lilac} strokeWidth={6} strokeDasharray="20 24" opacity={0.5} />
      <Earth f={f} x={ex} y={ey} r={90} mood="happy" />
      {[0, 1].map((k) => <text key={k} x={ex + 90 + k * 40} y={ey - 90 - ((f * 1.5 + k * 30) % 60)} fontFamily={kitFont} fontSize={50} fill={P.cream} opacity={0.7}>♪</text>)}
    </g>
  );
};

// ---------------------------------------------------------------------------------------
// the afternoon street; night switches on at `off` (local frame), lamps and stars after
export const Street: React.FC<SceneProps & {off?: number; lampsAt?: number; starsAt?: number; look?: boolean}> = ({f, off = 99999, lampsAt = 99999, starsAt = 99999, look}) => {
  const n = f >= off ? 1 : 0;
  const lamp = (i: number) => (f > lampsAt + i * 6 ? 1 : 0);
  return (
    <g>
      <BG c={n ? P.night : P.sky} />
      <Stars f={f} n={160} h={600} seed={31} o={lin(f, starsAt, starsAt + 30, 0, 1)} />
      {!n && <><Sun f={f} x={1320} y={190} r={90} /><Cloud x={500 + f * 0.4} y={160} s={0.8} /></>}
      <House x={60} y={820} c={n ? '#3a2a6a' : P.pink} roof={n ? P.indigo : P.violet} lit={n} />
      <House x={420} y={820} w={300} h={280} c={n ? '#2a3a6a' : P.orange} roof={n ? P.indigo : P.red} lit={n} />
      <House x={1260} y={820} c={n ? '#2a2a5a' : P.teal} roof={n ? P.indigo : P.blue} lit={n} />
      <House x={1580} y={820} w={300} h={250} c={n ? '#3a2a6a' : P.yellow} roof={n ? P.indigo : P.orange} lit={n} />
      <rect x={-400} y={820} width={2720} height={700} fill={n ? '#1a1640' : '#9aa3c8'} />
      <rect x={-400} y={940} width={2720} height={20} fill={n ? '#2a2660' : P.cream} opacity={0.6} />
      {[300, 900, 1500].map((x, i) => (
        <g key={x}>
          <rect x={x - 8} y={560} width={16} height={260} fill={P.ink} />
          <rect x={x - 30} y={540} width={60} height={30} rx={10} fill={P.ink} />
          {lamp(i) > 0 && <><Glow cx={x} cy={580} r={140} color={P.yellow} o={0.7} /><path d={`M ${x - 26} 570 L ${x - 140} 820 L ${x + 140} 820 L ${x + 26} 570 Z`} fill={P.yellow} opacity={0.15} /></>}
        </g>
      ))}
      <Character f={f} x={860} y={900} s={1.3} {...PAPA} mood={n ? 'shocked' : 'happy'} walk={n ? 0 : 0.6} look={look ? {x: 0.2, y: -1} : {x: 0.6, y: 0}} talk={!n} />
      <Character f={f} x={1040} y={910} s={1.0} {...MIA} mood={n ? 'shocked' : 'joy'} walk={n ? 0 : 0.6} look={look ? {x: 0, y: -1} : {x: -0.6, y: 0}} />
      <Dog f={f} x={1220} y={920} walk={n ? 0 : 1} mood={n ? 'worried' : 'joy'} />
    </g>
  );
};

export const Solar: React.FC<SceneProps> = ({f, at}) => {
  const off = at('fallen') ;
  const dark = f > off ? 1 : 0;
  const spark = f > at('Stromnetze') && (Math.floor(f / 4) % 3 === 0);
  return (
    <g>
      <BG c={dark ? P.night : P.sky} />
      <Stars f={f} n={120} h={500} seed={33} o={dark} />
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${120 + i * 520} 0)`}>
          <rect x={0} y={560} width={380} height={420} fill={dark ? '#2a2a5a' : [P.pink, P.orange, P.teal][i]} />
          <path d="M -30 560 L 190 380 L 410 560 Z" fill={dark ? P.indigo : P.violet} />
          {[0, 1, 2].map((k) => (
            <g key={k} transform={`translate(${30 + k * 110} ${520 - (k === 1 ? 110 : 0) + (k === 2 ? 0 : 0)}) skewY(-40)`}>
              <rect x={0} y={0} width={90} height={60} fill={dark ? P.ink : P.blue} />
              {!dark && <rect x={6} y={6} width={30} height={20} fill={P.white} opacity={0.5} />}
            </g>
          ))}
        </g>
      ))}
      <g transform="translate(1720 980)">
        <path d="M -60 0 L -10 -420 L 10 -420 L 60 0 M -40 -150 L 40 -150 M -30 -280 L 30 -280" stroke={P.ink} strokeWidth={14} fill="none" />
        <line x1={-200} y1={-400} x2={200} y2={-400} stroke={P.ink} strokeWidth={10} />
        {spark && <><Glow cx={150} cy={-400} r={60} color={P.yellow} o={0.9} /><path d="M 150 -440 L 130 -400 L 160 -400 L 140 -360" stroke={P.yellow} strokeWidth={8} fill="none" /></>}
      </g>
      <rect x={-400} y={980} width={2720} height={500} fill={dark ? '#1a1640' : '#9aa3c8'} />
    </g>
  );
};

export const NightFlight: React.FC<SceneProps> = ({f}) => {
  const px = ((f * 5) % 2600) - 400;
  return (
    <g>
      <BG c={P.night} />
      <Stars f={f} n={200} seed={35} />
      <g transform={`translate(${px} ${480 + Math.sin(f * 0.04) * 20}) rotate(-6)`}>
        <path d="M -260 0 Q -260 -50 -180 -50 L 220 -50 Q 300 -40 320 0 Q 300 40 220 50 L -180 50 Q -260 50 -260 0 Z" fill={P.cream} />
        <path d="M -40 0 L -140 -170 L -60 -170 L 80 0 Z" fill={P.lilac} />
        <path d="M -40 10 L -140 160 L -60 160 L 80 10 Z" fill={P.lilac} />
        <path d="M -240 -40 L -300 -140 L -230 -140 L -170 -40 Z" fill={P.lilac} />
        {Array.from({length: 9}, (_, i) => <rect key={i} x={-150 + i * 40} y={-18} width={22} height={22} rx={6} fill={P.yellow} />)}
        <Face f={f} x={270} y={-6} w={50} mood="worried" seed={36} skin={P.cream} />
        <circle cx={-250} cy={-20} r={10} fill={Math.floor(f / 15) % 2 ? P.red : P.night} />
      </g>
      {[[400, 200], [1500, 260], [1100, 880]].map(([x, y], i) => (
        <g key={i} transform={`translate(${x + Math.sin(f * 0.01 + i) * 30} ${y}) rotate(${20 + i * 30})`}>
          <rect x={-70} y={-20} width={50} height={40} fill="#3a4a7a" />
          <rect x={20} y={-20} width={50} height={40} fill="#3a4a7a" />
          <rect x={-20} y={-26} width={40} height={52} rx={8} fill={P.lilac} />
          <Face f={f} x={0} y={2} w={26} mood="sleepy" seed={37 + i} skin={P.lilac} />
        </g>
      ))}
    </g>
  );
};

export const Station: React.FC<SceneProps> = ({f, dur}) => {
  const bat = lin(f, 0, dur, 1, 0.15);
  return (
    <g>
      <BG c={P.night} />
      <Stars f={f} n={180} seed={38} />
      <Earth f={f} x={960} y={1500} r={700} face={false} night={0.9} lights={1} />
      <g transform={`translate(960 420) rotate(${Math.sin(f * 0.02) * 3})`}>
        <rect x={-420} y={-12} width={840} height={24} fill={P.cream} />
        {[-360, -240, 240, 360].map((x) => <rect key={x} x={x - 50} y={-170} width={100} height={340} fill="#2a3a6a" stroke={P.lilac} strokeWidth={3} />)}
        <rect x={-150} y={-50} width={300} height={100} rx={40} fill={P.cream} />
        <rect x={-50} y={-90} width={100} height={180} rx={30} fill={P.lilac} />
        <Face f={f} x={0} y={0} w={70} mood={bat < 0.4 ? 'worried' : 'neutral'} seed={39} skin={P.lilac} />
      </g>
      <g transform="translate(1520 260)">
        <rect x={0} y={0} width={220} height={100} rx={20} fill="none" stroke={P.cream} strokeWidth={8} />
        <rect x={220} y={30} width={20} height={40} rx={6} fill={P.cream} />
        <rect x={12} y={12} width={196 * bat} height={76} rx={12} fill={bat < 0.4 ? P.red : P.green} />
      </g>
    </g>
  );
};

export const MoonOut: React.FC<SceneProps> = ({f, at}) => {
  const out = lin(f, at('erlischt') - 2, at('erlischt') + 20, 0, 1);
  return (
    <g>
      <BG c={P.night} />
      <Stars f={f} n={220} seed={40} />
      <Moon f={f} x={960} y={540} r={260} mood={out > 0.3 ? 'sleepy' : 'happy'} o={1 - 0.88 * out} />
      <circle cx={960} cy={540} r={262} fill="none" stroke={P.lilac} strokeWidth={4} opacity={0.4 * out} />
      {out < 0.2 && <LightPulse x0={0} y0={200} x1={760} y1={420} p={(f / 30) % 1} />}
    </g>
  );
};

export const LastLight: React.FC<SceneProps & {who: 'jupiter' | 'saturn'}> = ({f, dur, at, who}) => {
  const p = lin(f, 0, dur, 0.3, 0.9);
  const sat = who === 'saturn';
  return (
    <g>
      <BG c={P.night} />
      <Stars f={f} n={200} seed={sat ? 42 : 41} />
      <circle cx={150} cy={540} r={120} fill="none" stroke={P.lilac} strokeWidth={6} strokeDasharray="16 20" opacity={0.4} />
      <LightPulse x0={250} y0={540} x1={1300} y1={540} p={p} />
      {sat ? (
        <Planet f={f} x={1500} y={540} r={180} color="#e8c37a" band="#c99a5a" ring="#f2dfa8" mood="happy" seed={43} />
      ) : (
        <Planet f={f} x={1500} y={540} r={220} color="#e8a36a" band="#c97a4a" mood="happy" seed={44} />
      )}
      <Glow cx={1500} cy={540} r={330} color={P.yellow} o={0.25} />
      <Text x={1500} y={sat ? 840 : 880} size={70} color={P.yellow} o={lin(f, at(sat ? 'zweieinhalb' : 'Stunde') - 4, at(sat ? 'zweieinhalb' : 'Stunde') + 6, 0, 1)}>
        {sat ? '+ 2,5 Stunden' : '+ 1 Stunde'}
      </Text>
    </g>
  );
};

export const Eyepiece: React.FC<SceneProps> = ({f, dur}) => {
  const planets = [
    {x: 700, y: 480, r: 50, c: '#e86a4a', n: 'Mars'},
    {x: 980, y: 640, r: 110, c: '#e8a36a', n: 'Jupiter'},
    {x: 1260, y: 450, r: 80, c: '#e8c37a', n: 'Saturn', ring: '#f2dfa8'},
  ];
  return (
    <g>
      <BG c="#000" />
      <defs><clipPath id="eye"><circle cx={960} cy={540} r={440} /></clipPath></defs>
      <g clipPath="url(#eye)">
        <rect x={500} y={80} width={920} height={920} fill={P.night} />
        <Stars f={f} n={120} seed={45} />
        {planets.map((p, i) => {
          const o = 1 - lin(f, dur * (0.2 + i * 0.28), dur * (0.2 + i * 0.28) + 16, 0, 1);
          return <Planet key={i} f={f} x={p.x} y={p.y} r={p.r} color={p.c} ring={p.ring} face={o > 0.3} mood="sleepy" o={0.15 + 0.85 * o} seed={46 + i} />;
        })}
      </g>
      <circle cx={960} cy={540} r={440} fill="none" stroke="#222" strokeWidth={40} />
      <Character f={f} x={1680} y={1060} s={1.0} {...MIA} mood="curious" look={{x: -0.8, y: -0.5}} />
    </g>
  );
};

// the earth leaves its orbit and flies straight on
export const Straight: React.FC<SceneProps> = ({f, at}) => {
  const free = at('verliert');
  const a0 = -1.2;
  const w = 0.008;
  const ang = Math.min(f, free) * w + a0;
  const ex0 = 960 + Math.cos(ang) * 560; const ey0 = 560 + Math.sin(ang) * 300;
  const t = Math.max(0, f - free);
  const vx = -Math.sin(ang) * 560 * w; const vy = Math.cos(ang) * 300 * w;
  const ex = ex0 + vx * t; const ey = ey0 + vy * t;
  const wave = lin(f, free - 30, free + 20, 0, 900);
  return (
    <g>
      <BG c={P.night} />
      <Stars f={f} n={180} seed={48} />
      <ellipse cx={960} cy={560} rx={560} ry={300} fill="none" stroke={P.lilac} strokeWidth={4} strokeDasharray="14 18" opacity={0.4} />
      <circle cx={960} cy={560} r={wave} fill="none" stroke={P.teal} strokeWidth={10} opacity={Math.max(0, 0.8 - wave / 1200)} />
      {f > free && <line x1={ex0} y1={ey0} x2={ex0 + vx * 600} y2={ey0 + vy * 600} stroke={P.cream} strokeWidth={4} strokeDasharray="12 16" opacity={0.5} />}
      <Earth f={f} x={ex} y={ey} r={80} mood={f > free ? 'shocked' : 'happy'} />
    </g>
  );
};

export const Cruise: React.FC<SceneProps> = ({f, at}) => (
  <g>
    <BG c={P.night} />
    {[0.5, 1.2, 2.5].map((sp, L) => (
      <g key={L}>
        {Array.from({length: 50}, (_, i) => {
          const x = ((rnd(i + L * 60) * 2400 - f * sp * 8) % 2400 + 2400) % 2400 - 240;
          return <rect key={i} x={x} y={rnd(i * 7 + L * 30) * 1080} width={6 + sp * 16} height={3 + L} rx={2} fill={P.cream} opacity={0.25 + L * 0.2} />;
        })}
      </g>
    ))}
    <Earth f={f} x={960} y={540} r={220} night={0.9} lights={1} ice={0.2} mood="worried" />
    <Text x={960} y={920} size={90} color={P.cream} o={lin(f, at('107') - 4, at('107') + 6, 0, 1)}>107.000 km/h</Text>
  </g>
);

export const Scatter: React.FC<SceneProps> = ({f, dur}) => {
  const p = lin(f, 0, dur, 0, 1);
  const pl = [
    {a: 0.3, d: 200, r: 26, c: '#a8a08d'}, {a: 2.2, d: 280, r: 44, c: '#e8b37a'}, {a: 4.0, d: 380, r: 50, c: P.blue},
    {a: 5.3, d: 460, r: 36, c: '#e86a4a'}, {a: 1.2, d: 600, r: 110, c: '#e8a36a'}, {a: 3.1, d: 720, r: 90, c: '#e8c37a'},
  ];
  return (
    <g>
      <BG c={P.night} />
      <Stars f={f} n={200} seed={50} />
      <circle cx={960} cy={540} r={60} fill="none" stroke={P.lilac} strokeWidth={4} strokeDasharray="10 14" opacity={0.5} />
      {pl.map((q, i) => {
        const d = q.d * (1 + p * 0.9);
        const x = 960 + Math.cos(q.a) * d; const y = 540 + Math.sin(q.a) * d * 0.55;
        return (
          <g key={i}>
            <ellipse cx={960} cy={540} rx={q.d} ry={q.d * 0.55} fill="none" stroke={P.lilac} strokeWidth={3} strokeDasharray="10 16" opacity={0.3 * (1 - p)} />
            <Planet f={f} x={x} y={y} r={q.r * 0.8} color={q.c} face={q.r > 40} mood="worried" seed={51 + i} />
          </g>
        );
      })}
    </g>
  );
};

// ---------------------------------------------------------------------------------------
// the cold
export const Candles: React.FC<SceneProps> = ({f}) => (
  <g>
    <BG c={P.night} />
    <Stars f={f} n={160} seed={52} />
    <rect x={260} y={180} width={1400} height={760} rx={30} fill="#1a1640" />
    <rect x={320} y={240} width={600} height={460} rx={20} fill={P.navy} />
    <Stars f={f} n={30} seed={53} h={400} />
    <rect x={612} y={240} width={16} height={460} fill="#1a1640" />
    <rect x={320} y={462} width={600} height={16} fill="#1a1640" />
    <Character f={f} x={1240} y={1000} s={1.3} {...PAPA} mood="worried" armAngles={[12, -70]}
      rightHand={<g><rect x={-12} y={-50} width={24} height={60} rx={6} fill={P.cream} /><path d={`M 0 -50 q 10 -20 0 -40 q -10 20 0 40`} fill={P.yellow} /></g>} />
    <Character f={f} x={1460} y={1000} s={1.0} {...MIA} mood="sad" look={{x: -0.8, y: -0.4}} />
    <Glow cx={1300} cy={720} r={300} color={P.orange} o={0.45} />
    <ThermoSign x={1760} y={700} t={12} s={0.7} />
  </g>
);

export const Radiate: React.FC<SceneProps> = ({f}) => (
  <g>
    <BG c={P.night} />
    <Stars f={f} n={200} seed={54} />
    {Array.from({length: 10}, (_, i) => {
      const a = (i / 10) * Math.PI * 2;
      const t = ((f * 1.2 + i * 13) % 80) / 80;
      const r0 = 320 + t * 300;
      return <path key={i} d={`M ${960 + Math.cos(a) * r0} ${540 + Math.sin(a) * r0} l ${Math.cos(a) * 60} ${Math.sin(a) * 60}`} stroke={P.red} strokeWidth={16} strokeLinecap="round" opacity={(1 - t) * 0.9} />;
    })}
    <Earth f={f} x={960} y={540} r={290} night={0.8} lights={0.8} ice={0.15} mood="worried" />
  </g>
);

export const Weather: React.FC<SceneProps> = ({f, dur}) => {
  const fade = lin(f, dur * 0.4, dur, 0, 1);
  return (
    <g>
      <BG c={mixC('#4a5a9a', P.night, fade)} />
      <Stars f={f} n={160} seed={55} o={fade} />
      {[[400, 300, 1.3], [1000, 220, 1.6], [1550, 330, 1.2]].map(([x, y, s], i) => (
        <g key={i} opacity={1 - fade * 0.9} transform={`translate(${Math.sin(f * 0.02 + i) * 20} 0)`}>
          <Cloud x={x} y={y} s={s} c="#c9d0ea" />
          <Face f={f} x={x + 10} y={y - 10} w={70 * s} mood="sad" seed={56 + i} skin="#c9d0ea" />
        </g>
      ))}
      <rect x={-400} y={880} width={2720} height={600} fill="#2a2a5a" />
      <rect x={300} y={480} width={12} height={400} fill={P.ink} />
      <path d={`M 312 490 L ${312 + 160 * (1 - fade)} ${500 + 150 * fade} L 312 ${600}`} fill={P.red} />
    </g>
  );
};

export const LastSnow: React.FC<SceneProps> = ({f, dur}) => {
  const clear = lin(f, dur * 0.55, dur, 0, 1);
  return (
    <g>
      <BG c={mixC('#3a4a8a', P.night, clear)} />
      <Stars f={f} n={180} seed={57} o={clear} />
      <House x={240} y={880} c="#3a2a6a" roof={P.indigo} lit={1} snow={lin(f, 0, dur * 0.5, 0, 1)} />
      <House x={1340} y={880} w={320} c="#2a3a6a" roof={P.indigo} lit={1} snow={lin(f, 0, dur * 0.5, 0, 1)} />
      <rect x={-400} y={880} width={2720} height={600} fill="#e6ecff" />
      {Array.from({length: 90}, (_, i) => {
        const y = ((rnd(i) * 1100 + f * (2 + rnd(i * 3) * 2)) % 1100) - 20;
        return <circle key={i} cx={rnd(i * 7) * 1920 + Math.sin(f * 0.05 + i) * 20} cy={y} r={3 + rnd(i * 5) * 5} fill={P.white} opacity={0.9 * (1 - clear)} />;
      })}
      <Character f={f} x={960} y={960} s={1.0} {...MIA} mood="curious" look={{x: 0, y: -1}} armAngles={[60, -60]} />
    </g>
  );
};

const Breath: React.FC<{f: number; x: number; y: number}> = ({f, x, y}) => {
  const t = (f % 50) / 50;
  return <ellipse cx={x + t * 60} cy={y - t * 30} rx={20 + t * 30} ry={12 + t * 16} fill={P.white} opacity={0.5 * (1 - t)} />;
};
export const Freezing: React.FC<SceneProps & {t: number; deep?: boolean}> = ({f, t, deep}) => (
  <g>
    <BG c={deep ? '#0a1236' : P.night} />
    <Stars f={f} n={200} seed={deep ? 59 : 58} />
    <path d="M -400 760 Q 300 640 900 720 Q 1500 800 2300 700 L 2300 1500 L -400 1500 Z" fill={deep ? '#cfe0ff' : '#b8c8f0'} />
    {deep ? (
      <g>
        {[0, 1, 2].map((i) => <path key={i} d={`M ${200 + i * 500} 760 l 120 -260 l 120 260 Z`} fill="#e6f0ff" />)}
        <g transform="translate(1200 900)">
          <ellipse cx={0} cy={-80} rx={60} ry={90} fill={P.ink} />
          <ellipse cx={0} cy={-70} rx={42} ry={70} fill={P.white} />
          <circle cx={0} cy={-170} r={44} fill={P.ink} />
          <Face f={f} x={0} y={-168} w={52} mood="shocked" seed={60} skin={P.ink} kind="object" />
          <path d="M -18 -150 L 18 -150 L 0 -132 Z" fill={P.orange} />
          <ellipse cx={-26} cy={0} rx={22} ry={8} fill={P.orange} /><ellipse cx={26} cy={0} rx={22} ry={8} fill={P.orange} />
        </g>
      </g>
    ) : (
      <g>
        <Character f={f} x={760} y={900} s={1.35} {...PAPA} shirt={P.red} mood="worried" armAngles={[30, -30]} />
        <Character f={f} x={980} y={910} s={1.05} {...MIA} shirt={P.yellow} mood="sad" armAngles={[30, -30]} />
        <Breath f={f} x={800} y={600} />
        <Breath f={f + 20} x={1000} y={680} />
        <Dog f={f} x={1180} y={920} sit mood="worried" />
      </g>
    )}
    <ThermoSign x={deep ? 600 : 1560} y={820} t={t} />
  </g>
);

export const HouseCut: React.FC<SceneProps> = ({f, at}) => {
  const burst = at('platzen');
  const b = f > burst;
  return (
    <g>
      <BG c={P.night} />
      <Stars f={f} n={120} seed={61} />
      <path d="M 360 300 L 960 60 L 1560 300 Z" fill={P.indigo} />
      <rect x={400} y={300} width={1120} height={700} fill="#2a2660" />
      <rect x={440} y={340} width={1040} height={620} fill="#4a3a8a" />
      <path d={`M 1400 340 L 1400 760 L 1100 760`} stroke="#9fb3c8" strokeWidth={22} fill="none" />
      {b && <><circle cx={1400} cy={560} r={30} fill="#cfe8ff" /><path d="M 1385 540 l -40 -30 M 1415 540 l 40 -30 M 1400 590 l 0 40" stroke="#cfe8ff" strokeWidth={10} strokeLinecap="round" /></>}
      <rect x={520} y={780} width={260} height={140} rx={10} fill="#e86a4a" />
      {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={536 + i * 48} y={790} width={28} height={120} rx={6} fill="#ff9a7a" />)}
      <Glow cx={650} cy={850} r={200} color={P.orange} o={0.5 + 0.1 * Math.sin(f * 0.2)} />
      <path d="M 860 960 Q 1000 760 1160 960 Z" fill={P.sky} />
      <Character f={f} x={940} y={960} s={0.9} sit {...PAPA} mood="worried" />
      <Character f={f} x={1080} y={960} s={0.75} sit {...MIA} mood="sad" />
      <path d={`M 840 ${880 + Math.sin(f * 0.08) * 3} Q 1010 ${820} 1180 ${880 + Math.sin(f * 0.08) * 3} L 1190 960 L 830 960 Z`} fill={P.sky} />
    </g>
  );
};

export const Fuel: React.FC<SceneProps> = ({f}) => (
  <g>
    <BG c={P.night} />
    <Stars f={f} n={140} seed={62} />
    <rect x={-400} y={900} width={2720} height={600} fill="#cfd8f0" />
    {Array.from({length: 12}, (_, i) => {
      const row = Math.floor(i / 4);
      return <g key={i}><circle cx={560 + (i % 4) * 110 + row * 55} cy={860 - row * 95} r={48} fill="#8a5a36" /><circle cx={560 + (i % 4) * 110 + row * 55} cy={860 - row * 95} r={28} fill="#c98a52" /></g>;
    })}
    {[0, 1].map((i) => <g key={i}><rect x={1100 + i * 170} y={660} width={140} height={240} rx={20} fill={P.blue} /><rect x={1100 + i * 170} y={710} width={140} height={16} fill={P.navy} /><rect x={1100 + i * 170} y={830} width={140} height={16} fill={P.navy} /></g>)}
    {Array.from({length: 8}, (_, i) => {
      const t = ((f * 0.03 + i * 0.37) % 1);
      return <path key={i} d={`M ${560 + rnd(i) * 860} ${640 - t * 200} l 10 20 l 20 6 l -20 6 l -10 20 l -10 -20 l -20 -6 l 20 -6 Z`} fill={P.yellow} opacity={Math.sin(t * Math.PI)} />;
    })}
    <Character f={f} x={1600} y={960} s={1.35} {...PAPA} shirt={P.red} mood="determined" armAngles={[12, -40]} look={{x: -0.8, y: 0}} />
  </g>
);

export const Meadow: React.FC<SceneProps> = ({f, dur}) => {
  const w = lin(f, 0, dur, 0, 1);
  return (
    <g>
      <BG c={P.night} />
      <Stars f={f} n={160} seed={63} />
      <rect x={-400} y={700} width={2720} height={800} fill={mixC(P.green, '#6a5a3a', w)} />
      {Array.from({length: 9}, (_, i) => {
        const x = 180 + i * 200; const droop = w * 70;
        const c = [P.pink, P.yellow, P.orange, P.lilac][i % 4];
        return (
          <g key={i}>
            <path d={`M ${x} 900 Q ${x + droop * 0.3} ${800} ${x + droop} ${720 + droop * 0.6}`} stroke={mixC(P.teal, '#5a4a2a', w)} strokeWidth={10} fill="none" />
            <circle cx={x + droop} cy={700 + droop * 0.6} r={44} fill={mixC(c, '#7a6a5a', w)} />
            <circle cx={x + droop} cy={700 + droop * 0.6} r={22} fill={mixC(P.yellow, '#8a7a5a', w)} />
            <Face f={f} x={x + droop} y={704 + droop * 0.6} w={34} mood={w > 0.4 ? 'sad' : 'happy'} seed={64 + i} skin={mixC(P.yellow, '#8a7a5a', w)} />
          </g>
        );
      })}
      {Array.from({length: 40}, (_, i) => <circle key={i} cx={rnd(i) * 1920} cy={940 + rnd(i * 3) * 120} r={4} fill={P.white} opacity={w * 0.8} />)}
    </g>
  );
};

export const BigTree: React.FC<SceneProps> = ({f}) => (
  <g>
    <BG c={P.night} />
    <Stars f={f} n={160} seed={65} />
    <rect x={-400} y={760} width={2720} height={800} fill="#3a2a2a" />
    {[0, 1, 2, 3, 4].map((i) => <path key={i} d={`M 960 800 Q ${760 + i * 100} 900 ${600 + i * 180} 1040`} stroke="#5a3a2a" strokeWidth={26 - i * 2} fill="none" strokeLinecap="round" />)}
    {[[760, 960], [1020, 1000], [1240, 950]].map(([x, y], i) => <g key={i}><Glow cx={x} cy={y} r={60} color={P.yellow} o={0.7 + 0.2 * Math.sin(f * 0.1 + i)} /><circle cx={x} cy={y} r={20} fill={P.yellow} /></g>)}
    <rect x={900} y={360} width={120} height={440} rx={30} fill="#7a4a2a" />
    {[[960, 280, 220], [780, 360, 150], [1140, 360, 150], [960, 160, 140]].map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill="#2a5a4a" />)}
    <Face f={f} x={960} y={560} w={90} mood="determined" seed={66} skin="#7a4a2a" />
  </g>
);

export const Rabbit: React.FC<SceneProps> = ({f}) => {
  const sniff = Math.sin(f * 0.5) * 3;
  return (
    <g>
      <BG c={P.night} />
      <Stars f={f} n={160} seed={67} />
      <rect x={-400} y={760} width={2720} height={800} fill="#e6ecff" />
      {Array.from({length: 60}, (_, i) => {
        const y = ((rnd(i) * 1100 + f * 2) % 1100) - 20;
        return <circle key={i} cx={rnd(i * 7) * 1920} cy={y} r={3 + rnd(i * 5) * 4} fill={P.white} opacity={0.8} />;
      })}
      <g transform="translate(960 860)">
        <ellipse cx={0} cy={0} rx={130} ry={90} fill="#b89a8a" />
        <circle cx={-120} cy={-10} r={30} fill="#f2e8e0" />
        <ellipse cx={60} cy={70} rx={60} ry={22} fill="#a88a7a" />
        <circle cx={130} cy={-70} r={70} fill="#b89a8a" />
        <ellipse cx={110} cy={-190} rx={22} ry={70} fill="#b89a8a" transform="rotate(-12 110 -190)" />
        <ellipse cx={150} cy={-190} rx={22} ry={70} fill="#b89a8a" transform="rotate(10 150 -190)" />
        <ellipse cx={110} cy={-190} rx={10} ry={50} fill="#e8b8b8" transform="rotate(-12 110 -190)" />
        <circle cx={196} cy={-60 + sniff} r={10} fill="#e86a8a" />
        <Face f={f} x={148} y={-70} w={60} mood="sad" seed={68} skin="#b89a8a" blush={false} />
      </g>
      <path d="M 1300 820 l 30 -60 l 30 60" stroke="#8a7a6a" strokeWidth={6} fill="none" />
    </g>
  );
};

export const OceanIce: React.FC<SceneProps & {deep?: boolean}> = ({f, dur, deep}) => {
  const ice = deep ? 1 : lin(f, 0, dur * 0.5, 0, 1);
  return (
    <g>
      <defs><linearGradient id="sea2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={P.blue} /><stop offset="1" stopColor={deep ? '#000' : P.night} /></linearGradient></defs>
      <BG c={P.night} />
      <Stars f={f} n={120} h={300} seed={69} />
      <rect x={-400} y={320} width={2720} height={1200} fill="url(#sea2)" />
      <rect x={-400} y={300} width={2720} height={20 + 70 * ice} fill="#e6f0ff" />
      {!deep && [[500, 640], [1200, 760], [900, 900]].map(([x, y], i) => (
        <g key={i} transform={`translate(${x + Math.sin(f * 0.03 + i) * 60} ${y})`}>
          <ellipse cx={0} cy={0} rx={60} ry={30} fill={[P.orange, P.yellow, P.pink][i]} />
          <path d="M -56 0 L -100 -30 L -100 30 Z" fill={[P.orange, P.yellow, P.pink][i]} />
          <Face f={f} x={28} y={-2} w={24} mood="happy" seed={70 + i} skin={[P.orange, P.yellow, P.pink][i]} />
        </g>
      ))}
      {deep && <><Glow cx={960} cy={1060} r={260} color={P.orange} o={0.5 + 0.15 * Math.sin(f * 0.1)} /><circle cx={960} cy={1060} r={30} fill={P.orange} opacity={0.6} /></>}
    </g>
  );
};

export {pop, NEIGHBOUR_A, NEIGHBOUR_B};
