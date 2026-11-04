// Scenes on Earth told through a small cast, Kurzgesagt-style: each idea is its own composed
// picture around 2-3 characters (Mia, her dad, their dog), not a camera tour through one big world.
import React from 'react';
import {BigNumber, Bubble, Character, Face, IceCream, Label, MIA, P, PAPA, cycle, handAt, kitFont, pop, rnd} from '../../design/kit';
import {Bird, Cloud, Dog, Kite, Tree} from './Intro';
import {SH, SW} from './Video';


const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (t: number) => t * t * (3 - 2 * t);
// gentle camera inside a picture: a slow push towards (x, y)
const push = (f: number, t0: number, dur: number, z0: number, z1: number, x = SW / 2, y = SH / 2) => {
  const z = lerp(z0, z1, smooth(clamp01((f - t0) / dur)));
  return `translate(${x} ${y}) scale(${z}) translate(${-x} ${-y})`;
};

const SunnySky: React.FC<{f: number; sun?: {x: number; y: number; r: number}; dark?: number}> = ({f, sun = {x: 330, y: 220, r: 90}, dark = 0}) => (
  <>
    <defs>
      <linearGradient id="pplSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3aa8ff" /><stop offset="1" stopColor="#bdeeff" /></linearGradient>
      <radialGradient id="pplSun"><stop offset="0.3" stopColor="#fff6c8" /><stop offset="0.55" stopColor="#ffe68a" stopOpacity="0.55" /><stop offset="1" stopColor="#ffe68a" stopOpacity="0" /></radialGradient>
    </defs>
    <rect width={SW} height={SH} fill="url(#pplSky)" />
    <g opacity={1 - dark}>
      <circle cx={sun.x} cy={sun.y} r={sun.r * 3.2} fill="url(#pplSun)" />
      <g transform={`rotate(${f * 0.2} ${sun.x} ${sun.y})`} opacity={0.45}>
        {Array.from({length: 16}, (_, i) => <rect key={i} x={sun.x - 6} y={sun.y - sun.r * 2.1} width={12} height={sun.r * 0.7} rx={6} fill="#fff3b0" transform={`rotate(${i * 22.5} ${sun.x} ${sun.y})`} />)}
      </g>
      <circle cx={sun.x} cy={sun.y} r={sun.r} fill="#fff7cf" />
      <Face f={f} x={sun.x} y={sun.y + sun.r * 0.06} w={sun.r * 1.05} mood={cycle(['happy', 'joy', 'happy'], 80, 6)} seed={13} skin="#fff7cf" />
    </g>
    <Cloud x={((300 + f * 0.5) % 2400) - 300} y={150} s={1.0} />
    <Cloud x={((1400 + f * 0.35) % 2400) - 300} y={300} s={0.7} />
  </>
);

const Hill: React.FC<{y: number; c1?: string; c2?: string}> = ({y, c1 = '#3fcf6e', c2 = '#2bb05a'}) => (
  <>
    <path d={`M -100 ${y + 40} Q 500 ${y - 70} 1000 ${y + 10} T 2100 ${y + 20} L 2100 1200 L -100 1200 Z`} fill={c1} />
    <path d={`M -100 ${y + 150} Q 700 ${y + 80} 1300 ${y + 140} T 2100 ${y + 130} L 2100 1200 L -100 1200 Z`} fill={c2} />
  </>
);

const Bench: React.FC<{x: number; y: number; w?: number}> = ({x, y, w = 560}) => (
  <g transform={`translate(${x} ${y})`}>
    <rect x={-w / 2} y={-120} width={w} height={26} rx={10} fill="#a0582f" />
    <rect x={-w / 2} y={-84} width={w} height={26} rx={10} fill="#a0582f" />
    <rect x={-w / 2 - 10} y={-40} width={w + 20} height={30} rx={12} fill="#b86a38" />
    <rect x={-w / 2 + 30} y={-14} width={20} height={70} rx={8} fill="#5a2f1a" />
    <rect x={w / 2 - 50} y={-14} width={20} height={70} rx={8} fill="#5a2f1a" />
  </g>
);

