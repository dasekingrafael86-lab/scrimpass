// Chapter 3 storm, 4 oceans, 5 day and night, 6 magnetic field
import React from 'react';
import {Character, Glow, rnd} from '../../design/kit';
import {ActProps, Banner, N, Vignette, lerp, ramp} from '../../design/flow';
import {Arrow, Burst, Crossers, DU, FlyIn, House, Lbl, NTree, NeonEarth, NeonSun, Pop, Space, Swarm, Thermo} from '../stopp/neon';

// ---------------------------------------------------------------------------------------
// 3a: the ground has stopped, but the air keeps turning; then the supersonic wind
export const AirShell: React.FC<ActProps> = ({f, at}) => {
  const air = ramp(f, at('Lufthülle') - 6, 14);
  const fast = ramp(f, at('Plötzlich') - 4, 20);
  const boom = at('Schall');
  return (
    <g>
      <Space f={f} seed={71} />
      <Crossers f={f} n={Math.round(30 * fast)} speed={24} color={N.cyan} y0={250} y1={850} seed={2} size={8} />
      <g opacity={air}>
        <circle cx={960} cy={560} r={470} fill={N.cyan} opacity={0.12} />
        <circle cx={960} cy={560} r={470} fill="none" stroke={N.cyan} strokeWidth={8} strokeDasharray="70 40" strokeDashoffset={-f * (6 + 30 * fast)} />
        {[0, 1, 2, 3, 4].map((k) => (
          <ellipse key={k} cx={960} cy={560 - 240 + k * 120} rx={440 * Math.cos(((k - 2) * 0.5))} ry={34} fill="none" stroke={N.white} strokeWidth={5}
            strokeDasharray="40 50" strokeDashoffset={-f * (4 + 28 * fast) * Math.cos((k - 2) * 0.5)} opacity={0.5} />
        ))}
      </g>
      <NeonEarth f={f} x={960} y={560} r={380} spin={0} id="c3a" mood={[[0, 'worried'], [at('Plötzlich'), 'shocked']]} />
      {[0, 1, 2].map((k) => {
        const t = (f - boom - k * 8) / 40;
        return t > 0 && t < 1 ? <circle key={k} cx={960} cy={560} r={480 + t * 700} fill="none" stroke={N.magenta} strokeWidth={14 * (1 - t)} opacity={1 - t} /> : null;
      })}
      <Pop f={f} at={at('Lufthülle') - 4} x={960} y={100} out={at('Plötzlich')}><Banner x={960} y={100} text="Lufthülle" color={N.cyan} size={56} /></Pop>
      <Pop f={f} at={at('1.600') - 6} x={960} y={100}><Banner x={960} y={100} text="Wind: über 1.600 km/h" color={N.orange} size={56} /></Pop>
      <FlyIn f={f} at={boom - 6} from="r" dist={1000}><Banner x={1500} y={990} text="schneller als der Schall" color={N.violet} size={46} /></FlyIn>
    </g>
  );
};

