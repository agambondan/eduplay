'use client';

import { useState, useEffect, useCallback } from 'react';
import { useGame } from '@/lib/hooks/useGame';
import { ScoreBoard } from '@/components/ui/ScoreBoard';
import { Timer } from '@/components/ui/Timer';
import { Difficulty } from '@/types/game';
import { cn } from '@/lib/utils/cn';

interface Question {
  text: string;
  options: number[];
  answer: number;
}

function generateQuestion(difficulty: Difficulty): Question {
  let a: number, b: number, op: string, answer: number;

  const max = difficulty === 'easy' ? 20 : difficulty === 'medium' ? 100 : 1000;
  const ops = difficulty === 'hard' ? ['+', '-', '×', '÷'] : ['+', '-', '×'];
  op = ops[Math.floor(Math.random() * ops.length)];

  switch (op) {
    case '+':
      a = Math.floor(Math.random() * max) + 1;
      b = Math.floor(Math.random() * max) + 1;
      answer = a + b;
      break;
    case '-':
      a = Math.floor(Math.random() * max) + 1;
      b = Math.floor(Math.random() * a) + 1;
      answer = a - b;
      break;
    case '×':
      a = Math.floor(Math.random() * (difficulty === 'easy' ? 12 : 20)) + 1;
      b = Math.floor(Math.random() * (difficulty === 'easy' ? 12 : 20)) + 1;
      answer = a * b;
      break;
    case '÷':
      b = Math.floor(Math.random() * 12) + 1;
      answer = Math.floor(Math.random() * 12) + 1;
      a = b * answer;
      break;
    default:
      a = 1;
      b = 1;
      answer = 2;
  }

  const options = generateOptions(answer);

  return { text: `${a} ${op} ${b} = ?`, options, answer };
}

function generateOptions(answer: number): number[] {
  const opts = new Set<number>([answer]);
  while (opts.size < 4) {
    const offset = Math.floor(Math.random() * 10) + 1;
    const sign = Math.random() > 0.5 ? 1 : -1;
    const wrong = answer + offset * sign;
    if (wrong >= 0 && wrong !== answer) opts.add(wrong);
  }
  return [...opts].sort(() => Math.random() - 0.5);
}

export default function MathQuiz({ isDaily = false }: { isDaily?: boolean }) {
  const { score, isPlaying, difficulty, addScore, startGame, endGame, submitScore } =
    useGame('math-quiz');
  const [question, setQuestion] = useState<Question | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [result, setResult] = useState<{ xp: number; highscore: boolean } | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('easy');
  const [questionCount, setQuestionCount] = useState(0);

  const nextQuestion = useCallback(() => {
    setQuestion(generateQuestion(difficulty));
    setFeedback(null);
  }, [difficulty]);

  useEffect(() => {
    if (isPlaying) nextQuestion();
  }, [isPlaying, nextQuestion]);

  const handleAnswer = (selected: number) => {
    if (feedback) return;

    if (selected === question?.answer) {
      setFeedback('correct');
      addScore(10);
    } else {
      setFeedback('wrong');
      addScore(-3);
    }
    setQuestionCount((c) => c + 1);

    setTimeout(() => nextQuestion(), 600);
  };

  const handleTimeUp = useCallback(async () => {
    endGame();
    const res = await submitScore();
    if (res) setResult({ xp: res.xp_earned, highscore: res.new_highscore });
  }, [endGame, submitScore]);

  const handleStart = () => {
    setResult(null);
    setQuestionCount(0);
    startGame(selectedDifficulty);
  };

  if (!isPlaying && !result) {
    return (
      <div className="flex flex-col items-center gap-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Math Quiz Blitz</h1>
        <p className="max-w-md text-center text-gray-500 dark:text-slate-400">
          Jawab soal matematika secepat mungkin dalam 60 detik!
        </p>
        <div className="flex gap-2">
          {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
            <button
              key={d}
              onClick={() => setSelectedDifficulty(d)}
              className={cn(
                'rounded-lg px-4 py-2 font-medium capitalize transition-colors',
                selectedDifficulty === d
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              )}
            >
              {d}
            </button>
          ))}
        </div>
        <button
          onClick={handleStart}
          className="rounded-xl bg-emerald-500 px-8 py-3 text-lg font-bold text-white transition-colors hover:bg-emerald-600"
        >
          Mulai!
        </button>
      </div>
    );
  }

  if (!isPlaying && result) {
    return (
      <div className="flex flex-col items-center gap-4 py-10">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Game Over!</h2>
        <ScoreBoard score={score} label="Final Score" />
        <div className="space-y-1 text-center text-sm text-gray-500 dark:text-slate-400">
          <p>{questionCount} soal dijawab</p>
          <p>+{result.xp} XP earned</p>
          {result.highscore && <p className="font-bold text-amber-500">New Highscore!</p>}
        </div>
        <button
          onClick={handleStart}
          className="rounded-lg bg-indigo-600 px-6 py-2 font-bold text-white transition-colors hover:bg-indigo-700"
        >
          Main Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 py-6">
      <div className="flex items-center gap-4">
        <Timer initialSeconds={60} onTimeUp={handleTimeUp} isRunning={isPlaying} />
        <ScoreBoard score={score} />
      </div>

      {question && (
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <p className="font-mono text-3xl font-bold text-gray-900 dark:text-white">
              {question.text}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {question.options.map((opt, i) => (
              <button
                key={`${opt}-${i}`}
                onClick={() => handleAnswer(opt)}
                disabled={feedback !== null}
                className={cn(
                  'rounded-xl border-2 py-4 text-xl font-bold transition-all',
                  feedback === null
                    ? 'border-gray-200 bg-white text-gray-800 hover:border-indigo-400 hover:bg-indigo-50 active:scale-95 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:hover:border-indigo-500'
                    : opt === question.answer
                      ? 'border-emerald-500 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : feedback === 'wrong' && opt !== question.answer
                        ? 'border-gray-200 bg-gray-50 text-gray-400 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-500'
                        : 'border-gray-200 bg-gray-50 text-gray-400 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-500'
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
