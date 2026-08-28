import { Metadata } from 'next';
import { gameMetadata } from '@/lib/games-seo';
import Crossword from '@/components/games/dynamic/CrosswordDynamic';
import { GameJsonLd } from '@/components/seo/JsonLd';
import { GameContainer } from '@/components/ui/GameContainer';

export const metadata: Metadata = gameMetadata('crossword');

export default function CrosswordPage() {
  return (
    <>
      <GameJsonLd
        name="Crossword Indonesia"
        description="Uji wawasan kosakata dengan Teka-Teki Silang!"
        gameSlug="crossword"
      />
      <GameContainer maxWidth="max-w-4xl">
        <Crossword />
      </GameContainer>
    </>
  );
}