// "Und du merkst: nichts." — Mia and her dad on a bench with ice cream, the dog at their feet
export const PicnicPanel: React.FC<{f: number; t0: number; dark?: number; shock?: number; moodPapa?: any; moodMia?: any; lookAt?: {x: number; y: number}; children?: React.ReactNode}> = ({f, t0, dark = 0, shock, moodPapa, moodMia, lookAt, children}) => {
  const shocked = shock !== undefined && f >= shock && f < shock + 40;
  const papaMood = shocked ? 'shocked' : shock !== undefined && f >= shock + 40 ? 'curious' : cycle(['happy', 'joy', 'happy'], 70, 1);
  const miaMood = shocked ? 'shocked' : shock !== undefined && f >= shock + 40 ? 'worried' : cycle(['joy', 'happy', 'joy'], 60, 2);
  const talkPapa = !shocked && !lookAt && Math.floor((f - t0) / 40) % 2 === 0;
  return (
    <g transform={push(f, t0, 120, 1.0, 1.05, 960, 700)}>
      <SunnySky f={f} dark={dark} sun={{x: 300, y: 200, r: 80}} />
      <Hill y={700} />
      <Tree x={1780} y={760} s={1.4} f={f} ph={2} />
      <g transform="translate(960 1060) scale(1.35) translate(-960 -960)">
      <Bench x={960} y={900} />
      <Character f={f} x={830} y={880} s={1.5} {...PAPA} sit mood={moodPapa ?? papaMood} talk={talkPapa} look={lookAt ?? {x: 0.8, y: 0}}
        armAngles={[20, -40]} rightHand={<IceCream f={f} s={1.4} scoop={P.yellow} />} />
      <Character f={f} x={1110} y={880} s={1.1} {...MIA} sit mood={moodMia ?? miaMood} talk={!shocked && !lookAt && !talkPapa} look={lookAt ? {x: -lookAt.x, y: lookAt.y} : {x: -0.8, y: -0.2}} flip
        armAngles={[20, -45]} rightHand={<IceCream f={f} s={1.4} scoop={P.pink} />} />
      </g>
      <g transform="translate(1480 1040) scale(1.9)"><Dog f={f * 0.3} x={0} y={0} /></g>
      {dark > 0 && <rect width={SW} height={SH} fill={P.night} opacity={0.8 * dark} />}
      {children}
    </g>
  );
};

// "Du siehst sie sogar noch am Himmel." — low angle: Mia shades her eyes and looks up at the sun
export const LookUpPanel: React.FC<{f: number; t0: number}> = ({f, t0}) => (
  <g transform={push(f, t0, 90, 1.0, 1.05, 1200, 400)}>
    <SunnySky f={f} sun={{x: 1250, y: 520, r: 120}} />
    {[0, 1, 2].map((i) => <Bird key={i} x={((i * 260 + (f - t0) * 3) % 2200) - 200} y={180 + i * 50} f={f} ph={i} />)}
    <path d="M -100 1000 Q 600 900 1300 980 T 2100 960 L 2100 1200 L -100 1200 Z" fill="#2bb05a" />
    <Character f={f} x={480} y={1160} s={2.0} {...MIA} arms="shade" mood={cycle(['curious', 'happy', 'curious'], 50, 3)} look={{x: 0.9, y: -1}} tilt={-8} />
    <Bubble f={f} at={t0 + 16} text={['Mein Licht ist', 'schon 8 Minuten alt!']} x={1250} y={330} color={P.violet} size={48} tail="down" />
  </g>
);

// "Der Himmel ist blau. Es ist warm." — close-up of dad with sunglasses, ice cream melting
export const WarmPanel: React.FC<{f: number; t0: number}> = ({f, t0}) => {
  const drip = clamp01((f - t0) / 45);
  return (
    <g transform={push(f, t0, 60, 1.04, 1.0, 900, 560)}>
      <rect width={SW} height={SH} fill="#ffd45a" />
      <circle cx={380} cy={260} r={520} fill="#ffe68a" />
      <circle cx={380} cy={260} r={300} fill="#fff2b0" />
      {/* heat shimmer */}
      {Array.from({length: 7}, (_, i) => {
        const t = ((f * 1.4 + i * 30) % 160) / 160;
        const x = 200 + i * 240;
        return <path key={i} d={`M ${x} ${900 - t * 500} q 18 -30 0 -60 q -18 -30 0 -60`} stroke="#ff9a3a" strokeWidth={8} strokeLinecap="round" fill="none" opacity={0.5 * (1 - t)} />;
      })}
      <Character f={f} x={960} y={1180} s={2.1} {...PAPA} glasses mood={cycle(['happy', 'joy'], 50, 5)} tilt={6}
        armAngles={[15, -150]} rightHand={<IceCream f={f} s={1.6} scoop={P.yellow} drip={drip} />} />
    </g>
  );
};

