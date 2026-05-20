import { Metadata } from 'next';
import MentalMath from '@/components/games/MentalMath';
import { GameJsonLd } from '@/components/seo/JsonLd';

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
      <GameJsonLd name="Mental Math Speed" description="Uji kecepatan berhitungmu dengan mengetik jawaban secepat mungkin!" gameSlug="mental-math" />
      <div className="container max-w-2xl py-8">
        <MentalMath />
      </div>
    </>
  );
}
