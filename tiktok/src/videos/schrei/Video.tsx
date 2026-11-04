// "Wie lange müsstest du deinen Kaffee anschreien, bis er heiß ist?" — TikTok explainer in the
// sniper style: one world, a camera that moves every 1-2 s, HUD tiles, a hook with JA/NEIN-style choice.
import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import {Backdrop, Badge, Captions, Choice, Handle, HudTile, Pill, Txt} from '../../components/Kit';
import {Cam, Place, Track, World} from '../../lib/camera';
import {C, fontFamily, glow} from '../../lib/theme';
import {de, makeTiming, rise, tween} from '../../lib/timing';
import {DAYS, MOUTH, Microwave, Mug, SIL, Shouter, Thermo, Waves, YEARS} from './art';
import timingJson from './timing.json';

const T = makeTiming(timingJson);
export const SCHREI_DURATION = T.total;

const O = {
  mug: [0, 0], // shouting at the mug
  post: [3000, 0], // the internet claim
  cup: [6000, 0], // how much energy the coffee needs
  voice: [0, 3500], // how much power a shout has
  wall: [3000, 3500], // sound bounces off water
  life: [6000, 3500], // 119 years vs. a lifetime
  micro: [3000, 7000], // the microwave
} satisfies Record<string, [number, number]>;
type SceneId = keyof typeof O;
const at = (s: SceneId, x: number, y: number, z = 1, r = 0): Cam => ({x: O[s][0] + x, y: O[s][1] + y, z, r});

const fmtInt = (n: number) => Math.round(n).toLocaleString('de-DE');

// ---------------------------------------------------------------------------------------
// camera

const cam = new Track()
  .cut(0, at('mug', 520, 990, 1.18))
  .to(0, T.s('hook2'), at('mug', 540, 960, 1.0), 'linear')
  .to(T.s('hook2'), 24, at('mug', 680, 1080, 1.18))
  .jump(T.s('claim1'), at('post', 540, 880, 0.95))
  .to(T.w('claim1', 'acht') - 4, 30, at('post', 540, 960, 1.12))
  .shake(T.s('claim2') + 4, 0.5)
  .jump(T.s('cup1'), at('cup', 540, 960, 0.95))
  .to(T.w('cup1', '20') - 4, 24, at('cup', 760, 860, 1.15))
  .to(T.s('cup2'), 24, at('cup', 540, 1180, 0.92))
  .jump(T.s('voice1'), at('voice', 380, 960, 1.35))
  .to(T.w('voice1', '90') - 6, 22, at('voice', 680, 820, 1.1))
  .to(T.w('voice1', 'hundertstel') - 6, 22, at('voice', 540, 1160, 1.15))
  .to(T.s('voice2'), 26, at('voice', 540, 1420, 1.05))
  .shake(T.w('voice2', 'Tage'), 0.5)
  .jump(T.s('wall1'), at('wall', 540, 1040, 1.5))
  .to(T.s('wall2'), 30, at('wall', 540, 900, 1.0))
  .shake(T.w('wall2', '99'), 0.4)
  .jump(T.s('wall3'), at('life', 560, 1420, 1.1))
  .to(T.s('wall3'), T.w('wall3', 'Jahre') - T.s('wall3') + 10, at('life', 600, 760, 0.95))
  .shake(T.w('wall3', 'Leben'), 0.6)
  .jump(T.s('cool1'), at('mug', 540, 960, 1.0))
  .to(T.s('cool2'), 40, at('mug', 680, 900, 1.12))
  .to(T.s('cool3'), 24, at('mug', 730, 760, 1.55))
  .to(T.s('end1'), 24, at('mug', 540, 940, 1.0))
  .shake(T.s('end2'), 0.7)
  .jump(T.s('end3'), at('micro', 540, 980, 1.15))
  .to(T.s('end3') + 2, 80, at('micro', 540, 930, 1.0), 'linear');

// ---------------------------------------------------------------------------------------
// scenes

const svg = (children: React.ReactNode) => (
  <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>{children}</svg>
);

