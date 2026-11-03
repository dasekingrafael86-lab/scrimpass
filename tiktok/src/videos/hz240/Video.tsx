import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import {Backdrop, Captions, Handle, HudTile, Pill, Txt} from '../../components/Kit';
import {Cam, Place, Track, World, soft} from '../../lib/camera';
import {C, fontFamily, glow, W} from '../../lib/theme';
import {de, makeTiming, rise, tween} from '../../lib/timing';
import timingJson from './timing.json';

const T = makeTiming(timingJson);
export const DURATION = T.total;

// content column inside a scene
const X0 = 120;
const X1 = 960;
const CW = X1 - X0;

// every scene sits at its own spot in one world; the camera travels between them
const O = {
  hook: [0, 0],
  frames: [0, 2000],
  react: [1500, 2000],
  motion: [1500, 5500], // far enough below that the wide shot shows nothing of the scenes above
  fps: [4500, 5500],
  end: [4500, 7500],
} satisfies Record<string, [number, number]>;
type SceneId = keyof typeof O;
const at = (s: SceneId, x: number, y: number, z = 1, r = 0): Cam => ({x: O[s][0] + x, y: O[s][1] + y, z, r});

// ---------------------------------------------------------------------------------------
// subjects the camera follows

// hook: the enemy sprints in and stops in the middle of the monitor
const ENTER = T.w('hook1', 'taucht');
const hookEnemyX = (f: number) => tween(f, 0, ENTER, -60, CW / 2);

// motion: enemy running across a long lane, shown only at the monitor's refresh steps
const SLOWMO = 40;
const ZOOM = 6;
const SPEED = 1000; // game px / s
const LANE_W = 2400;
const RUN = T.s('motion2');
const REWIND = T.w('motion4', 'Bei'); // 60 Hz run is rewound, then the 240 Hz run starts
const RUN240 = REWIND + 14;
const laneX = (hz: number, f: number, start: number) => {
  const gameT = Math.max(0, f - start) / 30 / SLOWMO;
  return SPEED * (Math.floor(gameT * hz) / hz) * ZOOM;
};
const run60 = (f: number) => {
  if (f < REWIND) return laneX(60, f, RUN);
  return laneX(60, REWIND, RUN) * (1 - rise(f, REWIND, 12)); // rewind back to the start
};
const run240 = (f: number) => (f < RUN240 ? 0 : laneX(240, f, RUN240));
const aim = (fn: (f: number) => number, f: number) => {
  // crosshair: follows what is on screen, a little behind
  const s = Array.from({length: 10}, (_, k) => fn(f - 4 - k * 2));
  return s.reduce((a, b) => a + b, 0) / s.length;
};
const LANE60_Y = 560;
const LANE240_Y = 960;
const ENEMY_Y = 215;

// react: the reaction bar grows and the camera rides its tip
const BAR_FROM = T.w('react1', 'Reaktion');
const barGrow = (f: number) => rise(f, BAR_FROM, 42);

// ---------------------------------------------------------------------------------------
// camera script

