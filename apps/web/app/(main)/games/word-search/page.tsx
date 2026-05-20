import { Metadata } from 'next';
import WordSearch from '@/components/games/WordSearch';
import { GameJsonLd } from '@/components/seo/JsonLd';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Word Search | EduPlay',
    description: 'Asah ketelitianmu dengan mencari kata-kata tersembunyi!',
    openGraph: {
      title: 'Word Search | EduPlay',
      description: 'Asah ketelitianmu dengan mencari kata-kata tersembunyi!',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Word Search | EduPlay',
      description: 'Asah ketelitianmu dengan mencari kata-kata tersembunyi!',
    },
  };
}

export default function WordSearchPage() {
  return (
    <>
      <GameJsonLd name="Word Search" description="Asah ketelitianmu dengan mencari kata-kata tersembunyi!" gameSlug="word-search" />
      <div className="container max-w-4xl py-8">
        <WordSearch />
      </div>
    </>
  );
}
