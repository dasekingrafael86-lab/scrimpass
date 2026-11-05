// Acts 6-11: one day per year, the magnetic shield, who survives, the good news, tides, timeline
import React from 'react';
import {Character, Glow, rnd} from '../../design/kit';
import {ActProps, Banner, N, NeonRing, Vignette, lerp, ramp} from '../../design/flow';
import {Arrow, Burst, Crossers, DU, FlyIn, Lbl, NeonEarth, NeonMoon, NeonSun, Pop, Space, Swarm, Thermo} from './neon';

const PARKA_A = {skin: N.skin, hair: N.red, hairStyle: 'cap' as const, shirt: N.red, pants: N.navy, seed: 211};
const PARKA_B = {skin: N.skinDark, hair: N.yellow, hairStyle: 'cap' as const, shirt: N.orange, pants: N.navy, seed: 212};
const MINER = {skin: N.skin, hair: N.yellow, hairStyle: 'cap' as const, shirt: N.violet, pants: N.ink, seed: 213};

// ---------------------------------------------------------------------------------------
// 6: the earth keeps orbiting but no longer spins: one sunrise per year; day side and night side
export const YearDay: React.FC<ActProps> = ({f, at}) => {
  const a = -Math.PI / 2 + f * 0.012;
  const ex = 960 + Math.cos(a) * 620; const ey = 560 + Math.sin(a) * 300;
  const split = ramp(f, at('halbes') - 6, 20);
  const day = ramp(f, at('halbes', 0) - 4, 16);
  const night = ramp(f, at('halbes', 1) - 4, 16);
  const hot = ramp(f, at('heiß') - 6, 40);
  const cold = ramp(f, at('kalt') - 6, 40);
  const sunA = Math.atan2(560 - ey, 960 - ex);
  return (
    <g>
      <Space f={f} seed={21} />
      <g opacity={1 - 0.75 * split}>
        <ellipse cx={960} cy={560} rx={620} ry={300} fill="none" stroke={N.violet} strokeWidth={4} strokeDasharray="16 18" />
        <NeonSun f={f} x={960} y={560} r={130} />
        <g>
          <NeonEarth f={f} x={ex} y={ey} r={80} face={false} id="g6" />
          {/* night half: away from the sun */}
          <path d={`M ${ex + Math.cos(sunA + Math.PI / 2) * 80} ${ey + Math.sin(sunA + Math.PI / 2) * 80} A 80 80 0 0 0 ${ex + Math.cos(sunA - Math.PI / 2) * 80} ${ey + Math.sin(sunA - Math.PI / 2) * 80} Z`}
            fill={N.deep} opacity={0.75} transform={`rotate(180 ${ex} ${ey})`} />
          {/* a flag that always points the same way: the earth does not turn */}
          <line x1={ex} y1={ey - 80} x2={ex} y2={ey - 130} stroke={N.cream} strokeWidth={6} />
          <path d={`M ${ex} ${ey - 130} l 34 10 l -34 10 Z`} fill={N.magenta} />
        </g>
      </g>
      <Pop f={f} at={at('einmal') - 6} x={960} y={110}><Banner x={960} y={110} text="1 Tag = 1 Jahr" color={N.orange} size={64} /></Pop>
      <FlyIn f={f} at={at('halbes', 0) - 6} from="l" dist={1200}>
        <Vignette f={f} x={560} y={600} r={300} id="v6a">
          <rect x={200} y={240} width={720} height={720} fill="#ff9a3a" />
          <circle cx={560} cy={400} r={110} fill={N.yellow} />
          <Glow cx={560} cy={400} r={260} color={N.yellow} o={0.8} />
          <path d="M 200 760 Q 400 680 560 740 Q 720 800 920 720 L 920 960 L 200 960 Z" fill="#e8602a" />
          {Array.from({length: 4}, (_, i) => <path key={i} d={`M ${300 + i * 120} ${700 - ((f * 2 + i * 20) % 80)} q 10 -20 0 -40`} stroke="#fff0c0" strokeWidth={6} fill="none" opacity={0.5} />)}
          <Thermo x={790} y={880} lvl={lerp(0.4, 0.98, hot)} hot s={0.9} />
        </Vignette>
        <Lbl x={560} y={990} size={56} color={N.yellow} o={day}>Tag</Lbl>
      </FlyIn>
      <FlyIn f={f} at={at('halbes', 1) - 6} from="r" dist={1200}>
        <Vignette f={f} x={1360} y={600} r={300} id="v6b">
          <rect x={1000} y={240} width={720} height={720} fill={N.navy} />
          {Array.from({length: 40}, (_, i) => <circle key={i} cx={1000 + rnd(i) * 720} cy={240 + rnd(i * 3) * 400} r={3} fill={N.cream} opacity={0.4 + 0.5 * Math.abs(Math.sin(f * 0.1 + i))} />)}
          <path d="M 1000 760 Q 1200 700 1360 740 Q 1540 790 1720 720 L 1720 960 L 1000 960 Z" fill="#cfe0ff" />
          {[0, 1, 2].map((i) => <path key={i} d={`M ${1080 + i * 200} 760 l 60 -140 l 60 140 Z`} fill="#e8f0ff" />)}
          <Thermo x={1590} y={880} lvl={lerp(0.4, 0.04, cold)} hot={false} s={0.9} />
        </Vignette>
        <Lbl x={1360} y={990} size={56} color={N.cyan} o={night}>Nacht</Lbl>
      </FlyIn>
    </g>
  );
};

