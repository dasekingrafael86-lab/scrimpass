// Chapter 7 life, 8 humans, the ending
import React from 'react';
import {Character, Face, Glow, rnd} from '../../design/kit';
import {ActProps, Banner, N, NeonRing, Vignette, lerp, ramp} from '../../design/flow';
import {Arrow, Burst, Crossers, DU, FlyIn, Lbl, NeonEarth, NeonMoon, NeonSun, Pop, Space, Swarm} from '../stopp/neon';

const PARKA = {skin: N.skin, hair: N.red, hairStyle: 'cap' as const, shirt: N.red, pants: N.navy, seed: 241};
const MINER = {skin: N.skin, hair: N.yellow, hairStyle: 'cap' as const, shirt: N.violet, pants: N.ink, seed: 242};
const WALK_A = {skin: N.skinDark, hair: N.ink, hairStyle: 'curly' as const, shirt: N.orange, pants: N.navy, seed: 243};
const WALK_B = {skin: N.skin, hair: N.yellow, hairStyle: 'pony' as const, shirt: N.magenta, pants: N.ink, seed: 244};

const Plant: React.FC<{f: number; x: number; y: number; droop: number; frost: number; seed: number}> = ({f, x, y, droop, frost, seed}) => {
  const c = frost > 0.5 ? '#bfe0ff' : droop > 0.5 ? '#9aa04a' : N.green;
  const tip = {x: x + droop * 60, y: y - 200 + droop * 90};
  return (
    <g>
      <path d={`M ${x} ${y} Q ${x + droop * 20} ${y - 120} ${tip.x} ${tip.y}`} stroke={c} strokeWidth={12} fill="none" strokeLinecap="round" />
      <ellipse cx={x - 30} cy={y - 90} rx={34} ry={16} fill={c} transform={`rotate(${-30 + droop * 50} ${x - 30} ${y - 90})`} />
      <ellipse cx={x + 30} cy={y - 120} rx={34} ry={16} fill={c} transform={`rotate(${30 + droop * 50} ${x + 30} ${y - 120})`} />
      <circle cx={tip.x} cy={tip.y} r={36} fill={frost > 0.5 ? '#dfeaff' : N.pink} />
      <Face f={f} x={tip.x} y={tip.y + 3} w={34} mood={frost > 0.5 ? 'sleepy' : droop > 0.5 ? 'sad' : 'happy'} seed={seed} skin={frost > 0.5 ? '#dfeaff' : N.pink} />
    </g>
  );
};

// 7a: plants: light but no water on the day side, frozen on the night side
export const Plants: React.FC<ActProps> = ({f, at}) => {
  const dry = ramp(f, at('Wasser') - 10, 40);
  const night = ramp(f, at('Nachtseite') - 10, 20);
  const frost = ramp(f, at('friert') - 4, 30);
  return (
    <g>
      <Space f={f} seed={101} />
      <Pop f={f} at={at('Leben') - 6} x={960} y={100} out={at('Pflanzen')}><Banner x={960} y={100} text="Leben in der neuen Welt" color={N.green} size={54} /></Pop>
      <g transform={`translate(${-lerp(0, 960, night)} 0)`}>
        <rect x={-400} y={-400} width={1360} height={1880} fill="#ff8a4a" opacity={0.85} />
        <NeonSun f={f} x={480} y={220} r={110} mood="determined" />
        <rect x={-400} y={820} width={1360} height={600} fill="#c86a2a" />
        {[200, 480, 760].map((x, i) => <g key={i} transform={`translate(${x} 830) scale(1.6) translate(${-x} -830)`}><Plant f={f} x={x} y={830} droop={dry} frost={0} seed={250 + i} /></g>)}
        {dry > 0.2 && Array.from({length: 6}, (_, i) => <circle key={i} cx={200 + i * 100} cy={700 - ((f * 3 + i * 40) % 300)} r={8} fill={N.cyan} opacity={0.6 * (1 - ((f * 3 + i * 40) % 300) / 300)} />)}
        <Banner x={480} y={1000} text="Licht im Überfluss – kaum Wasser" color={N.orange} size={40} show={ramp(f, at('Überfluss') - 6, 12)} />
        <rect x={960} y={-400} width={1360} height={1880} fill={N.deep} />
        {Array.from({length: 40}, (_, i) => <circle key={i} cx={960 + rnd(i) * 1360} cy={rnd(i * 3) * 700} r={3} fill={N.cream} opacity={0.6} />)}
        <rect x={960} y={820} width={1360} height={600} fill="#cfe0ff" />
        {[1160, 1440, 1720].map((x, i) => <g key={i} transform={`translate(${x} 830) scale(1.6) translate(${-x} -830)`}><Plant f={f} x={x} y={830} droop={0.3} frost={frost} seed={260 + i} /></g>)}
        <Banner x={1440} y={1000} text="½ Jahr keine Photosynthese" color={N.blue} size={40} show={ramp(f, at('Photosynthese') - 6, 12)} />
      </g>
    </g>
  );
};

