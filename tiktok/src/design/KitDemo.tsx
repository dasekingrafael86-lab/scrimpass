// A sheet showing every piece of the design kit, for checking the style at a glance.
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {BigNumber, Bubble, Character, Face, Glow, Label, Mood, P, Tag, kitFont} from './kit';

const MOODS: Mood[] = ['neutral', 'happy', 'joy', 'curious', 'worried', 'shocked', 'sad', 'sleepy', 'determined'];

export const KitDemo: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: P.cream}}>
      <svg width={1920} height={1080}>
        <Tag f={f} at={0} text="Philipp" y={40} color={P.teal} />
        <Tag f={f} at={4} text="2018" y={150} color={P.orange} />
        {MOODS.map((m, i) => (
          <g key={m}>
            <circle cx={180 + i * 190} cy={380} r={80} fill={[P.yellow, P.pink, P.sky, P.green, P.lilac, P.orange, P.blue, P.magenta, P.teal][i]} />
            <Face f={f} x={180 + i * 190} y={380} w={130} mood={m} seed={i + 1} skin={[P.yellow, P.pink, P.sky, P.green, P.lilac, P.orange, P.blue, P.magenta, P.teal][i]} />
            <text x={180 + i * 190} y={500} textAnchor="middle" fontFamily={kitFont} fontWeight={600} fontSize={26} fill={P.indigo}>{m}</text>
          </g>
        ))}
        <Character f={f} x={260} y={1000} s={1.3} hairStyle="pony" hair={P.yellow} shirt={P.pink} mood="happy" arms="wave" seed={2} />
        <Character f={f} x={520} y={1000} s={1.3} hairStyle="short" skin={P.skinDark} shirt={P.teal} mood="curious" talk seed={3} />
        <Character f={f} x={780} y={1000} s={1.1} hairStyle="curly" hair={P.orange} shirt={P.yellow} mood="joy" arms="cheer" seed={4} />
        <Character f={f} x={1000} y={1000} s={1.2} hairStyle="bald" skin={P.skinPink} shirt={P.indigo} pants={P.violet} mood="worried" seed={5} />
        <rect x={1180} y={560} width={700} height={480} rx={30} fill={P.night} />
        <Glow cx={1380} cy={800} r={170} color={P.green} />
        <rect x={1310} y={690} width={140} height={220} rx={40} fill={P.green} />
        <rect x={1325} y={705} width={110} height={190} rx={30} fill="#7af0a0" />
        <Face f={f} x={1380} y={790} w={90} mood="curious" seed={7} skin="#7af0a0" />
        <Label f={f} at={8} text="Cisplatin" x={1290} y={760} color={P.teal} sub="2 L" />
        <Bubble f={f} at={10} text={['In Wirklichkeit', 'ist es farblos.']} x={1660} y={700} />
        <BigNumber f={f} at={12} value="499 s" caption="Licht von der Sonne" x={1660} y={980} />
      </svg>
    </AbsoluteFill>
  );
};