// 3b: compare with the strongest tornado ever measured
export const Tornado: React.FC<ActProps> = ({f, at}) => {
  const t = ramp(f, at('Tornados') - 6, 20);
  const s = ramp(f, at('500') + 6, 30);
  const Funnel: React.FC<{x: number; y: number; k: number}> = ({x, y, k}) => (
    <g transform={`translate(${x} ${y}) scale(${k})`}>
      {Array.from({length: 7}, (_, i) => (
        <ellipse key={i} cx={Math.sin(f * 0.2 + i) * 10 * (i / 7)} cy={-i * 50} rx={20 + i * 22} ry={10 + i * 4} fill="none" stroke={N.cream} strokeWidth={10} opacity={0.7} />
      ))}
    </g>
  );
  return (
    <g>
      <Space f={f} seed={73} c="#140a30" />
      <rect x={-400} y={880} width={2720} height={600} fill="#2a1a5a" />
      <Funnel x={380} y={860} k={1} />
      <g transform="translate(700 0)">
        <rect x={0} y={560} width={1000} height={70} rx={20} fill={N.navy} />
        <rect x={0} y={560} width={1000 * (480 / 1670) * t} height={70} rx={20} fill={N.cream} />
        <Lbl x={20} y={530} size={42} anchor="start">stärkster Tornado</Lbl>
        <Lbl x={1000 * (480 / 1670) * t + 20} y={610} size={44} anchor="start" o={t}>≈ 480 km/h</Lbl>
        <rect x={0} y={760} width={1000} height={70} rx={20} fill={N.navy} />
        <rect x={0} y={760} width={1000 * s} height={70} rx={20} fill={N.red} />
        <Lbl x={20} y={730} size={42} anchor="start" o={s}>der neue Sturm</Lbl>
        <Lbl x={Math.min(1000 * s, 780) + 20} y={810} size={44} anchor="start" o={s}>1.670 km/h</Lbl>
      </g>
      <Pop f={f} at={at('500') + 4} x={1200} y={150}><Banner x={1200} y={150} text="3,5 × so stark" color={N.red} size={56} /></Pop>
    </g>
  );
};

// 3c: the storm sweeps the whole planet: forests, cities, mountains get sanded down
export const Erosion: React.FC<ActProps> = ({f, at}) => {
  const forest = at('Wälder'); const city = at('Städte'); const mount = at('Berge');
  const blow = (start: number) => Math.max(0, f - start);
  const peak = (base: number) => base - Math.min(160, blow(mount) * 2.4);
  return (
    <g>
      <Space f={f} seed={75} c="#120a2e" />
      <Crossers f={f} n={40} speed={-34} color={N.cyan} y0={200} y1={900} seed={9} size={8} />
      {/* mountains */}
      {[[1300, 900, 560], [1560, 900, 440], [1100, 900, 360]].map(([x, b, h], i) => (
        <g key={i}>
          <path d={`M ${x - 260} ${b} L ${x} ${b - peak(h)} L ${x + 260} ${b} Z`} fill={[N.violet, '#5a2aa8', '#4a2a90'][i]} />
          {blow(mount) > 0 && <Swarm f={f} x={x + 120 + blow(mount) * 8} y={b - peak(h) + 40} r={60} color={N.pink} n={14} seed={i} />}
        </g>
      ))}
      <rect x={-400} y={900} width={2720} height={600} fill="#2a1a5a" />
      {/* forest */}
      {[0, 1, 2, 3].map((i) => {
        const t = blow(forest + i * 3);
        return <g key={i} transform={`translate(${t * 14} ${-Math.min(300, t * 5)}) rotate(${t * 4} ${180 + i * 90} 900)`}><NTree x={180 + i * 90} y={904} s={0.9} /></g>;
      })}
      {/* city */}
      {[0, 1, 2].map((i) => {
        const t = blow(city + i * 3);
        return <g key={i} transform={`translate(${t * 12} ${-Math.min(260, t * 4)}) rotate(${t * 3} ${620 + i * 140} 900)`}><House x={620 + i * 140} y={904} s={0.8} c={[N.magenta, N.orange, N.cyan][i]} /></g>;
      })}
      <FlyIn f={f} at={at('ganze') - 8} from="r" dist={1100}><Banner x={960} y={120} text="einmal um die ganze Erde" color={N.blue} size={52} /></FlyIn>
    </g>
  );
};

