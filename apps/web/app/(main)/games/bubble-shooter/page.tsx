import { Metadata } from 'next';
import { gameMetadata } from '@/lib/games-seo';
import BubbleShooter from '@/components/games/dynamic/BubbleShooterDynamic';
import { GameJsonLd } from '@/components/seo/JsonLd';
import { GameContainer } from '@/components/ui/GameContainer';

export const metadata: Metadata = gameMetadata('bubble-shooter');

export default function BubbleShooterPage() {
  return (
    <>
      <GameJsonLd
        name="Bubble Shooter Math"
        description="Tembak bubble dan jumlahkan angka dengan tepat!"
        gameSlug="bubble-shooter"
      />
      <GameContainer maxWidth="max-w-4xl">
        <BubbleShooter />
      </GameContainer>
    </>
  );
}
