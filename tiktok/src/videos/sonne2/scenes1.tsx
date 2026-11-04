// Part 1: the sun is gone, nobody notices, light needs time (lines i1 .. l10)
import React from 'react';
import {Character, Face, Glow, MIA, P, PAPA, kitFont, pop, rnd} from '../../design/kit';
import type {SceneProps} from '../../design/wordflash';
import {BG, Blanket, Dog, Earth, LightPulse, Moon, Park, Planet, Stars, Sun, Text, lin} from './common';

const KID_A = {skin: '#c96a5a', hair: P.ink, hairStyle: 'short' as const, shirt: P.yellow, pants: P.indigo, seed: 71};
const KID_B = {skin: P.skin, hair: P.yellow, hairStyle: 'pony' as const, shirt: P.teal, pants: P.navy, seed: 72};

// 1: the sun, close. it vanishes on "verschwunden"
export const SunGone: React.FC<SceneProps> = ({f, at}) => {
  const gone = at('verschwunden') + 4;
  const o = 1 - lin(f, gone, gone + 6, 0, 1);
  const puff = lin(f, gone, gone + 24, 0, 1);
  return (
    <g>
      <BG c={P.night} />
      <Stars f={f} n={160} seed={1} />
      <Sun f={f} x={960} y={540} r={300} mood={[[0, 'happy'], [gone - 14, 'shocked']]} o={o} />
      {puff > 0 && puff < 1 && Array.from({length: 14}, (_, i) => {
        const a = (i / 14) * Math.PI * 2;
        const d = 300 + puff * 260;
        return <circle key={i} cx={960 + Math.cos(a) * d} cy={540 + Math.sin(a) * d} r={30 * (1 - puff)} fill={P.yellow} opacity={1 - puff} />;
      })}
    </g>
  );
};

// 2: where the sun was, nothing. the earth far away has no idea
export const EmptySpot: React.FC<SceneProps> = ({f}) => (
  <g>
    <BG c={P.night} />
    <Stars f={f} n={180} seed={2} />
    <circle cx={700} cy={540} r={260} fill="none" stroke={P.lilac} strokeWidth={6} strokeDasharray="20 24" opacity={0.45} />
    <Text x={700} y={560} size={70} color={P.lilac} o={0.6}>?</Text>
    <Earth f={f} x={1560} y={600} r={70} mood="happy" />
    <path d="M 1500 520 q -10 -30 10 -50" stroke={P.cream} strokeWidth={4} fill="none" opacity={0.4} />
  </g>
);

// 3 + 4 + 7: picnic in the park
export const Picnic: React.FC<SceneProps & {night?: number; sunO?: number; point?: boolean}> = ({f, at, night = 0, sunO = 1, point}) => {
  const moodM = night > 0.5 ? 'shocked' : 'joy';
  const moodP = night > 0.5 ? 'worried' : 'happy';
  return (
    <Park f={f} night={night} sunO={sunO}>
      <Blanket x={900} y={900} />
      <Character f={f} x={760} y={930} s={1.25} sit {...PAPA} mood={moodP} look={point ? {x: 0.8, y: -0.8} : {x: 0.3, y: 0}} talk={!point && night < 0.5} />
      <Character f={f} x={1040} y={940} s={1.0} sit {...MIA} mood={moodM} look={point ? {x: 0.8, y: -0.9} : {x: -0.4, y: 0}}
        armAngles={point ? [12, -150] : [40, -40]} />
      <Dog f={f} x={1300} y={960} s={1.1} flip mood={night > 0.5 ? 'worried' : 'joy'} sit />
      <rect x={880} y={880} width={70} height={34} rx={8} fill="#8a5a36" />
      <circle cx={1150} cy={905} r={18} fill={P.red} />
    </Park>
  );
};

