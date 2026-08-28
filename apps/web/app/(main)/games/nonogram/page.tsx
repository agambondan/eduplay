import { Metadata } from 'next';
import { gameMetadata } from '@/lib/games-seo';
import Nonogram from '@/components/games/dynamic/NonogramDynamic';
import { GameJsonLd } from '@/components/seo/JsonLd';
import { GameContainer } from '@/components/ui/GameContainer';

export const metadata: Metadata = gameMetadata('nonogram');

export default function NonogramPage() {
  return (
    <>
      <GameJsonLd
        name="Nonogram"
        description="Asah logika dengan mengungkapkan gambar tersembunyi lewat Nonogram!"
        gameSlug="nonogram"
      />
      <GameContainer>
        <Nonogram />
      </GameContainer>
    </>
  );
}
