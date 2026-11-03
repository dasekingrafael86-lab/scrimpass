import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import {Backdrop, Badge, Captions, Choice, Handle, HudTile, Pill, Txt} from '../../components/Kit';
import {Cam, Place, Track, World} from '../../lib/camera';
import {C, fontFamily, glow, W} from '../../lib/theme';
import {de, makeTiming, rise, tween} from '../../lib/timing';
import {
  Bullet, Car, Flash, MUZZLE, PXM, Person, PersonSide, Rooftops, SOUND, ScopeView, Sniper, YOU, YOU_S,
  distAt, lineY, signalAt, tof, useSway,
} from './art';
import timingJson from './timing.json';

const T = makeTiming(timingJson);
export const DURATION = T.total;

const O = {
  scope: [0, 0], // through the sniper's scope
  roofs: [3000, 0], // the two rooftops, 300 m apart
  body: [7000, 0], // side view: eye -> brain -> legs
  dodge: [0, 3500], // front view: 30 cm to the side, g-forces
  chart: [3000, 3500], // flight time over distance
} satisfies Record<string, [number, number]>;
type SceneId = keyof typeof O;
const at = (s: SceneId, x: number, y: number, z = 1, r = 0): Cam => ({x: O[s][0] + x, y: O[s][1] + y, z, r});

// ---------------------------------------------------------------------------------------
// the shot

const SHOT = T.w('hook2', 'ab');
const FLY0 = T.s('flight1');
const FLY_END = T.e('flight3');
const T_END = tof(297); // the bullet is frozen 3 m before you
const SLOWMO = Math.round((FLY_END - FLY0) / 30 / T_END);
const bulletT = (f: number) => (f < FLY0 ? 0.0005 : Math.min(T_END, (f - FLY0) / 30 / SLOWMO));
const bulletX = (f: number) => MUZZLE.x + distAt(bulletT(f)) * PXM;

// reaction
const SEE = T.w('react2', 'Sehen');
const RUN = T.w('react2', 'losrennen');
const signalP = (f: number) => tween(f, SEE, RUN + 12, 0, 1);

// chart
const MARK_MOVE = T.w('dist2', 'So');
const markD = (f: number) => tween(f, MARK_MOVE, MARK_MOVE + 30, 300, 410);
const CH = {x0: 170, y0: 1250, pxm: 1.4, pxs: 760};
const chX = (d: number) => CH.x0 + d * CH.pxm;
const chY = (t: number) => CH.y0 - t * CH.pxs;

// ---------------------------------------------------------------------------------------
// camera: calm, clean cuts, the bullet is followed like the coin

const cam = new Track()
  .cut(0, at('scope', 540, 900, 1.0))
  .to(0, SHOT, at('scope', 540, 880, 1.08), 'linear')
  .shake(SHOT, 0.7)
  // the shooter sits low in the frame, under the question
  .jump(SHOT + 3, at('roofs', MUZZLE.x - 40, MUZZLE.y - 100, 2.5))
  .to(SHOT + 3, FLY0 - SHOT - 3, at('roofs', MUZZLE.x - 20, MUZZLE.y - 110, 2.3), 'linear')
  .follow(FLY0, FLY_END + 6, (f) => at('roofs', bulletX(f) + 40, lineY(bulletX(f)), 1.3), 20)
  .to(FLY_END, 20, at('roofs', YOU.x - 50, YOU.y - 50, 2.4))
  .to(T.s('flight4'), 30, at('roofs', 1500, 1180, 0.42))
  .to(T.s('react1'), 24, at('roofs', MUZZLE.x + 20, MUZZLE.y, 2.4))
  .jump(T.s('react2'), at('body', 840, 548, 1.5))
  .follow(SEE, RUN + 20, (f) => {
    const [x, y] = signalAt(signalP(f));
    return at('body', x, y, 1.3);
  }, 16)
  .to(T.s('react3'), 24, at('body', 600, 1100, 0.8))
  .to(T.w('react3', 'Bleiben') - 4, 22, at('body', 540, 1700, 1.05))
  .jump(T.s('move1'), at('dodge', 540, 820, 0.9))
  .to(T.w('move1', 'Seite') - 4, 22, at('dodge', 620, 800, 1.05))
  .to(T.s('move2'), 24, at('dodge', 540, 1640, 1.0))
  .shake(T.w('move3', 'Viertel') + 4, 0.5)
  .jump(T.s('dist1'), at('chart', 590, 900, 0.95))
  .to(MARK_MOVE, 30, at('chart', chX(410), chY(0.6), 1.25))
  .jump(T.s('dist3'), at('roofs', YOU.x - 120, YOU.y - 50, 2.0))
  .to(T.s('dist3') + 2, T.s('end1') - T.s('dist3') - 4, at('roofs', YOU.x - 60, YOU.y - 50, 2.4), 'linear')
  .jump(T.s('end1'), at('scope', 540, 900, 1.0))
  .to(T.s('end1') + 2, 90, at('scope', 540, 880, 1.06), 'linear')
  .shake(T.s('end2'), 0.5);

