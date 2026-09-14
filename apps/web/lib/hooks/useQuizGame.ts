'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Difficulty, ScoreSubmitResponse } from '@/types/game';
import { AIQuestion, aiApi } from '@/lib/api/ai';
import { useGame } from './useGame';
import { useSoundStore } from '@/lib/stores/soundStore';
import { haptics } from '@/lib/utils/haptics';
import { ScoreBreakdownItem } from '@/components/ui/ResultScreen';

export interface QuizQuestion<TAnswer = string, TExtra = Record<string, unknown>> {
  question: string;
  answer: TAnswer;
  options: TAnswer[];
  extra?: TExtra;
}

export interface QuizGameConfig<TQuestion extends QuizQuestion = QuizQuestion> {
  gameSlug: string;
  gameName: string;
  category?: string;
  totalQuestions: number;
  difficulty: Difficulty;
  hasTimer: boolean;
  timerSeconds?: number;
  generateQuestion: (data: any) => TQuestion;
  convertAIQuestion?: (q: AIQuestion) => TQuestion | null;
  fetchContent?: () => Promise<any>;
  fallbackData: any;
  scoring: {
    correct: number;
    wrong: number;
    streakBonus?: { threshold: number; multiplier: number };
  };
  aiConfig: {
    count: number;
    difficulty: Difficulty;
  };
}

export interface UseQuizGameReturn<TQuestion extends QuizQuestion = QuizQuestion> {
  question: TQuestion | null;
  feedback: 'correct' | 'wrong' | null;
  questionCount: number;
  gameOver: boolean;
  result: { xp: number; highscore: boolean } | null;
  score: number;
  isPlaying: boolean;
  useAI: boolean;
  setUseAI: (v: boolean) => void;
  aiLoading: boolean;
  streak: number;
  breakdown: ScoreBreakdownItem[];
  handleStart: () => Promise<void>;
  handleAnswer: (selected: TQuestion['options'][0]) => Promise<void>;
  handleTimeUp: () => Promise<void>;
  nextQuestion: (overrideAiQuestions?: AIQuestion[]) => void;
  submitScore: () => Promise<ScoreSubmitResponse | null>;
  endGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
}

