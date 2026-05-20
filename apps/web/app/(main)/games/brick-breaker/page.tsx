import { Metadata } from 'next';
import BrickBreaker from '@/components/games/dynamic/BrickBreakerDynamic';
import { GameJsonLd } from '@/components/seo/JsonLd';
import { GameContainer } from '@/components/ui/GameContainer';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Brick Breaker Soal | EduPlay',
    description: 'Hancurkan block dan jawab soal matematika dadakan untuk bonus skor!',
    openGraph: {
      title: 'Brick Breaker Soal | EduPlay',
      description: 'Hancurkan block dan jawab soal matematika dadakan untuk bonus skor!',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Brick Breaker Soal | EduPlay',
      description: 'Hancurkan block dan jawab soal matematika dadakan untuk bonus skor!',
    },
  };
}

export default function BrickBreakerPage() {
  return (
    <>
      <GameJsonLd
        name="Brick Breaker Soal"
        description="Hancurkan block dan jawab soal matematika dadakan untuk bonus skor!"
        gameSlug="brick-breaker"
      />
      <GameContainer maxWidth="max-w-4xl">
        <BrickBreaker />
      </GameContainer>
    </>
  );
}
