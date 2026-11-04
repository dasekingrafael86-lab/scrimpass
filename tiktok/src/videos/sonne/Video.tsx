// "Die Sonne ist weg – und du hast noch 8 Minuten": 16:9 explainer built on 20 illustrated stills.
// The countdown is real time: it starts at 8:19 and hits zero exactly when the last light would arrive.
import React from 'react';
import {AbsoluteFill, Audio, Easing, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {C, glow} from '../../lib/theme';
import {P as KIT, kitFont as fontFamily} from '../../design/kit';
import {makeTiming, rise} from '../../lib/timing';
import timingJson from './timing.json';

export const SW = 1920;
export const SH = 1080;
const T = makeTiming(timingJson);
export const DURATION = T.total;

const LIGHT_S = 499; // sun -> earth, seconds
const CLOCK0 = 0.35; // the clock starts with the first word
// the clock starts at 8:19 and hits zero exactly when "Eins" ends; to keep the voice flowing
// without long pauses it runs a little faster than real seconds
const ZERO_S = timingJson.lines.e2.end;
export const DARK = Math.round(ZERO_S * 30);
const clockFrac = (f: number) => Math.min(1, Math.max(0, (f / 30 - CLOCK0) / (ZERO_S - CLOCK0)));
export const remaining = (f: number) => LIGHT_S * (1 - clockFrac(f));

// ---------------------------------------------------------------------------------------
// shots: one still per idea, slow camera move across it (focus x/y in 0..1, zoom z)

type Focus = {x: number; y: number; z: number};
type Shot = {at: number; img: string; from: Focus; to: Focus};
const shot = (at: number, img: string, from: Focus, to: Focus): Shot => ({at, img, from, to});
const F = (x: number, y: number, z: number): Focus => ({x, y, z});

const SHOTS: Shot[] = [
  shot(0, '01_erde_sonne_verschwunden', F(0.25, 0.45, 1.35), F(0.5, 0.5, 1.0)),
  shot(T.s('i4'), '02_sonnige_stadt', F(0.5, 0.65, 1.0), F(0.4, 0.7, 1.15)),
  shot(T.s('i5'), '02_sonnige_stadt', F(0.88, 0.12, 1.45), F(0.85, 0.15, 1.2)),
  shot(T.s('i7'), '01_erde_sonne_verschwunden', F(0.72, 0.5, 1.15), F(0.75, 0.5, 1.35)),
  shot(T.s('l1'), '04_lichtstrahl_unterwegs', F(0.12, 0.5, 1.5), F(0.6, 0.5, 1.5)),
  shot(T.s('l5'), '04_lichtstrahl_unterwegs', F(0.5, 0.5, 1.0), F(0.55, 0.5, 1.08)),
  shot(T.s('l6b'), '08_mond_erlischt', F(0.5, 0.35, 1.05), F(0.55, 0.25, 1.25)),
  shot(T.s('l7'), '02_sonnige_stadt', F(0.25, 0.78, 1.3), F(0.32, 0.72, 1.4)),
  shot(T.s('l9'), '03_sonne_loest_sich_auf', F(0.5, 0.5, 1.3), F(0.5, 0.5, 1.0)),
  shot(T.s('g1'), '05_umlaufbahn_schwerkraftwellen', F(0.5, 0.5, 1.0), F(0.6, 0.45, 1.1)),
  shot(T.s('g4'), '05_umlaufbahn_schwerkraftwellen', F(0.6, 0.45, 1.5), F(0.6, 0.45, 1.25)),
  shot(T.s('g6'), '05_umlaufbahn_schwerkraftwellen', F(0.95, 0.47, 1.6), F(0.92, 0.47, 1.35)),
  shot(T.s('a1'), '06_stadt_goldene_stunde', F(0.5, 0.5, 1.0), F(0.5, 0.55, 1.1)),
  shot(T.s('a3'), '07_stadt_ploetzlich_dunkel', F(0.5, 0.35, 1.2), F(0.5, 0.5, 1.0)),
  shot(T.s('a4b'), '07_stadt_ploetzlich_dunkel', F(0.3, 0.3, 1.5), F(0.45, 0.25, 1.35)),
  shot(T.s('a5'), '08_mond_erlischt', F(0.53, 0.25, 1.6), F(0.53, 0.3, 1.2)),
  shot(T.s('a6'), '09_jupiter_saturn_leuchten', F(0.55, 0.35, 1.0), F(0.7, 0.25, 1.35)),
  shot(T.s('a8b'), '09_jupiter_saturn_leuchten', F(0.2, 0.6, 1.4), F(0.25, 0.55, 1.2)),
  shot(T.s('a9'), '10_erde_verlaesst_umlaufbahn', F(0.35, 0.5, 1.15), F(0.8, 0.35, 1.3)),
  shot(T.s('a12'), '10_erde_verlaesst_umlaufbahn', F(0.3, 0.55, 1.35), F(0.45, 0.5, 1.0)),
  shot(T.s('c1'), '11_erster_frost', F(0.5, 0.5, 1.0), F(0.35, 0.6, 1.15)),
  shot(T.s('c2b'), '12_gefrorenes_dorf', F(0.5, 0.3, 1.25), F(0.5, 0.5, 1.0)),
  shot(T.s('c4b'), '11_erster_frost', F(0.3, 0.65, 1.35), F(0.3, 0.6, 1.2)),
  shot(T.s('c5'), '13_pflanzen_welken', F(0.45, 0.5, 1.0), F(0.45, 0.45, 1.2)),
  shot(T.s('c8'), '14_ozean_unter_eis', F(0.5, 0.15, 1.35), F(0.5, 0.6, 1.1)),
  shot(T.s('c9b'), '14_ozean_unter_eis', F(0.5, 0.95, 1.5), F(0.5, 0.9, 1.3)),
  shot(T.s('s1'), '15_tiefsee_quellen', F(0.5, 0.5, 1.0), F(0.6, 0.45, 1.15)),
  shot(T.s('s4'), '15_tiefsee_quellen', F(0.12, 0.6, 1.5), F(0.2, 0.6, 1.35)),
  shot(T.s('s5b'), '15_tiefsee_quellen', F(0.7, 0.4, 1.3), F(0.6, 0.45, 1.05)),
  shot(T.s('s6'), '16_siedlung_erdwaerme', F(0.15, 0.4, 1.35), F(0.5, 0.5, 1.05)),
  shot(T.s('s7b'), '16_siedlung_erdwaerme', F(0.1, 0.85, 1.5), F(0.15, 0.8, 1.3)),
  shot(T.s('s8'), '17_hoehlen_gewaechshaus', F(0.5, 0.5, 1.0), F(0.7, 0.7, 1.25)),
  shot(T.s('s10'), '18_luft_schneit', F(0.5, 0.2, 1.35), F(0.5, 0.5, 1.0)),
  shot(T.s('s12'), '19_einsame_eiserde', F(0.5, 0.5, 1.45), F(0.5, 0.5, 1.0)),
  shot(T.s('e0b'), '02_sonnige_stadt', F(0.5, 0.55, 1.15), F(0.5, 0.5, 1.0)),
  shot(T.s('e1'), '06_stadt_goldene_stunde', F(0.5, 0.5, 1.0), F(0.75, 0.3, 1.25)),
  shot(DARK, '07_stadt_ploetzlich_dunkel', F(0.5, 0.45, 1.25), F(0.5, 0.5, 1.1)),
  shot(T.s('e4'), '20_sonnenuntergang', F(0.75, 0.55, 1.3), F(0.55, 0.5, 1.0)),
];

const ease = Easing.bezier(0.42, 0, 0.58, 1);
const XFADE = 18;

const ShotLayer: React.FC<{s: Shot; end: number; cut?: boolean}> = ({s, end, cut}) => {
  const f = useCurrentFrame();
  if (f < s.at - (cut ? 0 : XFADE) || f > end + XFADE) return null;
  const t = ease(Math.min(1, Math.max(0, (f - s.at) / Math.max(1, end - s.at))));
  const z = s.from.z + (s.to.z - s.from.z) * t;
  const x = s.from.x + (s.to.x - s.from.x) * t;
  const y = s.from.y + (s.to.y - s.from.y) * t;
  const o = cut ? 1 : Math.min(1, (f - (s.at - XFADE)) / XFADE);
  return (
    <AbsoluteFill style={{opacity: o, overflow: 'hidden'}}>
      <Img
        src={staticFile(`sonne/${s.img}.png`)}
        style={{width: SW, height: SH, objectFit: 'cover', transform: `scale(${z})`, transformOrigin: `${x * 100}% ${y * 100}%`}}
      />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------
// overlays

const T2 = (n: number) => String(Math.floor(n)).padStart(2, '0');

export const Clock: React.FC = () => {
  const f = useCurrentFrame();
  const r = remaining(f);
  const dark = f >= DARK;
  const pulse = rise(f, T.w('i5', 'Uhr'), 8) * (1 - rise(f, T.w('i5', 'Uhr') + 30, 20));
  const finalTen = f < DARK && r < 10;
  const out = 1 - rise(f, T.s('e4'), 20);
  const p = clockFrac(f);
  return (
    <div style={{position: 'absolute', right: 70, top: 56, opacity: rise(f, 4, 14) * out, transform: `scale(${1 + 0.15 * pulse})`, transformOrigin: 'right top', fontFamily}}>
      <div style={{fontSize: 22, fontWeight: 700, letterSpacing: 4, color: 'rgba(255,255,255,0.75)', textAlign: 'right'}}>BIS ES DUNKEL WIRD</div>
      <div style={{fontSize: 92, fontWeight: 800, fontVariantNumeric: 'tabular-nums', textAlign: 'right', color: dark || finalTen ? C.red : '#fff', textShadow: '0 4px 24px rgba(0,0,0,0.6)', lineHeight: 1}}>
        {T2(Math.ceil(r) / 60)}:{T2(Math.ceil(r) % 60)}
      </div>
      {/* the last light on its way from the sun to the earth */}
      <svg width={340} height={40} style={{display: 'block', marginLeft: 'auto', marginTop: 12}}>
        <line x1={14} x2={326} y1={20} y2={20} stroke="rgba(255,255,255,0.25)" strokeWidth={3} strokeDasharray="4 6" />
        <circle cx={14} cy={20} r={10} fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={2} />
        <line x1={14} x2={14 + 312 * p} y1={20} y2={20} stroke={C.orange} strokeWidth={4} opacity={0.9} />
        <circle cx={14 + 312 * p} cy={20} r={5} fill="#fff4d0" style={{filter: `drop-shadow(0 0 6px ${C.orange})`}} />
        <circle cx={326} cy={20} r={9} fill="#3b7bd8" />
      </svg>
    </div>
  );
};

type Callout = {at: number; until: number; big: string; small: string; color?: string};
const call = (line: string, word: string, big: string, small: string, color?: string, hold = 0): Callout => ({
  at: T.w(line, word), until: T.e(line, 1.2 + hold), big, small, color,
});
export const CALLOUTS: Callout[] = [
  call('l3', '300', '300.000 km/s', 'Lichtgeschwindigkeit', C.orange),
  call('l5', '150', '150 Mio. km', 'Sonne – Erde'),
  call('l5b', 'Fußball', '⚽  ·  24 m  ·  •', 'Sonne als Fußball, Erde als Pfefferkorn'),
  call('l6', '499', '499 s', '≈ 8 min 19 s unterwegs', C.orange),
  call('l6b', 'Mond', '1,3 s', 'so alt ist das Bild vom Mond'),
  call('l6c', 'Hunderten', 'Jahrhunderte', 'so alt ist das Licht mancher Sterne'),
  call('g5', '2017', '2017', 'Schwerkraft und Licht kommen gleichzeitig an', C.teal),
  call('a7', 'Stunde', 'Jupiter  +1 h', 'leuchtet nach der Sonne noch weiter', C.orange),
  call('a8', 'zweieinhalb', 'Saturn  +2,5 h', 'das letzte Licht im Sonnensystem', C.orange),
  call('a11', '107', '107.000 km/h', 'so schnell fliegt die Erde geradeaus weiter'),
  call('s5b', '1977', '1977', 'die heißen Tiefseequellen werden entdeckt', C.teal),
  call('s7b', '47', '47 TW', 'Wärme aus dem Erdinneren', C.orange),
  call('s11', 'Stickstoff', '−210 °C', 'Stickstoff wird fest', C.teal),
  call('e4', 'Milliarden', '≈ 5 Mrd. Jahre', 'so lange scheint die Sonne noch', C.orange, 3),
];

export const CalloutLayer: React.FC<{skip?: string[]}> = ({skip = []}) => {
  const f = useCurrentFrame();
  return (
    <>
      {CALLOUTS.map((c, i) => {
        if (skip.includes(c.big)) return null;
        if (f < c.at - 2 || f > c.until + 20) return null;
        const o = rise(f, c.at, 12) * (1 - rise(f, c.until, 18));
        return (
          // banner sliding in from the left edge, like the name/year tags in the reference videos
          <div key={i} style={{position: 'absolute', left: 0, bottom: 120, opacity: o, transform: `translateX(${(1 - rise(f, c.at, 14)) * -110}%)`, fontFamily}}>
            <div style={{display: 'inline-block', padding: '14px 46px 12px 70px', background: c.color ?? KIT.violet, boxShadow: 'inset 0 -8px 0 rgba(0,0,0,0.15)'}}>
              <div style={{fontSize: 80, fontWeight: 600, color: '#fff', fontVariantNumeric: 'tabular-nums', lineHeight: 1.05}}>{c.big}</div>
            </div>
            <div style={{display: 'block', width: 'fit-content', padding: '8px 30px 8px 70px', background: KIT.night}}>
              <div style={{fontSize: 30, fontWeight: 500, color: '#fff'}}>{c.small}</div>
            </div>
          </div>
        );
      })}
    </>
  );
};

// the cold: average surface temperature, from +15 °C down to about −70 °C after a year
export const Thermometer: React.FC = () => {
  const f = useCurrentFrame();
  const from = T.s('c1');
  const to = T.s('c5');
  if (f < from - 10 || f > to + 20) return null;
  const week = T.w('c3', '18');
  const year = T.w('c4', '70');
  const temp = interpolate(f, [from, week, week + 40, year, year + 40], [15, 15, -18, -18, -70], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
  const o = rise(f, from, 15) * (1 - rise(f, to, 18));
  const H = 520;
  const frac = (temp + 80) / 100; // −80 .. +20
  const label = f >= year ? 'nach 1 Jahr' : f >= week ? 'nach 1 Woche' : 'heute';
  return (
    <div style={{position: 'absolute', right: 110, top: 300, opacity: o, fontFamily, textAlign: 'center'}}>
      <div style={{fontSize: 70, fontWeight: 800, color: temp < 0 ? '#9fd4ff' : C.orange, fontVariantNumeric: 'tabular-nums', textShadow: '0 4px 20px rgba(0,0,0,0.6)'}}>
        {temp > 0 ? '+' : temp < 0 ? '−' : ''}{Math.abs(Math.round(temp))} °C
      </div>
      <div style={{fontSize: 26, fontWeight: 700, color: 'rgba(255,255,255,0.8)', marginBottom: 18}}>{label}</div>
      <svg width={90} height={H + 80}>
        <rect x={30} y={0} width={30} height={H} rx={15} fill="rgba(6,10,22,0.6)" stroke="rgba(255,255,255,0.5)" strokeWidth={3} />
        <rect x={36} y={H - H * frac} width={18} height={H * frac} rx={9} fill={temp < 0 ? '#7fc4ff' : C.orange} />
        <circle cx={45} cy={H + 34} r={34} fill={temp < 0 ? '#7fc4ff' : C.orange} stroke="rgba(255,255,255,0.5)" strokeWidth={3} />
        <line x1={20} x2={70} y1={H - H * 0.8} y2={H - H * 0.8} stroke="rgba(255,255,255,0.7)" strokeWidth={3} />
      </svg>
    </div>
  );
};

export const Sonne: React.FC = () => {
  const f = useCurrentFrame();
  // at zero the screen goes black and the sound stops; the dark city fades in only after a beat
  const black = f >= DARK ? 1 - rise(f, DARK + 50, 40) : 0;
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Audio src={staticFile('sonne/voice.wav')} />
      <Audio
        src={staticFile('sonne/ambient.wav')}
        volume={(fr) => 0.35 * (fr < DARK ? 1 : rise(fr, T.s('e4'), 60))}
      />
      {SHOTS.map((s, i) => (
        <ShotLayer key={i} s={s} end={i + 1 < SHOTS.length ? SHOTS[i + 1].at : T.total} cut={s.at === DARK} />
      ))}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, transparent 60%, rgba(0,0,0,0.45) 100%)'}} />
      <AbsoluteFill style={{background: '#000', opacity: black}} />
      <Thermometer />
      <CalloutLayer />
      <Clock />
    </AbsoluteFill>
  );
};
