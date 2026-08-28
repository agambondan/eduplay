import { Metadata } from 'next';
import { gameMetadata } from '@/lib/games-seo';
import MentalMath from '@/components/games/dynamic/MentalMathDynamic';
import { GameJsonLd } from '@/components/seo/JsonLd';
import { GameContainer } from '@/components/ui/GameContainer';

export const metadata: Metadata = gameMetadata('mental-math');

export default function MentalMathPage() {
  return (
    <>
      <GameJsonLd
        name="Mental Math Speed"
        description="Uji kecepatan berhitungmu dengan mengetik jawaban secepat mungkin!"
        gameSlug="mental-math"
      />
      <GameContainer>
        <MentalMath />
      </GameContainer>
    </>
  );
}