// ---------------------------------------------------------------------------------------
// 7: the magnetic field from the iron core; it weakens, radiation gets through
export const Magnet: React.FC<ActProps> = ({f, at}) => {
  const core = ramp(f, at('Eisenkern') - 10, 20);
  const weak = ramp(f, at('schwächer') - 6, 30);
  const field = 1 - 0.8 * weak;
  const cx = 960; const cy = 560;
  return (
    <g>
      <Space f={f} seed={23} />
      {/* dipole field lines */}
      {[1, 1.6, 2.3, 3.1].map((k, i) => [-1, 1].map((side) => (
        <path key={`${i}${side}`} d={`M ${cx} ${cy - 250} C ${cx + side * 250 * k} ${cy - 330 * k} ${cx + side * 250 * k} ${cy + 330 * k} ${cx} ${cy + 250}`}
          fill="none" stroke={N.cyan} strokeWidth={6} strokeDasharray="24 18" strokeDashoffset={-f * 3} opacity={field * (0.9 - i * 0.15)} />
      )))}
      <NeonEarth f={f} x={cx} y={cy} r={250} id="g7" mood={[[0, 'neutral'], [at('schwächer'), 'worried']]} face={core < 0.5} />
      {/* cutaway into the core */}
      <g opacity={core}>
        <path d={`M ${cx} ${cy} L ${cx + 250} ${cy} A 250 250 0 0 0 ${cx} ${cy - 250} Z`} fill="#3a1a2a" />
        <circle cx={cx} cy={cy} r={120} fill="#c04a1a" />
        <circle cx={cx} cy={cy} r={70} fill={N.orange} />
        {[0, 1, 2].map((k) => (
          <path key={k} d={`M ${cx + 40 + k * 20} ${cy} A ${40 + k * 20} ${40 + k * 20} 0 1 1 ${cx} ${cy - 40 - k * 20}`} stroke={N.yellow} strokeWidth={6} fill="none"
            strokeDasharray="20 14" strokeDashoffset={-f * 4} transform={`rotate(${f * 2} ${cx} ${cy})`} />
        ))}
        <Glow cx={cx} cy={cy} r={140} color={N.orange} o={0.7} />
      </g>
      <Pop f={f} at={at('Drehung') - 4} x={cx} y={cy + 360}>
        <path d={`M ${cx - 300} ${cy + 330} Q ${cx} ${cy + 420} ${cx + 300} ${cy + 330}`} stroke={N.yellow} strokeWidth={10} fill="none" />
        <polygon points={`${cx + 300},${cy + 330} ${cx + 262},${cy + 324} ${cx + 286},${cy + 356}`} fill={N.yellow} />
      </Pop>
      {/* the solar wind gets through */}
      {weak > 0 && Array.from({length: 40}, (_, i) => {
        const t = ((f * 0.02 + rnd(i)) % 1);
        const y = 220 + rnd(i * 3) * 680;
        const x = lerp(-100, cx - 240 + Math.abs(y - cy) * 0.3, t);
        return <circle key={i} cx={x} cy={y} r={6 + rnd(i * 5) * 6} fill={i % 3 ? N.magenta : N.orange} opacity={weak * Math.min(1, t * 3)} />;
      })}
      {weak > 0.5 && [0, 1, 2].map((k) => <Burst key={k} f={f} at={at('Oberfläche') + k * 10} x={cx - 230} y={cy - 80 + k * 80} color={N.magenta} r={90} n={10} />)}
      <Pop f={f} at={at('Schutzschild') - 6} x={960} y={110} out={at('Eisenkern') - 4}><Banner x={960} y={110} text="Schutzschild" color={N.blue} size={56} /></Pop>
      <Pop f={f} at={at('Eisenkern') - 4} x={1450} y={300}><Banner x={1450} y={300} text="flüssiger Eisenkern" color={N.orange} size={46} /></Pop>
      <FlyIn f={f} at={at('Strahlung') - 6} from="l" dist={900}><Banner x={420} y={110} text="Strahlung" color={N.magenta} size={56} /></FlyIn>
    </g>
  );
};

