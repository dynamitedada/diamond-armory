import { loadFont } from '@remotion/fonts';
import { staticFile } from 'remotion';

// Fonts are bundled from @fontsource (copied to public/fonts by scripts/sync-assets.sh) so renders work offline.
export const DISPLAY = 'Bebas Neue';
export const BODY = 'Inter';
loadFont({ family: DISPLAY, url: staticFile('fonts/bebas-neue-latin-400-normal.woff2'), weight: '400' });
for (const w of ['400', '600', '700', '800']) loadFont({ family: BODY, url: staticFile(`fonts/inter-latin-${w}-normal.woff2`), weight: w });

// Lifted from the armory itself (src/App.css, src/ui/theme.ts) so the promo matches the product.
export const C = {
  ink: '#05060f',
  navy: '#0b0d1f',
  magenta: '#ff2bd6',
  pink: '#ff6ad5',
  gold: '#ffd100',
  cyan: '#4ad7ff',
  white: '#f4f5fb',
  dim: '#8a90a6',
  legendary: '#ff8000',
  epic: '#b75cff',
  rare: '#2f8fff',
  mythic: '#e6cc80',
};

export const FPS = 30;
export const BEAT = 15; // frames per beat at 120 BPM
export const BAR = 60;
export const s = (sec: number) => Math.round(sec * FPS);