// ---------------------------------------------------------------------------------------
// scenes

const Scope: React.FC = () => {
  const f = useCurrentFrame();
  const {dx, dy} = useSway();
  const end = T.s('end1');
  const strafe = rise(f, T.w('end3', 'bewegen'), 12);
  const personX = f >= end ? 230 * Math.sin((f - end) / 7) * strafe : 0;
  const no = rise(f, T.w('end2', 'nein'), 8);
  const move = rise(f, T.w('end3', 'bewegen'), 10);
  return (
    <>
      <ScopeView dx={dx} dy={dy} personX={personX} />
      <Txt x={W / 2} y={120} size={120} align="center" color={C.red} style={{opacity: no, transform: `scale(${1.3 - 0.3 * no})`, textShadow: glow(`${C.red}55`, 18)}}>
        NEIN.
      </Txt>
      <Txt x={W / 2} y={268} size={58} align="center" color={C.orange} style={{opacity: move}}>
        BEWEG DICH VORHER.
      </Txt>
    </>
  );
};

const Roofs: React.FC = () => {
  const f = useCurrentFrame();
  const shot = f >= SHOT;
  const flash = f >= SHOT + 3 ? Math.max(0, 1 - (f - SHOT - 3) / 10) : 0;
  const reflash = rise(f, T.w('react1', 'Mündungsfeuer'), 6) * (1 - rise(f, T.s('react2') - 6, 6));
  const bx = bulletX(f);
  const t = bulletT(f);
  const wave = rise(f, FLY0, 10);
  const r = SOUND * t * PXM;
  const waveLabel = rise(f, T.s('flight4'), 10) * (1 - rise(f, T.s('react1'), 10));
  const wide = rise(f, T.s('flight4') + 10, 12) * (1 - rise(f, T.s('react1'), 10));
  const look = rise(f, T.s('dist3'), 10);
  return (
    <>
      <Rooftops />
      <svg width={3000} height={2000} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <Sniper x={MUZZLE.x} y={MUZZLE.y} />
        <Person x={YOU.x} y={YOU.y} s={YOU_S} />
        {shot && <circle cx={MUZZLE.x} cy={MUZZLE.y} r={r} fill="none" stroke={C.teal} strokeWidth={6} strokeDasharray="20 16" opacity={0.6 * wave} />}
        <Flash x={MUZZLE.x + 6} y={MUZZLE.y} o={Math.max(flash, reflash)} s={1 + reflash} />
        {shot && <Bullet x={bx} y={lineY(bx)} />}
        <g opacity={wide}>
          <line x1={MUZZLE.x} x2={YOU.x} y1={1180} y2={1180} stroke={C.text} strokeWidth={6} />
          <line x1={MUZZLE.x} x2={MUZZLE.x} y1={1150} y2={1210} stroke={C.text} strokeWidth={6} />
          <line x1={YOU.x} x2={YOU.x} y1={1150} y2={1210} stroke={C.text} strokeWidth={6} />
          <text x={(MUZZLE.x + YOU.x) / 2} y={1290} textAnchor="middle" fontFamily={fontFamily} fontWeight={800} fontSize={90} fill={C.text}>300 m</text>
        </g>
        <g opacity={look}>
          <line x1={YOU.x - 10} y1={YOU.y - 70} x2={MUZZLE.x} y2={MUZZLE.y} stroke={C.teal} strokeWidth={3} strokeDasharray="10 10" opacity={0.7} />
        </g>
      </svg>
      <Pill x={MUZZLE.x - 100} y={MUZZLE.y + 50} color={C.red} show={rise(f, SHOT + 4, 8) * (1 - wide)} size={30}>SCHÜTZE</Pill>
      <Pill x={YOU.x} y={YOU.y - 170} color={C.teal} show={rise(f, FLY_END - 10, 8)} size={30}>DU</Pill>
      <div style={{position: 'absolute', left: MUZZLE.x + r - 20, top: MUZZLE.y - 260, opacity: waveLabel}}>
        <Txt x={0} y={0} size={80} color={C.teal} style={{position: 'static'}}>KNALL</Txt>
        <Txt x={0} y={0} size={46} weight={700} color={C.muted} style={{position: 'static', marginTop: 8}}>erst nach {de(300 / SOUND, 2)} s bei dir</Txt>
      </div>
      <Txt x={MUZZLE.x} y={MUZZLE.y - 120} size={30} color={C.orange} spacing={3} style={{opacity: reflash, transform: 'translateX(-50%)'}}>MÜNDUNGSFEUER</Txt>
    </>
  );
};

