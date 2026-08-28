import { Metadata } from 'next';
import { gameMetadata } from '@/lib/games-seo';
import MathTournament from '@/components/games/MathTournament';
import { GameJsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = gameMetadata('math-tournament');

export default function MathTournamentPage() {
  return (
    <>
      <GameJsonLd
        name="Math Tournament"
        description="Buat bracket Math Tournament 4, 8, atau 16 pemain dengan seeding, bot fill, dan reward XP."
        gameSlug="math-tournament"
      />
      <MathTournament />
    </>
  );
}