const MugScene: React.FC = () => {
  const f = useCurrentFrame();
  const open = 0.7 + 0.3 * Math.abs(Math.sin(f * 0.35));
  const cool = rise(f, T.s('cool2'), 10) * (1 - rise(f, T.s('end1'), 10));
  const pills = cool * (1 - rise(f, T.s('cool3') - 4, 8));
  const forever = rise(f, T.s('end2'), 8);
  const temp = 20;
  return (
    <>
      {svg(
        <>
          <line x1={0} x2={1080} y1={1262} y2={1262} stroke={C.border} strokeWidth={5} />
          <Shouter x={-60} open={open} />
          <Waves f={f} x={MOUTH.x - 60} y={MOUTH.y} reach={230} />
          <Thermo x={700} y={560} h={380} t={temp} color={C.teal} />
          <Mug x={560} y={920} />
          {/* heat in vs heat out */}
          <g opacity={cool}>
            <path d="M 470 980 L 600 980" stroke={C.teal} strokeWidth={4} markerEnd="" />
            <polygon points="606,980 590,972 590,988" fill={C.teal} />
            {[0, 1, 2].map((k) => {
              const t = ((f * 1.5 + k * 30) % 90) / 90;
              const x = 620 + k * 110;
              return (
                <g key={k} opacity={(1 - t) * 0.95}>
                  <path d={`M ${x} ${900 - t * 260} q 30 -40 0 -80 q -30 -40 0 -80`} stroke={C.red} strokeWidth={22} fill="none" strokeLinecap="round" />
                </g>
              );
            })}
          </g>
        </>,
      )}
      <Txt x={700} y={470} size={54} align="center" color={C.teal} style={{opacity: 1 - rise(f, T.s('hook2') - 4, 6) * (1 - rise(f, T.s('claim1'), 6)), left: 700, width: undefined, marginLeft: 0, translate: '-50% 0'}}>{de(temp)} °C</Txt>
      <Pill x={480} y={1270} color={C.teal} show={pills} size={34}>REIN: 0,00001 W</Pill>
      <Pill x={870} y={1270} color={C.red} show={pills} size={34}>RAUS: VIEL MEHR</Pill>
      <Txt x={540} y={420} size={130} align="center" color={C.red} style={{opacity: forever, transform: `scale(${1.3 - 0.3 * forever})`, textShadow: glow(`${C.red}55`, 18)}}>
        FÜR IMMER.
      </Txt>
    </>
  );
};

const Post: React.FC = () => {
  const f = useCurrentFrame();
  const show = rise(f, T.s('claim1') - 4, 10);
  const hi = (w: string) => rise(f, T.w('claim1', w), 6);
  const stamp = rise(f, T.s('claim2'), 8);
  const num = (txt: string, w: string) => (
    <span style={{color: hi(w) > 0.5 ? C.orange : C.text, textShadow: hi(w) > 0.5 ? glow(`${C.orange}66`, 10) : undefined}}>{txt}</span>
  );
  return (
    <>
      <div style={{position: 'absolute', left: 90, top: 520, width: 900, padding: 50, borderRadius: 40, background: '#0f1c2a', border: `3px solid ${C.border}`,
        opacity: show, transform: `translateY(${(1 - show) * 40}px)`, fontFamily, color: C.text}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 24, marginBottom: 40}}>
          <div style={{width: 90, height: 90, borderRadius: 99, background: C.orange}} />
          <div>
            <div style={{fontSize: 40, fontWeight: 800}}>Fun Fact #482</div>
            <div style={{fontSize: 30, fontWeight: 600, color: C.muted}}>vor 3 Std.</div>
          </div>
        </div>
        <div style={{fontSize: 56, fontWeight: 800, lineHeight: 1.25}}>
          Wenn du {num('8 Jahre, 7 Monate', 'acht')} und {num('6 Tage', 'sechs')} schreist, hast du genug Energie, um eine Tasse Kaffee zu erhitzen. ☕
        </div>
        <div style={{marginTop: 40, fontSize: 34, fontWeight: 700, color: C.muted}}>♥ 1,2 Mio   ↻ 84.000</div>
      </div>
      <Txt x={540} y={1150} size={96} align="center" color={C.red}
        style={{opacity: stamp, transform: `rotate(-8deg) scale(${1.5 - 0.5 * stamp})`, border: `8px solid ${C.red}`, borderRadius: 24, padding: '10px 30px', width: undefined, left: 540, marginLeft: 0, translate: '-50% 0'}}>
        STIMMT DAS?
      </Txt>
    </>
  );
};

