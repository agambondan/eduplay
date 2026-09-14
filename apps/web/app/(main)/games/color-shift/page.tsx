import { Metadata } from 'next';
import { gameMetadata } from '@/lib/games-seo';
import ColorShift from '@/components/games/dynamic/ColorShiftDynamic';
import { GameJsonLd } from '@/components/seo/JsonLd';
import { GameContainer } from '@/components/ui/GameContainer';

export const metadata: Metadata = gameMetadata('color-shift');

export default function ColorShiftPage() {
  return (
    <>
      <GameJsonLd
        name="Color Shift"
        description="Uji fokus dan refleks otak melawan ilusi efek Stroop warna vs kata!"
        gameSlug="color-shift"
      />
      <GameContainer>
        <ColorShift />
      </GameContainer>
    </>
  );
}