// 5: kites
const Kite: React.FC<{f: number; x: number; y: number; hx: number; hy: number; c: string; seed: number}> = ({f, x, y, hx, hy, c, seed}) => {
  const kx = x + Math.sin(f * 0.05 + seed) * 30; const ky = y + Math.cos(f * 0.06 + seed) * 20;
  return (
    <g>
      <path d={`M ${hx} ${hy} Q ${(hx + kx) / 2 - 60} ${(hy + ky) / 2 + 80} ${kx} ${ky + 70}`} stroke={P.cream} strokeWidth={3} fill="none" opacity={0.8} />
      <path d={`M ${kx} ${ky} L ${kx + 60} ${ky + 70} L ${kx} ${ky + 150} L ${kx - 60} ${ky + 70} Z`} fill={c} />
      <path d={`M ${kx} ${ky} L ${kx} ${ky + 150} M ${kx - 60} ${ky + 70} L ${kx + 60} ${ky + 70}`} stroke={P.white} strokeWidth={4} opacity={0.6} />
      <path d={`M ${kx} ${ky + 150} q 20 30 0 60 q -20 30 0 60`} stroke={c} strokeWidth={6} fill="none" />
      <Face f={f} x={kx} y={ky + 80} w={50} mood="joy" seed={seed} skin={c} />
    </g>
  );
};
export const Kites: React.FC<SceneProps> = ({f}) => (
  <Park f={f} sunX={1300} sunY={190}>
    <Kite f={f} x={520} y={180} hx={640} hy={720} c={P.pink} seed={1} />
    <Kite f={f} x={880} y={140} hx={1060} hy={760} c={P.orange} seed={2} />
    <Kite f={f} x={1500} y={330} hx={1400} hy={780} c={P.violet} seed={3} />
    <Character f={f} x={640} y={900} s={1.0} {...MIA} mood="joy" arms="kite" look={{x: 0, y: -1}} />
    <Character f={f} x={1080} y={930} s={0.95} {...KID_A} mood="happy" arms="kite" look={{x: 0.2, y: -1}} />
    <Character f={f} x={1400} y={920} s={0.9} {...KID_B} mood="joy" arms="kite" look={{x: 0.3, y: -1}} />
    <Dog f={f} x={((f * 3) % 2400) - 200} y={980} s={0.9} walk={1} />
  </Park>
);

// 6: papa's wristwatch, close: the countdown starts
export const Watch: React.FC<SceneProps & {secs: (f: number) => number}> = ({f, secs}) => {
  const r = Math.ceil(secs(f));
  const mm = String(Math.floor(r / 60)).padStart(2, '0'); const ss = String(r % 60).padStart(2, '0');
  return (
    <g>
      <BG c={P.sky} />
      <circle cx={1500} cy={150} r={140} fill={P.yellow} opacity={0.5} />
      <rect x={-200} y={420} width={2400} height={300} rx={150} fill={PAPA.skin} transform="rotate(-8 960 570)" />
      <rect x={-200} y={420} width={700} height={300} fill={PAPA.shirt} transform="rotate(-8 960 570)" />
      <rect x={780} y={300} width={300} height={540} rx={60} fill={P.ink} transform="rotate(-8 930 570)" />
      <circle cx={930} cy={570} r={200} fill={P.ink} />
      <circle cx={930} cy={570} r={170} fill={P.night} />
      <text x={930} y={600} textAnchor="middle" fontFamily={kitFont} fontWeight={700} fontSize={110} fill={r < 10 ? P.red : P.cream}>{mm}:{ss}</text>
      <text x={930} y={660} textAnchor="middle" fontFamily={kitFont} fontWeight={600} fontSize={30} fill={P.lilac}>bis es dunkel wird</text>
      <Glow cx={930} cy={570} r={230} color={P.sky} o={0.25} />
    </g>
  );
};

// 8: what's ahead: a dark earth with a few lights
export const DarkEarth: React.FC<SceneProps & {mood?: any; lights?: number; ice?: number}> = ({f, mood = 'worried', lights = 1, ice = 0.3}) => (
  <g>
    <BG c={P.night} />
    <Stars f={f} n={200} seed={8} />
    <Earth f={f} x={960} y={560} r={300} night={0.85} lights={lights} ice={ice} mood={mood} />
  </g>
);

// 9: Mia wonders
export const MiaWonders: React.FC<SceneProps> = ({f, at}) => (
  <Park f={f}>
    <Character f={f} x={900} y={1400} s={3.0} {...MIA} mood={[[0, 'curious'], [at('Licht'), 'happy']]} look={{x: 0.7, y: -0.6}} tilt={-6} />
    <g transform={`translate(1350 330) scale(${pop(f, 6, 12)})`}>
      <circle cx={-120} cy={160} r={18} fill={P.white} />
      <circle cx={-80} cy={110} r={26} fill={P.white} />
      <ellipse cx={0} cy={0} rx={130} ry={100} fill={P.white} />
      <text x={0} y={36} textAnchor="middle" fontFamily={kitFont} fontWeight={700} fontSize={110} fill={P.violet}>?</text>
    </g>
  </Park>
);

