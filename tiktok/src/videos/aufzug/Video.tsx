// "Der Aufzug stürzt ab: Rettet dich ein Sprung im letzten Moment?" — TikTok explainer in the sniper
// style: one world, the camera follows the falling cabin like the bullet, HUD tiles, JA/NEIN choice.
import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import {Backdrop, Badge, Captions, Choice, Handle, HudTile, Pill, Txt} from '../../components/Kit';
import {Cam, Place, Track, World} from '../../lib/camera';
import {C, fontFamily, glow} from '../../lib/theme';
import {de, makeTiming, rise, tween} from '../../lib/timing';
import {
  Building, CAB, Cabin, Crouch, GROUND, Person, Shaft, T_FALL, V_IMPACT, V_JUMP, V_LEFT, Wedge, cabBottom, heightAt, speedAt,
} from './art';
import timingJson from './timing.json';

const T = makeTiming(timingJson);
export const AUFZUG_DURATION = T.total;

const O = {
  shaft: [0, 0], // the falling cabin (tall: ground at y = 3200)
  jump: [3000, 0], // inside the cabin: the jump
  house: [6000, 0], // 10th floor vs 8th floor
  float: [3000, 3500], // weightless
  best: [6000, 3500], // lie flat
  brake: [0, 4400], // the safety brake
} satisfies Record<string, [number, number]>;
type SceneId = keyof typeof O;
const at = (s: SceneId, x: number, y: number, z = 1, r = 0): Cam => ({x: O[s][0] + x, y: O[s][1] + y, z, r});

// ---------------------------------------------------------------------------------------
// the fall: slow motion from the snap, frozen during the question, then down to the impact

const SNAP = T.w('hook1', 'reißt');
const PAUSE = T.s('hook2') - 4;
const FALL0 = T.s('fall1');
const IMPACT = T.w('fall1', 'schlägt') + 4;
const T_PAUSE = 0.5;
const tFall = (f: number) => {
  if (f < SNAP) return 0;
  if (f < PAUSE) return tween(f, SNAP, PAUSE, 0, T_PAUSE);
  if (f < FALL0) return T_PAUSE;
  return Math.min(T_FALL, T_PAUSE + ((f - FALL0) / (IMPACT - FALL0)) * (T_FALL - T_PAUSE));
};
const cabY = (f: number) => cabBottom(heightAt(tFall(f)));

const JUMP = T.w('jump1', 'Sprung');

// ---------------------------------------------------------------------------------------
// camera

const cam = new Track()
  .cut(0, at('shaft', 540, cabBottom(30) - 260, 1.4))
  .shake(SNAP, 0.6)
  .follow(SNAP, IMPACT + 8, (f) => at('shaft', 540, cabY(f) - 260, 1.15), 12)
  .jump(IMPACT - 14, at('shaft', 540, GROUND - 260, 1.15))
  .shake(IMPACT, 1.1)
  .to(T.s('fall2'), 30, at('shaft', 540, GROUND - 420, 0.9))
  .jump(T.s('jump1'), at('jump', 540, 1000, 1.0))
  .to(JUMP - 6, 20, at('jump', 540, 900, 1.15))
  .to(T.s('jump2'), 24, at('jump', 540, 1560, 1.05))
  .shake(T.w('jump2', '80'), 0.5)
  .jump(T.s('jump3'), at('house', 560, 880, 0.9))
  .to(T.w('jump3', 'achten') - 4, 24, at('house', 600, 760, 1.15))
  .jump(T.s('float1'), at('float', 540, 960, 1.0))
  .to(T.w('float1', 'schwerelos') - 4, 30, at('float', 540, 880, 1.2))
  .to(T.s('float2'), 40, at('float', 540, 820, 1.0))
  .to(T.s('float3'), 24, at('float', 540, 960, 1.3))
  .jump(T.s('best1'), at('best', 540, 920, 1.0))
  .to(T.w('best1', 'flach'), 24, at('best', 540, 1120, 1.2))
  .to(T.s('best2'), 30, at('best', 540, 1060, 1.0))
  .jump(T.s('end1'), at('shaft', 540, GROUND - 320, 1.1))
  .shake(T.s('end2'), 0.7)
  .jump(T.s('end3'), at('brake', 540, 960, 1.0))
  .to(T.w('end3', 'Fangbremse') - 4, 30, at('brake', 540, 900, 1.25))
  .to(T.w('end3', 'Reißen'), 40, at('brake', 540, 960, 1.0));

