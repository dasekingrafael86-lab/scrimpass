// Chapter 1: how fast we turn and why we don't feel it. Chapter 2: the jolt (inertia).
import React from 'react';
import {Character, Glow, rnd} from '../../design/kit';
import {ActProps, Banner, N, NeonRing, lerp, ramp} from '../../design/flow';
import {Arrow, Burst, Car, Crossers, DU, FlyIn, House, Lbl, NTree, NeonEarth, NeonSun, Pop, Space} from '../stopp/neon';

const fmt = (n: number) => Math.round(n).toLocaleString('de-DE');

// b1, b2, b3: one turn a day; a dot runs once around the equator; 40.000 km in 24 h = 1.670 km/h
export const Lap: React.FC<ActProps> = ({f, at}) => {
  const run = ramp(f, at('Äquator') - 6, at('Stunden') - at('Äquator') + 12);
  const a = -Math.PI / 2 + run * Math.PI * 2;
  const eq = {rx: 470, ry: 120};
  const km = 40000 * run;
  const hours = 24 * run;
  const calc = ramp(f, at('1.670') - 8, 14);
  const plane = ramp(f, at('Verkehrsflugzeug') - 6, 16);
  return (
    <g>
      <Space f={f} seed={51} />
      <g transform={`translate(${lerp(960, 700, calc)} 560) scale(${lerp(1, 0.85, calc)}) translate(-960 -560)`}>
        <ellipse cx={960} cy={560} rx={eq.rx} ry={eq.ry} fill="none" stroke={N.violet} strokeWidth={6} strokeDasharray="12 16" opacity={0.7} />
        <NeonEarth f={f} x={960} y={560} r={380} spin={f * 1.5} id="c1g" mood="curious" />
        <path d={Array.from({length: Math.max(2, Math.floor(run * 120))}, (_, i) => {
          const t = -Math.PI / 2 + (i / 120) * Math.PI * 2;
          return `${i ? 'L' : 'M'} ${960 + Math.cos(t) * eq.rx} ${560 + Math.sin(t) * eq.ry}`;
        }).join(' ')} stroke={N.yellow} strokeWidth={10} fill="none" strokeLinecap="round" opacity={run > 0 ? 1 : 0} />
        {run > 0 && run < 1 && <><Glow cx={960 + Math.cos(a) * eq.rx} cy={560 + Math.sin(a) * eq.ry} r={60} color={N.yellow} o={0.9} /><circle cx={960 + Math.cos(a) * eq.rx} cy={560 + Math.sin(a) * eq.ry} r={16} fill={N.white} /></>}
        <Pop f={f} at={at('einmal') - 6} x={960} y={110}><Banner x={960} y={110} text="1 Umdrehung pro Tag" color={N.blue} size={52} /></Pop>
        <Lbl x={960} y={1030} size={60} color={N.yellow} o={ramp(f, at('Äquator') - 4, 8)}>{fmt(km)} km</Lbl>
        {/* 24 h clock that fills */}
        <g transform="translate(1500 860)" opacity={ramp(f, at('24') - 10, 10) * (1 - calc)}>
          <circle r={90} fill={N.ink} stroke={N.cream} strokeWidth={6} />
          <circle r={70} fill="none" stroke={N.orange} strokeWidth={18} strokeDasharray={`${440 * Math.min(1, hours / 24)} 440`} transform="rotate(-90)" />
          <Lbl x={0} y={18} size={46}>{Math.round(hours)} h</Lbl>
        </g>
      </g>
      <FlyIn f={f} at={at('1.670') - 8} from="r" dist={1100}>
        <g transform="translate(1440 420)">
          <rect x={-320} y={-130} width={640} height={260} rx={30} fill={N.ink} stroke={N.yellow} strokeWidth={6} />
          <Lbl x={0} y={-40} size={54} color={N.cream}>40.000 km ÷ 24 h</Lbl>
          <Lbl x={0} y={70} size={96} color={N.yellow}>= 1.670 km/h</Lbl>
        </g>
      </FlyIn>
      <FlyIn f={f} at={at('Verkehrsflugzeug') - 8} from="r" dist={1100}>
        <g transform={`translate(${1440 - plane * 0} 780)`}>
          <path d="M -150 0 Q -150 -28 -100 -28 L 110 -28 Q 160 -20 172 0 Q 160 20 110 28 L -100 28 Q -150 28 -150 0 Z" fill={N.cream} />
          <path d="M -20 0 L -80 -100 L -30 -100 L 50 0 Z M -20 6 L -80 106 L -30 106 L 50 6 Z" fill={N.pink} />
          <Lbl x={0} y={110} size={44} color={N.cream}>Flugzeug ≈ 900 km/h</Lbl>
        </g>
      </FlyIn>
    </g>
  );
};

