// The hook: an ordinary noon at the equator, the earth stops, you lift off, the question,
// a fast teaser montage of everything the video will show, the title.
import React from 'react';
import {Character, Face, Glow, rnd} from '../../design/kit';
import {ActProps, Banner, N, NeonRing, Vignette, lerp, ramp} from '../../design/flow';
import {Arrow, Burst, Car, Crossers, DU, FlyIn, House, Lbl, NTree, NeonEarth, NeonSun, Pop, Space, Swarm, Thermo} from '../stopp/neon';

const P1 = {skin: N.skinDark, hair: N.ink, hairStyle: 'curly' as const, shirt: N.orange, pants: N.navy, seed: 221};
const P2 = {skin: N.skin, hair: N.yellow, hairStyle: 'pony' as const, shirt: N.magenta, pants: N.ink, seed: 222};
const P3 = {skin: '#d98a60', hair: N.ink, hairStyle: 'bun' as const, shirt: N.green, pants: N.navy, seed: 223};

const Bird: React.FC<{f: number; x: number; y: number; s?: number; ph?: number}> = ({f, x, y, s = 1, ph = 0}) => {
  const w = Math.sin(f * 0.35 + ph) * 14;
  return <path transform={`translate(${x} ${y}) scale(${s})`} d={`M -26 ${-w} Q -12 -6 0 0 Q 12 -6 26 ${-w}`} stroke={N.cream} strokeWidth={5} fill="none" strokeLinecap="round" />;
};

// a1, a2: noon in a neon city on the equator
export const CityNoon: React.FC<ActProps> = ({f, at}) => {
  const z = lerp(1.2, 1.32, ramp(f, 0, 300));
  const red = f < at('Ampel') + 40;
  return (
    <g transform={`translate(960 600) scale(${z}) translate(-960 -680)`}>
      <defs><linearGradient id="noonSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2a1070" /><stop offset="1" stopColor="#ff5fa8" /></linearGradient></defs>
      <rect x={-400} y={-400} width={2720} height={1880} fill="url(#noonSky)" />
      <NeonSun f={f} x={760} y={250} r={80} />
      {/* the sea with birds */}
      <rect x={-400} y={560} width={2720} height={200} fill={N.blue} />
      {Array.from({length: 8}, (_, i) => <path key={i} d={`M ${-200 + i * 300 + ((f * 1.5) % 300)} 620 q 30 -14 60 0`} stroke={N.cyan} strokeWidth={5} fill="none" opacity={0.6} />)}
      {[0, 1, 2, 3].map((i) => <Bird key={i} f={f} x={((f * 2.4 + i * 160) % 2400) - 200} y={420 + (i % 2) * 40} s={0.9} ph={i} />)}
      {/* buildings */}
      {Array.from({length: 7}, (_, i) => {
        const x = 40 + i * 270; const h = 300 + ((i * 53) % 4) * 60;
        return (
          <g key={i}>
            <rect x={x} y={760 - h} width={200} height={h} fill={[N.violet, N.navy, N.magenta, '#3a1a8a'][i % 4]} />
            {Array.from({length: Math.floor(h / 70)}, (_, k) => [0, 1, 2].map((c) => <rect key={`${k}${c}`} x={x + 24 + c * 56} y={760 - h + 30 + k * 70} width={34} height={34} rx={4} fill={N.yellow} opacity={0.75} />))}
          </g>
        );
      })}
      <g transform="translate(1200 350)"><rect x={-110} y={-50} width={220} height={100} rx={20} fill={N.ink} /><Lbl x={0} y={22} size={64} color={N.cyan}>12:00</Lbl></g>
      {/* street */}
      <rect x={-400} y={760} width={2720} height={700} fill="#24164e" />
      {Array.from({length: 10}, (_, i) => <rect key={i} x={-200 + i * 240} y={900} width={120} height={14} rx={7} fill={N.cream} opacity={0.5} />)}
      {/* traffic light */}
      <g transform="translate(1480 760)">
        <rect x={-10} y={-300} width={20} height={300} fill={N.ink} />
        <rect x={-40} y={-420} width={80} height={170} rx={20} fill={N.ink} />
        <circle cx={0} cy={-380} r={24} fill={red ? N.red : '#3a1a2a'} />
        <circle cx={0} cy={-300} r={24} fill={red ? '#1a3a2a' : N.green} />
        <Glow cx={0} cy={red ? -380 : -300} r={70} color={red ? N.red : N.green} o={0.7} />
      </g>
      <Car x={1640 + (red ? 0 : (f - at('Ampel') - 40) * 6)} y={940} s={1.1} c={N.orange} />
      <Car x={1920 + (red ? 0 : (f - at('Ampel') - 40) * 6)} y={940} s={1.1} c={N.cyan} />
      <FlyIn f={f} at={at('Menschen') - 6} from="l" dist={900}>
        <Character f={f} x={400 + f * 1.6} y={1000} s={1.1} {...P1} mood="happy" walk={0.7} talk />
        <Character f={f} x={560 + f * 1.6} y={1000} s={1.0} {...P2} mood="joy" walk={0.7} arms="hold"
          rightHand={<g><rect x={-30} y={-50} width={60} height={56} rx={8} fill={N.yellow} /><rect x={-16} y={-66} width={32} height={20} rx={8} fill="none" stroke={N.yellow} strokeWidth={6} /></g>} />
      </FlyIn>
      <FlyIn f={f} at={at('Autos') - 6} from="r" dist={900}>
        <Character f={f} x={1100} y={1010} s={1.15} {...DU} mood="happy" look={{x: -0.4, y: -0.3}} />
        <Character f={f} x={1260} y={1004} s={1.0} {...P3} mood="curious" talk />
      </FlyIn>
    </g>
  );
};

