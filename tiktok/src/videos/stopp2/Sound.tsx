// Music and sound effects for the long Earth-stops video.
// Effects are sparse: chapter starts plus the big moments (stop, wave, storm, boom), not every cut.
// Music sits under the voice and ducks whenever Adrian speaks.
import React from 'react';
import {Audio, Sequence, interpolate, staticFile} from 'remotion';
import {FTiming} from '../../design/flow';
import {FPS} from '../../lib/theme';

// ElevenLabs sound-effect prompts, one file each in public/stopp2/sfx/<name>.mp3
export const SFX_PROMPTS: Record<string, string> = {
  city: 'calm busy city street at noon near the sea, distant traffic, people chatting, seagulls, gentle ambience',
  impact: 'deep cinematic impact boom with low rumble, the whole planet suddenly stops, short metallic groan',
  whoosh: 'soft airy cinematic whoosh transition, smooth and clean',
  hit: 'very short punchy glitch hit for a fast montage cut',
  sting: 'magical shimmering riser ending in a soft bright chime, title reveal',
  pop: 'soft friendly bubble pop for a label appearing',
  cabin: 'airplane cabin interior hum, steady engine drone',
  screech: 'car tires screeching hard during an emergency brake',
  fling: 'fast whoosh of objects flying past at high speed',
  storm: 'extremely strong howling wind storm, roaring gusts, debris',
  boom: 'sonic boom, sharp double crack and rolling thunder',
  wave: 'huge ocean wave crashing onto a city, roaring water',
  drain: 'water draining away with a deep gurgle, sea level dropping',
  zap: 'electric crackle and buzzing static, radiation hitting',
  tick: 'mechanical clock ticking steadily',
  underwater: 'deep underwater ambience, muffled bubbles, calm',
};

type Cue = {name: string; at: number; vol: number; dur?: number; fadeIn?: number; fadeOut?: number};

export const makeSound = (T: FTiming) => {
  const fr = (s: number) => Math.round(s * FPS);
  const L = T.lines;
  const w = (id: string, word: string, d = 0) => {
    const hit = L[id].words.find((x) => x.w.toLowerCase().startsWith(word.toLowerCase()));
    return fr((hit ?? L[id].words[0]).start + d);
  };
  const s = (id: string, d = 0) => fr(L[id].start + d);
  const e = (id: string, d = 0) => fr(L[id].end + d);

  const cues: Cue[] = [
    // hook
    {name: 'city', at: 0, vol: 0.35, dur: s('a3') + 6, fadeOut: 20},
    {name: 'impact', at: w('a4', 'Sekunde', 0.1), vol: 0.9},
    {name: 'impact', at: w('a5', 'stehen'), vol: 0.45},
    {name: 'fling', at: w('a5', 'nicht'), vol: 0.6},
    ...Array.from({length: 10}, (_, k) => ({name: 'hit', at: w('a7', 'Und') + 4 + k * 11, vol: 0.35})),
    {name: 'sting', at: e('a7', 0.2), vol: 0.7},
    // chapter starts get a soft whoosh
    ...['b1', 'c1', 'd1', 'e1', 'f1', 'g1', 'h1', 'i1', 'j1'].map((id) => ({name: 'whoosh', at: s(id, -0.25), vol: 0.45})),
    // chapter 1
    {name: 'pop', at: w('b3', '1.670', -0.2), vol: 0.5},
    {name: 'cabin', at: w('b7', 'Flugzeug', -0.3), vol: 0.35, dur: e('b8') - w('b7', 'Flugzeug', -0.3) + 10, fadeIn: 12, fadeOut: 12},
    // chapter 2
    {name: 'impact', at: w('c1', 'stoppt'), vol: 0.7},
    {name: 'screech', at: w('c2', 'Vollbremsung', -0.3), vol: 0.6},
    ...['Menschen', 'Tiere', 'Autos', 'Häuser'].map((word) => ({name: 'fling', at: w('c4', word), vol: 0.45})),
    // chapter 3
    {name: 'storm', at: w('d2', 'Lufthülle'), vol: 0.5, dur: e('d5') - w('d2', 'Lufthülle') + 20, fadeIn: 40, fadeOut: 30},
    {name: 'boom', at: w('d3', 'Schall'), vol: 0.8},
    // chapter 4
    {name: 'wave', at: s('e1', 0.3), vol: 0.75},
    {name: 'drain', at: s('e6'), vol: 0.55},
    {name: 'pop', at: w('e7', 'Kontinent', -0.2), vol: 0.45},
    // chapter 5 and 6
    {name: 'pop', at: w('f3', 'ganzes', -0.2), vol: 0.45},
    {name: 'zap', at: w('g4', 'Strahlung', -0.1), vol: 0.6},
    // chapter 7 and 8
    {name: 'tick', at: s('h4'), vol: 0.4, dur: e('h4') - s('h4') + 6, fadeOut: 10},
    {name: 'underwater', at: s('h6', -0.2), vol: 0.5, dur: e('h6') - s('h6') + 20, fadeIn: 15, fadeOut: 15},
    // ending
    {name: 'screech', at: w('j2', 'nichts', 0.3), vol: 0.35},
    {name: 'sting', at: s('j6', -0.3), vol: 0.5},
  ];

  // all spoken stretches, for ducking the music
  const speech = Object.values(L).map((l) => [fr(l.start), fr(l.end)] as [number, number]);
  const speaking = (f: number) => speech.some(([a, b]) => f >= a - 6 && f <= b + 6);
  const MUSIC_LOOP = fr(120); // the music file is about two minutes long and loops

  const Sound: React.FC = () => (
    <>
      {/* music, looped with a short overlap; quiet while the voice talks */}
      {Array.from({length: Math.ceil((T.duration + 4) / 118)}, (_, k) => (
        <Sequence key={`m${k}`} from={k * (MUSIC_LOOP - 60)} durationInFrames={MUSIC_LOOP}>
          <Audio src={staticFile('stopp2/music.mp3')} volume={(f) => {
            const g = f + k * (MUSIC_LOOP - 60);
            const edge = Math.min(interpolate(f, [0, 60], [k === 0 ? 1 : 0, 1], {extrapolateRight: 'clamp'}), interpolate(f, [MUSIC_LOOP - 60, MUSIC_LOOP], [1, 0], {extrapolateLeft: 'clamp'}));
            return edge * (speaking(g) ? 0.09 : 0.22);
          }} />
        </Sequence>
      ))}
      {cues.map((c, i) => (
        <Sequence key={i} from={Math.max(0, c.at)} durationInFrames={c.dur ?? fr(8)}>
          <Audio src={staticFile(`stopp2/sfx/${c.name}.mp3`)} volume={(f) => {
            const d = c.dur ?? fr(8);
            const fi = c.fadeIn ? interpolate(f, [0, c.fadeIn], [0, 1], {extrapolateRight: 'clamp'}) : 1;
            const fo = c.fadeOut ? interpolate(f, [d - c.fadeOut, d], [1, 0], {extrapolateLeft: 'clamp'}) : 1;
            return c.vol * fi * fo;
          }} loop={!!c.dur} />
        </Sequence>
      ))}
    </>
  );
  return Sound;
};
