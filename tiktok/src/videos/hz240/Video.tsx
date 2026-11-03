import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import {Backdrop, Captions, Handle, HudTile, Pill, Scene, Txt} from '../../components/Kit';
import {C, fontFamily, glow, W} from '../../lib/theme';
import {de, makeTiming, rise, tween} from '../../lib/timing';
import timingJson from './timing.json';

const T = makeTiming(timingJson);
export const DURATION = T.total;

// content column
const X0 = 120;
const X1 = 960;
const CW = X1 - X0;

const Enemy: React.FC<{x: number; y: number; s?: number; o?: number}> = ({x, y, s = 1, o = 1}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} opacity={o} style={{filter: `drop-shadow(0 0 10px ${C.red})`}}>
    <circle cx={0} cy={-46} r={20} fill={C.red} />
    <rect x={-26} y={-22} width={52} height={70} rx={20} fill={C.red} />
  </g>
);

const Crosshair: React.FC<{x: number; y: number; o?: number}> = ({x, y, o = 1}) => (
  <g transform={`translate(${x} ${y})`} opacity={o} stroke="#fff" strokeWidth={4} fill="none">
    <circle r={38} />
    <line x1={-56} x2={-22} y1={0} y2={0} />
    <line x1={22} x2={56} y1={0} y2={0} />
    <line y1={-56} y2={-22} x1={0} x2={0} />
    <line y1={22} y2={56} x1={0} x2={0} />
  </g>
);

const Panel: React.FC<{y: number; h: number; label: string; right?: string; rightColor?: string; rightShow?: number; show?: number; children?: React.ReactNode}> = ({
  y, h, label, right, rightColor = C.orange, rightShow = 1, show = 1, children,
}) => (
  <div style={{position: 'absolute', left: X0, top: y, width: CW, height: h, opacity: show}}>
    <div style={{position: 'absolute', inset: 0, borderRadius: 28, background: C.panel, border: `2px solid ${C.border}`}} />
    <Txt x={28} y={22} size={30} weight={700} color={C.muted} spacing={4}>{label}</Txt>
    {right && (
      <div style={{position: 'absolute', right: 28, top: 18, fontFamily, fontSize: 38, fontWeight: 800, color: rightColor, opacity: rightShow, fontVariantNumeric: 'tabular-nums'}}>
        {right}
      </div>
    )}
    <svg width={CW} height={h} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>{children}</svg>
  </div>
);

// --- 1. hook: who sees the enemy first? -------------------------------------------------
const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const appear = rise(f, T.w('hook1', 'taucht'), 8);
  const q = rise(f, T.s('hook3'), 10);
  const b = rise(f, T.s('hook3', 0.3), 10);
  const cdFrom = T.s('hook4');
  const cdLen = T.s('frame1') - cdFrom;
  const cd = f < cdFrom ? 3 : Math.max(1, 3 - Math.floor(((f - cdFrom) / cdLen) * 3));
  const monitor = (y: number, label: string) => (
    <Panel y={y} h={330} label={label} show={rise(f, 0, 12)}>
      <line x1={40} x2={CW - 40} y1={250} y2={250} stroke={C.border} strokeWidth={3} />
      <Enemy x={CW / 2} y={225} s={0.6 + 0.4 * appear} o={appear} />
    </Panel>
  );
  return (
    <Scene from={0} to={T.s('frame1') - 6}>
      {monitor(470, '60 HZ · DU')}
      {monitor(860, '240 HZ · ER')}
      <Txt x={W / 2} y={1220} size={66} align="center" style={{opacity: q, transform: `scale(${0.9 + 0.1 * q})`}}>
        WER SIEHT IHN ZUERST?
      </Txt>
      <Pill x={W / 2 - 200} y={1310} color={C.teal} show={b}>DU</Pill>
      <Pill x={W / 2 + 200} y={1310} color={C.red} show={b}>ER</Pill>
      <div
        style={{
          position: 'absolute', left: W / 2 - 38, top: 1312, width: 76, height: 76, borderRadius: 99, opacity: b,
          border: `3px solid ${C.muted}`, color: C.text, fontSize: 40, fontWeight: 800, display: 'flex',
          alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit',
        }}
      >
        <Txt x={0} y={0} size={40} style={{position: 'static'}}>{cd}</Txt>
      </div>
    </Scene>
  );
};

// --- 2. frames on a timeline ------------------------------------------------------------
const msX = (ms: number) => (ms / 50) * CW; // timeline shows 0..50 ms
const EVENT = 21; // ms, enemy appears here

