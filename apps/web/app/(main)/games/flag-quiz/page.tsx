import { Metadata } from 'next';
import FlagQuiz from '@/components/games/dynamic/FlagQuizDynamic';
import { GameJsonLd } from '@/components/seo/JsonLd';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Flag Quiz | EduPlay',
    description: 'Tebak nama negara dari gambar benderanya!',
    openGraph: {
      title: 'Flag Quiz | EduPlay',
      description: 'Tebak nama negara dari gambar benderanya!',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Flag Quiz | EduPlay',
      description: 'Tebak nama negara dari gambar benderanya!',
    },
  };
}

export default function FlagQuizPage() {
  return (
    <>
      <GameJsonLd
        name="Flag Quiz"
        description="Tebak nama negara dari gambar benderanya!"
        gameSlug="flag-quiz"
      />
      <div className="container max-w-2xl py-8">
        <FlagQuiz />
      </div>
    </>
  );
}
