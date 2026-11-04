// Scenes 352 s – end: deep-sea vents, geothermal heat, bunkers, air snow, the lonely ice ball, the ending.
import React from 'react';
import {C, fontFamily} from '../../lib/theme';
import {rise} from '../../lib/timing';
import {Cam, Earth, Label, PC, ParkScene, SKY_SUN, Stars, camAt, clamp01, layer, lerp, rnd} from './Intro';
import {SpaceBack} from './scenesLight';
import {mix} from './scenesCold';
import {SH, SW} from './Video';

export const LifeDefs: React.FC = () => (
  <defs>
    <linearGradient id="abyss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#030a20" /><stop offset="1" stopColor="#01030a" /></linearGradient>
    <radialGradient id="ventGlow"><stop offset="0" stopColor="#ff9a3a" stopOpacity="0.8" /><stop offset="1" stopColor="#ff5d20" stopOpacity="0" /></radialGradient>
    <radialGradient id="lampViolet"><stop offset="0" stopColor="#e07aff" stopOpacity="0.7" /><stop offset="1" stopColor="#a040ff" stopOpacity="0" /></radialGradient>
    <radialGradient id="core"><stop offset="0" stopColor="#fff3a0" /><stop offset="0.35" stopColor="#ffb547" /><stop offset="0.7" stopColor="#ff5d20" /><stop offset="1" stopColor="#a02a10" /></radialGradient>
    <linearGradient id="rock" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4a3a4a" /><stop offset="1" stopColor="#2a1f2e" /></linearGradient>
    <linearGradient id="sunrise" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#2a1f6a" /><stop offset="0.45" stopColor="#d8507a" /><stop offset="0.75" stopColor="#ff9a4a" /><stop offset="1" stopColor="#ffd27a" />
    </linearGradient>
    <radialGradient id="beamLamp" cx="0" cy="0.5" r="1"><stop offset="0" stopColor="#fff6c8" stopOpacity="0.5" /><stop offset="1" stopColor="#fff6c8" stopOpacity="0" /></radialGradient>
  </defs>
);

// ---------------------------------------------------------------------------------------
// black smokers on the sea floor with tube worms, crabs, mussels, bacteria, oxygen, a submarine