// b4, b5: the circles get smaller towards the poles
export const Latitudes: React.FC<ActProps> = ({f, at}) => {
  const lats = [0, 30, 50, 70, 90];
  const show = (i: number) => ramp(f, 10 + i * 10, 12);
  const de = ramp(f, at('Deutschland') - 6, 12);
  const pole = ramp(f, at('Polen') - 6, 12);
  return (
    <g>
      <Space f={f} seed={53} />
      <NeonEarth f={f} x={760} y={560} r={400} spin={f * 1.5} id="c1l" face={false} />
      {lats.map((la, i) => {
        const k = Math.cos((la * Math.PI) / 180);
        const y = 560 - Math.sin((la * Math.PI) / 180) * 400;
        const v = 1670 * k;
        const hl = la === 50 ? de : la === 90 ? pole : la === 0 ? 1 : 0.5;
        return (
          <g key={la} opacity={show(i)}>
            <ellipse cx={760} cy={y} rx={Math.max(6, 400 * k)} ry={Math.max(3, 60 * k)} fill="none" stroke={la === 50 ? N.magenta : la === 0 ? N.yellow : N.cyan} strokeWidth={la === 50 ? 10 : 6} opacity={0.5 + 0.5 * hl} />
            <line x1={760 + 400 * k + 10} y1={y} x2={1250} y2={y} stroke={N.cream} strokeWidth={2} strokeDasharray="6 10" opacity={0.4} />
            <rect x={1270} y={y - 22} width={520 * k + 6} height={44} rx={22} fill={la === 50 ? N.magenta : la === 0 ? N.yellow : N.cyan} opacity={0.4 + 0.6 * hl} />
            <Lbl x={1270 + 520 * k + 24} y={y + 15} size={38} anchor="start">{fmt(v)}</Lbl>
            <Lbl x={1250} y={y - 34} size={30} anchor="end" color={N.pink}>{la === 0 ? 'Äquator' : la === 90 ? 'Pol' : `${la}°`}</Lbl>
          </g>
        );
      })}
      <Pop f={f} at={at('Deutschland') - 4} x={760} y={560 - Math.sin((50 * Math.PI) / 180) * 400}>
        <circle cx={760 + 120} cy={560 - Math.sin((50 * Math.PI) / 180) * 400 + 20} r={16} fill={N.magenta} />
        <Banner x={760 + 120} y={560 - Math.sin((50 * Math.PI) / 180) * 400 - 50} text="Deutschland" color={N.magenta} size={40} />
      </Pop>
      <Pop f={f} at={at('Polen') - 4} x={760} y={150}>
        <g transform={`rotate(${f * 6} 760 160)`}><path d="M 720 160 A 40 40 0 1 1 800 160" stroke={N.cream} strokeWidth={8} fill="none" /><polygon points="800,160 790,140 812,146" fill={N.cream} /></g>
      </Pop>
      <Banner x={1500} y={110} text="km/h" color={N.blue} size={44} show={show(0)} />
    </g>
  );
};