// a3, a4: zoom out to the whole planet, which stops dead
export const StopGlobe: React.FC<ActProps> = ({f, at}) => {
  const stop = at('Sekunde') + 4;
  const spin = Math.min(f, stop) * 9 + (f > stop ? 26 * Math.exp(-(f - stop) / 6) * Math.sin((f - stop) * 0.9) : 0);
  const shake = f > stop && f < stop + 26 ? (1 - (f - stop) / 26) * 18 * Math.sin((f - stop) * 2.1) : 0;
  const z = lerp(2.4, 1.0, ramp(f, 0, 50)) + (f > stop ? 0.06 * ramp(f, stop, 30) : 0);
  const flash = f > stop ? Math.max(0, 1 - (f - stop) / 8) : 0;
  return (
    <g>
      <Space f={f} seed={1} />
      <Crossers f={f} n={10} speed={6} color={N.violet} size={6} seed={3} />
      <g transform={`translate(${960 + shake} 560) scale(${z}) translate(-960 -560)`}>
        <ellipse cx={960} cy={560} rx={470} ry={70} fill="none" stroke={N.cyan} strokeWidth={6} strokeDasharray="30 26" strokeDashoffset={-spin * 1.6} opacity={0.75} />
        <NeonEarth f={f} x={960} y={560} r={380} spin={spin} id="hg" mood={[[0, 'happy'], [stop - 8, 'shocked']]} />
        {f < stop && [0, 1, 2].map((k) => <path key={k} d={`M ${1380 + k * 30} ${380 + k * 120} q 60 ${80 - k * 40} 0 ${180 - k * 60}`} stroke={N.cream} strokeWidth={8} fill="none" strokeLinecap="round" opacity={0.45} />)}
        <Burst f={f} at={stop} x={1340} y={560} color={N.orange} r={280} n={22} />
        <Burst f={f} at={stop} x={580} y={560} color={N.orange} r={280} n={22} />
      </g>
      <rect x={-200} y={-200} width={2320} height={1480} fill={N.white} opacity={flash * 0.75} />
      <FlyIn f={f} at={at('langsam') - 4} from="r" dist={1200} out={at('Sondern')}><Banner x={1460} y={160} text="nicht langsam …" color={N.violet} size={50} /></FlyIn>
      <Pop f={f} at={at('Sekunde') - 6} x={960} y={980}><Banner x={960} y={980} text="… sondern sofort" color={N.magenta} size={56} /></Pop>
    </g>
  );
};

