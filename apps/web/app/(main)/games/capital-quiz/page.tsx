import { Metadata } from 'next';
import { gameMetadata } from '@/lib/games-seo';
import CapitalQuiz from '@/components/games/dynamic/CapitalQuizDynamic';
import { GameJsonLd } from '@/components/seo/JsonLd';
import { GameContainer } from '@/components/ui/GameContainer';

export const metadata: Metadata = gameMetadata('capital-quiz');

export default function CapitalQuizPage() {
  return (
    <>
      <GameJsonLd
        name="Capital City Quiz"
        description="Tebak ibukota negara-negara di dunia!"
        gameSlug="capital-quiz"
      />
      <GameContainer>
        <CapitalQuiz />
      </GameContainer>
    </>
  );
}