// 7b: the inner clock of animals no longer fits
export const InnerClock: React.FC<ActProps> = ({f, at}) => {
  const off = ramp(f, at('passen') - 10, 20);
  return (
    <g>
      <Space f={f} seed={103} />
      <g transform="translate(760 640)">
        <ellipse cx={0} cy={0} rx={150} ry={100} fill={N.orange} />
        <circle cx={130} cy={-90} r={70} fill={N.orange} />
        <path d="M 190 -90 L 250 -76 L 190 -66 Z" fill={N.yellow} />
        <path d={`M -60 -20 Q -200 ${-120 + Math.sin(f * 0.3) * 40} -160 40`} fill={N.pink} />
        <Face f={f} x={140} y={-92} w={66} mood={off > 0.5 ? 'shocked' : 'happy'} seed={270} skin={N.orange} />
        <rect x={-40} y={90} width={12} height={70} fill={N.yellow} /><rect x={30} y={90} width={12} height={70} fill={N.yellow} />
      </g>
      <g transform="translate(1260 380)">
        <circle r={160} fill={N.ink} stroke={N.cream} strokeWidth={10} />
        {Array.from({length: 12}, (_, i) => <line key={i} x1={Math.cos((i / 12) * Math.PI * 2) * 130} y1={Math.sin((i / 12) * Math.PI * 2) * 130} x2={Math.cos((i / 12) * Math.PI * 2) * 145} y2={Math.sin((i / 12) * Math.PI * 2) * 145} stroke={N.cream} strokeWidth={6} />)}
        <line x1={0} y1={0} x2={90 * Math.sin(f * (0.05 + off * 0.6))} y2={-90 * Math.cos(f * (0.05 + off * 0.6))} stroke={N.yellow} strokeWidth={12} strokeLinecap="round" />
        <line x1={0} y1={0} x2={60 * Math.sin(f * 0.01)} y2={-60 * Math.cos(f * 0.01)} stroke={N.cream} strokeWidth={14} strokeLinecap="round" />
        <Lbl x={0} y={230} size={56} color={off > 0.5 ? N.red : N.cyan}>{off > 0.5 ? '24 h ≠ 1 Jahr' : 'innere Uhr: 24 h'}</Lbl>
      </g>
      <path d="M 900 520 Q 1050 440 1110 420" stroke={N.cream} strokeWidth={4} strokeDasharray="10 10" fill="none" opacity={0.6} />
    </g>
  );
};

