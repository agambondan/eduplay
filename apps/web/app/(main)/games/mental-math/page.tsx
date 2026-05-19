import MentalMath from '@/components/games/MentalMath';

export const metadata = {
  title: 'Mental Math Speed | EduPlay',
  description: 'Uji kecepatan berhitungmu dengan mengetik jawaban secepat mungkin!',
};

export default function MentalMathPage() {
  return (
    <div className="container max-w-2xl py-8">
      <MentalMath />
    </div>
  );
}
