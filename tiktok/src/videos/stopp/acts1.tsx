// Acts 1-5: the earth stops, everything flies on, the storm, the waves, the oceans move to the poles
import React from 'react';
import {Character, Face, Glow, rnd} from '../../design/kit';
import {ActProps, Banner, N, NeonRing, Vignette, clamp01, lerp, ramp} from '../../design/flow';
import {Arrow, Burst, Car, Crossers, DU, FlyIn, House, Lbl, NTree, NeonEarth, Pop, Space, Swarm} from './neon';

// ---------------------------------------------------------------------------------------
// 1: the spinning earth stops dead
export const Globe: React.FC<ActProps> = ({f, at}) => {
  const stop = at('Sekunde') + 4;
  const spinV = f < stop ? 9 : 0;
  const spin = Math.min(f, stop) * 9 + (f > stop ? 26 * Math.exp(-(f - stop) / 6) * Math.sin((f - stop) * 0.9) : 0);
  const shake = f > stop && f < stop + 26 ? (1 - (f - stop) / 26) * 16 * Math.sin((f - stop) * 2.1) : 0;
  const z = lerp(0.82, 1.0, ramp(f, 0, 90)) + (f > stop ? 0.06 * ramp(f, stop, 30) : 0);
  const flash = f > stop ? Math.max(0, 1 - (f - stop) / 8) : 0;
  return (
    <g>
      <Space f={f} seed={1} />
      <Crossers f={f} n={8} speed={6} color={N.violet} size={6} seed={3} />
      <g transform={`translate(${960 + shake} 560) scale(${z}) translate(-960 -560)`}>
        {/* equator speed ring */}
        <ellipse cx={960} cy={560} rx={470} ry={70} fill="none" stroke={N.cyan} strokeWidth={6} strokeDasharray="30 26" strokeDashoffset={-spin * 1.6} opacity={0.75} />
        <NeonEarth f={f} x={960} y={560} r={380} spin={spin} id="g1" mood={[[0, 'happy'], [stop - 8, 'shocked']]} />
        {spinV > 0 && [0, 1, 2].map((k) => (
          <path key={k} d={`M ${1380 + k * 30} ${380 + k * 120} q 60 ${80 - k * 40} 0 ${180 - k * 60}`} stroke={N.cream} strokeWidth={8} fill="none" strokeLinecap="round" opacity={0.45} />
        ))}
        <Burst f={f} at={stop} x={1340} y={560} color={N.orange} r={260} n={20} />
        <Burst f={f} at={stop} x={580} y={560} color={N.orange} r={260} n={20} />
      </g>
      <rect x={-200} y={-200} width={2320} height={1480} fill={N.white} opacity={flash * 0.7} />
      <Banner x={960} y={110} text="Was wäre wenn?" color={N.magenta} show={ramp(f, at('Was') - 4, 14)} />
    </g>
  );
};