// 7c: who can wander follows the twilight: birds, herds, people
export const Migration: React.FC<ActProps> = ({f, at}) => {
  const people = ramp(f, at('Menschen') - 6, 14);
  return (
    <g>
      <defs><linearGradient id="mg7" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#ffb05a" /><stop offset="0.5" stopColor="#ff5f8a" /><stop offset="1" stopColor={N.deep} /></linearGradient></defs>
      <rect x={-400} y={-400} width={2720} height={1880} fill="url(#mg7)" />
      <circle cx={420} cy={700} r={120} fill={N.yellow} />
      <Glow cx={420} cy={700} r={280} color={N.orange} o={0.6} />
      <rect x={-400} y={760} width={2720} height={700} fill="#3a1a5a" />
      <FlyIn f={f} at={at('Zugvögel') - 6} from="l" dist={1200}>
        {Array.from({length: 9}, (_, i) => {
          const x = 600 + ((i * 120 + f * 2) % 1200); const y = 260 + Math.abs(i - 4) * 30;
          const w = Math.sin(f * 0.35 + i) * 14;
          return <path key={i} d={`M ${x - 26} ${y - w} Q ${x - 12} ${y - 6} ${x} ${y} Q ${x + 12} ${y - 6} ${x + 26} ${y - w}`} stroke={N.ink} strokeWidth={6} fill="none" strokeLinecap="round" />;
        })}
      </FlyIn>
      <FlyIn f={f} at={at('Herden') - 6} from="l" dist={1400}>
        {Array.from({length: 7}, (_, i) => {
          const x = 400 + i * 150 + ((f * 1.5) % 150); const b = Math.abs(Math.sin(f * 0.3 + i)) * 8;
          return (
            <g key={i} transform={`translate(${x} ${830 - b})`}>
              <ellipse cx={0} cy={-40} rx={50} ry={26} fill="#8a5a3a" />
              <circle cx={50} cy={-60} r={20} fill="#8a5a3a" />
              {[-30, -10, 14, 34].map((lx) => <rect key={lx} x={lx - 5} y={-30} width={10} height={34} rx={5} fill="#5a3a26" />)}
            </g>
          );
        })}
      </FlyIn>
      <g opacity={people}>
        <Character f={f} x={1300} y={980} s={1.2} {...DU} mood="determined" walk={1} />
        <Character f={f} x={1460} y={985} s={1.1} {...WALK_A} mood="happy" walk={1} />
        <Character f={f} x={1600} y={990} s={1.0} {...WALK_B} mood="curious" walk={1} />
      </g>
      <Pop f={f} at={at('wandern') - 6} x={960} y={110}><Banner x={960} y={110} text="mit der Dämmerung ziehen" color={N.magenta} size={52} /></Pop>
    </g>
  );
};

// 7d: deep in the new polar seas, life that never saw the sun
export const DeepSea: React.FC<ActProps> = ({f, at}) => (
  <g>
    <defs><linearGradient id="ds7" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0a2a6a" /><stop offset="1" stopColor="#02040c" /></linearGradient></defs>
    <rect x={-400} y={-400} width={2720} height={1880} fill="url(#ds7)" />
    {Array.from({length: 24}, (_, i) => <circle key={i} cx={rnd(i) * 1920} cy={1100 - ((rnd(i * 3) * 1200 + f * 2) % 1200)} r={4 + rnd(i * 5) * 6} fill="none" stroke={N.cyan} strokeWidth={2} opacity={0.4} />)}
    {[[500, 420, N.magenta], [1300, 360, N.cyan], [900, 640, N.violet]].map(([x, y, c], i) => (
      <g key={i} transform={`translate(${(x as number) + Math.sin(f * 0.02 + i) * 40} ${(y as number) + Math.sin(f * 0.04 + i) * 30})`}>
        <Glow cx={0} cy={0} r={120} color={c as string} o={0.6} />
        <path d="M -70 0 Q -70 -70 0 -70 Q 70 -70 70 0 Z" fill={c as string} opacity={0.85} />
        {[-50, -25, 0, 25, 50].map((tx) => <path key={tx} d={`M ${tx} 0 q ${Math.sin(f * 0.1 + tx) * 14} 50 0 110`} stroke={c as string} strokeWidth={6} fill="none" opacity={0.7} />)}
        <Face f={f} x={0} y={-30} w={50} mood="happy" seed={280 + i} skin={c as string} />
      </g>
    ))}
    <rect x={-400} y={940} width={2720} height={600} fill="#1a1226" />
    <Glow cx={1600} cy={900} r={200} color={N.orange} o={0.6} />
    <path d="M 1530 1000 L 1570 820 L 1630 820 L 1670 1000 Z" fill="#3a2a2a" />
    <Pop f={f} at={at('Sonne') - 8} x={960} y={110}><Banner x={960} y={110} text="nie die Sonne gesehen" color={N.violet} size={54} /></Pop>
  </g>
);

