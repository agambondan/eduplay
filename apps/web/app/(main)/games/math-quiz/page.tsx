import { Metadata } from 'next';
import MathQuiz from '@/components/games/MathQuiz';
import { GameJsonLd } from '@/components/seo/JsonLd';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Math Quiz Blitz | EduPlay',
    description: 'Uji kecepatan berhitungmu dalam 60 detik!',
    openGraph: {
      title: 'Math Quiz Blitz | EduPlay',
      description: 'Uji kecepatan berhitungmu dalam 60 detik!',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Math Quiz Blitz | EduPlay',
      description: 'Uji kecepatan berhitungmu dalam 60 detik!',
    },
  };
}

export default function MathQuizPage() {
  return (
    <>
      <GameJsonLd name="Math Quiz Blitz" description="Uji kecepatan berhitungmu dalam 60 detik!" gameSlug="math-quiz" />
      <div className="container max-w-2xl py-8">
        <MathQuiz />
      </div>
    </>
  );
}
