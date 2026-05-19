import SpellingBee from '@/components/games/SpellingBee';

export const metadata = {
  title: 'Spelling Bee | EduPlay',
  description: 'Susun huruf acak menjadi kata yang benar!',
};

export default function SpellingBeePage() {
  return (
    <div className="container max-w-2xl py-8">
      <SpellingBee />
    </div>
  );
}