// ---------------------------------------------------------------------------------------
// 4a: the oceans slosh: a giant wave
export const Flood: React.FC<ActProps> = ({f, dur, at}) => {
  const p = ramp(f, 6, dur - 10);
  const crestX = lerp(-120, 1500, p);
  const h = lerp(260, 620, ramp(f, 0, 30));
  return (
    <g>
      <Space f={f} seed={77} c="#160a36" />
      {Array.from({length: 9}, (_, i) => {
        const x = 900 + i * 120; const bh = 200 + ((i * 97) % 5) * 70;
        const tilt = crestX > x - 100 ? Math.min(30, (crestX - x + 100) * 0.1) : 0;
        return (
          <g key={i} transform={`rotate(${tilt} ${x + 50} 900)`}>
            <rect x={x} y={900 - bh} width={100} height={bh} fill={[N.violet, N.navy, N.magenta][i % 3]} />
            {Array.from({length: Math.floor(bh / 50)}, (_, k) => <rect key={k} x={x + 18} y={900 - bh + 18 + k * 50} width={24} height={24} rx={4} fill={N.yellow} opacity={0.8} />)}
          </g>
        );
      })}
      <rect x={-400} y={900} width={2720} height={400} fill="#0f1a4a" />
      <defs><linearGradient id="wv4b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={N.cyan} /><stop offset="0.4" stopColor={N.blue} /><stop offset="1" stopColor="#14207a" /></linearGradient></defs>
      <path d={`M -600 1100 L -600 ${900 - h * 0.25} C ${crestX - 900} ${900 - h * 0.5} ${crestX - 400} ${900 - h * 1.02} ${crestX - 60} ${900 - h}
        C ${crestX + 90} ${900 - h * 0.98} ${crestX + 150} ${900 - h * 0.82} ${crestX + 110} ${900 - h * 0.7}
        C ${crestX + 70} ${900 - h * 0.6} ${crestX} ${900 - h * 0.66} ${crestX - 10} ${900 - h * 0.76}
        C ${crestX + 60} ${900 - h * 0.4} ${crestX + 200} ${960} ${crestX + 420} 1010 L ${crestX + 420} 1100 Z`} fill="url(#wv4b)" />
      <path d={`M ${crestX - 60} ${900 - h} C ${crestX + 90} ${900 - h * 0.98} ${crestX + 150} ${900 - h * 0.82} ${crestX + 110} ${900 - h * 0.7}`} stroke={N.white} strokeWidth={22} fill="none" strokeLinecap="round" />
      <Swarm f={f} x={crestX} y={900 - h + 40} r={120} color={N.white} n={40} seed={4} />
      <Crossers f={f} n={18} speed={-16} color={N.cyan} y0={400} y1={900} seed={14} size={10} />
      <Pop f={f} at={at('Riesige') - 4} x={480} y={150}><Banner x={480} y={150} text="Flutwellen" color={N.blue} size={56} /></Pop>
    </g>
  );
};

// 4b: spinning pizza dough flattens out; it turns into the bulging earth
export const Pizza: React.FC<ActProps> = ({f, dur, at}) => {
  const spin = ramp(f, at('Pizzateig') - 10, 20);
  const wide = lerp(1, 1.35, ramp(f, at('Pizzateig'), 40));
  const toEarth = ramp(f, dur - 34, 24);
  return (
    <g>
      <Space f={f} seed={79} />
      <g opacity={1 - toEarth}>
        <g transform={`translate(960 500) rotate(${f * 8 * spin}) scale(${wide} ${1 / Math.sqrt(wide)})`}>
          <ellipse cx={0} cy={0} rx={260} ry={260} fill="#f2d09a" />
          <ellipse cx={0} cy={0} rx={220} ry={220} fill="#ffe0a8" />
          {Array.from({length: 6}, (_, i) => <circle key={i} cx={Math.cos(i) * 140} cy={Math.sin(i) * 140} r={18} fill="#e8b878" opacity={0.6} />)}
        </g>
        {[-1, 1].map((sd) => <g key={sd} transform={`translate(${960 + sd * 140} ${760 + Math.sin(f * 0.3) * 10})`}><rect x={-30} y={-60} width={60} height={140} rx={30} fill={N.skin} /><circle cx={0} cy={-70} r={34} fill={N.skin} /></g>)}
        {spin > 0 && [0, 1, 2].map((k) => <path key={k} d={`M ${960 - 340 - k * 30} ${500 - 60 + k * 60} q -40 60 0 120`} stroke={N.cream} strokeWidth={8} fill="none" opacity={0.4} />)}
        <Arrow x1={960 + 300} y1={500} x2={960 + 420} y2={500} color={N.yellow} w={12} o={ramp(f, at('außen') - 4, 8)} />
        <Arrow x1={960 - 300} y1={500} x2={960 - 420} y2={500} color={N.yellow} w={12} o={ramp(f, at('außen') - 4, 8)} />
      </g>
      <g opacity={toEarth} transform={`translate(960 540) scale(${lerp(0.6, 1, toEarth)} ${lerp(0.6, 0.88, toEarth)}) translate(-960 -540)`}>
        <NeonEarth f={f} x={960} y={540} r={400} spin={f * 4} id="c4p" mood="curious" />
      </g>
      <Pop f={f} at={at('gedrückt') - 6} x={960} y={100}><Banner x={960} y={100} text="Drehung drückt nach außen" color={N.orange} size={50} /></Pop>
    </g>
  );
};

