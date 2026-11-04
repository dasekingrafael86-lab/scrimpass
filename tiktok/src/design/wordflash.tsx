// Word-flash engine (see STYLE_wordflash.md): one big word at a time, filled with the scene
// behind it, one kit scene per shot (a shot covers one or more script lines), the camera
// always drifting slowly, hard cuts on the voice, no sound effects.
import React from 'react';
import {AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {loadFont} from '@remotion/google-fonts/Montserrat';
import {KitDefs, P} from './kit';
import {FPS} from '../lib/theme';

const {fontFamily: wordFont} = loadFont('normal', {weights: ['900'], subsets: ['latin', 'latin-ext']});

export const WF_W = 1920;
export const WF_H = 1080;

export type WFLine = {start: number; end: number; words: {w: string; start: number; end: number}[]};
export type WFTiming = {duration: number; lines: Record<string, WFLine>};
export type SceneProps = {f: number; dur: number; at: (word: string, nth?: number) => number};
export type Cam = {z: [number, number]; x?: [number, number]; y?: [number, number]; r?: [number, number]};
export type Shot = {lines: string[]; cam: Cam; wordY: number; draw: (p: SceneProps) => React.ReactNode};

const fr = (s: number) => Math.round(s * FPS);

const camTransform = (c: Cam, p: number) => {
  const v = (k?: [number, number]) => (k ? k[0] + (k[1] - k[0]) * p : 0);
  return `translate(${WF_W / 2} ${WF_H / 2}) scale(${v(c.z)}) rotate(${v(c.r)}) translate(${-WF_W / 2 - v(c.x)} ${-WF_H / 2 - v(c.y)})`;
};

export type WFOptions = {words?: boolean; Overlay?: React.FC};

export const makeWordFlash = (timing: WFTiming, shots: Shot[], audio: string, tailSec = 2.6, opts: WFOptions = {}) => {
  const showWords = opts.words ?? true;
  const Overlay = opts.Overlay;
  const LINES = timing.lines;
  const ids = Object.keys(LINES);
  const lastLine = LINES[ids[ids.length - 1]];
  const duration = Math.ceil((timing.duration + tailSec) * FPS);
  const starts = shots.map((s, i) => (i === 0 ? 0 : fr(LINES[s.lines[0]].start) - 2));
  const words = ids.flatMap((id) => LINES[id].words.map((w) => ({
    text: w.w.replace(/[.,:;!?„“"]/g, '').toUpperCase(),
    from: fr(w.start),
  }))).filter((w) => w.text.length > 0);
  const lastOff = fr(lastLine.end) + 12;
  const wordAt = (f: number) => {
    if (f >= lastOff) return null;
    let cur = null;
    for (const w of words) {
      if (w.from <= f) cur = w;
      else break;
    }
    return cur;
  };

  const Video: React.FC = () => {
    const f = useCurrentFrame();
    let i = 0;
    while (i + 1 < shots.length && starts[i + 1] <= f) i++;
    const shot = shots[i];
    const start = starts[i];
    const end = i + 1 < shots.length ? starts[i + 1] : duration;
    const p = interpolate(f, [start, end], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
    // word frame -> scene-local frame (nth match inside this shot's lines)
    const at = (word: string, nth = 0) => {
      const hits = shot.lines.flatMap((id) => LINES[id].words).filter((w) => w.w.toLowerCase().startsWith(word.toLowerCase()));
      const hit = hits[nth] ?? hits[0];
      return hit ? fr(hit.start) - start : 0;
    };
    const scene = <g transform={camTransform(shot.cam, p)}>{shot.draw({f: f - start, dur: end - start, at})}</g>;

    const word = showWords ? wordAt(f) : null;
    const size = word ? Math.min(176, 1640 / (word.text.length * 0.8)) : 0;
    const wy = shot.wordY * WF_H + size * 0.36;
    const wordEl = (props: React.SVGProps<SVGTextElement>) => (
      <text x={WF_W / 2} y={wy} textAnchor="middle" fontFamily={wordFont} fontWeight={900} fontSize={size} letterSpacing={size * 0.01} {...props}>{word?.text}</text>
    );

    return (
      <AbsoluteFill style={{background: P.night}}>
        <svg width={WF_W} height={WF_H} viewBox={`0 0 ${WF_W} ${WF_H}`}>
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
                <g transform={`translate(${WF_W / 2} ${WF_H / 2}) scale(1.1) translate(${-WF_W / 2 - 36} ${-WF_H / 2 - 22})`}>{scene}</g>
              </g>
            </g>
          )}
        </svg>
        {Overlay && <Overlay />}
        <Audio src={staticFile(audio)} />
      </AbsoluteFill>
    );
  };
  return {Video, duration, lineEnd: (id: string) => fr(LINES[id].end), lineStart: (id: string) => fr(LINES[id].start), starts};
};
