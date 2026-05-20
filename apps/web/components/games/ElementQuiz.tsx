'use client';

import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Pause } from 'lucide-react';
import { AIQuestion, aiApi } from '@/lib/api/ai';
import { contentApi } from '@/lib/api/content';
import { useGame } from '@/lib/hooks/useGame';
import { useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils/cn';
import { HowToPlay } from '@/components/ui/HowToPlay';
import { ResultScreen } from '@/components/ui/ResultScreen';
import { ScoreBoard } from '@/components/ui/ScoreBoard';
import { Timer } from '@/components/ui/Timer';

interface ElementQuestion {
  symbol: string;
  name: string;
  options: string[];
}

const FALLBACK_ELEMENTS = [
  { symbol: 'H', name: 'Hidrogen' },
  { symbol: 'He', name: 'Helium' },
  { symbol: 'Li', name: 'Litium' },
  { symbol: 'Be', name: 'Berilium' },
  { symbol: 'B', name: 'Boron' },
  { symbol: 'C', name: 'Karbon' },
  { symbol: 'N', name: 'Nitrogen' },
  { symbol: 'O', name: 'Oksigen' },
  { symbol: 'F', name: 'Fluorin' },
  { symbol: 'Ne', name: 'Neon' },
  { symbol: 'Na', name: 'Natrium' },
  { symbol: 'Mg', name: 'Magnesium' },
  { symbol: 'Al', name: 'Aluminium' },
  { symbol: 'Si', name: 'Silikon' },
  { symbol: 'P', name: 'Fosfor' },
  { symbol: 'S', name: 'Belerang' },
  { symbol: 'Cl', name: 'Klorin' },
  { symbol: 'Ar', name: 'Argon' },
  { symbol: 'K', name: 'Kalium' },
  { symbol: 'Ca', name: 'Kalsium' },
  { symbol: 'Fe', name: 'Besi' },
  { symbol: 'Cu', name: 'Tembaga' },
  { symbol: 'Zn', name: 'Seng' },
  { symbol: 'Ag', name: 'Perak' },
  { symbol: 'Au', name: 'Emas' },
  { symbol: 'Hg', name: 'Air Raksa' },
];

function generateQuestion(ELEMENTS: { symbol: string; name: string }[]): ElementQuestion {
  const target = ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)];
  const options = new Set<string>([target.name]);
  while (options.size < 4) {
    const wrong = ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)].name;
    options.add(wrong);
  }
  return {
    symbol: target.symbol,
    name: target.name,
    options: [...options].sort(() => Math.random() - 0.5),
  };
}

function convertAIQuestion(q: AIQuestion): { symbol: string; name: string; options: string[] } | null {
  const options = q.options?.map(String);
  if (!options || options.length < 4) return null;
  return {
    symbol: String(q.question).includes(' simbol ') ? q.question.split('simbol ')[1]?.trim() || '?': '?',
    name: String(q.answer),
    options,
  };
}

