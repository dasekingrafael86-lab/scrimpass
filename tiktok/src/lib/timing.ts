import {Easing, interpolate} from 'remotion';
import {FPS} from './theme';

export type Word = {w: string; start: number; end: number};
export type Line = {text: string; start: number; end: number; words: Word[]};
export type Timing = {duration: number; lines: Record<string, Line>};

// frame helpers keyed by the line ids from script.json
export const makeTiming = (timing: Timing) => {
  const line = (id: string) => {
    const l = timing.lines[id];
    if (!l) throw new Error(`unknown line "${id}"`);
    return l;
  };
  return {
    timing,
    s: (id: string, offsetSec = 0) => Math.round((line(id).start + offsetSec) * FPS),
    e: (id: string, offsetSec = 0) => Math.round((line(id).end + offsetSec) * FPS),
    // frame at which a word of a line is spoken (first match)
    w: (id: string, word: string) => {
      const hit = line(id).words.find((x) => x.w.toLowerCase().startsWith(word.toLowerCase()));
      return Math.round((hit ?? line(id).words[0]).start * FPS);
    },
    total: Math.ceil((timing.duration + 1.2) * FPS),
  };
};

const ease = Easing.bezier(0.22, 1, 0.36, 1);

// 0 -> 1 starting at `from`, over `dur` frames
export const rise = (frame: number, from: number, dur = 12) =>
  interpolate(frame, [from, from + dur], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});

// value animated between two frames
export const tween = (frame: number, from: number, to: number, a: number, b: number) =>
  interpolate(frame, [from, to], [a, b], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});

export const de = (n: number, digits = 1) => n.toFixed(digits).replace('.', ',');
