import WordSearch from '@/components/games/WordSearch';

export const metadata = {
  title: 'Word Search | EduPlay',
  description: 'Asah ketelitianmu dengan mencari kata-kata tersembunyi!',
};

export default function WordSearchPage() {
  return (
    <div className="container max-w-4xl py-8">
      <WordSearch />
    </div>
  );
}