// 10 + 11: light leaves the sun; a stopwatch runs
export const LightRace: React.FC<SceneProps & {fast?: boolean}> = ({f, dur, at, fast}) => {
  const p = fast ? (f / 18) % 1 : lin(f, 4, dur, 0, 1);
  return (
    <g>
      <BG c={P.night} />
      <Stars f={f} n={150} seed={10} />
      <Sun f={f} x={180} y={540} r={230} mood="happy" />
      <LightPulse x0={420} y0={540} x1={1840} y1={540} p={p} w={10} />
      {fast && <Text x={1160} y={420} size={80} color={P.yellow} o={lin(f, at('300') - 4, at('300') + 6, 0, 1)}>300.000 km pro Sekunde</Text>}
      {!fast && (
        <g transform="translate(1500 800)">
          <circle r={110} fill={P.cream} />
          <circle r={90} fill={P.night} />
          <rect x={-18} y={-150} width={36} height={40} rx={8} fill={P.cream} />
          <line x1={0} y1={0} x2={70 * Math.sin(f * 0.12)} y2={-70 * Math.cos(f * 0.12)} stroke={P.red} strokeWidth={8} strokeLinecap="round" />
          <Face f={f} x={0} y={36} w={60} mood="curious" seed={14} skin={P.night} kind="object" />
        </g>
      )}
    </g>
  );
};

// 12: seven times around the earth in a blink
export const AroundEarth: React.FC<SceneProps> = ({f, at}) => {
  const laps = lin(f, at('Siebenmal') - 2, at('Wimpernschlag') + 8, 0, 7);
  const a = laps * Math.PI * 2;
  return (
    <g>
      <BG c={P.night} />
      <Stars f={f} n={150} seed={12} />
      <Earth f={f} x={960} y={540} r={260} mood={laps > 6.5 ? 'shocked' : 'curious'} />
      <ellipse cx={960} cy={540} rx={360} ry={130} fill="none" stroke={P.yellow} strokeWidth={6} opacity={0.3 + 0.1 * Math.min(laps, 7)} />
      <Glow cx={960 + Math.cos(a) * 360} cy={540 + Math.sin(a) * 130} r={50} color={P.yellow} o={0.9} />
      <circle cx={960 + Math.cos(a) * 360} cy={540 + Math.sin(a) * 130} r={14} fill={P.white} />
      <Text x={960} y={980} size={110} color={P.yellow}>{Math.min(7, Math.floor(laps))} ×</Text>
    </g>
  );
};

// 13: far away
export const FarAway: React.FC<SceneProps> = ({f, at}) => {
  const ruler = lin(f, at('150') - 6, at('150') + 14, 0, 1);
  return (
    <g>
      <BG c={P.night} />
      <Stars f={f} n={160} seed={13} />
      <Sun f={f} x={150} y={540} r={180} mood="happy" />
      <Earth f={f} x={1780} y={560} r={24} face={false} />
      <line x1={360} x2={360 + 1390 * ruler} y1={720} y2={720} stroke={P.cream} strokeWidth={6} />
      <line x1={360} x2={360} y1={690} y2={750} stroke={P.cream} strokeWidth={6} />
      <line x1={1750} x2={1750} y1={690} y2={750} stroke={P.cream} strokeWidth={6} opacity={ruler > 0.98 ? 1 : 0} />
      <Text x={1060} y={830} size={76} o={ruler}>150 Millionen km</Text>
    </g>
  );
};