const Cup: React.FC = () => {
  const f = useCurrentFrame();
  const t = tween(f, T.w('cup1', '20'), T.w('cup1', 'Grad') + 20, 20, 60);
  const e = tween(f, T.s('cup2'), T.w('cup2', 'Joule') + 6, 0, 1);
  const ml = rise(f, T.w('cup1', '250'), 8);
  return (
    <>
      {svg(
        <>
          <Mug x={260} y={700} s={1.7} steam={rise(f, T.w('cup1', 'Grad'), 20)} f={f} />
          <Thermo x={920} y={500} h={700} t={t} />
          <rect x={120} y={1520} width={840} height={80} rx={18} fill={C.panel} stroke={C.border} strokeWidth={3} />
          <rect x={120} y={1520} width={840 * e} height={80} rx={18} fill={C.orange} />
        </>,
      )}
      <Txt x={515} y={980} size={80} align="center" color={C.text} style={{opacity: ml, left: 515, width: undefined, marginLeft: 0, translate: '-50% 0'}}>250 ml</Txt>
      <Txt x={920} y={400} size={60} align="center" color={C.red} style={{opacity: 1 - rise(f, T.s('cup2') - 6, 8), left: 920, width: undefined, marginLeft: 0, translate: '-50% 0'}}>{Math.round(t)} °C</Txt>
      <Txt x={120} y={1440} size={36} weight={800} color={C.muted} spacing={3} style={{opacity: rise(f, T.s('cup2') - 4, 8)}}>ENERGIE NÖTIG</Txt>
      <Txt x={960} y={1620} size={70} align="right" color={C.orange} style={{opacity: rise(f, T.s('cup2'), 8)}}>{e >= 1 ? '≈ 42.000' : fmtInt(Math.round((42000 * e) / 100) * 100)} J</Txt>
    </>
  );
};

const Voice: React.FC = () => {
  const f = useCurrentFrame();
  const db = tween(f, T.s('voice1'), T.w('voice1', '90') + 6, 0, 90);
  const watt = rise(f, T.w('voice1', 'hundertstel'), 8);
  const days = tween(f, T.w('voice2', 'schreist'), T.w('voice2', 'Tage') + 4, 0, DAYS);
  const cal = rise(f, T.s('voice2'), 10);
  const segs = 12;
  const meter = 1 - rise(f, T.w('voice1', 'hundertstel') - 8, 10);
  return (
    <>
      {svg(
        <>
          <Shouter x={-80} open={0.7 + 0.3 * Math.abs(Math.sin(f * 0.35))} />
          <Waves f={f} x={MOUTH.x - 80} y={MOUTH.y} reach={260} />
          {Array.from({length: segs}, (_, i) => {
            const on = db >= ((i + 1) / segs) * 90 - 0.01;
            const col = i < 7 ? C.teal : i < 10 ? C.orange : C.red;
            return <rect key={i} opacity={meter} x={780} y={1080 - i * 50} width={150} height={38} rx={8} fill={on ? col : C.panel} stroke={C.border} strokeWidth={2} />;
          })}
          {/* calendar */}
          <g opacity={cal}>
            <rect x={340} y={1560} width={400} height={300} rx={30} fill="#f2f2f2" />
            <rect x={340} y={1560} width={400} height={80} rx={30} fill={C.red} />
            <rect x={340} y={1600} width={400} height={40} fill={C.red} />
          </g>
        </>,
      )}
      <Txt x={855} y={450} size={60} align="center" color={db > 80 ? C.red : C.text} style={{opacity: meter, left: 855, width: undefined, marginLeft: 0, translate: '-50% 0'}}>{Math.round(db)} dB</Txt>
      <Txt x={540} y={1240} size={120} align="center" color={C.orange} style={{opacity: watt, transform: `scale(${1.2 - 0.2 * watt})`, textShadow: glow(`${C.orange}55`, 16)}}>
        0,01 W
      </Txt>
      <Txt x={540} y={1660} size={130} align="center" color={SIL} style={{opacity: cal}}>{Math.round(days)}</Txt>
      <Txt x={540} y={1800} size={36} weight={800} align="center" color="#555" spacing={4} style={{opacity: cal}}>TAGE</Txt>
    </>
  );
};

