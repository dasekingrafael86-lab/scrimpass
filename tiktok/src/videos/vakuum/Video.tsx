// "Wie lange überlebst du ohne Raumanzug im All?" — TikTok explainer in the sniper style:
// one world, a camera that moves every 1-2 s, HUD tiles, the SEKUNDEN/MINUTEN choice, a frozen clock
// (PAUSE) while the myths are explained, then the 15 seconds run.
import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import {Backdrop, Badge, Captions, Choice, Handle, HudTile, Pill, Txt} from '../../components/Kit';
import {Cam, Place, Track, World} from '../../lib/camera';
import {C, fontFamily, glow} from '../../lib/theme';
import {makeTiming, rise, tween} from '../../lib/timing';
import {Person, SIL} from '../aufzug/art';
import timingJson from './timing.json';

const T = makeTiming(timingJson);
export const VAKUUM_DURATION = T.total;

const O = {
  station: [0, 0], // thrown out of the airlock
  myth: [3000, 0], // explode? freeze? no
  cold: [6000, 0], // thermos, sunburn
  swell: [0, 3500], // swelling, skin holds
  tongue: [3000, 3500], // water boils on the tongue
  lungs: [6000, 3500], // never hold your breath
  clock: [0, 7000], // the 15 seconds
  chamber: [3000, 7000], // the 1966 accident
  verdict: [6000, 7000], // timeline: conscious, rescue possible, too late
} satisfies Record<string, [number, number]>;
type SceneId = keyof typeof O;
const at = (s: SceneId, x: number, y: number, z = 1, r = 0): Cam => ({x: O[s][0] + x, y: O[s][1] + y, z, r});
const svg = (children: React.ReactNode) => (
  <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>{children}</svg>
);
const mid = (x: number): React.CSSProperties => ({left: x, width: undefined, marginLeft: 0, translate: '-50% 0'});

// ---------------------------------------------------------------------------------------
// timing of the story

const PUSH = T.w('hook1', 'gestoßen') - 6;
const CLOCK0 = T.w('breath2', 'Uhr');
const OUT = T.w('clock1', 'bewusstlos') + 6;
// the vacuum clock: frozen during the explanations, then 0 -> 15 s over the clock lines
const vacSec = (f: number) => (f < CLOCK0 ? 0 : tween(f, CLOCK0, T.e('clock2'), 0, 15));
const C_GREEN = '#46e08a';

// ---------------------------------------------------------------------------------------
// camera

const cam = new Track()
  .cut(0, at('station', 420, 900, 1.25))
  .to(PUSH, 30, at('station', 640, 960, 1.0))
  .to(T.s('hook2'), 40, at('station', 760, 1000, 0.9))
  .jump(T.s('myth1'), at('myth', 540, 900, 0.95))
  .to(T.w('myth1', 'Beides') - 4, 20, at('myth', 540, 960, 1.05))
  .shake(T.w('myth1', 'stimmt'), 0.5)
  .jump(T.s('cold1'), at('cold', 540, 760, 1.1))
  .to(T.s('cold2'), 24, at('cold', 540, 980, 0.95))
  .to(T.w('cold2', 'Sonne') - 4, 24, at('cold', 620, 1250, 0.95))
  .jump(T.s('swell1'), at('swell', 540, 920, 1.25))
  .to(T.w('swell1', 'schwillst') - 4, 30, at('swell', 540, 980, 1.0))
  .to(T.w('swell1', 'Haut') - 4, 20, at('swell', 540, 940, 1.15))
  .jump(T.s('spit1'), at('tongue', 540, 980, 0.95))
  .to(T.w('spit1', 'kochen') - 4, 20, at('tongue', 520, 1000, 1.2))
  .to(T.w('spit1', 'Körpertemperatur') - 6, 20, at('tongue', 760, 860, 1.1))
  .jump(T.s('breath1'), at('lungs', 540, 960, 1.0))
  .shake(T.w('breath1', 'Luft') + 4, 0.6)
  .to(T.w('breath1', 'zerreißen') - 6, 20, at('lungs', 540, 900, 1.2))
  .to(T.s('breath2'), 24, at('lungs', 540, 960, 0.95))
  .jump(CLOCK0, at('clock', 540, 900, 1.15))
  .to(CLOCK0 + 2, OUT - CLOCK0, at('clock', 540, 960, 1.0), 'linear')
  .shake(OUT, 0.6)
  .to(T.s('clock2'), 26, at('clock', 540, 1180, 0.95))
  .jump(T.s('real1'), at('chamber', 540, 900, 1.0))
  .to(T.w('real1', 'Schlauch') - 6, 24, at('chamber', 600, 820, 1.25))
  .to(T.s('real2'), 30, at('chamber', 540, 960, 1.0))
  .to(T.s('real3'), 30, at('chamber', 540, 1100, 0.95))
  .jump(T.s('end1'), at('station', 760, 1000, 0.95))
  .jump(T.s('end2'), at('verdict', 540, 900, 1.0))
  .to(T.w('end2', '90') - 6, 30, at('verdict', 540, 960, 1.0))
  .shake(T.s('end3'), 0.6);

