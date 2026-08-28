import { Metadata } from 'next';
import { gameMetadata } from '@/lib/games-seo';
import MathQuiz from '@/components/games/dynamic/MathQuizDynamic';
import { GameJsonLd } from '@/components/seo/JsonLd';
import { GameContainer } from '@/components/ui/GameContainer';

export const metadata: Metadata = gameMetadata('math-quiz');

export default function MathQuizPage() {
  return (
    <>
      <GameJsonLd
        name="Math Quiz Blitz"
        description="Uji kecepatan berhitungmu dalam 60 detik!"
        gameSlug="math-quiz"
      />
      <GameContainer>
        <MathQuiz />
      </GameContainer>
    </>
  );
}
