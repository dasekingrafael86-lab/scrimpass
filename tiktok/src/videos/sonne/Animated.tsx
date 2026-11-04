// "Die Sonne ist weg – und du hast noch 8 Minuten", fully animated (vector scenes on the voice timing).
import React from 'react';
import {AbsoluteFill, Audio, Sequence as Seq, staticFile, useCurrentFrame} from 'remotion';
import {makeTiming, rise} from '../../lib/timing';
import timingJson from './timing.json';
import {Item, Sequence, Tr} from './transitions';
import {CALLOUTS, CalloutLayer, Clock, DARK, DURATION, SH, SW, Thermometer, remaining} from './Video';
import {Defs, camAt} from './Intro';
import {INTRO_ITEMS, IntroV2Svg, VANISH} from './IntroV2';
import {BallScene, DistanceScene, LapScene, LetterScene, LightDefs, PastScene, ShellScene, WhyScene} from './scenesLight';
import {GravityDefs, NeutronScene, OrbitScene, SheetScene} from './scenesGravity';
import {CityScene, ClockScene, DarkDefs, DriftScene, MoonScene, PlaneScene, SatScene, SystemScene, TelescopeScene} from './scenesDark';
import {ColdDefs, FuelScene, HeatScene, OceanScene, PipeScene, PlantScene, VillageScene, WeatherScene} from './scenesCold';
import {AirSnowScene, BunkerScene, FinalParkScene, FoodScene, GeoTownScene, HeatFlowScene, LifeDefs, LonelyScene, SunriseScene, VentScene} from './scenesLife';

const T = makeTiming(timingJson);
const S = T.s;
const W = T.w;
export const ANIM_DURATION = DURATION;

type Seg = {from: number; to: number; draw: (f: number) => React.ReactNode};

