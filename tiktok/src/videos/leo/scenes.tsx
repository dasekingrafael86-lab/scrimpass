// Scenes for "Leo" (ScrimPass spot), all built from the design kit.
// Every scene is a pure function of its local frame `f` and draws into a 1920x1080 svg,
// because the word-flash layer renders each scene a second time inside the letters.
import React from 'react';
import {interpolate} from 'remotion';
import {Character, Face, Glow, Label, P, Tag, kitFont, pop, rnd} from '../../design/kit';

export const LEO = {skin: P.skin, hair: '#3a2210', hairStyle: 'short' as const, shirt: P.violet, pants: P.navy, seed: 51};
export const MATE_A = {skin: P.skinDark, hair: P.ink, hairStyle: 'curly' as const, shirt: P.orange, pants: P.indigo, seed: 52};
export const MATE_B = {skin: P.skin, hair: P.yellow, hairStyle: 'pony' as const, shirt: P.pink, pants: P.navy, seed: 53};
export const MATE_C = {skin: P.skinPink, hair: P.ink, hairStyle: 'cap' as const, shirt: P.teal, pants: P.indigo, seed: 54};

const lin = (f: number, a: number, b: number, v0: number, v1: number) =>
  interpolate(f, [a, Math.max(b, a + 1)], [v0, v1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

export type {SceneProps} from '../../design/wordflash';
import type {SceneProps} from '../../design/wordflash';

// headset that sits on a kit Character's head (same breathing as the character)
const Headset: React.FC<{f: number; x: number; y: number; s?: number; seed: number; sit?: boolean; color?: string}> = ({f, x, y, s = 1, seed, sit, color = P.teal}) => {
  const hy = -196 + Math.sin(f * 0.08 + seed) * 2 + (sit ? 22 : 0);
  return (
    <g transform={`translate(${x} ${y}) scale(${s}) translate(0 ${hy})`}>
      <path d="M -56 2 Q -62 -76 0 -76 Q 62 -76 56 2" stroke={P.ink} strokeWidth={12} fill="none" strokeLinecap="round" />
      <rect x={-70} y={-14} width={24} height={42} rx={11} fill={P.ink} />
      <rect x={46} y={-14} width={24} height={42} rx={11} fill={P.ink} />
      <rect x={-66} y={-5} width={8} height={24} rx={4} fill={color} />
      <rect x={58} y={-5} width={8} height={24} rx={4} fill={color} />
      <path d="M -58 24 Q -54 50 -18 48" stroke={P.ink} strokeWidth={6} fill="none" strokeLinecap="round" />
      <circle cx={-16} cy={48} r={7} fill={P.ink} />
    </g>
  );
};

const Stars: React.FC<{f: number; n?: number; h?: number; seed?: number}> = ({f, n = 90, h = 1080, seed = 0}) => (
  <g>
    {Array.from({length: n}, (_, i) => {
      const tw = 0.5 + 0.5 * Math.sin(f * 0.12 + i * 1.7);
      return <circle key={i} cx={rnd(i + seed) * 1920} cy={rnd(i * 3 + 7 + seed) * h} r={1.5 + rnd(i * 5 + seed) * 2.5} fill={P.cream} opacity={0.3 + 0.6 * tw * rnd(i * 11 + seed)} />;
    })}
  </g>
);

const Papers: React.FC<{seed?: number; area: [number, number, number, number]; n?: number}> = ({seed = 0, area, n = 14}) => (
  <g>
    {Array.from({length: n}, (_, i) => {
      const x = area[0] + rnd(i * 7 + seed) * (area[2] - area[0]);
      const y = area[1] + rnd(i * 13 + seed) * (area[3] - area[1]);
      return (
        <g key={i} transform={`translate(${x} ${y}) rotate(${rnd(i * 17 + seed) * 80 - 40})`}>
          <rect x={-28} y={-36} width={56} height={72} rx={4} fill={P.lilac} opacity={0.55} />
          {[0, 1, 2, 3].map((k) => <rect key={k} x={-18} y={-24 + k * 14} width={k === 3 ? 20 : 36} height={5} rx={2} fill={P.navy} opacity={0.5} />)}
        </g>
      );
    })}
  </g>
);

// ---------------------------------------------------------------------------------------
// 1 + 2: bedroom seen from above, Leo lies awake
export const Bedroom: React.FC<SceneProps & {close?: boolean}> = ({f, close, at}) => {
  const fy = 640; const s = 1.5;
  const mood = close ? [[0, 'worried'], [at('Turnier'), 'shocked'], [at('Turnier') + 20, 'worried']] as [number, any][] : [[0, 'sleepy'], [at('Leo'), 'worried']] as [number, any][];
  const glowO = 0.55 + 0.1 * Math.sin(f * 0.2);
  return (
    <g>
      <rect x={-200} y={-200} width={2320} height={1480} fill={P.night} />
      {/* rug + moonlight from the window */}
      <ellipse cx={960} cy={560} rx={720} ry={430} fill={P.navy} />
      <path d="M 1500 -100 L 1900 -100 L 1300 1200 L 900 1200 Z" fill={P.lilac} opacity={0.07} />
      <Papers area={[200, 120, 1750, 1000]} seed={3} n={16} />
      {/* bed, head end at the top: Leo lies on his back, face up to the camera */}
      <rect x={700} y={120} width={520} height={900} rx={40} fill={P.indigo} />
      <rect x={720} y={140} width={480} height={860} rx={30} fill={P.blue} opacity={0.55} />
      <rect x={790} y={180} width={340} height={190} rx={60} fill={P.cream} opacity={0.75} />
      <Character f={f} x={960} y={fy} s={s} {...LEO} mood={mood} look={{x: Math.sin(f * 0.03) * 0.6, y: -0.3}} />
      {/* blanket over the body */}
      <path d={`M 720 ${450 + Math.sin(f * 0.08 + 51) * 4} Q 960 ${405 + Math.sin(f * 0.08 + 51) * 6} 1200 ${450 + Math.sin(f * 0.08 + 51) * 4} L 1200 1000 L 720 1000 Z`} fill={P.violet} />
      <path d="M 760 560 Q 900 600 1160 540 M 780 760 Q 960 720 1170 790 M 800 900 Q 1000 940 1160 890" stroke={P.indigo} strokeWidth={10} fill="none" strokeLinecap="round" opacity={0.6} />
      {/* nightstand with clock and phone */}
      <rect x={380} y={170} width={180} height={160} rx={20} fill={P.indigo} />
      <rect x={400} y={200} width={140} height={60} rx={12} fill={P.ink} />
      <text x={470} y={245} textAnchor="middle" fontFamily={kitFont} fontWeight={700} fontSize={42} fill={P.red} opacity={f % 30 < 22 ? 1 : 0.7}>03:00</text>
      <Glow cx={470} cy={230} r={110} color={P.red} o={0.35} />
      <rect x={410} y={360} width={60} height={110} rx={12} fill={P.ink} transform="rotate(-14 440 415)" />
      <rect x={416} y={368} width={48} height={92} rx={8} fill={P.sky} opacity={glowO} transform="rotate(-14 440 415)" />
      <Glow cx={440} cy={415} r={130} color={P.sky} o={0.3} />
      {/* plant + controller on the floor */}
      {[[200, 160], [260, 110], [150, 230], [240, 220]].map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx={70} ry={36} fill={P.teal} opacity={0.9} transform={`rotate(${i * 50 + Math.sin(f * 0.04 + i) * 4} ${x} ${y})`} />)}
      <circle cx={210} cy={180} r={40} fill={P.green} />
      <g transform="translate(1560 880) rotate(20)">
        <path d="M -70 -20 Q -60 -40 0 -36 Q 60 -40 70 -20 Q 90 40 50 40 Q 30 40 20 20 L -20 20 Q -30 40 -50 40 Q -90 40 -70 -20 Z" fill={P.ink} />
        <circle cx={-36} cy={-8} r={10} fill={P.lilac} />
        <circle cx={36} cy={-12} r={7} fill={P.pink} /><circle cx={50} cy={0} r={7} fill={P.yellow} />
      </g>
      {close && (
        // thought bubble: a trophy that wobbles
        <g transform={`translate(1240 300) scale(${-pop(f, at('Turnier') - 6, 14)} ${pop(f, at('Turnier') - 6, 14)})`}>
          <circle cx={-40} cy={-30} r={14} fill={P.cream} opacity={0.9} />
          <circle cx={-70} cy={-70} r={22} fill={P.cream} opacity={0.9} />
          <ellipse cx={-170} cy={-170} rx={130} ry={100} fill={P.cream} />
          <g transform={`translate(-170 -170) rotate(${Math.sin(f * 0.15) * 6})`}>
            <path d="M -40 -50 L 40 -50 Q 40 10 0 18 Q -40 10 -40 -50 Z" fill={P.yellow} />
            <path d="M -40 -40 Q -70 -40 -62 -14 Q -56 4 -36 0 M 40 -40 Q 70 -40 62 -14 Q 56 4 36 0" stroke={P.yellow} strokeWidth={9} fill="none" />
            <rect x={-8} y={16} width={16} height={24} fill={P.orange} />
            <rect x={-32} y={40} width={64} height={16} rx={6} fill={P.orange} />
            <Face f={f} x={0} y={-22} w={50} mood="worried" seed={9} skin={P.yellow} />
          </g>
        </g>
      )}
    </g>
  );
};

// ---------------------------------------------------------------------------------------
// 3 + 4 (+ 12 bright): Leo at his desk, seen from the front, monitor to his right
export const Desk: React.FC<SceneProps & {mode: 'alone' | 'nobody' | 'morning'}> = ({f, mode, at}) => {
  const day = mode === 'morning';
  const lx = 1060; const ly = 930; const s = 1.5;
  const players = ['Spieler_31', 'xXnoobXx', 'Kev2009', 'Shadow'];
  const leaveAt = (i: number) => (mode === 'alone' ? at('Fremde') + 14 + i * 12 : -999);
  const mood = mode === 'alone' ? [[0, 'determined'], [at('Allein'), 'sad'], [at('Gegen'), 'determined'], [at('verschwinden'), 'worried']] as [number, any][]
    : mode === 'nobody' ? [[0, 'happy'], [at('Aber'), 'curious'], [at('niemand'), 'sad']] as [number, any][]
      : [[0, 'happy']] as [number, any][];
  const skill = lin(f, 0, at('Aber'), 0.15, 1);
  const sun = lin(f, 0, 80, 0, 1);
  return (
    <g>
      <defs>
        <linearGradient id="deskWall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={day ? '#ffb37a' : P.night} />
          <stop offset="1" stopColor={day ? '#ff7f9e' : P.indigo} />
        </linearGradient>
        <linearGradient id="deskSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={day ? '#ffd27a' : P.navy} />
          <stop offset="1" stopColor={day ? '#ff8a5c' : P.night} />
        </linearGradient>
      </defs>
      <rect x={-200} y={-200} width={2320} height={1480} fill="url(#deskWall)" />
      {/* window */}
      <rect x={160} y={110} width={420} height={340} rx={24} fill={day ? P.cream : P.violet} />
      <rect x={180} y={130} width={380} height={300} rx={14} fill="url(#deskSky)" />
      {day ? (
        <g>
          <circle cx={370} cy={420 - sun * 150} r={80} fill={P.yellow} />
          <Glow cx={370} cy={420 - sun * 150} r={170} color={P.yellow} o={0.5} />
          <Face f={f} x={370} y={425 - sun * 150} w={80} mood="happy" seed={21} skin={P.yellow} />
          <path d="M 180 380 Q 280 340 380 380 Q 470 410 560 370 L 560 430 L 180 430 Z" fill="#ff6f6f" opacity={0.8} />
        </g>
      ) : (
        <g>
          <circle cx={470} cy={210} r={44} fill={P.cream} />
          <circle cx={452} cy={198} r={10} fill={P.lilac} opacity={0.4} />
          {[0, 1, 2, 3, 4, 5].map((i) => <circle key={i} cx={210 + rnd(i) * 320} cy={150 + rnd(i + 9) * 230} r={3} fill={P.cream} opacity={0.4 + 0.5 * Math.abs(Math.sin(f * 0.1 + i))} />)}
        </g>
      )}
      <rect x={364} y={110} width={12} height={340} fill={day ? P.cream : P.violet} />
      {/* LED strip + shelf */}
      {!day && <rect x={-100} y={500} width={2120} height={8} fill={P.magenta} opacity={0.8} />}
      {!day && <rect x={-100} y={470} width={2120} height={70} fill={P.magenta} opacity={0.08} />}
      <rect x={1440} y={260} width={360} height={18} rx={9} fill={day ? '#c96a5a' : P.violet} />
      <rect x={1470} y={170} width={70} height={90} rx={8} fill={day ? P.teal : P.blue} />
      <rect x={1550} y={190} width={50} height={70} rx={8} fill={day ? P.yellow : P.lilac} />
      <rect x={1620} y={150} width={40} height={110} rx={8} fill={day ? P.pink : P.magenta} />
      {/* gaming chair behind Leo */}
      <rect x={lx - 130} y={500} width={260} height={400} rx={60} fill={day ? P.magenta : '#3a1a7a'} />
      <rect x={lx - 90} y={540} width={180} height={300} rx={40} fill={day ? P.pink : P.violet} opacity={0.6} />
      <Character f={f} x={lx} y={ly} s={s} sit {...LEO} mood={mood} armAngles={[62, -62]} talk={false}
        look={mode === 'nobody' && f > at('niemand') ? {x: 0.2, y: 0.3} : {x: -0.75, y: 0.1}}
        rightHand={day ? (
          <g>
            <rect x={-18} y={-34} width={36} height={40} rx={7} fill={P.cream} />
            <path d="M 18 -26 q 16 0 16 13 q 0 13 -16 13" stroke={P.cream} strokeWidth={7} fill="none" />
            {[0, 1].map((k) => <path key={k} d={`M ${-6 + k * 12} -44 q 8 -12 0 -24 q -8 -12 0 -24`} stroke={P.white} strokeWidth={4} fill="none" opacity={0.3 + 0.3 * Math.sin(f * 0.1 + k)} transform={`translate(0 ${-((f * 0.6 + k * 10) % 16)})`} />)}
          </g>
        ) : undefined} />
      <Headset f={f} x={lx} y={ly} s={s} seed={LEO.seed} sit color={day ? P.yellow : P.teal} />
      {/* monitor glow on Leo */}
      {!day && <Glow cx={lx - 220} cy={640} r={320} color={P.sky} o={0.35} />}
      {/* monitor, turned towards Leo */}
      <rect x={560} y={760} width={30} height={60} fill={P.ink} />
      <path d="M 440 470 L 820 520 L 820 770 L 440 800 Z" fill={P.ink} />
      <g transform="translate(456 488) skewY(7.5)">
        <rect x={0} y={0} width={348} height={282} rx={8} fill={day ? P.sky : P.navy} />
        {mode === 'alone' && players.map((p, i) => {
          const gone = f > leaveAt(i);
          return (
            <g key={p} transform={`translate(24 ${30 + i * 60})`} opacity={gone ? 0.35 : 1}>
              <rect x={0} y={0} width={300} height={44} rx={22} fill={gone ? P.ink : P.violet} />
              <circle cx={24} cy={22} r={13} fill={[P.orange, P.green, P.pink, P.yellow][i]} />
              <text x={50} y={31} fontFamily={kitFont} fontWeight={600} fontSize={24} fill={P.white}>{gone ? 'hat verlassen' : p}</text>
              {gone && <path d="M 262 12 l 20 20 m 0 -20 l -20 20" stroke={P.red} strokeWidth={6} strokeLinecap="round" />}
            </g>
          );
        })}
        {mode === 'nobody' && (
          <g>
            <text x={24} y={44} fontFamily={kitFont} fontWeight={700} fontSize={30} fill={P.teal}>Skill</text>
            <path d={`M 24 250 ${Array.from({length: 20}, (_, i) => `L ${24 + i * 15.5} ${250 - (i / 19) * 170 * skill - Math.sin(i * 1.3) * 12 * skill}`).join(' ')}`}
              stroke={P.teal} strokeWidth={8} fill="none" strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray={420} strokeDashoffset={420 * (1 - skill)} />
          </g>
        )}
        {day && (
          <g>
            <rect x={24} y={30} width={300} height={60} rx={30} fill={P.green} />
            <text x={174} y={70} textAnchor="middle" fontFamily={kitFont} fontWeight={700} fontSize={28} fill={P.ink}>Turnier 19:00</text>
            <circle cx={174} cy={180} r={56} fill={P.cream} />
            <Face f={f} x={174} y={184} w={70} mood="happy" seed={23} skin={P.cream} />
          </g>
        )}
      </g>
      {mode === 'nobody' && (
        // viewer counter under the screen
        <g transform={`translate(640 860) scale(${pop(f, at('niemand') - 4, 12)})`}>
          <rect x={-110} y={-36} width={220} height={72} rx={36} fill={P.red} />
          <path d="M -70 0 Q -46 -24 -22 0 Q -46 24 -70 0 Z" fill={P.white} />
          <circle cx={-46} cy={0} r={8} fill={P.red} />
          <text x={30} y={16} textAnchor="middle" fontFamily={kitFont} fontWeight={700} fontSize={44} fill={P.white}>0</text>
        </g>
      )}
      {/* desk */}
      <rect x={-100} y={812} width={2120} height={40} fill={day ? '#ffcf9e' : P.violet} />
      <rect x={-100} y={852} width={2120} height={300} fill={day ? '#e8905e' : '#2a1670'} />
      <rect x={900} y={796} width={320} height={22} rx={8} fill={P.ink} />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <rect key={i} x={914 + i * 38} y={801} width={28} height={8} rx={3} fill={day ? P.lilac : P.magenta} opacity={!day ? 0.5 + 0.5 * Math.sin(f * 0.2 + i) : 0.6} />)}
      <ellipse cx={1290} cy={806} rx={30} ry={14} fill={P.ink} />
    </g>
  );
};