export const VentScene: React.FC<{f: number; t0: number; revealAt: number; heatAt: number; lifeAt: number; o2At: number; subAt: number; end: number}> = ({
  f, t0, revealAt, heatAt, lifeAt, o2At, subAt, end,
}) => {
  const reveal = rise(f, revealAt, 40);
  const cam = camAt(f, [
    [t0, {x: 960, y: 300, z: 1.3}], [revealAt, {x: 960, y: 560, z: 1.0}], [heatAt, {x: 960, y: 720, z: 1.1}],
    [lifeAt, {x: 700, y: 760, z: 1.45}], [o2At, {x: 960, y: 520, z: 0.95}], [subAt, {x: 1200, y: 520, z: 1.1}], [end, {x: 1150, y: 560, z: 1.15}],
  ]);
  const C0 = {x: 960, y: 600};
  const FLOOR = 900;
  const chimneys = [{x: 760, h: 380, w: 90}, {x: 1060, h: 520, w: 110}, {x: 1320, h: 300, w: 80}];
  const sub = rise(f, subAt, 1);
  const subX = lerp(2400, 1500, clamp01((f - subAt) / 120));
  return (
    <>
      <g transform={layer(cam, 0.2, C0)}><rect x={-1500} y={-1500} width={5000} height={4000} fill="url(#abyss)" /></g>
      {/* marine snow */}
      <g transform={layer(cam, 0.5, C0)}>
        {Array.from({length: 80}, (_, i) => (
          <circle key={i} cx={-200 + rnd(i) * 2400 + Math.sin(f * 0.01 + i) * 20} cy={((rnd(i + 3) * 1400 + f * 0.5) % 1400) - 200} r={1.5 + rnd(i + 5) * 2} fill="#cfe0ff" opacity={0.35} />
        ))}
      </g>
      <g transform={layer(cam, 1, C0)} opacity={0.15 + 0.85 * reveal}>
        {/* heat from below: cut through the floor */}
        <rect x={-1000} y={FLOOR} width={4000} height={900} fill="url(#rock)" />
        <g opacity={rise(f, heatAt, 20)}>
          <ellipse cx={1060} cy={FLOOR + 700} rx={700} ry={220} fill="url(#ventGlow)" />
          {Array.from({length: 7}, (_, i) => {
            const t = ((f * 1.2 + i * 30) % 200) / 200;
            const x = 760 + i * 90;
            return <path key={i} d={`M ${x} ${FLOOR + 700 - t * 600} l -16 30 m 16 -30 l 16 30`} stroke="#ffb547" strokeWidth={6} fill="none" opacity={1 - t} />;
          })}
          <Label x={1060} y={FLOOR + 560} text="Wärme aus dem Erdinneren" o={1} size={34} color="#ffd27a" />
        </g>
        {chimneys.map((c, i) => (
          <g key={i}>
            <ellipse cx={c.x} cy={FLOOR - c.h} rx={c.w * 1.8} ry={c.w * 1.2} fill="url(#ventGlow)" opacity={0.6 + 0.2 * Math.sin(f * 0.15 + i)} />
            <path d={`M ${c.x - c.w} ${FLOOR + 10} Q ${c.x - c.w * 0.5} ${FLOOR - c.h * 0.5} ${c.x - c.w * 0.35} ${FLOOR - c.h} L ${c.x + c.w * 0.35} ${FLOOR - c.h} Q ${c.x + c.w * 0.5} ${FLOOR - c.h * 0.5} ${c.x + c.w} ${FLOOR + 10} Z`} fill="#2a2030" />
            <path d={`M ${c.x - c.w * 0.35} ${FLOOR - c.h} L ${c.x + c.w * 0.35} ${FLOOR - c.h}`} stroke="#ff8a3a" strokeWidth={8} />
            {/* black smoke */}
            {Array.from({length: 14}, (_, j) => {
              const t = ((f * 1.1 + j * 14 + i * 37) % 200) / 200;
              return <circle key={j} cx={c.x + Math.sin(t * 7 + j) * 30 * t + t * 60} cy={FLOOR - c.h - t * 520} r={c.w * 0.3 + t * 90} fill={t < 0.15 ? '#5a3a30' : '#141018'} opacity={0.75 * (1 - t)} />;
            })}
          </g>
        ))}
        {/* tube worms */}
        {Array.from({length: 16}, (_, i) => {
          const x = 560 + i * 26 + (i > 7 ? 520 : 0);
          const h = 90 + rnd(i) * 90;
          const sway = Math.sin(f * 0.06 + i) * 10;
          return (
            <g key={i}>
              <path d={`M ${x} ${FLOOR + 8} Q ${x + sway * 0.5} ${FLOOR - h / 2} ${x + sway} ${FLOOR - h}`} stroke="#f0ece0" strokeWidth={12} fill="none" strokeLinecap="round" />
              <ellipse cx={x + sway} cy={FLOOR - h - 12} rx={12} ry={20} fill="#ff3a4a" />
            </g>
          );
        })}
        {/* mussels */}
        {Array.from({length: 14}, (_, i) => <ellipse key={i} cx={620 + i * 55} cy={FLOOR + 6} rx={22} ry={12} fill="#3a3a5a" stroke="#6a6a8a" strokeWidth={3} transform={`rotate(${rnd(i) * 40 - 20} ${620 + i * 55} ${FLOOR + 6})`} />)}
        {/* crabs */}
        {[0, 1].map((i) => {
          const x = 900 + Math.sin(f * 0.02 + i * 3) * 200 + i * 200;
          return (
            <g key={i} transform={`translate(${x} ${FLOOR - 4})`}>
              {[-1, 1].map((s) => [0, 1, 2].map((l) => <line key={`${s}${l}`} x1={s * 14} y1={-10} x2={s * (34 + l * 6)} y2={6 + Math.sin(f * 0.5 + l) * 4} stroke="#f2f0ea" strokeWidth={4} />))}
              <ellipse cx={0} cy={-14} rx={30} ry={16} fill="#f2f0ea" />
              <path d="M -24 -20 l -14 -18 l 10 -4 M 24 -20 l 14 -18 l -10 -4" stroke="#f2f0ea" strokeWidth={5} fill="none" />
            </g>
          );
        })}
        {/* glowing bacteria mats */}
        <g opacity={rise(f, lifeAt, 20)}>
          {Array.from({length: 60}, (_, i) => (
            <circle key={i} cx={560 + rnd(i) * 900} cy={FLOOR - rnd(i + 2) * 40} r={3 + rnd(i + 4) * 3} fill="#7affc8" opacity={0.4 + 0.5 * Math.sin(f * 0.2 + i)} />
          ))}
          <Label x={620} y={FLOOR - 230} text="Bakterien" o={1} size={34} color="#7affc8" />
        </g>
        {/* oxygen drifting down from the surface */}
        <g opacity={rise(f, o2At, 20) * (1 - rise(f, subAt - 20, 20))}>
          {Array.from({length: 24}, (_, i) => {
            const t = ((f * 0.8 + i * 30) % 600) / 600;
            const x = 300 + (i % 8) * 200 + Math.sin(f * 0.03 + i) * 20;
            return (
              <g key={i} transform={`translate(${x} ${-200 + t * 1000})`} opacity={Math.sin(t * Math.PI)}>
                <circle r={22} fill="none" stroke="#9fd4ff" strokeWidth={3} />
                <text y={8} textAnchor="middle" fontFamily={fontFamily} fontWeight={800} fontSize={20} fill="#9fd4ff">O₂</text>
              </g>
            );
          })}
        </g>
        {/* the submarine of 1977 */}
        {sub > 0 && (
          <g transform={`translate(${subX} ${560 + Math.sin(f * 0.04) * 8})`}>
            <path d="M -40 0 L -900 -260 L -900 260 Z" fill="url(#beamLamp)" opacity={0.7} />
            <ellipse cx={80} cy={0} rx={140} ry={70} fill="#f0f0f0" />
            <rect x={60} y={-110} width={80} height={50} rx={14} fill="#ff5d50" />
            <circle cx={-30} cy={0} r={34} fill="#8fd0ff" stroke="#d0d8e8" strokeWidth={8} />
            <rect x={200} y={-30} width={40} height={60} rx={10} fill="#ff5d50" />
            <circle cx={-48} cy={36} r={10} fill="#fff6c8" />
          </g>
        )}
      </g>
    </>
  );
};