// ---------------------------------------------------------------------------------------
// 8: who could survive: three circles fly in
export const Survivors: React.FC<ActProps> = ({f, at}) => {
  const shield = ramp(f, at('geschützt') - 4, 12);
  const Shield: React.FC<{x: number; y: number}> = ({x, y}) => (
    <g opacity={shield}>
      <path d={`M ${x} ${y - 260} L ${x + 230} ${y - 150} L ${x + 230} ${y + 150} L ${x} ${y + 260} L ${x - 230} ${y + 150} L ${x - 230} ${y - 150} Z`} fill="none" stroke={N.cyan} strokeWidth={10} opacity={0.8} />
      <Glow cx={x} cy={y} r={260} color={N.cyan} o={0.25} />
    </g>
  );
  return (
    <g>
      <Space f={f} seed={25} />
      <Swarm f={f} x={960} y={540} r={700} color={N.violet} n={60} seed={5} o={0.4} />
      <Pop f={f} at={at('überleben') - 8} x={960} y={110}><Banner x={960} y={110} text="Wer überlebt?" color={N.magenta} size={60} /></Pop>
      <FlyIn f={f} at={at('Pole') - 6} from="l" dist={1300}>
        <Vignette f={f} x={400} y={580} r={240} id="v8a">
          <rect x={160} y={340} width={480} height={480} fill="#8fb8ff" />
          <path d="M 160 640 Q 400 580 640 640 L 640 820 L 160 820 Z" fill="#eef4ff" />
          <rect x={430} y={560} width={150} height={90} rx={20} fill={N.orange} />
          <Character f={f} x={290} y={720} s={0.75} {...PARKA_A} mood="worried" />
          <Character f={f} x={380} y={730} s={0.65} {...PARKA_B} mood="curious" />
          {Array.from({length: 20}, (_, i) => <circle key={i} cx={160 + rnd(i) * 480} cy={340 + ((rnd(i * 3) * 480 + f * 2) % 480)} r={4} fill={N.white} opacity={0.8} />)}
        </Vignette>
        <Lbl x={400} y={880} size={44} color={N.cyan}>an den Polen</Lbl>
      </FlyIn>
      <FlyIn f={f} at={at('Bergwerken') - 6} from="b" dist={1000}>
        <Vignette f={f} x={960} y={580} r={240} id="v8b">
          <rect x={720} y={340} width={480} height={480} fill="#3a2230" />
          <path d="M 720 520 L 1200 520 L 1200 700 L 720 700 Z" fill="#5a3240" />
          {[0, 1, 2].map((i) => <g key={i}><rect x={760 + i * 150} y={520} width={16} height={180} fill="#8a5a3a" /><circle cx={768 + i * 150} cy={540} r={14} fill={N.yellow} /><Glow cx={768 + i * 150} cy={540} r={60} color={N.yellow} o={0.6} /></g>)}
          <Character f={f} x={960} y={700} s={0.7} {...MINER} mood="determined" />
        </Vignette>
        <Lbl x={960} y={880} size={44} color={N.orange}>Bergwerke</Lbl>
        <Shield x={960} y={580} />
      </FlyIn>
      <FlyIn f={f} at={at('Bunkern') - 6} from="r" dist={1300}>
        <Vignette f={f} x={1520} y={580} r={240} id="v8c">
          <rect x={1280} y={340} width={480} height={480} fill="#202a4a" />
          <rect x={1320} y={420} width={400} height={300} rx={20} fill="#2c3a6a" />
          {[0, 1, 2].map((i) => <rect key={i} x={1350 + i * 120} y={440} width={90} height={14} rx={6} fill={N.magenta} />)}
          <Glow cx={1520} cy={480} r={160} color={N.magenta} o={0.4} />
          {Array.from({length: 5}, (_, i) => <path key={i} d={`M ${1360 + i * 70} 700 q -14 -34 0 -60 q 14 26 0 60`} fill={N.green} />)}
          <Character f={f} x={1600} y={710} s={0.65} {...DU} mood="happy" />
        </Vignette>
        <Lbl x={1520} y={880} size={44} color={N.magenta}>Bunker</Lbl>
        <Shield x={1520} y={580} />
      </FlyIn>
      <Crossers f={f} n={10} speed={14} color={N.magenta} y0={150} y1={950} seed={27} size={8} />
    </g>
  );
};