const SEGMENTS: Seg[] = [
  {from: 0, to: S('l1'), draw: (f) => <IntroV2Svg f={f} />},
  {from: S('l1'), to: S('l3'), draw: (f) => <WhyScene f={f} t0={S('l1')} slowAt={S('l2')} />},
  {from: S('l3'), to: S('l5'), draw: (f) => <LapScene f={f} t0={S('l3')} lapsAt={W('l4', 'Siebenmal')} end={S('l5')} />},
  {from: S('l5'), to: S('l5b'), draw: (f) => <DistanceScene f={f} t0={S('l5')} end={S('l5b')} />},
  {from: S('l5b'), to: S('l6'), draw: (f) => <BallScene f={f} t0={S('l5b')} end={S('l6')} />},
  {from: S('l6'), to: S('l6b'), draw: (f) => <DistanceScene f={f} t0={S('l6')} end={S('l6b')} photonFrom={S('l6') + 6} timer />},
  {from: S('l6b'), to: S('l7'), draw: (f) => <PastScene f={f} t0={S('l6b')} moonAt={W('l6b', 'Mond')} starsAt={W('l6c', 'Sterne')} upAt={S('l6d')} />},
  {from: S('l7'), to: S('l9'), draw: (f) => <LetterScene f={f} t0={S('l7')} letterAt={W('l8', 'Brief')} end={S('l9')} />},
  {from: S('l9'), to: S('g1'), draw: (f) => <ShellScene f={f} t0={S('l9')} nothingAt={S('l10')} end={S('g1')} />},

  // gravity
  {from: S('g1'), to: S('g3'), draw: (f) => (
    <OrbitScene f={f} ghostAt={W('g2', 'sofort')} ghostEnd={S('g3')}
      cam={camAt(f, [[S('g1'), {x: 960, y: 540, z: 1.2}], [S('g2'), {x: 960, y: 540, z: 1.0}], [S('g3'), {x: 1000, y: 540, z: 0.92}]])} />
  )},
  {from: S('g3'), to: S('g4b'), draw: (f) => (
    <OrbitScene f={f} sunGone={S('g3') + 20} waveFrom={S('g3') + 20} waveLabels={rise(f, W('g4', 'Welle'), 14)}
      cam={camAt(f, [[S('g3'), {x: 960, y: 540, z: 0.92}], [S('g4b'), {x: 960, y: 540, z: 0.75}]])} />
  )},
  {from: S('g4b'), to: S('g5'), draw: (f) => <SheetScene f={f} t0={S('g4b')} liftAt={W('g4b', 'weg')} end={S('g5')} />},
  {from: S('g5'), to: S('g6'), draw: (f) => <NeutronScene f={f} t0={S('g5')} mergeAt={W('g5', 'verschmolzen')} arriveAt={W('g5', 'gleichzeitig')} end={S('g6')} />},
  {from: S('g6'), to: S('a1'), draw: (f) => (
    <OrbitScene f={f} sunGone={-1000} waveFrom={S('a1') - 110}
      cam={camAt(f, [[S('g6'), {x: 960, y: 540, z: 0.95}], [S('g7'), {x: 1150, y: 560, z: 1.5}], [S('a1'), {x: 1150, y: 560, z: 1.6}]])} />
  )},

  // at zero
  {from: S('a1'), to: S('a2'), draw: (f) => <ClockScene f={f} t0={S('a1')} remaining={remaining} />},
  {from: S('a2'), to: S('a4c'), draw: (f) => {
    const at = W('a3', 'Schlag');
    return (
      <>
        <CityScene f={f} night={f >= at ? 1 : 0} lampsAt={W('a4', 'Straßenlaternen')} starsAt={W('a4', 'Sterne')} solarOff={W('a4b', 'Solaranlagen')} flicker={W('a4b', 'Stromnetze')}
          cam={camAt(f, [
            [S('a2'), {x: 1100, y: 700, z: 1.0}], [at - 10, {x: 1250, y: 680, z: 1.1}], [at, {x: 1250, y: 680, z: 1.18}],
            [W('a4', 'Straßenlaternen'), {x: 1200, y: 720, z: 1.12}], [W('a4', 'Sterne'), {x: 1300, y: 300, z: 1.0}],
            [S('a4b'), {x: 1000, y: 420, z: 1.35}], [W('a4b', 'Stromnetze'), {x: 900, y: 560, z: 1.1}], [S('a4c'), {x: 950, y: 560, z: 1.05}],
          ])} />
        {f >= at && f < at + 8 && <rect width={SW} height={SH} fill="#000" opacity={1 - (f - at) / 8} />}
      </>
    );
  }},
  {from: S('a4c'), to: W('a4c', 'tausende'), draw: (f) => <PlaneScene f={f} t0={S('a4c')} end={W('a4c', 'tausende')} />},
  {from: W('a4c', 'tausende'), to: S('a5'), draw: (f) => <SatScene f={f} t0={W('a4c', 'tausende')} issAt={S('a4d')} end={S('a5')} lightOff={W('a4c', 'verlieren')} />},
  {from: S('a5'), to: S('a6'), draw: (f) => <MoonScene f={f} t0={S('a5')} offAt={W('a5', 'Also')} end={S('a6')} />},
  {from: S('a6'), to: S('a8b'), draw: (f) => <SystemScene f={f} t0={S('a6')} jupAt={S('a7')} satAt={S('a8')} end={S('a8b')} />},
  {from: S('a8b'), to: S('a9'), draw: (f) => <TelescopeScene f={f} t0={S('a8b')} end={S('a9')} />},
  {from: S('a9'), to: S('c1'), draw: (f) => <DriftScene f={f} t0={S('a9')} free={W('a9', 'Halt')} waveFrom={W('a9', 'Halt') - 120} scatterAt={S('a12')} end={S('c1')} />},

  // the cold
  {from: S('c1'), to: S('c2'), draw: (f) => (
    <VillageScene f={f} frost={0} snow={0} people={0} warmGround={1}
      cam={camAt(f, [[S('c1'), {x: 900, y: 500, z: 1.0}], [S('c2'), {x: 1000, y: 700, z: 1.15}]])} />
  )},
  {from: S('c2'), to: S('c2b'), draw: (f) => <HeatScene f={f} t0={S('c2')} end={S('c2b')} />},
  {from: S('c2b'), to: S('c3'), draw: (f) => <WeatherScene f={f} t0={S('c2b')} snowAt={W('c2c', 'Schnee')} clearAt={W('c2c', 'klar')} end={S('c3')} />},
  {from: S('c3'), to: S('c4b'), draw: (f) => (
    <VillageScene f={f} frost={0.5 + 0.5 * rise(f, S('c4'), 40)} snow={1} people={rise(f, S('c3') + 30, 20)}
      cam={camAt(f, [[S('c3'), {x: 800, y: 560, z: 0.95}], [S('c4'), {x: 1100, y: 800, z: 1.2}], [S('c4b'), {x: 1150, y: 860, z: 1.3}]])} />
  )},
  {from: S('c4b'), to: S('c4c'), draw: (f) => <PipeScene f={f} t0={S('c4b')} burstAt={W('c4b', 'platzen')} end={S('c4c')} />},
  {from: S('c4c'), to: S('c5'), draw: (f) => <FuelScene f={f} t0={S('c4c')} end={S('c5')} />},
  {from: S('c5'), to: S('c8'), draw: (f) => <PlantScene f={f} t0={S('c5')} treeAt={S('c6')} deerAt={S('c7')} end={S('c8')} />},
  {from: S('c8'), to: S('s1'), draw: (f) => <OceanScene f={f} t0={S('c8')} blanketAt={W('c9', 'Decke')} hopeAt={S('c9b')} end={S('s1')} />},

  // who survives
  {from: S('s1'), to: S('s6'), draw: (f) => <VentScene f={f} t0={S('s1')} revealAt={S('s2')} heatAt={S('s3')} lifeAt={S('s4')} o2At={S('s4b')} subAt={S('s5b')} end={S('s6')} />},
  {from: S('s6'), to: S('s7b'), draw: (f) => (
    <GeoTownScene f={f} cam={camAt(f, [[S('s6'), {x: 1300, y: 300, z: 1.1}], [S('s7'), {x: 1000, y: 640, z: 1.0}], [S('s7b'), {x: 800, y: 700, z: 1.2}]])} />
  )},
  {from: S('s7b'), to: S('s8'), draw: (f) => <HeatFlowScene f={f} t0={S('s7b')} barsAt={W('s7b', 'Mehr')} spotsAt={S('s7c')} end={S('s8')} />},
  {from: S('s8'), to: S('s10'), draw: (f) => <BunkerScene f={f} t0={S('s8')} peopleAt={S('s9')} techAt={S('s9b')} end={S('s10')} />},
  {from: S('s10'), to: S('s12'), draw: (f) => <AirSnowScene f={f} t0={S('s10')} snowAt={S('s11')} end={S('s12')} />},
  {from: S('s12'), to: S('e0b'), draw: (f) => <LonelyScene f={f} t0={S('s12')} end={S('e0b')} />},

  // the end
  {from: S('e0b'), to: S('e1'), draw: (f) => <FoodScene f={f} t0={S('e0b')} end={S('e1')} />},
  {from: S('e1'), to: S('e4'), draw: (f) => <FinalParkScene f={f} t0={S('e1')} dark={DARK} remaining={remaining} night={f >= DARK ? 1 : 0} />},
  {from: S('e4'), to: DURATION, draw: (f) => <SunriseScene f={f} t0={S('e4')} end={DURATION} />},
];