// ---------------------------------------------------------------------------------------
// 2: on the surface at the equator: everything races along, then the ground stops and all flies east
const GROUND = 820;
export const Surface: React.FC<ActProps> = ({f, at}) => {
  const stop = at('stoppt') + 2;
  const moving = f < stop;
  const flow = Math.min(f, stop);
  const launch = (word: string, delay = 0) => Math.max(0, f - (at(word) + delay));
  const fly = (t: number, vx: number, vy: number) => ({dx: vx * t + 0.02 * t * t, dy: Math.min(0, -vy * t + 0.12 * t * t), rot: t * 3});
  const P = fly(launch('Menschen'), 11, 6);
  const Cc = fly(launch('Autos'), 13, 4);
  const Hh = fly(launch('Häuser'), 9, 5);
  const Tt = fly(launch('Bäume'), 10, 6);
  const camX = lerp(0, 760, ramp(f, at('Menschen'), 170));
  const boden = ramp(f, at('Boden'), 8) * (1 - ramp(f, at('Luft') + 10, 10));
  const luft = ramp(f, at('Luft'), 8) * (1 - ramp(f, at('Meer') + 14, 10));
  const meer = ramp(f, at('Meer'), 8) * (1 - ramp(f, stop, 10));
  const fels = ramp(f, at('Fels') - 4, 12);
  const red = f > stop ? Math.max(0, 1 - (f - stop) / 14) : 0;
  return (
    <g>
      <Space f={f} seed={5} stream={moving ? flow * 30 : stop * 30} />
      <g transform={`translate(960 940) scale(1.45) translate(${-960 - camX} -820)`}>
        {/* air streams */}
        {Array.from({length: 7}, (_, i) => (
          <path key={i} d={`M -300 ${260 + i * 70} C 300 ${230 + i * 70} 900 ${300 + i * 70} 2600 ${250 + i * 70}`} stroke={N.cyan} strokeWidth={5} fill="none"
            strokeDasharray="60 90" strokeDashoffset={-f * (moving ? 24 : 34)} opacity={0.15 + 0.6 * luft + (f > at('Menschen') ? 0.3 : 0)} />
        ))}
        {/* the plane, slower than the ground: it falls back */}
        <FlyIn f={f} at={at('Verkehrsflugzeug') - 10} from="r" dist={900}>
          <g transform={`translate(${1500 - Math.max(0, f - at('Verkehrsflugzeug')) * 3} 400)`}>
            <path d="M -110 0 Q -110 -22 -70 -22 L 90 -22 Q 130 -16 140 0 Q 130 16 90 22 L -70 22 Q -110 22 -110 0 Z" fill={N.cream} />
            <path d="M -10 0 L -60 -80 L -20 -80 L 40 0 Z M -10 4 L -60 80 L -20 80 L 40 4 Z" fill={N.pink} />
            <Lbl x={20} y={-60} size={34} color={N.cream}>Flugzeug ≈ 900 km/h</Lbl>
          </g>
        </FlyIn>
        {/* the planet surface */}
        <circle cx={1200} cy={GROUND + 3000} r={3000} fill="#1a3a6a" />
        <path d={`M -900 ${GROUND + 60} Q 1200 ${GROUND - 120} 3300 ${GROUND + 60}`} stroke={N.green} strokeWidth={14} fill="none" opacity={0.6 + 0.4 * boden} />
        <rect x={-900} y={GROUND + 120} width={4200} height={600} fill="#2a1a4a" />
        {/* bedrock cutaway with golden outline */}
        <g opacity={fels}>
          <rect x={-900} y={GROUND + 120} width={4200} height={600} fill="#4a2a5a" />
          {Array.from({length: 18}, (_, i) => <path key={i} d={`M ${-800 + i * 240} ${GROUND + 160} l 80 40 l -40 60 l 120 20`} stroke="#6a3a7a" strokeWidth={10} fill="none" />)}
          <rect x={180} y={GROUND + 130} width={1500} height={420} fill="none" stroke={N.yellow} strokeWidth={6} strokeDasharray="22 14" />
          <Lbl x={930} y={GROUND + 360} size={64} color={N.yellow}>Fels bleibt stehen</Lbl>
        </g>
        {/* the sea on the right */}
        <path d={`M 1700 ${GROUND + 20} Q 1900 ${GROUND - 20 + 10 * Math.sin(f * 0.2)} 2100 ${GROUND + 10} T 2800 ${GROUND} L 2800 ${GROUND + 200} L 1700 ${GROUND + 200} Z`} fill={N.blue} />
        <path d={`M 1700 ${GROUND + 20} Q 1900 ${GROUND - 20 + 10 * Math.sin(f * 0.2)} 2100 ${GROUND + 10} T 2800 ${GROUND}`} stroke={N.cyan} strokeWidth={8} fill="none" opacity={0.5 + 0.5 * meer} />
        {/* objects; they launch one by one */}
        <g transform={`translate(${Hh.dx} ${Hh.dy}) rotate(${Hh.rot} 600 ${GROUND})`}><House x={600} y={GROUND + 6} s={1.15} /></g>
        <g transform={`translate(${Tt.dx} ${Tt.dy}) rotate(${Tt.rot} 860 ${GROUND})`}><NTree x={860} y={GROUND + 8} s={1.2} /></g>
        <g transform={`translate(${Cc.dx} ${Cc.dy}) rotate(${Cc.rot * 0.6} 1300 ${GROUND})`}><Car x={1300} y={GROUND + 8} s={1.1} /></g>
        <g transform={`translate(${P.dx} ${P.dy}) rotate(${P.rot * 1.4} 1060 ${GROUND - 120})`}>
          <Character f={f} x={1060} y={GROUND + 4} s={1.05} {...DU} mood={[[0, 'happy'], [stop - 4, 'shocked']]} arms={f > stop ? 'up' : 'wave'} />
        </g>
        {/* speed arrows under everything while it moves together */}
        {[600, 860, 1060, 1300].map((x, i) => (
          <Arrow key={i} x1={x - 70} y1={GROUND + 70} x2={x + 90} y2={GROUND + 70} color={N.yellow} w={9} o={(1 - ramp(f, at('Menschen'), 10)) * ramp(f, 10 + i * 6, 10)} />
        ))}
        <Pop f={f} at={at('1.670') - 6} x={1060} y={560} out={stop}><Banner x={1060} y={560} text="1.670 km/h" color={N.orange} size={56} /></Pop>
        {boden > 0 && <Lbl x={960} y={GROUND + 230} size={60} color={N.green} o={boden}>Boden</Lbl>}
        {luft > 0 && <Lbl x={760} y={470} size={60} color={N.cyan} o={luft}>Luft</Lbl>}
        {meer > 0 && <Lbl x={2100} y={GROUND - 80} size={60} color={N.cyan} o={meer}>Meer</Lbl>}
        <rect x={-900} y={GROUND + 40} width={4200} height={60} fill={N.red} opacity={red * 0.6} />
        <Burst f={f} at={stop} x={1060} y={GROUND} color={N.red} r={300} />
        <Crossers f={Math.max(0, f - at('Menschen'))} n={f > at('Menschen') ? 26 : 0} speed={-30} color={N.orange} y0={300} y1={800} seed={7} size={12} />
      </g>
      <FlyIn f={f} at={at('Osten') - 4} from="l" dist={1200}>
        <Banner x={1500} y={130} text="nach Osten →" color={N.magenta} size={60} />
      </FlyIn>
    </g>
  );
};

