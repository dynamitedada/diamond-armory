import { Composition } from 'remotion';
import { Promo, PROMO_SECONDS } from './Promo';
import { FPS } from './theme';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Promo" component={Promo} durationInFrames={PROMO_SECONDS * FPS} fps={FPS} width={1920} height={1080} />
    <Composition id="PromoVertical" component={Promo} durationInFrames={PROMO_SECONDS * FPS} fps={FPS} width={1080} height={1920} />
  </>
);