export default function ElementQuiz() {
  const { score, isPlaying, addScore, startGame, endGame, submitScore, pauseGame } =
    useGame('element-quiz');
  const { t } = useLocale();

  const { data: elementsData } = useQuery({
    queryKey: ['content', 'elements'],
    queryFn: contentApi.getElements,
    staleTime: 24 * 60 * 60 * 1000,
  });
  const ELEMENTS =
    elementsData?.map((e) => ({ symbol: e.symbol, name: e.name })) ?? FALLBACK_ELEMENTS;

  const [question, setQuestion] = useState<ElementQuestion | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [result, setResult] = useState<{ xp: number; highscore: boolean } | null>(null);
  const [useAI, setUseAI] = useState(false);
  const [aiQuestions, setAiQuestions] = useState<AIQuestion[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  const nextQuestion = useCallback(() => {
    if (useAI && aiQuestions.length > 0) {
      const q = aiQuestions.shift();
      if (q) {
        const converted = convertAIQuestion(q);
        if (converted) {
          const element = ELEMENTS.find(
            (e) => e.name.toLowerCase() === converted.name.toLowerCase()
          );
          if (element) {
            setQuestion({
              symbol: element.symbol,
              name: element.name,
              options: converted.options,
            });
            setAiQuestions([...aiQuestions]);
            setFeedback(null);
            return;
          }
        }
      }
    }
    setQuestion(generateQuestion(ELEMENTS));
    setFeedback(null);
  }, [ELEMENTS, useAI, aiQuestions]);

  const fetchAIQuestions = async () => {
    setAiLoading(true);
    try {
      const q = await aiApi.getQuestions('element-quiz', 'medium', 10);
      if (q && q.length > 0) setAiQuestions(q);
    } catch {
      console.error('Failed to fetch AI questions');
    } finally {
      setAiLoading(false);
    }
  };

  const handleStart = async () => {
    setQuestionCount(0);
    setGameOver(false);
    setResult(null);
    if (useAI) await fetchAIQuestions();
    nextQuestion();
    startGame('medium');
  };

  const handleAnswer = async (selected: string) => {
    if (feedback || !question) return;

    if (selected === question.name) {
      setFeedback('correct');
      addScore(15);
    } else {
      setFeedback('wrong');
      addScore(-5);
    }

    setQuestionCount((c) => c + 1);

    if (questionCount + 1 >= 10) {
      setTimeout(async () => {
        setGameOver(true);
        endGame();
        const res = await submitScore();
        setResult({ xp: res?.xp_earned ?? 0, highscore: res?.new_highscore ?? false });
      }, 600);
    } else {
      setTimeout(() => nextQuestion(), 600);
    }
  };

  const handleTimeUp = useCallback(async () => {
    setGameOver(true);
    endGame();
    const res = await submitScore();
    setResult({ xp: res?.xp_earned ?? 0, highscore: res?.new_highscore ?? false });
  }, [endGame, submitScore]);

  if (!isPlaying && !gameOver) {
    return (
      <div className="flex flex-col items-center gap-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t('game.element_quiz.title')}
        </h1>
        <p className="max-w-md text-center text-gray-500 dark:text-slate-400">
          {t('game.element_quiz.desc')}
        </p>
        <HowToPlay
          steps={[
            { emoji: '⚗️', text: 'Simbol unsur kimia ditampilkan (contoh: Au, Fe, O)' },
            { emoji: '✏️', text: 'Ketik nama unsur tersebut dalam Bahasa Indonesia' },
            { emoji: '⏱️', text: 'Jawab sebanyak mungkin sebelum waktu 60 detik habis!' },
          ]}
        />
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="useAI"
            checked={useAI}
            onChange={(e) => setUseAI(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="useAI" className="text-sm font-medium text-gray-700 dark:text-slate-300">
            Generate soal unsur kimia dengan AI ✨
          </label>
        </div>
        <button
          onClick={handleStart}
          disabled={aiLoading}
          className="rounded-xl bg-emerald-500 px-8 py-3 text-lg font-bold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
        >
          {aiLoading ? t('common.loading') : t('game.start')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <div className="flex items-center gap-4">
        <Timer initialSeconds={60} onTimeUp={handleTimeUp} isRunning={isPlaying && !gameOver} />
        <ScoreBoard score={score} />
        <span className="text-sm text-gray-500 dark:text-slate-400">
          {t('game.questions', { n: questionCount, total: 10 })}
        </span>
        <button
          onClick={pauseGame}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800"
          aria-label="Jeda permainan"
        >
          <Pause className="h-4 w-4" />
        </button>
      </div>

      {question && !gameOver && (
        <div className="w-full max-w-md space-y-6">
          <div className="flex justify-center">
            <div className="flex h-32 w-32 items-center justify-center rounded-2xl border-4 border-indigo-200 bg-indigo-50 shadow-inner dark:border-indigo-900/50 dark:bg-slate-800">
              <span className="font-mono text-6xl font-black text-indigo-600 dark:text-indigo-400">
                {question.symbol}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {question.options.map((opt) => (
              <button
                key={opt}
                onClick={() => handleAnswer(opt)}
                disabled={feedback !== null}
                className={cn(
                  'rounded-xl border-2 px-4 py-3 text-sm font-bold transition-all',
                  feedback === null
                    ? 'border-gray-200 bg-white text-gray-800 hover:border-indigo-400 hover:bg-indigo-50 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:hover:border-indigo-500'
                    : opt === question.name
                      ? 'border-emerald-500 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'border-gray-200 bg-gray-50 text-gray-400 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-500'
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {gameOver && result && (
        <div className="w-full max-w-sm">
          <ResultScreen
            score={score}
            xpEarned={result.xp}
            isNewHighscore={result.highscore}
            gameSlug="element-quiz"
            gameName="Element Quiz"
            onReplay={handleStart}
            description={`${questionCount}/10 soal dijawab`}
          />
        </div>
      )}
    </div>
  );
}