// ---------------------------------------------------------------------------------------
// scenes

const Earth: React.FC<{y: number}> = ({y}) => (
  <g clipPath="url(#vkEarthClip)">
    <defs><clipPath id="vkEarthClip"><rect x={-800} y={y - 200} width={2700} height={900} /></clipPath></defs>
    <circle cx={540} cy={y + 2600} r={2600} fill="#1f5fd6" />
    <path d={`M -400 ${y + 40} Q 200 ${y - 20} 600 ${y + 30} Q 1100 ${y + 70} 1600 ${y + 20}`} stroke="#3fd2c2" strokeWidth={18} fill="none" opacity={0.4} />
    <circle cx={540} cy={y + 2600} r={2620} fill="none" stroke="#7fc8ff" strokeWidth={30} opacity={0.35} />
  </g>
);

const Station: React.FC = () => {
  const f = useCurrentFrame();
  const t = Math.max(0, f - PUSH);
  const drift = Math.min(t, T.s('myth1') - PUSH);
  const px = 380 + drift * 3.2; const py = 960 + drift * 0.6;
  const door = rise(f, PUSH - 12, 10);
  const no = rise(f, T.s('end3'), 8);
  return (
    <>
      {svg(
        <>
          <Earth y={1700} />
          {/* station module and airlock */}
          <rect x={-500} y={700} width={760} height={420} rx={60} fill="#cfd8e6" />
          <rect x={-500} y={760} width={760} height={30} fill="#9fb0c6" />
          <rect x={-500} y={1030} width={760} height={30} fill="#9fb0c6" />
          {[-380, -160].map((x) => <rect key={x} x={x} y={300} width={120} height={360} fill="#2a3a6a" stroke="#7fa0d0" strokeWidth={4} />)}
          <rect x={150} y={790} width={110} height={240} rx={20} fill="#0b1622" />
          <rect x={150 + 110 * door} y={790} width={110 * (1 - door)} height={240} rx={20} fill="#9fb0c6" />
          {f >= PUSH && f < PUSH + 30 && [0, 1, 2, 3, 4].map((k) => (
            <line key={k} x1={270} y1={820 + k * 45} x2={270 + (f - PUSH) * 14} y2={820 + k * 45 + (k - 2) * 20} stroke="#ffffff" strokeWidth={4} opacity={0.4} />
          ))}
          <Person x={px} y={py + 100} s={0.2} rot={t * 1.2} rim={C.orange} />
        </>,
      )}
      <Pill x={px} y={py - 160} color={C.orange} show={rise(f, PUSH + 10, 8) * (1 - rise(f, T.s('hook2'), 8))} size={30}>DU · OHNE ANZUG</Pill>
      <Txt x={540} y={380} size={110} align="center" color={C.red} style={{opacity: no, transform: `scale(${1.3 - 0.3 * no})`, textShadow: glow(`${C.red}55`, 18)}}>DANACH NICHT.</Txt>
    </>
  );
};