// ---------------------------------------------------------------------------------------
// 9: the good news: nothing can brake the earth this fast
export const GoodNews: React.FC<ActProps> = ({f, at}) => {
  const spin = f * 6;
  const brake = at('nichts');
  const bx = lerp(2300, 1480, ramp(f, brake - 20, 24));
  const no = ramp(f, brake + 10, 10);
  return (
    <g>
      <Space f={f} seed={31} />
      <Crossers f={f} n={10} speed={8} color={N.cyan} y0={100} y1={1000} seed={33} size={6} />
      {[0, 1, 2].map((k) => (
        <path key={k} d={`M ${960 - 470} ${560 + 40 - k * 40} A 470 ${90 + k * 20} 0 0 0 ${960 + 470} ${560 + 40 - k * 40}`} stroke={N.green} strokeWidth={8} fill="none" strokeDasharray="40 30" strokeDashoffset={-f * 6} opacity={0.6} />
      ))}
      <NeonEarth f={f} x={960} y={560} r={360} spin={spin} id="g9" mood="joy" />
      <Pop f={f} at={at('gute') - 6} x={960} y={110}><Banner x={960} y={110} text="Gute Nachricht" color={N.green} size={60} /></Pop>
      {/* a tiny brake shoe tries to stop the planet */}
      <g transform={`translate(${bx} 560) rotate(${no * 25})`}>
        <rect x={-50} y={-120} width={100} height={240} rx={20} fill={N.cream} />
        <rect x={-50} y={-120} width={30} height={240} rx={10} fill={N.red} />
      </g>
      <g opacity={no}>
        <line x1={1400} y1={420} x2={1600} y2={700} stroke={N.red} strokeWidth={24} strokeLinecap="round" />
        <line x1={1600} y1={420} x2={1400} y2={700} stroke={N.red} strokeWidth={24} strokeLinecap="round" />
      </g>
      <Burst f={f} at={brake + 4} x={1340} y={560} color={N.yellow} r={180} />
    </g>
  );
};

// ---------------------------------------------------------------------------------------
// 10: the moon brakes the earth through the tides
export const Tides: React.FC<ActProps> = ({f, at}) => {
  const ma = f * 0.01;
  const mx = 960 + Math.cos(ma) * 680; const my = 560 + Math.sin(ma) * 260;
  const ang = (Math.atan2(my - 560, mx - 960) * 180) / Math.PI + 18;
  return (
    <g>
      <Space f={f} seed={35} />
      <ellipse cx={960} cy={560} rx={680} ry={260} fill="none" stroke={N.violet} strokeWidth={3} strokeDasharray="12 16" opacity={0.5} />
      <ellipse cx={960} cy={560} rx={330} ry={260} fill={N.cyan} opacity={0.3} transform={`rotate(${ang} 960 560)`} />
      <ellipse cx={960} cy={560} rx={330} ry={260} fill="none" stroke={N.cyan} strokeWidth={6} opacity={0.8} transform={`rotate(${ang} 960 560)`} />
      <NeonEarth f={f} x={960} y={560} r={250} spin={f * 3} id="g10" mood="sleepy" />
      <line x1={960} y1={560} x2={mx} y2={my} stroke={N.pink} strokeWidth={4} strokeDasharray="10 14" opacity={0.6} />
      <NeonMoon f={f} x={mx} y={my} r={70} />
      {[0, 1, 2, 3].map((k) => {
        const t = ((f * 0.03 + k / 4) % 1);
        const a = (ang * Math.PI) / 180 + Math.PI / 2;
        return <circle key={k} cx={960 + Math.cos(a) * (270 + t * 40)} cy={560 + Math.sin(a) * (270 + t * 40)} r={8} fill={N.orange} opacity={1 - t} />;
      })}
      <Pop f={f} at={at('Millisekunden') - 6} x={960} y={950}><Banner x={960} y={950} text="+2 ms pro Jahrhundert" color={N.violet} size={56} /></Pop>
      <FlyIn f={f} at={at('Gezeiten') - 6} from="r" dist={900}><Banner x={1500} y={120} text="Gezeiten" color={N.blue} size={52} /></FlyIn>
    </g>
  );
};