// 8a: the first seconds: near the poles; then safest underground
export const Refuge: React.FC<ActProps> = ({f, at}) => {
  const under = ramp(f, at('Bergwerken') - 6, 20);
  const shield = ramp(f, at('geschützt') - 4, 12);
  return (
    <g>
      <Space f={f} seed={105} />
      <g opacity={1 - under}>
        <NeonEarth f={f} x={960} y={600} r={380} id="c8g" face={false} />
        <Glow cx={960} cy={230} r={160} color={N.cyan} o={0.8} />
        <Pop f={f} at={at('Pole') - 6} x={960} y={230}>
          <Character f={f} x={920} y={250} s={0.6} {...PARKA} mood="worried" />
          <Character f={f} x={1010} y={256} s={0.55} {...PARKA} shirt={N.orange} seed={245} mood="curious" />
        </Pop>
        <FlyIn f={f} at={at('Pole') - 6} from="r" dist={900}><Banner x={1460} y={180} text="Ruck am kleinsten" color={N.cyan} size={46} /></FlyIn>
      </g>
      <g opacity={under}>
        <rect x={-400} y={300} width={2720} height={1200} fill="#3a2230" />
        <rect x={-400} y={290} width={2720} height={20} fill={N.green} />
        <Crossers f={f} n={20} speed={30} color={N.cyan} y0={0} y1={280} seed={11} size={8} />
        <FlyIn f={f} at={at('Bergwerken') - 6} from="l" dist={1100}>
          <Vignette f={f} x={560} y={680} r={250} id="c8a">
            <rect x={310} y={430} width={500} height={500} fill="#4a2a3a" />
            {[0, 1, 2].map((i) => <g key={i}><rect x={360 + i * 150} y={560} width={16} height={200} fill="#8a5a3a" /><circle cx={368 + i * 150} cy={580} r={14} fill={N.yellow} /><Glow cx={368 + i * 150} cy={580} r={60} color={N.yellow} o={0.6} /></g>)}
            <Character f={f} x={560} y={780} s={0.75} {...MINER} mood="determined" />
          </Vignette>
        </FlyIn>
        <FlyIn f={f} at={at('Bunkern') - 6} from="r" dist={1100}>
          <Vignette f={f} x={1360} y={680} r={250} id="c8b">
            <rect x={1110} y={430} width={500} height={500} fill="#202a4a" />
            {[0, 1, 2].map((i) => <rect key={i} x={1180 + i * 130} y={500} width={100} height={16} rx={6} fill={N.magenta} />)}
            <Glow cx={1360} cy={560} r={180} color={N.magenta} o={0.4} />
            {Array.from({length: 6}, (_, i) => <path key={i} d={`M ${1180 + i * 70} 800 q -14 -34 0 -60 q 14 26 0 60`} fill={N.green} />)}
            <Character f={f} x={1440} y={810} s={0.7} {...DU} mood="happy" />
          </Vignette>
        </FlyIn>
        {[560, 1360].map((x) => (
          <g key={x} opacity={shield}>
            <path d={`M ${x} 410 L ${x + 240} 520 L ${x + 240} 840 L ${x} 950 L ${x - 240} 840 L ${x - 240} 520 Z`} fill="none" stroke={N.cyan} strokeWidth={10} />
          </g>
        ))}
        <Pop f={f} at={at('geschützt') - 4} x={960} y={130}><Banner x={960} y={130} text="Sturm · Hitze · Kälte · Strahlung" color={N.blue} size={42} /></Pop>
      </g>
    </g>
  );
};

// 8b: nomads behind the sunset
export const Nomads: React.FC<ActProps> = ({f, at}) => (
  <g>
    <defs><linearGradient id="nm8" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#ffb05a" /><stop offset="0.5" stopColor="#ff5f8a" /><stop offset="1" stopColor={N.deep} /></linearGradient></defs>
    <rect x={-400} y={-400} width={2720} height={1880} fill="url(#nm8)" />
    <circle cx={600 + f * 0.4} cy={700} r={110} fill={N.yellow} />
    <Glow cx={600 + f * 0.4} cy={700} r={260} color={N.orange} o={0.6} />
    <rect x={-400} y={760} width={2720} height={700} fill="#3a1a5a" />
    {Array.from({length: 12}, (_, i) => <rect key={i} x={((i * 200 - f * 4) % 2400 + 2400) % 2400 - 200} y={800} width={90} height={12} rx={6} fill={N.pink} opacity={0.5} />)}
    {[DU, WALK_A, WALK_B].map((c, i) => <Character key={i} f={f} x={900 + i * 170} y={980 + i * 4} s={1.2 - i * 0.08} {...c} mood="determined" walk={1} />)}
    <g transform="translate(1500 930)"><rect x={-6} y={-200} width={12} height={200} fill={N.ink} /><rect x={-110} y={-260} width={220} height={80} rx={14} fill={N.cream} /><Lbl x={0} y={-206} size={46} color={N.ink}>5 km/h</Lbl></g>
    <Pop f={f} at={at('Nomaden') - 6} x={760} y={140}><Banner x={760} y={140} text="Nomaden der Dämmerung" color={N.magenta} size={54} /></Pop>
  </g>
);

