import { Metadata } from 'next';
import { gameMetadata } from '@/lib/games-seo';
import Sudoku from '@/components/games/dynamic/SudokuDynamic';
import { GameJsonLd } from '@/components/seo/JsonLd';
import { GameContainer } from '@/components/ui/GameContainer';

export const metadata: Metadata = gameMetadata('sudoku');

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