// 4c: the cutaway: bulge of 21 km, then the water slides to the poles
export const BulgeCut: React.FC<ActProps> = ({f, at}) => {
  const flat = ramp(f, at('Schwerkraft') - 4, 80);
  const cx = 960; const cy = 560;
  const rx = lerp(440, 400, flat); const ry = lerp(360, 400, flat);
  const water = (th: number) => {
    const eq = Math.abs(Math.cos(th));
    return lerp(18 + 40 * eq, 10 + 70 * (1 - eq) ** 3, flat);
  };
  const pts = (extra: (th: number) => number) => Array.from({length: 121}, (_, i) => {
    const th = (i / 120) * Math.PI * 2;
    return `${i ? 'L' : 'M'} ${cx + Math.cos(th) * (rx + extra(th))} ${cy + Math.sin(th) * (ry + extra(th))}`;
  }).join(' ') + ' Z';
  return (
    <g>
      <Space f={f} seed={81} c="#140a30" />
      <g stroke={N.yellow} strokeWidth={4} fill="none" opacity={0.6}>
        <path d={`M ${cx - 560} ${cy - 460} L ${cx + 560} ${cy - 460} L ${cx + 640} ${cy - 400} L ${cx + 640} ${cy + 500} L ${cx - 480} ${cy + 500} L ${cx - 560} ${cy + 440} Z`} />
        <path d={`M ${cx + 560} ${cy - 460} L ${cx + 560} ${cy + 440} L ${cx - 560} ${cy + 440} M ${cx + 560} ${cy + 440} L ${cx + 640} ${cy + 500}`} strokeDasharray="14 12" />
      </g>
      <path d={pts(water)} fill={N.blue} />
      <path d={pts(() => 0)} fill="#6a3a2a" />
      <ellipse cx={cx} cy={cy} rx={rx * 0.62} ry={ry * 0.62} fill="#c04a1a" />
      <ellipse cx={cx} cy={cy} rx={rx * 0.3} ry={ry * 0.3} fill={N.orange} />
      <Glow cx={cx} cy={cy} r={rx * 0.4} color={N.yellow} o={0.6} />
      <path d={pts(water)} fill="none" stroke={N.cyan} strokeWidth={6} />
      <g opacity={ramp(f, at('Kilometer') - 8, 10) * (1 - flat)}>
        <line x1={cx} y1={cy} x2={cx + rx + 58} y2={cy} stroke={N.yellow} strokeWidth={4} strokeDasharray="10 8" />
        <line x1={cx} y1={cy} x2={cx} y2={cy - ry - 18} stroke={N.cyan} strokeWidth={4} strokeDasharray="10 8" />
        <Banner x={cx + rx + 250} y={cy} text="+21 km" color={N.orange} size={52} />
      </g>
      {flat > 0 && flat < 1 && [-1, 1].map((side) => [0, 1, 2, 3].map((k) => {
        const t = ((f * 0.02 + k / 4) % 1);
        const th = side > 0 ? lerp(0.1, 1.35, t) : lerp(-0.1, -1.35, t);
        return <circle key={`${side}${k}`} cx={cx + Math.cos(th) * (rx + 60)} cy={cy - Math.sin(th) * (ry + 60)} r={14} fill={N.cyan} opacity={Math.sin(t * Math.PI)} />;
      }))}
      <Pop f={f} at={at('ausgebeult') - 6} x={960} y={90}><Banner x={960} y={90} text="am Äquator ausgebeult" color={N.violet} size={50} /></Pop>
      <FlyIn f={f} at={at('Polen') - 6} from="t" dist={500}><Banner x={960} y={1020} text="Wasser fließt zu den Polen" color={N.blue} size={46} /></FlyIn>
    </g>
  );
};

