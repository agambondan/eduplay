import { Metadata } from 'next';
import TimelineHistory from '@/components/games/TimelineHistory';
import { GameJsonLd } from '@/components/seo/JsonLd';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Timeline History | EduPlay',
    description: 'Tebak tahun kejadian penting di Indonesia dan Dunia!',
    openGraph: {
      title: 'Timeline History | EduPlay',
      description: 'Tebak tahun kejadian penting di Indonesia dan Dunia!',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Timeline History | EduPlay',
      description: 'Tebak tahun kejadian penting di Indonesia dan Dunia!',
    },
  };
}

export default function TimelineHistoryPage() {
  return (
    <>
      <GameJsonLd name="Timeline History" description="Tebak tahun kejadian penting di Indonesia dan Dunia!" gameSlug="timeline-history" />
      <div className="container max-w-4xl py-8">
        <TimelineHistory />
      </div>
    </>
  );
}
