import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import {Building, GameView, ROOM, Room, Screen, SideView, VB, signalAt, windowCenter} from '../../components/Art';
import {Backdrop, Captions, Handle, HudTile, Pill, Txt} from '../../components/Kit';
import {Cam, Place, Track, World, soft} from '../../lib/camera';
import {C, fontFamily, glow, W} from '../../lib/theme';
import {de, makeTiming, rise, tween} from '../../lib/timing';
import timingJson from './timing.json';

const T = makeTiming(timingJson);
export const DURATION = T.total;

// every scene sits at its own spot in one world; the camera travels and cuts between them
const O = {
  ext: [0, 0], // apartment block at night (the verdict)
  duo: [-3000, 0], // opening: both gamers in a split screen
  roomDU: [3000, 0], // DU's room (the PC)
  screens: [0, 3000], // both monitors, stacked
  frames: [3000, 3000], // the monitor's pictures as a film strip
  react: [6500, 3000], // side view: eye -> brain -> hand
} satisfies Record<string, [number, number]>;
type SceneId = keyof typeof O;
const at = (s: SceneId, x: number, y: number, z = 1, r = 0): Cam => ({x: O[s][0] + x, y: O[s][1] + y, z, r});

// ---------------------------------------------------------------------------------------
// what happens in the game

const PEEK = T.w('hook1', 'Gegner'); // first second: the enemy must already be moving
const DUO_CROP = 300; // the split shows each room from this y on
const DUO_ZOOM = 1.3; // ... enlarged around the monitor
const peekAt = (f: number) => rise(f, PEEK, 12);

const SLOWMO = 16;
const VB_SPEED = (1000 * VB.w) / 1920; // 1000 screen px/s in view-box units
const RUN = T.s('motion2');
const stepped = (hz: number, f: number) => {
  const t = Math.max(0, f - RUN) / 30 / SLOWMO;
  return Math.floor(t * hz) / hz; // the monitor only shows a new picture at each refresh
};
const runX = (hz: number, f: number) => 150 + VB_SPEED * stepped(hz, f);
const runPhase = (hz: number, f: number) => stepped(hz, f) * Math.PI * 2 * 2.5;
const aimX = (hz: number, f: number) => {
  const s = Array.from({length: 8}, (_, k) => runX(hz, f - 2 - k * 2));
  return s.reduce((a, b) => a + b, 0) / s.length;
};

// screens scene layout
const SCR = {x: 80, w: 920, h: 518, du: 350, er: 1020};
const sx = (vbx: number) => SCR.x + (vbx * SCR.w) / VB.w;
const sy = (top: number, vby: number) => top + (vby * SCR.h) / VB.h;

// film strip layout
const ROW_W = 1680;
const RX = 120;
const msX = (ms: number) => (ms / 50) * ROW_W;
const EVENT = 21; // ms after which the enemy is out
const ROW60 = 560;
const ROW240 = 1000;
const FPS_GROUP = T.w('fps2', 'viermal') - 4;

// reaction
const SEE = T.w('react1', 'Sehen');
const CLICK = T.w('react1', 'klicken');
const signalP = (f: number) => tween(f, SEE, CLICK + 6, 0, 1);

// ---------------------------------------------------------------------------------------
// camera script: calm moves, clean cuts between scenes, effects only where something happens

const duWin = windowCenter(1, 0);
const erWin = windowCenter(3, 2);
const scrMid = {x: ROOM.screen.x + ROOM.screen.w / 2, y: 800 + (ROOM.screen.y + ROOM.screen.h / 2 - 800) * DUO_ZOOM - DUO_CROP};
const intoDuoZ = (1.2 * SCR.w) / (ROOM.screen.w * DUO_ZOOM); // DU's screen in the split, as wide as on the screens scene

