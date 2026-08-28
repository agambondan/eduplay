import { Metadata } from 'next';
import { gameMetadata } from '@/lib/games-seo';
import SpellingBee from '@/components/games/dynamic/SpellingBeeDynamic';
import { GameJsonLd } from '@/components/seo/JsonLd';
import { GameContainer } from '@/components/ui/GameContainer';

export const metadata: Metadata = gameMetadata('spelling-bee');

export default function SpellingBeePage() {
  return (
    <>
      <GameJsonLd
        name="Spelling Bee"
        description="Susun huruf acak menjadi kata yang benar!"
        gameSlug="spelling-bee"
      />
      <GameContainer>
        <SpellingBee />
      </GameContainer>
    </>
  );
}
