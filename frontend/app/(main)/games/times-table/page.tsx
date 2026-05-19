import TimesTable from '@/components/games/TimesTable';

export const metadata = {
  title: 'Times Table Challenge | EduPlay',
  description: 'Latih perkalian 1-12 dengan cara seru!',
};

export default function TimesTablePage() {
  return (
    <div className="container max-w-2xl py-8">
      <TimesTable />
    </div>
  );
}
