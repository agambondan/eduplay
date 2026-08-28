import { Metadata } from 'next';
import { gameMetadata } from '@/lib/games-seo';
import FlagQuiz from '@/components/games/dynamic/FlagQuizDynamic';
import { GameJsonLd } from '@/components/seo/JsonLd';
import { GameContainer } from '@/components/ui/GameContainer';

export const metadata: Metadata = gameMetadata('flag-quiz');

export default function FlagQuizPage() {
  return (
    <>
      <GameJsonLd
        name="Flag Quiz"
        description="Tebak nama negara dari gambar benderanya!"
        gameSlug="flag-quiz"
      />
      <GameContainer>
        <FlagQuiz />
      </GameContainer>
    </>
  );
}
