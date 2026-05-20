import { Metadata } from 'next';
import SpellingBee from '@/components/games/dynamic/SpellingBeeDynamic';
import { GameJsonLd } from '@/components/seo/JsonLd';
import { GameContainer } from '@/components/ui/GameContainer';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Spelling Bee | EduPlay',
    description: 'Susun huruf acak menjadi kata yang benar!',
    openGraph: {
      title: 'Spelling Bee | EduPlay',
      description: 'Susun huruf acak menjadi kata yang benar!',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Spelling Bee | EduPlay',
      description: 'Susun huruf acak menjadi kata yang benar!',
    },
  };
}

export default function SpellingBeePage() {
  return (
    <>
      <GameJsonLd
        name="Spelling Bee"
        description="Susun huruf acak menjadi kata yang benar!"
        gameSlug="spelling-bee"
      />
      <GameContainer>
        <SpellingBee />
      </GameContainer>
    </>
  );
}
