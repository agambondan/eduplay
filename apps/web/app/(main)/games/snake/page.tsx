import { Metadata } from 'next';
import { gameMetadata } from '@/lib/games-seo';
import SnakeGame from '@/components/games/dynamic/SnakeGameDynamic';
import { GameJsonLd } from '@/components/seo/JsonLd';
import { GameContainer } from '@/components/ui/GameContainer';

export const metadata: Metadata = gameMetadata('snake');

export default function SnakePage() {
  return (
    <>
      <GameJsonLd
        name="Snake Classic"
        description="Game snake klasik — makan bola, panjangkan ular, jangan sampai menabrak dirimu sendiri!"
        gameSlug="snake"
      />
      <GameContainer>
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">Snake Classic</h1>
          <p className="mt-1 text-gray-500 dark:text-slate-400">
            WASD / Arrow keys di desktop • Swipe di mobile
          </p>
        </div>
        <div className="flex justify-center">
          <SnakeGame />
        </div>
      </GameContainer>
    </>
  );
}
