import { Metadata } from 'next';
import { gameMetadata } from '@/lib/games-seo';
import Wordle from '@/components/games/dynamic/WordleDynamic';
import { GameJsonLd } from '@/components/seo/JsonLd';
import { GameContainer } from '@/components/ui/GameContainer';

export const metadata: Metadata = gameMetadata('wordle');

export default function WordlePage() {
  return (
    <>
      <GameJsonLd
        name="Wordle Indonesia"
        description="Tebak kata 5 huruf Bahasa Indonesia dalam 6 percobaan!"
        gameSlug="wordle"
      />
      <GameContainer className="text-center">
        <h1 className="mb-4 text-2xl font-bold">Wordle Indonesia</h1>
        <Wordle />
      </GameContainer>
    </>
  );
}
