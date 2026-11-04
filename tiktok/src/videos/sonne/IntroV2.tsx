// The first ~35 s, re-cut: many short shots from different perspectives (close-ups, low angles,
// tracking shots, a teaser montage of what is coming) instead of a few long ones.
import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import {C} from '../../lib/theme';
import {makeTiming, rise} from '../../lib/timing';
import timingJson from './timing.json';
import {Clock, SH, SW, remaining} from './Video';
import {Cam, Defs, EARTH, FrozenScene, Label, PC, ParkScene, SKY_SUN, SUN, SpaceScene, Stars, Sun, camAt, clamp01, layer, lerp, rnd} from './Intro';
import {LightDefs, SpaceBack} from './scenesLight';
import {GravityDefs} from './scenesGravity';
import {CityScene, DarkDefs} from './scenesDark';
import {ColdDefs, OceanScene, VillageScene} from './scenesCold';
import {LifeDefs, VentScene} from './scenesLife';
import {KitePanel, LookUpPanel, PicnicPanel, WarmPanel} from './scenesPeople';
import {Item, Sequence, Tr} from './transitions';
import {Bubble, Face, KitDefs, Label as KLabel, P as KP, cycle} from '../../design/kit';

const T = makeTiming(timingJson);
const S = T.s;
const W = T.w;
export const INTRO2_DURATION = S('l1') - 4;
const HZ = 1030;

export const VANISH = W('i1', 'verschwunden') + 4;
const tailAt = (f: number) => (f < VANISH ? -1e4 : SUN.x + SUN.r * 0.9 + (f - VANISH) * 3.6);

// ---------------------------------------------------------------------------------------
// new shots

// extreme close-up of the sun's surface: boiling granules and prominences at the edge
const SunClose: React.FC<{f: number}> = ({f}) => {
  const z = lerp(3.4, 2.7, clamp01(f / VANISH));
  const cam: Cam = {x: SUN.x + 120, y: SUN.y - 40, z};
  return (
    <>
      <SpaceBack f={f} cam={cam} c={{x: SUN.x, y: SUN.y}} />
      <g transform={layer(cam, 1, {x: SUN.x, y: SUN.y})}>
        <Sun f={f * 1.6} x={SUN.x} y={SUN.y} r={SUN.r} scale={1} />
        {/* prominences looping off the edge */}
        {[[-30, 70], [15, 50], [55, 80]].map(([deg, h], i) => {
          const a = (deg * Math.PI) / 180;
          const bx = SUN.x + Math.cos(a) * SUN.r;
          const by = SUN.y + Math.sin(a) * SUN.r;
          const nx = Math.cos(a);
          const ny = Math.sin(a);
          const grow = h * (0.8 + 0.3 * Math.sin(f * 0.08 + i));
          const tx = -ny * 40;
          const ty = nx * 40;
          return (
            <path key={i} d={`M ${bx - tx} ${by - ty} C ${bx - tx + nx * grow * 1.6} ${by - ty + ny * grow * 1.6} ${bx + tx + nx * grow * 1.6} ${by + ty + ny * grow * 1.6} ${bx + tx} ${by + ty}`}
              stroke="#ff9a3a" strokeWidth={9} fill="none" opacity={0.85} strokeLinecap="round" />
          );
        })}
        {/* sparks rising from the surface */}
        {Array.from({length: 30}, (_, i) => {
          const a = -0.9 + rnd(i) * 1.8;
          const t = ((f * 0.02 + rnd(i + 4)) % 1);
          const r = SUN.r + t * 120;
          return <circle key={i} cx={SUN.x + Math.cos(a) * r} cy={SUN.y + Math.sin(a) * r} r={3 * (1 - t) + 1} fill="#ffe08a" opacity={1 - t} />;
        })}
      </g>
    </>
  );
};