// a5: close on your feet: the ground stops, you do not
export const Feet: React.FC<ActProps> = ({f, at}) => {
  const stop = at('stehen') + 2;
  const go = at('nicht') ;
  const lift = Math.max(0, f - go);
  const streamV = f < stop ? f * 40 : stop * 40;
  return (
    <g>
      <Space f={f} seed={7} stream={streamV} />
      <rect x={-400} y={760} width={2720} height={700} fill="#2a1a5a" />
      {Array.from({length: 14}, (_, i) => <rect key={i} x={((i * 220 - (f < stop ? f * 40 : stop * 40)) % 2600 + 2600) % 2600 - 300} y={790} width={120} height={16} rx={8} fill={N.green} opacity={0.6} />)}
      <rect x={-400} y={752} width={2720} height={16} fill={N.green} />
      <g transform={`translate(${lift * 26 + 0.4 * lift * lift} ${-Math.min(260, lift * 9)}) rotate(${lift * 1.8} 960 760)`}>
        <Character f={f} x={960} y={764} s={2.6} {...DU} mood={[[0, 'happy'], [stop, 'shocked']]} arms={f > go ? 'up' : 'down'} />
      </g>
      <Burst f={f} at={stop} x={960} y={760} color={N.red} r={260} />
      {f > go && Array.from({length: 6}, (_, i) => <line key={i} x1={700 - i * 30 + lift * 26} y1={300 + i * 70} x2={300 - i * 30 + lift * 20} y2={300 + i * 70} stroke={N.cream} strokeWidth={8} strokeLinecap="round" opacity={0.4} />)}
      <Pop f={f} at={stop - 4} x={480} y={180}><Banner x={480} y={180} text="Boden: 0 km/h" color={N.green} size={50} /></Pop>
      <Pop f={f} at={go - 2} x={1440} y={180}><Banner x={1440} y={180} text="Du: 1.670 km/h" color={N.orange} size={50} /></Pop>
    </g>
  );
};

