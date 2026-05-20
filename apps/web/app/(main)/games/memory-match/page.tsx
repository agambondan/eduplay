import { Metadata } from 'next';
import MemoryMatch from '@/components/games/dynamic/MemoryMatchDynamic';
import { GameJsonLd } from '@/components/seo/JsonLd';

export async function generateMetadata(): Promise<Metadata> {
    return {
        title: 'Memory Match | EduPlay',
        description: 'Cocokkan pasangan kartu dalam waktu tercepat. Latih daya ingat dan konsentrasimu!',
        openGraph: {
            title: 'Memory Match | EduPlay',
            description: 'Cocokkan pasangan kartu dalam waktu tercepat.',
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: 'Memory Match | EduPlay',
            description: 'Cocokkan pasangan kartu dalam waktu tercepat.',
        },
    };
}

export default function MemoryMatchPage() {
    return (
        <>
            <GameJsonLd
                name='Memory Match'
                description='Cocokkan pasangan kartu dalam waktu tercepat. Latih daya ingat dan konsentrasimu!'
                gameSlug='memory-match'
            />
            <div className='container max-w-2xl py-8'>
                <div className='mb-6 text-center'>
                    <h1 className='text-2xl font-bold'>Memory Match</h1>
                    <p className='mt-1 text-gray-500 dark:text-slate-400'>
                        Cocokkan semua pasangan kartu secepat mungkin!
                    </p>
                </div>
                <MemoryMatch />
            </div>
        </>
    );
}