// geothermal town (Iceland-style): steam vents, warm houses and greenhouses in the snow
export const GeoTownScene: React.FC<{f: number; cam: Cam}> = ({f, cam}) => {
  const C0 = {x: 960, y: 600};
  const G = 860;
  return (
    <>
      <g transform={layer(cam, 0.1, C0)}><rect x={-1500} y={-1000} width={5000} height={3000} fill="url(#coldSky)" /></g>
      <g transform={layer(cam, 0.2, C0)}><Stars f={f} dim={1} /></g>
      {/* aurora */}
      <g transform={layer(cam, 0.3, C0)} opacity={0.5}>
        {[0, 1, 2].map((i) => (
          <path key={i} d={`M -400 ${220 + i * 50} Q 400 ${120 + Math.sin(f * 0.02 + i) * 60} 1000 ${240 + i * 40} T 2400 ${200 + Math.cos(f * 0.02 + i) * 60}`} stroke={i % 2 ? '#3fd2c2' : '#7affc8'} strokeWidth={50 - i * 10} fill="none" opacity={0.35} />
        ))}
      </g>
      <g transform={layer(cam, 0.6, C0)}>
        <path d={`M -800 ${G - 40} L -200 ${G - 360} L 400 ${G - 80} L 1100 ${G - 420} L 1800 ${G - 100} L 2500 ${G - 330} L 3200 ${G}`} fill="#1e2858" />
        <path d={`M -200 ${G - 360} L -60 ${G - 270} L -340 ${G - 270} Z M 1100 ${G - 420} L 1260 ${G - 310} L 950 ${G - 310} Z`} fill="#eef4ff" />
      </g>
      <g transform={layer(cam, 1, C0)}>
        <rect x={-1500} y={G} width={5000} height={1200} fill="#dce8f8" />
        {/* hot springs and steam */}
        {[300, 1500].map((x, i) => (
          <g key={i}>
            <ellipse cx={x} cy={G + 120} rx={170} ry={40} fill="#5ad0e0" />
            {Array.from({length: 10}, (_, j) => {
              const t = ((f * 0.9 + j * 20 + i * 50) % 200) / 200;
              return <circle key={j} cx={x + Math.sin(t * 5 + j) * 50 + t * 40} cy={G + 100 - t * 500} r={30 + t * 70} fill="#fff" opacity={0.4 * (1 - t)} />;
            })}
          </g>
        ))}
        {/* pipes */}
        <path d={`M 300 ${G + 100} L 300 ${G + 60} L 1500 ${G + 60} L 1500 ${G + 100}`} stroke="#8a9ab8" strokeWidth={18} fill="none" />
        {/* greenhouses */}
        {[600, 900].map((x, i) => (
          <g key={i}>
            <circle cx={x + 110} cy={G - 60} r={200} fill="url(#lampViolet)" opacity={0.25} />
            <path d={`M ${x} ${G} L ${x} ${G - 100} Q ${x + 110} ${G - 200} ${x + 220} ${G - 100} L ${x + 220} ${G} Z`} fill="#bff0d0" opacity={0.55} stroke="#eaffff" strokeWidth={4} />
            {Array.from({length: 6}, (_, j) => <circle key={j} cx={x + 30 + j * 32} cy={G - 30 - Math.sin(f * 0.05 + j) * 2} r={16} fill="#3fa25a" />)}
          </g>
        ))}
        {/* warm houses */}
        {[1150, 1700, 1950].map((x, i) => (
          <g key={i}>
            <rect x={x} y={G - 160} width={200} height={160} fill={['#c0584a', '#4a7fc0', '#d8a23a'][i]} />
            <path d={`M ${x - 20} ${G - 160} L ${x + 100} ${G - 250} L ${x + 220} ${G - 160} Z`} fill="#eef4ff" />
            <rect x={x + 30} y={G - 120} width={50} height={50} rx={6} fill="#ffc96a" />
            <rect x={x + 120} y={G - 120} width={50} height={50} rx={6} fill="#ffc96a" />
            <circle cx={x + 100} cy={G - 90} r={140} fill="url(#fireGlow)" opacity={0.25} />
          </g>
        ))}
      </g>
    </>
  );
};