// ---------------------------------------------------------------------------------------
// 5: alone on a dark stage, a big question mark with a face
export const Doubt: React.FC<SceneProps> = ({f, at}) => {
  const q = pop(f, at('Bin') - 6, 16);
  return (
    <g>
      <rect x={-200} y={-200} width={2320} height={1480} fill={P.night} />
      <path d="M 860 -100 L 1060 -100 L 1300 900 L 620 900 Z" fill={P.cream} opacity={0.1} />
      <path d="M 900 -100 L 1020 -100 L 1180 900 L 740 900 Z" fill={P.cream} opacity={0.08} />
      <ellipse cx={960} cy={905} rx={330} ry={60} fill={P.cream} opacity={0.18} />
      <rect x={-200} y={900} width={2320} height={400} fill={P.navy} />
      <Character f={f} x={960} y={920} s={1.25} {...LEO} mood={[[0, 'sad'], [at('Bin'), 'worried']]} look={{x: 0.7, y: -0.5}} />
      <g transform={`translate(1430 560) scale(${q}) rotate(${Math.sin(f * 0.06) * 5})`}>
        <path d="M -110 -120 Q -110 -260 20 -260 Q 150 -260 150 -140 Q 150 -60 60 -20 Q 20 0 20 60 L -50 60 Q -50 -40 30 -80 Q 80 -105 80 -140 Q 80 -190 20 -190 Q -40 -190 -40 -120 Z" fill={P.yellow} />
        <circle cx={-15} cy={140} r={46} fill={P.yellow} />
        <Glow cx={0} cy={-60} r={260} color={P.yellow} o={0.25} />
        <Face f={f} x={30} y={-190} w={70} mood="worried" seed={31} skin={P.yellow} look={{x: -0.8, y: 0.4}} />
      </g>
      {[0, 1, 2].map((i) => {
        const p = pop(f, at('Frage') + i * 6, 12);
        return <text key={i} x={420 + i * 150} y={360 - i * 60} fontFamily={kitFont} fontWeight={700} fontSize={90 - i * 15} fill={P.lilac} opacity={0.5 * p} transform={`rotate(${-12 + i * 9} ${420 + i * 150} ${360 - i * 60})`}>?</text>;
      })}
    </g>
  );
};

