import { Metadata } from 'next';
import { gameMetadata } from '@/lib/games-seo';
import SimonSays from '@/components/games/dynamic/SimonSaysDynamic';
import { GameJsonLd } from '@/components/seo/JsonLd';
import { GameContainer } from '@/components/ui/GameContainer';

export const metadata: Metadata = gameMetadata('simon-says');

export default function SimonSaysPage() {
  return (
    <>
      <GameJsonLd
        name="Simon Says"
        description="Ingat dan ulangi urutan warna yang menyala. Sampai berapa level kamu bisa bertahan?"
        gameSlug="simon-says"
      />
      <GameContainer maxWidth="max-w-lg">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">Simon Says</h1>
          <p className="mt-1 text-gray-500 dark:text-slate-400">
            Ingat urutan warna, lalu ulangi dengan benar!
          </p>
        </div>
        <SimonSays />
      </GameContainer>
    </>
  );
}
