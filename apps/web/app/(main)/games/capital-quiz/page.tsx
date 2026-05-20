import { Metadata } from 'next';
import CapitalQuiz from '@/components/games/dynamic/CapitalQuizDynamic';
import { GameJsonLd } from '@/components/seo/JsonLd';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Capital City Quiz | EduPlay',
    description: 'Tebak ibukota negara-negara di dunia!',
    openGraph: {
      title: 'Capital City Quiz | EduPlay',
      description: 'Tebak ibukota negara-negara di dunia!',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Capital City Quiz | EduPlay',
      description: 'Tebak ibukota negara-negara di dunia!',
    },
  };
}

export default function CapitalQuizPage() {
  return (
    <>
      <GameJsonLd
        name="Capital City Quiz"
        description="Tebak ibukota negara-negara di dunia!"
        gameSlug="capital-quiz"
      />
      <div className="container max-w-2xl py-8">
        <CapitalQuiz />
      </div>
    </>
  );
}