// b6, b7, b8: everything moves together, like coffee in a plane; until the speed changes
export const Cabin: React.FC<ActProps> = ({f, at}) => {
  const bump = at('plötzlich');
  const shake = f > bump ? Math.sin((f - bump) * 1.7) * 14 * Math.exp(-(f - bump) / 20) : 0;
  const warn = ramp(f, bump - 4, 8);
  const inPlane = ramp(f, at('Flugzeug') - 10, 20);
  return (
    <g>
      <Space f={f} seed={55} stream={f * 22} />
      {/* first: the together-arrows on the ground scene; then a plane cabin flies in */}
      <g opacity={1 - inPlane}>
        <rect x={-400} y={760} width={2720} height={700} fill="#2a1a5a" />
        <House x={560} y={766} s={1.2} />
        <NTree x={860} y={768} s={1.2} />
        <Character f={f} x={1100} y={770} s={1.15} {...DU} mood="happy" />
        {[{x: 560, w: 'Boden'}, {x: 860, w: 'Häuser'}, {x: 1100, w: 'Luft'}].map((o, i) => (
          <Arrow key={i} x1={o.x - 90} y1={850} x2={o.x + 110} y2={850} color={N.yellow} w={10} o={ramp(f, at(o.w) - 4, 8)} />
        ))}
        {Array.from({length: 6}, (_, i) => <path key={i} d={`M -300 ${200 + i * 70} C 400 ${180 + i * 70} 1100 ${230 + i * 70} 2300 ${200 + i * 70}`} stroke={N.cyan} strokeWidth={5} fill="none" strokeDasharray="60 80" strokeDashoffset={-f * 20} opacity={0.2 + 0.6 * ramp(f, at('Luft') - 4, 8)} />)}
        <Pop f={f} at={at('genauso') - 6} x={960} y={110}><Banner x={960} y={110} text="alles gleich schnell" color={N.orange} size={52} /></Pop>
      </g>
      <g opacity={inPlane} transform={`translate(${shake} ${shake * 0.6})`}>
        <rect x={200} y={180} width={1520} height={720} rx={200} fill="#e8e4ff" />
        <rect x={240} y={220} width={1440} height={640} rx={170} fill="#cfc8f5" />
        {[0, 1, 2, 3].map((i) => <g key={i}><rect x={360 + i * 340} y={300} width={150} height={110} rx={50} fill="#14204a" />{[0, 1, 2].map((k) => <rect key={k} x={360 + i * 340 + ((k * 60 - f * 8) % 150 + 150) % 150} y={330 + k * 22} width={30} height={4} rx={2} fill={N.cream} opacity={0.7} />)}</g>)}
        {[0, 1].map((i) => <rect key={i} x={460 + i * 620} y={540} width={300} height={300} rx={40} fill={N.violet} />)}
        <Character f={f} x={640} y={840} s={1.2} {...DU} sit mood={f > bump ? 'shocked' : 'happy'} armAngles={[30, -80]}
          rightHand={<g><rect x={-22} y={-40} width={44} height={46} rx={8} fill={N.cream} /><path d={`M -18 -36 Q 0 ${-44 + (f > bump ? Math.sin(f) * 10 : 0)} 18 -36`} stroke="#6a3a2a" strokeWidth={8} fill="none" /></g>} />
        <rect x={1000} y={700} width={240} height={20} rx={10} fill={N.ink} />
        <g transform={`translate(1120 ${690 - (f > bump ? Math.abs(Math.sin((f - bump) * 0.5)) * 60 : 0)}) rotate(${f > bump ? (f - bump) * 8 : 0})`}>
          <rect x={-24} y={-50} width={48} height={50} rx={8} fill={N.cream} />
        </g>
        <g opacity={warn}><rect x={880} y={220} width={160} height={70} rx={20} fill={N.ink} /><Lbl x={960} y={272} size={50} color={N.yellow}>⚠</Lbl></g>
      </g>
      <FlyIn f={f} at={at('Geschwindigkeit') - 8} from="r" dist={1200}><Banner x={1400} y={980} text="plötzliche Änderung = Gefahr" color={N.red} size={46} /></FlyIn>
    </g>
  );
};