// the earth cut open: heat flows up everywhere; 47 TW vs. what humanity uses; usable only at hot spots
export const HeatFlowScene: React.FC<{f: number; t0: number; barsAt: number; spotsAt: number; end: number}> = ({f, t0, barsAt, spotsAt, end}) => {
  const cam = camAt(f, [[t0, {x: 800, y: 560, z: 1.0}], [barsAt, {x: 960, y: 540, z: 0.95}], [spotsAt, {x: 900, y: 540, z: 1.02}], [end, {x: 900, y: 540, z: 1.06}]]);
  const E = {x: 700, y: 560, r: 340};
  const bars = rise(f, barsAt, 30);
  const spots = rise(f, spotsAt, 20);
  return (
    <>
      <SpaceBack f={f} cam={cam} dim={0.7} />
      <g transform={layer(cam, 1, {x: 960, y: 540})}>
        <Earth f={f} x={E.x} y={E.y} r={E.r} frozen id="cut" />
        {/* the cut-out wedge */}
        <path d={`M ${E.x} ${E.y} L ${E.x + E.r} ${E.y} A ${E.r} ${E.r} 0 0 0 ${E.x} ${E.y - E.r} Z`} fill="#6a2a20" />
        <path d={`M ${E.x} ${E.y} L ${E.x + E.r * 0.82} ${E.y} A ${E.r * 0.82} ${E.r * 0.82} 0 0 0 ${E.x} ${E.y - E.r * 0.82} Z`} fill="#c0401a" />
        <path d={`M ${E.x} ${E.y} L ${E.x + E.r * 0.55} ${E.y} A ${E.r * 0.55} ${E.r * 0.55} 0 0 0 ${E.x} ${E.y - E.r * 0.55} Z`} fill="#ff8a2a" />
        <circle cx={E.x} cy={E.y} r={E.r * 0.3 * (1 + 0.03 * Math.sin(f * 0.2))} fill="url(#core)" />
        {/* heat arrows all around */}
        {Array.from({length: 22}, (_, i) => {
          const a = (i / 22) * Math.PI * 2;
          const t = ((f * 1.1 + i * 13) % 90) / 90;
          const r0 = E.r + 10 + t * 90;
          const x = E.x + Math.cos(a) * r0;
          const y = E.y + Math.sin(a) * r0;
          return <path key={i} d="M -12 8 L 0 -10 L 12 8" stroke="#ff8a5a" strokeWidth={5} fill="none" transform={`translate(${x} ${y}) rotate(${(a * 180) / Math.PI + 90})`} opacity={(1 - t) * (1 - spots * 0.6)} />;
        })}
        {/* usable hot spots */}
        {[[-0.6, -0.5], [0.2, 0.75], [-0.85, 0.2], [0.55, -0.35]].map(([dx, dy], i) => (
          <g key={i} opacity={spots}>
            <circle cx={E.x + dx * E.r} cy={E.y + dy * E.r} r={26 + 6 * Math.sin(f * 0.2 + i)} fill="url(#ventGlow)" />
            <circle cx={E.x + dx * E.r} cy={E.y + dy * E.r} r={8} fill="#fff3a0" />
          </g>
        ))}
        {/* bars */}
        <g opacity={bars} transform="translate(1260 0)">
          <rect x={0} y={760 - 440 * bars} width={140} height={440 * bars} rx={12} fill={C.orange} />
          <rect x={220} y={760 - 190 * bars} width={140} height={190 * bars} rx={12} fill={C.teal} />
          <line x1={-30} x2={400} y1={760} y2={760} stroke="#fff" strokeWidth={4} />
          <Label x={70} y={760 - 440 * bars - 24} text="47 TW" o={1} size={46} color={C.orange} />
          <Label x={290} y={760 - 190 * bars - 24} text="≈ 20 TW" o={1} size={40} color={C.teal} />
          <Label x={70} y={810} text="Erdwärme" o={1} size={30} />
          <Label x={290} y={810} text="Menschheit" o={1} size={30} />
        </g>
      </g>
    </>
  );
};