// 4d: the sea drains away at the equator: trenches and underwater mountains appear
export const Seabed: React.FC<ActProps> = ({f, dur, at}) => {
  const lvl = lerp(260, 760, ramp(f, 6, dur * 0.6));
  return (
    <g>
      <Space f={f} seed={83} c="#140a30" />
      <path d="M -400 1100 L -400 820 L 100 820 Q 300 560 500 820 L 700 820 Q 820 1040 940 820 L 1200 820 Q 1400 420 1600 820 L 2300 820 L 2300 1100 Z" fill="#4a2a5a" />
      <path d="M -400 820 L 100 820 Q 300 560 500 820 L 700 820 Q 820 1040 940 820 L 1200 820 Q 1400 420 1600 820 L 2300 820" stroke={N.yellow} strokeWidth={5} fill="none" opacity={0.5} />
      <rect x={-400} y={lvl} width={2720} height={1100 - lvl} fill={N.blue} opacity={0.75} />
      <rect x={-400} y={lvl} width={2720} height={10} fill={N.cyan} />
      {Array.from({length: 8}, (_, i) => <circle key={i} cx={rnd(i) * 1920} cy={lvl - ((f * 3 + i * 40) % 200)} r={6} fill={N.cyan} opacity={0.4} />)}
      <Pop f={f} at={at('Gräben') - 4} x={820} y={1000}><Banner x={820} y={1000} text="Tiefseegraben" color={N.violet} size={40} /></Pop>
      <Pop f={f} at={at('Gebirge') - 4} x={1400} y={360}><Banner x={1400} y={360} text="Unterwassergebirge" color={N.magenta} size={40} /></Pop>
      <FlyIn f={f} at={at('Meeresboden') - 6} from="l" dist={900}><Banner x={500} y={140} text="Meeresboden taucht auf" color={N.orange} size={50} /></FlyIn>
    </g>
  );
};

// 4e: the new world map
export const NewMap: React.FC<ActProps> = ({f, at}) => {
  const open = ramp(f, 2, 30);
  return (
    <g>
      <Space f={f} seed={85} />
      <g transform={`translate(960 560) scale(${lerp(0.2, 1, open)} 1) translate(-960 -560)`} opacity={open}>
        <rect x={210} y={180} width={1500} height={760} rx={40} fill={N.blue} />
        <path d="M 210 420 Q 600 380 960 430 Q 1320 470 1710 410 L 1710 700 Q 1300 740 960 690 Q 600 650 210 710 Z" fill={N.orange} />
        <path d="M 210 470 Q 600 440 960 480 Q 1320 520 1710 460 L 1710 650 Q 1300 690 960 640 Q 600 600 210 660 Z" fill={N.green} opacity={0.7} />
        {Array.from({length: 10}, (_, i) => <circle key={i} cx={300 + i * 150} cy={300 + (i % 2) * 30} r={6} fill={N.cyan} opacity={0.6} />)}
        <rect x={210} y={180} width={1500} height={760} rx={40} fill="none" stroke={N.cyan} strokeWidth={8} />
      </g>
      <FlyIn f={f} at={at('Norden') - 6} from="t" dist={600}><Banner x={960} y={290} text="Nordozean" color={N.blue} size={52} /></FlyIn>
      <FlyIn f={f} at={at('Süden') - 6} from="b" dist={600}><Banner x={960} y={850} text="Südozean" color={N.blue} size={52} /></FlyIn>
      <FlyIn f={f} at={at('riesigen') - 6} from="r" dist={1400}><Banner x={960} y={560} text="ein Kontinent rund um die Erde" color={N.magenta} size={52} /></FlyIn>
    </g>
  );
};

