// "Die Sonne ist weg – und du hast noch 8 Minuten" in the look of the word-flash videos:
// one new flat kit picture per sentence, slow camera drift, hard cuts on the voice.
// No words on screen and no sound effects; same Adrian voice and timing as the first sun video.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {P, kitFont} from '../../design/kit';
import {Shot, WFTiming, makeWordFlash} from '../../design/wordflash';
import {FPS} from '../../lib/theme';
import timingJson from '../sonne/timing.json';
import {DARK, remaining} from '../sonne/Video';
import * as A from './scenes1';
import * as B from './scenes2';
import * as Cc from './scenes3';

const TIMING = timingJson as WFTiming;
const fr = (s: number) => Math.round(s * FPS);
const startOf = (id: string) => fr(TIMING.lines[id].start) - 2;
const W = (id: string, word: string) => {
  const w = TIMING.lines[id].words.find((x) => x.w.toLowerCase().startsWith(word.toLowerCase()));
  return fr((w ?? TIMING.lines[id].words[0]).start);
};

const S = (lines: string[], z: [number, number], draw: Shot['draw'], x?: [number, number], y?: [number, number], r?: [number, number]): Shot => ({
  lines, cam: {z, x, y, r}, wordY: 0.5, draw,
});

const SHOTS: Shot[] = [
  S(['i1'], [1.05, 1.15], (p) => <A.SunGone {...p} />),
  S(['i2'], [1.0, 1.08], (p) => <A.EmptySpot {...p} />, [-40, 20]),
  S(['i3'], [1.0, 1.06], (p) => <A.Picnic {...p} />),
  S(['i3b'], [1.5, 1.6], (p) => <A.Picnic {...p} point />, [140, 180], [-230, -240]),
  S(['i4'], [1.0, 1.08], (p) => <A.Kites {...p} />, [-30, 30]),
  S(['i5'], [1.0, 1.1], (p) => <A.Watch {...p} secs={(lf) => remaining(lf + startOf('i5'))} />),
  S(['i6'], [1.06, 1.0], (p) => <A.Picnic {...p} night={1} sunO={0} />),
  S(['i7'], [1.0, 1.12], (p) => <A.DarkEarth {...p} />),
  S(['l1'], [1.0, 1.06], (p) => <A.MiaWonders {...p} />),
  S(['l2'], [1.0, 1.05], (p) => <A.LightRace {...p} />),
  S(['l3'], [1.0, 1.06], (p) => <A.LightRace {...p} fast />),
  S(['l4'], [1.1, 1.0], (p) => <A.AroundEarth {...p} />),
  S(['l5'], [1.0, 1.05], (p) => <A.FarAway {...p} />, [-20, 20]),
  S(['l5b'], [1.0, 1.06], (p) => <A.Pitch {...p} />),
  S(['l6'], [1.0, 1.05], (p) => <A.Travel {...p} />),
  S(['l6b'], [1.0, 1.08], (p) => <A.MoonLook {...p} />, [0, 40]),
  S(['l6c', 'l6d'], [1.0, 1.1], (p) => <A.OldStars {...p} />, [0, 0], [-30, 0]),
  S(['l7'], [1.0, 1.08], (p) => <A.Sunbath {...p} />),
  S(['l8'], [1.0, 1.04], (p) => <A.Letter {...p} />),
  S(['l9', 'l10'], [1.0, 1.06], (p) => <A.Shell {...p} />),

  S(['g1'], [1.0, 1.06], (p) => <B.Tether {...p} />),
  S(['g2'], [1.2, 1.3], (p) => <B.Tether {...p} worried />),
  S(['g3', 'g4'], [1.0, 1.06], (p) => <B.GravWave {...p} />, [-30, 30]),
  S(['g4b'], [1.0, 1.08], (p) => <B.Cloth {...p} />),
  S(['g5'], [1.0, 1.05], (p) => <B.Neutron {...p} />),
  S(['g6', 'g7'], [1.05, 1.0], (p) => <B.Unaware {...p} />),
  S(['a1', 'a2'], [1.0, 1.06], (p) => <B.Street {...p} />, [-40, 20]),
  S(['a3'], [1.06, 1.1], (p) => <B.Street {...p} off={W('a3', 'Schlag') - startOf('a3')} />),
  S(['a4'], [1.0, 1.08], (p) => <B.Street {...p} off={0} lampsAt={W('a4', 'Straßenlaternen') - startOf('a4')} starsAt={W('a4', 'Sterne') - startOf('a4')} look />, [0, 0], [10, -30]),
  S(['a4b'], [1.0, 1.06], (p) => <B.Solar {...p} />),
  S(['a4c'], [1.0, 1.05], (p) => <B.NightFlight {...p} />),
  S(['a4d'], [1.0, 1.08], (p) => <B.Station {...p} />),
  S(['a5'], [1.0, 1.1], (p) => <B.MoonOut {...p} />),
  S(['a6', 'a7'], [1.0, 1.06], (p) => <B.LastLight {...p} who="jupiter" />),
  S(['a8'], [1.0, 1.06], (p) => <B.LastLight {...p} who="saturn" />),
  S(['a8b'], [1.0, 1.06], (p) => <B.Eyepiece {...p} />),
  S(['a9', 'a10'], [1.0, 1.05], (p) => <B.Straight {...p} />),
  S(['a11'], [1.0, 1.08], (p) => <B.Cruise {...p} />),
  S(['a12', 'a13'], [1.15, 0.95], (p) => <B.Scatter {...p} />),
  S(['c1'], [1.0, 1.06], (p) => <B.Candles {...p} />),
  S(['c2'], [1.0, 1.08], (p) => <B.Radiate {...p} />),
  S(['c2b'], [1.0, 1.05], (p) => <B.Weather {...p} />),
  S(['c2c'], [1.0, 1.06], (p) => <B.LastSnow {...p} />),
  S(['c3'], [1.0, 1.06], (p) => <B.Freezing {...p} t={-18} />),
  S(['c4'], [1.0, 1.06], (p) => <B.Freezing {...p} t={-70} deep />),
  S(['c4b'], [1.0, 1.06], (p) => <B.HouseCut {...p} />),
  S(['c4c'], [1.0, 1.06], (p) => <B.Fuel {...p} />),
  S(['c5'], [1.0, 1.06], (p) => <B.Meadow {...p} />),
  S(['c6'], [1.0, 1.08], (p) => <B.BigTree {...p} />, [0, 0], [0, -20]),
  S(['c7'], [1.0, 1.06], (p) => <B.Rabbit {...p} />),
  S(['c8', 'c9'], [1.0, 1.06], (p) => <B.OceanIce {...p} />),
  S(['c9b'], [1.0, 1.15], (p) => <B.OceanIce {...p} deep />, [0, 0], [0, 120]),

  S(['s1', 's2'], [1.0, 1.08], (p) => <Cc.Descent {...p} />, [0, 0], [-60, 60]),
  S(['s3'], [1.0, 1.06], (p) => <Cc.VentHeat {...p} />),
  S(['s4'], [1.0, 1.06], (p) => <Cc.VentLife {...p} />, [-40, 40]),
  S(['s4b'], [1.0, 1.04], (p) => <Cc.Oxygen {...p} />),
  S(['s4c'], [1.0, 1.08], (p) => <Cc.Bacteria {...p} />),
  S(['s5'], [1.0, 1.08], (p) => <Cc.VentLife {...p} crabOnly />),
  S(['s5b'], [1.0, 1.05], (p) => <Cc.Sub1977 {...p} />),
  S(['s6'], [1.0, 1.06], (p) => <Cc.EarthHeat {...p} />),
  S(['s7'], [1.0, 1.06], (p) => <Cc.Iceland {...p} />),
  S(['s7b'], [1.0, 1.04], (p) => <Cc.EarthHeat {...p} bars />),
  S(['s7c'], [1.0, 1.08], (p) => <Cc.HotSpots {...p} />),
  S(['s8'], [1.0, 1.06], (p) => <Cc.Bunker {...p} />),
  S(['s9', 's9b'], [1.0, 1.08], (p) => <Cc.Bunker {...p} farm />, [-30, 30]),
  S(['s10', 's11'], [1.0, 1.08], (p) => <Cc.AirSnow {...p} />),
  S(['s12'], [1.15, 1.0], (p) => <Cc.IceBall {...p} />),
  S(['e0'], [1.0, 0.85], (p) => <Cc.IceBall {...p} />),
  S(['e0b'], [1.0, 1.06], (p) => <Cc.Orchard {...p} />),
  S(['e1', 'e2'], [1.0, 1.12], (p) => <A.Watch {...p} secs={(lf) => remaining(lf + startOf('e1'))} />),
  S(['e3'], [1.0, 1.04], (p) => <A.Picnic {...p} night={1} sunO={0} />),
  S(['e4'], [1.0, 1.06], (p) => <A.Kites {...p} />),
  S(['e5', 'e6'], [1.0, 1.08], (p) => <Cc.Sunset {...p} />),
];

