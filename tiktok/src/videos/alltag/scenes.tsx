// Scenes for "Alltag" (thoughts everyone has), word-flash style, built from the design kit.
import React from 'react';
import {interpolate} from 'remotion';
import {Character, Face, Glow, P, kitFont, pop, rnd} from '../../design/kit';
import type {SceneProps} from '../../design/wordflash';

export const SAM = {skin: P.skin, hair: '#5a2e1a', hairStyle: 'bun' as const, shirt: P.lilac, pants: P.navy, seed: 61};
const CAVE = {skin: '#c98a60', hair: '#2a1810', hairStyle: 'curly' as const, shirt: '#a0522d', pants: '#6b3a1e', seed: 62};
const FRIEND_A = {skin: P.skinDark, hair: P.ink, hairStyle: 'short' as const, shirt: P.teal, pants: P.indigo, seed: 63};
const FRIEND_B = {skin: P.skin, hair: P.yellow, hairStyle: 'pony' as const, shirt: P.pink, pants: P.navy, seed: 64};

const lin = (f: number, a: number, b: number, v0: number, v1: number) =>
  interpolate(f, [a, Math.max(b, a + 1)], [v0, v1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
const BG = ({c}: {c: string}) => <rect x={-300} y={-300} width={2520} height={1680} fill={c} />;

const Stars: React.FC<{f: number; n?: number; h?: number; seed?: number}> = ({f, n = 90, h = 1080, seed = 0}) => (
  <g>
    {Array.from({length: n}, (_, i) => (
      <circle key={i} cx={rnd(i + seed) * 1920} cy={rnd(i * 3 + 7 + seed) * h} r={1.5 + rnd(i * 5 + seed) * 2.5} fill={P.cream}
        opacity={0.25 + 0.6 * (0.5 + 0.5 * Math.sin(f * 0.12 + i * 1.7)) * rnd(i * 11 + seed)} />
    ))}
  </g>
);

// ---------------------------------------------------------------------------------------
// 1 + 2: bedroom from above, the alarm rings
export const Alarm: React.FC<SceneProps & {close?: boolean}> = ({f, close, at}) => {
  const ringing = !close;
  const shake = ringing ? Math.sin(f * 2.2) * 6 : 0;
  const mood = close
    ? ([[0, 'sad'], [at('work'), 'worried'], [at('again'), 'determined']] as [number, any][])
    : ([[0, 'sleepy'], [at('alarm'), 'shocked'], [at('thought'), 'worried']] as [number, any][]);
  return (
    <g>
      <BG c={P.night} />
      <ellipse cx={960} cy={560} rx={760} ry={440} fill={P.navy} />
      <path d="M 1500 -100 L 1900 -100 L 1300 1200 L 900 1200 Z" fill={P.yellow} opacity={0.06} />
      {Array.from({length: 14}, (_, i) => (
        <g key={i} transform={`translate(${220 + rnd(i * 7) * 1500} ${140 + rnd(i * 13) * 820}) rotate(${rnd(i * 17) * 80 - 40})`}>
          <rect x={-26} y={-34} width={52} height={68} rx={4} fill={P.lilac} opacity={0.45} />
        </g>
      ))}
      <rect x={700} y={120} width={520} height={900} rx={40} fill={P.indigo} />
      <rect x={720} y={140} width={480} height={860} rx={30} fill={P.blue} opacity={0.5} />
      <rect x={790} y={180} width={340} height={190} rx={60} fill={P.cream} opacity={0.75} />
      <Character f={f} x={960} y={640} s={1.5} {...SAM} mood={mood} look={ringing ? {x: -0.8, y: -0.2} : {x: Math.sin(f * 0.05) * 0.5, y: -0.4}} />
      {/* blanket; in the close shot the arms come out and press the pillow on the ears */}
      <path d={`M 720 ${450 + Math.sin(f * 0.08) * 4} Q 960 ${405 + Math.sin(f * 0.08) * 6} 1200 ${450 + Math.sin(f * 0.08) * 4} L 1200 1000 L 720 1000 Z`} fill={P.magenta} />
      <path d="M 760 600 Q 900 640 1160 580 M 780 800 Q 960 760 1170 830" stroke="#b0309f" strokeWidth={10} fill="none" strokeLinecap="round" opacity={0.7} />
      {close && f > at('again') - 4 && (
        <g transform={`translate(960 380) scale(${pop(f, at('again') - 4, 10)})`}>
          <rect x={-200} y={-110} width={400} height={120} rx={55} fill={P.cream} transform={`rotate(${Math.sin(f * 0.5) * 3})`} />
          <rect x={-60} y={-60} width={44} height={110} rx={22} fill={SAM.shirt} transform="rotate(-30 -40 0)" />
          <rect x={16} y={-60} width={44} height={110} rx={22} fill={SAM.shirt} transform="rotate(30 40 0)" />
        </g>
      )}
      {/* nightstand + alarm clock */}
      <rect x={400} y={170} width={210} height={190} rx={22} fill={P.indigo} />
      <g transform={`translate(505 260) rotate(${shake})`}>
        <circle cx={-46} cy={-56} r={18} fill={P.yellow} /><circle cx={46} cy={-56} r={18} fill={P.yellow} />
        <circle r={66} fill={P.red} />
        <circle r={52} fill={P.cream} />
        <text y={-4} textAnchor="middle" fontFamily={kitFont} fontWeight={700} fontSize={30} fill={P.ink}>06:00</text>
        <Face f={f} x={0} y={30} w={36} mood={ringing ? 'shocked' : 'sleepy'} seed={66} skin={P.cream} />
      </g>
      {ringing && [0, 1, 2].map((k) => {
        const t = ((f * 0.06 + k / 3) % 1);
        return <circle key={k} cx={505} cy={260} r={80 + t * 140} fill="none" stroke={P.yellow} strokeWidth={8} opacity={(1 - t) * 0.8} />;
      })}
      {/* phone with notifications */}
      <g transform="translate(1340 300) rotate(12)">
        <rect x={-40} y={-75} width={80} height={150} rx={14} fill={P.ink} />
        <rect x={-33} y={-66} width={66} height={132} rx={9} fill={P.sky} opacity={0.6 + 0.2 * Math.sin(f * 0.3)} />
        {[0, 1, 2].map((k) => <rect key={k} x={-26} y={-56 + k * 30} width={52} height={20} rx={6} fill={P.white} opacity={0.8} />)}
      </g>
      <Glow cx={1340} cy={300} r={120} color={P.sky} o={0.3} />
    </g>
  );
};

// ---------------------------------------------------------------------------------------
// 3: bills, mails and dates pile up, the calendar flips over and over
export const Pile: React.FC<SceneProps> = ({f, dur, at}) => {
  const day = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'MON', 'TUE', 'WED', 'THU', 'FRI'][Math.floor(lin(f, at('Every') - 6, dur, 0, 9.99))];
  const flip = (f * 0.25) % 1;
  return (
    <g>
      <BG c={P.night} />
      <Glow cx={960} cy={560} r={520} color={P.violet} o={0.6} />
      {/* stacks of paper growing */}
      {[[560, 1], [760, 1.5], [1180, 1.3], [1380, 0.9]].map(([x, g], i) => {
        const h = lin(f, i * 4, dur, 120, 380) * g;
        return (
          <g key={i}>
            {Array.from({length: Math.floor(h / 22)}, (_, k) => (
              <rect key={k} x={x - 90 + Math.sin(k * 1.7 + i) * 8} y={940 - k * 22} width={180} height={18} rx={4} fill={k % 2 ? P.cream : '#e9dcb0'} />
            ))}
          </g>
        );
      })}
      {/* falling envelopes and bills */}
      {Array.from({length: 16}, (_, i) => {
        const t0 = rnd(i * 5) * 50;
        const y = -120 + ((f - t0) * (5 + rnd(i) * 4));
        if (f < t0) return null;
        const x = 200 + rnd(i * 9) * 1520;
        const bill = i % 3 === 0;
        return (
          <g key={i} transform={`translate(${x} ${Math.min(y, 900 - rnd(i * 3) * 200)}) rotate(${Math.sin(f * 0.1 + i) * 25})`}>
            <rect x={-60} y={-40} width={120} height={80} rx={8} fill={bill ? P.green : P.white} />
            {bill ? <text y={16} textAnchor="middle" fontFamily={kitFont} fontWeight={700} fontSize={44} fill={P.ink}>$</text>
              : <path d="M -60 -40 L 0 6 L 60 -40" stroke={P.lilac} strokeWidth={6} fill="none" />}
          </g>
        );
      })}
      {/* calendar */}
      <g transform="translate(960 300)">
        <rect x={-130} y={-120} width={260} height={250} rx={24} fill={P.white} />
        <rect x={-130} y={-120} width={260} height={70} rx={24} fill={P.red} />
        <text y={70} textAnchor="middle" fontFamily={kitFont} fontWeight={700} fontSize={96} fill={P.ink}>{day}</text>
        {f > at('Every') - 6 && <rect x={-130} y={-50 + flip * 0} width={260} height={180 * (1 - flip)} fill={P.cream} opacity={0.9} />}
        <Face f={f} x={0} y={-82} w={44} mood={f > at('Every') ? 'sleepy' : 'worried'} seed={67} skin={P.red} />
      </g>
      <Character f={f} x={960} y={1010} s={1.05} {...SAM} mood={[[0, 'worried'], [at('Every'), 'sad']]} arms={f < at('Every') ? 'up' : 'down'} look={{x: Math.sin(f * 0.2) * 0.8, y: -0.6}} />
    </g>
  );
};

// ---------------------------------------------------------------------------------------
// 4: on the sofa under a blanket, rain on the window
export const Sofa: React.FC<SceneProps> = ({f}) => (
  <g>
    <BG c="#3a1a6e" />
    <rect x={1180} y={120} width={520} height={420} rx={20} fill={P.navy} />
    {Array.from({length: 30}, (_, i) => {
      const y = 130 + ((rnd(i) * 400 + f * 9) % 400);
      return <rect key={i} x={1200 + rnd(i * 3) * 480} y={y} width={4} height={26} rx={2} fill={P.sky} opacity={0.55} />;
    })}
    <rect x={1430} y={120} width={20} height={420} fill="#3a1a6e" />
    <rect x={220} y={250} width={12} height={560} fill={P.ink} />
    <path d="M 140 260 L 310 260 L 270 120 L 180 120 Z" fill={P.yellow} />
    <Glow cx={226} cy={260} r={220} color={P.yellow} o={0.55} />
    <rect x={480} y={520} width={980} height={260} rx={80} fill={P.orange} />
    <rect x={440} y={640} width={1060} height={260} rx={60} fill="#e8731a" />
    <rect x={400} y={560} width={140} height={300} rx={60} fill={P.orange} />
    <rect x={1400} y={560} width={140} height={300} rx={60} fill={P.orange} />
    <Character f={f} x={940} y={820} s={1.35} sit {...SAM} mood={[[0, 'sad'], [40, 'worried']]} look={{x: 0.3, y: -0.8}} />
    <path d={`M 760 ${712 + Math.sin(f * 0.08) * 3} Q 940 ${680 + Math.sin(f * 0.08) * 4} 1130 ${712 + Math.sin(f * 0.08) * 3} L 1160 900 L 730 900 Z`} fill={P.sky} />
    <path d="M 800 770 L 1110 770 M 790 840 L 1130 840" stroke={P.blue} strokeWidth={14} opacity={0.5} />
    <rect x={1560} y={760} width={150} height={20} rx={10} fill={P.cream} />
    <rect x={1610} y={780} width={14} height={120} fill={P.cream} />
    <rect x={1600} y={700} width={52} height={60} rx={10} fill={P.white} />
    {[0, 1].map((k) => <path key={k} d={`M ${1614 + k * 22} 690 q 8 -12 0 -24 q -8 -12 0 -24`} stroke={P.white} strokeWidth={4} fill="none" opacity={0.4} transform={`translate(0 ${-((f * 0.6 + k * 8) % 14)})`} />)}
  </g>
);

// ---------------------------------------------------------------------------------------
// 5: ten thousand years ago: snow, a fire, a predator in the dark
export const Stone: React.FC<SceneProps> = ({f, at}) => {
  const cat = pop(f, at('Predators') - 4, 14);
  return (
    <g>
      <BG c={P.night} />
      <path d="M -300 700 L 200 420 L 520 600 L 900 380 L 1300 620 L 1700 400 L 2200 640 L 2200 1400 L -300 1400 Z" fill={P.indigo} />
      <path d="M -300 860 Q 600 780 1300 840 Q 1800 880 2200 820 L 2200 1400 L -300 1400 Z" fill="#dfe8ff" />
      <path d="M -300 860 Q 600 780 1300 840 Q 1800 880 2200 820" stroke={P.white} strokeWidth={10} fill="none" />
      {/* predator in the bushes, right */}
      <g transform={`translate(1460 ${720 + (1 - cat) * 60}) scale(${0.6 + 0.4 * cat})`} opacity={0.3 + 0.7 * cat}>
        <path d="M -200 120 Q -210 -40 -120 -120 Q 0 -190 120 -120 Q 210 -40 200 120 Z" fill={P.orange} />
        <path d="M -150 -110 L -170 -210 L -80 -150 Z M 150 -110 L 170 -210 L 80 -150 Z" fill={P.orange} />
        <path d="M -60 40 Q 0 80 60 40 L 40 130 L 30 60 M -40 130 L -30 60" stroke={P.cream} strokeWidth={14} fill="none" strokeLinecap="round" />
        <path d="M -120 -40 L -40 -10 M 120 -40 L 40 -10" stroke={P.ink} strokeWidth={14} strokeLinecap="round" />
        <circle cx={-70} cy={10} r={18} fill={P.yellow} /><circle cx={70} cy={10} r={18} fill={P.yellow} />
        <circle cx={-70} cy={10} r={7} fill={P.ink} /><circle cx={70} cy={10} r={7} fill={P.ink} />
      </g>
      {[0, 1, 2, 3, 4].map((i) => <ellipse key={i} cx={1260 + i * 120} cy={900 - (i % 2) * 30} rx={120} ry={80} fill={P.teal} opacity={0.85} />)}
      {/* fire */}
      <Glow cx={620} cy={860} r={300} color={P.orange} o={0.75} />
      {[0, 1].map((k) => {
        const fl = (j: number) => Math.sin(f * 0.5 + j + k) * 12;
        return <path key={k} d={`M ${560 + k * 30} 900 Q ${550 + k * 30} ${800 + fl(1)} ${610} ${740 + fl(2) + k * 40} Q ${640} ${820 + fl(3)} ${680 - k * 30} 900 Z`} fill={k ? P.yellow : P.orange} />;
      })}
      <rect x={540} y={892} width={160} height={22} rx={11} fill="#5a2f1a" transform="rotate(10 620 903)" />
      <Character f={f} x={860} y={930} s={1.25} {...CAVE} mood={[[0, 'sad'], [at('Cold'), 'worried'], [at('Predators'), 'shocked']]}
        look={f > at('Predators') ? {x: 1, y: 0} : {x: -0.6, y: 0.2}} armAngles={f > at('Predators') ? [30, -120] : [40, -40]}
        rightHand={<g><rect x={-6} y={-160} width={12} height={240} rx={6} fill="#8a5a2b" /><path d="M -16 -150 L 0 -200 L 16 -150 Z" fill={P.lilac} /></g>} />
      {/* snow */}
      {Array.from({length: 70}, (_, i) => {
        const y = ((rnd(i) * 1100 + f * (2 + rnd(i * 3) * 3)) % 1100) - 20;
        const x = rnd(i * 7) * 1920 + Math.sin(f * 0.05 + i) * 20;
        return <circle key={i} cx={x} cy={y} r={3 + rnd(i * 5) * 5} fill={P.white} opacity={0.8} />;
      })}
    </g>
  );
};

// ---------------------------------------------------------------------------------------
// 6: in the cave, dreaming of a warm bed
export const Dream: React.FC<SceneProps> = ({f, at}) => {
  const b = pop(f, at('anything') - 4, 16);
  return (
    <g>
      <BG c="#2a1408" />
      <path d="M -300 1400 L -300 200 Q 400 -60 960 60 Q 1600 -60 2200 220 L 2200 1400 Z" fill="#5a2f1a" />
      <path d="M -100 1400 Q 200 300 960 220 Q 1700 300 2000 1400 Z" fill="#3a1a0c" />
      <Glow cx={700} cy={900} r={360} color={P.orange} o={0.7} />
      {[0, 1].map((k) => {
        const fl = (j: number) => Math.sin(f * 0.45 + j + k) * 10;
        return <path key={k} d={`M ${650 + k * 26} 940 Q ${640 + k * 26} ${850 + fl(1)} ${700} ${800 + fl(2) + k * 36} Q ${730} ${870 + fl(3)} ${750 - k * 26} 940 Z`} fill={k ? P.yellow : P.orange} />;
      })}
      <Character f={f} x={980} y={960} s={1.2} sit {...CAVE} mood={[[0, 'sad'], [at('warm'), 'happy']]} look={{x: 0.7, y: -0.7}} armAngles={[22, -22]} />
      <g transform={`translate(1220 600) scale(${b})`}>
        <circle cx={-60} cy={20} r={16} fill={P.cream} />
        <circle cx={-20} cy={-30} r={26} fill={P.cream} />
        <ellipse cx={230} cy={-200} rx={290} ry={190} fill={P.cream} />
        <g transform="translate(230 -200)">
          <Glow cx={0} cy={0} r={200} color={P.yellow} o={0.4} />
          <rect x={-180} y={-10} width={360} height={110} rx={30} fill={P.blue} />
          <rect x={-180} y={-90} width={50} height={190} rx={20} fill={P.indigo} />
          <rect x={-120} y={-40} width={110} height={56} rx={22} fill={P.white} />
          <path d="M -20 -20 Q 80 -50 180 -10 L 180 60 L -20 60 Z" fill={P.pink} />
          <Face f={f} x={60} y={30} w={70} mood="happy" seed={68} skin={P.pink} />
          {[0, 1, 2].map((k) => <text key={k} x={100 + k * 40} y={-80 - k * 30 - ((f * 0.8) % 30)} fontFamily={kitFont} fontWeight={700} fontSize={36 - k * 6} fill={P.violet} opacity={0.7}>z</text>)}
        </g>
      </g>
    </g>
  );
};

// ---------------------------------------------------------------------------------------
// 7: empty planets circling a star — no faces, nobody there
export const Planets: React.FC<SceneProps> = ({f}) => (
  <g>
    <BG c={P.night} />
    <Stars f={f} n={140} seed={21} />
    <circle cx={960} cy={540} r={110} fill={P.yellow} />
    <Glow cx={960} cy={540} r={300} color={P.orange} o={0.6} />
    {[[260, 0.006, 26, '#8d8aa8'], [420, 0.004, 44, '#b57a5c'], [600, 0.0026, 64, '#6f88a8'], [800, 0.0018, 36, '#a8a08d']].map(([r, w, size, c], i) => {
      const a = (f as number) * (w as number) * 6 + i * 1.9;
      const x = 960 + Math.cos(a) * (r as number); const y = 540 + Math.sin(a) * (r as number) * 0.42;
      return (
        <g key={i}>
          <ellipse cx={960} cy={540} rx={r as number} ry={(r as number) * 0.42} fill="none" stroke={P.lilac} strokeWidth={2} opacity={0.25} />
          <circle cx={x} cy={y} r={size as number} fill={c as string} />
          <circle cx={x - (size as number) * 0.3} cy={y - (size as number) * 0.2} r={(size as number) * 0.22} fill="#000" opacity={0.15} />
          <circle cx={x + (size as number) * 0.3} cy={y + (size as number) * 0.3} r={(size as number) * 0.14} fill="#000" opacity={0.15} />
        </g>
      );
    })}
  </g>
);

// ---------------------------------------------------------------------------------------
// 8: angry, happy, laughing with friends
export const Friends: React.FC<SceneProps> = ({f, at}) => {
  const laugh = f > at('laugh') - 4;
  const shakeY = (k: number) => (laugh ? Math.abs(Math.sin(f * 0.6 + k)) * -10 : 0);
  const mug = <g><rect x={-22} y={-50} width={44} height={56} rx={8} fill={P.yellow} /><rect x={-22} y={-58} width={44} height={16} rx={8} fill={P.white} /></g>;
  return (
    <g>
      <defs><radialGradient id="frBg" cx="0.5" cy="0.45" r="0.75"><stop offset="0" stopColor="#ffb347" /><stop offset="1" stopColor="#d9480f" /></radialGradient></defs>
      <BG c="url(#frBg)" />
      {Array.from({length: 14}, (_, i) => {
        const tw = 0.5 + 0.5 * Math.sin(f * 0.2 + i * 2);
        const x = rnd(i * 4) * 1920; const y = rnd(i * 6) * 700;
        return <path key={i} d={`M ${x} ${y - 24 * tw} L ${x + 6} ${y - 6} L ${x + 24 * tw} ${y} L ${x + 6} ${y + 6} L ${x} ${y + 24 * tw} L ${x - 6} ${y + 6} L ${x - 24 * tw} ${y} L ${x - 6} ${y - 6} Z`} fill={P.cream} opacity={0.8} />;
      })}
      <g transform={`translate(0 ${shakeY(1)})`}>
        <Character f={f} x={560} y={1000} s={1.5} {...FRIEND_A} mood={laugh ? 'joy' : 'happy'} talk={!laugh} armAngles={laugh ? [12, -140] : [12, -12]} rightHand={laugh ? mug : undefined} />
      </g>
      <g transform={`translate(0 ${shakeY(0)})`}>
        <Character f={f} x={960} y={1010} s={1.7} {...SAM} mood={[[0, 'determined'], [at('happy'), 'joy'], [at('laugh'), 'joy']]}
          armAngles={f < at('happy') ? [40, -40] : f < at('laugh') - 4 ? [130, -130] : [12, -140]} rightHand={laugh ? mug : undefined} />
      </g>
      <g transform={`translate(0 ${shakeY(2)})`}>
        <Character f={f} x={1360} y={1000} s={1.5} {...FRIEND_B} mood={laugh ? 'joy' : 'curious'} armAngles={laugh ? [140, -12] : [12, -12]} leftHand={laugh ? mug : undefined} />
      </g>
      {f < at('happy') && (
        // a small storm cloud over the head while angry
        <g transform={`translate(960 ${430 + Math.sin(f * 0.3) * 6}) scale(${pop(f, 0, 10)})`}>
          <ellipse rx={120} ry={50} fill={P.indigo} /><ellipse cx={-60} cy={-30} rx={70} ry={50} fill={P.indigo} /><ellipse cx={50} cy={-40} rx={80} ry={56} fill={P.indigo} />
          <path d="M -10 40 L -30 100 L 0 90 L -14 150" stroke={P.yellow} strokeWidth={10} fill="none" strokeLinejoin="round" />
        </g>
      )}
    </g>
  );
};

// ---------------------------------------------------------------------------------------
// 9: alone on a cliff at night, calm
export const Cliff: React.FC<SceneProps> = ({f}) => (
  <g>
    <defs><linearGradient id="clSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={P.night} /><stop offset="1" stopColor={P.violet} /></linearGradient></defs>
    <BG c="url(#clSky)" />
    <Stars f={f} n={120} h={720} seed={9} />
    <circle cx={1400} cy={260} r={80} fill={P.cream} />
    <Glow cx={1400} cy={260} r={220} color={P.cream} o={0.35} />
    <Face f={f} x={1400} y={266} w={80} mood="happy" seed={69} skin={P.cream} />
    {[0, 1, 2].map((i) => {
      const t = (f * 0.004 + i * 0.33) % 1;
      return <path key={i} d={`M ${200 + t * 1500} ${180 + i * 90} l 60 -14`} stroke={P.cream} strokeWidth={4} opacity={Math.sin(t * Math.PI) * 0.7} strokeLinecap="round" />;
    })}
    <path d="M -300 820 L 300 600 L 600 700 L 1000 560 L 1400 700 L 1800 580 L 2200 720 L 2200 1400 L -300 1400 Z" fill={P.indigo} />
    <path d="M -300 880 Q 300 800 800 840 Q 1000 850 1100 870 L 1150 1400 L -300 1400 Z" fill="#2a1670" />
    <path d="M -300 880 Q 300 800 800 840 Q 1000 850 1100 870" stroke={P.teal} strokeWidth={14} fill="none" />
    <Character f={f} x={820} y={860} s={1.05} sit {...SAM} mood={[[0, 'neutral'], [50, 'happy']]} look={{x: 0.8, y: -0.6}} />
  </g>
);

// ---------------------------------------------------------------------------------------
// 10: morning, the sun comes up, standing up and stretching
export const Morning: React.FC<SceneProps> = ({f, dur, at}) => {
  const sun = lin(f, 0, dur, 0, 1);
  const up = f > at('get') + 4;
  return (
    <g>
      <defs>
        <linearGradient id="mnSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffd27a" /><stop offset="1" stopColor="#ff7f6e" /></linearGradient>
      </defs>
      <BG c="#ffcf9e" />
      <rect x={1100} y={110} width={640} height={560} rx={26} fill={P.cream} />
      <rect x={1124} y={134} width={592} height={512} rx={16} fill="url(#mnSky)" />
      <circle cx={1420} cy={640 - sun * 260} r={100} fill={P.yellow} />
      <Glow cx={1420} cy={640 - sun * 260} r={230} color={P.yellow} o={0.6} />
      <Face f={f} x={1420} y={646 - sun * 260} w={100} mood={[[0, 'sleepy'], [at('day'), 'happy']]} seed={70} skin={P.yellow} />
      <path d="M 1124 560 Q 1300 500 1460 560 Q 1600 610 1716 540 L 1716 646 L 1124 646 Z" fill="#ff6f6f" />
      <rect x={1412} y={134} width={16} height={512} fill={P.cream} />
      <rect x={-300} y={860} width={2520} height={500} fill="#e8905e" />
      <rect x={120} y={640} width={720} height={260} rx={40} fill={P.indigo} />
      <rect x={140} y={660} width={680} height={120} rx={30} fill={P.blue} />
      <rect x={160} y={560} width={220} height={120} rx={40} fill={P.cream} />
      <path d="M 380 690 Q 600 660 820 700 L 820 790 L 380 790 Z" fill={P.magenta} />
      <Character f={f} x={1000} y={980} s={1.6} {...SAM} mood={[[0, 'sleepy'], [at('get'), 'determined'], [at('day'), 'happy']]}
        arms={up ? 'up' : 'down'} look={{x: 0.6, y: -0.2}} />
    </g>
  );
};
