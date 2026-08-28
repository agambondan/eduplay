'use client';

import type { ChessMatch } from '@/types/multiplayer';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Chess, type Square } from 'chess.js';
import { ArrowLeft, Bot, Globe, Home, Loader2, RotateCcw, User, Zap } from 'lucide-react';
import { chessApi, multiplayerApi } from '@/lib/api/multiplayer';
import { useAuthStore } from '@/lib/stores/authStore';
import { GameContainer } from '@/components/ui/GameContainer';

type Screen = 'menu' | 'playing' | 'result';
type Difficulty = 'easy' | 'medium' | 'hard';
type GameMode = 'bot' | 'ws';

const PIECE_UNICODE: Record<string, string> = {
  wP: '\u2659',
  wR: '\u2656',
  wN: '\u2658',
  wB: '\u2657',
  wQ: '\u2655',
  wK: '\u2654',
  bP: '\u265F',
  bR: '\u265C',
  bN: '\u265E',
  bB: '\u265D',
  bQ: '\u265B',
  bK: '\u265A',
};

const PIECE_VALUES: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

const POSITIONAL_TABLES: Record<string, number[]> = {
  p: [
    0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5,
    10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20,
    -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0,
  ],
  n: [
    -50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10,
    0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10,
    5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50,
  ],
  b: [
    -20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0,
    -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10,
    -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20,
  ],
  r: [
    0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0,
    0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0,
    5, 5, 0, 0, 0,
  ],
  q: [
    -20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10,
    -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0,
    0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20,
  ],
  k: [
    -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40,
    -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30,
    -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0,
    10, 30, 20,
  ],
};

function evaluateBoard(chess: Chess): number {
  let score = 0;
  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;
      const val = PIECE_VALUES[piece.type] || 0;
      const table = POSITIONAL_TABLES[piece.type];
      let posVal = 0;
      if (table) {
        const idx = piece.color === 'w' ? r * 8 + c : (7 - r) * 8 + (7 - c);
        posVal = table[idx] || 0;
      }
      score += (piece.color === 'w' ? 1 : -1) * (val + posVal);
    }
  }
  return score;
}