// ---------------------------------------------------------------------------------------
// 3: the storm wraps the earth, strongest at the equator
export const Storm: React.FC<ActProps> = ({f, at}) => {
  const shift = ramp(f, at('stärksten') - 10, 30);
  const gx = lerp(960, 640, shift);
  const lats = [60, 40, 20, 0, -20, -40, -60];
  const boom = at('Schall');
  return (
    <g>
      <Space f={f} seed={9} />
      <Crossers f={f} n={30} speed={22} color={N.cyan} y0={300} y1={800} seed={11} size={8} />
      <g>
        {lats.map((la, i) => {
          const k = Math.cos((la * Math.PI) / 180);
          const y = 560 - Math.sin((la * Math.PI) / 180) * 380;
          return (
            <ellipse key={i} cx={gx} cy={y} rx={380 * k + 70 * k} ry={40 * k} fill="none" stroke={N.cyan} strokeWidth={4 + 8 * k}
              strokeDasharray={`${40 + 60 * k} 50`} strokeDashoffset={-f * 26 * k} opacity={0.25 + 0.6 * k} />
          );
        })}
        <NeonEarth f={f} x={gx} y={560} r={360} id="g3" face mood="worried" />
        {lats.map((la, i) => {
          const k = Math.cos((la * Math.PI) / 180);
          const y = 560 - Math.sin((la * Math.PI) / 180) * 360;
          return <path key={i} d={`M ${gx - 360 * k} ${y} Q ${gx} ${y + 30 * k} ${gx + 360 * k} ${y}`} stroke={N.white} strokeWidth={3 + 6 * k} fill="none"
            strokeDasharray="30 40" strokeDashoffset={-f * 30 * k} opacity={0.35 + 0.5 * k} />;
        })}
      </g>
      {[0, 1, 2].map((k) => {
        const t = (f - boom - k * 8) / 40;
        return t > 0 && t < 1 ? <circle key={k} cx={gx} cy={560} r={380 + t * 700} fill="none" stroke={N.magenta} strokeWidth={14 * (1 - t)} opacity={1 - t} /> : null;
      })}
      <Pop f={f} at={boom - 4} x={gx} y={110}><Banner x={gx} y={110} text="schneller als der Schall" color={N.violet} size={54} /></Pop>
      {/* wind speed by latitude: bars fly in from the right */}
      {lats.map((la, i) => {
        const k = Math.cos((la * Math.PI) / 180);
        const y = 560 - Math.sin((la * Math.PI) / 180) * 360;
        const word = la === 0 ? 'stärksten' : Math.abs(la) < 50 ? 'schwächer' : 'Genau';
        return (
          <FlyIn key={i} f={f} at={at(word) - 6 + i * 2} from="r" dist={900}>
            <line x1={gx + 380} y1={y} x2={1100} y2={y} stroke={N.cream} strokeWidth={2} strokeDasharray="6 10" opacity={0.4} />
            <rect x={1120} y={y - 20} width={620 * k} height={40} rx={20} fill={k > 0.9 ? N.red : k > 0.6 ? N.orange : N.cyan} />
            <Lbl x={1120 + 620 * k + 20} y={y + 14} size={36} anchor="start">{Math.round(1670 * k).toLocaleString('de-DE')}</Lbl>
          </FlyIn>
        );
      })}
      <FlyIn f={f} at={at('Genau') - 2} from="r" dist={900}>
        <Lbl x={1430} y={150} size={44} color={N.cyan}>Pole: fast 0 km/h</Lbl>
      </FlyIn>
    </g>
  );
};