// 14: the football and the peppercorn on a pitch, seen from above
export const Pitch: React.FC<SceneProps> = ({f, at}) => {
  const tape = lin(f, at('24') - 6, at('24') + 12, 0, 1);
  const pepper = pop(f, at('Pfefferkorn') - 4, 10);
  return (
    <g>
      {Array.from({length: 12}, (_, i) => <rect key={i} x={-400 + i * 230} y={-400} width={230} height={1900} fill={i % 2 ? '#2fbf6a' : '#3fe27a'} />)}
      <circle cx={960} cy={540} r={180} fill="none" stroke={P.white} strokeWidth={10} opacity={0.7} />
      <line x1={960} x2={960} y1={-400} y2={1500} stroke={P.white} strokeWidth={10} opacity={0.7} />
      <g transform={`translate(330 540) rotate(${f * 0.5})`}>
        <circle r={110} fill={P.white} />
        {[0, 1, 2, 3, 4].map((i) => {
          const a = (i / 5) * Math.PI * 2;
          return <circle key={i} cx={Math.cos(a) * 66} cy={Math.sin(a) * 66} r={24} fill={P.ink} />;
        })}
        <circle r={26} fill={P.ink} />
      </g>
      <Face f={f} x={330} y={555} w={90} mood="happy" seed={15} skin={P.white} />
      <Text x={330} y={760} size={50}>Sonne</Text>
      <g transform={`translate(1640 540) scale(${pepper})`}>
        <circle r={10} fill="#3a2a1a" />
        <Glow cx={0} cy={0} r={40} color={P.yellow} o={0.6} />
      </g>
      <Text x={1640} y={620} size={50} o={pepper}>Erde</Text>
      <g opacity={tape}>
        <rect x={460} y={430} width={1160 * tape} height={30} fill={P.yellow} />
        {Array.from({length: 24}, (_, i) => <rect key={i} x={460 + i * 48} y={430} width={4} height={i % 5 ? 14 : 30} fill={P.ink} opacity={i * 48 < 1160 * tape ? 1 : 0} />)}
        <Text x={1040} y={400} size={70} color={P.yellow}>24 m</Text>
      </g>
      <Character f={f} x={1640} y={980} s={1.0} {...MIA} mood="curious" armAngles={[12, -120]} look={{x: 0, y: -0.8}} />
    </g>
  );
};

// 15: 499 seconds on the way
export const Travel: React.FC<SceneProps> = ({f, dur, at}) => {
  const p = lin(f, 2, dur, 0, 1);
  return (
    <g>
      <BG c={P.night} />
      <Stars f={f} n={160} seed={15} />
      <Sun f={f} x={160} y={540} r={150} mood="happy" />
      <Earth f={f} x={1760} y={540} r={90} mood="curious" />
      <LightPulse x0={320} y0={540} x1={1660} y1={540} p={p} />
      <Text x={960} y={400} size={110} color={P.yellow} o={lin(f, at('499') - 4, at('499') + 6, 0, 1)}>499 s</Text>
      <Text x={960} y={760} size={56} o={lin(f, at('acht') - 4, at('acht') + 6, 0, 1)}>gut 8 Minuten</Text>
    </g>
  );
};

// 16: the moon, a second ago
export const MoonLook: React.FC<SceneProps> = ({f, at}) => (
  <Park f={f} night={1} sunO={0}>
    <Moon f={f} x={1450} y={260} r={130} mood="happy" />
    <LightPulse x0={1360} y0={340} x1={900} y1={690} p={(f / 40) % 1} color={P.cream} w={6} />
    <Text x={1450} y={480} size={64} color={P.cream} o={lin(f, at('Sekunde') - 6, at('Sekunde') + 4, 0, 1)}>1,3 s alt</Text>
    <g transform="translate(860 860) rotate(-35)">
      <rect x={-20} y={-180} width={40} height={180} rx={14} fill={P.lilac} />
      <rect x={-34} y={-220} width={68} height={60} rx={14} fill={P.violet} />
    </g>
    <line x1={830} x2={760} y1={870} y2={960} stroke={P.cream} strokeWidth={8} />
    <line x1={890} x2={960} y1={870} y2={960} stroke={P.cream} strokeWidth={8} />
    <Character f={f} x={700} y={960} s={1.0} {...MIA} mood="curious" look={{x: 1, y: -0.8}} armAngles={[12, -120]} />
    <Character f={f} x={480} y={960} s={1.3} {...PAPA} mood="happy" look={{x: 1, y: -0.6}} />
  </Park>
);

