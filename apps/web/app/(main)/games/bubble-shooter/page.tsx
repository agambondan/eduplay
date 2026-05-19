import BubbleShooter from '@/components/games/BubbleShooter';

export const metadata = {
  title: 'Bubble Shooter Math | EduPlay',
  description: 'Tembak bubble dan jumlahkan angka dengan tepat!',
};

export default function BubbleShooterPage() {
  return (
    <div className="container max-w-4xl py-8">
      <BubbleShooter />
    </div>
  );
}
