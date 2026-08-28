import { Metadata } from 'next';
import { gameMetadata } from '@/lib/games-seo';
import BrickBreaker from '@/components/games/dynamic/BrickBreakerDynamic';
import { GameJsonLd } from '@/components/seo/JsonLd';
import { GameContainer } from '@/components/ui/GameContainer';

export const metadata: Metadata = gameMetadata('brick-breaker');

export default function BrickBreakerPage() {
  return (
    <>
      <GameJsonLd
        name="Brick Breaker Soal"
        description="Hancurkan block dan jawab soal matematika dadakan untuk bonus skor!"
        gameSlug="brick-breaker"
      />
      <GameContainer maxWidth="max-w-4xl">
        <BrickBreaker />
      </GameContainer>
    </>
  );
}
