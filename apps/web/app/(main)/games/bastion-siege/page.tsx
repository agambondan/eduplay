import { Metadata } from 'next';
import { gameMetadata } from '@/lib/games-seo';
import BastionSiege from '@/components/games/dynamic/BastionSiegeDynamic';
import { GameJsonLd } from '@/components/seo/JsonLd';
import { GameContainer } from '@/components/ui/GameContainer';

export const metadata: Metadata = gameMetadata('bastion-siege');

export default function BastionSiegePage() {
  return (
    <>
      <GameJsonLd
        name="Bastion Siege"
        description="Pertahanan benteng berbasis fisika balistik parabola dan manipulasi lingkungan hancur!"
        gameSlug="bastion-siege"
      />
      <GameContainer maxWidth="max-w-4xl">
        <BastionSiege />
      </GameContainer>
    </>
  );
}
