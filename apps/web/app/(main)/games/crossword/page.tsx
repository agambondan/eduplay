import { Metadata } from 'next';
import Crossword from '@/components/games/Crossword';
import { GameJsonLd } from '@/components/seo/JsonLd';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Crossword Indonesia | EduPlay',
    description: 'Uji wawasan kosakata dengan Teka-Teki Silang!',
    openGraph: {
      title: 'Crossword Indonesia | EduPlay',
      description: 'Uji wawasan kosakata dengan Teka-Teki Silang!',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Crossword Indonesia | EduPlay',
      description: 'Uji wawasan kosakata dengan Teka-Teki Silang!',
    },
  };
}

export default function CrosswordPage() {
  return (
    <>
      <GameJsonLd name="Crossword Indonesia" description="Uji wawasan kosakata dengan Teka-Teki Silang!" gameSlug="crossword" />
      <div className="container max-w-4xl py-8">
        <Crossword />
      </div>
    </>
  );
}