// the countdown, top right, in the kit style
const CLOCK_IN = W('i5', 'Uhr');
const CLOCK_OUT = startOf('e4');
const Clock: React.FC = () => {
  const f = useCurrentFrame();
  if (f < CLOCK_IN - 2 || f > CLOCK_OUT + 20) return null;
  const r = remaining(f);
  const s = Math.ceil(r);
  const show = Math.min(1, Math.max(0, (f - CLOCK_IN + 2) / 10)) * Math.min(1, Math.max(0, 1 - (f - CLOCK_OUT) / 20));
  const red = f >= DARK || r < 10;
  return (
    <div style={{position: 'absolute', right: 56, top: 44, opacity: show, transform: `scale(${0.9 + 0.1 * show})`, transformOrigin: 'right top',
      padding: '12px 28px', borderRadius: 28, background: 'rgba(11,13,58,0.78)', fontFamily: kitFont, textAlign: 'right'}}>
      <div style={{fontSize: 22, fontWeight: 600, color: P.lilac, letterSpacing: 2}}>bis es dunkel wird</div>
      <div style={{fontSize: 74, fontWeight: 700, color: red ? P.red : P.cream, lineHeight: 1, fontVariantNumeric: 'tabular-nums'}}>
        {String(Math.floor(s / 60)).padStart(2, '0')}:{String(s % 60).padStart(2, '0')}
      </div>
    </div>
  );
};

const WF = makeWordFlash(TIMING, SHOTS, 'sonne/voice.wav', 1.5, {words: false, Overlay: Clock});
export const Sonne2Video = WF.Video;
export const SONNE2_DURATION = WF.duration;