// ---------------------------------------------------------------------------------------
// scenes

const svg = (children: React.ReactNode, h = 1920) => (
  <svg width={1080} height={h} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>{children}</svg>
);
const mid = (x: number): React.CSSProperties => ({left: x, width: undefined, marginLeft: 0, translate: '-50% 0'});

const ShaftScene: React.FC = () => {
  const f = useCurrentFrame();
  const y = cabY(f);
  const hit = f >= IMPACT;
  const squash = hit ? rise(f, IMPACT, 4) : 0;
  const snapped = f >= SNAP;
  const whip = snapped ? Math.min(1, (f - SNAP) / 12) : 0;
  const top = y - CAB.h;
  const speed = rise(f, T.s('fall2'), 8) * (1 - rise(f, T.s('jump1'), 6));
  const no = rise(f, T.s('end2'), 8);
  const dust = hit ? rise(f, IMPACT, 16) * (1 - rise(f, IMPACT + 30, 30)) : 0;
  const ux = CAB.x + CAB.w / 2;
  return (
    <>
      {svg(
        <>
          <Shaft />
          {/* ropes: taut, then snapped and whipping up */}
          {[ux - 40, ux + 40].map((x, i) => (
            snapped
              ? <path key={i} d={`M ${x} -800 Q ${x + (i ? 40 : -40) * whip} ${-400 - 300 * whip} ${x + (i ? 60 : -60) * whip} ${top - 40 - 900 * whip}`} stroke="#9fb3c8" strokeWidth={10} fill="none" />
              : <line key={i} x1={x} x2={x} y1={-800} y2={top} stroke="#9fb3c8" strokeWidth={10} />
          ))}
          <Cabin y={y} squash={squash} light={hit ? 0.2 : 1}>
            <Person x={ux} y={y - 4} s={0.2} rot={hit ? 8 : 0} />
          </Cabin>
          {/* motion streaks while falling */}
          {f > FALL0 && !hit && [0, 1, 2, 3].map((k) => (
            <line key={k} x1={CAB.x - 60 - k * 12} x2={CAB.x - 60 - k * 12} y1={top - 140 - k * 60} y2={top - 20} stroke={C.text} strokeWidth={4} opacity={0.25} />
          ))}
          <ellipse cx={ux} cy={GROUND} rx={360 * dust} ry={80 * dust} fill="#9fb3c8" opacity={0.35 * (1 - dust * 0.6)} />
        </>,
        GROUND + 400,
      )}
      <Txt x={540} y={GROUND - 760} size={150} align="center" color={C.red} style={{opacity: speed, transform: `scale(${1.2 - 0.2 * speed})`, textShadow: glow(`${C.red}55`, 18)}}>
        {Math.round(V_IMPACT)} km/h
      </Txt>
      <Txt x={540} y={GROUND - 800} size={160} align="center" color={C.red} style={{opacity: no, transform: `scale(${1.3 - 0.3 * no})`, textShadow: glow(`${C.red}55`, 18)}}>
        NEIN.
      </Txt>
    </>
  );
};

// inside a cabin, used by the jump / float / best scenes
const Inside: React.FC<{dark?: number; children?: React.ReactNode}> = ({dark = 0, children}) => (
  <>
    <rect x={140} y={300} width={800} height={1020} rx={30} fill="#132233" stroke={C.orange} strokeWidth={8} />
    <rect x={180} y={330} width={720} height={26} rx={10} fill="#ffd25a" opacity={0.5 * (1 - dark)} />
    <rect x={820} y={600} width={60} height={160} rx={12} fill="#0c1622" stroke={C.border} strokeWidth={3} />
    {[0, 1, 2].map((k) => <circle key={k} cx={850} cy={630 + k * 50} r={14} fill={k === 2 ? C.red : C.panel} stroke={C.border} strokeWidth={2} />)}
    <rect x={140} y={1320} width={800} height={30} fill="#1d2a38" />
    {children}
    <rect x={140} y={300} width={800} height={1050} rx={30} fill="#000" opacity={0.7 * dark} />
  </>
);

