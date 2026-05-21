import { Metadata } from 'next'
import MathTournament from '@/components/games/MathTournament'
import { GameJsonLd } from '@/components/seo/JsonLd'

export async function generateMetadata(): Promise<Metadata> {
  const description =
    'Buat bracket Math Tournament 4, 8, atau 16 pemain dengan seeding, bot fill, dan reward XP.'

  return {
    title: 'Math Tournament | EduPlay',
    description,
    openGraph: {
      title: 'Math Tournament | EduPlay',
      description,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Math Tournament | EduPlay',
      description,
    },
  }
}

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
  )
}
