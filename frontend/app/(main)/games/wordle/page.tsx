import Wordle from '@/components/games/Wordle';

export const metadata = {
  title: 'Wordle Indonesia | EduPlay',
  description: 'Tebak kata 5 huruf Bahasa Indonesia!',
};

export default function WordlePage() {
  return (
    <div className="container max-w-2xl py-8 text-center">
      <h1 className="text-2xl font-bold mb-4">Wordle Indonesia</h1>
      <Wordle />
    </div>
  );
}