// ---------------------------------------------------------------------------------------
// 6: Leo thinking, chalk diagrams of zones and stats floating around him
export const Think: React.FC<SceneProps> = ({f, at}) => {
  const chalk = {stroke: P.lilac, strokeWidth: 5, fill: 'none', strokeLinecap: 'round' as const, opacity: 0.55};
  const kills = Math.min(7, Math.floor(lin(f, at('Kills') - 10, at('Kills') + 30, 0, 7)));
  const drift = (k: number) => `translate(${Math.sin(f * 0.02 + k) * 14} ${Math.cos(f * 0.025 + k) * 10})`;
  return (
    <g>
      <rect x={-200} y={-200} width={2320} height={1480} fill={P.navy} />
      {/* far layer: big blurred-looking numbers */}
      <text x={-40} y={1020} fontFamily={kitFont} fontWeight={700} fontSize={300} fill={P.indigo} opacity={0.7}>K/D 1,4</text>
      <g transform={drift(1)}>
        <circle cx={330} cy={300} r={170} {...chalk} />
        <circle cx={380} cy={330} r={90} {...chalk} strokeDasharray="14 14" />
        <path d="M 180 470 Q 260 380 360 340" {...chalk} />
        <path d="M 340 330 l 26 6 l -12 22" {...chalk} />
        <text x={190} y={110} fontFamily={kitFont} fontWeight={600} fontSize={44} fill={P.lilac} opacity={0.7}>Zone 4</text>
      </g>
      <g transform={drift(2)}>
        <path d="M 620 760 L 700 680 L 780 720 L 880 580 L 980 610" {...chalk} />
        <text x={600} y={830} fontFamily={kitFont} fontWeight={600} fontSize={40} fill={P.lilac} opacity={0.7}>Platz 14 → 9 → 6</text>
      </g>
      <g transform={drift(3)}>
        <rect x={640} y={120} width={300} height={200} rx={16} {...chalk} />
        {[0, 1, 2].map((i) => <path key={i} d={`M ${670 + i * 90} 300 L ${670 + i * 90} ${300 - 50 - i * 45}`} {...chalk} strokeWidth={26} />)}
      </g>
      <g transform={drift(4)}>
        <text x={1000} y={220} fontFamily={kitFont} fontWeight={700} fontSize={70} fill={P.cream} opacity={0.85}>Kills: {kills}</text>
      </g>
      {/* Leo close up, bottom right */}
      <Character f={f} x={1500} y={1500} s={3.2} {...LEO} mood={[[0, 'curious'], [at('Kills'), 'determined'], [at('Endzone'), 'curious']]}
        look={{x: -0.8 + Math.sin(f * 0.05) * 0.2, y: -0.6}} />
      {/* foreground chalk, larger and fainter, for depth */}
      <g transform={`translate(${-f * 0.8} 0)`} opacity={0.35}>
        <circle cx={1150} cy={980} r={260} stroke={P.lilac} strokeWidth={14} fill="none" strokeDasharray="40 30" />
      </g>
    </g>
  );
};

