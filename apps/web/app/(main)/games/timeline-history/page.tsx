import { Metadata } from 'next';
import { gameMetadata } from '@/lib/games-seo';
import TimelineHistory from '@/components/games/dynamic/TimelineHistoryDynamic';
import { GameJsonLd } from '@/components/seo/JsonLd';
import { GameContainer } from '@/components/ui/GameContainer';

export const metadata: Metadata = gameMetadata('timeline-history');

export default function TimelineHistoryPage() {
  return (
    <>
      <GameJsonLd
        name="Timeline History"
        description="Tebak tahun kejadian penting di Indonesia dan Dunia!"
        gameSlug="timeline-history"
      />
      <GameContainer maxWidth="max-w-4xl">
        <TimelineHistory />
      </GameContainer>
    </>
  );
}