// ---------------------------------------------------------------------------------------
// 4: the oceans slosh on: a giant wave rolls over a coastal city
export const Waves: React.FC<ActProps> = ({f, dur, at}) => {
  const p = ramp(f, 6, dur - 10);
  const crestX = lerp(-120, 1500, p);
  const h = lerp(260, 620, ramp(f, 0, 30));
  return (
    <g>
      <Space f={f} seed={13} c="#160a36" />
      {Array.from({length: 9}, (_, i) => {
        const x = 900 + i * 120; const bh = 200 + ((i * 97) % 5) * 70;
        const hit = crestX > x - 100;
        const tilt = hit ? Math.min(30, (crestX - x + 100) * 0.1) : 0;
        return (
          <g key={i} transform={`rotate(${tilt} ${x + 50} 900)`}>
            <rect x={x} y={900 - bh} width={100} height={bh} fill={[N.violet, N.navy, N.magenta][i % 3]} />
            {Array.from({length: Math.floor(bh / 50)}, (_, k) => <rect key={k} x={x + 18} y={900 - bh + 18 + k * 50} width={24} height={24} rx={4} fill={N.yellow} opacity={0.8} />)}
          </g>
        );
      })}
      <rect x={-400} y={900} width={2720} height={400} fill="#0f1a4a" />
      <defs>
        <linearGradient id="wv4" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={N.cyan} /><stop offset="0.4" stopColor={N.blue} /><stop offset="1" stopColor="#14207a" /></linearGradient>
      </defs>
      {/* back layer, then the main wave with a curling crest */}
      <path d={`M -600 1100 L -600 ${900 - h * 0.25} C ${crestX - 900} ${900 - h * 0.5} ${crestX - 400} ${900 - h * 1.02} ${crestX - 60} ${900 - h}
        C ${crestX + 90} ${900 - h * 0.98} ${crestX + 150} ${900 - h * 0.82} ${crestX + 110} ${900 - h * 0.7}
        C ${crestX + 70} ${900 - h * 0.6} ${crestX} ${900 - h * 0.66} ${crestX - 10} ${900 - h * 0.76}
        C ${crestX + 60} ${900 - h * 0.4} ${crestX + 200} ${960} ${crestX + 420} 1010 L ${crestX + 420} 1100 Z`} fill="url(#wv4)" />
      <path d={`M ${crestX - 700} ${900 - h * 0.7} C ${crestX - 400} ${900 - h * 0.95} ${crestX - 160} ${900 - h * 1.02} ${crestX - 60} ${900 - h}`} stroke={N.white} strokeWidth={6} fill="none" opacity={0.35} />
      <path d={`M ${crestX - 60} ${900 - h} C ${crestX + 90} ${900 - h * 0.98} ${crestX + 150} ${900 - h * 0.82} ${crestX + 110} ${900 - h * 0.7}`} stroke={N.white} strokeWidth={22} fill="none" strokeLinecap="round" />
      {Array.from({length: 7}, (_, i) => <path key={i} d={`M ${crestX - 800 + i * 110} ${980 - h * 0.3 + Math.sin(f * 0.2 + i) * 14} q 40 -24 80 0`} stroke={N.cyan} strokeWidth={8} fill="none" opacity={0.5} />)}
      <Swarm f={f} x={crestX} y={900 - h + 40} r={120} color={N.white} n={40} seed={4} />
      <Crossers f={f} n={18} speed={-16} color={N.cyan} y0={400} y1={900} seed={14} size={10} />
      <Pop f={f} at={at('Riesige') - 4} x={480} y={150}><Banner x={480} y={150} text="Riesenwellen" color={N.blue} size={56} /></Pop>
    </g>
  );
};

