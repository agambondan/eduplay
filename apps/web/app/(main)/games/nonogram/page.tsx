import Nonogram from '@/components/games/Nonogram';

export const metadata = {
  title: 'Nonogram | EduPlay',
  description: 'Asah logika dengan mengungkapkan gambar tersembunyi lewat Nonogram!',
};

export default function NonogramPage() {
  return (
    <div className="container max-w-2xl py-8">
      <Nonogram />
    </div>
  );
}