// ending a: nothing can brake the planet
export const NoBrake: React.FC<ActProps> = ({f, at}) => {
  const brake = at('nichts');
  const bx = lerp(2300, 1480, ramp(f, brake - 20, 24));
  const no = ramp(f, brake + 10, 10);
  return (
    <g>
      <Space f={f} seed={107} />
      {[0, 1, 2].map((k) => <path key={k} d={`M 490 ${600 - k * 40} A 470 ${90 + k * 20} 0 0 0 1430 ${600 - k * 40}`} stroke={N.green} strokeWidth={8} fill="none" strokeDasharray="40 30" strokeDashoffset={-f * 6} opacity={0.6} />)}
      <NeonEarth f={f} x={960} y={560} r={360} spin={f * 6} id="ceg" mood="joy" />
      <Pop f={f} at={at('gute') - 6} x={960} y={100}><Banner x={960} y={100} text="Gute Nachricht" color={N.green} size={60} /></Pop>
      <g transform={`translate(${bx} 560) rotate(${no * 25})`}>
        <rect x={-50} y={-120} width={100} height={240} rx={20} fill={N.cream} />
        <rect x={-50} y={-120} width={30} height={240} rx={10} fill={N.red} />
      </g>
      <g opacity={no}><line x1={1400} y1={420} x2={1600} y2={700} stroke={N.red} strokeWidth={24} strokeLinecap="round" /><line x1={1600} y1={420} x2={1400} y2={700} stroke={N.red} strokeWidth={24} strokeLinecap="round" /></g>
      <Burst f={f} at={brake + 4} x={1340} y={560} color={N.yellow} r={180} />
      <FlyIn f={f} at={at('schwer') - 6} from="b" dist={600}><Banner x={960} y={1000} text="viel zu schwer · viel zu schnell" color={N.violet} size={46} /></FlyIn>
    </g>
  );
};

// ending b: the moon brakes the earth through the tides; days get longer
export const MoonBrake: React.FC<ActProps> = ({f, at}) => {
  const ma = f * 0.01;
  const mx = 960 + Math.cos(ma) * 680; const my = 560 + Math.sin(ma) * 260;
  const ang = (Math.atan2(my - 560, mx - 960) * 180) / Math.PI + 18;
  return (
    <g>
      <Space f={f} seed={109} />
      <ellipse cx={960} cy={560} rx={680} ry={260} fill="none" stroke={N.violet} strokeWidth={3} strokeDasharray="12 16" opacity={0.5} />
      <ellipse cx={960} cy={560} rx={330} ry={260} fill={N.cyan} opacity={0.3} transform={`rotate(${ang} 960 560)`} />
      <ellipse cx={960} cy={560} rx={330} ry={260} fill="none" stroke={N.cyan} strokeWidth={6} opacity={0.8} transform={`rotate(${ang} 960 560)`} />
      <NeonEarth f={f} x={960} y={560} r={250} spin={f * 3} id="cem" mood="sleepy" />
      <line x1={960} y1={560} x2={mx} y2={my} stroke={N.pink} strokeWidth={4} strokeDasharray="10 14" opacity={0.6} />
      <NeonMoon f={f} x={mx} y={my} r={70} />
      <FlyIn f={f} at={at('Gezeiten') - 6} from="r" dist={900}><Banner x={1500} y={110} text="Gezeiten bremsen" color={N.blue} size={52} /></FlyIn>
    </g>
  );
};

