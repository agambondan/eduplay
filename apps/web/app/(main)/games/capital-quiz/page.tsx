import CapitalQuiz from '@/components/games/CapitalQuiz';

export const metadata = {
  title: 'Capital City Quiz | EduPlay',
  description: 'Tebak ibukota negara-negara di dunia!',
};

export default function CapitalQuizPage() {
  return (
    <div className="container max-w-2xl py-8">
      <CapitalQuiz />
    </div>
  );
}
