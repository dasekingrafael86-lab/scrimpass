// "Alltag" — thoughts everyone has, in the word-flash style (engine: src/design/wordflash.tsx).
import React from 'react';
import {Shot, WFTiming, makeWordFlash} from '../../design/wordflash';
import {Alarm, Cliff, Dream, Friends, Morning, Pile, Planets, Sofa, Stone} from './scenes';
import timingJson from './timing.json';

const SHOTS: Shot[] = [
  {lines: ['alarm'], cam: {z: [1.0, 1.1], r: [0, 2]}, wordY: 0.5, draw: (p) => <Alarm {...p} />},
  {lines: ['nope'], cam: {z: [1.6, 1.8], y: [-170, -190]}, wordY: 0.8, draw: (p) => <Alarm {...p} close />},
  {lines: ['bills'], cam: {z: [1.0, 1.1], y: [0, 20]}, wordY: 0.55, draw: (p) => <Pile {...p} />},
  {lines: ['why'], cam: {z: [1.05, 1.12], x: [0, 20]}, wordY: 0.3, draw: (p) => <Sofa {...p} />},
  {lines: ['stone'], cam: {z: [1.0, 1.08], x: [-30, 30]}, wordY: 0.3, draw: (p) => <Stone {...p} />},
  {lines: ['dream'], cam: {z: [1.08, 1.0]}, wordY: 0.28, draw: (p) => <Dream {...p} />},
  {lines: ['space'], cam: {z: [1.15, 1.0], r: [-3, 0]}, wordY: 0.5, draw: (p) => <Planets {...p} />},
  {lines: ['feel'], cam: {z: [1.0, 1.06]}, wordY: 0.25, draw: (p) => <Friends {...p} />},
  {lines: ['okay'], cam: {z: [1.12, 1.02], x: [-40, 0]}, wordY: 0.3, draw: (p) => <Cliff {...p} />},
  {lines: ['end'], cam: {z: [1.0, 1.06]}, wordY: 0.25, draw: (p) => <Morning {...p} />},
];

const WF = makeWordFlash(timingJson as WFTiming, SHOTS, 'alltag/voice.wav', 1.8);
export const AlltagVideo = WF.Video;
export const ALLTAG_DURATION = WF.duration;