// ---------------------------------------------------------------------------------------
// 5a: the earth orbits but does not turn: one day per year
export const YearOrbit: React.FC<ActProps> = ({f, at}) => {
  const a = -Math.PI / 2 + f * 0.012;
  const ex = 960 + Math.cos(a) * 620; const ey = 560 + Math.sin(a) * 300;
  const sunA = Math.atan2(560 - ey, 960 - ex);
  return (
    <g>
      <Space f={f} seed={87} />
      <ellipse cx={960} cy={560} rx={620} ry={300} fill="none" stroke={N.violet} strokeWidth={4} strokeDasharray="16 18" />
      <NeonSun f={f} x={960} y={560} r={130} />
      <NeonEarth f={f} x={ex} y={ey} r={80} face={false} id="c5o" />
      <path d={`M ${ex + Math.cos(sunA + Math.PI / 2) * 80} ${ey + Math.sin(sunA + Math.PI / 2) * 80} A 80 80 0 0 0 ${ex + Math.cos(sunA - Math.PI / 2) * 80} ${ey + Math.sin(sunA - Math.PI / 2) * 80} Z`}
        fill={N.deep} opacity={0.75} transform={`rotate(180 ${ex} ${ey})`} />
      <line x1={ex} y1={ey - 80} x2={ex} y2={ey - 130} stroke={N.cream} strokeWidth={6} />
      <path d={`M ${ex} ${ey - 130} l 34 10 l -34 10 Z`} fill={N.magenta} />
      <Pop f={f} at={at('Einmal') - 6} x={960} y={110} out={at('Deshalb')}><Banner x={960} y={110} text="1 Runde = 1 Jahr" color={N.blue} size={56} /></Pop>
      <Pop f={f} at={at('ganzes') - 6} x={960} y={110}><Banner x={960} y={110} text="1 Tag = 1 Jahr" color={N.orange} size={64} /></Pop>
    </g>
  );
};