// "Die Kinder im Park lassen weiter ihre Drachen steigen." — Mia runs with her kite, the dog follows
export const KitePanel: React.FC<{f: number; t0: number}> = ({f, t0}) => {
  const t = f - t0;
  const scroll = t * 7; // the world slides by, Mia stays in frame
  const miaX = 820;
  const MS = 1.75;
  const hand = handAt(-120);
  const hx = miaX + hand.x * MS;
  const hy = 1010 + hand.y * MS;
  return (
    <g>
      <SunnySky f={f} sun={{x: 260, y: 170, r: 70}} />
      <g transform={`translate(${-(scroll * 0.3) % 1600} 0)`}>
        {[0, 1600].map((o) => <path key={o} d={`M ${o - 100} 760 Q ${o + 400} 640 ${o + 800} 740 T ${o + 1700} 730 L ${o + 1700} 1200 L ${o - 100} 1200 Z`} fill="#7fdc9a" />)}
      </g>
      <g transform={`translate(${-(scroll * 0.6) % 900} 0)`}>
        {Array.from({length: 5}, (_, i) => <Tree key={i} x={i * 900 + 200} y={860} s={0.9} f={f} ph={i} />)}
      </g>
      <rect x={0} y={900} width={SW} height={200} fill="#3fcf6e" />
      <g transform={`translate(${-scroll % 300} 0)`}>
        {Array.from({length: 9}, (_, i) => <path key={i} d={`M ${i * 300} 1000 q 10 -40 20 0 q 10 -50 20 0 q 10 -40 20 0`} fill="#2bb05a" />)}
      </g>
      <Kite hx={hx} hy={hy} kx={1320} ky={330} f={f} c="#ff5d50" c2="#ffb547" ph={0} />
      <Character f={f} x={miaX} y={1010} s={MS} {...MIA} walk={1} arms="kite" mood={cycle(['joy', 'happy', 'joy'], 45, 4)} look={{x: 0.8, y: -0.9}} />
      <g transform={`translate(${420 + Math.sin(t * 0.08) * 40} 1040) scale(2.1)`}><Dog f={f} x={0} y={0} /></g>
      {/* speed lines */}
      {Array.from({length: 5}, (_, i) => {
        const x = ((i * 420 - scroll * 1.6) % 2100 + 2100) % 2100 - 100;
        return <rect key={i} x={x} y={600 + i * 70} width={140} height={6} rx={3} fill="#fff" opacity={0.5} />;
      })}
    </g>
  );
};



// ---------------------------------------------------------------------------------------
// "Wäre die Sonne so groß wie ein Fußball ..." — dad with a football that is the sun
const Field: React.FC<{f: number}> = ({f}) => (
  <>
    <SunnySky f={f} sun={{x: 260, y: 170, r: 60}} />
    <path d="M -100 760 Q 600 690 1200 740 T 2100 730 L 2100 1200 L -100 1200 Z" fill="#7fdc9a" />
    <rect x={0} y={820} width={SW} height={300} fill="#3fcf6e" />
    {Array.from({length: 8}, (_, i) => <rect key={i} x={i * 260 - 60} y={820} width={130} height={300} fill="#fff" opacity={0.06} />)}
    <rect x={0} y={900} width={SW} height={8} fill="#fff" opacity={0.7} />
  </>
);

export const BallPanel: React.FC<{f: number; t0: number}> = ({f, t0}) => (
  <g transform={push(f, t0, 120, 1.0, 1.06, 900, 700)}>
    <Field f={f} />
    <Character f={f} x={700} y={1000} s={1.9} {...PAPA} arms="hold" armAngles={[20, -70]} mood={cycle(['happy', 'curious', 'happy'], 60, 2)} look={{x: 0.9, y: 0.4}} />
    <g transform={`translate(1130 ${900 - Math.abs(Math.sin((f - t0) * 0.08)) * 10})`}>
      <ellipse cx={0} cy={100} rx={110} ry={16} fill="#000" opacity={0.15} />
      <circle r={115} fill={P.yellow} />
      {[0, 72, 144, 216, 288].map((a) => <path key={a} d="M 0 -30 L 28 -9 L 18 25 L -18 25 L -28 -9 Z" fill="#e8a417" transform={`rotate(${a}) translate(0 -72) scale(0.7)`} />)}
      <Face f={f} x={0} y={6} w={120} mood={cycle(['joy', 'happy'], 50, 7)} seed={61} skin={P.yellow} />
    </g>
    <Label f={f} at={t0 + 12} text="Sonne" x={1130} y={700} color={P.orange} point="none" />
  </g>
);

