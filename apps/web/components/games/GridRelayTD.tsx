'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Battery,
  Cpu,
  Flame,
  Pause,
  Radio,
  ShieldAlert,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';
import { useGame } from '@/lib/hooks/useGame';
import { useIsTouchDevice } from '@/lib/hooks/useIsTouchDevice';
import { useLocale } from '@/lib/i18n';
import { useSoundStore } from '@/lib/stores/soundStore';
import { playTone } from '@/lib/utils/audioSynth';
import { cn } from '@/lib/utils/cn';
import { HowToPlay } from '@/components/ui/HowToPlay';
import { ResultScreen } from '@/components/ui/ResultScreen';
import { ScoreBoard } from '@/components/ui/ScoreBoard';

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;
const CELL_SIZE = 40;
const COLS = 16;
const ROWS = 12;

type TurretType = 'pulse' | 'tesla' | 'repeater';

interface Turret {
  id: string;
  type: TurretType;
  gx: number;
  gy: number;
  power: number;
  range: number;
  fireCooldown: number;
  angle: number;
  overchargeTimer: number;
}

interface Cable {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

interface Enemy {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  isDisrupter: boolean;
  isBoss: boolean;
  color: string;
  radius: number;
}

interface Laser {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  life: number;
  isOvercharge: boolean;
  isTesla?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  radius?: number;
}

interface Question {
  text: string;
  options: string[];
  correct: number;
  explanation: string;
}

const SCIENCE_QUESTIONS: Question[] = [
  {
    text: 'Rumus menghitung Daya Listrik (P) adalah?',
    options: ['P = V × I', 'P = V / R', 'P = I² / R', 'P = V + I'],
    correct: 0,
    explanation: 'Daya Listrik (P) adalah hasil kali Tegangan (V) dan Kuat Arus (I).',
  },
  {
    text: 'Satuan standar internasional untuk Arus Listrik adalah?',
    options: ['Ampere (A)', 'Volt (V)', 'Watt (W)', 'Ohm (Ω)'],
    correct: 0,
    explanation: 'Ampere adalah satuan standar kuat arus listrik.',
  },
  {
    text: 'Jika 2 resistor identik dirangkai seri, hambatan totalnya akan?',
    options: ['Meningkat 2x lipat', 'Berkurang setengah', 'Tetap sama', 'Menjadi nol'],
    correct: 0,
    explanation: 'Rangkaian seri menjumlahkan total resistansi (R_total = R1 + R2).',
  },
  {
    text: 'Komponen yang berfungsi memutus arus saat beban berlebih disebut?',
    options: ['Sekering (Fuse)', 'Resistor', 'Kapasitor', 'Induktor'],
    correct: 0,
    explanation: 'Sekering mengamankan sirkuit dari bahaya beban arus berlebih.',
  },
  {
    text: 'Satuan standar untuk mengukur Hambatan Listrik (Resistansi) adalah?',
    options: ['Ohm (Ω)', 'Coulomb (C)', 'Henry (H)', 'Joule (J)'],
    correct: 0,
    explanation: 'Hambatan diukur dalam satuan Ohm sesuai hukum Ohm.',
  },
];

const TURRET_COSTS: Record<TurretType, number> = {
  pulse: 30,
  tesla: 50,
  repeater: 20,
};

const CABLE_COST = 10;

export function GridRelayTD() {
  const { t } = useLocale();
  const isTouch = useIsTouchDevice();
  const { playSound, soundEnabled, volume } = useSoundStore();
  const { startGame, endGame, submitScore } = useGame('grid-relay-td', 'Grid Relay TD', 'science');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [power, setPower] = useState(100);
  const [baseHp, setBaseHp] = useState(100);
  const [wave, setWave] = useState(1);
  const [buildMode, setBuildMode] = useState<'turret' | 'cable'>('turret');
  const [selectedTurretType, setSelectedTurretType] = useState<TurretType>('pulse');
  const [cableStart, setCableStart] = useState<{ x: number; y: number } | null>(null);
  const [selectedTurret, setSelectedTurret] = useState<Turret | null>(null);
  const [powerLossAlert, setPowerLossAlert] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [result, setResult] = useState<{ xp: number; new_highscore: boolean } | null>(null);

  const quizActive = isPaused && !!currentQuestion;
  const quizFocusRef = useFocusTrap(quizActive);

  // References
  const turretsRef = useRef<Turret[]>([]);
  const cablesRef = useRef<Cable[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const lasersRef = useRef<Laser[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const baseHpRef = useRef(100);
  const powerRef = useRef(100);
  const scoreRef = useRef(0);
  const waveRef = useRef(1);
  const isPlayingRef = useRef(false);
  const gameOverRef = useRef(false);
  const isPausedRef = useRef(false);
  const spawnTimerRef = useRef(0);
  const questionTimerRef = useRef(0);
  const powerLossAlertTimerRef = useRef(0);
  const selectedTurretRef = useRef<string | null>(null);
  const isDraggingCableRef = useRef(false);

  // Generator position fixed at left
  const genX = 0;
  const genY = 5;

  const playSynthesizedTone = useCallback(
    (type: 'laser' | 'shock' | 'boom' | 'alarm' | 'emp') => {
      const rampFloor = Math.max(0.0001, 0.001 * volume);
      playTone(soundEnabled, volume, (ctx, osc, gain, now) => {
        if (type === 'laser') {
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(800, now);
          osc.frequency.exponentialRampToValueAtTime(200, now + 0.12);
          gain.gain.setValueAtTime(0.08 * volume, now);
          gain.gain.exponentialRampToValueAtTime(rampFloor, now + 0.12);
          osc.start(now);
          osc.stop(now + 0.12);
        } else if (type === 'shock') {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(450, now);
          osc.frequency.linearRampToValueAtTime(750, now + 0.08);
          gain.gain.setValueAtTime(0.09 * volume, now);
          gain.gain.exponentialRampToValueAtTime(rampFloor, now + 0.1);
          osc.start(now);
          osc.stop(now + 0.1);
        } else if (type === 'boom') {
          osc.type = 'square';
          osc.frequency.setValueAtTime(140, now);
          osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);
          gain.gain.setValueAtTime(0.15 * volume, now);
          gain.gain.exponentialRampToValueAtTime(rampFloor, now + 0.3);
          osc.start(now);
          osc.stop(now + 0.3);
        } else if (type === 'alarm') {
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(400, now);
          osc.frequency.linearRampToValueAtTime(600, now + 0.2);
          gain.gain.setValueAtTime(0.1 * volume, now);
          gain.gain.exponentialRampToValueAtTime(rampFloor, now + 0.2);
          osc.start(now);
          osc.stop(now + 0.2);
        }
      });
    },
    [soundEnabled, volume]
  );

  const getActiveConnections = useCallback(() => {
    const activeNodes = new Set<string>();
    activeNodes.add(`${genX},${genY}`);
    activeNodes.add(`${genX},${genY + 1}`);

    let changed = true;
    while (changed) {
      changed = false;
      for (const c of cablesRef.current) {
        const k1 = `${c.fromX},${c.fromY}`;
        const k2 = `${c.toX},${c.toY}`;
        if (activeNodes.has(k1) && !activeNodes.has(k2)) {
          activeNodes.add(k2);
          changed = true;
        } else if (activeNodes.has(k2) && !activeNodes.has(k1)) {
          activeNodes.add(k1);
          changed = true;
        }
      }
    }
    return activeNodes;
  }, []);

  const triggerExplosion = useCallback((x: number, y: number, color: string, count = 16) => {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 40 + Math.random() * 90;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.3,
        maxLife: 0.8,
        color,
        radius: 2 + Math.random() * 2,
      });
    }
  }, []);

  const handleGameOver = useCallback(async () => {
    isPlayingRef.current = false;
    gameOverRef.current = true;
    setIsPlaying(false);
    setGameOver(true);
    playSound('lose');
    const finalScore = scoreRef.current;
    const res = await submitScore(finalScore);
    if (res) setResult({ xp: res.xp_earned, new_highscore: res.new_highscore });
    endGame();
  }, [submitScore, endGame, playSound]);

  const connectCable = useCallback(
    (x1: number, y1: number, x2: number, y2: number) => {
      const dx = Math.abs(x2 - x1);
      const dy = Math.abs(y2 - y1);
      if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
        // Prevent duplicate
        const exists = cablesRef.current.some(
          (c) =>
            (c.fromX === x1 && c.fromY === y1 && c.toX === x2 && c.toY === y2) ||
            (c.fromX === x2 && c.fromY === y2 && c.toX === x1 && c.toY === y1)
        );
        if (exists) return false;

        if (powerRef.current >= CABLE_COST) {
          powerRef.current -= CABLE_COST;
          setPower(powerRef.current);
          cablesRef.current.push({ fromX: x1, fromY: y1, toX: x2, toY: y2 });
          triggerExplosion(
            x2 * CELL_SIZE + CELL_SIZE / 2,
            y2 * CELL_SIZE + CELL_SIZE / 2,
            '#38bdf8',
            6
          );
          playSound('click');
          return true;
        }
      }
      return false;
    },
    [triggerExplosion, playSound]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isPlayingRef.current || isPausedRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.setPointerCapture(e.pointerId);

      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;
      const clickX = (e.clientX - rect.left) * scaleX;
      const clickY = (e.clientY - rect.top) * scaleY;

      const gx = Math.floor(clickX / CELL_SIZE);
      const gy = Math.floor(clickY / CELL_SIZE);
      if (gx < 0 || gx >= COLS || gy < 0 || gy >= ROWS) return;

      const clickedTurret = turretsRef.current.find((t) => t.gx === gx && t.gy === gy);
      if (clickedTurret) {
        selectedTurretRef.current = clickedTurret.id;
        setSelectedTurret(clickedTurret);
        playSound('click');
        return;
      }

      if (buildMode === 'turret') {
        if (gx === 0 && (gy === 5 || gy === 6)) return;
        const occupied = turretsRef.current.some((t) => t.gx === gx && t.gy === gy);
        if (occupied) return;

        const cost = TURRET_COSTS[selectedTurretType];
        if (powerRef.current >= cost) {
          powerRef.current -= cost;
          setPower(powerRef.current);

          const range =
            selectedTurretType === 'tesla' ? 120 : selectedTurretType === 'repeater' ? 80 : 170;
          const newTurret: Turret = {
            id: `turret_${Date.now()}`,
            type: selectedTurretType,
            gx,
            gy,
            power: 0,
            range,
            fireCooldown: 0,
            angle: 0,
            overchargeTimer: 0,
          };
          turretsRef.current.push(newTurret);
          triggerExplosion(
            gx * CELL_SIZE + CELL_SIZE / 2,
            gy * CELL_SIZE + CELL_SIZE / 2,
            selectedTurretType === 'tesla'
              ? '#38bdf8'
              : selectedTurretType === 'repeater'
                ? '#fbbf24'
                : '#22c55e',
            10
          );
          playSound('pop');
        }
      } else if (buildMode === 'cable') {
        setCableStart({ x: gx, y: gy });
        isDraggingCableRef.current = true;
      }
    },
    [buildMode, selectedTurretType, triggerExplosion, playSound]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDraggingCableRef.current || !cableStart) return;
      isDraggingCableRef.current = false;

      const canvas = canvasRef.current;
      if (!canvas) {
        setCableStart(null);
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;
      const clickX = (e.clientX - rect.left) * scaleX;
      const clickY = (e.clientY - rect.top) * scaleY;

      const gx = Math.floor(clickX / CELL_SIZE);
      const gy = Math.floor(clickY / CELL_SIZE);

      if (gx >= 0 && gx < COLS && gy >= 0 && gy < ROWS) {
        connectCable(cableStart.x, cableStart.y, gx, gy);
      }
      setCableStart(null);
    },
    [cableStart, connectCable]
  );

  const handleOvercharge = useCallback(() => {
    if (!selectedTurret || powerRef.current < 25) return;
    powerRef.current -= 25;
    setPower(powerRef.current);
    selectedTurret.overchargeTimer = 7;
    playSynthesizedTone('shock');
    triggerExplosion(
      selectedTurret.gx * CELL_SIZE + CELL_SIZE / 2,
      selectedTurret.gy * CELL_SIZE + CELL_SIZE / 2,
      '#c084fc',
      24
    );
  }, [selectedTurret, playSynthesizedTone, triggerExplosion]);

  const handleAnswerQuestion = useCallback(
    (optionIndex: number) => {
      if (!currentQuestion) return;
      if (optionIndex === currentQuestion.correct) {
        powerRef.current = Math.min(100, powerRef.current + 40);
        setPower(powerRef.current);
        scoreRef.current += 200;
        setScore(scoreRef.current);
        playSound('correct');

        // Overcharge repeaters
        for (const t of turretsRef.current) {
          if (t.type === 'repeater') {
            t.overchargeTimer = 8;
          }
        }
      } else {
        playSound('wrong');
      }
      setCurrentQuestion(null);
      isPausedRef.current = false;
      setIsPaused(false);
    },
    [currentQuestion, playSound]
  );

  const handleStart = useCallback(
    (difficulty: 'easy' | 'medium' | 'hard' = 'easy') => {
      turretsRef.current = [];
      cablesRef.current = [];
      enemiesRef.current = [];
      lasersRef.current = [];
      particlesRef.current = [];

      baseHpRef.current = 100;
      powerRef.current = 100;
      scoreRef.current = 0;
      waveRef.current = 1;
      spawnTimerRef.current = 0;
      questionTimerRef.current = 0;
      powerLossAlertTimerRef.current = 0;

      setBaseHp(100);
      setPower(100);
      setScore(0);
      setWave(1);
      setGameOver(false);
      setIsPaused(false);
      setSelectedTurret(null);
      selectedTurretRef.current = null;
      setCableStart(null);
      setPowerLossAlert(false);

      // Starter layout: generator connected to starter pulse turret
      cablesRef.current.push({
        fromX: genX,
        fromY: genY,
        toX: genX + 1,
        toY: genY,
      });
      turretsRef.current.push({
        id: 'starter_turret',
        type: 'pulse',
        gx: genX + 1,
        gy: genY,
        power: 0,
        range: 170,
        fireCooldown: 0,
        angle: 0,
        overchargeTimer: 0,
      });

      startGame(difficulty);
      gameOverRef.current = false;
      isPlayingRef.current = true;
      isPausedRef.current = false;
      setIsPlaying(true);
      playSound('win');
    },
    [startGame, playSound]
  );

  // Main Canvas & Simulation Loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();
    let prevActiveTurretCount = 1;

    const loop = (now: number) => {
      if (gameOverRef.current) return;

      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');

      if (ctx && canvas) {
        // --- 1. RENDER BACKGROUND & CYBER GRID ---
        ctx.fillStyle = '#080c14';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;
        for (let x = 0; x <= CANVAS_WIDTH; x += CELL_SIZE) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, CANVAS_HEIGHT);
          ctx.stroke();
        }
        for (let y = 0; y <= CANVAS_HEIGHT; y += CELL_SIZE) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(CANVAS_WIDTH, y);
          ctx.stroke();
        }

        // Generator Node (Left)
        const genCenterY = genY * CELL_SIZE + CELL_SIZE;
        const pulse = Math.sin(now / 180) * 4;
        ctx.fillStyle = '#1e3a8a';
        ctx.fillRect(0, genY * CELL_SIZE, CELL_SIZE, CELL_SIZE * 2);

        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 12 + pulse;
        ctx.beginPath();
        ctx.arc(CELL_SIZE / 2, genCenterY, 14 + pulse * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // --- 2. GAMEPLAY UPDATE ---
        if (isPlayingRef.current && !isPausedRef.current) {
          // Power regen (Repeater nodes increase passive regen)
          const repeaterBoost =
            turretsRef.current.filter((t) => t.type === 'repeater').length * 0.8;
          powerRef.current = Math.min(100, powerRef.current + dt * (4.5 + repeaterBoost));
          setPower(Math.floor(powerRef.current));

          // Science Quiz Challenge trigger
          questionTimerRef.current += dt;
          if (questionTimerRef.current > 38) {
            questionTimerRef.current = 0;
            const q = SCIENCE_QUESTIONS[Math.floor(Math.random() * SCIENCE_QUESTIONS.length)];
            setCurrentQuestion(q);
            isPausedRef.current = true;
            setIsPaused(true);
          }

          // Enemy Spawning
          spawnTimerRef.current += dt;
          const currentWave = waveRef.current;
          const isBossWave = currentWave % 5 === 0;
          const spawnInterval = Math.max(1.0, 3.8 - currentWave * 0.25);

          if (spawnTimerRef.current > spawnInterval) {
            spawnTimerRef.current = 0;
            const hasBossAlive = enemiesRef.current.some((e) => e.isBoss);

            if (isBossWave && !hasBossAlive && enemiesRef.current.length === 0) {
              // Spawn Boss
              enemiesRef.current.push({
                id: `boss_${Date.now()}`,
                x: CANVAS_WIDTH,
                y: Math.floor(ROWS / 2) * CELL_SIZE + CELL_SIZE / 2,
                hp: 350 + currentWave * 50,
                maxHp: 350 + currentWave * 50,
                speed: 18,
                isDisrupter: true,
                isBoss: true,
                color: '#dc2626',
                radius: 20,
              });
              playSynthesizedTone('alarm');
            } else {
              const isDisrupter = Math.random() < 0.3;
              const spawnY =
                (Math.floor(Math.random() * (ROWS - 2)) + 1) * CELL_SIZE + CELL_SIZE / 2;
              enemiesRef.current.push({
                id: `enemy_${Date.now()}_${Math.random()}`,
                x: CANVAS_WIDTH,
                y: spawnY,
                hp: isDisrupter ? 40 + currentWave * 10 : 65 + currentWave * 18,
                maxHp: isDisrupter ? 40 + currentWave * 10 : 65 + currentWave * 18,
                speed: isDisrupter ? 50 + currentWave * 4 : 32 + currentWave * 3,
                isDisrupter,
                isBoss: false,
                color: isDisrupter ? '#f97316' : '#ef4444',
                radius: 12,
              });
            }
          }

          // Active Grid Nodes (BFS)
          const activeNodes = getActiveConnections();

          // Check if power lost to active turrets
          let activeTurretCount = 0;
          for (const t of turretsRef.current) {
            if (activeNodes.has(`${t.gx},${t.gy}`)) activeTurretCount++;
          }
          if (activeTurretCount < prevActiveTurretCount && prevActiveTurretCount > 0) {
            powerLossAlertTimerRef.current = 3.5;
            setPowerLossAlert(true);
            playSynthesizedTone('alarm');
          }
          prevActiveTurretCount = activeTurretCount;

          if (powerLossAlertTimerRef.current > 0) {
            powerLossAlertTimerRef.current -= dt;
            if (powerLossAlertTimerRef.current <= 0) setPowerLossAlert(false);
          }

          // Update & Render Cables
          for (const c of cablesRef.current) {
            const k1 = `${c.fromX},${c.fromY}`;
            const k2 = `${c.toX},${c.toY}`;
            const isActive = activeNodes.has(k1) && activeNodes.has(k2);

            const x1 = c.fromX * CELL_SIZE + CELL_SIZE / 2;
            const y1 = c.fromY * CELL_SIZE + CELL_SIZE / 2;
            const x2 = c.toX * CELL_SIZE + CELL_SIZE / 2;
            const y2 = c.toY * CELL_SIZE + CELL_SIZE / 2;

            ctx.lineWidth = isActive ? 3.5 : 1.5;
            ctx.strokeStyle = isActive ? '#38bdf8' : 'rgba(100, 116, 139, 0.4)';
            if (isActive) {
              ctx.shadowColor = '#38bdf8';
              ctx.shadowBlur = 8;
            }
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            ctx.shadowBlur = 0;
          }

          // Update & Render Turrets
          for (const t of turretsRef.current) {
            const isPowered = activeNodes.has(`${t.gx},${t.gy}`);
            const tx = t.gx * CELL_SIZE + CELL_SIZE / 2;
            const ty = t.gy * CELL_SIZE + CELL_SIZE / 2;

            if (t.overchargeTimer > 0) {
              t.overchargeTimer -= dt;
            }

            // Target Finding
            const enemiesInRange = enemiesRef.current.filter(
              (e) => Math.hypot(e.x - tx, e.y - ty) <= t.range
            );
            enemiesInRange.sort((a, b) => a.x - b.x); // Prioritize closest to base

            const target = enemiesInRange[0] || null;
            if (target) {
              t.angle = Math.atan2(target.y - ty, target.x - tx);
            }

            // Shooting execution
            t.fireCooldown -= dt;
            if (isPowered && enemiesInRange.length > 0 && t.fireCooldown <= 0) {
              const isOver = t.overchargeTimer > 0;

              if (t.type === 'pulse') {
                t.fireCooldown = isOver ? 0.18 : 0.55;
                const dmg = isOver ? 38 : 20;
                target.hp -= dmg;
                lasersRef.current.push({
                  fromX: tx,
                  fromY: ty,
                  toX: target.x,
                  toY: target.y,
                  life: 0.1,
                  isOvercharge: isOver,
                });
                playSynthesizedTone('laser');
              } else if (t.type === 'tesla') {
                // AoE chain lightning to up to 3 enemies
                t.fireCooldown = isOver ? 0.4 : 0.9;
                const chainTargets = enemiesInRange.slice(0, isOver ? 5 : 3);
                for (const ct of chainTargets) {
                  ct.hp -= isOver ? 45 : 24;
                  lasersRef.current.push({
                    fromX: tx,
                    fromY: ty,
                    toX: ct.x,
                    toY: ct.y,
                    life: 0.15,
                    isOvercharge: isOver,
                    isTesla: true,
                  });
                }
                playSynthesizedTone('shock');
              } else if (t.type === 'repeater') {
                // Repeater generates periodic mini power boost
                t.fireCooldown = 3.0;
                powerRef.current = Math.min(100, powerRef.current + 8);
                triggerExplosion(tx, ty, '#fbbf24', 8);
              }

              // Check kills
              for (const e of enemiesRef.current) {
                if (e.hp <= 0) {
                  scoreRef.current += e.isBoss ? 500 : e.isDisrupter ? 140 : 90;
                  setScore(scoreRef.current);
                  triggerExplosion(e.x, e.y, e.color, e.isBoss ? 35 : 16);
                  playSynthesizedTone('boom');

                  // Disruptor explodes and damages/severs cables
                  if (e.isDisrupter) {
                    const cutRadius = CELL_SIZE * 2.2;
                    cablesRef.current = cablesRef.current.filter((c) => {
                      const cx = (c.fromX + c.toX) * 0.5 * CELL_SIZE + CELL_SIZE / 2;
                      const cy = (c.fromY + c.toY) * 0.5 * CELL_SIZE + CELL_SIZE / 2;
                      return Math.hypot(cx - e.x, cy - e.y) > cutRadius;
                    });
                  }
                }
              }
            }

            // Render Turret
            ctx.save();
            ctx.translate(tx, ty);

            // Selection indicator
            if (selectedTurretRef.current === t.id) {
              ctx.strokeStyle = '#facc15';
              ctx.lineWidth = 2;
              ctx.strokeRect(-CELL_SIZE / 2 + 2, -CELL_SIZE / 2 + 2, CELL_SIZE - 4, CELL_SIZE - 4);
            }

            // Turret Base
            const baseColor = isPowered
              ? t.overchargeTimer > 0
                ? '#9333ea'
                : t.type === 'tesla'
                  ? '#0284c7'
                  : t.type === 'repeater'
                    ? '#d97706'
                    : '#15803d'
              : '#334155';

            ctx.fillStyle = baseColor;
            ctx.beginPath();
            ctx.arc(0, 0, 13, 0, Math.PI * 2);
            ctx.fill();

            if (t.type === 'repeater') {
              // Draw capacitor diamond icon
              ctx.strokeStyle = '#fef08a';
              ctx.lineWidth = 2;
              ctx.strokeRect(-6, -6, 12, 12);
            } else {
              // Turret Barrel
              ctx.rotate(t.angle);
              ctx.fillStyle = isPowered
                ? t.overchargeTimer > 0
                  ? '#c084fc'
                  : '#4ade80'
                : '#64748b';
              ctx.fillRect(0, -3.5, 17, 7);
            }
            ctx.restore();
          }

          // Clean dead enemies
          const livingCountBefore = enemiesRef.current.length;
          enemiesRef.current = enemiesRef.current.filter((e) => e.hp > 0);
          if (livingCountBefore > 0 && enemiesRef.current.length === 0) {
            // Wave finished
            waveRef.current += 1;
            setWave(waveRef.current);
            powerRef.current = Math.min(100, powerRef.current + 25);
            setPower(powerRef.current);
            playSound('win');
          }

          // Update & Render Enemies
          for (const e of enemiesRef.current) {
            e.x -= e.speed * dt;

            ctx.save();
            ctx.translate(e.x, e.y);
            ctx.fillStyle = e.color;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = e.isBoss ? 2.5 : 1.5;

            if (e.isBoss) {
              // Octagon Giant Boss
              ctx.beginPath();
              for (let i = 0; i < 8; i++) {
                const a = (i * Math.PI) / 4 + now / 400;
                const bx = Math.cos(a) * e.radius;
                const by = Math.sin(a) * e.radius;
                if (i === 0) ctx.moveTo(bx, by);
                else ctx.lineTo(bx, by);
              }
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
            } else if (e.isDisrupter) {
              // Rotating Diamond
              ctx.rotate(now / 250);
              ctx.beginPath();
              ctx.moveTo(0, -e.radius);
              ctx.lineTo(e.radius, 0);
              ctx.lineTo(0, e.radius);
              ctx.lineTo(-e.radius, 0);
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
            } else {
              // Regular Hexagon
              ctx.beginPath();
              for (let i = 0; i < 6; i++) {
                const a = (i * Math.PI) / 3;
                const hx = Math.cos(a) * e.radius;
                const hy = Math.sin(a) * e.radius;
                if (i === 0) ctx.moveTo(hx, hy);
                else ctx.lineTo(hx, hy);
              }
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
            }

            // Health Bar
            const hpRatio = Math.max(0, e.hp / e.maxHp);
            const barW = e.radius * 2;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(-e.radius, -e.radius - 8, barW, 4);
            ctx.fillStyle = hpRatio > 0.5 ? '#22c55e' : hpRatio > 0.25 ? '#eab308' : '#ef4444';
            ctx.fillRect(-e.radius, -e.radius - 8, barW * hpRatio, 4);

            ctx.restore();

            // Reached Base
            if (e.x <= CELL_SIZE) {
              baseHpRef.current -= e.isBoss ? 50 : e.isDisrupter ? 25 : 15;
              setBaseHp(Math.max(0, baseHpRef.current));
              triggerExplosion(e.x, e.y, '#ef4444', 24);
              playSynthesizedTone('boom');
              e.hp = 0;

              if (baseHpRef.current <= 0) {
                handleGameOver();
              }
            }
          }

          // Update & Render Lasers
          for (let i = lasersRef.current.length - 1; i >= 0; i--) {
            const l = lasersRef.current[i];
            l.life -= dt;
            ctx.lineWidth = l.isOvercharge ? 4 : l.isTesla ? 2.5 : 2;
            ctx.strokeStyle = l.isOvercharge ? '#c084fc' : l.isTesla ? '#38bdf8' : '#60a5fa';
            ctx.shadowColor = ctx.strokeStyle;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.moveTo(l.fromX, l.fromY);
            ctx.lineTo(l.toX, l.toY);
            ctx.stroke();
            ctx.shadowBlur = 0;

            if (l.life <= 0) {
              lasersRef.current.splice(i, 1);
            }
          }

          // Update & Render Particles
          for (let i = particlesRef.current.length - 1; i >= 0; i--) {
            const p = particlesRef.current[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            const alpha = Math.max(0, p.life / p.maxLife);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius || 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;

            if (p.life <= 0) {
              particlesRef.current.splice(i, 1);
            }
          }
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [getActiveConnections, handleGameOver, triggerExplosion, playSynthesizedTone, playSound]);

  if (!isPlaying && !gameOver) {
    return (
      <div className="flex flex-col items-center gap-6 py-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500 ring-1 ring-blue-500/20">
          <Zap className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
          {t('game.grid_relay_td.title')}
        </h1>
        <p className="max-w-md text-sm text-gray-500 sm:text-base dark:text-slate-400">
          {t('game.grid_relay_td.desc')}
        </p>

        <div className="w-full max-w-md text-left">
          <HowToPlay
            steps={[
              { emoji: '⚡', text: t('game.grid_relay_td.howto.1') },
              { emoji: '🔌', text: t('game.grid_relay_td.howto.2') },
              { emoji: '🛡️', text: t('game.grid_relay_td.howto.3') },
              { emoji: '💥', text: t('game.grid_relay_td.howto.4') },
            ]}
          />
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <button
            onClick={() => handleStart('easy')}
            className="rounded-xl bg-emerald-600 px-6 py-2.5 font-bold text-white shadow-lg transition-all hover:bg-emerald-500 active:scale-95"
          >
            {t('game.difficulty.easy')}
          </button>
          <button
            onClick={() => handleStart('medium')}
            className="rounded-xl bg-amber-600 px-6 py-2.5 font-bold text-white shadow-lg transition-all hover:bg-amber-500 active:scale-95"
          >
            {t('game.difficulty.medium')}
          </button>
          <button
            onClick={() => handleStart('hard')}
            className="rounded-xl bg-rose-600 px-6 py-2.5 font-bold text-white shadow-lg transition-all hover:bg-rose-500 active:scale-95"
          >
            {t('game.difficulty.hard')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      {/* Top HUD */}
      <div className="flex w-full max-w-[640px] flex-wrap items-center justify-between gap-x-2 gap-y-2 px-2">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 rounded-lg bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-500">
            <Zap className="h-4 w-4" aria-hidden="true" />
            <span>{power} / 100W</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-500">
            <ShieldAlert className="h-4 w-4" aria-hidden="true" />
            <span>Core: {baseHp}%</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-500">
            <Flame className="h-4 w-4" aria-hidden="true" />
            <span>Wave {wave}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ScoreBoard score={score} />

          <button
            onClick={() => {
              isPausedRef.current = !isPaused;
              setIsPaused(!isPaused);
            }}
            disabled={quizActive}
            className="touch-target flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-40 dark:hover:bg-slate-800"
            aria-label={t('game.pause_label')}
          >
            <Pause className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex w-full max-w-[640px] flex-wrap items-center justify-between gap-x-2 gap-y-2 px-2">
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          <button
            onClick={() => {
              setBuildMode('turret');
              setSelectedTurretType('pulse');
              setCableStart(null);
            }}
            disabled={quizActive}
            className={cn(
              'touch-target flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors disabled:opacity-40',
              buildMode === 'turret' && selectedTurretType === 'pulse'
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-300'
            )}
          >
            <Cpu className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Pulse (30W)</span>
          </button>
          <button
            onClick={() => {
              setBuildMode('turret');
              setSelectedTurretType('tesla');
              setCableStart(null);
            }}
            disabled={quizActive}
            className={cn(
              'touch-target flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors disabled:opacity-40',
              buildMode === 'turret' && selectedTurretType === 'tesla'
                ? 'bg-cyan-600 text-white shadow'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-300'
            )}
          >
            <Radio className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Tesla AoE (50W)</span>
          </button>
          <button
            onClick={() => {
              setBuildMode('turret');
              setSelectedTurretType('repeater');
              setCableStart(null);
            }}
            disabled={quizActive}
            className={cn(
              'touch-target flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors disabled:opacity-40',
              buildMode === 'turret' && selectedTurretType === 'repeater'
                ? 'bg-amber-600 text-white shadow'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-300'
            )}
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Relay (20W)</span>
          </button>
          <button
            onClick={() => {
              setBuildMode('cable');
              setCableStart(null);
            }}
            disabled={quizActive}
            className={cn(
              'touch-target flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors disabled:opacity-40',
              buildMode === 'cable'
                ? 'bg-blue-600 text-white shadow'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-300'
            )}
          >
            <Zap className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Kabel (10W)</span>
          </button>
        </div>

        {selectedTurret && selectedTurret.type !== 'repeater' && (
          <button
            onClick={handleOvercharge}
            disabled={power < 25 || quizActive}
            className="touch-target flex items-center gap-1 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-purple-500 disabled:opacity-50"
          >
            <Battery className="h-4 w-4" aria-hidden="true" />
            <span>Overcharge (25W)</span>
          </button>
        )}
      </div>

      {/* Canvas Area */}
      <div className="relative w-full max-w-[640px] overflow-hidden rounded-xl border border-gray-800 bg-slate-950 shadow-2xl">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          className="block h-auto w-full cursor-pointer touch-none"
        />

        {/* Power Severed Emergency Alert Banner */}
        {powerLossAlert && (
          <div className="absolute left-1/2 top-2 flex -translate-x-1/2 animate-pulse items-center gap-1.5 rounded-full bg-rose-600/90 px-4 py-1 text-xs font-black uppercase tracking-wider text-white shadow-lg">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <span>{t('game.grid_relay_td.power_severed')}</span>
          </div>
        )}

        {/* Cable Drag Indicator */}
        {cableStart && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600/90 px-4 py-1 text-xs font-bold text-white shadow">
            {t('game.grid_relay_td.cable_hint')}
          </div>
        )}

        {/* Science Quiz Challenge Overlay */}
        {quizActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div
              ref={quizFocusRef}
              role="dialog"
              aria-modal="true"
              className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900"
            >
              <span className="text-xs font-extrabold uppercase tracking-wider text-blue-500">
                ⚡ Power Surge Challenge (+40W)
              </span>
              <h3
                aria-live="polite"
                className="mt-2 text-base font-bold text-gray-900 dark:text-white"
              >
                {currentQuestion.text}
              </h3>
              <div className="mt-4 flex flex-col gap-2">
                {currentQuestion.options.map((opt, idx) => (
                  <button
                    key={opt}
                    onClick={() => handleAnswerQuestion(idx)}
                    className="touch-target rounded-lg border border-gray-200 p-2.5 text-left text-xs font-medium text-gray-800 transition-colors hover:bg-blue-500 hover:text-white dark:border-slate-700 dark:text-gray-200 dark:hover:bg-blue-600"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Result Screen Modal */}
      {gameOver && result && (
        <div className="w-full max-w-sm">
          <ResultScreen
            score={score}
            xpEarned={result.xp}
            gameSlug="grid-relay-td"
            gameName="Grid Relay TD"
            onReplay={() => handleStart('easy')}
            description={t('game.over')}
          />
        </div>
      )}

      <p className="text-xs text-gray-400">
        {isTouch ? t('game.grid_relay_td.touch_controls') : t('game.grid_relay_td.controls')}
      </p>
    </div>
  );
}

export default GridRelayTD;