const Wall: React.FC = () => {
  const f = useCurrentFrame();
  const SURF = 1050;
  const back = rise(f, T.w('wall2', '99'), 8);
  const inside = rise(f, T.w('wall2', 'zurück'), 8);
  return (
    <>
      {svg(
        <>
          <defs>
            <linearGradient id="sr-coffee" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#6b4426" />
              <stop offset="1" stopColor="#1e120a" />
            </linearGradient>
          </defs>
          <rect x={-400} y={SURF} width={1880} height={1400} fill="url(#sr-coffee)" />
          <path d={`M -400 ${SURF} ${Array.from({length: 40}, (_, i) => `Q ${-400 + i * 47 + 23} ${SURF + 8 * Math.sin(f * 0.15 + i)} ${-400 + (i + 1) * 47} ${SURF}`).join(' ')}`}
            stroke="#8a5a34" strokeWidth={8} fill="none" />
          {Array.from({length: 36}, (_, i) => {
            const cyc = 56;
            const t = ((f + i * 7) % cyc) / cyc;
            const x0 = -200 + ((i * 97) % 1400);
            const through = i % 18 === 0;
            const down = t < 0.5;
            const p = down ? t / 0.5 : (t - 0.5) / 0.5;
            const x = x0 + (down ? p : 1 + p) * 160;
            const y = down ? 300 + p * (SURF - 300) : through ? SURF + p * 500 : SURF - p * (SURF - 300);
            const col = through && !down ? C.orange : C.teal;
            return <circle key={i} cx={x} cy={y} r={through && !down ? 16 : 12} fill={col} opacity={through && !down ? 1 : 0.85} style={through && !down ? {filter: `drop-shadow(0 0 10px ${C.orange})`} : undefined} />;
          })}
        </>,
      )}
      <Txt x={540} y={520} size={110} align="center" color={C.teal} style={{opacity: back, textShadow: glow(`${C.teal}55`, 16)}}>99,9 %</Txt>
      <Txt x={540} y={650} size={44} weight={800} align="center" color={C.muted} spacing={4} style={{opacity: back}}>PRALLT AB</Txt>
      <Txt x={540} y={1250} size={80} align="center" color={C.orange} style={{opacity: inside}}>0,1 % REIN</Txt>
    </>
  );
};

const Life: React.FC = () => {
  const f = useCurrentFrame();
  const Y0 = 1650;
  const PX = 10; // px per year
  const grow = tween(f, T.s('wall3'), T.w('wall3', 'Jahre') + 6, 0, YEARS);
  const life = rise(f, T.w('wall3', 'Länger') - 4, 10);
  const bars = [
    {x: 380, years: 8.6, label: 'INTERNET', color: C.muted, o: 1},
    {x: 600, years: 80, label: 'DEIN LEBEN', color: C.teal, o: life},
    {x: 820, years: grow, label: 'SCHREIEN', color: C.red, o: 1},
  ];
  return (
    <>
      {svg(
        <>
          <line x1={240} x2={240} y1={Y0} y2={Y0 - 130 * PX} stroke={C.muted} strokeWidth={3} />
          <line x1={240} x2={960} y1={Y0} y2={Y0} stroke={C.muted} strokeWidth={3} />
          {[20, 40, 60, 80, 100, 120].map((y) => (
            <g key={y}>
              <line x1={240} x2={960} y1={Y0 - y * PX} y2={Y0 - y * PX} stroke={C.border} strokeWidth={2} />
              <text x={220} y={Y0 - y * PX + 10} textAnchor="end" fontFamily={fontFamily} fontWeight={700} fontSize={30} fill={C.muted}>{y}</text>
            </g>
          ))}
          {bars.map((b) => <rect key={b.label} x={b.x - 70} y={Y0 - b.years * PX} width={140} height={b.years * PX} rx={14} fill={b.color} opacity={b.o} />)}
        </>,
      )}
      {bars.map((b) => (
        <React.Fragment key={b.label}>
          <Txt x={b.x} y={Y0 + 24} size={30} weight={800} align="center" color={b.color} style={{opacity: b.o, left: b.x, width: undefined, marginLeft: 0, translate: '-50% 0'}}>{b.label}</Txt>
          <Txt x={b.x} y={Y0 - b.years * PX - 80} size={50} align="center" color={b.color} style={{opacity: b.o, left: b.x, width: undefined, marginLeft: 0, translate: '-50% 0'}}>
            {b.years < 10 ? de(b.years) : Math.round(b.years)} J
          </Txt>
        </React.Fragment>
      ))}
      <Txt x={240} y={Y0 - 130 * PX - 70} size={30} weight={700} color={C.muted} spacing={3}>JAHRE</Txt>
    </>
  );
};