// "... wäre die Erde ein Pfefferkorn. 24 Meter entfernt." — Mia far away, holding a peppercorn
export const PepperPanel: React.FC<{f: number; t0: number; metersAt: number}> = ({f, t0, metersAt}) => {
  const tape = clamp01((f - t0) / 40);
  return (
    <g transform={push(f, t0, 100, 1.0, 1.08, 1200, 640)}>
      <Field f={f} />
      <rect x={0} y={930} width={1180 * tape} height={26} rx={6} fill={P.yellow} />
      {Array.from({length: 12}, (_, i) => i / 11 <= tape && <rect key={i} x={i * 100} y={930} width={4} height={14} fill="#6a4a10" />)}
      <Character f={f} x={1260} y={1000} s={1.9} {...MIA} armAngles={[12, -150]} mood={cycle(['curious', 'joy', 'curious'], 50, 3)} look={{x: 0.5, y: -0.8}}
        rightHand={<g><circle cx={0} cy={-26} r={9} fill="#2a1a14" /><circle cx={-3} cy={-29} r={3} fill="#fff" opacity={0.6} /></g>} />
      <Label f={f} at={t0 + 18} text="Erde" x={1500} y={560} color={P.blue} point="left" />
      <BigNumber f={f} at={metersAt} value="24 m" x={620} y={760} color={P.yellow} size={150} />
    </g>
  );
};

// "Es ist wie ein Brief ..." — a glowing letter floats down from the sun into Mia's hands
export const LetterPanel: React.FC<{f: number; t0: number; letterAt: number; end: number}> = ({f, t0, letterAt, end}) => {
  const k = smooth(clamp01((f - letterAt) / Math.max(1, end - letterAt - 20)));
  const ex = lerp(330, 1080, k) + Math.sin(f * 0.1) * 20 * (1 - k);
  const ey = lerp(240, 600, k);
  const caught = k > 0.97;
  return (
    <g transform={push(f, t0, 150, 1.0, 1.05, 1000, 640)}>
      <SunnySky f={f} sun={{x: 330, y: 220, r: 90}} />
      <Hill y={720} />
      <Bench x={760} y={980} w={440} />
      <Character f={f} x={700} y={960} s={1.5} {...PAPA} sit mood={cycle(['happy', 'curious'], 70, 3)} look={{x: 0.9, y: -0.6}} />
      <Character f={f} x={1080} y={1010} s={1.6} {...MIA} arms={caught ? 'hold' : 'up'} mood={caught ? 'joy' : cycle(['curious', 'happy'], 40, 2)} look={{x: -0.4, y: -1}} />
      {f >= letterAt && (
        <g transform={`translate(${ex} ${ey}) rotate(${Math.sin(f * 0.1) * 10 * (1 - k)}) scale(${1.4})`}>
          <circle r={70} fill="#fff3c0" opacity={0.35} />
          <rect x={-48} y={-32} width={96} height={64} rx={8} fill="#fff8e6" />
          <path d="M -48 -32 L 0 8 L 48 -32" fill="none" stroke="#e3b25a" strokeWidth={4} />
          <circle cx={0} cy={6} r={10} fill={P.red} />
        </g>
      )}
    </g>
  );
};

