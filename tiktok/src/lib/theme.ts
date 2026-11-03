import {loadFont} from '@remotion/google-fonts/Inter';

export const {fontFamily} = loadFont('normal', {weights: ['500', '700', '800', '900'], subsets: ['latin']});

export const W = 1080;
export const H = 1920;
export const FPS = 30;

// one palette for every video: orange = the thing we follow, red = danger/loss, teal = comparison
export const C = {
  bg0: '#08121d',
  bg1: '#0f2131',
  panel: 'rgba(255,255,255,0.045)',
  border: 'rgba(255,255,255,0.13)',
  text: '#eaf0f6',
  muted: '#8193a8',
  orange: '#ffb547',
  red: '#ff5d50',
  teal: '#3fd2c2',
};

export const glow = (color: string, r = 24) => `0 0 ${r}px ${color}, 0 0 ${r * 2}px ${color}55`;
