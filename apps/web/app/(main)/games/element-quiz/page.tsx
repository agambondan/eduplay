import { Metadata } from 'next';
import ElementQuiz from '@/components/games/dynamic/ElementQuizDynamic';
import { GameJsonLd } from '@/components/seo/JsonLd';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Element Quiz | EduPlay',
    description: 'Tebak nama unsur kimia dari simbolnya!',
    openGraph: {
      title: 'Element Quiz | EduPlay',
      description: 'Tebak nama unsur kimia dari simbolnya!',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Element Quiz | EduPlay',
      description: 'Tebak nama unsur kimia dari simbolnya!',
    },
  };
}

export default function ElementQuizPage() {
  return (
    <>
      <GameJsonLd
        name="Element Quiz"
        description="Tebak nama unsur kimia dari simbolnya!"
        gameSlug="element-quiz"
      />
      <div className="container max-w-2xl py-8">
        <ElementQuiz />
      </div>
    </>
  );
}
