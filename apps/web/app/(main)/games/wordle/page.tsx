import { Metadata } from 'next';
import Wordle from '@/components/games/dynamic/WordleDynamic';
import { GameJsonLd } from '@/components/seo/JsonLd';
import { GameContainer } from '@/components/ui/GameContainer';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Wordle Indonesia | EduPlay',
    description: 'Tebak kata 5 huruf Bahasa Indonesia dalam 6 percobaan!',
    openGraph: {
      title: 'Wordle Indonesia | EduPlay',
      description: 'Tebak kata 5 huruf Bahasa Indonesia dalam 6 percobaan!',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Wordle Indonesia | EduPlay',
      description: 'Tebak kata 5 huruf Bahasa Indonesia dalam 6 percobaan!',
    },
  };
}

export default function WordlePage() {
  return (
    <>
      <GameJsonLd
        name="Wordle Indonesia"
        description="Tebak kata 5 huruf Bahasa Indonesia dalam 6 percobaan!"
        gameSlug="wordle"
      />
      <GameContainer className="text-center">
        <h1 className="mb-4 text-2xl font-bold">Wordle Indonesia</h1>
        <Wordle />
      </GameContainer>
    </>
  );
}
