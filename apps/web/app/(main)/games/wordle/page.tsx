import { Metadata } from 'next';
import Wordle from '@/components/games/Wordle';
import { GameJsonLd } from '@/components/seo/JsonLd';

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
      <GameJsonLd name="Wordle Indonesia" description="Tebak kata 5 huruf Bahasa Indonesia dalam 6 percobaan!" gameSlug="wordle" />
      <div className="container max-w-2xl py-8 text-center">
        <h1 className="mb-4 text-2xl font-bold">Wordle Indonesia</h1>
        <Wordle />
      </div>
    </>
  );
}