// living underground: a cut-away bunker below the frozen surface
export const BunkerScene: React.FC<{f: number; t0: number; peopleAt: number; techAt: number; end: number}> = ({f, t0, peopleAt, techAt, end}) => {
  const cam = camAt(f, [[t0, {x: 960, y: 200, z: 1.2}], [t0 + 60, {x: 960, y: 560, z: 0.95}], [peopleAt, {x: 760, y: 620, z: 1.35}], [techAt, {x: 1250, y: 640, z: 1.35}], [end, {x: 960, y: 580, z: 1.0}]]);
  const C0 = {x: 960, y: 540};
  const SURF = 220;
  const lamp = 0.85 + 0.15 * Math.sin(f * 0.1);
  return (
    <>
      <g transform={layer(cam, 1, C0)}>
        <rect x={-1000} y={-900} width={4000} height={SURF + 900} fill="url(#coldSky)" />
        <g transform="translate(0 -700)"><Stars f={f} dim={0.9} /></g>
        <rect x={-1000} y={SURF} width={4000} height={1600} fill="url(#rock)" />
        <rect x={-1000} y={SURF - 20} width={4000} height={40} rx={10} fill="#eef4ff" />
        {/* rock speckles */}
        {Array.from({length: 60}, (_, i) => <circle key={i} cx={-400 + rnd(i) * 2800} cy={SURF + 60 + rnd(i + 3) * 1200} r={4 + rnd(i + 6) * 10} fill="#3a2d3e" />)}
        {/* shaft */}
        <rect x={420} y={SURF} width={70} height={300} fill="#1e1828" />
        {Array.from({length: 8}, (_, i) => <rect key={i} x={430} y={SURF + 20 + i * 36} width={50} height={6} fill="#6a6a8a" />)}
        {/* greenhouse room */}
        <rect x={300} y={520} width={760} height={300} rx={24} fill="#2a1e3a" stroke="#4a3a5a" strokeWidth={10} />
        {[420, 620, 820].map((x, i) => (
          <g key={i}>
            <ellipse cx={x + 60} cy={620} rx={150} ry={130} fill="url(#lampViolet)" opacity={lamp} />
            <rect x={x} y={548} width={120} height={14} rx={6} fill="#f0b0ff" />
            <rect x={x - 10} y={760} width={140} height={30} rx={8} fill="#6a4a3a" />
            {Array.from({length: 5}, (_, j) => (
              <g key={j}>
                <path d={`M ${x + 10 + j * 25} 760 q ${Math.sin(f * 0.05 + j) * 4} -40 0 -70`} stroke="#3fa25a" strokeWidth={5} fill="none" />
                <ellipse cx={x + 10 + j * 25} cy={690} rx={14} ry={20} fill="#4fc36a" />
              </g>
            ))}
          </g>
        ))}
        {/* people at work */}
        {f >= peopleAt - 20 && [0, 1].map((i) => (
          <g key={i} transform={`translate(${560 + i * 260 + Math.sin(f * 0.02 + i) * 30} 800)`} opacity={rise(f, peopleAt - 20, 14)}>
            <rect x={-20} y={-90} width={40} height={70} rx={16} fill={i ? '#3fd2c2' : '#ffb547'} />
            <circle cx={0} cy={-110} r={20} fill={i ? '#c98a60' : '#f2b98d'} />
            <line x1={-8} y1={-24} x2={-10} y2={0} stroke="#2a2440" strokeWidth={10} strokeLinecap="round" />
            <line x1={8} y1={-24} x2={10} y2={0} stroke="#2a2440" strokeWidth={10} strokeLinecap="round" />
          </g>
        ))}
        {/* tech room: reactor, air filter, ice melter */}
        <rect x={1120} y={520} width={620} height={300} rx={24} fill="#1e2438" stroke="#3a4470" strokeWidth={10} />
        <g transform="translate(1230 700)">
          <rect x={-60} y={-110} width={120} height={200} rx={30} fill="#4a5070" />
          <circle cx={0} cy={-10} r={36} fill="#3fd2c2" opacity={0.6 + 0.4 * Math.sin(f * 0.2)} />
          <circle cx={0} cy={-10} r={70} fill="#3fd2c2" opacity={0.15} />
          <text y={130} textAnchor="middle" fontFamily={fontFamily} fontWeight={800} fontSize={24} fill="#cfe">Strom</text>
        </g>
        <g transform="translate(1440 660)">
          <circle r={60} fill="#2a3050" stroke="#6a7aa8" strokeWidth={6} />
          {[0, 120, 240].map((a) => <path key={a} d="M 0 0 L 0 -50 Q 24 -40 18 -10 Z" fill="#9fb4e0" transform={`rotate(${a + f * 8})`} />)}
          <text y={110} textAnchor="middle" fontFamily={fontFamily} fontWeight={800} fontSize={24} fill="#cfe">Luft</text>
        </g>
        <g transform="translate(1630 700)">
          <rect x={-50} y={-30} width={100} height={110} rx={10} fill="#3a6aa8" />
          <rect x={-50} y={80 - 110 * (0.3 + 0.5 * clamp01((f - techAt) / 200))} width={100} height={110 * (0.3 + 0.5 * clamp01((f - techAt) / 200))} rx={10} fill="#5ab0ff" />
          <path d="M -30 -40 L -20 -100 L 30 -90 L 36 -40 Z" fill="#dff2ff" opacity={1 - clamp01((f - techAt) / 200)} />
          {Array.from({length: 4}, (_, i) => <circle key={i} cx={-10 + i * 8} cy={-30 + ((f * 2 + i * 10) % 40)} r={4} fill="#9fd4ff" />)}
          <text y={130} textAnchor="middle" fontFamily={fontFamily} fontWeight={800} fontSize={24} fill="#cfe">Wasser</text>
        </g>
        <rect x={1060} y={640} width={60} height={40} fill="#2a1e3a" />
      </g>
    </>
  );
};