// how each segment is entered (same order as SEGMENTS)
const TRS: (Tr | undefined)[] = [
  undefined,
  {type: 'dissolve', dur: 18}, {type: 'push'}, {type: 'pull'}, {type: 'whip', dir: 'left'}, {type: 'whip', dir: 'right'},
  {type: 'dissolve', dur: 22}, {type: 'iris', x: 1500, y: 260}, {type: 'pull'},
  {type: 'dissolve'}, {type: 'dissolve', dur: 12}, {type: 'dissolve', dur: 22}, {type: 'whip', dir: 'left'}, {type: 'pull'},
  {type: 'push'}, {type: 'iris'}, {type: 'whip', dir: 'down'}, {type: 'pull'}, {type: 'whip', dir: 'left'}, {type: 'pull'}, {type: 'iris'}, {type: 'pull'},
  {type: 'push'}, {type: 'pull'}, {type: 'push'}, {type: 'dissolve'}, {type: 'push'}, {type: 'whip', dir: 'left'}, {type: 'dissolve'}, {type: 'whip', dir: 'up'},
  {type: 'dissolve', dur: 22}, {type: 'whip', dir: 'down'}, {type: 'pull'}, {type: 'push'}, {type: 'whip', dir: 'down'}, {type: 'pull'},
  {type: 'iris'}, {type: 'dissolve'}, {type: 'dissolve', dur: 30},
];
const ITEMS: Item[] = SEGMENTS.map((s, i) => ({at: s.from, draw: s.draw, tr: TRS[i]}));