const Micro: React.FC = () => {
  const f = useCurrentFrame();
  const s0 = T.s('end3');
  const left = Math.max(0, 90 - Math.max(0, f - s0) * 1.4);
  const time = `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`;
  return (
    <>
      {svg(
        <>
          <Microwave x={240} y={760} f={f} on={1} time={time} />
          <Mug x={340} y={930} s={0.5} steam={1} f={f} />
        </>,
      )}
      <Pill x={540} y={600} color={C.orange} show={rise(f, s0, 8)} size={40}>MIKROWELLE</Pill>
      <Txt x={540} y={1250} size={120} align="center" color={C.teal} style={{opacity: rise(f, T.w('end3', 'eineinhalb'), 8), textShadow: glow(`${C.teal}55`, 16)}}>1,5 MIN</Txt>
    </>
  );
};

// ---------------------------------------------------------------------------------------

export const SchreiVideo: React.FC = () => {
  const f = useCurrentFrame();
  const hud = rise(f, T.s('claim2'), 10) * (1 - rise(f, T.s('end3') - 4, 10));
  const vd = T.w('voice2', 'schreist');
  const yStart = T.s('wall3');
  let shout = '0';
  let unit = 'Tage';
  if (f >= T.s('end2')) {
    shout = '∞';
    unit = '';
  } else if (f >= yStart) {
    shout = String(Math.round(tween(f, yStart, T.w('wall3', 'Jahre') + 6, DAYS / 365.25, YEARS)));
    unit = 'Jahre';
  } else if (f >= vd) {
    shout = String(Math.round(tween(f, vd, T.w('voice2', 'Tage') + 4, 0, DAYS)));
  }
  const nonstop = rise(f, T.w('voice2', 'Ohne'), 6) * (1 - rise(f, T.s('wall1'), 6));
  return (
    <AbsoluteFill>
      <Backdrop cam={cam.at(f)} />
      <Audio src={staticFile('schrei/voice.wav')} />
      <World track={cam}>
        <Place at={O.mug}><MugScene /></Place>
        <Place at={O.post}><Post /></Place>
        <Place at={O.cup}><Cup /></Place>
        <Place at={O.voice}><Voice /></Place>
        <Place at={O.wall}><Wall /></Place>
        <Place at={O.life}><Life /></Place>
        <Place at={O.micro}><Micro /></Place>
      </World>
      <HudTile x={90} y={150} w={420} label="SCHREIEN" value={shout} unit={unit} color={C.red} show={hud} />
      <HudTile x={570} y={150} w={420} label="KAFFEE" value="20,0" unit="°C" color={C.teal} show={hud} />
      <Badge text="OHNE PAUSE" show={nonstop} color={C.red} />
      <Choice
        question="WIE LANGE?" a={{label: 'MINUTEN', color: C.teal}} b={{label: 'JAHRE', color: C.red}}
        from={T.s('hook2')} to={T.s('claim1') - 4} cdFrom={T.s('hook3')} top={380} size={80}
      />
      <Captions timing={T.timing} />
      <Handle text="scrimpass.com" />
    </AbsoluteFill>
  );
};