// c2, c3: inertia: a car brakes, the passenger is pushed forward; now imagine 1.670 km/h
export const Brake: React.FC<ActProps> = ({f, at}) => {
  const stopF = at('Vollbremsung') - 2;
  const x = f < stopF ? f * 9 : stopF * 9 + 40 * (1 - Math.exp(-(f - stopF) / 4));
  const lean = f > stopF ? Math.sin(Math.min(Math.PI, (f - stopF) / 6)) * 28 : 0;
  const speedo = ramp(f, at('1.670') - 14, 20);
  return (
    <g>
      <Space f={f} seed={61} stream={f < stopF ? f * 16 : stopF * 16} />
      <rect x={-400} y={800} width={2720} height={700} fill="#24164e" />
      {Array.from({length: 12}, (_, i) => <rect key={i} x={((i * 260 - x * 2) % 3120 + 3120) % 3120 - 400} y={870} width={130} height={14} rx={7} fill={N.cream} opacity={0.5} />)}
      <g transform={`translate(${-200 + Math.min(x, 900)} 0)`}>
        <Car x={700} y={804} s={2.4} c={N.orange} />
        <g transform={`rotate(${lean} 640 700)`}><circle cx={640} cy={620} r={40} fill={DU.skin} /><path d="M 600 610 Q 640 560 680 610" fill={DU.hair} /></g>
        {f > stopF && f < stopF + 20 && <><line x1={460} y1={800} x2={300} y2={800} stroke={N.cream} strokeWidth={6} opacity={0.6} /><line x1={940} y1={800} x2={780} y2={800} stroke={N.cream} strokeWidth={6} opacity={0.6} /></>}
        <Arrow x1={620} y1={480} x2={820} y2={480} color={N.yellow} w={12} o={f > stopF ? ramp(f, stopF, 6) : 0} />
      </g>
      <Pop f={f} at={at('Trägheit') - 6} x={960} y={140}><Banner x={960} y={140} text="Trägheit" color={N.violet} size={64} /></Pop>
      <g transform="translate(1500 380)" opacity={speedo}>
        <path d="M -200 0 A 200 200 0 0 1 200 0" fill="none" stroke={N.navy} strokeWidth={36} />
        <path d="M -200 0 A 200 200 0 0 1 200 0" fill="none" stroke={N.red} strokeWidth={36} strokeDasharray={`${628 * speedo} 628`} />
        <line x1={0} y1={0} x2={-180 * Math.cos(Math.PI * speedo)} y2={-180 * Math.sin(Math.PI * speedo)} stroke={N.cream} strokeWidth={12} strokeLinecap="round" />
        <Lbl x={0} y={90} size={70} color={N.red}>{fmt(1670 * speedo)} km/h</Lbl>
      </g>
    </g>
  );
};

// c1, c4: the ground stops; everything flies east (people, animals, cars, houses)
type FlingKeys = {stop: string; p: string; t: string; c: string; h: string; east?: string};
export const Fling: React.FC<ActProps & {keys: FlingKeys}> = ({f, at: at0, keys}) => {
  const GROUND = 820;
  const map: Record<string, string> = {stoppt: keys.stop, Menschen: keys.p, Tiere: keys.t, Autos: keys.c, Häuser: keys.h, Osten: keys.east ?? '§none'};
  const at = (w: string) => (map[w] === '§none' ? 99999 : at0(map[w] ?? w));
  const stop = keys.stop === '' ? 2 : at('stoppt') + 2;
  const flow = Math.min(f, stop);
  const launch = (word: string) => Math.max(0, f - at(word));
  const fly = (t: number, vx: number, vy: number) => ({dx: vx * t + 0.02 * t * t, dy: Math.min(0, -vy * t + 0.12 * t * t), rot: t * 3});
  const Pp = fly(launch('Menschen'), 11, 6);
  const Tt = fly(launch('Tiere'), 12, 7);
  const Cc = fly(launch('Autos'), 13, 4);
  const Hh = fly(launch('Häuser'), 9, 5);
  const camX = lerp(0, 760, ramp(f, at('Menschen'), 170));
  const fels = ramp(f, at('Fels') - 4, 12);
  return (
    <g>
      <Space f={f} seed={63} stream={f < stop ? flow * 30 : stop * 30} />
      <g transform={`translate(960 940) scale(1.45) translate(${-960 - camX} -820)`}>
        <circle cx={1200} cy={GROUND + 3000} r={3000} fill="#1a3a6a" />
        <path d={`M -900 ${GROUND + 60} Q 1200 ${GROUND - 120} 3300 ${GROUND + 60}`} stroke={N.green} strokeWidth={14} fill="none" />
        <rect x={-900} y={GROUND + 120} width={4200} height={600} fill="#2a1a4a" />
        <g opacity={fels}>
          <rect x={-900} y={GROUND + 120} width={4200} height={600} fill="#4a2a5a" />
          {Array.from({length: 18}, (_, i) => <path key={i} d={`M ${-800 + i * 240} ${GROUND + 160} l 80 40 l -40 60 l 120 20`} stroke="#6a3a7a" strokeWidth={10} fill="none" />)}
          <rect x={980} y={GROUND + 130} width={1500} height={420} fill="none" stroke={N.yellow} strokeWidth={6} strokeDasharray="22 14" />
          <Lbl x={1730} y={GROUND + 360} size={64} color={N.yellow}>Fels bleibt stehen</Lbl>
        </g>
        <g transform={`translate(${Hh.dx} ${Hh.dy}) rotate(${Hh.rot} 600 ${GROUND})`}><House x={600} y={GROUND + 6} s={1.15} /></g>
        <g transform={`translate(${Tt.dx} ${Tt.dy}) rotate(${Tt.rot} 860 ${GROUND})`}>
          <g transform={`translate(860 ${GROUND})`}>
            <ellipse cx={0} cy={-50} rx={60} ry={30} fill="#c98a52" /><circle cx={60} cy={-80} r={24} fill="#c98a52" />
            {[-40, -15, 15, 40].map((lx) => <rect key={lx} x={lx - 6} y={-40} width={12} height={40} rx={6} fill="#8a5a36" />)}
          </g>
        </g>
        <g transform={`translate(${Cc.dx} ${Cc.dy}) rotate(${Cc.rot * 0.6} 1300 ${GROUND})`}><Car x={1300} y={GROUND + 8} s={1.1} /></g>
        <g transform={`translate(${Pp.dx} ${Pp.dy}) rotate(${Pp.rot * 1.4} 1060 ${GROUND - 120})`}>
          <Character f={f} x={1060} y={GROUND + 4} s={1.05} {...DU} mood={[[0, 'happy'], [stop - 4, 'shocked']]} arms={f > stop ? 'up' : 'down'} />
        </g>
        {f < at('Menschen') && [600, 860, 1060, 1300].map((x, i) => <Arrow key={i} x1={x - 70} y1={GROUND + 70} x2={x + 90} y2={GROUND + 70} color={N.yellow} w={9} />)}
        <Burst f={f} at={stop} x={1060} y={GROUND} color={N.red} r={300} />
        <Crossers f={Math.max(0, f - at('Menschen'))} n={f > at('Menschen') ? 26 : 0} speed={-30} color={N.orange} y0={300} y1={800} seed={7} size={12} />
      </g>
      <Pop f={f} at={stop - 4} x={960} y={130} out={at('Menschen')}><Banner x={960} y={130} text="Boden stoppt" color={N.red} size={56} /></Pop>
      <FlyIn f={f} at={at('Osten') - 4} from="l" dist={1200}><Banner x={1500} y={130} text="nach Osten →" color={N.magenta} size={60} /></FlyIn>
    </g>
  );
};

