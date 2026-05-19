import Crossword from '@/components/games/Crossword';

export const metadata = {
  title: 'Crossword Indonesia | EduPlay',
  description: 'Uji wawasan kosakata dengan Teka-Teki Silang!',
};

export default function CrosswordPage() {
  return (
    <div className="container max-w-4xl py-8">
      <Crossword />
    </div>
  );
}
