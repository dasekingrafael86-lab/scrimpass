// "Was wäre, wenn die Erde aufhört, sich zu drehen?" — long version (about 6 minutes):
// a hook with a teaser montage, then nine chapters built from flowing neon acts.
import React from 'react';
import {Act, FTiming, makeFlow} from '../../design/flow';
import {FPS} from '../../lib/theme';
import {Brake, Cabin, Fling, JoltMap, Lap, Latitudes} from './ch12';
import {AirShell, BulgeCut, DayNight, Erosion, Flood, NewMap, Pizza, Seabed, Shield, Tornado, Twilight, YearOrbit} from './ch3456';
import {DayTimeline, DeepSea, Finale, InnerClock, MoonBrake, Migration, NoBrake, Nomads, Plants, Refuge} from './ch789';
import {CityNoon, Feet, StopGlobe, Teaser} from './hook';
import {makeSound} from './Sound';
import timingJson from './timing.json';

const T = timingJson as FTiming;
const fr = (s: number) => Math.round(s * FPS);
const TITLE_AT = fr(T.lines.a7.end) + 10 - (fr(T.lines.a6.start) - 6);

const iris = (x = 960, y = 560) => ({type: 'iris' as const, x, y, dur: 24});
const zoom = (x = 960, y = 560) => ({type: 'zoom' as const, x, y, dur: 22});
const out = (x = 960, y = 560) => ({type: 'irisOut' as const, x, y, dur: 24});

const ACTS: Act[] = [
  {lines: ['a1', 'a2'], draw: (p) => <CityNoon {...p} />},
  {lines: ['a3', 'a4'], enter: zoom(960, 300), draw: (p) => <StopGlobe {...p} />},
  {lines: ['a5'], enter: iris(1340, 560), draw: (p) => <Feet {...p} />},
  {lines: ['a6', 'a7'], enter: zoom(), draw: (p) => <Teaser {...p} titleAt={TITLE_AT} />},
  {lines: ['b1', 'b2', 'b3'], enter: out(960, 600), draw: (p) => <Lap {...p} />},
  {lines: ['b4', 'b5'], enter: zoom(), draw: (p) => <Latitudes {...p} />},
  {lines: ['b6', 'b7', 'b8'], enter: iris(1270, 560), draw: (p) => <Cabin {...p} />},
  {lines: ['c1'], enter: zoom(), draw: (p) => <Fling {...p} keys={{stop: 'stoppt', p: 'alles', t: 'liegt', c: 'fliegt', h: 'Geschwindigkeit'}} />},
  {lines: ['c2', 'c3'], enter: iris(), draw: (p) => <Brake {...p} />},
  {lines: ['c4'], enter: out(1500, 380), draw: (p) => <Fling {...p} keys={{stop: '', p: 'Menschen', t: 'Tiere', c: 'Autos', h: 'Häuser', east: 'Osten'}} />},
  {lines: ['c5', 'c6'], enter: zoom(), draw: (p) => <JoltMap {...p} />},
  {lines: ['d1', 'd2', 'd3'], enter: iris(760, 600), draw: (p) => <AirShell {...p} />},
  {lines: ['d4'], enter: zoom(), draw: (p) => <Tornado {...p} />},
  {lines: ['d5'], enter: iris(380, 700), draw: (p) => <Erosion {...p} />},
  {lines: ['e1'], enter: zoom(1300, 500), draw: (p) => <Flood {...p} />},
  {lines: ['e2', 'e3'], enter: iris(), draw: (p) => <Pizza {...p} />},
  {lines: ['e4', 'e5'], enter: zoom(), draw: (p) => <BulgeCut {...p} />},
  {lines: ['e6'], enter: iris(960, 900), draw: (p) => <Seabed {...p} />},
  {lines: ['e7'], enter: zoom(), draw: (p) => <NewMap {...p} />},
  {lines: ['f1', 'f2', 'f3'], enter: out(), draw: (p) => <YearOrbit {...p} />},
  {lines: ['f4', 'f5'], enter: zoom(), draw: (p) => <DayNight {...p} />},
  {lines: ['f6', 'f7'], enter: iris(960, 560), draw: (p) => <Twilight {...p} />},
  {lines: ['g1', 'g2', 'g3', 'g4'], enter: zoom(1000, 770), draw: (p) => <Shield {...p} />},
  {lines: ['h1', 'h2', 'h3'], enter: iris(), draw: (p) => <Plants {...p} />},
  {lines: ['h4'], enter: zoom(1440, 1000), draw: (p) => <InnerClock {...p} />},
  {lines: ['h5'], enter: iris(1260, 380), draw: (p) => <Migration {...p} />},
  {lines: ['h6'], enter: zoom(1300, 980), draw: (p) => <DeepSea {...p} />},
  {lines: ['i1', 'i2'], enter: out(960, 600), draw: (p) => <Refuge {...p} />},
  {lines: ['i3'], enter: iris(1360, 680), draw: (p) => <Nomads {...p} />},
  {lines: ['j1', 'j2'], enter: zoom(), draw: (p) => <NoBrake {...p} />},
  {lines: ['j3'], enter: zoom(), draw: (p) => <MoonBrake {...p} />},
  {lines: ['j4', 'j5'], enter: iris(), draw: (p) => <DayTimeline {...p} />},
  {lines: ['j6'], enter: iris(1280, 330), draw: (p) => <Finale {...p} />},
];

const Sound = makeSound(T);
const F = makeFlow(T, ACTS, 'stopp2/voice.wav', 3, Sound);
export const Stopp2Video = F.Video;
export const STOPP2_DURATION = F.duration;
