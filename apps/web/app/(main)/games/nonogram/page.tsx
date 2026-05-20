import { Metadata } from 'next';
import Nonogram from '@/components/games/Nonogram';
import { GameJsonLd } from '@/components/seo/JsonLd';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Nonogram | EduPlay',
    description: 'Asah logika dengan mengungkapkan gambar tersembunyi lewat Nonogram!',
    openGraph: {
      title: 'Nonogram | EduPlay',
      description: 'Asah logika dengan mengungkapkan gambar tersembunyi lewat Nonogram!',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Nonogram | EduPlay',
      description: 'Asah logika dengan mengungkapkan gambar tersembunyi lewat Nonogram!',
    },
  };
}

export default function NonogramPage() {
  return (
    <>
      <GameJsonLd name="Nonogram" description="Asah logika dengan mengungkapkan gambar tersembunyi lewat Nonogram!" gameSlug="nonogram" />
      <div className="container max-w-2xl py-8">
        <Nonogram />
      </div>
    </>
  );
}
