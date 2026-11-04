import React from 'react';
import {Composition} from 'remotion';
import {FPS, H, W} from './lib/theme';
import {DURATION as HZ240_DURATION, Hz240} from './videos/hz240/Video';
import {DURATION as SNIPER_DURATION, SniperVideo} from './videos/sniper/Video';
import {DURATION as SONNE_DURATION, SH, SW, Sonne} from './videos/sonne/Video';
import {INTRO2_DURATION, SonneIntro2} from './videos/sonne/IntroV2';
import {SonneAnimated} from './videos/sonne/Animated';
import {KitDemo} from './design/KitDemo';
import {LEO_DURATION, LH, LW, LeoVideo} from './videos/leo/Video';
import {ALLTAG_DURATION, AlltagVideo} from './videos/alltag/Video';
import {SCHREI_DURATION, SchreiVideo} from './videos/schrei/Video';

// one <Composition> per video; the id is what `npx remotion render <id>` takes
export const Root: React.FC = () => (
  <>
    <Composition id="hz240" component={Hz240} durationInFrames={HZ240_DURATION} fps={FPS} width={W} height={H} />
    <Composition id="sniper" component={SniperVideo} durationInFrames={SNIPER_DURATION} fps={FPS} width={W} height={H} />
    <Composition id="sonne" component={SonneAnimated} durationInFrames={SONNE_DURATION} fps={FPS} width={SW} height={SH} />
    <Composition id="sonneDias" component={Sonne} durationInFrames={SONNE_DURATION} fps={FPS} width={SW} height={SH} />
    <Composition id="sonneIntro" component={SonneIntro2} durationInFrames={INTRO2_DURATION} fps={FPS} width={SW} height={SH} />
    <Composition id="leo" component={LeoVideo} durationInFrames={LEO_DURATION} fps={FPS} width={LW} height={LH} />
    <Composition id="alltag" component={AlltagVideo} durationInFrames={ALLTAG_DURATION} fps={FPS} width={LW} height={LH} />
    <Composition id="schrei" component={SchreiVideo} durationInFrames={SCHREI_DURATION} fps={FPS} width={W} height={H} />
    <Composition id="kitDemo" component={KitDemo} durationInFrames={120} fps={FPS} width={SW} height={SH} />
  </>
);