const cam = new Track()
  // 0 s: both players at once, the enemy peeks on both monitors
  .cut(0, at('duo', 540, 960, 1.0))
  .to(0, T.s('hook4'), at('duo', 540, 960, 1.07), 'linear')
  // into DU's monitor -> the game, frozen
  .to(T.s('frame1') - 14, 14, at('duo', scrMid.x, scrMid.y, intoDuoZ))
  .jump(T.s('frame1'), at('screens', 540, SCR.du + SCR.h / 2, 1.2))
  .to(T.s('frame1') + 6, T.s('frame1b') - T.s('frame1') - 8, at('screens', 540, SCR.du + SCR.h / 2, 1.1), 'linear')
  // film strip: cut in, then glide along it
  .jump(T.s('frame1b'), at('frames', RX + 420, ROW60 + 155, 1.15))
  .to(T.s('frame1b') + 4, T.s('frame3') - T.s('frame1b') - 24, at('frames', RX + 1260, ROW60 + 120, 1.15), 'linear')
  .to(T.s('frame3') - 16, 22, at('frames', RX + ROW_W / 2, ROW240 + 20, 0.72))
  .to(T.s('frame4'), 22, at('frames', RX + msX(EVENT), 820, 1.0))
  .to(T.s('frame5'), 22, at('frames', RX + ROW_W / 2, 830, 0.6))
  .to(T.w('frame6', 'Gut') - 6, 20, at('frames', RX + ROW_W / 2, 1200, 1.0))
  // side view: cut to the eye, follow the signal, pull back to the ring
  .jump(T.s('react1'), at('react', 760, 560, 1.6))
  .follow(SEE, CLICK + 14, (f) => {
    const [x, y] = signalAt(signalP(f));
    return at('react', x, y, 1.45);
  }, 16)
  .to(T.s('react1b'), 24, at('react', 600, 900, 0.85))
  .to(T.s('react2'), 20, at('react', 330, 1150, 1.5))
  .to(T.w('react2', '3') - 4, 20, at('react', 560, 1160, 1.0))
  .shake(T.w('react2', '3') + 6, 0.5)
  // the monitors again: the camera runs with the enemy
  .jump(T.s('motion1'), at('screens', 540, 945, 0.86))
  .follow(RUN, T.s('motion4') - 4, (f) => at('screens', sx(runX(60, f)) + 40, sy(SCR.du, 600), 1.7), 24)
  .follow(T.s('motion4') - 4, T.s('motion5') + 2, (f) => at('screens', sx(runX(240, f)) + 40, sy(SCR.er, 600), 1.7), 18)
  .to(T.s('motion5') - 2, 26, at('screens', 540, 945, 0.86))
  .follow(T.w('motion5', 'Fadenkreuz') - 6, T.s('fps1') - 2, (f) => at('screens', sx(aimX(60, f)), sy(SCR.du, 590), 1.9), 20)
  // DU's room: down to the PC
  .jump(T.s('fps1'), at('roomDU', 540, 1000, 0.95))
  .to(T.s('fps1') + 10, 34, at('roomDU', ROOM.pc.x + ROOM.pc.w / 2 - 60, ROOM.pc.y + 180, 1.35))
  .shake(T.w('fps2', '60') + 2, 0.4)
  // ... which is why the film strip shows the same picture four times
  .jump(FPS_GROUP, at('frames', RX + ROW_W / 2, ROW240 + 60, 0.64))
  .to(FPS_GROUP + 4, T.s('end1') - FPS_GROUP - 8, at('frames', RX + ROW_W / 2, ROW240 + 60, 0.7), 'linear')
  // outside: the verdict over the block
  .jump(T.s('end1'), at('ext', 540, 560, 1.0))
  .to(T.s('end1') + 2, T.s('end3') - T.s('end1') - 4, at('ext', 540, 600, 1.08), 'linear')
  .shake(T.s('end2'), 0.5)
  .shake(T.s('end3') + 4, 0.6)
  .to(T.s('end3') + 14, 50, at('ext', 540, 860, 0.78));

// ---------------------------------------------------------------------------------------
// scenes

const Ext: React.FC = () => {
  const f = useCurrentFrame();
  const tags = rise(f, T.s('end1') + 6, 10);
  const q = rise(f, T.s('end1') - 4, 10);
  const strike = rise(f, T.s('end2'), 8);
  const yes = rise(f, T.s('end3'), 10);
  return (
    <>
      <Building gamers={[[1, 0], [3, 2]]} />
      <Pill x={duWin.x} y={duWin.y - 130} color={C.teal} show={tags} size={30}>DU · 60 HZ</Pill>
      <Pill x={erWin.x} y={erWin.y - 130} color={C.red} show={tags} size={30}>ER · 240 HZ</Pill>
      <Txt x={W / 2} y={300} size={120} align="center" style={{opacity: q * (1 - 0.5 * yes)}}>SCHNELLER?</Txt>
      <div style={{position: 'absolute', left: 170, top: 356, height: 12, width: 740 * strike, background: C.red, borderRadius: 6, opacity: 1 - 0.5 * yes}} />
      <Pill x={W / 2} y={470} color={C.red} show={strike} size={46}>KAUM</Pill>
      <Txt x={W / 2} y={600} size={160} align="center" color={C.orange}
        style={{opacity: yes, transform: `scale(${1.5 - 0.5 * yes})`, textShadow: glow(`${C.orange}88`, 26)}}>
        GENAUER.
      </Txt>
    </>
  );
};

