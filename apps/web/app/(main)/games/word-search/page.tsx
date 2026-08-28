import { Metadata } from 'next';
import { gameMetadata } from '@/lib/games-seo';
import WordSearch from '@/components/games/dynamic/WordSearchDynamic';
import { GameJsonLd } from '@/components/seo/JsonLd';
import { GameContainer } from '@/components/ui/GameContainer';

export const metadata: Metadata = gameMetadata('word-search');

export default function WordSearchPage() {
  return (
    <>
      <GameJsonLd
        name="Word Search"
        description="Asah ketelitianmu dengan mencari kata-kata tersembunyi!"
        gameSlug="word-search"
      />
      <GameContainer maxWidth="max-w-4xl">
        <WordSearch />
      </GameContainer>
    </>
  );
}
