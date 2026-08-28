import { Metadata } from 'next';
import { gameMetadata } from '@/lib/games-seo';
import TimesTable from '@/components/games/dynamic/TimesTableDynamic';
import { GameJsonLd } from '@/components/seo/JsonLd';
import { GameContainer } from '@/components/ui/GameContainer';

export const metadata: Metadata = gameMetadata('times-table');

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