// the air itself freezes and falls as snow
export const AirSnowScene: React.FC<{f: number; t0: number; snowAt: number; end: number}> = ({f, t0, snowAt, end}) => {
  const cam = camAt(f, [[t0, {x: 960, y: 640, z: 1.0}], [end, {x: 960, y: 540, z: 1.15}]]);
  const s = rise(f, snowAt, 30);
  const pile = clamp01((f - snowAt) / (end - snowAt));
  return (
    <>
      <rect width={SW} height={SH} fill="#010208" />
      <g transform={layer(cam, 0.3, {x: 960, y: 540})}><Stars f={f} dim={1.2} /></g>
      <g transform={layer(cam, 1, {x: 960, y: 540})}>
        <path d="M -400 860 L 200 640 L 600 800 L 1100 600 L 1600 780 L 2300 640 L 2400 1100 L -400 1100 Z" fill="#1a2040" />
        <rect x={-600} y={880 - pile * 60} width={3200} height={600} fill="#e6eeff" />
        {Array.from({length: 70}, (_, i) => {
          const x = -100 + rnd(i) * 2100 + Math.sin(f * 0.02 + i) * 30;
          const y = ((rnd(i + 3) * 1000 + f * (1 + rnd(i + 5))) % 1000) - 80;
          const big = i % 7 === 0;
          return (
            <g key={i} transform={`translate(${x} ${y}) rotate(${f + i * 30})`} opacity={s}>
              {[0, 60, 120].map((a) => <line key={a} x1={-12} x2={12} y1={0} y2={0} stroke="#eaf2ff" strokeWidth={3} transform={`rotate(${a})`} />)}
              {big && <text x={18} y={8} fontFamily={fontFamily} fontWeight={800} fontSize={26} fill="#9fd4ff" transform={`rotate(${-(f + i * 30)})`}>{i % 2 ? 'N₂' : 'O₂'}</text>}
            </g>
          );
        })}
      </g>
    </>
  );
};