const Body: React.FC = () => {
  const f = useCurrentFrame();
  const p = signalP(f);
  const [dx, dy] = signalAt(p);
  const think = rise(f, T.w('react2', 'verstehen'), 8) * (1 - rise(f, RUN + 14, 12));
  const legs = rise(f, RUN, 8);
  const flash = rise(f, SEE - 8, 4) * (1 - rise(f, SEE + 14, 10));
  const count = tween(f, T.s('react3'), T.w('react3', 'Sekunden'), 0, 0.25);
  const ring = rise(f, T.s('react3') - 4, 8);
  const left = rise(f, T.w('react3', 'Bleiben'), 10);
  const R = 120;
  const circ = 2 * Math.PI * R;
  const BAR = {x: 120, y: 1700, w: 840};
  const label = (text: string, x: number, y: number, word: string, color = C.text) => (
    <Txt x={x} y={y} size={40} weight={800} color={color} spacing={3} style={{opacity: rise(f, T.w('react2', word), 6), transform: 'translateX(-50%)'}}>{text}</Txt>
  );
  return (
    <>
      <PersonSide think={think} legs={legs} />
      <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
        <Flash x={1010} y={548} o={flash} />
        {p > 0 && p < 1 && <circle cx={dx} cy={dy} r={16} fill={C.orange} style={{filter: `drop-shadow(0 0 12px ${C.orange})`}} />}
        <g transform="translate(860 1020) rotate(-90)" opacity={ring * (1 - left)}>
          <circle r={R} fill="none" stroke={C.border} strokeWidth={22} />
          <circle r={R} fill="none" stroke={C.orange} strokeWidth={22} strokeDasharray={`${(circ * count) / 0.42} ${circ}`} />
        </g>
        <rect x={BAR.x} y={BAR.y} width={BAR.w} height={70} rx={14} fill={C.panel} stroke={C.border} strokeWidth={2} opacity={ring} />
        <rect x={BAR.x} y={BAR.y} width={(BAR.w * count) / 0.42} height={70} rx={14} fill={C.orange} opacity={ring} />
        <rect x={BAR.x + (BAR.w * 0.25) / 0.42} y={BAR.y} width={(BAR.w * 0.17 * left) / 0.42} height={70} rx={14} fill={C.teal} />
      </svg>
      {label('SEHEN', 820, 450, 'Sehen')}
      {label('VERSTEHEN', 560, 300, 'verstehen', C.orange)}
      {label('LOSRENNEN', 860, 1440, 'losrennen')}
      <Txt x={860} y={990} size={52} style={{opacity: ring * (1 - left), transform: 'translateX(-50%)'}}>{de(count, 2)}<span style={{fontSize: 28, color: C.muted}}> s</span></Txt>
      <Txt x={BAR.x} y={BAR.y - 60} size={36} weight={800} color={C.orange} style={{opacity: ring}}>REAKTION 0,25 s</Txt>
      <Txt x={BAR.x + BAR.w} y={BAR.y - 60} size={36} weight={800} align="right" color={C.teal} style={{opacity: left}}>ÜBRIG 0,17 s</Txt>
      <Txt x={BAR.x} y={BAR.y + 90} size={30} weight={700} color={C.muted} style={{opacity: ring}}>FLUGZEIT DER KUGEL · 0,42 s</Txt>
    </>
  );
};