// c5, c6: the jolt by latitude: deadly in Germany, harmless at the pole
export const JoltMap: React.FC<ActProps> = ({f, at}) => {
  const de = ramp(f, at('Deutschland') - 6, 14);
  const arc = ramp(f, at('Arktis') - 6, 14);
  return (
    <g>
      <Space f={f} seed={65} />
      <NeonEarth f={f} x={760} y={600} r={420} id="c2j" face={false} />
      {[{la: 0, c: N.red, s: 1, w: null}, {la: 50, c: N.orange, s: 0.64, w: 'Deutschland'}, {la: 80, c: N.cyan, s: 0.17, w: 'Arktis'}].map((p, i) => {
        const y = 600 - Math.sin((p.la * Math.PI) / 180) * 420;
        const x = 760 + Math.cos((p.la * Math.PI) / 180) * 420 * 0.35;
        const o = p.w ? ramp(f, at(p.w) - 6, 12) : ramp(f, 4, 10);
        return (
          <g key={i} opacity={o}>
            <circle cx={x} cy={y} r={14} fill={p.c} />
            <Arrow x1={x} y1={y} x2={x + 560 * p.s} y2={y} color={p.c} w={16} />
          </g>
        );
      })}
      <Character f={f} x={1500} y={600 - Math.sin((50 * Math.PI) / 180) * 420 + 120} s={0.8} {...DU} mood="shocked" arms="up" />
      <g opacity={de}><Banner x={1500} y={170} text="Deutschland: ≈ 1.000 km/h" color={N.orange} size={46} /></g>
      <g opacity={arc}>
        <Banner x={1500} y={980} text="Arktis: kaum etwas" color={N.cyan} size={46} />
        <Character f={f} x={1060} y={260} s={0.6} skin={N.skin} hair={N.red} hairStyle="cap" shirt={N.red} pants={N.navy} seed={231} mood="curious" />
      </g>
    </g>
  );
};

export {NeonRing, NeonSun, rnd, Crossers};