const GamerRoom: React.FC<{hz: 60 | 240}> = ({hz}) => {
  const f = useCurrentFrame();
  const du = hz === 60;
  const tag = rise(f, T.w('fps1', '240'), 8);
  const low = rise(f, T.w('fps2', '60'), 6);
  return (
    <>
      <Room label={du ? '60 HZ' : '240 HZ'} accent={du ? C.teal : C.red} fans={du ? 1 - 0.75 * low : 1} screen={<GameView peek={peekAt(f)} />} />
      {du && (
        <Pill x={ROOM.pc.x + ROOM.pc.w / 2 - 40} y={ROOM.pc.y - 110} color={low > 0.5 ? C.red : C.orange} show={tag} size={44} filled>
          {low > 0.5 ? '60 FPS' : '240 FPS'}
        </Pill>
      )}
    </>
  );
};

// opening split screen: DU on top, ER below, both looking at the same corner
const Duo: React.FC = () => {
  const f = useCurrentFrame();
  // labels from the first frame: the viewer gets the setup before the voice says it
  const du = rise(f, 2, 8);
  const er = rise(f, 6, 8);
  const half = (top: number, hz: 60 | 240, accent: string, show: number) => (
    <div style={{position: 'absolute', left: 0, top, width: W, height: 960, overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: 0, top: -DUO_CROP, width: W, height: 1920, transform: `scale(${DUO_ZOOM})`, transformOrigin: '540px 800px'}}>
        <Room label={hz === 60 ? '60 HZ' : '240 HZ'} accent={accent} screen={<GameView peek={peekAt(f)} aimX={800} aimO={0.8} />} />
      </div>
      <Pill x={W / 2} y={170} color={accent} show={show} size={44} filled>{hz === 60 ? 'DU · 60 HZ' : 'ER · 240 HZ'}</Pill>
    </div>
  );
  return (
    <>
      {half(0, 60, C.teal, du)}
      {half(960, 240, C.red, er)}
      <div style={{position: 'absolute', left: 0, top: 956, width: W, height: 8, background: C.bg0}} />
    </>
  );
};

const Screens: React.FC = () => {
  const f = useCurrentFrame();
  const running = f >= RUN - 10;
  const cross = rise(f, T.w('motion5', 'Fadenkreuz') - 4, 8);
  const view = (hz: 60 | 240) => {
    if (!running) return <GameView peek={peekAt(f)} aimX={800} aimO={0.8} />;
    const x = runX(hz, f);
    const step = VB_SPEED / hz;
    return (
      <GameView
        runX={x} runPhase={runPhase(hz, f)} ghostX={f > RUN ? x - step : undefined}
        tag={hz === 60 ? '17 px / Bild' : '4 px / Bild'} tagO={rise(f, hz === 60 ? T.w('motion3', '17') : T.w('motion4', '4'), 8)}
        aimX={aimX(hz, f)} aimO={cross}
      />
    );
  };
  // focus pull between the two monitors while the camera rides one of them
  const on60 = rise(f, RUN, 10) * (1 - rise(f, T.s('motion4') - 2, 8));
  const on240 = rise(f, T.s('motion4') - 2, 8) * (1 - rise(f, T.s('motion5'), 10));
  const monitor = (top: number, label: string, accent: string, hz: 60 | 240, blur: number) => (
    <div style={soft(blur)}>
      <Txt x={SCR.x} y={top - 62} size={32} weight={800} color={accent} spacing={4}>{label}</Txt>
      <div style={{position: 'absolute', left: SCR.x - 14, top: top - 14, width: SCR.w + 28, height: SCR.h + 28, borderRadius: 18, background: '#0a0f16', border: '3px solid #1e2a3c'}} />
      <svg width={SCR.w} height={SCR.h} style={{position: 'absolute', left: SCR.x, top}}>
        <Screen x={0} y={0} w={SCR.w} h={SCR.h}>{view(hz)}</Screen>
      </svg>
    </div>
  );
  return (
    <>
      {monitor(SCR.du, '60 HZ · DU', C.teal, 60, 6 * on240)}
      {monitor(SCR.er, '240 HZ · ER', C.red, 240, 6 * on60)}
    </>
  );
};

