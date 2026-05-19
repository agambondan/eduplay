import FlagQuiz from '@/components/games/FlagQuiz';

export const metadata = {
  title: 'Flag Quiz | EduPlay',
  description: 'Tebak nama negara dari gambar benderanya!',
};

export default function FlagQuizPage() {
  return (
    <div className="container max-w-2xl py-8">
      <FlagQuiz />
    </div>
  );
}