// the city at zero: Mia, dad and the dog walking home; at "auf einen Schlag" it is night
export const CityPanel: React.FC<{f: number; t0: number; schlag: number; lampsAt: number; starsAt: number; city: (f: number, cam: {x: number; y: number; z: number}, night: number) => React.ReactNode}> = ({f, t0, schlag, lampsAt, starsAt, city}) => {
  const night = f >= schlag ? 1 : 0;
  const walking = f < schlag;
  const pan = Math.min(f, schlag) - t0;
  const cam = {x: 900 + pan * 1.4, y: 640, z: 1.05};
  const shocked = f >= schlag && f < schlag + 45;
  const looking = f >= starsAt;
  const moodPapa = shocked ? 'shocked' : looking ? 'curious' : night ? 'worried' : cycle(['happy', 'joy'], 60, 1);
  const moodMia = shocked ? 'shocked' : looking ? 'joy' : night ? 'worried' : cycle(['joy', 'happy'], 50, 2);
  const look = looking ? {x: 0.2, y: -1} : shocked ? {x: 0, y: 0} : {x: 0.8, y: 0};
  return (
    <g>
      {city(f, cam, night)}
      <rect x={0} y={980} width={SW} height={100} fill={night ? '#3a3f5c' : '#b8bfd8'} />
      <g filter={night ? 'url(#kitNight)' : undefined}>
        <Character f={f} x={780} y={1060} s={1.7} {...PAPA} walk={walking ? 1 : 0} mood={moodPapa} look={look} talk={walking && Math.floor(f / 45) % 2 === 0} />
        <Character f={f} x={1010} y={1060} s={1.25} {...MIA} walk={walking ? 1 : 0} arms={looking ? 'raise' : 'down'} mood={moodMia} look={look} talk={walking && Math.floor(f / 45) % 2 === 1} />
        <g transform="translate(1240 1065) scale(1.8)"><Dog f={walking ? f : f * 0.2} x={0} y={0} /></g>
      </g>
      {f >= schlag && f < schlag + 6 && <rect width={SW} height={SH} fill="#000" opacity={1 - (f - schlag) / 6} />}
    </g>
  );
};

// "Wer in dieser Nacht ein Teleskop hat ..." — Mia at a telescope, dad pointing at Saturn
export const TelescopePanel: React.FC<{f: number; t0: number}> = ({f, t0}) => (
  <g transform={push(f, t0, 120, 1.0, 1.06, 1000, 600)}>
    <rect width={SW} height={SH} fill="url(#nightSky2)" />
    <g>{Array.from({length: 120}, (_, i) => <circle key={i} cx={rnd(i) * SW} cy={rnd(i + 9) * 700} r={1 + rnd(i + 4) * 2.2} fill="#fff" opacity={0.4 + 0.5 * Math.sin(f * 0.07 + i)} />)}</g>
    <circle cx={1500} cy={230} r={40} fill="#ffe39a" opacity={0.25} />
    <circle cx={1500} cy={230} r={12} fill="#ffe39a" />
    <Label f={f} at={t0 + 15} text="Saturn" x={1500} y={310} color={P.orange} point="none" size={36} />
    <path d="M -100 900 Q 700 820 1400 880 T 2100 860 L 2100 1200 L -100 1200 Z" fill="#141a4a" />
    {/* telescope on its tripod */}
    <g transform="translate(980 900)">
      <path d="M 0 -170 L -70 0 M 0 -170 L 70 0 M 0 -170 L 0 0" stroke="#5a6aa0" strokeWidth={12} strokeLinecap="round" />
      <g transform="rotate(-32 0 -170)">
        <rect x={-30} y={-205} width={260} height={70} rx={20} fill="#d6dbe8" />
        <rect x={190} y={-215} width={60} height={90} rx={16} fill="#9fb0d8" />
        <rect x={-58} y={-188} width={34} height={36} rx={10} fill="#5a6aa0" />
      </g>
    </g>
    <g filter="url(#kitCold)">
      <Character f={f} x={860} y={980} s={1.3} {...MIA} armAngles={[60, -60]} mood={cycle(['curious', 'joy', 'curious'], 55, 2)} look={{x: 1, y: -0.5}} />
      <Character f={f} x={600} y={990} s={1.7} {...PAPA} arms="raise" mood={cycle(['happy', 'curious'], 60, 3)} look={{x: 1, y: -1}} talk={Math.floor(f / 40) % 2 === 0} />
    </g>
  </g>
);

