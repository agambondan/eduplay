import { Metadata } from 'next';
import { gameMetadata } from '@/lib/games-seo';
import GridRelayTD from '@/components/games/dynamic/GridRelayTDDynamic';
import { GameJsonLd } from '@/components/seo/JsonLd';
import { GameContainer } from '@/components/ui/GameContainer';

export const metadata: Metadata = gameMetadata('grid-relay-td');

export default function GridRelayTDPage() {
  return (
    <>
      <GameJsonLd
        name="Grid Relay TD"
        description="Atur distribusi daya listrik dan bangun jaringan turret untuk menahan serangan musuh geometris!"
        gameSlug="grid-relay-td"
      />
      <GameContainer maxWidth="max-w-4xl">
        <GridRelayTD />
      </GameContainer>
    </>
  );
}