// 5b: half a year of day, half a year of night
export const DayNight: React.FC<ActProps> = ({f, at}) => {
  const hot = ramp(f, at('heizt') - 6, 60);
  const cold = ramp(f, at('kälter') - 6, 50);
  return (
    <g>
      <Space f={f} seed={89} />
      <FlyIn f={f} at={at('halbes', 0) - 6} from="l" dist={1200}>
        <Vignette f={f} x={560} y={560} r={320} id="c5v1">
          <rect x={200} y={200} width={720} height={720} fill="#ff9a3a" />
          <circle cx={560} cy={360} r={110} fill={N.yellow} />
          <Glow cx={560} cy={360} r={260} color={N.yellow} o={0.8} />
          <path d="M 200 720 Q 400 640 560 700 Q 720 760 920 680 L 920 920 L 200 920 Z" fill={lerp(0, 1, hot) > 0.5 ? '#c84a1a' : '#e8602a'} />
          {Array.from({length: 5}, (_, i) => <path key={i} d={`M ${300 + i * 100} ${680 - ((f * 2 + i * 20) % 80)} q 10 -20 0 -40`} stroke="#fff0c0" strokeWidth={6} fill="none" opacity={0.3 + 0.4 * hot} />)}
          <Thermo x={800} y={860} lvl={lerp(0.4, 0.98, hot)} hot s={0.9} />
        </Vignette>
        <Lbl x={560} y={960} size={58} color={N.yellow}>½ Jahr Tag</Lbl>
      </FlyIn>
      <FlyIn f={f} at={at('halbes', 1) - 6} from="r" dist={1200}>
        <Vignette f={f} x={1360} y={560} r={320} id="c5v2">
          <rect x={1000} y={200} width={720} height={720} fill={N.navy} />
          {Array.from({length: 40}, (_, i) => <circle key={i} cx={1000 + rnd(i) * 720} cy={200 + rnd(i * 3) * 400} r={3} fill={N.cream} opacity={0.4 + 0.5 * Math.abs(Math.sin(f * 0.1 + i))} />)}
          <path d="M 1000 720 Q 1200 660 1360 700 Q 1540 750 1720 680 L 1720 920 L 1000 920 Z" fill="#cfe0ff" />
          {[0, 1, 2].map((i) => <path key={i} d={`M ${1080 + i * 200} 720 l 60 -140 l 60 140 Z`} fill="#e8f0ff" />)}
          <Thermo x={1600} y={860} lvl={lerp(0.4, 0.03, cold)} hot={false} s={0.9} />
        </Vignette>
        <Lbl x={1360} y={960} size={58} color={N.cyan}>½ Jahr Nacht</Lbl>
      </FlyIn>
    </g>
  );
};

// 5c: the twilight strip crawls at walking pace; you could walk with the sunset
export const Twilight: React.FC<ActProps> = ({f, at}) => {
  const walk = ramp(f, at('Schrittgeschwindigkeit') - 20, 20);
  const tx = 960 + f * 0.6;
  return (
    <g>
      <defs>
        <linearGradient id="tw5" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffb05a" /><stop offset="0.45" stopColor="#ff5f8a" /><stop offset="0.55" stopColor="#5a2a9a" /><stop offset="1" stopColor={N.deep} />
        </linearGradient>
      </defs>
      <g opacity={1 - walk}>
        <Space f={f} seed={91} />
        <NeonEarth f={f} x={960} y={560} r={400} id="c5t" face={false} />
        <defs><clipPath id="c5tc"><circle cx={960} cy={560} r={400} /></clipPath></defs>
        <g clipPath="url(#c5tc)">
          <rect x={tx} y={100} width={900} height={920} fill={N.deep} opacity={0.7} />
          <rect x={tx - 60} y={100} width={120} height={920} fill="#ff5f8a" opacity={0.45} />
        </g>
        <Pop f={f} at={at('Dämmerung') - 6} x={tx} y={90}><Banner x={tx} y={90} text="ewige Dämmerung" color={N.magenta} size={48} /></Pop>
        <FlyIn f={f} at={at('fünf') - 6} from="r" dist={1000}><Banner x={1500} y={980} text="≈ 5 km/h" color={N.orange} size={60} /></FlyIn>
      </g>
      <g opacity={walk}>
        <rect x={-400} y={-400} width={2720} height={1880} fill="url(#tw5)" />
        <circle cx={760} cy={720} r={110} fill={N.yellow} opacity={0.9} />
        <Glow cx={760} cy={720} r={260} color={N.orange} o={0.7} />
        <rect x={-400} y={760} width={2720} height={700} fill="#3a1a5a" />
        {Array.from({length: 12}, (_, i) => <rect key={i} x={((i * 200 - f * 4) % 2400 + 2400) % 2400 - 200} y={800} width={90} height={12} rx={6} fill={N.pink} opacity={0.5} />)}
        <Character f={f} x={1000} y={770} s={1.6} {...DU} mood="joy" walk={1} look={{x: -0.6, y: 0}} />
        <Pop f={f} at={at('herlaufen') - 8} x={1400} y={180}><Banner x={1400} y={180} text="neben dem Sonnenuntergang her" color={N.violet} size={44} /></Pop>
      </g>
    </g>
  );
};

