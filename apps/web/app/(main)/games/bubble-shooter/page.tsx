import { Metadata } from 'next';
import BubbleShooter from '@/components/games/dynamic/BubbleShooterDynamic';
import { GameJsonLd } from '@/components/seo/JsonLd';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Bubble Shooter Math | EduPlay',
    description: 'Tembak bubble dan jumlahkan angka dengan tepat!',
    openGraph: {
      title: 'Bubble Shooter Math | EduPlay',
      description: 'Tembak bubble dan jumlahkan angka dengan tepat!',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Bubble Shooter Math | EduPlay',
      description: 'Tembak bubble dan jumlahkan angka dengan tepat!',
    },
  };
}

export default function BubbleShooterPage() {
  return (
    <>
      <GameJsonLd name="Bubble Shooter Math" description="Tembak bubble dan jumlahkan angka dengan tepat!" gameSlug="bubble-shooter" />
      <div className="container max-w-4xl py-8">
        <BubbleShooter />
      </div>
    </>
  );
}
