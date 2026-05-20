import { Metadata } from 'next';
import SimonSays from '@/components/games/dynamic/SimonSaysDynamic';
import { GameJsonLd } from '@/components/seo/JsonLd';

export async function generateMetadata(): Promise<Metadata> {
    return {
        title: 'Simon Says | EduPlay',
        description: 'Ingat dan ulangi urutan warna yang menyala. Sampai berapa level kamu bisa bertahan?',
        openGraph: {
            title: 'Simon Says | EduPlay',
            description: 'Ingat dan ulangi urutan warna yang menyala.',
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: 'Simon Says | EduPlay',
            description: 'Ingat dan ulangi urutan warna yang menyala.',
        },
    };
}

export default function SimonSaysPage() {
    return (
        <>
            <GameJsonLd
                name='Simon Says'
                description='Ingat dan ulangi urutan warna yang menyala. Sampai berapa level kamu bisa bertahan?'
                gameSlug='simon-says'
            />
            <div className='container max-w-lg py-8'>
                <div className='mb-6 text-center'>
                    <h1 className='text-2xl font-bold'>Simon Says</h1>
                    <p className='mt-1 text-gray-500 dark:text-slate-400'>
                        Ingat urutan warna, lalu ulangi dengan benar!
                    </p>
                </div>
                <SimonSays />
            </div>
        </>
    );
}