const JumpScene: React.FC = () => {
  const f = useCurrentFrame();
  const k = Math.min(rise(f, T.s('jump1') + 6, 14), 1 - rise(f, JUMP, 6));
  const up = rise(f, JUMP, 10) * (1 - rise(f, JUMP + 26, 14));
  const rows = [
    {label: 'KABINE', v: V_IMPACT, color: C.red, from: T.s('jump1')},
    {label: 'SPRUNG', v: V_JUMP, color: C.teal, from: JUMP},
    {label: 'AUFPRALL', v: V_LEFT, color: C.orange, from: T.s('jump2')},
  ];
  const arrow = rise(f, JUMP, 8) * (1 - rise(f, T.s('jump2'), 8));
  return (
    <>
      {svg(
        <>
          <Inside>
            <Crouch x={540} y={1320 - 220 * up} s={0.75} k={k} />
          </Inside>
          {/* the cabin falls, the jump pushes up */}
          <g opacity={rise(f, T.s('jump1'), 8)}>
            <line x1={1000} x2={1000} y1={400} y2={1200} stroke={C.red} strokeWidth={14} />
            <polygon points="1000,1250 976,1196 1024,1196" fill={C.red} />
          </g>
          <g opacity={arrow}>
            <line x1={700} x2={700} y1={760} y2={600} stroke={C.teal} strokeWidth={14} />
            <polygon points="700,560 676,614 724,614" fill={C.teal} />
          </g>
          {rows.map((r, i) => {
            const o = rise(f, r.from, 10);
            return <rect key={r.label} x={420} y={1460 + i * 130} width={(r.v / V_IMPACT) * 340 * o} height={70} rx={14} fill={r.color} opacity={o} />;
          })}
        </>,
      )}
      {rows.map((r, i) => {
        const o = rise(f, r.from, 10);
        return (
          <React.Fragment key={r.label}>
            <Txt x={120} y={1474 + i * 130} size={36} weight={800} color={r.color} style={{opacity: o}}>{r.label}</Txt>
            <Txt x={432 + (r.v / V_IMPACT) * 340} y={1466 + i * 130} size={52} color={C.text} style={{opacity: o}}>
              {r.label === 'SPRUNG' ? '−' : ''}{Math.round(r.v)} km/h
            </Txt>
          </React.Fragment>
        );
      })}
    </>
  );
};

const HouseScene: React.FC = () => {
  const f = useCurrentFrame();
  const FH = 110;
  const GRD = 1600;
  const yAt = (floor: number) => GRD - floor * FH - FH / 2;
  const eight = rise(f, T.w('jump3', 'achten') - 2, 10);
  return (
    <>
      {svg(
        <>
          <line x1={0} x2={1080} y1={GRD} y2={GRD} stroke={C.border} strokeWidth={5} />
          <Building x={180} ground={GRD} floorH={FH} />
          <circle cx={390} cy={yAt(9)} r={30} fill={C.red} opacity={1 - 0.6 * eight} />
          <circle cx={390} cy={yAt(9) + (yAt(7) - yAt(9)) * eight} r={30} fill={C.orange} opacity={eight} style={{filter: `drop-shadow(0 0 12px ${C.orange})`}} />
          <path d={`M 640 ${yAt(9)} C 700 ${yAt(9)} 700 ${yAt(7)} 640 ${yAt(7)}`} stroke={C.orange} strokeWidth={8} fill="none" opacity={eight} />
        </>,
      )}
      <Txt x={720} y={yAt(9) - 34} size={50} color={C.red}>10. STOCK</Txt>
      <Txt x={720} y={yAt(7) - 34} size={50} color={C.orange} style={{opacity: eight}}>≈ 8. STOCK</Txt>
      <Txt x={540} y={GRD + 60} size={40} weight={800} align="center" color={C.muted} spacing={3} style={{opacity: eight}}>DEIN SPRUNG SPART 2 STOCKWERKE</Txt>
    </>
  );
};

