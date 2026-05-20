import { Metadata } from 'next';
import SnakeGame from '@/components/games/dynamic/SnakeGameDynamic';
import { GameJsonLd } from '@/components/seo/JsonLd';
import { GameContainer } from '@/components/ui/GameContainer';

export async function generateMetadata(): Promise<Metadata> {
    return {
        title: 'Snake Classic | EduPlay',
        description: 'Game snake klasik — makan bola, panjangkan ular, jangan sampai menabrak dirimu sendiri!',
        openGraph: {
            title: 'Snake Classic | EduPlay',
            description: 'Game snake klasik yang seru dan adiktif.',
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: 'Snake Classic | EduPlay',
            description: 'Game snake klasik yang seru dan adiktif.',
        },
    };
}

export default function SnakePage() {
    return (
        <>
            <GameJsonLd
                name='Snake Classic'
                description='Game snake klasik — makan bola, panjangkan ular, jangan sampai menabrak dirimu sendiri!'
                gameSlug='snake'
            />
            <GameContainer>
                <div className='mb-6 text-center'>
                    <h1 className='text-2xl font-bold'>Snake Classic</h1>
                    <p className='mt-1 text-gray-500 dark:text-slate-400'>
                        WASD / Arrow keys di desktop • Swipe di mobile
                    </p>
                </div>
                <div className='flex justify-center'>
                    <SnakeGame />
                </div>
            </GameContainer>
        </>
    );
}
