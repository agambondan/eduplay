'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Crosshair, Flame, Pause, Shield, Sparkles, Target, Wind, Zap } from 'lucide-react';
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
const GRAVITY = 580; // px/s^2

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  active: boolean;
  type: 'boulder' | 'fireball';
}

interface Pillar {
  id: number;
  x: number;
  topY: number;
  bottomY: number;
  hp: number;
  maxHp: number;
  width: number;
  destroyed: boolean;
}

interface BridgeSegment {
  id: number;
  x1: number;
  x2: number;
  y: number;
  angle: number;
  fallen: boolean;
  fallSpeed: number;
}

interface Barrel {
  id: number;
  pulleyX: number;
  pulleyY: number;
  x: number;
  y: number;
  vy: number;
  isFalling: boolean;
  exploded: boolean;
}

interface Enemy {
  id: string;
  x: number;
  y: number;
  vy: number;
  hp: number;
  maxHp: number;
  speed: number;
  size: number;
  isFalling: boolean;
  color: string;
  isGiant: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface Question {
  text: string;
  options: string[];
  correct: number;
  explanation: string;
}

const PHYSICS_QUESTIONS: Question[] = [
  {
    text: 'Sudut elevasi terbaik untuk jangkauan tembakan terjauh dalam ruang hampa adalah?',
    options: ['45 Derajat', '30 Derajat', '60 Derajat', '90 Derajat'],
    correct: 0,
    explanation: 'Pada gerak parabola tanpa gesekan udara, sin(2θ) maksimum pada θ = 45°.',
  },
  {
    text: 'Rumus Energi Kinetik (Ek) dari sebuah proyektil bermassa m dengan kecepatan v adalah?',
    options: ['Ek = ½ m v²', 'Ek = m g h', 'Ek = m v', 'Ek = ½ m v'],
    correct: 0,
    explanation: 'Energi Kinetik dihitung dengan Ek = ½ m v².',
  },
  {
    text: 'Apa yang menyebabkan proyektil melengkung ke bawah saat ditembakkan horizontal?',
    options: [
      'Percepatan Gravitasi (g)',
      'Gaya Gesek Udara Saja',
      'Massa Proyektil Berkurang',
      'Inersia Mundur',
    ],
    correct: 0,
    explanation: 'Gaya gravitasi menarik proyektil ke bawah secara konstan (g ≈ 9.8 m/s²).',
  },
  {
    text: 'Jika massa batu digandakan dengan kecepatan yang sama, energi hantamannya akan?',
    options: ['Meningkat 2x lipat', 'Meningkat 4x lipat', 'Tetap sama', 'Berkurang setengah'],
    correct: 0,
    explanation: 'Energi kinetik berbanding lurus secara linier dengan massa proyektil.',
  },
];

export function BastionSiege() {
  const { t } = useLocale();
  const isTouch = useIsTouchDevice();
  const { playSound, soundEnabled, volume } = useSoundStore();
  const { startGame, endGame, submitScore } = useGame('bastion-siege', 'Bastion Siege', 'STEM');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [bastionHp, setBastionHp] = useState(100);
  const [wind, setWind] = useState(0);
  const [ammoType, setAmmoType] = useState<'boulder' | 'fireball'>('boulder');
  const [fireballAmmo, setFireballAmmo] = useState(3);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [result, setResult] = useState<{ xp: number; new_highscore: boolean } | null>(null);

  const quizActive = isPaused && !!currentQuestion;
  const quizFocusRef = useFocusTrap(quizActive);

  // Gameplay state refs
  const isPlayingRef = useRef(false);
  const isPausedRef = useRef(false);
  const scoreRef = useRef(0);
  const bastionHpRef = useRef(100);
  const windRef = useRef(0);
  const ammoTypeRef = useRef<'boulder' | 'fireball'>('boulder');
  const fireballAmmoRef = useRef(3);
  const gameOverTriggeredRef = useRef(false);

  // Aiming interaction
  const isAimingRef = useRef(false);
  const aimStartRef = useRef({ x: 0, y: 0 });
  const aimCurrentRef = useRef({ x: 0, y: 0 });
  const catapultPos = { x: 75, y: 280 };

  // World Entities
  const projectileRef = useRef<Projectile | null>(null);
  const pillarsRef = useRef<Pillar[]>([]);
  const segmentsRef = useRef<BridgeSegment[]>([]);
  const barrelsRef = useRef<Barrel[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const spawnTimerRef = useRef(0);
  const windChangeTimerRef = useRef(0);
  const questionTimerRef = useRef(0);
  const waveRef = useRef(1);

  // Procedural Web Audio SFX
  const playSfx = useCallback(
    (type: 'launch' | 'rockImpact' | 'bridgeSnap' | 'barrelExplode' | 'gateHit') => {
      const rampFloor = Math.max(0.0001, 0.001 * volume);
      playTone(soundEnabled, volume, (ctx, osc, gain, now) => {
        if (type === 'launch') {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(160, now);
          osc.frequency.exponentialRampToValueAtTime(450, now + 0.15);
          gain.gain.setValueAtTime(0.12 * volume, now);
          gain.gain.exponentialRampToValueAtTime(rampFloor, now + 0.15);
          osc.start(now);
          osc.stop(now + 0.15);
        } else if (type === 'rockImpact') {
          osc.type = 'square';
          osc.frequency.setValueAtTime(180, now);
          osc.frequency.exponentialRampToValueAtTime(40, now + 0.25);
          gain.gain.setValueAtTime(0.18 * volume, now);
          gain.gain.exponentialRampToValueAtTime(rampFloor, now + 0.25);
          osc.start(now);
          osc.stop(now + 0.25);
        } else if (type === 'bridgeSnap') {
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(320, now);
          osc.frequency.exponentialRampToValueAtTime(80, now + 0.3);
          gain.gain.setValueAtTime(0.15 * volume, now);
          gain.gain.exponentialRampToValueAtTime(rampFloor, now + 0.3);
          osc.start(now);
          osc.stop(now + 0.3);
        } else if (type === 'barrelExplode') {
          osc.type = 'square';
          osc.frequency.setValueAtTime(140, now);
          osc.frequency.exponentialRampToValueAtTime(25, now + 0.45);
          gain.gain.setValueAtTime(0.25 * volume, now);
          gain.gain.exponentialRampToValueAtTime(rampFloor, now + 0.45);
          osc.start(now);
          osc.stop(now + 0.45);
        } else if (type === 'gateHit') {
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(220, now);
          osc.frequency.linearRampToValueAtTime(90, now + 0.2);
          gain.gain.setValueAtTime(0.2 * volume, now);
          gain.gain.exponentialRampToValueAtTime(rampFloor, now + 0.2);
          osc.start(now);
          osc.stop(now + 0.2);
        }
      });
    },
    [soundEnabled, volume]
  );

  const triggerParticles = useCallback(
    (x: number, y: number, color: string, count = 16, sizeMultiplier = 1) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 40 + Math.random() * 140;
        particlesRef.current.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0.4 + Math.random() * 0.4,
          maxLife: 0.8,
          color,
          size: (2 + Math.random() * 3) * sizeMultiplier,
        });
      }
    },
    []
  );

  const initWorld = useCallback(() => {
    // 3 pillars
    pillarsRef.current = [
      { id: 1, x: 230, topY: 300, bottomY: 450, hp: 50, maxHp: 50, width: 14, destroyed: false },
      { id: 2, x: 340, topY: 300, bottomY: 450, hp: 50, maxHp: 50, width: 14, destroyed: false },
      { id: 3, x: 450, topY: 300, bottomY: 450, hp: 50, maxHp: 50, width: 14, destroyed: false },
    ];

    // 4 bridge segments
    segmentsRef.current = [
      { id: 0, x1: 120, x2: 230, y: 300, angle: 0, fallen: false, fallSpeed: 0 },
      { id: 1, x1: 230, x2: 340, y: 300, angle: 0, fallen: false, fallSpeed: 0 },
      { id: 2, x1: 340, x2: 450, y: 300, angle: 0, fallen: false, fallSpeed: 0 },
      { id: 3, x1: 450, x2: 560, y: 300, angle: 0, fallen: false, fallSpeed: 0 },
    ];

    // 2 suspended explosive kinetic barrels
    barrelsRef.current = [
      {
        id: 1,
        pulleyX: 285,
        pulleyY: 150,
        x: 285,
        y: 200,
        vy: 0,
        isFalling: false,
        exploded: false,
      },
      {
        id: 2,
        pulleyX: 395,
        pulleyY: 150,
        x: 395,
        y: 200,
        vy: 0,
        isFalling: false,
        exploded: false,
      },
    ];

    enemiesRef.current = [];
    particlesRef.current = [];
    projectileRef.current = null;
    windRef.current = Math.floor((Math.random() - 0.5) * 80);
    setWind(windRef.current);
  }, []);

  const handleGameOver = useCallback(async () => {
    if (gameOverTriggeredRef.current) return;
    gameOverTriggeredRef.current = true;
    isPlayingRef.current = false;
    setIsPlaying(false);
    setGameOver(true);
    playSound('lose');
    const finalScore = scoreRef.current;
    const res = await submitScore(finalScore);
    if (res) setResult({ xp: res.xp_earned, new_highscore: res.new_highscore });
    endGame();
  }, [submitScore, endGame, playSound]);

  const handleAnswerQuestion = useCallback(
    (optionIndex: number) => {
      if (!currentQuestion) return;
      if (optionIndex === currentQuestion.correct) {
        scoreRef.current += 250;
        setScore(scoreRef.current);
        fireballAmmoRef.current += 2;
        setFireballAmmo(fireballAmmoRef.current);
        bastionHpRef.current = Math.min(100, bastionHpRef.current + 25);
        setBastionHp(bastionHpRef.current);
        playSound('correct');
      } else {
        playSound('wrong');
      }
      setCurrentQuestion(null);
      isPausedRef.current = false;
      setIsPaused(false);
    },
    [currentQuestion, playSound]
  );

  const fireProjectile = useCallback(
    (powerX: number, powerY: number) => {
      if (projectileRef.current?.active) return;

      const type = ammoTypeRef.current;
      if (type === 'fireball') {
        if (fireballAmmoRef.current <= 0) {
          ammoTypeRef.current = 'boulder';
          setAmmoType('boulder');
          return;
        }
        fireballAmmoRef.current -= 1;
        setFireballAmmo(fireballAmmoRef.current);
      }

      projectileRef.current = {
        x: catapultPos.x,
        y: catapultPos.y,
        vx: powerX * 2.8,
        vy: powerY * 2.8,
        radius: type === 'fireball' ? 9 : 7,
        active: true,
        type,
      };

      playSfx('launch');
    },
    [catapultPos.x, catapultPos.y, playSfx]
  );

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPlayingRef.current || isPausedRef.current || projectileRef.current?.active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.setPointerCapture(e.pointerId);

    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    isAimingRef.current = true;
    aimStartRef.current = { x, y };
    aimCurrentRef.current = { x, y };
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isAimingRef.current || !isPlayingRef.current || isPausedRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    aimCurrentRef.current = { x, y };
  }, []);

  const handlePointerUp = useCallback(() => {
    if (!isAimingRef.current) return;
    isAimingRef.current = false;

    const dx = aimStartRef.current.x - aimCurrentRef.current.x;
    const dy = aimStartRef.current.y - aimCurrentRef.current.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 15) {
      // Calculate launch impulse vector
      const maxDist = 140;
      const power = Math.min(1, dist / maxDist);
      const angle = Math.atan2(dy, dx);
      const vx = Math.cos(angle) * power * 240;
      const vy = Math.sin(angle) * power * 240;

      // Only allow forward/upward launches
      if (vx > 0) {
        fireProjectile(vx, vy);
      }
    }
  }, [fireProjectile]);

  const handleStart = useCallback(
    (difficulty: 'easy' | 'medium' | 'hard' = 'easy') => {
      initWorld();
      bastionHpRef.current = 100;
      scoreRef.current = 0;
      fireballAmmoRef.current = 3;
      ammoTypeRef.current = 'boulder';
      waveRef.current = 1;
      spawnTimerRef.current = 0;
      windChangeTimerRef.current = 0;
      questionTimerRef.current = 0;
      gameOverTriggeredRef.current = false;

      setBastionHp(100);
      setScore(0);
      setFireballAmmo(3);
      setAmmoType('boulder');
      setGameOver(false);
      setIsPaused(false);

      startGame(difficulty);
      isPlayingRef.current = true;
      isPausedRef.current = false;
      setIsPlaying(true);
      playSound('win');
    },
    [initWorld, startGame, playSound]
  );

  // Main Canvas Physics & Rendering Loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      if (gameOverTriggeredRef.current) return;

      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');

      if (ctx && canvas) {
        // --- 1. RENDER SKY & CHASM BACKGROUND ---
        const skyGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
        skyGradient.addColorStop(0, '#090d16');
        skyGradient.addColorStop(0.65, '#1e293b');
        skyGradient.addColorStop(1, '#020617');
        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Left Bastion Rampart
        ctx.fillStyle = '#334155';
        ctx.fillRect(0, 270, 120, 210);
        ctx.fillStyle = '#475569';
        for (let i = 0; i < 4; i++) {
          ctx.fillRect(i * 30, 250, 20, 20); // Crenellations
        }

        // Right Cliff Rampart
        ctx.fillStyle = '#334155';
        ctx.fillRect(560, 270, 80, 210);

        // Chasm Abyss Fog
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fillRect(120, 440, 440, 40);

        // --- 2. GAMEPLAY PHYSICS UPDATE ---
        if (isPlayingRef.current && !isPausedRef.current) {
          // Dynamic crosswind changes periodically
          windChangeTimerRef.current += dt;
          if (windChangeTimerRef.current > 8) {
            windChangeTimerRef.current = 0;
            windRef.current = Math.floor((Math.random() - 0.5) * 100);
            setWind(windRef.current);
          }

          // Physics Trivia Quiz trigger
          questionTimerRef.current += dt;
          if (questionTimerRef.current > 40) {
            questionTimerRef.current = 0;
            const q = PHYSICS_QUESTIONS[Math.floor(Math.random() * PHYSICS_QUESTIONS.length)];
            setCurrentQuestion(q);
            isPausedRef.current = true;
            setIsPaused(true);
          }

          // Spawn Enemies
          spawnTimerRef.current += dt;
          if (spawnTimerRef.current > Math.max(1.4, 4.0 - waveRef.current * 0.3)) {
            spawnTimerRef.current = 0;
            const isGiant = Math.random() < 0.2;
            enemiesRef.current.push({
              id: `enemy_${Date.now()}_${Math.random()}`,
              x: 570,
              y: 286,
              vy: 0,
              hp: isGiant ? 160 : 45,
              maxHp: isGiant ? 160 : 45,
              speed: isGiant ? 18 : 34,
              size: isGiant ? 18 : 10,
              isFalling: false,
              color: isGiant ? '#ef4444' : '#f97316',
              isGiant,
            });
          }

          // --- 3. PROJECTILE SIMULATION ---
          const p = projectileRef.current;
          if (p && p.active) {
            // Apply gravity + wind resistance
            p.vx += windRef.current * 0.4 * dt;
            p.vy += GRAVITY * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;

            // Trail particles
            triggerParticles(p.x, p.y, p.type === 'fireball' ? '#f59e0b' : '#94a3b8', 2, 0.7);

            // Check hit on Support Pillars
            for (const pil of pillarsRef.current) {
              if (
                !pil.destroyed &&
                Math.abs(p.x - pil.x) < pil.width + p.radius &&
                p.y >= pil.topY &&
                p.y <= pil.bottomY
              ) {
                const dmg = p.type === 'fireball' ? 60 : 35;
                pil.hp -= dmg;
                p.active = false;
                playSfx('rockImpact');
                triggerParticles(p.x, p.y, '#94a3b8', 20);

                if (pil.hp <= 0) {
                  pil.destroyed = true;
                  playSfx('bridgeSnap');
                  triggerParticles(pil.x, (pil.topY + pil.bottomY) / 2, '#ca8a04', 30, 1.5);
                  scoreRef.current += 200;
                  setScore(scoreRef.current);

                  // Drop adjoining bridge segments
                  if (pil.id === 1) {
                    segmentsRef.current[0].fallen = true;
                    segmentsRef.current[1].fallen = true;
                  } else if (pil.id === 2) {
                    segmentsRef.current[1].fallen = true;
                    segmentsRef.current[2].fallen = true;
                  } else if (pil.id === 3) {
                    segmentsRef.current[2].fallen = true;
                    segmentsRef.current[3].fallen = true;
                  }
                }
                break;
              }
            }

            // Check hit on Barrels / Chains
            for (const b of barrelsRef.current) {
              if (p.active && !b.exploded) {
                // Hit chain
                if (Math.abs(p.x - b.pulleyX) < 12 && p.y >= b.pulleyY && p.y <= b.y) {
                  b.isFalling = true;
                  p.active = false;
                  playSfx('rockImpact');
                  break;
                }
                // Hit barrel directly
                if (Math.hypot(p.x - b.x, p.y - b.y) < 16 + p.radius) {
                  b.exploded = true;
                  p.active = false;
                  playSfx('barrelExplode');
                  triggerParticles(b.x, b.y, '#ea580c', 40, 2);

                  // Explosion shockwave damage to nearby enemies
                  for (const e of enemiesRef.current) {
                    if (Math.hypot(e.x - b.x, e.y - b.y) < 130) {
                      e.hp -= 150;
                      triggerParticles(e.x, e.y, '#f97316', 15);
                    }
                  }
                  break;
                }
              }
            }

            // Check hit on Enemies directly
            for (const e of enemiesRef.current) {
              if (p.active && Math.hypot(p.x - e.x, p.y - e.y) < e.size + p.radius) {
                e.hp -= p.type === 'fireball' ? 140 : 80;
                p.active = false;
                playSfx('rockImpact');
                triggerParticles(e.x, e.y, e.color, 24);
                if (e.hp <= 0) {
                  scoreRef.current += e.isGiant ? 150 : 75;
                  setScore(scoreRef.current);
                }
                break;
              }
            }

            // Out of bounds
            if (p.x > CANVAS_WIDTH || p.y > CANVAS_HEIGHT || p.x < 0) {
              p.active = false;
            }
          }

          // --- 4. BARRELS PHYSICS UPDATE ---
          for (const b of barrelsRef.current) {
            if (b.isFalling && !b.exploded) {
              b.vy += GRAVITY * dt;
              b.y += b.vy * dt;

              if (b.y >= 295) {
                b.exploded = true;
                playSfx('barrelExplode');
                triggerParticles(b.x, b.y, '#ef4444', 45, 2.2);

                for (const e of enemiesRef.current) {
                  if (Math.hypot(e.x - b.x, e.y - b.y) < 140) {
                    e.hp -= 180;
                    triggerParticles(e.x, e.y, '#f97316', 20);
                  }
                }
              }
            }
          }

          // --- 5. BRIDGE COLLAPSE & ENEMY MARCH ---
          for (const seg of segmentsRef.current) {
            if (seg.fallen) {
              seg.fallSpeed += GRAVITY * 0.6 * dt;
              seg.y += seg.fallSpeed * dt;
              seg.angle += 0.02;
            }
          }

          for (const e of enemiesRef.current) {
            if (!e.isFalling) {
              // Check if currently over a fallen segment
              let onSolidBridge = false;
              for (const seg of segmentsRef.current) {
                if (!seg.fallen && e.x >= seg.x1 && e.x <= seg.x2) {
                  onSolidBridge = true;
                  break;
                }
              }

              if (e.x > 560 || e.x < 120) onSolidBridge = true;

              if (!onSolidBridge) {
                e.isFalling = true;
                scoreRef.current += e.isGiant ? 200 : 100;
                setScore(scoreRef.current);
              } else {
                e.x -= e.speed * dt;
              }
            } else {
              // Fall into chasm
              e.vy += GRAVITY * dt;
              e.y += e.vy * dt;
            }

            // Reach Bastion Wall
            if (e.x <= 120 && !e.isFalling) {
              bastionHpRef.current -= e.isGiant ? 35 : 15;
              setBastionHp(Math.max(0, bastionHpRef.current));
              playSfx('gateHit');
              triggerParticles(e.x, e.y, '#ef4444', 20);
              e.hp = 0;

              if (bastionHpRef.current <= 0) {
                handleGameOver();
              }
            }
          }

          // Clean dead enemies
          enemiesRef.current = enemiesRef.current.filter(
            (e) => e.hp > 0 && e.y < CANVAS_HEIGHT + 30
          );
        }

        // --- 6. RENDERING WORLD OBJECTS ---
        // Render Pillars
        for (const pil of pillarsRef.current) {
          if (!pil.destroyed) {
            ctx.fillStyle = '#64748b';
            ctx.fillRect(pil.x - pil.width / 2, pil.topY, pil.width, pil.bottomY - pil.topY);
            // Health bar on pillar
            const hpRatio = pil.hp / pil.maxHp;
            ctx.fillStyle = hpRatio > 0.5 ? '#22c55e' : '#ef4444';
            ctx.fillRect(pil.x - pil.width / 2, pil.topY - 6, pil.width * hpRatio, 3);
          }
        }

        // Render Bridge Segments
        for (const seg of segmentsRef.current) {
          ctx.save();
          ctx.translate((seg.x1 + seg.x2) / 2, seg.y);
          ctx.rotate(seg.angle);
          ctx.fillStyle = '#b45309';
          ctx.fillRect(-(seg.x2 - seg.x1) / 2, -4, seg.x2 - seg.x1, 8);
          ctx.fillStyle = '#78350f';
          ctx.fillRect(-(seg.x2 - seg.x1) / 2, 4, seg.x2 - seg.x1, 2);
          ctx.restore();
        }

        // Render Pulleys and Oil Barrels
        for (const b of barrelsRef.current) {
          if (!b.exploded) {
            // Hanging Chain
            if (!b.isFalling) {
              ctx.strokeStyle = '#94a3b8';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(b.pulleyX, b.pulleyY);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();

              // Pulley wheel
              ctx.fillStyle = '#475569';
              ctx.beginPath();
              ctx.arc(b.pulleyX, b.pulleyY, 6, 0, Math.PI * 2);
              ctx.fill();
            }

            // Barrel
            ctx.fillStyle = '#dc2626';
            ctx.fillRect(b.x - 8, b.y - 12, 16, 24);
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(b.x - 8, b.y - 12, 16, 24);
          }
        }

        // Render Enemies
        for (const e of enemiesRef.current) {
          ctx.save();
          ctx.translate(e.x, e.y);
          ctx.fillStyle = e.color;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;

          if (e.isGiant) {
            // Heavy Diamond Monolith
            ctx.beginPath();
            ctx.moveTo(0, -e.size);
            ctx.lineTo(e.size, 0);
            ctx.lineTo(0, e.size);
            ctx.lineTo(-e.size, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          } else {
            // Triangle Scout
            ctx.beginPath();
            ctx.moveTo(-e.size, 0);
            ctx.lineTo(e.size, -e.size * 0.7);
            ctx.lineTo(e.size, e.size * 0.7);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }

          // Health bar
          if (!e.isFalling) {
            const hpRatio = Math.max(0, e.hp / e.maxHp);
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(-e.size, -e.size - 6, e.size * 2, 3);
            ctx.fillStyle = hpRatio > 0.5 ? '#22c55e' : '#ef4444';
            ctx.fillRect(-e.size, -e.size - 6, e.size * 2 * hpRatio, 3);
          }
          ctx.restore();
        }

        // Render Catapult Base & Arm
        ctx.fillStyle = '#78350f';
        ctx.fillRect(catapultPos.x - 16, catapultPos.y + 4, 32, 12);
        ctx.fillStyle = '#92400e';
        ctx.beginPath();
        ctx.arc(catapultPos.x, catapultPos.y + 4, 10, 0, Math.PI * 2);
        ctx.fill();

        // Render Trajectory Prediction Arc (When Aiming)
        if (isAimingRef.current && isPlayingRef.current && !projectileRef.current?.active) {
          const dx = aimStartRef.current.x - aimCurrentRef.current.x;
          const dy = aimStartRef.current.y - aimCurrentRef.current.y;
          const dist = Math.hypot(dx, dy);

          if (dist > 15 && dx > 0) {
            const maxDist = 140;
            const power = Math.min(1, dist / maxDist);
            const angle = Math.atan2(dy, dx);
            let simVx = Math.cos(angle) * power * 240 * 2.8;
            let simVy = Math.sin(angle) * power * 240 * 2.8;
            let simX = catapultPos.x;
            let simY = catapultPos.y;

            ctx.fillStyle = '#38bdf8';
            for (let t = 0; t < 24; t++) {
              simVx += windRef.current * 0.4 * 0.05;
              simVy += GRAVITY * 0.05;
              simX += simVx * 0.05;
              simY += simVy * 0.05;

              ctx.beginPath();
              ctx.arc(simX, simY, 2.5, 0, Math.PI * 2);
              ctx.fill();

              if (simY > CANVAS_HEIGHT) break;
            }
          }
        }

        // Render Active Projectile
        const p = projectileRef.current;
        if (p && p.active) {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.fillStyle = p.type === 'fireball' ? '#f59e0b' : '#94a3b8';
          ctx.shadowColor = ctx.fillStyle;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Render Particles
        for (let i = particlesRef.current.length - 1; i >= 0; i--) {
          const pt = particlesRef.current[i];
          pt.x += pt.vx * dt;
          pt.y += pt.vy * dt;
          pt.life -= dt;
          const a = Math.max(0, pt.life / pt.maxLife);
          ctx.fillStyle = pt.color;
          ctx.globalAlpha = a;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;

          if (pt.life <= 0) particlesRef.current.splice(i, 1);
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [catapultPos.x, catapultPos.y, handleGameOver, playSfx, triggerParticles]);

  if (!isPlaying && !gameOver) {
    return (
      <div className="flex flex-col items-center gap-6 py-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20">
          <Crosshair className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
          {t('game.bastion_siege.title')}
        </h1>
        <p className="max-w-md text-sm text-gray-500 sm:text-base dark:text-slate-400">
          {t('game.bastion_siege.desc')}
        </p>

        <div className="w-full max-w-md text-left">
          <HowToPlay
            steps={[
              { emoji: '🎯', text: t('game.bastion_siege.howto.1') },
              { emoji: '🌉', text: t('game.bastion_siege.howto.2') },
              { emoji: '💥', text: t('game.bastion_siege.howto.3') },
              { emoji: '🌬️', text: t('game.bastion_siege.howto.4') },
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
          <div className="flex items-center gap-1.5 rounded-lg bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-500">
            <Shield className="h-4 w-4" aria-hidden="true" />
            <span>Bastion: {bastionHp}%</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-400">
            <Wind className="h-4 w-4" aria-hidden="true" />
            <span>Wind: {wind > 0 ? `+${wind}` : wind} m/s</span>
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

      {/* Ammo Selection Toolbar */}
      <div className="flex w-full max-w-[640px] items-center justify-between gap-2 px-2">
        <div className="flex gap-2">
          <button
            onClick={() => {
              ammoTypeRef.current = 'boulder';
              setAmmoType('boulder');
            }}
            disabled={quizActive}
            className={cn(
              'touch-target flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-40',
              ammoType === 'boulder'
                ? 'bg-slate-600 text-white shadow'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-300'
            )}
          >
            <Target className="h-4 w-4" aria-hidden="true" />
            <span>Batu Balistik (∞)</span>
          </button>
          <button
            onClick={() => {
              if (fireballAmmoRef.current > 0) {
                ammoTypeRef.current = 'fireball';
                setAmmoType('fireball');
              }
            }}
            disabled={fireballAmmo <= 0 || quizActive}
            className={cn(
              'touch-target flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-40',
              ammoType === 'fireball'
                ? 'bg-amber-600 text-white shadow'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-300'
            )}
          >
            <Flame className="h-4 w-4" aria-hidden="true" />
            <span>Bola Api ({fireballAmmo})</span>
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="relative w-full max-w-[640px] overflow-hidden rounded-xl border border-gray-800 bg-slate-950 shadow-2xl">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="block h-auto w-full cursor-crosshair touch-none"
        />

        {/* Physics Challenge Quiz Modal */}
        {quizActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div
              ref={quizFocusRef}
              role="dialog"
              aria-modal="true"
              className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900"
            >
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-500">
                🎯 Kinematics Calculation (+2 Fireball)
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
                    className="touch-target rounded-lg border border-gray-200 p-2.5 text-left text-xs font-medium text-gray-800 transition-colors hover:bg-amber-500 hover:text-white dark:border-slate-700 dark:text-gray-200 dark:hover:bg-amber-600"
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
            isNewHighscore={result.new_highscore}
            gameSlug="bastion-siege"
            gameName="Bastion Siege"
            onReplay={() => handleStart('easy')}
            description={t('game.over')}
          />
        </div>
      )}

      <p className="text-xs text-gray-400">{t('game.bastion_siege.controls')}</p>
    </div>
  );
}

export default BastionSiege;