// "Fast alles, was du isst, war irgendwann einmal Sonnenlicht." — sunlight flows into their food
export const FoodPanel: React.FC<{f: number; t0: number}> = ({f, t0}) => (
  <PicnicPanel f={f} t0={t0}>
    {[{x: 640, y: 420, c: '#d89a4a', n: 'Brot'}, {x: 960, y: 360, c: P.red, n: 'Obst'}, {x: 1280, y: 420, c: P.orange, n: 'Gemüse'}].map((it, i) => {
      const s = pop(f, t0 + 30 + i * 18, 14);
      return (
        <g key={i}>
          <line x1={300} y1={200} x2={it.x} y2={it.y} stroke="#ffe39a" strokeWidth={6} strokeDasharray="12 14" strokeDashoffset={-f * 4} opacity={0.8 * s} />
          <g transform={`translate(${it.x} ${it.y + Math.sin(f * 0.08 + i) * 8}) scale(${s})`}>
            <circle r={70} fill="#fff" />
            {i === 0 && <g><ellipse cx={0} cy={0} rx={48} ry={30} fill={it.c} /><path d="M -26 -12 q 12 -10 22 0 M 4 -16 q 12 -10 22 0" stroke="#a86a2a" strokeWidth={5} fill="none" /></g>}
            {i === 1 && <g><circle cx={0} cy={4} r={36} fill={it.c} /><path d="M 0 -32 q 4 -16 14 -20" stroke="#5a3a2a" strokeWidth={5} fill="none" /><ellipse cx={18} cy={-46} rx={14} ry={7} fill={P.green} /></g>}
            {i === 2 && <g><path d="M -16 -30 L 16 -30 L 0 44 Z" fill={it.c} /><path d="M -8 -30 l -12 -22 M 0 -30 l 0 -26 M 8 -30 l 12 -22" stroke={P.green} strokeWidth={7} /></g>}
            <text y={108} textAnchor="middle" fontFamily={kitFont} fontWeight={600} fontSize={38} fill="#fff" style={{paintOrder: 'stroke', stroke: P.indigo, strokeWidth: 8}}>{it.n}</text>
          </g>
        </g>
      );
    })}
  </PicnicPanel>
);

// "Und jetzt schau auf die Uhr. Drei. Zwei. Eins." — both look up at the clock; then darkness
export const FinalPanel: React.FC<{f: number; t0: number; dark: number; remaining: (f: number) => number}> = ({f, t0, dark, remaining}) => {
  const r = remaining(f);
  const after = f >= dark;
  const big = !after && r < 3;
  return (
    <PicnicPanel f={f} t0={t0} dark={after ? 1 : 0} lookAt={after ? {x: 0, y: 0.2} : {x: 1, y: -1}}
      moodPapa={after ? cycle(['shocked', 'sad'], 50, 1) : 'curious'} moodMia={after ? cycle(['shocked', 'worried', 'sad'], 40, 2) : r < 3 ? 'worried' : 'curious'}>
      {big && (
        <text x={960} y={520} textAnchor="middle" fontFamily={kitFont} fontWeight={700} fontSize={340} fill="#fff"
          transform={`translate(960 400) scale(${1 + 0.25 * (1 - (r % 1))}) translate(-960 -400)`}
          style={{paintOrder: 'stroke', stroke: P.indigo, strokeWidth: 22, strokeLinejoin: 'round'}}>{Math.ceil(r)}</text>
      )}
    </PicnicPanel>
  );
};

// "Zum Glück ist die Sonne noch da." — the three of them on a hill at sunrise
export const SunrisePanel: React.FC<{f: number; t0: number; end: number; cheerAt: number}> = ({f, t0, end, cheerAt}) => {
  const k = clamp01((f - t0) / (end - t0));
  const sy = lerp(900, 560, Math.sqrt(k));
  const cheer = f >= cheerAt;
  return (
    <g transform={push(f, t0, end - t0, 1.08, 1.0, 960, 600)}>
      <rect width={SW} height={SH} fill="url(#sunrise)" />
      <rect width={SW} height={SH} fill={P.night} opacity={0.6 * (1 - clamp01((f - t0) / 90))} />
      <circle cx={1320} cy={sy} r={420} fill="url(#skySun)" />
      <circle cx={1320} cy={sy} r={130} fill="#fff1b0" />
      <Face f={f} x={1320} y={sy + 8} w={140} mood={cycle(['happy', 'joy'], 70, 5)} seed={13} skin="#fff1b0" />
      <path d="M -100 860 Q 500 760 1100 840 T 2100 800 L 2100 1200 L -100 1200 Z" fill="#7a3a5a" />
      <path d="M -100 960 Q 400 860 900 930 T 2100 960 L 2100 1200 L -100 1200 Z" fill="#4a2448" />
      <g filter="url(#kitWarm)">
        <Character f={f} x={540} y={960} s={1.7} {...PAPA} mood={cycle(['happy', 'joy'], 60, 2)} look={{x: 1, y: -0.4}} arms={cheer ? 'wave' : 'down'} />
        <Character f={f} x={760} y={975} s={1.3} {...MIA} mood={cheer ? 'joy' : cycle(['happy', 'joy'], 50, 3)} look={{x: 1, y: -0.5}} arms={cheer ? 'cheer' : 'down'} />
        <g transform="translate(940 985) scale(1.8)"><Dog f={f} x={0} y={0} /></g>
      </g>
    </g>
  );
};
