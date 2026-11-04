// "Leo" — ScrimPass spot in the word-flash style (engine: src/design/wordflash.tsx).
import React from 'react';
import {staticFile} from 'remotion';
import {Shot, WF_H, WF_W, WFTiming, makeWordFlash} from '../../design/wordflash';
import {FPS} from '../../lib/theme';
import {Bedroom, Call, Desk, Doubt, Grow, Logo, Replay, Scrim, Space, Team, Think} from './scenes';
import timingJson from './timing.json';

export const LW = WF_W;
export const LH = WF_H;
const TIMING = timingJson as WFTiming;
const fr = (s: number) => Math.round(s * FPS);
const LOGO = staticFile('leo/logo.png');

const SHOTS: Shot[] = [
  {lines: ['bed1'], cam: {z: [1.0, 1.08], r: [0, 2]}, wordY: 0.5, draw: (p) => <Bedroom {...p} />},
  {lines: ['bed2'], cam: {z: [1.6, 1.75], x: [60, 80], y: [-170, -190]}, wordY: 0.8, draw: (p) => <Bedroom {...p} close />},
  {lines: ['desk1'], cam: {z: [1.18, 1.28], x: [-80, -40], y: [40, 60]}, wordY: 0.25, draw: (p) => <Desk {...p} mode="alone" />},
  {lines: ['desk2'], cam: {z: [1.0, 1.05], x: [0, -20]}, wordY: 0.22, draw: (p) => <Desk {...p} mode="nobody" />},
  {lines: ['doubt'], cam: {z: [1.05, 1.15], y: [0, 30]}, wordY: 0.22, draw: (p) => <Doubt {...p} />},
  {lines: ['think'], cam: {z: [1.0, 1.08], x: [-30, 30]}, wordY: 0.47, draw: (p) => <Think {...p} />},
  {lines: ['call'], cam: {z: [1.0, 1.05]}, wordY: 0.5, draw: (p) => <Call {...p} />},
  {lines: ['scrim'], cam: {z: [1.0, 1.12], r: [0, -3]}, wordY: 0.5, draw: (p) => <Scrim {...p} />},
  {lines: ['replay'], cam: {z: [1.0, 1.1], x: [-40, -120]}, wordY: 0.5, draw: (p) => <Replay {...p} />},
  {lines: ['grow'], cam: {z: [1.0, 1.05], x: [-40, 40]}, wordY: 0.2, draw: (p) => <Grow {...p} />},
  {lines: ['space'], cam: {z: [1.05, 1.1]}, wordY: 0.33, draw: (p) => <Space {...p} />},
  {lines: ['morning'], cam: {z: [1.12, 1.02], y: [20, 0]}, wordY: 0.25, draw: (p) => <Desk {...p} mode="morning" />},
  {lines: ['team'], cam: {z: [1.15, 1.05], y: [30, 0]}, wordY: 0.25, draw: (p) => <Team {...p} />},
  {lines: ['end'], cam: {z: [1.0, 1.04]}, wordY: 0.64,
    draw: (p) => <Logo {...p} logo={LOGO} tagAt={fr(TIMING.lines.end.end + 0.4) - (fr(TIMING.lines.end.start) - 2)} />},
];

const WF = makeWordFlash(TIMING, SHOTS, 'leo/voice.wav');
export const LeoVideo = WF.Video;
export const LEO_DURATION = WF.duration;