// ---------------------------------------------------------------------------------------
// 5: the bulge: a cutaway of the earth; the water slides to the poles; the new world map
export const Bulge: React.FC<ActProps> = ({f, at}) => {
  const cut = ramp(f, at('ausgebeult') - 20, 24);
  const flat = ramp(f, at('Schwerkraft') - 4, 70);
  const mapT = ramp(f, at('Ende') - 6, 30);
  const cx = 960; const cy = 560;
  const rx = lerp(440, 400, flat); const ry = lerp(360, 400, flat);
  const water = (th: number) => {
    const eq = Math.abs(Math.cos(th));
    const before = 18 + 40 * eq; // thick at the equator
    const after = 10 + 70 * (1 - eq) ** 3; // thick at the poles
    return lerp(before, after, flat);
  };
  const pts = (scale: number, extra: (th: number) => number) => Array.from({length: 121}, (_, i) => {
    const th = (i / 120) * Math.PI * 2;
    return `${i ? 'L' : 'M'} ${cx + Math.cos(th) * (rx * scale + extra(th))} ${cy + Math.sin(th) * (ry * scale + extra(th))}`;
  }).join(' ') + ' Z';
  return (
    <g>
      <Space f={f} seed={15} c="#140a30" />
      <g opacity={1 - mapT} transform={`translate(${cx} ${cy}) scale(${lerp(1, 0.5, mapT)}) translate(${-cx} ${-cy})`}>
        {/* golden wireframe cutaway box */}
        <g opacity={cut} stroke={N.yellow} strokeWidth={4} fill="none">
          <path d={`M ${cx - 560} ${cy - 460} L ${cx + 560} ${cy - 460} L ${cx + 640} ${cy - 400} L ${cx + 640} ${cy + 500} L ${cx - 480} ${cy + 500} L ${cx - 560} ${cy + 440} Z`} opacity={0.6} />
          <path d={`M ${cx + 560} ${cy - 460} L ${cx + 560} ${cy + 440} L ${cx - 560} ${cy + 440} M ${cx + 560} ${cy + 440} L ${cx + 640} ${cy + 500}`} strokeDasharray="14 12" opacity={0.6} />
        </g>
        <path d={pts(1, (th) => water(th))} fill={N.blue} />
        <path d={pts(1, () => 0)} fill="#6a3a2a" />
        <ellipse cx={cx} cy={cy} rx={rx * 0.62} ry={ry * 0.62} fill="#c04a1a" />
        <ellipse cx={cx} cy={cy} rx={rx * 0.3} ry={ry * 0.3} fill={N.orange} />
        <Glow cx={cx} cy={cy} r={rx * 0.4} color={N.yellow} o={0.6} />
        <path d={pts(1, (th) => water(th))} fill="none" stroke={N.cyan} strokeWidth={6} />
        {/* bulge measure */}
        <g opacity={ramp(f, at('Kilometer') - 8, 10) * (1 - flat)}>
          <Arrow x1={cx + rx + 60} y1={cy - 60} x2={cx + rx + 60} y2={cy + 60} color={N.yellow} w={8} />
          <Banner x={cx + rx + 260} y={cy} text="+21 km" color={N.orange} size={52} />
        </g>
        <g opacity={ramp(f, at('ausgebeult') - 6, 10) * (1 - flat)}>
          <Arrow x1={cx + rx - 40} y1={cy} x2={cx + rx + 40} y2={cy} color={N.cream} w={10} />
          <Arrow x1={cx - rx + 40} y1={cy} x2={cx - rx - 40} y2={cy} color={N.cream} w={10} />
        </g>
        {/* water flowing to the poles */}
        {flat > 0 && flat < 1 && [-1, 1].map((side) => [0, 1, 2].map((k) => {
          const t = ((f * 0.02 + k / 3) % 1);
          const th = side > 0 ? lerp(0.1, 1.35, t) : lerp(-0.1, -1.35, t);
          return <circle key={`${side}${k}`} cx={cx + Math.cos(th) * (rx + 50)} cy={cy - Math.sin(th) * (ry + 50)} r={14} fill={N.cyan} opacity={Math.sin(t * Math.PI)} />;
        }))}
      </g>
      {/* the new world map unrolls */}
      {mapT > 0 && (
        <g opacity={mapT} transform={`translate(${cx} ${cy}) scale(${lerp(0.3, 1, mapT)} ${lerp(0.6, 1, mapT)}) translate(${-cx} ${-cy})`}>
          <rect x={210} y={180} width={1500} height={760} rx={40} fill={N.blue} />
          <path d="M 210 420 Q 600 380 960 430 Q 1320 470 1710 410 L 1710 700 Q 1300 740 960 690 Q 600 650 210 710 Z" fill={N.orange} />
          <path d="M 210 470 Q 600 440 960 480 Q 1320 520 1710 460 L 1710 650 Q 1300 690 960 640 Q 600 600 210 660 Z" fill={N.green} opacity={0.7} />
          {Array.from({length: 10}, (_, i) => <circle key={i} cx={300 + i * 150} cy={300 + (i % 2) * 30} r={6} fill={N.cyan} opacity={0.6} />)}
          <rect x={210} y={180} width={1500} height={760} rx={40} fill="none" stroke={N.cyan} strokeWidth={8} />
          <Lbl x={960} y={290} size={56} color={N.cream}>Nordozean</Lbl>
          <Lbl x={960} y={860} size={56} color={N.cream}>Südozean</Lbl>
        </g>
      )}
      <FlyIn f={f} at={at('Superkontinent') - 8} from="r" dist={1400}><Banner x={960} y={570} text="Superkontinent" color={N.magenta} size={60} /></FlyIn>
      <FlyIn f={f} at={at('Merkwürdiges') - 4} from="t" dist={300} out={at('Weil')}>
        <Banner x={960} y={110} text="?!" color={N.violet} size={60} />
      </FlyIn>
    </g>
  );
};

export {NeonRing, Vignette, clamp01, rnd, Face};