const Dodge: React.FC = () => {
  const f = useCurrentFrame();
  const chest = {x: 540, y: 1300 - 0.9 * 620};
  const incoming = rise(f, T.s('move1'), 40);
  const side = rise(f, T.w('move1', 'Seite'), 12);
  const cm = rise(f, T.w('move1', '30'), 8);
  const rows = [
    {label: 'NÖTIG', g: 2.1, color: C.red, from: T.s('move2'), icon: null},
    {label: 'FORMEL 1', g: 1.1, color: C.orange, from: T.w('move2', 'Formel'), icon: 'car'},
    {label: 'DU', g: 0.5, color: C.teal, from: T.s('move3'), icon: 'you'},
  ];
  const quarter = rise(f, T.w('move3', 'Viertel'), 8);
  return (
    <>
      <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
        <line x1={120} x2={960} y1={1300} y2={1300} stroke={C.border} strokeWidth={4} />
        <Person x={690} y={1300} s={0.9} outline={C.teal} o={0.7 * side} />
        <Person x={540} y={1300} s={0.9} />
        <circle cx={chest.x} cy={chest.y} r={10 + 26 * incoming} fill={C.orange} opacity={0.35 + 0.5 * incoming} style={{filter: `drop-shadow(0 0 16px ${C.orange})`}} />
        <g opacity={cm}>
          <line x1={540} x2={690} y1={1350} y2={1350} stroke={C.orange} strokeWidth={6} />
          <polygon points="690,1350 672,1340 672,1360" fill={C.orange} />
        </g>
        {rows.map((r, i) => {
          const o = rise(f, r.from, 10);
          const y = 1500 + i * 140;
          return (
            <g key={r.label} opacity={o}>
              <rect x={420} y={y} width={(r.g / 2.1) * 480 * o} height={70} rx={14} fill={r.color} />
              {r.icon === 'car' && <Car x={360} y={y + 50} s={0.9} color={r.color} />}
              {r.icon === 'you' && <Person x={360} y={y + 70} s={0.07} />}
            </g>
          );
        })}
      </svg>
      <Txt x={615} y={1375} size={48} align="center" color={C.orange} style={{opacity: cm, left: 615, width: undefined, marginLeft: 0, transform: 'translateX(-50%)'}}>30 cm</Txt>
      <Txt x={615} y={1430} size={34} weight={700} align="center" color={C.muted} style={{opacity: cm, left: 615, width: undefined, marginLeft: 0, transform: 'translateX(-50%)'}}>in 0,17 s</Txt>
      {rows.map((r, i) => {
        const o = rise(f, r.from, 10);
        const y = 1500 + i * 140;
        return (
          <React.Fragment key={r.label}>
            <Txt x={120} y={y + 14} size={36} weight={800} color={r.color} style={{opacity: o}}>{r.label}</Txt>
            <Txt x={430 + (r.g / 2.1) * 480} y={y + 6} size={52} color={C.text} style={{opacity: o}}>{de(r.g)} g</Txt>
          </React.Fragment>
        );
      })}
      <Txt x={760} y={1760} size={70} color={C.teal} style={{opacity: quarter, textShadow: glow(`${C.teal}55`, 16)}}>≈ ¼</Txt>
    </>
  );
};