// ---------------------------------------------------------------------------------------
// sound effects (synthesized by scripts/sfx.py)

type Hit = {at: number; sfx: string; vol: number};
const SKIP_CALLOUTS = ['150 Mio. km', '499 s', '1,3 s', '47 TW', '⚽  ·  24 m  ·  •'];

const HITS: Hit[] = (() => {
  const hits: Hit[] = [];
  const add = (at: number, sfx: string, vol: number) => hits.push({at: Math.max(0, Math.round(at)), sfx, vol});
  const fromTr = (items: Item[]) => items.forEach((it) => {
    const tr = it.tr;
    if (!tr || tr.type === 'cut' || tr.type === 'dissolve') return;
    if (tr.type === 'whip') add(it.at - 5, 'whoosh', 0.32);
    else add(it.at - 8, 'whoosh_soft', 0.3);
  });
  fromTr(INTRO_ITEMS.filter((it) => it.at < S('l1')));
  fromTr(ITEMS);
  add(VANISH - 2, 'boom', 0.75);
  add(W('a3', 'Schlag') - 2, 'boom', 0.7);
  add(W('g5', 'verschmolzen'), 'boom', 0.45);
  add(DARK - 1, 'boom', 0.6);
  CALLOUTS.forEach((c) => { if (!SKIP_CALLOUTS.includes(c.big)) add(c.at, 'blip', 0.22); });
  // ticks: the big clock scene, then every second of the last ten
  for (let f = S('a1'); f < S('a2'); f += 30) add(f, 'tick', 0.25);
  let last = Math.ceil(remaining(DARK - 400));
  for (let f = DARK - 400; f < DARK; f++) {
    const r = Math.ceil(remaining(f));
    if (r !== last && r <= 10) add(f, 'tick', r <= 3 ? 0.6 : 0.3);
    last = r;
  }
  return hits;
})();

// looping beds: wind in the cold, the muffled sea under the ice and at the vents
const BEDS = [
  {from: S('c1'), to: S('c8'), sfx: 'wind', vol: 0.2},
  {from: S('c8'), to: S('s6'), sfx: 'underwater', vol: 0.28},
  {from: S('s6'), to: S('s8'), sfx: 'wind', vol: 0.14},
  {from: S('s10'), to: S('e0b'), sfx: 'wind', vol: 0.2},
];

const SoundFx: React.FC = () => (
  <>
    {HITS.map((h, i) => (
      <Seq key={`h${i}`} from={h.at} durationInFrames={110} layout="none">
        <Audio src={staticFile(`sonne/sfx/${h.sfx}.wav`)} volume={h.vol} />
      </Seq>
    ))}
    {BEDS.map((b, i) => (
      <Seq key={`b${i}`} from={b.from} durationInFrames={b.to - b.from} layout="none">
        <Audio src={staticFile(`sonne/sfx/${b.sfx}.wav`)} loop
          volume={(fr) => b.vol * Math.min(1, fr / 45, (b.to - b.from - fr) / 45)} />
      </Seq>
    ))}
  </>
);

export const SonneAnimated: React.FC = () => {
  const f = useCurrentFrame();
  const black = f >= DARK && f < S('e4') ? 1 - rise(f, DARK + 50, 40) : 0;
  const fadeOut = 1 - rise(f, DURATION - 30, 28);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Audio src={staticFile('sonne/voice.wav')} />
      <Audio src={staticFile('sonne/ambient.wav')} volume={(fr) => 0.35 * (fr < DARK ? 1 : rise(fr, S('e4'), 60))} />
      <SoundFx />
      <svg width={SW} height={SH} style={{position: 'absolute', opacity: fadeOut}}>
        <Defs />
        <LightDefs />
        <GravityDefs />
        <DarkDefs />
        <ColdDefs />
        <LifeDefs />
        <Sequence f={f} items={ITEMS} uid="main" />
      </svg>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, transparent 60%, rgba(0,0,0,0.4) 100%)'}} />
      <AbsoluteFill style={{background: '#000', opacity: Math.max(0, black)}} />
      <Thermometer />
      <CalloutLayer skip={['150 Mio. km', '499 s', '1,3 s', '47 TW', '⚽  ·  24 m  ·  •']} />
      <div style={{opacity: fadeOut}}><Clock /></div>
    </AbsoluteFill>
  );
};
