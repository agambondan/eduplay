import MathQuiz from '@/components/games/MathQuiz';

export const metadata = {
  title: 'Math Quiz Blitz | EduPlay',
  description: 'Uji kecepatan berhitungmu dalam 60 detik!',
};

export default function MathQuizPage() {
  return (
    <div className="container max-w-2xl py-8">
      <MathQuiz />
    </div>
  );
}
