import React from 'react';
import {Composition} from 'remotion';
import {FPS, H, W} from './lib/theme';
import {DURATION as HZ240_DURATION, Hz240} from './videos/hz240/Video';

// one <Composition> per video; the id is what `npx remotion render <id>` takes
export const Root: React.FC = () => (
  <>
    <Composition id="hz240" component={Hz240} durationInFrames={HZ240_DURATION} fps={FPS} width={W} height={H} />
  </>
);
