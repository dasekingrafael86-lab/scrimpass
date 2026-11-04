// Part 3: who survives, the frozen earth, the ending (lines s1 .. e6)
import React from 'react';
import {Character, Face, Glow, MIA, P, PAPA, kitFont, rnd} from '../../design/kit';
import type {SceneProps} from '../../design/wordflash';
import {BG, Dog, Earth, Park, Stars, Sun, Text, Tree, lin, mixC} from './common';

const Deep: React.FC<{top?: string}> = ({top = '#0a2a6a'}) => (
  <>
    <defs><linearGradient id={`deep${top.slice(1)}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={top} /><stop offset="1" stopColor="#02040c" /></linearGradient></defs>
    <BG c={`url(#deep${top.slice(1)})`} />
  </>
);
const Bubbles: React.FC<{f: number; n?: number; seed?: number}> = ({f, n = 20, seed = 0}) => (
  <g>{Array.from({length: n}, (_, i) => {
    const y = 1100 - ((rnd(i + seed) * 1200 + f * (1 + rnd(i * 3 + seed) * 2)) % 1200);
    return <circle key={i} cx={rnd(i * 7 + seed) * 1920 + Math.sin(f * 0.05 + i) * 10} cy={y} r={4 + rnd(i * 5) * 6} fill="none" stroke={P.sky} strokeWidth={2} opacity={0.4} />;
  })}</g>
);

// a black smoker chimney with a warm glow
const Vent: React.FC<{f: number; x: number; y: number; s?: number}> = ({f, x, y, s = 1}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    {[0, 1, 2, 3].map((k) => {
      const t = ((f * 0.012 + k * 0.25) % 1);
      return <circle key={k} cx={Math.sin(t * 6 + k) * 30} cy={-420 - t * 500} r={50 + t * 90} fill="#1a1a22" opacity={0.8 * (1 - t)} />;
    })}
    <Glow cx={0} cy={-300} r={220} color={P.orange} o={0.6 + 0.1 * Math.sin(f * 0.15)} />
    <path d="M -130 0 L -60 -400 L 60 -400 L 130 0 Z" fill="#3a2a2a" />
    <path d="M -60 -400 L 60 -400 L 40 -360 L -40 -360 Z" fill={P.orange} />
    {[-80, 0, 80].map((dx) => <path key={dx} d={`M ${dx} -80 l 20 -80`} stroke={P.orange} strokeWidth={6} opacity={0.5} />)}
  </g>
);

const Crab: React.FC<{f: number; x: number; y: number; s?: number; mood?: any; dance?: boolean}> = ({f, x, y, s = 1, mood = 'happy', dance}) => {
  const b = dance ? Math.abs(Math.sin(f * 0.25)) * 20 : 0;
  const claw = dance ? Math.sin(f * 0.25) * 20 : 0;
  return (
    <g transform={`translate(${x} ${y - b}) scale(${s})`}>
      {[-1, 1].map((sd) => [0, 1, 2].map((k) => <path key={`${sd}${k}`} d={`M ${sd * 60} ${-30 + k * 14} l ${sd * 50} ${10 + k * 6} l ${sd * 10} 30`} stroke="#e85a4a" strokeWidth={10} fill="none" strokeLinecap="round" />))}
      {[-1, 1].map((sd) => (
        <g key={sd} transform={`rotate(${sd * claw} ${sd * 70} -60)`}>
          <path d={`M ${sd * 60} -60 L ${sd * 110} -120`} stroke="#e85a4a" strokeWidth={14} strokeLinecap="round" />
          <circle cx={sd * 120} cy={-134} r={28} fill="#ff6a5a" />
          <path d={`M ${sd * 120} -134 l ${sd * 26} -10`} stroke="#02040c" strokeWidth={6} />
        </g>
      ))}
      <ellipse cx={0} cy={-40} rx={80} ry={50} fill="#ff6a5a" />
      <Face f={f} x={0} y={-44} w={60} mood={mood} seed={81} skin="#ff6a5a" />
    </g>
  );
};

export const Descent: React.FC<SceneProps> = ({f, at}) => {
  const yes = lin(f, at('Ja') - 4, at('Ja') + 30, 0, 1);
  return (
    <g>
      <Deep />
      <Bubbles f={f} />
      {[0, 1, 2].map((i) => <path key={i} d={`M ${300 + i * 600} -400 L ${500 + i * 600} 1500 L ${700 + i * 600} 1500 L ${400 + i * 600} -400 Z`} fill={P.sky} opacity={0.05 * (1 - yes)} />)}
      <Vent f={f} x={960} y={1300} s={0.9 * yes + 0.3} />
      <Text x={960} y={300} size={80} color={P.cream} o={1 - yes}>?</Text>
    </g>
  );
};

export const VentHeat: React.FC<SceneProps> = ({f}) => (
  <g>
    <Deep top="#06163a" />
    <rect x={-400} y={880} width={2720} height={700} fill="#2a1a1a" />
    <rect x={-400} y={1000} width={2720} height={600} fill="#8a2a1a" />
    {Array.from({length: 6}, (_, i) => {
      const t = ((f * 0.02 + i * 0.17) % 1);
      return <path key={i} d={`M ${760 + (i % 3) * 200} ${1100 - t * 300} l 0 -60`} stroke={P.orange} strokeWidth={14} strokeLinecap="round" opacity={Math.sin(t * Math.PI)} />;
    })}
    <Vent f={f} x={960} y={900} />
    <g opacity={0.6}>
      <circle cx={1650} cy={200} r={60} fill="none" stroke={P.lilac} strokeWidth={6} strokeDasharray="12 14" />
      <path d="M 1600 150 L 1700 250" stroke={P.red} strokeWidth={10} strokeLinecap="round" />
    </g>
  </g>
);

const Worm: React.FC<{f: number; x: number; y: number; h: number; i: number}> = ({f, x, y, h, i}) => (
  <g>
    <rect x={x - 12} y={y - h} width={24} height={h} rx={12} fill="#f2ece0" />
    <path d={`M ${x - 16} ${y - h} q 16 ${-40 + Math.sin(f * 0.1 + i) * 8} 32 0`} fill={P.red} />
    <circle cx={x} cy={y - h - 14} r={16 + Math.sin(f * 0.1 + i) * 2} fill={P.red} />
  </g>
);
export const VentLife: React.FC<SceneProps & {crabOnly?: boolean}> = ({f, crabOnly}) => (
  <g>
    <Deep top="#06163a" />
    <Bubbles f={f} n={10} seed={3} />
    <rect x={-400} y={900} width={2720} height={700} fill="#2a1a1a" />
    {!crabOnly && <Vent f={f} x={1500} y={920} s={0.8} />}
    {!crabOnly && Array.from({length: 9}, (_, i) => <Worm key={i} f={f} x={300 + i * 70} y={920} h={160 + (i % 3) * 60} i={i} />)}
    {!crabOnly && Array.from({length: 40}, (_, i) => <circle key={i} cx={-100 + rnd(i) * 2100} cy={915 + rnd(i * 3) * 10} r={6} fill={P.white} opacity={0.7} />)}
    {!crabOnly && [[1000, 930], [1100, 935], [1180, 928]].map(([x, y], i) => <g key={i}><ellipse cx={x} cy={y} rx={40} ry={20} fill="#3a3a6a" /><Face f={f} x={x} y={y} w={30} mood="sleepy" seed={82 + i} skin="#3a3a6a" /></g>)}
    <Crab f={f} x={crabOnly ? 960 : 1150} y={crabOnly ? 920 : 900} s={crabOnly ? 2.2 : 1} mood={crabOnly ? 'joy' : 'happy'} dance={crabOnly} />
    {crabOnly && <Glow cx={960} cy={700} r={500} color={P.orange} o={0.25} />}
  </g>
);

export const Oxygen: React.FC<SceneProps> = ({f}) => (
  <g>
    <Deep top="#2a5aaa" />
    <rect x={-400} y={-400} width={2720} height={480} fill={P.night} />
    <rect x={-400} y={80} width={2720} height={30} fill="#e6f0ff" />
    {Array.from({length: 7}, (_, i) => (
      <g key={i}><ellipse cx={200 + i * 260} cy={140} rx={40} ry={18} fill="#4a8a5a" /><Face f={f} x={200 + i * 260} y={140} w={26} mood="sad" seed={85 + i} skin="#4a8a5a" /></g>
    ))}
    {Array.from({length: 16}, (_, i) => {
      const t = ((f * 0.008 + rnd(i)) % 1);
      const x = rnd(i * 5) * 1920;
      return <g key={i} opacity={Math.sin(t * Math.PI)}><circle cx={x} cy={180 + t * 760} r={22} fill="none" stroke={P.sky} strokeWidth={4} /><text x={x} y={190 + t * 760} textAnchor="middle" fontFamily={kitFont} fontWeight={700} fontSize={20} fill={P.sky}>O₂</text></g>;
    })}
    <rect x={-400} y={940} width={2720} height={600} fill="#2a1a1a" />
    {Array.from({length: 6}, (_, i) => <Worm key={i} f={f} x={500 + i * 80} y={960} h={140 + (i % 2) * 50} i={i} />)}
    <Crab f={f} x={1300} y={950} mood="curious" />
  </g>
);

export const Bacteria: React.FC<SceneProps> = ({f}) => (
  <g>
    <BG c="#0a1a2a" />
    <circle cx={960} cy={540} r={480} fill="#12324a" />
    {Array.from({length: 11}, (_, i) => {
      const x = 960 + Math.cos(i * 2.4) * (120 + (i % 4) * 90) + Math.sin(f * 0.03 + i) * 14;
      const y = 540 + Math.sin(i * 2.4) * (100 + (i % 4) * 70) + Math.cos(f * 0.03 + i) * 14;
      const c = [P.green, P.teal, P.lilac][i % 3];
      return <g key={i}><ellipse cx={x} cy={y} rx={70} ry={42} fill={c} transform={`rotate(${i * 33} ${x} ${y})`} /><Face f={f} x={x} y={y} w={44} mood="joy" seed={90 + i} skin={c} /></g>;
    })}
    <circle cx={960} cy={540} r={480} fill="none" stroke={P.cream} strokeWidth={14} opacity={0.4} />
  </g>
);

export const Sub1977: React.FC<SceneProps> = ({f, at}) => (
  <g>
    <Deep top="#06163a" />
    <rect x={-400} y={900} width={2720} height={700} fill="#2a1a1a" />
    <Vent f={f} x={1500} y={920} s={0.8} />
    <g transform={`translate(${lin(f, 0, 80, 200, 600)} ${420 + Math.sin(f * 0.05) * 12})`}>
      <path d="M 120 20 L 900 -120 L 900 220 Z" fill={P.yellow} opacity={0.12} />
      <ellipse cx={0} cy={0} rx={180} ry={110} fill={P.cream} />
      <rect x={-60} y={-150} width={120} height={60} rx={20} fill={P.cream} />
      <circle cx={90} cy={10} r={40} fill={P.sky} />
      <circle cx={90} cy={10} r={40} fill="none" stroke={P.ink} strokeWidth={8} />
      <rect x={-200} y={-20} width={30} height={40} rx={8} fill={P.red} />
      <Face f={f} x={-40} y={0} w={70} mood="shocked" seed={95} skin={P.cream} />
    </g>
    <Text x={960} y={200} size={110} color={P.yellow} o={lin(f, at('1977') - 4, at('1977') + 6, 0, 1)}>1977</Text>
  </g>
);

export const EarthHeat: React.FC<SceneProps & {bars?: boolean}> = ({f, at, bars}) => (
  <g>
    <BG c={P.night} />
    <Stars f={f} n={160} seed={96} />
    <g transform={`translate(${bars ? 640 : 960} 560)`}>
      <circle r={380} fill="#4a5a8a" />
      <path d="M 0 0 L 380 0 A 380 380 0 0 1 0 380 Z" fill="#8a3a1a" />
      <path d="M 0 0 L 250 0 A 250 250 0 0 1 0 250 Z" fill={P.orange} />
      <path d="M 0 0 L 120 0 A 120 120 0 0 1 0 120 Z" fill={P.yellow} />
      {Array.from({length: 8}, (_, i) => {
        const a = -Math.PI / 2 - Math.PI * 0.6 + i * 0.32;
        const t = ((f * 0.02 + i * 0.13) % 1);
        const r0 = 390 + t * 140;
        return <path key={i} d={`M ${Math.cos(a) * r0} ${Math.sin(a) * r0} l ${Math.cos(a) * 50} ${Math.sin(a) * 50}`} stroke={P.red} strokeWidth={14} strokeLinecap="round" opacity={Math.sin(t * Math.PI)} />;
      })}
    </g>
    {bars && (
      <g>
        <rect x={1180} y={900 - 470} width={160} height={470} rx={16} fill={P.red} opacity={lin(f, at('47') - 4, at('47') + 6, 0, 1)} />
        <rect x={1440} y={900 - 190} width={160} height={190} rx={16} fill={P.sky} opacity={lin(f, at('Menschheit') - 4, at('Menschheit') + 6, 0, 1)} />
        <Text x={1260} y={400} size={60} color={P.red} o={lin(f, at('47') - 4, at('47') + 6, 0, 1)}>47 TW</Text>
        <Text x={1520} y={680} size={60} color={P.sky} o={lin(f, at('Menschheit') - 4, at('Menschheit') + 6, 0, 1)}>19 TW</Text>
        <Text x={1260} y={980} size={40} o={lin(f, at('47') - 4, at('47') + 6, 0, 1)}>Erdwärme</Text>
        <Text x={1520} y={980} size={40} o={lin(f, at('Menschheit') - 4, at('Menschheit') + 6, 0, 1)}>Wir alle</Text>
      </g>
    )}
  </g>
);

export const HotSpots: React.FC<SceneProps> = ({f}) => (
  <g>
    <BG c={P.night} />
    <Stars f={f} n={160} seed={97} />
    <Earth f={f} x={960} y={540} r={360} face={false} night={0.85} ice={0.6} />
    {[[780, 300], [1180, 460], [900, 700]].map(([x, y], i) => (
      <g key={i}><Glow cx={x} cy={y} r={70} color={P.orange} o={0.8 + 0.2 * Math.sin(f * 0.15 + i)} /><circle cx={x} cy={y} r={16} fill={P.yellow} /></g>
    ))}
  </g>
);

export const Iceland: React.FC<SceneProps> = ({f}) => (
  <g>
    <BG c={P.night} />
    <Stars f={f} n={160} seed={98} />
    <rect x={-400} y={800} width={2720} height={700} fill="#dfe8ff" />
    <g transform="translate(260 800)">
      <rect x={0} y={-260} width={300} height={260} fill="#4a5a7a" />
      {[0, 1].map((k) => <rect key={k} x={40 + k * 140} y={-420} width={80} height={180} fill="#6a7a9a" />)}
      {[0, 1, 2].map((k) => {
        const t = ((f * 0.01 + k * 0.33) % 1);
        return <circle key={k} cx={80 + k * 70 + Math.sin(t * 6) * 20} cy={-440 - t * 300} r={50 + t * 70} fill={P.white} opacity={0.5 * (1 - t)} />;
      })}
    </g>
    <path d="M 640 660 L 1060 660 L 1060 360 L 850 260 L 640 360 Z" fill="none" />
    <g transform="translate(700 800)">
      <path d="M 0 0 L 0 -340 Q 400 -560 800 -340 L 800 0 Z" fill={P.yellow} opacity={0.25} />
      <path d="M 0 0 L 0 -340 Q 400 -560 800 -340 L 800 0 Z" fill="none" stroke={P.cream} strokeWidth={8} />
      <Glow cx={400} cy={-200} r={300} color={P.yellow} o={0.4} />
      {[100, 260, 560, 700].map((x, i) => (
        <g key={i}><rect x={x - 6} y={-140} width={12} height={140} fill={P.green} /><circle cx={x - 20} cy={-120} r={18} fill={P.red} /><circle cx={x + 20} cy={-80} r={16} fill={P.red} /></g>
      ))}
      <Character f={f} x={360} y={0} s={1.05} {...PAPA} mood="happy" armAngles={[12, -100]} look={{x: 0.8, y: -0.4}} />
      <Character f={f} x={480} y={0} s={0.85} {...MIA} mood="joy" />
    </g>
  </g>
);

export const Bunker: React.FC<SceneProps & {farm?: boolean}> = ({f, at, farm}) => (
  <g>
    <BG c={P.night} />
    <Stars f={f} n={100} h={240} seed={99} />
    <rect x={-400} y={260} width={2720} height={1300} fill="#3a2a2a" />
    <rect x={-400} y={250} width={2720} height={30} fill="#dfe8ff" />
    <rect x={200} y={400} width={1520} height={560} rx={40} fill="#2a2a3a" />
    <rect x={240} y={440} width={700} height={480} rx={24} fill="#3a3a5a" />
    <rect x={980} y={440} width={700} height={480} rx={24} fill="#3a3a5a" />
    {[0, 1, 2].map((i) => <rect key={i} x={300 + i * 210} y={470} width={150} height={20} rx={8} fill={P.magenta} />)}
    <Glow cx={590} cy={560} r={300} color={P.magenta} o={0.4} />
    {Array.from({length: 7}, (_, i) => <g key={i}><rect x={300 + i * 90} y={860} width={60} height={50} fill="#5a3a2a" /><path d={`M ${330 + i * 90} 860 q -20 -40 0 -80 q 20 40 0 80`} fill={P.green} /></g>)}
    {farm ? (
      <g>
        <g transform={`translate(1150 600) rotate(${f * 6})`}>{[0, 1, 2, 3].map((k) => <rect key={k} x={-8} y={-90} width={16} height={90} rx={8} fill={P.sky} transform={`rotate(${k * 90})`} />)}</g>
        <circle cx={1150} cy={600} r={100} fill="none" stroke={P.sky} strokeWidth={8} />
        <rect x={1380} y={680 + lin(f, at('Eis') - 4, at('Eis') + 60, 0, 60)} width={160} height={Math.max(20, 140 - lin(f, at('Eis') - 4, at('Eis') + 60, 0, 60))} rx={10} fill="#cfe8ff" />
        <rect x={1360} y={820} width={200} height={90} rx={10} fill={P.blue} />
        <Character f={f} x={760} y={920} s={0.95} {...PAPA} mood="determined" armAngles={[12, -60]} />
      </g>
    ) : (
      <g>
        <text x={1330} y={640} textAnchor="middle" fontFamily={kitFont} fontWeight={700} fontSize={160} fill={P.yellow}>⚛</text>
        <Glow cx={1330} cy={590} r={160} color={P.yellow} o={0.4} />
        <Character f={f} x={1150} y={920} s={0.95} {...PAPA} mood="worried" />
        <Character f={f} x={1500} y={920} s={0.8} {...MIA} mood="curious" />
      </g>
    )}
  </g>
);

export const AirSnow: React.FC<SceneProps> = ({f}) => (
  <g>
    <BG c="#02040c" />
    <Stars f={f} n={240} seed={100} />
    {[0, 1, 2, 3].map((i) => <rect key={i} x={220 + i * 400} y={560 - (i % 2) * 120} width={260} height={400 + (i % 2) * 120} fill="#2a3a5a" />)}
    {[0, 1, 2, 3].map((i) => <rect key={i} x={210 + i * 400} y={540 - (i % 2) * 120} width={280} height={30} fill="#e6f0ff" />)}
    <rect x={-400} y={940} width={2720} height={600} fill="#cfe0ff" />
    {Array.from({length: 120}, (_, i) => {
      const y = ((rnd(i) * 1100 + f * (1 + rnd(i * 3))) % 1100) - 20;
      return <path key={i} d={`M ${rnd(i * 7) * 1920} ${y} m -8 0 l 16 0 m -8 -8 l 0 16`} stroke={i % 2 ? '#bfe0ff' : '#e0f0ff'} strokeWidth={3} opacity={0.85} />;
    })}
  </g>
);

export const IceBall: React.FC<SceneProps> = ({f}) => (
  <g>
    <BG c={P.night} />
    <Stars f={f} n={260} seed={101} />
    <Earth f={f} x={960} y={540} r={240} face={false} night={0.88} ice={1} lights={0.7} />
  </g>
);

export const Orchard: React.FC<SceneProps> = ({f}) => (
  <Park f={f} sunX={1250} sunY={210}>
    {Array.from({length: 4}, (_, i) => (
      <path key={i} d={`M ${1180 - i * 30} ${280 + i * 30} L ${560 + i * 60} ${560 + i * 30}`} stroke={P.yellow} strokeWidth={24} opacity={0.18 + 0.05 * Math.sin(f * 0.1 + i)} strokeLinecap="round" />
    ))}
    <Tree x={560} y={820} s={1.6} f={f} />
    {[[480, 480], [620, 450], [560, 560], [680, 540]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={22} fill={P.red} />)}
    <Character f={f} x={900} y={930} s={1.15} {...MIA} mood="joy" armAngles={[12, -150]}
      rightHand={<g><circle cx={0} cy={-20} r={28} fill={P.red} /><path d="M 0 -48 l 6 -16" stroke="#5a3a2a" strokeWidth={5} /></g>} />
    <Dog f={f} x={1120} y={960} sit flip />
  </Park>
);

export const Sunset: React.FC<SceneProps> = ({f}) => (
  <g>
    <defs><linearGradient id="sunset2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={P.violet} /><stop offset="0.6" stopColor={P.pink} /><stop offset="1" stopColor={P.orange} /></linearGradient></defs>
    <BG c="url(#sunset2)" />
    <Sun f={f} x={960} y={640} r={180} mood="happy" />
    <path d="M -400 780 Q 300 680 1000 760 Q 1600 820 2300 720 L 2300 1500 L -400 1500 Z" fill="#6a2a7a" />
    <path d="M -400 880 Q 500 800 1100 860 Q 1600 920 2300 860 L 2300 1500 L -400 1500 Z" fill="#4a1a6a" />
    <Character f={f} x={720} y={900} s={1.3} sit {...PAPA} mood="happy" look={{x: 0.6, y: -0.4}} />
    <Character f={f} x={940} y={910} s={1.0} sit {...MIA} mood="joy" look={{x: 0.3, y: -0.5}} />
    <Dog f={f} x={1160} y={920} sit flip mood="happy" />
  </g>
);

export {Sun, Dog, Text, mixC};
