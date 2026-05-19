import TimelineHistory from '@/components/games/TimelineHistory';

export const metadata = {
  title: 'Timeline History | EduPlay',
  description: 'Tebak tahun kejadian penting di Indonesia dan Dunia!',
};

export default function TimelineHistoryPage() {
  return (
    <div className="container max-w-4xl py-8">
      <TimelineHistory />
    </div>
  );
}
