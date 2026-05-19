import Game2048 from '@/components/games/Game2048';

export const metadata = {
  title: '2048 | EduPlay',
  description: 'Gabungkan angka-angka hingga mencapai 2048!',
};

export default function Game2048Page() {
  return (
    <div className="container max-w-2xl py-8">
      <Game2048 />
    </div>
  );
}