const Cross: React.FC<{x: number; y: number; o: number}> = ({x, y, o}) => (
  <g opacity={o}>
    <line x1={x - 150} y1={y - 150} x2={x + 150} y2={y + 150} stroke={C.red} strokeWidth={26} strokeLinecap="round" />
    <line x1={x + 150} y1={y - 150} x2={x - 150} y2={y + 150} stroke={C.red} strokeWidth={26} strokeLinecap="round" />
  </g>
);
const Myth: React.FC = () => {
  const f = useCurrentFrame();
  const boom = rise(f, T.w('myth1', 'explodieren') - 4, 8);
  const ice = rise(f, T.w('myth1', 'frieren') - 4, 8);
  const no = rise(f, T.w('myth1', 'stimmt') - 2, 6);
  return (
    <>
      {svg(
        <>
          <g opacity={boom}>
            <rect x={110} y={560} width={400} height={560} rx={36} fill="rgba(255,255,255,0.05)" stroke={C.border} strokeWidth={3} />
            {Array.from({length: 12}, (_, i) => {
              const a = (i / 12) * Math.PI * 2;
              return <line key={i} x1={310 + Math.cos(a) * 90} y1={800 + Math.sin(a) * 90} x2={310 + Math.cos(a) * 170} y2={800 + Math.sin(a) * 170} stroke={C.orange} strokeWidth={14} strokeLinecap="round" />;
            })}
            <Person x={310} y={950} s={0.26} rim={C.orange} />
            <Cross x={310} y={840} o={no} />
          </g>
          <g opacity={ice}>
            <rect x={570} y={560} width={400} height={560} rx={36} fill="rgba(255,255,255,0.05)" stroke={C.border} strokeWidth={3} />
            <rect x={640} y={620} width={260} height={360} rx={30} fill="#9fe0ff" opacity={0.35} stroke="#cfefff" strokeWidth={6} />
            <Person x={770} y={950} s={0.26} rim="#cfefff" />
            <Cross x={770} y={840} o={no} />
          </g>
        </>,
      )}
      <Txt x={310} y={1150} size={46} align="center" color={C.orange} style={{...mid(310), opacity: boom}}>EXPLODIEREN?</Txt>
      <Txt x={770} y={1150} size={46} align="center" color="#9fe0ff" style={{...mid(770), opacity: ice}}>ZU EIS?</Txt>
      <Txt x={540} y={420} size={60} align="center" color={C.muted} style={{opacity: rise(f, T.s('myth1'), 8)}}>WIE IM FILM</Txt>
    </>
  );
};

const Cold: React.FC = () => {
  const f = useCurrentFrame();
  const sun = rise(f, T.w('cold2', 'Sonne') - 4, 10);
  const thermos = rise(f, T.w('cold2', 'Thermoskanne') - 6, 10) * (1 - sun);
  const temp = tween(f, T.s('cold1'), T.e('cold2'), 37, 36.6);
  return (
    <>
      {svg(
        <>
          <Person x={320} y={1060} s={0.34} rim={C.teal} />
          {[0, 1, 2].map((k) => {
            const t = ((f * 0.01 + k / 3) % 1);
            return <path key={k} d={`M ${380 + t * 120} ${780 - k * 60} q 20 -20 40 0`} stroke={C.orange} strokeWidth={6} fill="none" opacity={(1 - t) * 0.6} />;
          })}
          {/* thermos */}
          <g opacity={thermos} transform="translate(760 860)">
            <rect x={-110} y={0} width={220} height={440} rx={50} fill="#2a3a52" />
            <rect x={-80} y={30} width={160} height={380} rx={36} fill="#0b1622" />
            <rect x={-60} y={60} width={120} height={330} rx={26} fill={C.orange} opacity={0.7} />
            <rect x={-70} y={-40} width={140} height={50} rx={16} fill="#3a4a62" />
          </g>
          {/* the sun: ultraviolet hits the bare skin */}
          <g opacity={sun}>
            <circle cx={980} cy={1340} r={120} fill="#ffd25a" />
            {[0, 1, 2, 3].map((k) => <line key={k} x1={880} y1={1300 + k * 40} x2={430 + k * 10} y2={1180 + k * 50} stroke="#b07bff" strokeWidth={8} strokeDasharray="20 14" opacity={0.8} />)}
          </g>
        </>,
      )}
      <Txt x={320} y={1110} size={64} align="center" color={C.teal} style={mid(320)}>{temp.toFixed(1).replace('.', ',')} °C</Txt>
      <Pill x={760} y={1330} color={C.orange} show={thermos} size={34}>WIE THERMOSKANNE</Pill>
      <Pill x={540} y={1520} color="#b07bff" show={sun} size={40}>EHER SONNENBRAND</Pill>
      <Txt x={540} y={420} size={60} align="center" color={C.text} style={{opacity: rise(f, T.w('cold1', 'leer') - 4, 8) * (1 - rise(f, T.s('cold2'), 8))}}>FAST LEER = KAUM KÜHLUNG</Txt>
    </>
  );
};

