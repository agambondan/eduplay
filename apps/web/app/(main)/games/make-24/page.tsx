import { Metadata } from 'next';
import { gameMetadata } from '@/lib/games-seo';
import Make24 from '@/components/games/dynamic/Make24Dynamic';
import { GameJsonLd } from '@/components/seo/JsonLd';
import { GameContainer } from '@/components/ui/GameContainer';

export const metadata: Metadata = gameMetadata('make-24');

export default function Make24Page() {
  return (
    <>
      <GameJsonLd
        name="Make 24"
        description="Susun 4 angka dengan operasi matematika agar tepat menghasilkan 24!"
        gameSlug="make-24"
      />
      <GameContainer>
        <Make24 />
      </GameContainer>
    </>
  );
}