const Thumb: React.FC<{x: number; y: number; w: number; h: number; o: number; peek?: number; runAt?: number; red?: boolean}> = ({x, y, w, h, o, peek, runAt, red}) => (
  <g opacity={o}>
    <Screen x={x} y={y} w={w} h={h}>
      {runAt === undefined ? <GameView peek={peek} /> : <GameView runX={runAt} runPhase={runAt / 40} />}
    </Screen>
    <rect x={x} y={y} width={w} height={h} rx={8} fill="none" stroke={red ? C.red : C.orange} strokeOpacity={0.8} strokeWidth={red ? 5 : 3} />
  </g>
);

const FrameRow: React.FC<{y: number; hz: 60 | 240}> = ({y, hz}) => {
  const f = useCurrentFrame();
  const period = 1000 / hz;
  const n = Math.round(50 / period);
  const bw = msX(period) - 8;
  const bh = (bw * 9) / 16;
  const next = Math.ceil(EVENT / period) * period;
  const waitFrom = T.w('frame4', 'auf');
  const wait = rise(f, waitFrom, 22);
  const seen = rise(f, waitFrom + 22, 6);
  const group = hz === 240 ? rise(f, FPS_GROUP, 8) : 0;
  const appear = hz === 60 ? T.s('frame1b') + 4 : T.s('frame3');
  return (
    <svg width={RX + ROW_W + 40} height={bh + 60} style={{position: 'absolute', left: 0, top: y, overflow: 'visible'}}>
      {Array.from({length: n}, (_, i) => {
        const t = i * period;
        const o = rise(f, appear + i * (hz === 60 ? 8 : 3), 8);
        const x = RX + msX(t) + 4;
        if (group > 0) {
          const k = Math.floor(i / 4) * 4; // at 60 FPS each picture stays for 4 refreshes
          return <Thumb key={i} x={x} y={0} w={bw} h={bh} o={o} runAt={300 + k * 90} red={i % 4 !== 0} />;
        }
        const visible = t >= next - 0.01;
        return <Thumb key={i} x={x} y={0} w={bw} h={bh} o={o} peek={visible ? seen : 0} red={visible && seen > 0.5} />;
      })}
      {group === 0 && (
        <>
          <rect x={RX + msX(EVENT)} y={-8} width={(msX(next) - msX(EVENT)) * wait} height={bh + 16} fill={C.red} opacity={0.28} />
        </>
      )}
      {group > 0 && [0, 1, 2].map((g) => (
        <line key={g} x1={RX + msX(g * 4 * period) + 8} x2={RX + msX((g + 1) * 4 * period) - 8} y1={bh + 24} y2={bh + 24} stroke={C.red} strokeWidth={7} opacity={group} />
      ))}
    </svg>
  );
};