const FloatScene: React.FC = () => {
  const f = useCurrentFrame();
  const drift = rise(f, T.w('float2', 'schwebst') - 6, 30);
  const dark = rise(f, T.s('float3'), 10);
  const rot = 14 * Math.sin(f * 0.05) * (0.3 + drift);
  return (
    <>
      {svg(
        <Inside dark={dark}>
          <Person x={540} y={1316 - 200 * drift} s={0.72} rot={rot} />
          <g transform={`translate(${300 + 20 * Math.sin(f * 0.04)} ${1000 - 120 * drift}) rotate(${f * 1.2})`}>
            <rect x={-30} y={-55} width={60} height={110} rx={10} fill={C.panel} stroke={C.teal} strokeWidth={4} />
          </g>
          <g transform={`translate(${780 + 16 * Math.sin(f * 0.05 + 2)} ${1150 - 260 * drift}) rotate(${-f * 0.8})`}>
            <rect x={-50} y={-40} width={100} height={80} rx={16} fill="#3a2a1a" />
          </g>
        </Inside>,
      )}
      <Pill x={540} y={190} color={C.teal} show={rise(f, T.w('float1', 'schwerelos'), 8) * (1 - dark)} size={44} filled>SCHWERELOS</Pill>
      <Txt x={540} y={620} size={260} align="center" color={C.text} style={{opacity: dark, textShadow: glow('#ffffff44', 20)}}>?</Txt>
      <Pill x={540} y={1000} color={C.red} show={dark} size={44}>WANN KOMMT DER AUFPRALL?</Pill>
    </>
  );
};

const BestScene: React.FC = () => {
  const f = useCurrentFrame();
  const lie = rise(f, T.w('best1', 'Leg'), 12);
  const spread = rise(f, T.w('best2', 'verteilt'), 10);
  return (
    <>
      {svg(
        <Inside>
          <Person x={540} y={1316} s={0.72} o={1 - lie} />
          <Person x={820} y={1316 - 64} s={0.6} rot={-90} o={lie} />
          {Array.from({length: 9}, (_, i) => {
            const x = 270 + i * 66;
            const t = ((f * 2 + i * 9) % 40) / 40;
            return (
              <g key={i} opacity={spread * (0.5 + 0.5 * (1 - t))}>
                <line x1={x} x2={x} y1={1060 + t * 40} y2={1150 + t * 40} stroke={C.teal} strokeWidth={10} />
                <polygon points={`${x},${1180 + t * 40} ${x - 14},${1148 + t * 40} ${x + 14},${1148 + t * 40}`} fill={C.teal} />
              </g>
            );
          })}
        </Inside>,
      )}
      <Pill x={540} y={190} color={C.teal} show={lie} size={44} filled>FLACH HINLEGEN</Pill>
      <Txt x={540} y={1420} size={54} align="center" color={C.teal} style={{opacity: spread}}>SCHLAG AUF DEN GANZEN KÖRPER</Txt>
    </>
  );
};

