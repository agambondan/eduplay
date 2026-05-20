import { Metadata } from 'next';
import MentalMath from '@/components/games/dynamic/MentalMathDynamic';
import { GameJsonLd } from '@/components/seo/JsonLd';
import { GameContainer } from '@/components/ui/GameContainer';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Mental Math Speed | EduPlay',
    description: 'Uji kecepatan berhitungmu dengan mengetik jawaban secepat mungkin!',
    openGraph: {
      title: 'Mental Math Speed | EduPlay',
      description: 'Uji kecepatan berhitungmu dengan mengetik jawaban secepat mungkin!',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Mental Math Speed | EduPlay',
      description: 'Uji kecepatan berhitungmu dengan mengetik jawaban secepat mungkin!',
    },
  };
}

export default function MentalMathPage() {
  return (
    <>
      <GameJsonLd
        name="Mental Math Speed"
        description="Uji kecepatan berhitungmu dengan mengetik jawaban secepat mungkin!"
        gameSlug="mental-math"
      />
      <GameContainer>
        <MentalMath />
      </GameContainer>
    </>
  );
}
