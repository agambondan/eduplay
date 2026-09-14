import { Metadata } from 'next';
import { gameMetadata } from '@/lib/games-seo';
import VectorSlash from '@/components/games/dynamic/VectorSlashDynamic';
import { GameJsonLd } from '@/components/seo/JsonLd';
import { GameContainer } from '@/components/ui/GameContainer';

export const metadata: Metadata = gameMetadata('vector-slash');

export default function VectorSlashPage() {
  return (
    <>
      <GameJsonLd
        name="Vector Slash"
        description="Pertarungan geometris serba cepat dengan input gestur mouse & sentuhan!"
        gameSlug="vector-slash"
      />
      <GameContainer maxWidth="max-w-4xl">
        <VectorSlash />
      </GameContainer>
    </>
  );
}
