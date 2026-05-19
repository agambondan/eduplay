import BrickBreaker from '@/components/games/BrickBreaker';

export const metadata = {
  title: 'Brick Breaker Soal | EduPlay',
  description: 'Hancurkan block dan jawab soal matematika dadakan untuk bonus skor!',
};

export default function BrickBreakerPage() {
  return (
    <div className="container max-w-4xl py-8">
      <BrickBreaker />
    </div>
  );
}
