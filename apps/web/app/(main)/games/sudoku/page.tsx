import { Metadata } from 'next';
import Sudoku from '@/components/games/dynamic/SudokuDynamic';
import { GameJsonLd } from '@/components/seo/JsonLd';
import { GameContainer } from '@/components/ui/GameContainer';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Sudoku | EduPlay',
    description: 'Asah logika dengan teka-teki Sudoku!',
    openGraph: {
      title: 'Sudoku | EduPlay',
      description: 'Asah logika dengan teka-teki Sudoku!',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Sudoku | EduPlay',
      description: 'Asah logika dengan teka-teki Sudoku!',
    },
  };
}

export default function SudokuPage() {
  return (
    <>
      <GameJsonLd
        name="Sudoku"
        description="Asah logika dengan teka-teki Sudoku!"
        gameSlug="sudoku"
      />
      <GameContainer>
        <Sudoku />
      </GameContainer>
    </>
  );
}
