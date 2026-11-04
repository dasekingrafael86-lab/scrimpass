// "Leo" — ScrimPass spot in the word-flash style (see STYLE_wordflash.md):
// one big word at a time, filled with the scene behind it, a new kit scene per sentence,
// the camera always drifting slowly, hard cuts on the voice, no sound effects.
import React from 'react';
import {AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {loadFont} from '@remotion/google-fonts/Montserrat';
import {KitDefs, P} from '../../design/kit';
import {FPS} from '../../lib/theme';
import {Bedroom, Call, Desk, Doubt, Grow, Logo, Replay, Scrim, SceneProps, Space, Team, Think} from './scenes';
import timingJson from './timing.json';

const {fontFamily: wordFont} = loadFont('normal', {weights: ['900'], subsets: ['latin', 'latin-ext']});

export const LW = 1920;
export const LH = 1080;
type Line = {start: number; end: number; words: {w: string; start: number; end: number}[]};
const LINES = timingJson.lines as Record<string, Line>;
export const LEO_DURATION = Math.ceil((timingJson.duration + 2.6) * FPS);

type Cam = {z: [number, number]; x?: [number, number]; y?: [number, number]; r?: [number, number]};
type Shot = {lines: string[]; cam: Cam; wordY: number; draw: (p: SceneProps) => React.ReactNode};

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
  {lines: ['end'], cam: {z: [1.0, 1.04]}, wordY: 0.64, draw: (p) => <Logo {...p} logo={LOGO} tagAt={Math.round((LINES.end.end + 0.4) * FPS) - (Math.round(LINES.end.start * FPS) - 2)} />},
];

const fr = (s: number) => Math.round(s * FPS);
const STARTS = SHOTS.map((s, i) => (i === 0 ? 0 : fr(LINES[s.lines[0]].start) - 2));

// every spoken word, in order, with the frame it appears
const WORDS = Object.values(LINES).flatMap((l) => l.words.map((w) => ({
  text: w.w.replace(/[.,:;!?„“"]/g, '').toUpperCase(),
  from: fr(w.start),
}))).filter((w) => w.text.length > 0);
const LAST_OFF = fr(LINES.end.end) + 12;

const wordAt = (f: number) => {
  if (f >= LAST_OFF) return null;
  let cur = null;
  for (const w of WORDS) {
    if (w.from <= f) cur = w;
    else break;
  }
  return cur;
};

const camTransform = (c: Cam, p: number) => {
  const v = (k?: [number, number]) => (k ? k[0] + (k[1] - k[0]) * p : 0);
  const z = v(c.z);
  return `translate(${LW / 2} ${LH / 2}) scale(${z}) rotate(${v(c.r)}) translate(${-LW / 2 - v(c.x)} ${-LH / 2 - v(c.y)})`;
};

export const LeoVideo: React.FC = () => {
  const f = useCurrentFrame();
  let i = 0;
  while (i + 1 < SHOTS.length && STARTS[i + 1] <= f) i++;
  const shot = SHOTS[i];
  const start = STARTS[i];
  const end = i + 1 < SHOTS.length ? STARTS[i + 1] : LEO_DURATION;
  const lf = f - start;
  const p = interpolate(f, [start, end], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  // word frame -> scene-local frame (nth match inside this shot's lines)
  const at = (word: string, nth = 0) => {
    const hits = shot.lines.flatMap((id) => LINES[id].words).filter((w) => w.w.toLowerCase().startsWith(word.toLowerCase()));
    const hit = hits[nth] ?? hits[0];
    return hit ? fr(hit.start) - start : 0;
  };
  const scene = <g transform={camTransform(shot.cam, p)}>{shot.draw({f: lf, dur: end - start, at})}</g>;

  const word = wordAt(f);
  const size = word ? Math.min(176, 1640 / (word.text.length * 0.8)) : 0;
  const wy = shot.wordY * LH + size * 0.36;
  const wordEl = (props: React.SVGProps<SVGTextElement>) => (
    <text x={LW / 2} y={wy} textAnchor="middle" fontFamily={wordFont} fontWeight={900} fontSize={size} letterSpacing={size * 0.01} {...props}>{word?.text}</text>
  );

  return (
    <AbsoluteFill style={{background: P.night}}>
      <svg width={LW} height={LH} viewBox={`0 0 ${LW} ${LH}`}>
        <KitDefs />
        <defs>
          {word && <clipPath id="wordClip">{wordEl({})}</clipPath>}
          {/* the scene inside the letters: hue turned, brighter */}
          <filter id="wordTint" colorInterpolationFilters="sRGB">
            <feColorMatrix type="hueRotate" values="55" />
            <feComponentTransfer>
              <feFuncR type="linear" slope={1.25} intercept={0.12} />
              <feFuncG type="linear" slope={1.25} intercept={0.12} />
              <feFuncB type="linear" slope={1.2} intercept={0.1} />
            </feComponentTransfer>
          </filter>
        </defs>
        {scene}
        {word && (
          <g>
            {wordEl({fill: P.ink, opacity: 0.22, transform: `translate(0 ${size * 0.05})`})}
            {wordEl({fill: P.cream, opacity: 0.62})}
            <g clipPath="url(#wordClip)" opacity={0.7} filter="url(#wordTint)">
              <g transform={`translate(${LW / 2} ${LH / 2}) scale(1.1) translate(${-LW / 2 - 36} ${-LH / 2 - 22})`}>{scene}</g>
            </g>
          </g>
        )}
      </svg>
      <Audio src={staticFile('leo/voice.wav')} />
    </AbsoluteFill>
  );
};