const Swell: React.FC = () => {
  const f = useCurrentFrame();
  const sw = rise(f, T.w('swell1', 'schwillst') - 4, 30);
  const skin = rise(f, T.w('swell1', 'Haut') - 4, 10);
  return (
    <>
      {svg(
        <>
          <g transform={`translate(540 1300) scale(${1 + 0.35 * sw} 1) translate(-540 -1300)`}>
            <Person x={540} y={1300} s={0.6} rim={skin > 0.5 ? C.teal : C.orange} />
          </g>
          {Array.from({length: 26}, (_, i) => {
            const t = ((f * 0.01 + (i * 0.37) % 1) % 1);
            const x = 540 + Math.sin(i * 2.1) * 110 * (1 + 0.35 * sw);
            const y = 1260 - (i % 13) * 45 - t * 20;
            return <circle key={i} cx={x} cy={y} r={6 + (i % 4) * 3 + sw * 4} fill="none" stroke="#cfefff" strokeWidth={3} opacity={rise(f, T.w('swell1', 'Gasblasen') - 4, 10) * 0.8} />;
          })}
        </>,
      )}
      <Pill x={540} y={560} color="#cfefff" show={rise(f, T.w('swell1', 'Gasblasen') - 4, 8)} size={40}>GASBLASEN IM GEWEBE</Pill>
      <Pill x={540} y={1360} color={C.teal} show={skin} size={44} filled>HAUT HÄLT</Pill>
    </>
  );
};

const Tongue: React.FC = () => {
  const f = useCurrentFrame();
  const boil = rise(f, T.w('spit1', 'kochen') - 4, 10);
  const temp = rise(f, T.w('spit1', 'Körpertemperatur') - 6, 8);
  return (
    <>
      {svg(
        <>
          {/* open mouth from the front */}
          <ellipse cx={540} cy={980} rx={360} ry={260} fill="#2a0a14" />
          <path d="M 180 980 Q 540 700 900 980" stroke="#e8707a" strokeWidth={50} fill="none" />
          <path d="M 180 980 Q 540 1260 900 980" stroke="#e8707a" strokeWidth={50} fill="none" />
          {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={340 + i * 82} y={760} width={70} height={70} rx={18} fill="#f4f0e6" />)}
          <ellipse cx={540} cy={1110} rx={250} ry={120} fill="#f0848c" />
          <path d="M 540 1020 L 540 1150" stroke="#c8606a" strokeWidth={8} />
          {boil > 0 && Array.from({length: 22}, (_, i) => {
            const t = ((f * 0.03 + (i * 0.29) % 1) % 1);
            const x = 360 + ((i * 53) % 360);
            return <circle key={i} cx={x} cy={1080 - t * 120} r={8 + (i % 3) * 5} fill="none" stroke="#ffffff" strokeWidth={4} opacity={boil * (1 - t)} />;
          })}
          {/* thermometer */}
          <g transform="translate(920 600)" opacity={temp}>
            <rect x={-26} y={-260} width={52} height={300} rx={26} fill="#f2f2f2" />
            <rect x={-12} y={-180} width={24} height={210} rx={12} fill={C.red} />
            <circle cx={0} cy={40} r={40} fill={C.red} />
          </g>
        </>,
      )}
      <Pill x={540} y={1330} color="#ffffff" show={boil} size={44} filled>KOCHT</Pill>
      <Txt x={920} y={700} size={58} align="center" color={C.red} style={{...mid(920), opacity: temp}}>37 °C</Txt>
    </>
  );
};