// low angle from the grass up into the sky: sun glare through leaves, lens flare, birds
const SkyLook: React.FC<{f: number; t0: number}> = ({f, t0}) => {
  const t = f - t0;
  const sx = 1180 - t * 0.6;
  const sy = 330 + t * 0.2;
  const flare = [0.35, 0.6, 0.85, 1.2];
  return (
    <>
      <rect width={SW} height={SH} fill="url(#sky)" />
      <circle cx={sx} cy={sy} r={420} fill="url(#skySun)" />
      <circle cx={sx} cy={sy} r={120} fill="#fffbe6" />
      <Face f={f} x={sx} y={sy + 8} w={130} mood={cycle(['happy', 'joy'], 60, 4)} seed={12} skin="#fff3c0" />
      <g transform={`rotate(${f * 0.2} ${sx} ${sy})`} opacity={0.4}>
        {Array.from({length: 20}, (_, i) => <rect key={i} x={sx - 5} y={sy - 320} width={10} height={130} rx={5} fill="#fff3b0" transform={`rotate(${i * 18} ${sx} ${sy})`} />)}
      </g>
      {/* lens flare along the line through the centre */}
      {flare.map((k, i) => {
        const x = sx + (960 - sx) * 2 * k;
        const y = sy + (540 - sy) * 2 * k;
        return <circle key={i} cx={x} cy={y} r={[30, 60, 22, 90][i]} fill={['#ffe39a', '#a8e0ff', '#ffb547', '#c8b0ff'][i]} opacity={0.18} />;
      })}
      {[0, 1, 2].map((i) => {
        const x = ((i * 300 + t * 4) % 2400) - 200;
        const y = 200 + i * 60 + Math.sin(t * 0.05 + i) * 20;
        const w = Math.sin(f * 0.35 + i) * 14;
        return <path key={i} d={`M ${x - 26} ${y - w} Q ${x - 12} ${y - 6} ${x} ${y} Q ${x + 12} ${y - 6} ${x + 26} ${y - w}`} stroke="#2b3a6b" strokeWidth={5} fill="none" strokeLinecap="round" />;
      })}
      {/* leaves framing the top corners, swaying */}
      {[{x: -60, y: -40, s: 1}, {x: SW + 60, y: -60, s: -1}].map((b, j) => (
        <g key={j} transform={`translate(${b.x} ${b.y}) scale(${b.s} 1) rotate(${Math.sin(f * 0.05 + j) * 3})`}>
          <path d="M 0 0 Q 260 120 520 160" stroke="#3a2a1e" strokeWidth={26} fill="none" />
          {Array.from({length: 16}, (_, i) => (
            <ellipse key={i} cx={60 + i * 32} cy={40 + i * 8 + (i % 2 ? 40 : -10)} rx={70} ry={34} fill={i % 3 ? '#2f8a4a' : '#3fa25a'} transform={`rotate(${(i % 2 ? 30 : -25) + Math.sin(f * 0.08 + i) * 6} ${60 + i * 32} ${40 + i * 8})`} />
          ))}
        </g>
      ))}
      {/* the hint: this is old light */}
      <Bubble f={f} at={t0 + 16} text={['Mein Licht ist', 'schon 8 Minuten alt!']} x={sx + 420} y={sy + 20} color={KP.violet} size={54} tail="down-left" />
    </>
  );
};

// back in space: the tail of the light with a bracket "still 8:19 to go" up to the earth
const TailToEarth: React.FC<{f: number; t0: number; moveAt: number}> = ({f, t0, moveAt}) => {
  const tail = SUN.x + SUN.r * 0.9 + 260 + (f - t0) * 1.0;
  const cam = camAt(f, [[t0, {x: 1250, y: 540, z: 1.35}], [moveAt, {x: 1180, y: 540, z: 1.25}], [moveAt + 50, {x: (tail + EARTH.x) / 2 + 60, y: 560, z: 1.7}]]);
  const r = remaining(f);
  const br = rise(f, moveAt, 14);
  const mm = Math.floor(r / 60);
  const ss = String(Math.floor(r % 60)).padStart(2, '0');
  return (
    <>
      <SpaceScene f={f} cam={cam} vanish={-100} tailX={tail} labels={0} title={0} />
      <g transform={layer(cam, 1, {x: 990, y: 540})} opacity={br}>
        <path d={`M ${tail} ${SUN.y + 150} L ${tail} ${SUN.y + 170} L ${EARTH.x} ${SUN.y + 170} L ${EARTH.x} ${SUN.y + 150}`} stroke={C.orange} strokeWidth={5} fill="none" />
        <KLabel f={f} at={0} show={br} text={`noch ${mm}:${ss}`} x={(tail + EARTH.x) / 2} y={SUN.y + 235} color={KP.orange} point="none" size={48} />
      </g>
    </>
  );
};