// ---------------------------------------------------------------------------------------
// 11: the timeline: 400 million years ago, today, the far future; then back to you
export const Timeline: React.FC<ActProps> = ({f, dur, at}) => {
  const X0 = 220; const X1 = 1700;
  const bar = ramp(f, 4, 30);
  const future = ramp(f, at('Milliarden') - 6, 30);
  const finale = ramp(f, at('Mit') - 30, 40);
  const pin = (x: number, w: string, label: string, val: string, color: string, icon: React.ReactNode, id: string) => (
    <FlyIn f={f} at={at(w) - 8} from="t" dist={700}>
      <Vignette f={f} x={x} y={330} r={140} id={id}>{icon}</Vignette>
      <polygon points={`${x - 24},486 ${x + 24},486 ${x},520`} fill={color} />
      <rect x={x - 120} y={650} width={240} height={80} rx={10} fill={color} />
      <Lbl x={x} y={706} size={50} color={N.white}>{label}</Lbl>
      <Lbl x={x} y={830} size={80} color={color}>{val}</Lbl>
    </FlyIn>
  );
  return (
    <g>
      <rect x={-600} y={-600} width={3120} height={2280} fill="#173a4a" />
      <circle cx={960} cy={540} r={1100} fill="#1f5560" opacity={0.6} />
      <g opacity={1 - finale}>
        <Banner x={960} y={110} text="Zeitstrahl" color="#3a8a5a" size={60} />
        <rect x={X0} y={540} width={(X1 - X0) * bar} height={70} fill="#8fd16a" />
        <rect x={X1} y={540} width={200 * future} height={70} fill={N.violet} />
        <polygon points={`${X1 + 200 * future},520 ${X1 + 200 * future + 50 * future},575 ${X1 + 200 * future},630`} fill={N.violet} opacity={future} />
        {pin(X0 + 60, 'Vor', '−400 Mio', '22 h', N.orange,
          <g><rect x={X0 - 120} y={160} width={360} height={360} fill={N.blue} />{[0, 1].map((k) => <g key={k} transform={`translate(${X0 + 20 + k * 90} ${300 + k * 60}) scale(1.4)`}><ellipse rx={36} ry={18} fill={N.orange} /><path d="M -34 0 L -58 -16 L -58 16 Z" fill={N.orange} /></g>)}</g>, 'tp1')}
        {pin(X1 - 120, 'Stunden', 'Heute', '24 h', '#8fd16a',
          <g><rect x={X1 - 300} y={160} width={360} height={360} fill={N.navy} />{[0, 1, 2, 3].map((k) => <rect key={k} x={X1 - 230 + k * 56} y={300 - k * 26} width={44} height={200 + k * 26} fill={[N.magenta, N.violet, N.cyan, N.yellow][k]} />)}</g>, 'tp2')}
        <Pop f={f} at={at('Milliarden') - 2} x={1560} y={960}><Banner x={1560} y={960} text="→ Milliarden Jahre" color={N.violet} size={50} /></Pop>
      </g>
      {/* finale: back to you on the spinning earth */}
      {finale > 0 && (
        <g opacity={finale} transform={`translate(960 560) scale(${lerp(0.4, 1, finale)}) translate(-960 -560)`}>
          <Space f={f} seed={41} />
          <NeonEarth f={f} x={960} y={1500} r={1000} spin={f * 2} id="g11" face={false} />
          <Character f={f} x={960} y={520} s={1.6} {...DU} mood="joy" arms="wave" />
          <Swarm f={f} x={960} y={300} r={400} color={N.yellow} n={30} seed={9} o={0.6} />
          <NeonRing x={960} y={330} r={330} w={12} spin={f} o={0.6} />
        </g>
      )}
    </g>
  );
};
