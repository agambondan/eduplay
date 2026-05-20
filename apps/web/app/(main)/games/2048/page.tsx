import { Metadata } from 'next';
import Game2048 from '@/components/games/dynamic/Game2048Dynamic';
import { GameJsonLd } from '@/components/seo/JsonLd';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: '2048 | EduPlay',
    description: 'Gabungkan angka-angka hingga mencapai 2048!',
    openGraph: {
      title: '2048 | EduPlay',
      description: 'Gabungkan angka-angka hingga mencapai 2048!',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: '2048 | EduPlay',
      description: 'Gabungkan angka-angka hingga mencapai 2048!',
    },
  };
}

export default function Game2048Page() {
  return (
    <>
      <GameJsonLd name="2048" description="Gabungkan angka-angka hingga mencapai 2048!" gameSlug="2048" />
      <div className="container max-w-2xl py-8">
        <Game2048 />
      </div>
    </>
  );
}