const BrakeScene: React.FC = () => {
  const f = useCurrentFrame();
  const s0 = T.s('end3');
  const clampAt = T.w('end3', 'Fangbremse') + 4;
  const fall = Math.min(f, clampAt) - s0;
  const y = 1000 + Math.max(0, fall) * 3 + (f > clampAt ? 14 * (1 - rise(f, clampAt, 10)) : 0);
  const c = rise(f, clampAt, 6);
  const sparks = f > clampAt && f < clampAt + 24 ? 1 - (f - clampAt) / 24 : 0;
  return (
    <>
      {svg(
        <>
          <rect x={-400} y={-400} width={1880} height={2800} fill="#0c1622" />
          <rect x={CAB.x - 30} y={-400} width={CAB.w + 60} height={2800} fill="#081019" />
          <rect x={CAB.x - 22} y={-400} width={10} height={2800} fill="#2a3a4c" />
          <rect x={CAB.x + CAB.w + 12} y={-400} width={10} height={2800} fill="#2a3a4c" />
          <Cabin y={y}>
            <Person x={CAB.x + CAB.w / 2} y={y - 4} s={0.2} />
          </Cabin>
          <Wedge x={CAB.x - 17} y={y - 20} c={c} side={-1} />
          <Wedge x={CAB.x + CAB.w + 17} y={y - 20} c={c} side={1} />
          {sparks > 0 && Array.from({length: 10}, (_, i) => {
            const side = i % 2 ? 1 : -1;
            const bx = side > 0 ? CAB.x + CAB.w + 17 : CAB.x - 17;
            const a = (i * 37) % 180;
            return <line key={i} x1={bx} y1={y - 20} x2={bx + side * (30 + a)} y2={y - 20 - 60 + (i * 23) % 120} stroke={C.orange} strokeWidth={4} opacity={sparks} />;
          })}
        </>,
      )}
      <Pill x={540} y={520} color={C.orange} show={rise(f, clampAt - 6, 8)} size={48} filled>FANGBREMSE</Pill>
      <Txt x={540} y={1240} size={58} align="center" color={C.teal} style={{opacity: rise(f, T.w('end3', 'fest') - 2, 8)}}>HÄLT DIE KABINE FEST</Txt>
    </>
  );
};

// ---------------------------------------------------------------------------------------

export const AufzugVideo: React.FC = () => {
  const f = useCurrentFrame();
  const hud = rise(f, 2, 10) * (1 - rise(f, T.s('jump1'), 8));
  const t = tFall(f);
  const h = f < T.s('jump1') ? heightAt(t) : 0;
  const v = f < T.s('jump2') ? speedAt(t) : tween(f, T.s('jump2'), T.w('jump2', '80') + 4, V_IMPACT, V_LEFT);
  const whiteFlash = f >= IMPACT ? Math.max(0, 1 - (f - IMPACT) / 7) * 0.8 : 0;
  const slow = (rise(f, SNAP, 6) * (1 - rise(f, PAUSE, 4)) + rise(f, FALL0, 6) * (1 - rise(f, IMPACT, 4)));
  const pause = rise(f, PAUSE, 6) * (1 - rise(f, FALL0, 6));
  return (
    <AbsoluteFill>
      <Backdrop cam={cam.at(f)} />
      <Audio src={staticFile('aufzug/voice.wav')} />
      <World track={cam}>
        <Place at={O.shaft}><ShaftScene /></Place>
        <Place at={O.jump}><JumpScene /></Place>
        <Place at={O.house}><HouseScene /></Place>
        <Place at={O.float}><FloatScene /></Place>
        <Place at={O.best}><BestScene /></Place>
        <Place at={O.brake}><BrakeScene /></Place>
      </World>
      <AbsoluteFill style={{background: '#fff', opacity: whiteFlash}} />
      <HudTile x={90} y={150} w={420} label="HÖHE" value={de(h, 1)} unit="m" color={C.text} show={hud} />
      <HudTile x={570} y={150} w={420} label="TEMPO" value={String(Math.round(v))} unit="km/h" color={C.red} show={hud} />
      <Badge text="ZEITLUPE" show={slow} color={C.muted} />
      <Badge text="❚❚ PAUSE" show={pause} />
      <Choice
        question="RETTET DICH EIN SPRUNG?" a={{label: 'JA', color: C.teal}} b={{label: 'NEIN', color: C.red}}
        from={T.s('hook2')} to={FALL0 - 4} cdFrom={T.s('hook3')} top={520} size={68}
      />
      <Captions timing={T.timing} />
      <Handle text="scrimpass.com" />
    </AbsoluteFill>
  );
};