// 17: stars from the past
export const OldStars: React.FC<SceneProps> = ({f, at}) => {
  const tags = [
    {x: 420, y: 200, t: 'vor 600 Jahren', w: 'Hunderten'},
    {x: 1100, y: 140, t: 'vor 2.000 Jahren', w: 'Tausenden'},
    {x: 1600, y: 320, t: 'vor 40 Jahren', w: 'aussahen'},
  ];
  return (
    <Park f={f} night={1} sunO={0}>
      {tags.map((s, i) => (
        <g key={i} opacity={lin(f, at(s.w) - 4, at(s.w) + 8, 0, 1)}>
          <Glow cx={s.x} cy={s.y} r={50} color={P.cream} o={0.7} />
          <circle cx={s.x} cy={s.y} r={10} fill={P.white} />
          <Text x={s.x} y={s.y + 70} size={42} color={P.cream}>{s.t}</Text>
        </g>
      ))}
      <Character f={f} x={860} y={950} s={1.1} sit {...MIA} mood={[[0, 'curious'], [at('Vergangenheit'), 'joy']]} look={{x: 0.3, y: -1}} />
      <Character f={f} x={1060} y={940} s={1.35} sit {...PAPA} mood="happy" look={{x: -0.2, y: -1}} />
      <Dog f={f} x={1260} y={960} s={0.9} flip sit mood="sleepy" />
    </Park>
  );
};

// 18: the warmth right now
export const Sunbath: React.FC<SceneProps> = ({f}) => (
  <Park f={f} sunX={1250} sunY={220}>
    {Array.from({length: 5}, (_, i) => (
      <path key={i} d={`M ${1180 - i * 40} ${300 + i * 30} L ${860 - i * 60} ${760 + i * 20}`} stroke={P.yellow} strokeWidth={30} opacity={0.15 + 0.05 * Math.sin(f * 0.1 + i)} strokeLinecap="round" />
    ))}
    <path d="M 640 900 L 1020 860 L 1060 900 L 680 940 Z" fill={P.orange} />
    <line x1={680} x2={660} y1={940} y2={990} stroke={P.ink} strokeWidth={8} />
    <line x1={1050} x2={1070} y1={900} y2={960} stroke={P.ink} strokeWidth={8} />
    <Character f={f} x={840} y={930} s={1.1} sit {...MIA} mood="sleepy" glasses look={{x: 0.6, y: -0.4}} />
    <Dog f={f} x={1180} y={980} s={0.9} sit flip mood="sleepy" />
  </Park>
);

// 19: a letter from someone who is gone
export const Letter: React.FC<SceneProps> = ({f}) => {
  const fly = 500 + f * 7;
  return (
    <g>
      <BG c={P.night} />
      <Stars f={f} n={160} seed={19} />
      <g transform={`translate(${fly - 300} ${540 + Math.sin(f * 0.05) * 40}) rotate(${Math.sin(f * 0.04) * 8})`}>
        <Glow cx={0} cy={0} r={200} color={P.yellow} o={0.4} />
        <rect x={-180} y={-120} width={360} height={240} rx={16} fill={P.cream} />
        <path d="M -180 -120 L 0 20 L 180 -120" stroke={P.lilac} strokeWidth={8} fill="none" />
        <rect x={90} y={-100} width={70} height={84} rx={6} fill={P.yellow} />
        <Face f={f} x={125} y={-54} w={40} mood="happy" seed={11} skin={P.yellow} />
        {[0, 1, 2].map((k) => <line key={k} x1={-340 - k * 70} x2={-220 - k * 70} y1={-40 + k * 40} y2={-40 + k * 40} stroke={P.yellow} strokeWidth={8} opacity={0.4} strokeLinecap="round" />)}
      </g>
    </g>
  );
};

// 20: the shell of light racing towards earth, dark behind it
export const Shell: React.FC<SceneProps> = ({f, dur, at}) => {
  const r = lin(f, 0, dur, 300, 1550);
  const nothing = lin(f, at('Dahinter') - 4, at('Dahinter') + 10, 0, 1);
  return (
    <g>
      <BG c={P.night} />
      <Stars f={f} n={200} seed={20} o={1 - 0.7 * nothing} />
      <circle cx={-100} cy={540} r={r} fill="none" stroke={P.yellow} strokeWidth={36} opacity={0.85} />
      <circle cx={-100} cy={540} r={r} fill="none" stroke={P.white} strokeWidth={8} opacity={0.9} />
      <circle cx={-100} cy={540} r={Math.max(0, r - 30)} fill="#000" opacity={0.65} />
      <Earth f={f} x={1700} y={560} r={90} mood="happy" />
      <Planet f={f} x={1020} y={380} r={28} color="#c99a6a" face={false} o={0.8} />
      <Text x={600} y={560} size={90} color={P.lilac} o={nothing}>nichts</Text>
    </g>
  );
};

export {rnd};