function minimax(
  chess: Chess,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean
): number {
  if (depth === 0 || chess.isGameOver()) {
    if (chess.isCheckmate()) return maximizing ? -99999 - depth : 99999 + depth;
    if (chess.isDraw() || chess.isStalemate()) return 0;
    return evaluateBoard(chess);
  }

  const moves = chess.moves();
  if (maximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      chess.move(move);
      const e = minimax(chess, depth - 1, alpha, beta, false);
      chess.undo();
      maxEval = Math.max(maxEval, e);
      alpha = Math.max(alpha, e);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      chess.move(move);
      const e = minimax(chess, depth - 1, alpha, beta, true);
      chess.undo();
      minEval = Math.min(minEval, e);
      beta = Math.min(beta, e);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

function findBestMove(chess: Chess, difficulty: Difficulty): string | null {
  const depthMap: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };
  const depth = depthMap[difficulty];
  const moves = chess.moves();
  if (moves.length === 0) return null;
  if (moves.length === 1) return moves[0];

  const isMaximizing = chess.turn() === 'w';
  let bestMove = moves[0];
  let bestScore = isMaximizing ? -Infinity : Infinity;

  for (const move of moves) {
    chess.move(move);
    const score = minimax(chess, depth - 1, -Infinity, Infinity, !isMaximizing);
    chess.undo();

    if (isMaximizing ? score > bestScore : score < bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}

export default function ChessPage() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [matchId, setMatchId] = useState<string | null>(null);
  const [match, setMatch] = useState<ChessMatch | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [chessInstance, setChessInstance] = useState<Chess | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<string | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>('bot');
  const [opponentName, setOpponentName] = useState('Bot');
  const [error, setError] = useState('');
  const wsRef = useRef<WebSocket | null>(null);
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.accessToken);

  const createMutation = useMutation({
    mutationFn: (data: {
      vs_bot: boolean;
      bot_difficulty?: Difficulty;
      player_color?: 'white' | 'black';
    }) => chessApi.create(data),
    onSuccess: (data) => {
      setMatch(data);
      setMatchId(data.id);
      initChessFromMatch(data);
      setGameMode('bot');
      setOpponentName(data.bot_name || 'Bot');
      setScreen('playing');
    },
  });

  const quickMatchMutation = useMutation({
    mutationFn: () => multiplayerApi.quickMatch('chess', 'medium'),
    onSuccess: (result) => {
      setMatchId(result.room_id);
      setGameMode('ws');
      setOpponentName(result.opponent_name || 'Lawan');
      setScreen('playing');
      connectWebSocket(result.room_id);
    },
    onError: () => setError('Gagal mencari lawan. Coba lagi.'),
  });

  const moveMutation = useMutation({
    mutationFn: (move: string) => chessApi.move(matchId!, move),
  });
  const moveRef = useRef(moveMutation.mutate);
  moveRef.current = moveMutation.mutate;

  const resignMutation = useMutation({
    mutationFn: () => chessApi.resign(matchId!),
    onSuccess: (data) => {
      setMatch(data);
      setScreen('result');
    },
  });

  function initChessFromMatch(m: ChessMatch) {
    const chess = new Chess();
    if (m.fen && m.fen !== 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1') {
      chess.load(m.fen);
    }
    if (m.moves.length > 0) {
      chess.reset();
      for (const mv of m.moves) {
        try {
          chess.move(mv);
        } catch {}
      }
    }
    setChessInstance(chess);
    setMoveHistory(m.moves || []);
  }

  function connectWebSocket(roomID: string) {
    const wsUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1')
      .replace(/\/api\/v1\/?$/, '')
      .replace('http', 'ws');
    const ws = new WebSocket(`${wsUrl}/api/v1/ws/game/${roomID}?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () =>
      ws.send(JSON.stringify({ type: 'join_room', payload: { room_id: roomID, token } }));

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'chess_start') {
          const chess = new Chess();
          if (msg.payload.fen) chess.load(msg.payload.fen);
          setChessInstance(chess);
          setMoveHistory([]);
        }
        if (msg.type === 'chess_move') {
          setChessInstance((prev) => {
            if (!prev) return prev;
            const copy = new Chess(prev.fen());
            try {
              copy.move(msg.payload.move);
              setMoveHistory(copy.history({ verbose: false }));
              setLastMove(msg.payload.move);
            } catch {}
            return copy;
          });
        }
        if (msg.type === 'chess_move_ok') {
          setLastMove(msg.payload.move);
        }
        if (msg.type === 'game_over') {
          setMatch((prev) =>
            prev ? { ...prev, status: 'finished', winner_id: msg.payload.winner_id } : prev
          );
          setTimeout(() => setScreen('result'), 1500);
        }
        if (msg.type === 'error') {
          setError(msg.payload.message);
        }
      } catch {}
    };

    ws.onclose = () => {
      wsRef.current = null;
    };
  }

  function getPieceUnicode(piece: { color: string; type: string } | null): string {
    if (!piece) return '';
    const code = (piece.color === 'w' ? 'w' : 'b') + piece.type.toUpperCase();
    return PIECE_UNICODE[code] || '';
  }

  const handleSquareClick = useCallback(
    (square: string) => {
      if (!chessInstance || isAiThinking || !match) return;
      if (match.status !== 'active') return;

      if (gameMode === 'ws') {
        if (!selectedSquare) {
          const piece = chessInstance.get(square as Square);
          if (piece && piece.color === (chessInstance.turn() === 'w' ? 'w' : 'b')) {
            setSelectedSquare(square);
          }
          return;
        }

        if (square === selectedSquare) {
          setSelectedSquare(null);
          return;
        }

        const pieceAtTarget = chessInstance.get(square as Square);
        if (
          pieceAtTarget &&
          pieceAtTarget.color === chessInstance.get(selectedSquare as Square)?.color
        ) {
          setSelectedSquare(square);
          return;
        }

        try {
          const gameCopy = new Chess(chessInstance.fen());
          gameCopy.move({ from: selectedSquare as Square, to: square as Square, promotion: 'q' });
          const san = gameCopy.history({ verbose: false }).pop() || '';
          setChessInstance(gameCopy);
          setMoveHistory(gameCopy.history({ verbose: false }));
          setLastMove(san);
          setSelectedSquare(null);
          wsRef.current?.send(
            JSON.stringify({ type: 'chess_move', payload: { room_id: matchId, move: san } })
          );

          if (gameCopy.isGameOver()) {
            setTimeout(() => setScreen('result'), 1500);
          }
        } catch {
          setSelectedSquare(null);
        }
        return;
      }

      const isBotGame = match.is_vs_bot;
      const isPlayerWhite = match.player_color === 'white';
      const myTurn = isBotGame
        ? isPlayerWhite
          ? chessInstance.turn() === 'w'
          : chessInstance.turn() === 'b'
        : true;
      if (!myTurn) return;

      if (!selectedSquare) {
        const piece = chessInstance.get(square as Square);
        if (piece && piece.color === (chessInstance.turn() === 'w' ? 'w' : 'b')) {
          setSelectedSquare(square);
        }
        return;
      }

      if (square === selectedSquare) {
        setSelectedSquare(null);
        return;
      }

      const pieceAtTarget = chessInstance.get(square as Square);
      if (
        pieceAtTarget &&
        pieceAtTarget.color === chessInstance.get(selectedSquare as Square)?.color
      ) {
        setSelectedSquare(square);
        return;
      }

      try {
        const gameCopy = new Chess(chessInstance.fen());
        gameCopy.move({ from: selectedSquare as Square, to: square as Square, promotion: 'q' });
        const san = gameCopy.history({ verbose: false }).pop() || '';
        setChessInstance(gameCopy);
        setMoveHistory(gameCopy.history({ verbose: false }));
        setLastMove(san);
        setSelectedSquare(null);

        moveRef.current(san);

        if (gameCopy.isGameOver()) {
          setTimeout(() => setScreen('result'), 1500);
          return;
        }

        if (isBotGame) {
          setIsAiThinking(true);
          setTimeout(
            () => {
              const aiCopy = new Chess(gameCopy.fen());
              const bestMove = findBestMove(
                aiCopy,
                (match.bot_difficulty || 'medium') as Difficulty
              );
              if (bestMove) {
                aiCopy.move(bestMove);
                setChessInstance(aiCopy);
                setMoveHistory(aiCopy.history({ verbose: false }));
                setLastMove(bestMove);
                moveRef.current(bestMove);

                if (aiCopy.isGameOver()) {
                  setTimeout(() => setScreen('result'), 1500);
                }
              }
              setIsAiThinking(false);
            },
            300 + Math.random() * 700
          );
        }
      } catch {
        setSelectedSquare(null);
      }
    },
    [selectedSquare, chessInstance, isAiThinking, match, matchId, gameMode]
  );

  const getSquareColor = (r: number, c: number) =>
    (r + c) % 2 === 0 ? 'bg-amber-100' : 'bg-amber-800';

  function renderBoard() {
    if (!chessInstance) {
      return (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      );
    }

    const board = chessInstance.board();
    const legalMoves = selectedSquare
      ? chessInstance.moves({ square: selectedSquare as Square, verbose: true })
      : [];

    return (
      <div
        className="mx-auto w-full max-w-[min(480px,calc(100vw-32px))] select-none"
        style={{ touchAction: 'none' }}
      >
        <div className="grid grid-cols-8 gap-0 overflow-hidden rounded border-2 border-gray-800 shadow-lg">
          {board.map((row, r) =>
            row.map((piece, c) => {
              const file = 'abcdefgh'[c] as string;
              const rank = 8 - r;
              const square = `${file}${rank}`;
              const isSelected = selectedSquare === square;
              const isLegalTarget = legalMoves.some((m) => m.to === square);
              const isLastMove = lastMove?.includes(square);
              const unicode = getPieceUnicode(piece);

              return (
                <button
                  key={square}
                  onClick={() => handleSquareClick(square)}
                  aria-label={`${square}${piece ? ` ${piece.color === 'w' ? 'white' : 'black'} ${piece.type}` : ''}${isLegalTarget ? ', legal move' : ''}`}
                  className={`relative flex aspect-square items-center justify-center text-[clamp(1.25rem,5vw,2.25rem)] transition-colors
                  ${getSquareColor(r, c)}
                  ${isSelected ? 'z-10 ring-2 ring-inset ring-yellow-400' : ''}
                  ${isLastMove && !isSelected ? 'ring-1 ring-inset ring-yellow-300' : ''}
                  ${piece && piece.color === (chessInstance.turn() === 'w' ? 'w' : 'b') ? 'cursor-pointer' : ''}
                  hover:brightness-110`}
                >
                  {unicode && (
                    <span className={piece?.color === 'w' ? 'drop-shadow-sm' : ''}>{unicode}</span>
                  )}
                  {isLegalTarget && !piece && (
                    <span className="absolute h-3 w-3 rounded-full bg-green-500/40" />
                  )}
                  {isLegalTarget && piece && (
                    <span className="absolute inset-0 rounded-full border-2 border-green-500/60" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    );
  }

  function renderGameStatus() {
    if (!chessInstance) return null;
    if (chessInstance.isCheckmate()) return <p className="font-bold text-red-600">Skakmat!</p>;
    if (chessInstance.isCheck()) return <p className="font-bold text-yellow-600">Skak!</p>;
    if (chessInstance.isDraw()) return <p className="font-bold text-gray-500">Seri</p>;
    if (chessInstance.isStalemate()) return <p className="font-bold text-gray-500">Stalemate</p>;
    return (
      <p className="text-sm text-gray-500">
        Giliran: {chessInstance.turn() === 'w' ? 'Putih' : 'Hitam'}
        {match?.is_vs_bot && (
          <span className="ml-2">(Kamu: {match.player_color === 'white' ? 'Putih' : 'Hitam'})</span>
        )}
      </p>
    );
  }

  if (screen === 'menu') {
    return (
      <>
        <button
          onClick={() => router.push('/games')}
          className="absolute left-4 top-4 z-10 flex items-center gap-2 text-sm text-gray-500"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali
        </button>
        <GameContainer maxWidth="max-w-lg">
          <div className="space-y-6 pt-12 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-stone-600 to-stone-800 shadow-lg">
              <span className="text-4xl">{PIECE_UNICODE['wK']}</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Chess</h1>
            <p className="text-gray-500 dark:text-slate-400">
              Catur klasik — Quick Match atau vs Bot!
            </p>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="space-y-3">
              <button
                onClick={() => quickMatchMutation.mutate()}
                disabled={quickMatchMutation.isPending}
                className="flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4 font-bold text-white shadow-lg transition-all hover:scale-[1.02] disabled:opacity-50"
              >
                {quickMatchMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Globe className="h-5 w-5" />
                )}
                Cari Lawan Online
              </button>
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200 dark:border-slate-700" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-xs text-gray-400 dark:bg-slate-900">
                    atau
                  </span>
                </div>
              </div>
              <p className="text-sm font-semibold text-gray-600 dark:text-slate-300">Vs Bot</p>
              <div className="flex justify-center gap-3">
                {(['easy', 'medium', 'hard'] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() =>
                      createMutation.mutate({
                        vs_bot: true,
                        bot_difficulty: d,
                        player_color: 'white',
                      })
                    }
                    disabled={createMutation.isPending}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-stone-500 to-stone-700 px-5 py-3 font-semibold text-white shadow-lg transition-all hover:scale-[1.02] disabled:opacity-50"
                  >
                    <Bot className="h-4 w-4" />{' '}
                    {d === 'easy' ? 'Mudah' : d === 'medium' ? 'Sedang' : 'Sulit'}
                  </button>
                ))}
              </div>
              <button
                onClick={() =>
                  createMutation.mutate({
                    vs_bot: true,
                    bot_difficulty: 'medium',
                    player_color: 'black',
                  })
                }
                disabled={createMutation.isPending}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-stone-400 px-6 py-3 font-semibold text-stone-700 transition-all hover:bg-stone-50 dark:text-stone-300"
              >
                <User className="h-4 w-4" /> Main Hitam vs Bot
              </button>
              {createMutation.isPending && <Loader2 className="mx-auto h-5 w-5 animate-spin" />}
            </div>
          </div>
        </GameContainer>
      </>
    );
  }

  if (screen === 'result') {
    const isWin = match?.winner_id === user?.id;
    const isDraw = match?.status === 'finished' && !match.winner_id;
    return (
      <>
        <button
          onClick={() => router.push('/games')}
          className="absolute left-4 top-4 z-10 flex items-center gap-2 text-sm text-gray-500"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali
        </button>
        <GameContainer maxWidth="max-w-lg">
          <div className="space-y-6 py-8 text-center">
            <div
              className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br shadow-lg ${
                isWin
                  ? 'from-emerald-400 to-teal-500 shadow-emerald-200'
                  : isDraw
                    ? 'from-yellow-300 to-yellow-500 shadow-yellow-200'
                    : 'from-gray-300 to-gray-400 shadow-gray-200'
              }`}
            >
              <span className="text-5xl">
                {isWin ? PIECE_UNICODE['wK'] : isDraw ? '\u2694' : PIECE_UNICODE['bK']}
              </span>
            </div>
            <h1
              className={`text-3xl font-extrabold ${isWin ? 'text-emerald-600' : isDraw ? 'text-yellow-600' : 'text-gray-500'}`}
            >
              {isWin ? 'Kamu Menang!' : isDraw ? 'Seri!' : 'Kamu Kalah'}
            </h1>
            {match?.win_reason && (
              <p className="text-sm capitalize text-gray-500">
                {match.win_reason === 'resign' ? 'Lawan resign' : match.win_reason}
              </p>
            )}
            <div className="rounded-xl bg-gradient-to-br from-stone-50 to-amber-50 p-4">
              <div className="flex items-center justify-center gap-2 text-sm font-semibold text-stone-700">
                <Zap className="h-4 w-4" /> +{isWin ? 100 : 25} XP
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setScreen('menu')}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-stone-600 px-5 py-3 font-bold text-white shadow-lg transition-all hover:bg-stone-700"
              >
                <RotateCcw className="h-5 w-5" /> Main Lagi
              </button>
              <button
                onClick={() => router.push('/games')}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-gray-200 px-5 py-3 font-bold text-gray-600 transition-all hover:bg-gray-50"
              >
                <Home className="h-5 w-5" /> Hub
              </button>
            </div>
          </div>
        </GameContainer>
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => router.push('/games')}
        className="absolute left-4 top-4 z-10 flex items-center gap-2 text-sm text-gray-500"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali
      </button>
      <GameContainer maxWidth="max-w-xl">
        <div className="w-full space-y-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">{PIECE_UNICODE['wK']}</span>
              <span className="text-sm font-bold text-gray-900 dark:text-white">
                {opponentName}
              </span>
            </div>
            {renderGameStatus()}
          </div>

          {gameMode === 'bot' && match?.player_color === 'black' && isAiThinking && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Bot berpikir...
            </div>
          )}

          {renderBoard()}

          {gameMode === 'bot' && match?.player_color === 'white' && isAiThinking && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Bot berpikir...
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => {
                if (gameMode === 'ws') {
                  wsRef.current?.send(
                    JSON.stringify({ type: 'leave_room', payload: { room_id: matchId } })
                  );
                  setScreen('result');
                } else {
                  resignMutation.mutate();
                }
              }}
              disabled={match?.status !== 'active'}
              className="flex-1 rounded-xl border-2 border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition-all hover:bg-red-50 disabled:opacity-50"
            >
              Resign
            </button>
          </div>

          {moveHistory.length > 0 && (
            <div className="max-h-24 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex flex-wrap gap-1">
                {moveHistory.map((mv, i) => (
                  <span
                    key={i}
                    className="rounded bg-white px-2 py-0.5 font-mono text-xs shadow-sm dark:bg-slate-700 dark:text-slate-300"
                  >
                    {i % 2 === 0 ? `${Math.floor(i / 2) + 1}.` : ''}
                    {mv}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </GameContainer>
    </>
  );
}
