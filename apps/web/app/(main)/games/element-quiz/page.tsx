import ElementQuiz from '@/components/games/ElementQuiz';

export const metadata = {
  title: 'Element Quiz | EduPlay',
  description: 'Tebak nama unsur kimia dari simbolnya!',
};

export default function ElementQuizPage() {
  return (
    <div className="container max-w-2xl py-8">
      <ElementQuiz />
    </div>
  );
}