// the dark ice ball, alone among the stars, a few tiny lights on it
export const LonelyScene: React.FC<{f: number; t0: number; end: number}> = ({f, t0, end}) => {
  const k = clamp01((f - t0) / (end - t0));
  const z = lerp(1.6, 0.55, k);
  return (
    <>
      <rect width={SW} height={SH} fill="#010208" />
      <g transform={`translate(${-k * 200} 0)`}><Stars f={f} dim={1} /></g>
      <g transform={`translate(960 540) scale(${z}) translate(-960 -540)`}>
        <Earth f={f} x={960} y={540} r={280} frozen id="lonely" />
        <circle cx={960} cy={540} r={280} fill="#010208" opacity={0.45} />
        {[[-80, -40], [60, 90], [120, -110], [-150, 100]].map(([dx, dy], i) => (
          <g key={i}>
            <circle cx={960 + dx} cy={540 + dy} r={14} fill="url(#fireGlow)" opacity={0.5 + 0.3 * Math.sin(f * 0.1 + i)} />
            <circle cx={960 + dx} cy={540 + dy} r={3} fill="#ffd77a" />
          </g>
        ))}
      </g>
    </>
  );
};

// food is stored sunlight: sun -> wheat -> bread, apple tree -> apple
export const FoodScene: React.FC<{f: number; t0: number; end: number}> = ({f, t0, end}) => {
  const HZ = 1030;
  const cam = camAt(f, [[t0, {x: 1500, y: 500, z: 1.1}], [t0 + 90, {x: 1100, y: 900, z: 1.0}], [end, {x: 900, y: 1000, z: 1.15}]]);
  const k = (n: number) => rise(f, t0 + 60 + n * 25, 14);
  return (
    <>
      <ParkScene f={f} cam={cam} night={0} />
      <g transform={layer(cam, 1, PC)}>
        {/* beams of sunlight flowing down into the plants */}
        {[0, 1, 2].map((i) => {
          const tx = [600, 1050, 1500][i];
          return (
            <g key={i} opacity={rise(f, t0 + 20 + i * 10, 20)}>
              <line x1={SKY_SUN.x} y1={SKY_SUN.y} x2={tx} y2={HZ + 250} stroke="#ffe39a" strokeWidth={6} strokeDasharray="12 14" strokeDashoffset={-f * 4} opacity={0.7} />
            </g>
          );
        })}
        {/* icons: wheat -> bread, apple, carrot */}
        {[
          {x: 600, label: 'Brot', draw: <g><ellipse cx={0} cy={0} rx={70} ry={42} fill="#d89a4a" /><path d="M -40 -20 q 20 -14 30 0 M 0 -26 q 20 -14 30 0" stroke="#a86a2a" strokeWidth={6} fill="none" /></g>},
          {x: 1050, label: 'Obst', draw: <g><circle cx={0} cy={0} r={48} fill="#ff4a50" /><path d="M 0 -48 q 4 -20 18 -26" stroke="#5a3a2a" strokeWidth={6} fill="none" /><ellipse cx={22} cy={-58} rx={18} ry={9} fill="#3fa25a" /></g>},
          {x: 1500, label: 'Gemüse', draw: <g><path d="M -20 -40 L 20 -40 L 0 60 Z" fill="#ff8a2a" /><path d="M -10 -40 l -16 -30 M 0 -40 l 0 -34 M 10 -40 l 16 -30" stroke="#3fa25a" strokeWidth={8} /></g>},
        ].map((it, i) => (
          <g key={i} transform={`translate(${it.x} ${HZ + 250 - 20 * Math.sin(f * 0.08 + i)}) scale(${k(i)})`}>
            <circle r={90} fill="#fff" opacity={0.85} />
            {it.draw}
            <text y={130} textAnchor="middle" fontFamily={fontFamily} fontWeight={800} fontSize={36} fill="#fff" style={{paintOrder: 'stroke', stroke: 'rgba(5,8,25,0.5)', strokeWidth: 6}}>{it.label}</text>
          </g>
        ))}
      </g>
    </>
  );
};