const Lungs: React.FC = () => {
  const f = useCurrentFrame();
  const hold = rise(f, T.w('breath1', 'Luft') - 4, 8) * (1 - rise(f, T.s('breath2'), 8));
  const grow = tween(f, T.w('breath1', 'dehnt') - 4, T.w('breath1', 'zerreißen') + 4, 1, 1.45);
  const rip = rise(f, T.w('breath1', 'zerreißen'), 6) * (1 - rise(f, T.s('breath2'), 8));
  const exhale = rise(f, T.w('breath2', 'ausatmen') - 4, 10);
  const s = f < T.s('breath2') ? grow : tween(f, T.s('breath2'), T.s('breath2') + 20, 1.45, 0.9);
  const Lobe: React.FC<{side: number}> = ({side}) => (
    <path d={`M ${540 + side * 40} 760 C ${540 + side * 260} 760 ${540 + side * 300} 1000 ${540 + side * 280} 1180 C ${540 + side * 260} 1300 ${540 + side * 80} 1280 ${540 + side * 60} 1180 Z`}
      fill={rip > 0.5 ? C.red : '#f08aa0'} stroke="#ffffff" strokeWidth={6} />
  );
  return (
    <>
      {svg(
        <>
          <rect x={526} y={600} width={28} height={180} rx={14} fill="#cfd8e6" />
          <g transform={`translate(540 1000) scale(${s}) translate(-540 -1000)`}><Lobe side={-1} /><Lobe side={1} /></g>
          {rip > 0 && [0, 1, 2].map((k) => <path key={k} d={`M ${400 + k * 140} ${900 + k * 60} l 30 30 l -20 30 l 30 30`} stroke="#ffffff" strokeWidth={8} fill="none" opacity={rip} />)}
          {exhale > 0 && [0, 1, 2].map((k) => {
            const t = ((f * 0.03 + k / 3) % 1);
            return <path key={k} d={`M ${520 + k * 20} ${560 - t * 260} q 20 -30 0 -60`} stroke="#cfefff" strokeWidth={8} fill="none" opacity={exhale * (1 - t)} />;
          })}
        </>,
      )}
      <Txt x={540} y={500} size={70} align="center" color={C.red} style={{opacity: hold, textShadow: glow(`${C.red}55`, 14)}}>NICHT LUFT ANHALTEN!</Txt>
      <Pill x={540} y={1300} color={C.teal} show={exhale} size={48} filled>AUSATMEN</Pill>
    </>
  );
};

const Clock: React.FC = () => {
  const f = useCurrentFrame();
  const sec = vacSec(f);
  const R = 260;
  const left = Math.max(0, 15 - sec);
  const bars = rise(f, T.s('clock2'), 12);
  const out = rise(f, OUT, 10);
  return (
    <>
      {svg(
        <>
          <circle cx={540} cy={900} r={R} fill="none" stroke={C.border} strokeWidth={34} />
          <circle cx={540} cy={900} r={R} fill="none" stroke={left < 5 ? C.red : C_GREEN} strokeWidth={34} strokeLinecap="round"
            strokeDasharray={`${(2 * Math.PI * R * left) / 15} ${2 * Math.PI * R}`} transform="rotate(-90 540 900)" />
          <g opacity={1 - out * 0.6}><Person x={540} y={1060} s={0.16} rot={Math.sin(f * 0.05) * 10} rim={out > 0.5 ? C.muted : C.orange} /></g>
          <rect x={150} y={1500} width={780} height={70} rx={16} fill={C.panel} opacity={bars} />
          <rect x={150} y={1500} width={780} height={70} rx={16} fill={C.teal} opacity={bars} />
          <rect x={150} y={1640} width={780 * (15 / 60) * bars} height={70} rx={16} fill={C.red} />
        </>,
      )}
      <Txt x={540} y={760} size={80} align="center" color={left < 5 ? C.red : C_GREEN}>{Math.ceil(left)} s</Txt>
      <Txt x={540} y={1170} size={70} align="center" color={C.red} style={{opacity: out, textShadow: glow(`${C.red}55`, 14)}}>BEWUSSTLOS</Txt>
      <Txt x={150} y={1440} size={34} weight={800} color={C.teal} spacing={3} style={{opacity: bars}}>LUFT ANHALTEN AN LAND · ≈ 60 s</Txt>
      <Txt x={150} y={1580} size={34} weight={800} color={C.red} spacing={3} style={{opacity: bars}}>IM ALL · ≈ 15 s</Txt>
    </>
  );
};