const Frames: React.FC = () => {
  const f = useCurrentFrame();
  const waitFrom = T.w('frame4', 'auf');
  const avg = rise(f, T.s('frame5'), 10);
  const lead = rise(f, T.w('frame6', 'Gut'), 8);
  const group = rise(f, FPS_GROUP, 8);
  const row60blur = 7 * Math.max(rise(f, T.s('frame3') - 4, 8) * (1 - rise(f, T.s('frame4'), 10)), group);
  const line = rise(f, waitFrom - 6, 6) * (1 - group);
  return (
    <>
      <div style={{...soft(row60blur), opacity: 1 - 0.6 * group}}>
        <Txt x={RX} y={ROW60 - 80} size={36} weight={800} color={C.teal} spacing={4}>60 HZ · DU</Txt>
        <Txt x={RX + 360} y={ROW60 - 92} size={52} color={C.orange} style={{opacity: rise(f, T.w('frame2', '16'), 8)}}>
          ein Bild alle {de(1000 / 60)} ms
        </Txt>
        <FrameRow y={ROW60} hz={60} />
        <Txt x={RX} y={ROW60 + 340} size={38} weight={700} color={C.muted} style={{opacity: avg * (1 - group)}}>
          Ø WARTEN <span style={{color: C.text, fontSize: 60, marginLeft: 12}}>8,3</span> ms
        </Txt>
      </div>
      <Txt x={RX} y={ROW240 - 80} size={36} weight={800} color={C.red} spacing={4} style={{opacity: rise(f, T.s('frame3') - 6, 8)}}>240 HZ · ER</Txt>
      <Txt x={RX + 380} y={ROW240 - 92} size={52} color={C.orange} style={{opacity: rise(f, T.w('frame3', '4'), 8) * (1 - group)}}>
        ein Bild alle {de(1000 / 240)} ms
      </Txt>
      <FrameRow y={ROW240} hz={240} />
      <Txt x={RX} y={ROW240 + 110} size={38} weight={700} color={C.muted} style={{opacity: avg * (1 - group)}}>
        Ø WARTEN <span style={{color: C.text, fontSize: 60, marginLeft: 12}}>2,1</span> ms
      </Txt>
      <svg width={ROW_W + 400} height={900} style={{position: 'absolute', left: 0, top: ROW60 - 70, overflow: 'visible', opacity: line}}>
        <line x1={RX + msX(EVENT)} x2={RX + msX(EVENT)} y1={0} y2={ROW240 - ROW60 + 160} stroke={C.red} strokeWidth={6} />
      </svg>
      <Txt x={RX + msX(EVENT) + 18} y={ROW60 - 150} size={34} weight={800} color={C.red} spacing={3} style={{opacity: line}}>GEGNER TAUCHT AUF</Txt>
      <Pill x={RX + ROW_W / 2} y={1235} color={C.orange} show={lead * (1 - group)} filled size={54}>≈ 6 ms VORSPRUNG FÜR IHN</Pill>
      <Txt x={RX + ROW_W / 2} y={ROW240 + 140} size={64} align="center" color={C.red} style={{opacity: group, width: undefined, marginLeft: 0, left: RX + ROW_W / 2, transform: 'translateX(-50%)'}}>
        4× DASSELBE BILD
      </Txt>
    </>
  );
};

const Reaction: React.FC = () => {
  const f = useCurrentFrame();
  const p = signalP(f);
  const [dx, dy] = signalAt(p);
  const think = rise(f, T.w('react1', 'denken'), 8) * (1 - rise(f, CLICK + 10, 12));
  const click = f >= CLICK ? Math.min(1, (f - CLICK) / 14) : 0;
  const count = tween(f, T.s('react1b'), T.s('react1b') + 36, 0, 200);
  const ring = rise(f, T.s('react1b') - 4, 10);
  const slice = rise(f, T.s('react2'), 10);
  const pct = rise(f, T.w('react2', '3'), 10);
  const R = 150;
  const circ = 2 * Math.PI * R;
  const label = (text: string, x: number, y: number, word: string, color = C.text) => (
    <Txt x={x} y={y} size={40} weight={800} color={color} spacing={3} style={{opacity: rise(f, T.w('react1', word), 6), transform: 'translateX(-50%)'}}>{text}</Txt>
  );
  return (
    <>
      <SideView think={think} click={click} />
      <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
        {p > 0 && p < 1 && <circle cx={dx} cy={dy} r={16} fill={C.orange} style={{filter: `drop-shadow(0 0 12px ${C.orange})`}} />}
        <g transform={`translate(300 1250) rotate(-90)`} opacity={ring}>
          <circle r={R} fill="none" stroke={C.border} strokeWidth={26} />
          <circle r={R} fill="none" stroke={C.orange} strokeWidth={26} strokeDasharray={`${(circ * count) / 200} ${circ}`} />
          <circle r={R} fill="none" stroke={C.red} strokeWidth={30} strokeDasharray={`${circ * 0.03125} ${circ}`} opacity={slice} />
        </g>
      </svg>
      {label('SEHEN', 780, 470, 'Sehen')}
      {label('DENKEN', 560, 300, 'denken', C.orange)}
      {label('KLICKEN', 880, 1080, 'klicken')}
      <Txt x={300} y={1215} size={64} align="center" style={{opacity: ring, left: 300, width: undefined, marginLeft: 0, transform: 'translateX(-50%)'}}>
        {Math.round(count)}<span style={{fontSize: 32, color: C.muted}}> ms</span>
      </Txt>
      <Txt x={260} y={1040} size={34} weight={800} color={C.red} spacing={2} style={{opacity: slice}}>6 ms</Txt>
      <Txt x={720} y={1150} size={170} align="center" color={C.red} style={{opacity: pct, left: 720, width: undefined, marginLeft: 0, transform: `translateX(-50%) scale(${1.6 - 0.6 * pct})`, textShadow: glow(`${C.red}55`, 20)}}>
        3 %
      </Txt>
    </>
  );
};