// golden afternoon in the park with a huge countdown, then the dark
export const FinalParkScene: React.FC<{f: number; t0: number; dark: number; remaining: (f: number) => number; night: number}> = ({f, t0, dark, remaining, night}) => {
  const cam = camAt(f, [[t0, {x: 1200, y: 900, z: 1.0}], [dark, {x: 1150, y: 980, z: 1.22}]]);
  const r = remaining(f);
  const big = f < dark && r < 3;
  return (
    <>
      <ParkScene f={f} cam={cam} night={night} />
      <rect width={SW} height={SH} fill="#ff9a3a" opacity={0.18 * (1 - night)} />
      {big && (
        <text x={SW / 2} y={640} textAnchor="middle" fontFamily={fontFamily} fontWeight={900} fontSize={360} fill="#fff" opacity={0.92}
          transform={`translate(${SW / 2} 540) scale(${1 + 0.25 * (1 - (r % 1))}) translate(${-SW / 2} -540)`}
          style={{paintOrder: 'stroke', stroke: 'rgba(5,8,25,0.4)', strokeWidth: 20}}>
          {Math.ceil(r)}
        </text>
      )}
    </>
  );
};

// sunrise: the sun is still there; a person on a hill enjoys it
export const SunriseScene: React.FC<{f: number; t0: number; end: number}> = ({f, t0, end}) => {
  const k = clamp01((f - t0) / (end - t0));
  const sy = lerp(980, 640, Math.sqrt(k));
  const cam = {x: 960, y: 560, z: lerp(1.15, 1.0, k)};
  return (
    <>
      <rect width={SW} height={SH} fill="url(#sunrise)" />
      <rect width={SW} height={SH} fill="#0b0d2e" opacity={0.6 * (1 - rise(f, t0, 90))} />
      <g transform={layer(cam, 0.3, {x: 960, y: 540})} opacity={1 - rise(f, t0, 60)}><Stars f={f} dim={0.8} /></g>
      <g transform={layer(cam, 0.5, {x: 960, y: 540})}>
        <circle cx={1200} cy={sy} r={420} fill="url(#skySun)" />
        <circle cx={1200} cy={sy} r={130} fill="#fff1b0" />
        <g transform={`rotate(${f * 0.15} 1200 ${sy})`} opacity={0.35}>
          {Array.from({length: 18}, (_, i) => <rect key={i} x={1195} y={sy - 330} width={10} height={140} rx={5} fill="#fff3b0" transform={`rotate(${i * 20} 1200 ${sy})`} />)}
        </g>
        {Array.from({length: 5}, (_, i) => (
          <path key={i} d={`M ${((i * 420 + f * 1.4) % 2600) - 400} ${300 + i * 40} q 20 -20 40 0 q 20 -20 40 0`} stroke="#5a2a4a" strokeWidth={4} fill="none" />
        ))}
      </g>
      <g transform={layer(cam, 0.75, {x: 960, y: 540})}>
        <path d="M -400 840 Q 400 700 1000 820 T 2400 780 L 2400 1200 L -400 1200 Z" fill="#7a3a5a" />
      </g>
      <g transform={layer(cam, 1, {x: 960, y: 540})}>
        <path d="M -400 960 Q 300 820 900 900 T 2400 940 L 2400 1300 L -400 1300 Z" fill="#3a1f3a" />
        {/* person on the hill, stretching towards the sun */}
        <g transform="translate(640 880)">
          <rect x={-22} y={-110} width={44} height={80} rx={18} fill="#2a1428" />
          <circle cx={0} cy={-132} r={24} fill="#2a1428" />
          <line x1={-12} y1={-96} x2={-40 - 10 * Math.sin(f * 0.04)} y2={-160} stroke="#2a1428" strokeWidth={12} strokeLinecap="round" />
          <line x1={12} y1={-96} x2={40 + 10 * Math.sin(f * 0.04)} y2={-160} stroke="#2a1428" strokeWidth={12} strokeLinecap="round" />
          <line x1={-8} y1={-32} x2={-14} y2={10} stroke="#2a1428" strokeWidth={12} strokeLinecap="round" />
          <line x1={8} y1={-32} x2={14} y2={10} stroke="#2a1428" strokeWidth={12} strokeLinecap="round" />
        </g>
        {Array.from({length: 30}, (_, i) => {
          const x = -200 + i * 80;
          const sw = Math.sin(f * 0.05 + i) * 6;
          return <path key={i} d={`M ${x} ${960} q ${sw} -30 ${sw * 2} -46`} stroke="#2a1428" strokeWidth={5} fill="none" />;
        })}
      </g>
    </>
  );
};

export {mix};
