import { Metadata } from 'next';
import SpellingBee from '@/components/games/SpellingBee';
import { GameJsonLd } from '@/components/seo/JsonLd';

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
      <GameJsonLd name="Spelling Bee" description="Susun huruf acak menjadi kata yang benar!" gameSlug="spelling-bee" />
      <div className="container max-w-2xl py-8">
        <SpellingBee />
      </div>
    </>
  );
}
