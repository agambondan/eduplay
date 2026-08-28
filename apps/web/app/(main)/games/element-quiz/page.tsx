import { Metadata } from 'next';
import { gameMetadata } from '@/lib/games-seo';
import ElementQuiz from '@/components/games/dynamic/ElementQuizDynamic';
import { GameJsonLd } from '@/components/seo/JsonLd';
import { GameContainer } from '@/components/ui/GameContainer';

export const metadata: Metadata = gameMetadata('element-quiz');

export default function ElementQuizPage() {
  return (
    <>
      <GameJsonLd
        name="Element Quiz"
        description="Tebak nama unsur kimia dari simbolnya!"
        gameSlug="element-quiz"
      />
      <GameContainer>
        <ElementQuiz />
      </GameContainer>
    </>
  );
}