// ---------------------------------------------------------------------------------------
// the cut list

type Shot = Item;

const kid2X = (f: number) => 1640 + Math.sin(f * 0.05) * 90;

const SHOTS: Shot[] = [
  {at: 0, draw: (f) => <SunClose f={f} />},
  {at: VANISH - 12, draw: (f) => (
    <SpaceScene f={f} cam={camAt(f, [[VANISH - 12, {x: 990, y: 540, z: 1.25}], [W('i2', 'Einfach'), {x: 960, y: 540, z: 1.05}]])} vanish={VANISH} tailX={tailAt(f)} labels={0} title={0} />
  )},
  // close on the empty spot
  {at: W('i2', 'Einfach'), draw: (f) => (
    (() => {
      const cam = camAt(f, [[W('i2', 'Einfach'), {x: SUN.x + 40, y: SUN.y + 30, z: 2.1}], [W('i2', 'Vor'), {x: SUN.x + 90, y: SUN.y + 20, z: 1.85}]]);
      return (
        <>
          <SpaceScene f={f} cam={cam} vanish={VANISH} tailX={tailAt(f)} labels={0} title={0} />
          <g transform={layer(cam, 1, {x: 990, y: 540})}>
            <Label x={SUN.x} y={SUN.y + SUN.r + 70} text="hier war die Sonne" o={rise(f, W('i2', 'Einfach'), 10)} />
          </g>
        </>
      );
    })()
  )},
  // ride along with the last light, then rush into the earth
  {at: W('i2', 'Vor'), draw: (f) => {
    const rush = S('i3') - 14;
    const cam = f < rush
      ? {x: tailAt(f) + 260, y: 520, z: 1.9}
      : camAt(f, [[rush, {x: tailAt(rush) + 260, y: 520, z: 1.9}], [S('i3') - 2, {x: EARTH.x, y: EARTH.y, z: 7}]]);
    return <SpaceScene f={f} cam={cam} vanish={VANISH} tailX={tailAt(f)} labels={1 - rise(f, rush - 6, 6)} title={0} />;
  }},
  // Earth, told through Mia, her dad and their dog: one composed picture per idea
  {at: S('i3') - 2, draw: (f) => <PicnicPanel f={f} t0={S('i3') - 2} />},
  {at: S('i3b'), draw: (f) => <LookUpPanel f={f} t0={S('i3b')} />},
  {at: S('i4'), draw: (f) => <WarmPanel f={f} t0={S('i4')} />},
  {at: W('i4', 'Kinder'), draw: (f) => <KitePanel f={f} t0={W('i4', 'Kinder')} />},
  // space: the remaining distance of the light
  {at: S('i5'), draw: (f) => <TailToEarth f={f} t0={S('i5')} moveAt={W('i5', '8')} />},
  // "wird es dunkel": back on the bench, for a moment it is night and both get a fright
  {at: W('i5', 'dunkel') - 4, draw: (f) => {
    const d = W('i5', 'dunkel');
    const night = rise(f, d - 2, 6) * (1 - rise(f, d + 26, 18));
    return <PicnicPanel f={f} t0={d - 4} dark={night} shock={d} />;
  }},
  {at: W('i6', 'Für'), draw: (f) => <FrozenScene f={f} start={W('i6', 'Für')} />},
  // teaser montage of what is coming
  {at: S('i7'), draw: (f) => (
    <CityScene f={f} night={1} lampsAt={-1000} starsAt={-1000} cam={camAt(f, [[S('i7'), {x: 1200, y: 640, z: 1.2}], [W('i7', 'was'), {x: 1350, y: 600, z: 1.3}]])} />
  )},
  {at: W('i7', 'was'), draw: (f) => (
    <VillageScene f={f} frost={1} snow={1} people={1} cam={camAt(f, [[W('i7', 'was'), {x: 1150, y: 860, z: 1.4}], [W('i7', 'passiert'), {x: 1200, y: 840, z: 1.3}]])} />
  )},
  {at: W('i7', 'passiert'), draw: (f) => {
    const a = W('i7', 'passiert');
    return <OceanScene f={f} t0={a - 400} blanketAt={a - 300} hopeAt={a + 2000} end={a + 4000} />;
  }},
  {at: W('i7', 'Und'), draw: (f) => {
    const a = W('i7', 'Und');
    return <VentScene f={f} t0={a - 2000} revealAt={a - 1900} heatAt={a + 9000} lifeAt={a - 1800} o2At={a + 9000} subAt={a + 9000} end={a + 9500} />;
  }},
  {at: W('i7', 'überlebt') - 4, draw: (f) => (
    <SpaceScene f={f} cam={camAt(f, [[W('i7', 'überlebt') - 4, {x: EARTH.x - 40, y: EARTH.y, z: 2.4}], [W('i7', 'überlebt') + 30, {x: 1000, y: 540, z: 1.0}], [INTRO2_DURATION, {x: 990, y: 540, z: 0.95}]])}
      vanish={-100} tailX={SUN.x + SUN.r * 0.9 + 700} labels={0} title={rise(f, W('i7', 'überlebt'), 18)} />
  )},
];