const Chart: React.FC = () => {
  const f = useCurrentFrame();
  const draw = rise(f, T.s('dist1') + 4, 40);
  const need = rise(f, T.w('dist2', '0,6'), 10);
  const moved = rise(f, MARK_MOVE + 26, 8);
  const m = markD(f);
  const pts = Array.from({length: 61}, (_, i) => `${chX(i * 10)},${chY(tof(i * 10))}`).join(' ');
  const len = 1400;
  return (
    <>
      <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <rect x={chX(410)} y={chY(1.0)} width={chX(600) - chX(410)} height={CH.pxs} fill={C.teal} opacity={0.12 * moved} />
        <line x1={CH.x0} x2={chX(600)} y1={CH.y0} y2={CH.y0} stroke={C.muted} strokeWidth={3} />
        <line x1={CH.x0} x2={CH.x0} y1={CH.y0} y2={chY(1.0)} stroke={C.muted} strokeWidth={3} />
        {[100, 200, 300, 400, 500, 600].map((d) => (
          <text key={d} x={chX(d)} y={CH.y0 + 50} textAnchor="middle" fontFamily={fontFamily} fontWeight={700} fontSize={28} fill={C.muted}>{d}</text>
        ))}
        {[0.2, 0.4, 0.6, 0.8, 1.0].map((t) => (
          <text key={t} x={CH.x0 - 18} y={chY(t) + 10} textAnchor="end" fontFamily={fontFamily} fontWeight={700} fontSize={28} fill={C.muted}>{de(t)}</text>
        ))}
        <polyline points={pts} fill="none" stroke={C.orange} strokeWidth={8} strokeLinecap="round" strokeDasharray={`${len * draw} ${len}`} />
        <line x1={CH.x0} x2={chX(600)} y1={chY(0.6)} y2={chY(0.6)} stroke={C.teal} strokeWidth={5} strokeDasharray="18 12" opacity={need} />
        <line x1={chX(m)} x2={chX(m)} y1={CH.y0} y2={chY(tof(m))} stroke={moved > 0.5 ? C.orange : C.red} strokeWidth={4} opacity={draw} />
        <circle cx={chX(m)} cy={chY(tof(m))} r={16} fill={moved > 0.5 ? C.teal : C.red} opacity={draw} />
      </svg>
      <Txt x={CH.x0} y={chY(1.0) - 70} size={30} weight={700} color={C.muted} spacing={3} style={{opacity: draw}}>FLUGZEIT (s)</Txt>
      <Txt x={chX(600)} y={CH.y0 + 90} size={30} weight={700} align="right" color={C.muted} spacing={3} style={{opacity: draw}}>ENTFERNUNG (m)</Txt>
      <Txt x={CH.x0 + 20} y={chY(0.6) - 56} size={36} weight={800} color={C.teal} style={{opacity: need}}>DU BRAUCHST 0,6 s</Txt>
      <Txt x={chX(m) + 24} y={chY(tof(m)) + 20} size={44} color={moved > 0.5 ? C.teal : C.red} style={{opacity: draw}}>
        {Math.round(m)} m · {de(tof(m), 2)} s
      </Txt>
      <Txt x={chX(505)} y={chY(0.95)} size={44} align="center" color={C.teal} style={{opacity: moved, left: chX(505), width: undefined, marginLeft: 0, transform: 'translateX(-50%)'}}>CHANCE</Txt>
    </>
  );
};

// ---------------------------------------------------------------------------------------

export const SniperVideo: React.FC = () => {
  const f = useCurrentFrame();
  const inChart = f >= T.s('dist1') && f < T.s('dist3');
  const flown = distAt(bulletT(f));
  const distance = inChart ? markD(f) : f < T.s('react2') ? 300 - (f >= SHOT ? flown : 0) : 300;
  const time = inChart ? tof(markD(f)) : f >= SHOT ? bulletT(f) : 0;
  const hud = rise(f, 2, 10) * (1 - rise(f, T.s('end1') - 6, 10));
  const whiteFlash = f >= SHOT ? Math.max(0, 1 - (f - SHOT) / 7) * 0.85 : 0;
  const slow = rise(f, FLY0, 8) * (1 - rise(f, FLY_END, 6));
  const pause = rise(f, FLY_END, 6) * (1 - rise(f, T.s('react2'), 6));
  return (
    <AbsoluteFill>
      <Backdrop cam={cam.at(f)} />
      <Audio src={staticFile('sniper/voice.wav')} />
      <World track={cam}>
        <Place at={O.scope}><Scope /></Place>
        <Place at={O.roofs}><Roofs /></Place>
        <Place at={O.body}><Body /></Place>
        <Place at={O.dodge}><Dodge /></Place>
        <Place at={O.chart}><Chart /></Place>
      </World>
      <AbsoluteFill style={{background: '#fff', opacity: whiteFlash}} />
      <HudTile x={90} y={150} w={420} label="ENTFERNUNG" value={String(Math.max(0, Math.round(distance)))} unit="m" color={C.text} show={hud} />
      <HudTile x={570} y={150} w={420} label="FLUGZEIT" value={de(time, 2)} unit="s" color={C.orange} show={hud} />
      <Badge text={`ZEITLUPE ×${SLOWMO}`} show={slow} color={C.muted} />
      <Badge text="❚❚ PAUSE" show={pause} />
      <Choice
        question="SCHAFFT DAS EIN MENSCH?" a={{label: 'JA', color: C.teal}} b={{label: 'NEIN', color: C.red}}
        from={T.s('hook3')} to={FLY0 - 6} cdFrom={T.s('hook4')} size={68}
      />
      <Captions timing={T.timing} />
      <Handle text="scrimpass.com" />
    </AbsoluteFill>
  );
};