// ending c: timeline: 400 million years ago 22 h, today 24 h, +2 ms per century; far future: the sun dies first
export const DayTimeline: React.FC<ActProps> = ({f, at}) => {
  const X0 = 260; const X1 = 1500;
  const bar = ramp(f, 4, 30);
  const fut = ramp(f, at('Milliarden') - 6, 40);
  const sunDie = ramp(f, at('erloschen') - 20, 40);
  const pin = (x: number, w: string, label: string, val: string, color: string, icon: React.ReactNode, id: string) => (
    <FlyIn f={f} at={at(w) - 8} from="t" dist={700}>
      <Vignette f={f} x={x} y={330} r={130} id={id}>{icon}</Vignette>
      <polygon points={`${x - 24},476 ${x + 24},476 ${x},510`} fill={color} />
      <rect x={x - 130} y={650} width={260} height={80} rx={10} fill={color} />
      <Lbl x={x} y={706} size={48} color={N.white}>{label}</Lbl>
      <Lbl x={x} y={830} size={78} color={color}>{val}</Lbl>
    </FlyIn>
  );
  return (
    <g>
      <rect x={-600} y={-600} width={3120} height={2280} fill="#173a4a" />
      <circle cx={960} cy={540} r={1100} fill="#1f5560" opacity={0.6} />
      <Banner x={960} y={100} text="Zeitstrahl" color="#3a8a5a" size={56} />
      <rect x={X0} y={540} width={(X1 - X0) * bar} height={70} fill="#8fd16a" />
      <rect x={X1} y={540} width={300 * fut} height={70} fill={N.violet} />
      {pin(X0, 'Vor', '−400 Mio', '22 h', N.orange,
        <g><rect x={X0 - 140} y={190} width={280} height={280} fill={N.blue} />{[0, 1].map((k) => <g key={k} transform={`translate(${X0 - 30 + k * 90} ${300 + k * 60}) scale(1.4)`}><ellipse rx={36} ry={18} fill={N.orange} /><path d="M -34 0 L -58 -16 L -58 16 Z" fill={N.orange} /></g>)}</g>, 'cet1')}
      {pin(X1 - 220, 'Jahrhundert', 'Heute', '24 h', '#8fd16a',
        <g><rect x={X1 - 360} y={190} width={280} height={280} fill={N.navy} />{[0, 1, 2, 3].map((k) => <rect key={k} x={X1 - 330 + k * 56} y={300 - k * 26} width={44} height={200 + k * 26} fill={[N.magenta, N.violet, N.cyan, N.yellow][k]} />)}</g>, 'cet2')}
      <Pop f={f} at={at('Millisekunden') - 6} x={X1 - 220} y={960}><Banner x={X1 - 220} y={960} text="+2 ms pro Jahrhundert" color={N.violet} size={44} /></Pop>
      <g opacity={fut}>
        <g transform={`translate(${X1 + 240} 330)`}>
          <circle r={lerp(70, 140, sunDie)} fill={sunDie > 0.5 ? '#c84a2a' : N.yellow} opacity={1 - 0.6 * Math.max(0, sunDie - 0.6) / 0.4} />
          <Glow cx={0} cy={0} r={lerp(140, 260, sunDie)} color={sunDie > 0.5 ? N.red : N.orange} o={0.6 * (1 - Math.max(0, sunDie - 0.7) / 0.3)} />
        </g>
        <Banner x={X1 + 200} y={830} text="Milliarden Jahre" color={N.violet} size={44} />
      </g>
    </g>
  );
};

// ending d: back to you on the turning earth
export const Finale: React.FC<ActProps> = ({f, at}) => {
  const dayNight = (Math.sin(f * 0.05) + 1) / 2;
  return (
    <g>
      <Space f={f} seed={111} />
      <NeonEarth f={f} x={960} y={1580} r={1060} spin={f * 3} id="cef" face={false} night={dayNight * 0.6} />
      <NeonSun f={f} x={300 + ((f * 4) % 1500)} y={200} r={70} />
      <Character f={f} x={960} y={540} s={1.7} {...DU} mood="joy" arms="wave" />
      <Swarm f={f} x={960} y={300} r={420} color={N.yellow} n={30} seed={9} o={0.5} />
      <NeonRing x={960} y={360} r={340} w={12} spin={f} o={0.6} />
      <Pop f={f} at={at('Einmal') - 6} x={960} y={100}><Banner x={960} y={100} text="1 Umdrehung pro Tag" color={N.blue} size={52} /></Pop>
      <Pop f={f} at={at('mit') - 4} x={960} y={1000}><Banner x={960} y={1000} text="… und du drehst dich mit" color={N.magenta} size={54} /></Pop>
    </g>
  );
};

export {Arrow, NeonRing};