// ---------------------------------------------------------------------------------------
// 7: video call, four tiles
export const Call: React.FC<SceneProps> = ({f, at}) => {
  const tiles = [
    {c: LEO, bg: P.violet, x: 140, y: 80, mood: [[0, 'curious'], [at('genauso'), 'joy']] as [number, any][], arms: 'down' as const},
    {c: MATE_A, bg: P.orange, x: 980, y: 80, mood: 'happy' as const, arms: 'wave' as const},
    {c: MATE_B, bg: P.teal, x: 140, y: 560, mood: 'joy' as const, arms: 'down' as const},
    {c: MATE_C, bg: P.pink, x: 980, y: 560, mood: 'happy' as const, arms: 'down' as const},
  ];
  return (
    <g>
      <rect x={-200} y={-200} width={2320} height={1480} fill={P.night} />
      <defs>
        {tiles.map((t, i) => <clipPath key={i} id={`callTile${i}`}><rect x={t.x} y={t.y} width={800} height={440} rx={36} /></clipPath>)}
      </defs>
      {tiles.map((t, i) => {
        const shown = pop(f, i * 8, 12);
        const speaking = Math.floor(f / 25) % 4 === i;
        return (
          <g key={i} transform={`translate(${t.x + 400} ${t.y + 220}) scale(${shown}) translate(${-t.x - 400} ${-t.y - 220})`}>
            <g clipPath={`url(#callTile${i})`}>
              <rect x={t.x} y={t.y} width={800} height={440} fill={t.bg} />
              <circle cx={t.x + 400} cy={t.y + 220} r={260} fill={P.white} opacity={0.12} />
              <Character f={f} x={t.x + 400} y={t.y + 660} s={2.0} {...t.c} mood={t.mood} arms={t.arms} talk={speaking} />
            </g>
            <rect x={t.x} y={t.y} width={800} height={440} rx={36} fill="none" stroke={speaking ? P.green : P.ink} strokeWidth={speaking ? 12 : 6} />
          </g>
        );
      })}
      <Tag f={f} at={10} text="4 online" x={960} y={1000} color={P.green} size={40} />
    </g>
  );
};