const FrameRow: React.FC<{y: number; hz: number; label: string; show: number; waitFrom: number; avg: string; avgShow: number}> = ({
  y, hz, label, show, waitFrom, avg, avgShow,
}) => {
  const f = useCurrentFrame();
  const period = 1000 / hz;
  const n = Math.round(50 / period);
  const next = Math.ceil(EVENT / period) * period;
  const wait = rise(f, waitFrom, 22);
  const seen = rise(f, waitFrom + 22, 6);
  return (
    <>
      <Panel y={y} h={270} label={label} right={`BILDZEIT ${de(period)} ms`} rightShow={show} show={1}>
        {Array.from({length: n}, (_, i) => {
          const o = rise(f, T.s(hz === 60 ? 'frame1' : 'frame3') + i * (hz === 60 ? 6 : 2), 8);
          const x = msX(i * period);
          const visible = i * period >= next - 0.01;
          return (
            <g key={i} opacity={o}>
              <rect x={x + 4} y={100} width={msX(period) - 8} height={120} rx={10}
                fill={visible && seen > 0 ? `${C.red}33` : `${C.orange}22`} stroke={C.orange} strokeOpacity={0.6} strokeWidth={2} />
              {i * period >= next - 0.01 && i * period < next + 0.01 && <Enemy x={x + msX(period) / 2} y={175} s={0.5} o={seen} />}
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
    </>
  );
};

const Frames: React.FC = () => {
  const f = useCurrentFrame();
  const waitFrom = T.w('frame4', 'auf');
  const avg = rise(f, T.s('frame5'), 10);
  const lead = rise(f, T.w('frame6', 'Gut'), 10);
  return (
    <Scene from={T.s('frame1')} to={T.s('react1') - 6}>
      <Txt x={X0 + msX(EVENT)} y={500} size={30} weight={800} color={C.red} spacing={3} style={{opacity: rise(f, waitFrom - 6, 6), transform: 'translateX(-50%)'}}>
        GEGNER
      </Txt>
      <div style={{opacity: rise(f, T.s('frame1'), 10)}}>
        <FrameRow y={560} hz={60} label="60 HZ · DU" show={rise(f, T.w('frame2', '16'), 8)} waitFrom={waitFrom} avg="8,3" avgShow={avg} />
      </div>
      <div style={{opacity: rise(f, T.s('frame3'), 10)}}>
        <FrameRow y={930} hz={240} label="240 HZ · ER" show={rise(f, T.w('frame3', '4'), 8)} waitFrom={waitFrom} avg="2,1" avgShow={avg} />
      </div>
      <Pill x={W / 2} y={1300} color={C.orange} show={lead} filled size={44}>≈ 6 ms VORSPRUNG FÜR IHN</Pill>
    </Scene>
  );
};

// --- 3. 6 ms against your reaction time -------------------------------------------------
const React_: React.FC = () => {
  const f = useCurrentFrame();
  const grow = rise(f, T.w('react1', 'Reaktion'), 24);
  const slice = rise(f, T.s('react2'), 10);
  const pct = rise(f, T.w('react2', '3'), 10);
  const sliceW = (6.25 / 200) * CW;
  return (
    <Scene from={T.s('react1')} to={T.s('motion1') - 6}>
      <Txt x={X0} y={600} size={32} weight={700} color={C.muted} spacing={4} style={{opacity: grow}}>DEINE REAKTION</Txt>
      <Txt x={X1} y={588} size={52} align="right" color={C.orange} style={{opacity: grow}}>
        ≈ {Math.round(200 * grow)} <span style={{fontSize: 32, color: C.muted}}>ms</span>
      </Txt>
      <div style={{position: 'absolute', left: X0, top: 670, width: CW * grow, height: 96, borderRadius: 16, background: C.orange, boxShadow: glow(`${C.orange}66`, 18)}} />
      <div style={{position: 'absolute', left: X0, top: 670, width: sliceW, height: 96, borderRadius: '16px 0 0 16px', background: C.red, opacity: slice}} />
      <svg width={W} height={400} style={{position: 'absolute', left: 0, top: 760, opacity: slice}}>
        <line x1={X0 + sliceW / 2} x2={X0 + sliceW / 2} y1={10} y2={110} stroke={C.red} strokeWidth={4} />
      </svg>
      <Txt x={X0} y={880} size={34} weight={700} color={C.red} spacing={3} style={{opacity: slice}}>6 ms VORSPRUNG</Txt>
      <Txt x={W / 2} y={1020} size={190} align="center" color={C.red} style={{opacity: pct, transform: `scale(${0.8 + 0.2 * pct})`, textShadow: glow(`${C.red}55`, 20)}}>
        3 %
      </Txt>
    </Scene>
  );
};

// --- 4. motion: 17 px vs 4 px per frame -------------------------------------------------
const SLOWMO = 40;
const ZOOM = 6;
const SPEED = 1000; // game px / s

const Lane: React.FC<{y: number; hz: number; label: string; right: string; rightShow: number; start: number; cross: number}> = ({
  y, hz, label, right, rightShow, start, cross,
}) => {
  const f = useCurrentFrame();
  const span = CW - 120;
  const gameT = Math.max(0, f - start) / 30 / SLOWMO;
  const xAt = (t: number) => (SPEED * (Math.floor(t * hz) / hz) * ZOOM);
  const wrap = (x: number) => 60 + (x % span);
  const shown = xAt(gameT);
  const trail = Array.from({length: 6}, (_, k) => xAt(gameT - (k + 1) / hz)).filter((x) => x >= 0 && wrap(x) <= wrap(shown));
  // crosshair follows what is on screen, a little behind
  const samples = Array.from({length: 12}, (_, k) => xAt(Math.max(0, gameT - 0.00125 * (k + 4))));
  const aim = samples.reduce((a, b) => a + b, 0) / samples.length;
  const o = rise(f, start, 8);
  return (
    <Panel y={y} h={300} label={label} right={right} rightShow={rightShow}>
      <line x1={60} x2={CW - 60} y1={240} y2={240} stroke={C.border} strokeWidth={3} />
      {trail.map((x, k) => <Enemy key={k} x={wrap(x)} y={215} s={0.7} o={o * (0.35 - k * 0.055)} />)}
      <Enemy x={wrap(shown)} y={215} s={0.7} o={o} />
      {cross > 0 && wrap(aim) <= wrap(shown) + 1 && <Crosshair x={wrap(aim)} y={185} o={cross} />}
    </Panel>
  );
};

const Motion: React.FC = () => {
  const f = useCurrentFrame();
  const start = T.s('motion2');
  const cross = rise(f, T.w('motion5', 'Fadenkreuz'), 8);
  return (
    <Scene from={T.s('motion1')} to={T.s('fps1') - 6}>
      <Txt x={W / 2} y={440} size={28} weight={700} align="center" color={C.muted} spacing={4} style={{opacity: rise(f, start, 8)}}>
        ZEITLUPE ×{SLOWMO} · ZOOM ×{ZOOM} · {SPEED} PX/S
      </Txt>
      <Lane y={520} hz={60} label="60 HZ · DU" right="17 px / Bild" rightShow={rise(f, T.w('motion3', '17'), 8)} start={start} cross={cross} />
      <Lane y={900} hz={240} label="240 HZ · ER" right="4 px / Bild" rightShow={rise(f, T.w('motion4', '4'), 8)} start={start} cross={cross} />
    </Scene>
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
    <Scene from={T.s('fps1')} to={T.s('end1') - 6}>
      <Txt x={W / 2} y={470} size={32} weight={700} align="center" color={C.muted} spacing={4}>DEIN SPIEL</Txt>
      <Txt x={W / 2} y={520} size={150} align="center" color={low ? C.red : C.orange} style={{transform: `scale(${low ? 0.9 + 0.1 * sw : 1})`}}>
        {low ? 60 : 240} <span style={{fontSize: 60, color: C.muted}}>FPS</span>
      </Txt>
      <Txt x={X0} y={780} size={30} weight={700} color={C.muted} spacing={4}>MONITOR · 240 HZ</Txt>
      <svg width={W} height={400} style={{position: 'absolute', left: 0, top: 830}}>
        {Array.from({length: n}, (_, i) => {
          const o = rise(f, T.s('fps1') + i * 2, 8);
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
    </Scene>
  );
};

// --- 6. verdict ---------------------------------------------------------------------------
const End: React.FC = () => {
  const f = useCurrentFrame();
  const q = rise(f, T.s('end1'), 10);
  const strike = rise(f, T.s('end2'), 10);
  const yes = rise(f, T.s('end3'), 12);
  return (
    <Scene from={T.s('end1')} to={T.total + 20}>
      <Txt x={W / 2} y={600} size={124} align="center" style={{opacity: q * (1 - 0.5 * yes)}}>SCHNELLER?</Txt>
      <div style={{position: 'absolute', left: 150, top: 660, height: 12, width: 780 * strike, background: C.red, borderRadius: 6, opacity: 1 - 0.5 * yes}} />
      <Pill x={W / 2} y={790} color={C.red} show={strike} size={48}>KAUM</Pill>
      <Txt x={W / 2} y={1010} size={176} align="center" color={C.orange}
        style={{opacity: yes, transform: `scale(${0.8 + 0.2 * yes})`, textShadow: glow(`${C.orange}88`, 26)}}>
        GENAUER.
      </Txt>
    </Scene>
  );
};

export const Hz240: React.FC = () => {
  const f = useCurrentFrame();
  const hudYou = rise(f, T.w('hook2', 'Du'), 10);
  const hudThem = rise(f, T.w('hook2', 'Er'), 10);
  const hudOut = 1 - rise(f, T.s('end1'), 12);
  return (
    <AbsoluteFill>
      <Backdrop />
      <Audio src={staticFile('hz240/voice.wav')} />
      <HudTile x={90} y={150} w={420} label="DU" value="60" unit="Hz" color={C.teal} show={hudYou * hudOut} />
      <HudTile x={570} y={150} w={420} label="ER" value="240" unit="Hz" color={C.red} show={hudThem * hudOut} />
      <Hook />
      <Frames />
      <React_ />
      <Motion />
      <Fps />
      <End />
      <Captions timing={T.timing} />
      <Handle text="scrimpass.com" />
    </AbsoluteFill>
  );
};
