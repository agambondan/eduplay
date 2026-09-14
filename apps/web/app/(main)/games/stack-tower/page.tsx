import { Metadata } from 'next';
import { gameMetadata } from '@/lib/games-seo';
import StackTower from '@/components/games/dynamic/StackTowerDynamic';
import { GameJsonLd } from '@/components/seo/JsonLd';
import { GameContainer } from '@/components/ui/GameContainer';

export const metadata: Metadata = gameMetadata('stack-tower');

export default function StackTowerPage() {
  return (
    <>
      <GameJsonLd
        name="Stack Tower"
        description="Tumpuk balok setinggi mungkin dengan presisi timing sempurna!"
        gameSlug="stack-tower"
      />
      <GameContainer maxWidth="max-w-md">
        <StackTower />
      </GameContainer>
    </>
  );
}