// ---------------------------------------------------------------------------------------
// 8: the scrim from above: island, storm closing in, four teams
const ISLAND = 'M 560 260 Q 760 140 1000 190 Q 1260 150 1380 300 Q 1520 460 1440 660 Q 1380 860 1120 900 Q 860 950 680 840 Q 470 720 460 520 Q 450 350 560 260 Z';
export const Scrim: React.FC<SceneProps> = ({f, dur, at}) => {
  const r = lin(f, 0, dur, 520, 300);
  const cx = 1000; const cy = 540;
  const teams = [
    {c: P.yellow, from: [600, 360], to: [930, 500], name: 'LEO'},
    {c: P.pink, from: [1350, 330], to: [1100, 470]},
    {c: P.orange, from: [1320, 780], to: [1080, 640]},
    {c: P.sky, from: [640, 780], to: [900, 640]},
  ];
  const p = lin(f, 0, dur, 0, 1);
  return (
    <g>
      <rect x={-200} y={-200} width={2320} height={1480} fill={P.blue} />
      {Array.from({length: 18}, (_, i) => <path key={i} d={`M ${rnd(i) * 1900} ${rnd(i + 4) * 1080} q 20 -14 40 0 q 20 14 40 0`} stroke={P.sky} strokeWidth={5} fill="none" opacity={0.6} transform={`translate(${Math.sin(f * 0.05 + i) * 10} 0)`} />)}
      <path d={ISLAND} fill="#ffd98a" transform="translate(960 540) scale(1.06) translate(-960 -540)" />
      <path d={ISLAND} fill={P.green} />
      <path d="M 720 300 Q 900 260 1000 330 Q 1060 420 980 470" stroke={P.sky} strokeWidth={22} fill="none" strokeLinecap="round" />
      {Array.from({length: 26}, (_, i) => {
        const x = 560 + rnd(i * 3) * 800; const y = 260 + rnd(i * 5 + 1) * 560;
        return <circle key={i} cx={x} cy={y} r={18 + rnd(i) * 14} fill={P.teal} />;
      })}
      {[[760, 620], [1180, 380], [1240, 700], [880, 760]].map(([x, y], i) => (
        <g key={i}><rect x={x - 30} y={y - 30} width={60} height={60} rx={8} fill={P.lilac} /><rect x={x - 30} y={y - 30} width={60} height={22} rx={8} fill={P.magenta} /></g>
      ))}
      {/* storm */}
      <path d={`M -300 -300 H 2220 V 1380 H -300 Z M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0 Z`} fillRule="evenodd" fill={P.magenta} opacity={0.42} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={P.white} strokeWidth={6} strokeDasharray="20 16" opacity={0.9} />
      {teams.map((t, i) => {
        const x = t.from[0] + (t.to[0] - t.from[0]) * p; const y = t.from[1] + (t.to[1] - t.from[1]) * p;
        return (
          <g key={i} transform={`translate(${x} ${y}) scale(${pop(f, at('Echte') + i * 4, 10)})`}>
            <circle r={30} fill={t.c} stroke={P.white} strokeWidth={6} />
            <Face f={f} x={0} y={2} w={30} mood={i === 0 ? 'determined' : 'curious'} seed={60 + i} skin={t.c} kind="human" />
            {t.name && <g transform="translate(0 -62)"><rect x={-50} y={-22} width={100} height={40} rx={20} fill={P.yellow} /><text y={10} textAnchor="middle" fontFamily={kitFont} fontWeight={700} fontSize={28} fill={P.ink}>{t.name}</text></g>}
          </g>
        );
      })}
      <Tag f={f} at={at('Feste') - 6} text="Runde 3 / 6" x={260} y={80} color={P.yellow} size={42} />
    </g>
  );
};

