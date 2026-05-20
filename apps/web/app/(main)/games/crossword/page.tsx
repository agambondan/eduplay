import { Metadata } from 'next';
import Crossword from '@/components/games/dynamic/CrosswordDynamic';
import { GameJsonLd } from '@/components/seo/JsonLd';
import { GameContainer } from '@/components/ui/GameContainer';

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
      <GameJsonLd
        name="Crossword Indonesia"
        description="Uji wawasan kosakata dengan Teka-Teki Silang!"
        gameSlug="crossword"
      />
      <GameContainer maxWidth="max-w-4xl">
        <Crossword />
      </GameContainer>
    </>
  );
}
