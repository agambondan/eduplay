import { Metadata } from 'next';
import { gameMetadata } from '@/lib/games-seo';
import MemoryMatch from '@/components/games/dynamic/MemoryMatchDynamic';
import { GameJsonLd } from '@/components/seo/JsonLd';
import { GameContainer } from '@/components/ui/GameContainer';

export const metadata: Metadata = gameMetadata('memory-match');

export default function MemoryMatchPage() {
  return (
    <>
      <GameJsonLd
        name="Memory Match"
        description="Cocokkan pasangan kartu dalam waktu tercepat. Latih daya ingat dan konsentrasimu!"
        gameSlug="memory-match"
      />
      <GameContainer>
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">Memory Match</h1>
          <p className="mt-1 text-gray-500 dark:text-slate-400">
            Cocokkan semua pasangan kartu secepat mungkin!
          </p>
        </div>
        <MemoryMatch />
      </GameContainer>
    </>
  );
}