// ---------------------------------------------------------------------------------------
// 9: replay review on a big screen
export const Replay: React.FC<SceneProps> = ({f, dur, at}) => {
  const die = at('stirbt');
  const path = 'M 340 760 Q 380 600 520 560 Q 640 520 700 420 Q 740 340 860 320';
  const prog = lin(f, 0, die, 0, 1);
  const head = lin(f, 0, dur, 0, 1);
  return (
    <g>
      <rect x={-200} y={-200} width={2320} height={1480} fill={P.night} />
      <rect x={120} y={60} width={1680} height={900} rx={40} fill={P.ink} />
      <rect x={150} y={90} width={1620} height={840} rx={24} fill={P.navy} />
      {/* map panel */}
      <rect x={190} y={130} width={900} height={660} rx={20} fill={P.blue} />
      <g transform="translate(190 130) scale(0.75) translate(-330 -110)">
        <path d={ISLAND} fill={P.green} />
      </g>
      <circle cx={760} cy={470} r={190} fill="none" stroke={P.white} strokeWidth={5} strokeDasharray="16 12" />
      <path d={path} stroke={P.yellow} strokeWidth={10} fill="none" strokeLinecap="round" strokeDasharray="1000" strokeDashoffset={1000 * (1 - prog)} />
      {f >= die && (
        <g transform={`translate(860 320) scale(${pop(f, die, 12) * (1 + 0.06 * Math.sin(f * 0.3))})`}>
          <circle r={44} fill={P.red} />
          <path d="M -18 -18 L 18 18 M 18 -18 L -18 18" stroke={P.white} strokeWidth={10} strokeLinecap="round" />
        </g>
      )}
      <Label f={f} at={at('warum') - 4} text="zu spät rotiert" x={890} y={250} color={P.red} />
      {/* stats panel */}
      <rect x={1130} y={130} width={600} height={660} rx={20} fill={P.indigo} />
      <text x={1170} y={200} fontFamily={kitFont} fontWeight={700} fontSize={46} fill={P.cream}>Replay · Runde 3</text>
      {[['Platz', '7'], ['Schaden', '412'], ['Kills', '3'], ['Rotation', 'spät']].map(([k, v], i) => (
        <g key={k} opacity={pop(f, 8 + i * 8, 10)}>
          <rect x={1170} y={250 + i * 120} width={520} height={90} rx={20} fill={P.navy} />
          <text x={1200} y={308 + i * 120} fontFamily={kitFont} fontWeight={600} fontSize={38} fill={P.lilac}>{k}</text>
          <text x={1660} y={308 + i * 120} textAnchor="end" fontFamily={kitFont} fontWeight={700} fontSize={42} fill={k === 'Rotation' && f > at('warum') ? P.red : P.cream}>{v}</text>
        </g>
      ))}
      {/* timeline */}
      <rect x={190} y={830} width={1540} height={20} rx={10} fill={P.indigo} />
      <rect x={190} y={830} width={1540 * head} height={20} rx={10} fill={P.teal} />
      {[0.2, 0.45, 0.62].map((p, i) => <circle key={i} cx={190 + 1540 * p} cy={840} r={14} fill={P.yellow} />)}
      <circle cx={190 + 1540 * 0.78} cy={840} r={16} fill={P.red} />
      <Character f={f} x={1700} y={1150} s={1.3} {...LEO} mood={[[0, 'curious'], [die, 'shocked'], [at('warum'), 'determined']]} armAngles={[12, -150]} look={{x: -0.8, y: -0.4}} />
    </g>
  );
};

