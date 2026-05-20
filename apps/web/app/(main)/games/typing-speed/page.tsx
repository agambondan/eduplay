import { Metadata } from 'next';
import TypingSpeed from '@/components/games/dynamic/TypingSpeedDynamic';
import { GameJsonLd } from '@/components/seo/JsonLd';
import { GameContainer } from '@/components/ui/GameContainer';

export async function generateMetadata(): Promise<Metadata> {
    return {
        title: 'Typing Speed | EduPlay',
        description: 'Uji kecepatan mengetikmu! Ketik kata-kata Bahasa Indonesia secepat mungkin dalam 60 detik.',
        openGraph: {
            title: 'Typing Speed | EduPlay',
            description: 'Uji kecepatan mengetikmu dalam 60 detik.',
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: 'Typing Speed | EduPlay',
            description: 'Uji kecepatan mengetikmu dalam 60 detik.',
        },
    };
}

export default function TypingSpeedPage() {
    return (
        <>
            <GameJsonLd
                name='Typing Speed'
                description='Uji kecepatan mengetikmu! Ketik kata-kata Bahasa Indonesia secepat mungkin dalam 60 detik.'
                gameSlug='typing-speed'
            />
            <GameContainer>
                <div className='mb-6 text-center'>
                    <h1 className='text-2xl font-bold'>Typing Speed</h1>
                    <p className='mt-1 text-gray-500 dark:text-slate-400'>
                        Ketik kata yang muncul secepat mungkin dalam 60 detik!
                    </p>
                </div>
                <TypingSpeed />
            </GameContainer>
        </>
    );
}