const cam = new Track()
  // hook: tight on the running enemy, then the two monitors, then the question
  .cut(0, at('hook', X0 + hookEnemyX(0), 470 + 200, 3.0, -4))
  .follow(0, ENTER + 12, (f) => at('hook', X0 + hookEnemyX(f), 470 + 200, tween(f, 0, ENTER, 3.0, 2.4), tween(f, 0, ENTER, -4, 0)), 1)
  .shake(ENTER, 1)
  .to(ENTER + 2, 14, at('hook', X0 + CW / 2, 470 + 200, 2.2))
  .to(T.s('hook2'), 14, at('hook', 420, 620, 1.75))
  .to(T.w('hook2', 'Er') - 3, 9, at('hook', 420, 1010, 1.75), 'whip')
  .to(T.s('hook3'), 16, at('hook', 540, 960, 0.98), 'snap')
  .to(T.s('hook4'), T.s('frame1') - T.s('hook4') - 12, at('hook', 540, 1120, 1.14), 'linear')
  // whip down into the first frame of the 60 Hz timeline
  .to(T.s('frame1') - 10, 14, at('frames', X0 + 140, 720, 2.6, 2), 'whip')
  .to(T.w('frame1', 'einzelne'), 34, at('frames', 540, 720, 1.25, 0))
  .to(T.s('frame2'), 70, at('frames', 700, 700, 1.4), 'linear')
  .to(T.s('frame3') - 4, 12, at('frames', 540, 1090, 1.4), 'whip')
  // PAUSE: close on the moment the enemy appears
  .to(T.s('frame4'), 18, at('frames', X0 + 350, 905, 1.3))
  .to(T.s('frame4') + 20, T.s('frame5') - T.s('frame4') - 24, at('frames', X0 + 430, 905, 1.75), 'linear')
  .to(T.s('frame5'), 16, at('frames', 540, 1010, 0.95), 'snap')
  .to(T.w('frame6', 'Gut') - 2, 10, at('frames', 540, 1335, 1.5), 'snap')
  .shake(T.w('frame6', 'Gut') + 6, 0.7)
  // whip right onto the start of the reaction bar, then ride its tip
  .to(T.s('react1') - 8, 12, at('react', X0 + 60, 720, 2.6, 2), 'whip')
  .follow(BAR_FROM, T.s('react2'), (f) => at('react', X0 + CW * barGrow(f) - 80, 710, tween(f, BAR_FROM, BAR_FROM + 42, 2.6, 1.6)), 6)
  .to(T.s('react2') - 4, 10, at('react', X0 + 60, 790, 3.0), 'whip')
  .to(T.w('react2', '3') - 2, 12, at('react', 540, 950, 1.0), 'snap')
  .shake(T.w('react2', '3') + 6, 1)
  // tilt down onto the lanes
  .to(T.s('motion1') - 8, 14, at('motion', 540, 900, 0.85, -5), 'whip')
  .to(T.s('motion1') + 6, 50, at('motion', 640, 860, 1.0, 0))
  .follow(RUN, REWIND + 6, (f) => at('motion', X0 + 80 + run60(f) + 90, LANE60_Y + 170, 1.7), 14)
  .follow(REWIND + 6, T.s('motion5') + 4, (f) => at('motion', X0 + 80 + run240(f) + 90, LANE240_Y + 170, 1.7), 10)
  // the wide reveal: both lanes over their whole length
  .to(T.s('motion5'), 30, at('motion', X0 + LANE_W / 2, 910, 0.42))
  .follow(T.w('motion5', 'Fadenkreuz') - 4, T.s('fps1') - 6, (f) => at('motion', X0 + 80 + aim(run60, f), LANE60_Y + 180, 1.55), 16)
  // whip to the FPS counter, close, then pull back to the frame row
  .to(T.s('fps1') - 8, 12, at('fps', 540, 600, 2.2, 3), 'whip')
  .to(T.s('fps1') + 10, 50, at('fps', 540, 860, 1.05, 0))
  .to(T.w('fps2', '60') - 1, 10, at('fps', 390, 960, 1.7), 'snap')
  .shake(T.w('fps2', '60') + 1, 0.9)
  .to(T.w('fps2', '60') + 12, T.s('end1') - T.w('fps2', '60') - 26, at('fps', 720, 960, 1.6), 'linear')
  // verdict
  .to(T.s('end1') - 8, 14, at('end', 540, 690, 1.15, -3), 'whip')
  .to(T.s('end1') + 8, T.s('end2') - T.s('end1') - 8, at('end', 540, 690, 1.3, 0), 'linear')
  .shake(T.s('end2'), 1)
  .to(T.s('end2'), 10, at('end', 540, 800, 1.2), 'snap')
  .to(T.s('end3') - 2, 8, at('end', 540, 1090, 1.22), 'snap')
  .shake(T.s('end3') + 4, 1.2)
  .to(T.s('end3') + 10, 60, at('end', 540, 1000, 1.0, 2), 'smooth');