// ---------------------------------------------------------------------------------------
// 10: climbing the weeks
export const Grow: React.FC<SceneProps> = ({f, dur, at}) => {
  const steps = 6; const x0 = 300; const w = 230;
  const hAt = (i: number) => 120 + i * 60;
  const p = lin(f, 6, dur - 10, 0, steps - 1);
  const i0 = Math.floor(p); const t = p - i0;
  const hop = t > 0.6 ? (t - 0.6) / 0.4 : 0;
  const top = (i: number) => 1000 - hAt(Math.min(steps - 1, i));
  const x = x0 + w / 2 + (i0 + hop) * w;
  const y = top(i0) + (top(i0 + 1) - top(i0)) * hop - Math.sin(hop * Math.PI) * 80;
  return (
    <g>
      <defs>
        <linearGradient id="growSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={P.sky} /><stop offset="1" stopColor="#bff3ff" /></linearGradient>
      </defs>
      <rect x={-200} y={-200} width={2320} height={1480} fill="url(#growSky)" />
      <circle cx={1650} cy={180} r={90} fill={P.yellow} />
      <Glow cx={1650} cy={180} r={200} color={P.yellow} o={0.6} />
      {[0, 1, 2].map((i) => <g key={i} transform={`translate(${((i * 700 + f * 0.6) % 2400) - 300} ${120 + i * 70})`}><ellipse rx={110} ry={40} fill={P.white} /><ellipse cx={60} cy={-20} rx={70} ry={40} fill={P.white} /></g>)}
      <path d="M -200 820 Q 300 640 800 780 Q 1300 900 2120 700 L 2120 1280 L -200 1280 Z" fill={P.teal} />
      <path d="M -200 920 Q 500 820 1100 900 Q 1600 960 2120 860 L 2120 1280 L -200 1280 Z" fill={P.green} />
      {Array.from({length: steps}, (_, i) => (
        <g key={i}>
          <rect x={x0 + i * w} y={1000 - hAt(i)} width={w - 16} height={hAt(i) + 100} rx={18} fill={[P.violet, P.indigo, P.blue, P.teal, P.orange, P.pink][i]} />
          <text x={x0 + i * w + (w - 16) / 2} y={1000 - hAt(i) + 70} textAnchor="middle" fontFamily={kitFont} fontWeight={700} fontSize={44} fill={P.white}>W{i + 1}</text>
        </g>
      ))}
      <Character f={f} x={x} y={y} s={0.95} {...LEO} mood={[[0, 'determined'], [at('ruhiger'), 'happy'], [at('Klüger'), 'joy']]} walk={hop > 0 ? 0 : 0.6} arms={f > at('Klüger') ? 'cheer' : 'down'} />
    </g>
  );
};

// ---------------------------------------------------------------------------------------
// 11: flying through space, nothing can stop him
export const Space: React.FC<SceneProps> = ({f}) => {
  const bob = Math.sin(f * 0.1) * 14;
  return (
    <g>
      <rect x={-200} y={-200} width={2320} height={1480} fill={P.night} />
      {[0.6, 1.4, 3].map((sp, L) => (
        <g key={L}>
          {Array.from({length: 40}, (_, i) => {
            const x = ((rnd(i + L * 50) * 2400 - f * sp * 6) % 2400 + 2400) % 2400 - 240;
            return <rect key={i} x={x} y={rnd(i * 7 + L * 30) * 1080} width={4 + sp * 10} height={3 + L} rx={2} fill={P.cream} opacity={0.3 + L * 0.2} />;
          })}
        </g>
      ))}
      {/* ringed planet passing */}
      <g transform={`translate(${380 - f * 2.2} 300)`}>
        <circle r={170} fill={P.orange} />
        <path d="M -170 -20 Q 0 -60 170 -20 M -160 50 Q 0 10 165 50" stroke="#ffb45a" strokeWidth={26} fill="none" />
        <ellipse rx={300} ry={60} fill="none" stroke={P.teal} strokeWidth={22} transform="rotate(-14)" />
        <Face f={f} x={0} y={10} w={120} mood="happy" seed={71} skin={P.orange} />
      </g>
      <g transform={`translate(${1700 - f * 4} ${820 + Math.sin(f * 0.07) * 20}) rotate(${f * 0.8})`}>
        <path d="M -70 -20 Q -60 -70 0 -66 Q 70 -60 74 0 Q 70 60 10 64 Q -60 70 -70 -20 Z" fill={P.lilac} />
        <circle cx={-20} cy={20} r={12} fill={P.violet} /><circle cx={30} cy={-24} r={9} fill={P.violet} />
      </g>
      {/* ship */}
      <g transform={`translate(960 ${700 + bob}) rotate(${Math.sin(f * 0.07) * 3})`}>
        {[0, 1].map((k) => <path key={k} d={`M -170 ${-20 + k * 40} Q ${-260 - Math.sin(f * 0.8 + k) * 30} ${-10 + k * 40} ${-330 - Math.sin(f * 0.6 + k) * 40} ${k * 40 - 20 + 10}`} stroke={k ? P.yellow : P.orange} strokeWidth={30 - k * 8} strokeLinecap="round" fill="none" />)}
        <Glow cx={-200} cy={0} r={130} color={P.orange} o={0.6} />
        <path d="M -60 -40 L -150 -170 L -40 -150 L 40 -40 Z" fill={P.pink} />
        <path d="M -60 40 L -150 170 L -40 150 L 40 40 Z" fill={P.pink} />
        <path d="M -180 -70 Q 120 -110 230 0 Q 120 110 -180 70 Q -210 0 -180 -70 Z" fill={P.magenta} />
        <path d="M -150 30 Q 100 60 220 6" stroke="#b0309f" strokeWidth={14} fill="none" />
        <circle cx={40} cy={-58} r={74} fill={P.sky} opacity={0.55} />
        <g transform="translate(40 -40) scale(0.85)">
          <path d="M -52 -10 Q -56 -68 0 -68 Q 56 -68 52 -10 Q 40 -44 0 -44 Q -40 -44 -52 -10 Z" fill={LEO.hair} />
          <ellipse cx={0} cy={0} rx={50} ry={52} fill={LEO.skin} />
          <path d="M -52 -6 Q -56 -64 0 -64 Q 56 -64 52 -6 Q 40 -40 0 -40 Q -40 -40 -52 -6 Z" fill={LEO.hair} />
          <Face f={f} x={0} y={8} w={84} mood="joy" seed={LEO.seed} kind="human" skin={LEO.skin} look={{x: 0.7, y: 0}} />
        </g>
        <path d="M -34 -122 Q 40 -150 110 -100" stroke={P.white} strokeWidth={10} fill="none" opacity={0.5} strokeLinecap="round" />
      </g>
    </g>
  );
};