const Chamber: React.FC = () => {
  const f = useCurrentFrame();
  const s0 = T.w('real1', 'Schlauch') - 4;
  const sec = f < s0 ? 0 : (f - s0) / 30 * (60 / ((T.e('real3') - s0) / 30));
  const shown = Math.min(60, sec);
  const hose = rise(f, s0, 8);
  const fainted = shown >= 14;
  const helper = shown >= 25;
  const air = shown >= 60;
  return (
    <>
      {svg(
        <>
          <rect x={120} y={560} width={840} height={760} rx={140} fill="#16212e" stroke="#4a5a6e" strokeWidth={12} />
          <rect x={150} y={590} width={780} height={700} rx={120} fill={air ? '#1f4a3a' : '#0b1018'} />
          <circle cx={820} cy={720} r={70} fill="#0b1018" stroke="#4a5a6e" strokeWidth={10} />
          {/* suited technician */}
          <g transform={`translate(440 1250) rotate(${fainted ? -70 : 0})`}>
            <Person x={0} y={0} s={0.5} rim={fainted ? C.muted : C.orange} />
            <circle cx={0} cy={-460} r={70} fill="none" stroke="#cfefff" strokeWidth={8} opacity={0.8} />
          </g>
          <path d={`M 470 960 Q ${600 + hose * 40} ${1000 + hose * 120} ${700 + hose * 60} ${1180 + hose * 40}`} stroke="#9fb0c6" strokeWidth={18} fill="none" strokeLinecap="round" />
          {hose > 0 && !air && Array.from({length: 8}, (_, i) => {
            const t = ((f * 0.05 + i / 8) % 1);
            return <line key={i} x1={470} y1={960} x2={470 + Math.cos(i) * 90 * t} y2={960 + Math.sin(i) * 90 * t} stroke="#cfefff" strokeWidth={4} opacity={1 - t} />;
          })}
          {helper && <Person x={760} y={1250} s={0.46} rim={C.teal} />}
        </>,
      )}
      <Pill x={540} y={330} color={C.muted} show={rise(f, T.s('real1'), 8)} size={40}>NASA · 1966</Pill>
      <Txt x={540} y={430} size={90} align="center" color={air ? C_GREEN : fainted ? C.red : C.orange}>{Math.floor(shown)} s</Txt>
      <Txt x={540} y={1350} size={40} weight={800} align="center" color={C.muted} spacing={3}>
        {air ? 'LUFT ZURÜCK · ÜBERLEBT' : helper ? 'KOLLEGE HILFT' : fainted ? 'OHNMÄCHTIG' : hose > 0 ? 'SCHLAUCH LÖST SICH' : ''}
      </Txt>
    </>
  );
};

const Verdict: React.FC = () => {
  const f = useCurrentFrame();
  const X = (s: number) => 120 + (s / 120) * 840;
  const g = rise(f, T.w('end2', '15') - 4, 12);
  const o = rise(f, T.w('end2', '90') - 4, 12);
  const r = rise(f, T.s('end3') - 2, 10);
  return (
    <>
      {svg(
        <>
          <rect x={X(0)} y={860} width={(X(15) - X(0)) * g} height={90} rx={14} fill={C_GREEN} />
          <rect x={X(15)} y={860} width={(X(90) - X(15)) * o} height={90} fill={C.orange} />
          <rect x={X(90)} y={860} width={(X(120) - X(90)) * r} height={90} rx={14} fill={C.red} />
          {[0, 15, 30, 60, 90, 120].map((s) => <line key={s} x1={X(s)} x2={X(s)} y1={960} y2={990} stroke={C.muted} strokeWidth={4} />)}
        </>,
      )}
      {[0, 15, 30, 60, 90, 120].map((s) => <Txt key={s} x={X(s)} y={1000} size={30} weight={700} align="center" color={C.muted} style={mid(X(s))}>{s}s</Txt>)}
      <Txt x={X(9) + 30} y={760} size={36} weight={800} align="center" color={C_GREEN} style={{...mid(X(9) + 30), opacity: g}}>WACH</Txt>
      <Txt x={X(52)} y={760} size={36} weight={800} align="center" color={C.orange} style={{...mid(X(52)), opacity: o}}>RETTUNG MÖGLICH</Txt>
      <Txt x={X(105)} y={760} size={36} weight={800} align="center" color={C.red} style={{...mid(X(105)), opacity: r}}>ZU SPÄT</Txt>
    </>
  );
};