// ---------------------------------------------------------------------------------------
// drawing

const Enemy: React.FC<{x: number; y: number; s?: number; o?: number; running?: boolean}> = ({x, y, s = 1, o = 1, running}) => {
  const f = useCurrentFrame();
  const bob = running ? -Math.abs(Math.sin(f / 2.2)) * 10 : 0;
  return (
    <g transform={`translate(${x} ${y + bob}) scale(${s})`} opacity={o} style={{filter: `drop-shadow(0 0 10px ${C.red})`}}>
      <circle cx={0} cy={-46} r={20} fill={C.red} />
      <rect x={-26} y={-22} width={52} height={70} rx={20} fill={C.red} />
    </g>
  );
};

const Crosshair: React.FC<{x: number; y: number; o?: number}> = ({x, y, o = 1}) => (
  <g transform={`translate(${x} ${y})`} opacity={o} stroke="#fff" strokeWidth={4} fill="none">
    <circle r={38} />
    <line x1={-56} x2={-22} y1={0} y2={0} />
    <line x1={22} x2={56} y1={0} y2={0} />
    <line y1={-56} y2={-22} x1={0} x2={0} />
    <line y1={22} y2={56} x1={0} x2={0} />
  </g>
);

const Panel: React.FC<{
  y: number; h: number; w?: number; label: string; right?: string; rightColor?: string; rightShow?: number;
  show?: number; style?: React.CSSProperties; children?: React.ReactNode;
}> = ({y, h, w = CW, label, right, rightColor = C.orange, rightShow = 1, show = 1, style, children}) => (
  <div style={{position: 'absolute', left: X0, top: y, width: w, height: h, opacity: show, ...style}}>
    <div style={{position: 'absolute', inset: 0, borderRadius: 28, background: C.panel, border: `2px solid ${C.border}`}} />
    <Txt x={28} y={22} size={30} weight={700} color={C.muted} spacing={4}>{label}</Txt>
    {right && (
      <div style={{position: 'absolute', right: 28, top: 18, fontFamily, fontSize: 38, fontWeight: 800, color: rightColor, opacity: rightShow, fontVariantNumeric: 'tabular-nums'}}>
        {right}
      </div>
    )}
    <svg width={w} height={h} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>{children}</svg>
  </div>
);

// status badge under the HUD, like PAUSE / WIEDERHOLUNG in the coin video
const Badge: React.FC<{text: string; show: number; color?: string}> = ({text, show, color = C.muted}) => (
  <div
    style={{
      position: 'absolute', left: 90, top: 345, opacity: show, transform: `translateX(${(1 - show) * -30}px)`,
      padding: '10px 20px', borderRadius: 14, background: 'rgba(8,16,26,0.7)', border: `2px solid ${C.border}`,
      fontFamily, fontWeight: 800, fontSize: 28, letterSpacing: 4, color,
    }}
  >
    {text}
  </div>
);

