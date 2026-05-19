import Sudoku from '@/components/games/Sudoku';

export const metadata = {
  title: 'Sudoku | EduPlay',
  description: 'Asah logika dengan teka-teki Sudoku!',
};

export default function SudokuPage() {
  return (
    <div className="container max-w-2xl py-8">
      <Sudoku />
    </div>
  );
}
