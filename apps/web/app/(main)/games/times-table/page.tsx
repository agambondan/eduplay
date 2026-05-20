import { Metadata } from 'next';
import TimesTable from '@/components/games/dynamic/TimesTableDynamic';
import { GameJsonLd } from '@/components/seo/JsonLd';
import { GameContainer } from '@/components/ui/GameContainer';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Times Table Challenge | EduPlay',
    description: 'Latih perkalian 1-12 dengan cara seru!',
    openGraph: {
      title: 'Times Table Challenge | EduPlay',
      description: 'Latih perkalian 1-12 dengan cara seru!',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Times Table Challenge | EduPlay',
      description: 'Latih perkalian 1-12 dengan cara seru!',
    },
  };
}

export default function TimesTablePage() {
  return (
    <>
      <GameJsonLd
        name="Times Table Challenge"
        description="Latih perkalian 1-12 dengan cara seru!"
        gameSlug="times-table"
      />
      <GameContainer>
        <TimesTable />
      </GameContainer>
    </>
  );
}