// two planets far in the background; they drift slightly against the camera (parallax)
const Planets: React.FC<{cam: Cam}> = ({cam: c}) => {
  const f = useCurrentFrame();
  const px = (c.x % 3000) * -0.025; const py = (c.y % 3500) * -0.02;
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
      <defs>
        <radialGradient id="vkRing" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stopColor="#f2c98a" /><stop offset="1" stopColor="#a8642e" /></radialGradient>
        <radialGradient id="vkRed" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stopColor="#ff8a6a" /><stop offset="1" stopColor="#7a2a3a" /></radialGradient>
      </defs>
      <g transform={`translate(${880 + px} ${640 + py + Math.sin(f / 90) * 6})`} opacity={0.55}>
        <ellipse rx={150} ry={34} fill="none" stroke="#e8d4a8" strokeWidth={10} transform="rotate(-18)" opacity={0.7} />
        <circle r={78} fill="url(#vkRing)" />
        <path d="M -76 -14 Q 0 -30 76 -14 M -72 22 Q 0 8 72 22" stroke="#c98a4a" strokeWidth={8} fill="none" opacity={0.6} />
        <path d="M 74 -38 A 150 34 0 0 1 -150 30" fill="none" stroke="#e8d4a8" strokeWidth={10} transform="rotate(-18)" opacity={0.7} />
      </g>
      <g transform={`translate(${150 + px * 1.6} ${1270 + py * 1.4 + Math.cos(f / 110) * 5})`} opacity={0.5}>
        <circle r={44} fill="url(#vkRed)" />
        <circle cx={-12} cy={-8} r={8} fill="#5a1a2a" opacity={0.5} />
        <circle cx={14} cy={14} r={5} fill="#5a1a2a" opacity={0.5} />
      </g>
    </svg>
  );
};

// ---------------------------------------------------------------------------------------

export const VakuumVideo: React.FC = () => {
  const f = useCurrentFrame();
  const hud = rise(f, T.s('myth1'), 10) * (1 - rise(f, T.s('real1'), 10));
  const sec = vacSec(f);
  const pause = rise(f, T.s('myth1'), 6) * (1 - rise(f, CLOCK0, 6));
  const run = rise(f, CLOCK0, 6) * (1 - rise(f, T.s('real1'), 6));
  const wach = Math.max(0, 1 - sec / 12.5);
  return (
    <AbsoluteFill>
      <Backdrop cam={cam.at(f)} />
      <Planets cam={cam.at(f)} />
      <Audio src={staticFile('vakuum/voice.wav')} />
      <World track={cam}>
        <Place at={O.station}><Station /></Place>
        <Place at={O.myth}><Myth /></Place>
        <Place at={O.cold}><Cold /></Place>
        <Place at={O.swell}><Swell /></Place>
        <Place at={O.tongue}><Tongue /></Place>
        <Place at={O.lungs}><Lungs /></Place>
        <Place at={O.clock}><Clock /></Place>
        <Place at={O.chamber}><Chamber /></Place>
        <Place at={O.verdict}><Verdict /></Place>
      </World>
      <HudTile x={90} y={150} w={420} label="IM VAKUUM" value={sec.toFixed(1).replace('.', ',')} unit="s" color={C.text} show={hud} />
      <HudTile x={570} y={150} w={420} label="BEWUSSTSEIN" value={String(Math.round(wach * 100))} unit="%" color={wach < 0.3 ? C.red : C_GREEN} show={hud} />
      <Badge text="❚❚ PAUSE" show={pause} />
      <Badge text="▶ DIE UHR LÄUFT" show={run} color={C.red} />
      <Choice
        question="WIE LANGE ÜBERLEBST DU?" a={{label: 'SEKUNDEN', color: C.teal}} b={{label: 'MINUTEN', color: C.orange}}
        from={T.s('hook2')} to={T.s('myth1') - 4} cdFrom={T.s('hook3')} top={460} size={64}
      />
      <Captions timing={T.timing} />
      <Handle text="scrimpass.com" />
    </AbsoluteFill>
  );
};

export {SIL, fontFamily};