// ---------------------------------------------------------------------------------------
// 13: night on a cliff, the whole team, a small fire
export const Team: React.FC<SceneProps> = ({f, at}) => {
  const flick = (k: number) => Math.sin(f * 0.5 + k) * 10;
  const cast = [MATE_B, LEO, MATE_A, MATE_C];
  return (
    <g>
      <defs>
        <linearGradient id="teamSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={P.night} /><stop offset="1" stopColor={P.violet} /></linearGradient>
      </defs>
      <rect x={-200} y={-200} width={2320} height={1480} fill="url(#teamSky)" />
      <Stars f={f} n={110} h={700} seed={5} />
      <circle cx={1480} cy={240} r={90} fill={P.cream} />
      <Glow cx={1480} cy={240} r={220} color={P.cream} o={0.35} />
      <Face f={f} x={1480} y={246} w={90} mood="sleepy" seed={81} skin={P.cream} />
      <path d="M -200 760 L 200 560 L 460 700 L 800 520 L 1150 690 L 1500 560 L 2120 740 L 2120 1280 L -200 1280 Z" fill={P.indigo} />
      <path d="M -200 860 Q 400 780 900 830 Q 1300 870 1500 840 L 1560 1280 L -200 1280 Z" fill="#2a1670" />
      <path d="M -200 860 Q 400 780 900 830 Q 1300 870 1500 840" stroke={P.teal} strokeWidth={14} fill="none" />
      {/* campfire */}
      <Glow cx={360} cy={830} r={240} color={P.orange} o={0.7} />
      <path d={`M 310 860 Q 300 ${780 + flick(1)} 350 ${730 + flick(2)} Q 360 ${790 + flick(3)} 390 ${750 + flick(4)} Q 420 ${810 + flick(5)} 410 860 Z`} fill={P.orange} />
      <path d={`M 335 860 Q 330 ${810 + flick(6)} 360 ${780 + flick(7)} Q 385 ${820 + flick(8)} 385 860 Z`} fill={P.yellow} />
      <rect x={290} y={852} width={140} height={20} rx={10} fill="#5a2f1a" transform="rotate(8 360 862)" />
      {cast.map((c, i) => (
        <Character key={i} f={f} x={640 + i * 200} y={850} s={0.95} sit {...c}
          mood={i === 1 ? [[0, 'happy'], [at('Plan'), 'joy']] : 'happy'} talk={Math.floor(f / 30) % 4 === i}
          look={{x: i < 2 ? 0.6 : -0.6, y: 0}} arms={i === 1 && f > at('Plan') ? 'cheer' : 'down'} />
      ))}
    </g>
  );
};

// ---------------------------------------------------------------------------------------
// 14: logo
export const Logo: React.FC<SceneProps & {logo: string; tagAt: number}> = ({f, logo, tagAt}) => {
  const s = pop(f, 2, 18);
  const t = pop(f, tagAt, 14);
  return (
    <g>
      <defs>
        <radialGradient id="logoBg" cx="0.5" cy="0.4" r="0.8"><stop offset="0" stopColor={P.violet} /><stop offset="1" stopColor={P.night} /></radialGradient>
      </defs>
      <rect x={-200} y={-200} width={2320} height={1480} fill="url(#logoBg)" />
      <Stars f={f} n={70} seed={11} />
      <Glow cx={960} cy={330} r={330} color={P.yellow} o={0.45} />
      <g transform={`translate(960 330) scale(${s}) rotate(${Math.sin(f * 0.05) * 2})`}>
        <image href={logo} x={-170} y={-170} width={340} height={340} />
      </g>
      <g transform={`translate(960 860) scale(${t})`}>
        <text y={0} textAnchor="middle" fontFamily={kitFont} fontWeight={700} fontSize={64} fill={P.cream}>Werd besser, bevor es zählt.</text>
        <text y={80} textAnchor="middle" fontFamily={kitFont} fontWeight={600} fontSize={44} fill={P.yellow}>scrimpass.com</text>
      </g>
    </g>
  );
};
