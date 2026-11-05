// "Was wäre, wenn die Erde aufhört, sich zu drehen?" — neon explainer built from flowing acts
// (src/design/flow.tsx): scenes change inside an act, acts hand over with iris and zoom moves.
import React from 'react';
import {Act, FTiming, makeFlow} from '../../design/flow';
import {Bulge, Globe, Storm, Surface, Waves} from './acts1';
import {GoodNews, Magnet, Survivors, Tides, Timeline, YearDay} from './acts2';
import timingJson from './timing.json';

const ACTS: Act[] = [
  {lines: ['h1', 'h2', 'h3'], draw: (p) => <Globe {...p} />},
  {lines: ['s1', 's2', 's3', 'f1'], enter: {type: 'iris', x: 1340, y: 560, dur: 26}, draw: (p) => <Surface {...p} />},
  {lines: ['f2', 'f3'], enter: {type: 'zoom', x: 960, y: 560, dur: 24}, draw: (p) => <Storm {...p} />},
  {lines: ['o1'], enter: {type: 'iris', x: 640, y: 560, dur: 24}, draw: (p) => <Waves {...p} />},
  {lines: ['o2', 'o3', 'o4', 'o5'], enter: {type: 'irisOut', x: 960, y: 560, dur: 24}, draw: (p) => <Bulge {...p} />},
  {lines: ['d1', 'd2', 'd3', 'd4'], enter: {type: 'zoom', x: 960, y: 560, dur: 24}, draw: (p) => <YearDay {...p} />},
  {lines: ['m1', 'm2', 'm3'], enter: {type: 'iris', x: 1360, y: 600, dur: 24}, draw: (p) => <Magnet {...p} />},
  {lines: ['l1', 'l2', 'l3'], enter: {type: 'zoom', x: 960, y: 560, dur: 24}, draw: (p) => <Survivors {...p} />},
  {lines: ['e1', 'e2'], enter: {type: 'irisOut', x: 1520, y: 580, dur: 24}, draw: (p) => <GoodNews {...p} />},
  {lines: ['e3'], enter: {type: 'zoom', x: 960, y: 560, dur: 22}, draw: (p) => <Tides {...p} />},
  {lines: ['e4', 'e5'], enter: {type: 'iris', x: 960, y: 560, dur: 26}, draw: (p) => <Timeline {...p} />},
];

const F = makeFlow(timingJson as FTiming, ACTS, 'stopp/voice.wav', 2.5);
export const StoppVideo = F.Video;
export const STOPP_DURATION = F.duration;