// ---------------------------------------------------------------------------------------

const Question: React.FC = () => {
  const f = useCurrentFrame();
  const show = rise(f, T.s('hook3'), 8) * (1 - rise(f, T.s('frame1') - 14, 6));
  const b = rise(f, T.s('hook3', 0.25), 8);
  const cdFrom = T.s('hook4');
  const cdLen = T.s('frame1') - cdFrom;
  const cd = f < cdFrom ? 3 : Math.max(1, 3 - Math.floor(((f - cdFrom) / cdLen) * 3));
  if (show <= 0) return null;
  return (
    <div style={{position: 'absolute', left: 0, top: 760, width: W, opacity: show}}>
      <Txt x={W / 2} y={0} size={76} align="center" style={{transform: `scale(${1.15 - 0.15 * show})`, textShadow: '0 4px 30px #000'}}>
        WER SIEHT IHN ZUERST?
      </Txt>
      <Pill x={W / 2 - 210} y={120} color={C.teal} show={b} size={46} filled>DU</Pill>
      <Pill x={W / 2 + 210} y={120} color={C.red} show={b} size={46} filled>ER</Pill>
      <div
        style={{
          position: 'absolute', left: W / 2 - 44, top: 122, width: 88, height: 88, borderRadius: 99, opacity: b,
          background: 'rgba(8,16,26,0.8)', border: `3px solid ${C.text}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Txt x={0} y={0} size={46} style={{position: 'static'}}>{cd}</Txt>
      </div>
    </div>
  );
};

const Badge: React.FC<{text: string; show: number; color?: string}> = ({text, show, color = C.text}) => (
  <div
    style={{
      position: 'absolute', left: 90, top: 345, opacity: show, transform: `translateX(${(1 - show) * -30}px)`,
      padding: '10px 20px', borderRadius: 14, background: 'rgba(8,16,26,0.75)', border: `2px solid ${C.border}`,
      fontFamily, fontWeight: 800, fontSize: 28, letterSpacing: 4, color,
    }}
  >
    {text}
  </div>
);

export const Hz240: React.FC = () => {
  const f = useCurrentFrame();
  const hudYou = rise(f, T.s('frame1'), 10);
  const hudThem = hudYou;
  const hudOut = 1 - rise(f, T.s('end1') - 8, 12);
  const pause = rise(f, T.s('frame1'), 6) * (1 - rise(f, T.s('react1') - 8, 8));
  const slow = rise(f, RUN, 8) * (1 - rise(f, T.s('fps1') - 8, 8));
  return (
    <AbsoluteFill>
      <Backdrop cam={cam.at(f)} />
      <Audio src={staticFile('hz240/voice.wav')} />
      <World track={cam}>
        <Place at={O.ext}><Ext /></Place>
        <Place at={O.duo}><Duo /></Place>
        <Place at={O.roomDU}><GamerRoom hz={60} /></Place>
        <Place at={O.screens}><Screens /></Place>
        <Place at={O.frames}><Frames /></Place>
        <Place at={O.react}><Reaction /></Place>
      </World>
      <HudTile x={90} y={150} w={420} label="DU" value="60" unit="Hz" color={C.teal} show={hudYou * hudOut} />
      <HudTile x={570} y={150} w={420} label="ER" value="240" unit="Hz" color={C.red} show={hudThem * hudOut} />
      <Badge text="❚❚ PAUSE" show={pause} />
      <Badge text={`ZEITLUPE ×${SLOWMO}`} show={slow} color={C.muted} />
      <Question />
      <Captions timing={T.timing} y={f < T.s('hook3') ? 890 : f < T.s('frame1') ? 1240 : 1430} />
      <Handle text="scrimpass.com" />
    </AbsoluteFill>
  );
};