export function useQuizGame<TQuestion extends QuizQuestion = QuizQuestion>(
  config: QuizGameConfig<TQuestion>
): UseQuizGameReturn<TQuestion> {
  const {
    gameSlug,
    gameName,
    category,
    totalQuestions,
    difficulty,
    hasTimer,
    timerSeconds,
    generateQuestion,
    convertAIQuestion,
    fetchContent,
    fallbackData,
    scoring,
    aiConfig,
  } = config;

  const { score, isPlaying, addScore, startGame, endGame, submitScore, pauseGame, resumeGame } =
    useGame(gameSlug, gameName, category);
  const { playSound } = useSoundStore();

  const [question, setQuestion] = useState<TQuestion | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [result, setResult] = useState<{ xp: number; highscore: boolean } | null>(null);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [useAI, setUseAI] = useState(false);
  const [aiQuestions, setAiQuestions] = useState<AIQuestion[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [contentData, setContentData] = useState<any>(fallbackData);

  const gameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTransitionTimer = useCallback(() => {
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
  }, []);

  const clearGameTimer = useCallback(() => {
    if (gameTimerRef.current) {
      clearTimeout(gameTimerRef.current);
      gameTimerRef.current = null;
    }
  }, []);

  const clearAllTimers = useCallback(() => {
    clearTransitionTimer();
    clearGameTimer();
  }, [clearTransitionTimer, clearGameTimer]);

  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);

  const fetchAIQuestions = useCallback(async (): Promise<AIQuestion[]> => {
    setAiLoading(true);
    try {
      const q = await aiApi.getQuestions(gameSlug, aiConfig.difficulty, aiConfig.count);
      if (q && q.length > 0) {
        setAiQuestions(q);
        return q;
      }
    } catch {
      console.error('Failed to fetch AI questions');
    } finally {
      setAiLoading(false);
    }
    return [];
  }, [gameSlug, aiConfig.difficulty, aiConfig.count]);

  const nextQuestion = useCallback(
    (overrideAiQuestions?: AIQuestion[]) => {
      clearTransitionTimer();

      const pool = overrideAiQuestions ?? aiQuestions;

      if (useAI && pool.length > 0) {
        const q = pool.shift();
        if (q && convertAIQuestion) {
          const converted = convertAIQuestion(q);
          if (converted) {
            setQuestion(converted);
            setAiQuestions([...pool]);
            setFeedback(null);
            return;
          }
        }
      }

      setQuestion(generateQuestion(contentData));
      setFeedback(null);
    },
    [useAI, aiQuestions, convertAIQuestion, generateQuestion, contentData, clearTransitionTimer]
  );

  const handleTimeUp = useCallback(async () => {
    clearAllTimers();
    setGameOver(true);
    endGame();
    const res = await submitScore();
    setResult({ xp: res?.xp_earned ?? 0, highscore: res?.new_highscore ?? false });
  }, [endGame, submitScore, clearAllTimers]);

  const handleStart = useCallback(async () => {
    clearAllTimers();
    setQuestionCount(0);
    setCorrectCount(0);
    setMaxStreak(0);
    setGameOver(false);
    setResult(null);
    setStreak(0);

    let initialAi: AIQuestion[] | undefined;
    if (useAI) {
      const fetched = await fetchAIQuestions();
      if (fetched.length > 0) {
        initialAi = [...fetched];
      }
    }

    if (fetchContent && !contentData) {
      try {
        const data = await fetchContent();
        if (data) setContentData(data);
      } catch {}
    }

    nextQuestion(initialAi);
    startGame(difficulty);

    if (hasTimer && timerSeconds) {
      gameTimerRef.current = setTimeout(() => {
        handleTimeUp();
      }, timerSeconds * 1000);
    }
  }, [
    useAI,
    fetchAIQuestions,
    fetchContent,
    contentData,
    nextQuestion,
    startGame,
    difficulty,
    hasTimer,
    timerSeconds,
    clearAllTimers,
    handleTimeUp,
  ]);

  const handleAnswer = useCallback(
    async (selected: TQuestion['options'][0]) => {
      if (feedback || !question) return;

      clearTransitionTimer();

      const isCorrect = selected === question.answer;

      if (isCorrect) {
        setFeedback('correct');
        playSound('correct');
        haptics.success();

        setCorrectCount((c) => c + 1);
        const newStreak = streak + 1;
        setStreak(newStreak);
        setMaxStreak((m) => Math.max(m, newStreak));

        let points = scoring.correct;
        if (scoring.streakBonus && newStreak >= scoring.streakBonus.threshold) {
          points *= scoring.streakBonus.multiplier;
        }
        addScore(points);
      } else {
        setFeedback('wrong');
        playSound('wrong');
        haptics.error();
        setStreak(0);
        addScore(scoring.wrong);
      }

      setQuestionCount((c) => c + 1);

      if (questionCount + 1 >= totalQuestions) {
        clearAllTimers();
        transitionTimerRef.current = setTimeout(async () => {
          setGameOver(true);
          endGame();
          const res = await submitScore();
          setResult({ xp: res?.xp_earned ?? 0, highscore: res?.new_highscore ?? false });
        }, 600);
      } else {
        transitionTimerRef.current = setTimeout(() => nextQuestion(), 600);
      }
    },
    [
      feedback,
      question,
      streak,
      questionCount,
      totalQuestions,
      scoring,
      addScore,
      endGame,
      submitScore,
      nextQuestion,
      playSound,
      clearTransitionTimer,
      clearAllTimers,
    ]
  );

  useEffect(() => {
    if (!isPlaying || gameOver || !question || feedback !== null) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key.toLowerCase();
      let index = -1;

      if (['1', 'a'].includes(key)) index = 0;
      else if (['2', 'b'].includes(key)) index = 1;
      else if (['3', 'c'].includes(key)) index = 2;
      else if (['4', 'd'].includes(key)) index = 3;

      if (index >= 0 && index < question.options.length) {
        e.preventDefault();
        handleAnswer(question.options[index]);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isPlaying, gameOver, question, feedback, handleAnswer]);

  return {
    question,
    feedback,
    questionCount,
    gameOver,
    result,
    score,
    isPlaying,
    useAI,
    setUseAI,
    aiLoading,
    streak,
    breakdown: [
      { label: 'Benar', value: `${correctCount}/${totalQuestions}` },
      {
        label: 'Akurasi',
        value: `${Math.round((correctCount / Math.max(1, questionCount)) * 100)}%`,
      },
      { label: 'Max Streak', value: `${maxStreak}x`, isBonus: maxStreak >= 3 },
      { label: 'Total Skor', value: score, isBonus: true },
    ],
    handleStart,
    handleAnswer,
    handleTimeUp,
    nextQuestion,
    submitScore,
    endGame,
    pauseGame,
    resumeGame,
  };
}
