import { Metadata } from 'next';
import { gameMetadata } from '@/lib/games-seo';
import Game2048 from '@/components/games/dynamic/Game2048Dynamic';
import { GameJsonLd } from '@/components/seo/JsonLd';
import { GameContainer } from '@/components/ui/GameContainer';

export const metadata: Metadata = gameMetadata('2048');

export default function Game2048Page() {
  return (
    <>
      <GameJsonLd
        name="2048"
        description="Gabungkan angka-angka hingga mencapai 2048!"
        gameSlug="2048"
      />
      <GameContainer>
        <Game2048 />
      </GameContainer>
    </>
  );
}