// ---------------------------------------------------------------------------------------
// 6: the magnetic shield from the iron core
export const Shield: React.FC<ActProps> = ({f, at}) => {
  const lines = ramp(f, at('Magnetfeld') - 8, 20);
  const core = ramp(f, at('Eisenkern') - 10, 20);
  const weak = ramp(f, at('schwächer') - 6, 30);
  const wind = ramp(f, at('Teilchen') - 10, 20);
  const field = lines * (1 - 0.75 * weak);
  const cx = 960; const cy = 560;
  return (
    <g>
      <Space f={f} seed={93} />
      {[1, 1.6, 2.3, 3.1].map((k, i) => [-1, 1].map((side) => (
        <path key={`${i}${side}`} d={`M ${cx} ${cy - 250} C ${cx + side * 250 * k} ${cy - 330 * k} ${cx + side * 250 * k} ${cy + 330 * k} ${cx} ${cy + 250}`}
          fill="none" stroke={N.cyan} strokeWidth={6} strokeDasharray="24 18" strokeDashoffset={-f * 3} opacity={field * (0.9 - i * 0.15)} />
      )))}
      <NeonEarth f={f} x={cx} y={cy} r={250} id="c6g" mood={[[0, 'neutral'], [at('schwächer'), 'worried']]} face={core < 0.5} />
      <g opacity={core}>
        <path d={`M ${cx} ${cy} L ${cx + 250} ${cy} A 250 250 0 0 0 ${cx} ${cy - 250} Z`} fill="#3a1a2a" />
        <circle cx={cx} cy={cy} r={120} fill="#c04a1a" />
        <circle cx={cx} cy={cy} r={70} fill={N.orange} />
        {[0, 1, 2].map((k) => <path key={k} d={`M ${cx + 40 + k * 20} ${cy} A ${40 + k * 20} ${40 + k * 20} 0 1 1 ${cx} ${cy - 40 - k * 20}`} stroke={N.yellow} strokeWidth={6} fill="none" strokeDasharray="20 14" strokeDashoffset={-f * 4} transform={`rotate(${f * 2} ${cx} ${cy})`} />)}
        <Glow cx={cx} cy={cy} r={140} color={N.orange} o={0.7} />
      </g>
      {/* solar particles: deflected around the field while it is strong, hitting the earth when weak */}
      {wind > 0 && Array.from({length: 46}, (_, i) => {
        const t = ((f * 0.018 + rnd(i)) % 1);
        const y0 = 160 + rnd(i * 3) * 800;
        const x = lerp(-100, 2000, t);
        const dist = Math.hypot(x - cx, y0 - cy);
        const defl = (1 - weak) * Math.max(0, 1 - dist / 700) * (y0 < cy ? -260 : 260);
        const hit = weak > 0.5 && dist < 270;
        return hit ? null : <circle key={i} cx={x} cy={y0 + defl} r={6 + rnd(i * 5) * 6} fill={i % 3 ? N.magenta : N.orange} opacity={wind} />;
      })}
      {weak > 0.5 && [0, 1, 2].map((k) => <Burst key={k} f={f} at={at('Strahlung') + k * 10} x={cx - 230} y={cy - 80 + k * 80} color={N.magenta} r={90} n={10} />)}
      <Pop f={f} at={at('Magnetfeld') - 6} x={960} y={100} out={at('Eisenkern') - 4}><Banner x={960} y={100} text="Magnetfeld" color={N.blue} size={56} /></Pop>
      <Pop f={f} at={at('Eisenkern') - 4} x={1460} y={300}><Banner x={1460} y={300} text="flüssiger Eisenkern" color={N.orange} size={46} /></Pop>
      <FlyIn f={f} at={at('Teilchen') - 6} from="l" dist={900}><Banner x={420} y={100} text="Teilchen der Sonne" color={N.magenta} size={46} /></FlyIn>
    </g>
  );
};

export {Character, Burst};