// --- 1. hook: who sees the enemy first? -------------------------------------------------
const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const q = rise(f, T.s('hook3'), 10);
  const b = rise(f, T.s('hook3', 0.3), 10);
  const cdFrom = T.s('hook4');
  const cdLen = T.s('frame1') - cdFrom;
  const cd = f < cdFrom ? 3 : Math.max(1, 3 - Math.floor(((f - cdFrom) / cdLen) * 3));
  const wEr = T.w('hook2', 'Er');
  // focus pull: the monitor that is not talked about goes soft
  const blurBottom = 7 * rise(f, T.s('hook2'), 8) * (1 - rise(f, wEr - 3, 8));
  const blurTop = 7 * rise(f, wEr - 3, 8) * (1 - rise(f, T.s('hook3'), 10));
  const ex = hookEnemyX(f);
  const monitor = (y: number, label: string, blur: number) => (
    <Panel y={y} h={330} label={label} style={soft(blur)}>
      <line x1={40} x2={CW - 40} y1={250} y2={250} stroke={C.border} strokeWidth={3} />
      <Enemy x={ex} y={225} running={f < ENTER} />
    </Panel>
  );
  return (
    <>
      {monitor(470, '60 HZ · DU', blurTop)}
      {monitor(860, '240 HZ · ER', blurBottom)}
      <Txt x={W / 2} y={1220} size={66} align="center" style={{opacity: q, transform: `scale(${1.4 - 0.4 * q})`}}>
        WER SIEHT IHN ZUERST?
      </Txt>
      <Pill x={W / 2 - 200} y={1310} color={C.teal} show={b}>DU</Pill>
      <Pill x={W / 2 + 200} y={1310} color={C.red} show={b}>ER</Pill>
      <div
        style={{
          position: 'absolute', left: W / 2 - 38, top: 1312, width: 76, height: 76, borderRadius: 99, opacity: b,
          border: `3px solid ${C.muted}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Txt x={0} y={0} size={40} style={{position: 'static'}}>{cd}</Txt>
      </div>
    </>
  );
};

// --- 2. frames on a timeline ------------------------------------------------------------
const msX = (ms: number) => (ms / 50) * CW; // timeline shows 0..50 ms
const EVENT = 21; // ms, enemy appears here

const FrameRow: React.FC<{y: number; hz: number; label: string; show: number; waitFrom: number; avg: string; avgShow: number; blur: number}> = ({
  y, hz, label, show, waitFrom, avg, avgShow, blur,
}) => {
  const f = useCurrentFrame();
  const period = 1000 / hz;
  const n = Math.round(50 / period);
  const next = Math.ceil(EVENT / period) * period;
  const wait = rise(f, waitFrom, 22);
  const seen = rise(f, waitFrom + 22, 6);
  return (
    <div style={soft(blur)}>
      <Panel y={y} h={270} label={label} right={`BILDZEIT ${de(period)} ms`} rightShow={show}>
        {Array.from({length: n}, (_, i) => {
          const o = rise(f, T.s(hz === 60 ? 'frame1' : 'frame3') + i * (hz === 60 ? 6 : 2), 8);
          const x = msX(i * period);
          const visible = i * period >= next - 0.01;
          return (
            <g key={i} opacity={o}>
              <rect x={x + 4} y={100} width={msX(period) - 8} height={120} rx={10}
                fill={visible && seen > 0 ? `${C.red}33` : `${C.orange}22`} stroke={C.orange} strokeOpacity={0.6} strokeWidth={2} />
              {Math.abs(i * period - next) < 0.01 && <Enemy x={x + msX(period) / 2} y={175} s={0.5} o={seen} />}
            </g>
          );
        })}
        <rect x={msX(EVENT)} y={92} width={(msX(next) - msX(EVENT)) * wait} height={136} fill={C.red} opacity={0.35} />
        <line x1={msX(EVENT)} x2={msX(EVENT)} y1={80} y2={240} stroke={C.red} strokeWidth={5} opacity={rise(f, waitFrom - 6, 6)} />
      </Panel>
      <Txt x={X0 + 28} y={y + 290} size={34} weight={700} color={C.muted} style={{opacity: avgShow}}>
        Ø WARTEN <span style={{color: C.text, fontSize: 52, marginLeft: 12}}>{avg}</span>
        <span style={{fontSize: 30, marginLeft: 8}}>ms</span>
      </Txt>
    </div>
  );
};

const Frames: React.FC = () => {
  const f = useCurrentFrame();
  const waitFrom = T.w('frame4', 'auf');
  const avg = rise(f, T.s('frame5'), 10);
  const lead = rise(f, T.w('frame6', 'Gut'), 8);
  const focus240 = rise(f, T.s('frame3') - 4, 8) * (1 - rise(f, T.s('frame4'), 10));
  const focusLead = rise(f, T.w('frame6', 'Gut') - 2, 8);
  return (
    <>
      <Txt x={X0 + msX(EVENT)} y={500} size={30} weight={800} color={C.red} spacing={3} style={{opacity: rise(f, waitFrom - 6, 6), transform: 'translateX(-50%)'}}>
        GEGNER
      </Txt>
      <div style={{opacity: rise(f, T.s('frame1') - 10, 8)}}>
        <FrameRow y={560} hz={60} label="60 HZ · DU" show={rise(f, T.w('frame2', '16'), 8)} waitFrom={waitFrom} avg="8,3" avgShow={avg} blur={6 * Math.max(focus240, focusLead)} />
      </div>
      <div style={{opacity: rise(f, T.s('frame3') - 6, 10)}}>
        <FrameRow y={930} hz={240} label="240 HZ · ER" show={rise(f, T.w('frame3', '4'), 8)} waitFrom={waitFrom} avg="2,1" avgShow={avg} blur={6 * focusLead} />
      </div>
      <Pill x={W / 2} y={1300} color={C.orange} show={lead} filled size={44}>≈ 6 ms VORSPRUNG FÜR IHN</Pill>
    </>
  );
};

// --- 3. 6 ms against your reaction time -------------------------------------------------
const Reaction: React.FC = () => {
  const f = useCurrentFrame();
  const grow = barGrow(f);
  const slice = rise(f, T.s('react2'), 10);
  const pct = rise(f, T.w('react2', '3'), 10);
  const sliceW = (6.25 / 200) * CW;
  return (
    <>
      <Txt x={X0} y={600} size={32} weight={700} color={C.muted} spacing={4} style={{opacity: rise(f, T.s('react1') - 8, 8)}}>DEINE REAKTION</Txt>
      <div style={{position: 'absolute', left: X0 + CW * grow - 10, top: 588, transform: 'translateX(-100%)', opacity: grow}}>
        <Txt x={0} y={0} size={52} color={C.orange} style={{position: 'static'}}>
          ≈ {Math.round(200 * grow)} <span style={{fontSize: 32, color: C.muted}}>ms</span>
        </Txt>
      </div>
      <div style={{position: 'absolute', left: X0, top: 670, width: Math.max(8, CW * grow), height: 96, borderRadius: 16, background: C.orange, boxShadow: glow(`${C.orange}66`, 18)}} />
      <div style={{position: 'absolute', left: X0, top: 670, width: sliceW, height: 96, borderRadius: '16px 0 0 16px', background: C.red, opacity: slice}} />
      <svg width={W} height={400} style={{position: 'absolute', left: 0, top: 760, opacity: slice}}>
        <line x1={X0 + sliceW / 2} x2={X0 + sliceW / 2} y1={10} y2={110} stroke={C.red} strokeWidth={4} />
      </svg>
      <Txt x={X0} y={880} size={34} weight={700} color={C.red} spacing={3} style={{opacity: slice}}>6 ms VORSPRUNG</Txt>
      <Txt x={W / 2} y={1020} size={190} align="center" color={C.red} style={{opacity: pct, transform: `scale(${1.6 - 0.6 * pct})`, textShadow: glow(`${C.red}55`, 20)}}>
        3 %
      </Txt>
    </>
  );
};

// --- 4. motion: 17 px vs 4 px per frame -------------------------------------------------
const Lane: React.FC<{y: number; hz: number; label: string; tag: string; tagShow: number; pos: (f: number) => number; cross: number; blur: number}> = ({
  y, hz, label, tag, tagShow, pos, cross, blur,
}) => {
  const f = useCurrentFrame();
  const base = 80;
  const shown = pos(f);
  const step = (SPEED / hz) * ZOOM;
  const trail = Array.from({length: 6}, (_, k) => shown - (k + 1) * step).filter((x) => x >= 0);
  const aimX = aim(pos, f);
  return (
    <Panel y={y} h={300} w={LANE_W} label={label} style={soft(blur)}>
      <line x1={60} x2={LANE_W - 60} y1={240} y2={240} stroke={C.border} strokeWidth={3} />
      {Array.from({length: 24}, (_, i) => (
        <line key={i} x1={base + i * 100} x2={base + i * 100} y1={240} y2={252} stroke={C.border} strokeWidth={2} />
      ))}
      {trail.map((x, k) => <Enemy key={k} x={base + x} y={ENEMY_Y} s={0.7} o={0.35 - k * 0.055} />)}
      <Enemy x={base + shown} y={ENEMY_Y} s={0.7} />
      {shown >= step && (
        <g opacity={tagShow}>
          <line x1={base + shown - step} x2={base + shown} y1={112} y2={112} stroke={C.orange} strokeWidth={4} />
          <line x1={base + shown - step} x2={base + shown - step} y1={100} y2={124} stroke={C.orange} strokeWidth={4} />
          <line x1={base + shown} x2={base + shown} y1={100} y2={124} stroke={C.orange} strokeWidth={4} />
          <text x={base + shown - step / 2} y={88} textAnchor="middle" fontFamily={fontFamily} fontWeight={800} fontSize={36} fill={C.orange}>{tag}</text>
        </g>
      )}
      {cross > 0 && <Crosshair x={base + aimX} y={ENEMY_Y - 30} o={cross} />}
    </Panel>
  );
};

const Motion: React.FC = () => {
  const f = useCurrentFrame();
  const cross = rise(f, T.w('motion5', 'Fadenkreuz') - 4, 8);
  const on240 = rise(f, REWIND + 2, 8) * (1 - rise(f, T.s('motion5'), 12));
  const on60 = rise(f, RUN, 8) * (1 - rise(f, REWIND + 2, 8));
  return (
    <div style={{opacity: rise(f, T.s('motion1') - 10, 10)}}>
      <Lane y={LANE60_Y} hz={60} label="60 HZ · DU" tag="17 px / Bild" tagShow={rise(f, T.w('motion3', '17'), 8)} pos={run60} cross={cross} blur={6 * on240} />
      <Lane y={LANE240_Y} hz={240} label="240 HZ · ER" tag="4 px" tagShow={rise(f, T.w('motion4', '4'), 8)} pos={run240} cross={cross} blur={6 * on60} />
    </div>
  );
};

// --- 5. the game has to deliver the frames ----------------------------------------------
const Fps: React.FC = () => {
  const f = useCurrentFrame();
  const low = f >= T.w('fps2', '60');
  const sw = rise(f, T.w('fps2', '60'), 8);
  const n = 12;
  const bw = CW / n;
  return (
    <>
      <Txt x={W / 2} y={470} size={32} weight={700} align="center" color={C.muted} spacing={4}>DEIN SPIEL</Txt>
      <Txt x={W / 2} y={520} size={150} align="center" color={low ? C.red : C.orange} style={{transform: `scale(${low ? 1.3 - 0.3 * sw : 1})`}}>
        {low ? 60 : 240} <span style={{fontSize: 60, color: C.muted}}>FPS</span>
      </Txt>
      <Txt x={X0} y={780} size={30} weight={700} color={C.muted} spacing={4}>MONITOR · 240 HZ</Txt>
      <svg width={W} height={400} style={{position: 'absolute', left: 0, top: 830}}>
        {Array.from({length: n}, (_, i) => {
          const o = rise(f, T.s('fps1') + 6 + i * 3, 8);
          const step = low ? Math.floor(i / 4) * 4 : i;
          const dy = 150 - (step / (n - 1)) * 110;
          return (
            <g key={i} opacity={o}>
              <rect x={X0 + i * bw + 4} y={0} width={bw - 8} height={190} rx={10} fill={`${C.orange}1c`} stroke={C.orange} strokeOpacity={0.55} strokeWidth={2} />
              <circle cx={X0 + i * bw + bw / 2} cy={dy + 10} r={12} fill={C.orange} />
            </g>
          );
        })}
        {low && [0, 1, 2].map((g) => (
          <line key={g} x1={X0 + g * 4 * bw + 8} x2={X0 + (g + 1) * 4 * bw - 8} y1={215} y2={215} stroke={C.red} strokeWidth={5} opacity={sw} />
        ))}
      </svg>
      <Txt x={W / 2} y={1080} size={44} align="center" color={C.red} style={{opacity: sw}}>4× DASSELBE BILD</Txt>
    </>
  );
};

// --- 6. verdict ---------------------------------------------------------------------------
const End: React.FC = () => {
  const f = useCurrentFrame();
  const q = rise(f, T.s('end1') - 6, 10);
  const strike = rise(f, T.s('end2'), 8);
  const yes = rise(f, T.s('end3'), 10);
  return (
    <>
      <Txt x={W / 2} y={600} size={124} align="center" style={{opacity: q * (1 - 0.5 * yes)}}>SCHNELLER?</Txt>
      <div style={{position: 'absolute', left: 150, top: 660, height: 12, width: 780 * strike, background: C.red, borderRadius: 6, opacity: 1 - 0.5 * yes}} />
      <Pill x={W / 2} y={790} color={C.red} show={strike} size={48}>KAUM</Pill>
      <Txt x={W / 2} y={1010} size={176} align="center" color={C.orange}
        style={{opacity: yes, transform: `scale(${1.5 - 0.5 * yes})`, textShadow: glow(`${C.orange}88`, 26)}}>
        GENAUER.
      </Txt>
    </>
  );
};

export const Hz240: React.FC = () => {
  const f = useCurrentFrame();
  const hudYou = rise(f, T.w('hook2', 'Du'), 10);
  const hudThem = rise(f, T.w('hook2', 'Er'), 10);
  const hudOut = 1 - rise(f, T.s('end1') - 8, 12);
  const pause = rise(f, T.s('frame4'), 8) * (1 - rise(f, T.s('react1') - 8, 8));
  const slow = rise(f, RUN, 8) * (1 - rise(f, REWIND - 2, 6)) + rise(f, RUN240, 6) * (1 - rise(f, T.s('fps1') - 8, 8));
  const rewind = rise(f, REWIND - 2, 4) * (1 - rise(f, RUN240, 6));
  return (
    <AbsoluteFill>
      <Backdrop cam={cam.at(f)} />
      <Audio src={staticFile('hz240/voice.wav')} />
      <World track={cam}>
        <Place at={O.hook}><Hook /></Place>
        <Place at={O.frames}><Frames /></Place>
        <Place at={O.react}><Reaction /></Place>
        <Place at={O.motion}><Motion /></Place>
        <Place at={O.fps}><Fps /></Place>
        <Place at={O.end}><End /></Place>
      </World>
      <HudTile x={90} y={150} w={420} label="DU" value="60" unit="Hz" color={C.teal} show={hudYou * hudOut} />
      <HudTile x={570} y={150} w={420} label="ER" value="240" unit="Hz" color={C.red} show={hudThem * hudOut} />
      <Badge text="❚❚ PAUSE" show={pause} />
      <Badge text={`ZEITLUPE ×${SLOWMO} · ZOOM ×${ZOOM}`} show={Math.min(1, slow)} />
      <Badge text="⟲ WIEDERHOLUNG" show={rewind} color={C.text} />
      <Captions timing={T.timing} />
      <Handle text="scrimpass.com" />
    </AbsoluteFill>
  );
};