// how each shot is entered (same order as SHOTS)
const TRS: (Tr | undefined)[] = [
  undefined,
  {type: 'pull', dur: 10},
  {type: 'push', dur: 10},
  {type: 'whip', dir: 'left', dur: 10},
  {type: 'push', dur: 12}, // out of the earth onto the bench
  {type: 'whip', dir: 'down', dur: 12}, // tilt up to the sun with Mia
  {type: 'iris', x: 1340, y: 260, dur: 16}, // out of the sun into the warm close-up
  {type: 'whip', dir: 'left', dur: 12}, // off to the kite run
  {type: 'pull', dur: 14},
  {type: 'push', dur: 10},
  {type: 'cut'},
  {type: 'push', dur: 12},
  {type: 'whip', dir: 'left', dur: 9},
  {type: 'whip', dir: 'up', dur: 9},
  {type: 'whip', dir: 'up', dur: 9},
  {type: 'pull', dur: 14},
];
export const INTRO_ITEMS: Item[] = SHOTS.map((s, i) => ({...s, tr: TRS[i]}));

export const IntroV2Svg: React.FC<{f: number}> = ({f}) => <Sequence f={f} items={INTRO_ITEMS} uid="intro" />;

export const SonneIntro2: React.FC = () => {
  const f = useCurrentFrame();
  const out = 1 - rise(f, INTRO2_DURATION - 24, 22);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Audio src={staticFile('sonne/voice.wav')} />
      <Audio src={staticFile('sonne/ambient.wav')} volume={0.35} />
      <svg width={SW} height={SH} style={{position: 'absolute', opacity: out}}>
        <Defs /><LightDefs /><GravityDefs /><DarkDefs /><ColdDefs /><LifeDefs /><KitDefs />
        <IntroV2Svg f={f} />
      </svg>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, transparent 60%, rgba(0,0,0,0.4) 100%)'}} />
      <div style={{opacity: out}}><Clock /></div>
    </AbsoluteFill>
  );
};

export {Stars, PC, SKY_SUN};