// a6, a7 (+ the inserted pause): quick flashes of what is coming, then the title
const Flash: React.FC<{f: number; kind: number}> = ({f, kind}) => {
  const bg = [N.bg, '#160a36', '#140a30', '#1b0b3b', '#2a1070', '#0b0a2a', '#14204a', '#1b0b3b', '#06163a', '#202a4a'][kind];
  return (
    <g>
      <rect x={-400} y={-400} width={2720} height={1880} fill={bg} />
      {kind === 0 && <><House x={760 + f * 20} y={700 - f * 6} s={1.6} /><Car x={1200 + f * 26} y={760 - f * 4} s={1.4} /><Crossers f={f} n={20} speed={-30} color={N.orange} seed={1} /></>}
      {kind === 1 && <><NeonEarth f={f} x={960} y={540} r={330} id="tz1" mood="worried" />{[0, 1, 2].map((k) => <ellipse key={k} cx={960} cy={540 - 120 + k * 120} rx={430} ry={50} fill="none" stroke={N.cyan} strokeWidth={10} strokeDasharray="60 40" strokeDashoffset={-f * 40} />)}</>}
      {kind === 2 && <><path d={`M -200 1100 L -200 700 C 300 500 800 260 1100 300 C 1300 330 1300 500 1180 560 C 1500 700 1700 900 2100 1000 L 2100 1100 Z`} fill={N.blue} /><path d="M 1100 300 C 1300 330 1300 500 1180 560" stroke={N.white} strokeWidth={24} fill="none" strokeLinecap="round" /></>}
      {kind === 3 && <><rect x={260} y={180} width={1400} height={720} rx={40} fill={N.blue} /><path d="M 260 420 Q 960 360 1660 420 L 1660 660 Q 960 720 260 660 Z" fill={N.orange} /></>}
      {kind === 4 && <><rect x={-400} y={700} width={2720} height={700} fill="#e8602a" /><NeonSun f={f} x={960} y={360} r={170} mood="determined" /></>}
      {kind === 5 && <><rect x={-400} y={700} width={2720} height={700} fill="#cfe0ff" />{[0, 1, 2, 3].map((i) => <path key={i} d={`M ${300 + i * 400} 700 l 120 -260 l 120 260 Z`} fill="#eef4ff" />)}{Array.from({length: 60}, (_, i) => <circle key={i} cx={rnd(i) * 1920} cy={rnd(i * 3) * 600} r={3} fill={N.cream} />)}</>}
      {kind === 6 && <><rect x={-400} y={-400} width={2720} height={1880} fill="#ff8a4a" /><rect x={960} y={-400} width={1400} height={1880} fill={N.navy} /><Character f={f} x={900 + f * 3} y={900} s={1.8} {...DU} mood="determined" walk={1} /></>}
      {kind === 7 && <><NeonEarth f={f} x={960} y={540} r={260} id="tz7" face={false} />{[1, 1.6, 2.3].map((k, i) => [-1, 1].map((sd) => <path key={`${i}${sd}`} d={`M 960 290 C ${960 + sd * 260 * k} ${540 - 330 * k} ${960 + sd * 260 * k} ${540 + 330 * k} 960 790`} fill="none" stroke={N.cyan} strokeWidth={8} opacity={0.8} />))}<Swarm f={f} x={300} y={540} r={200} color={N.magenta} n={40} /></>}
      {kind === 8 && <><Glow cx={960} cy={760} r={400} color={N.orange} o={0.6} /><path d="M 830 1080 L 900 700 L 1020 700 L 1090 1080 Z" fill="#3a2a2a" />{Array.from({length: 7}, (_, i) => <g key={i}><rect x={560 + i * 50} y={860 - (i % 3) * 40} width={20} height={220} rx={10} fill={N.cream} /><circle cx={570 + i * 50} cy={850 - (i % 3) * 40} r={16} fill={N.red} /></g>)}</>}
      {kind === 9 && <><rect x={360} y={260} width={1200} height={560} rx={40} fill="#2c3a6a" />{[0, 1, 2, 3].map((i) => <rect key={i} x={420 + i * 280} y={300} width={200} height={20} rx={8} fill={N.magenta} />)}<Glow cx={960} cy={400} r={400} color={N.magenta} o={0.4} /><Character f={f} x={960} y={800} s={1.6} {...DU} mood="worried" /></>}
    </g>
  );
};
export const Teaser: React.FC<ActProps & {titleAt: number}> = ({f, at, titleAt}) => {
  const t0 = at('Und') + 4;
  const step = 11;
  const k = Math.floor((f - t0) / step);
  const inMontage = f >= t0 && k < 10;
  const title = ramp(f, titleAt, 14);
  return (
    <g>
      {!inMontage && f < t0 && (
        <g>
          <Space f={f} seed={41} />
          <NeonEarth f={f} x={960} y={560} r={300} id="tq" mood="curious" />
          <FlyIn f={f} at={at('uns') - 4} from="l" dist={1200}><Banner x={420} y={260} text="uns" color={N.orange} size={60} /></FlyIn>
          <FlyIn f={f} at={at('Luft') - 4} from="r" dist={1200}><Banner x={1500} y={260} text="Luft" color={N.cyan} size={60} /></FlyIn>
          <FlyIn f={f} at={at('Meeren') - 4} from="b" dist={900}><Banner x={960} y={960} text="Meere" color={N.blue} size={60} /></FlyIn>
        </g>
      )}
      {inMontage && (
        <g>
          <g transform={`translate(960 540) scale(${1.15 - 0.15 * ((f - t0) % step) / step}) translate(-960 -540)`}><Flash f={(f - t0) % step + 5} kind={k} /></g>
          <rect x={-400} y={-400} width={2720} height={1880} fill={N.white} opacity={Math.max(0, 0.5 - ((f - t0) % step) * 0.12)} />
        </g>
      )}
      {f >= t0 + step * 10 && (
        <g>
          <Space f={f} seed={43} />
          <Swarm f={f} x={960} y={540} r={800} color={N.violet} n={70} seed={2} o={0.5} />
          <g opacity={ramp(f, t0 + step * 10, 10)}>
            <NeonEarth f={f} x={960} y={600} r={240} id="tt" mood="shocked" />
            <NeonRing x={960} y={600} r={290} w={14} spin={f} />
          </g>
          <g opacity={title}>
            <Banner x={960} y={190} text="Was wäre, wenn …" color={N.magenta} size={70} show={title} />
            <Lbl x={960} y={960} size={74} color={N.cream} o={title}>die Erde aufhört, sich zu drehen?</Lbl>
          </g>
        </g>
      )}
    </g>
  );
};

export {Arrow, Face, NTree, Thermo, Vignette};
