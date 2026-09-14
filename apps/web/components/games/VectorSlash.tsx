'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pause,
  Shield,
  Zap,
  Flame,
  Swords,
  Sparkles,
  Move,
  RotateCcw,
} from 'lucide-react';
import { useGame } from '@/lib/hooks/useGame';
import { useIsTouchDevice } from '@/lib/hooks/useIsTouchDevice';
import { useLocale } from '@/lib/i18n';
import { useSoundStore } from '@/lib/stores/soundStore';
import { cn } from '@/lib/utils/cn';
import { HowToPlay } from '@/components/ui/HowToPlay';
import { ResultScreen } from '@/components/ui/ResultScreen';
import { ScoreBoard } from '@/components/ui/ScoreBoard';

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;

interface Point {
  x: number;
  y: number;
  time: number;
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

interface AfterImage {
  x: number;
  y: number;
  angle: number;
  alpha: number;
}

interface Enemy {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  size: number;
  type: 'drone' | 'golem';
  color: string;
  slamTimer?: number;
  slamMax?: number;
  slamRadius?: number;
  isSlamming?: boolean;
}

interface HazardZone {
  x: number;
  y: number;
  radius: number;
  timer: number;
  maxTimer: number;
}

export function VectorSlash() {
  const { t } = useLocale();
  const isTouch = useIsTouchDevice();
  const { playSound } = useSoundStore();
  const { startGame, endGame, submitScore } = useGame('vector-slash', 'Vector Slash', 'arcade');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [hp, setHp] = useState(100);
  const [stamina, setStamina] = useState(100);
  const [combo, setCombo] = useState(0);
  const [gestureFeedback, setGestureFeedback] = useState<string | null>(null);
  const [result, setResult] = useState<{ xp: number; new_highscore: boolean } | null>(null);

  // Gameplay Refs
  const isPlayingRef = useRef(false);
  const isPausedRef = useRef(false);
  const scoreRef = useRef(0);
  const hpRef = useRef(100);
  const staminaRef = useRef(100);
  const comboRef = useRef(0);
  const comboTimerRef = useRef(0);

  // Player state
  const playerRef = useRef({
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2,
    vx: 0,
    vy: 0,
    angle: 0,
    isDashing: false,
    dashTimer: 0,
    dashDirX: 0,
    dashDirY: 0,
    invincibleTimer: 0,
    whirlwindTimer: 0,
    thrustTimer: 0,
    thrustDirX: 0,
    thrustDirY: 0,
  });

  const keysRef = useRef<Record<string, boolean>>({});
  const enemiesRef = useRef<Enemy[]>([]);
  const hazardsRef = useRef<HazardZone[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const afterImagesRef = useRef<AfterImage[]>([]);
  const gestureTrailRef = useRef<Point[]>([]);
  const isDrawingRef = useRef(false);
  const spawnTimerRef = useRef(0);
  const waveRef = useRef(1);

  // Web Audio Synth for Custom Slashes
  const playSfx = useCallback((type: 'slash' | 'whirlwind' | 'thrust' | 'dodge' | 'slam' | 'hit') => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'whirlwind') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.25);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'thrust') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(900, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.2);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'dodge') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'slam') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.35);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'hit') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(500, now);
        osc.frequency.linearRampToValueAtTime(200, now + 0.08);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      }
    } catch {
      // Audio context restricted or unavailable
    }
  }, []);

  const triggerParticles = useCallback((x: number, y: number, color: string, count = 12) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 120;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.7,
        color,
        size: 2 + Math.random() * 2.5,
      });
    }
  }, []);

  const handleGameOver = useCallback(async () => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    setGameOver(true);
    playSound('lose');
    const finalScore = scoreRef.current;
    const res = await submitScore(finalScore);
    if (res) setResult({ xp: res.xp_earned, new_highscore: res.new_highscore });
    endGame();
  }, [submitScore, endGame, playSound]);

  // Gesture Recognition Analysis
  const evaluateGesture = useCallback((points: Point[]) => {
    if (points.length < 5) return;

    const start = points[0];
    const end = points[points.length - 1];

    // Total stroke path length
    let totalLen = 0;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (let i = 0; i < points.length; i++) {
      minX = Math.min(minX, points[i].x);
      maxX = Math.max(maxX, points[i].x);
      minY = Math.min(minY, points[i].y);
      maxY = Math.max(maxY, points[i].y);
      if (i > 0) {
        totalLen += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
      }
    }

    const distStartEnd = Math.hypot(end.x - start.x, end.y - start.y);
    const boxW = Math.max(1, maxX - minX);
    const boxH = Math.max(1, maxY - minY);
    const aspectRatio = boxW / boxH;

    // 1. Check Circle Gesture (Whirlwind Slash)
    const isClosedLoop = distStartEnd < 55 || distStartEnd / totalLen < 0.28;
    const isBigEnough = totalLen > 110 && boxW > 40 && boxH > 40;
    const isRoughlyCircular = aspectRatio >= 0.45 && aspectRatio <= 2.2;

    if (isClosedLoop && isBigEnough && isRoughlyCircular) {
      // Execute Whirlwind Slash
      const p = playerRef.current;
      p.whirlwindTimer = 0.35;
      playSfx('whirlwind');
      setGestureFeedback('🌀 WHIRLWIND SLASH!');
      setTimeout(() => setGestureFeedback(null), 1200);

      // Hit enemies around player
      const whirlRadius = 140;
      let hitCount = 0;
      for (const e of enemiesRef.current) {
        const d = Math.hypot(e.x - p.x, e.y - p.y);
        if (d <= whirlRadius) {
          e.hp -= 80;
          hitCount++;
          // Knockback
          const angle = Math.atan2(e.y - p.y, e.x - p.x);
          e.x += Math.cos(angle) * 60;
          e.y += Math.sin(angle) * 60;
          triggerParticles(e.x, e.y, '#38bdf8', 16);
        }
      }

      if (hitCount > 0) {
        comboRef.current += hitCount;
        comboTimerRef.current = 3.0;
        setCombo(comboRef.current);
        scoreRef.current += hitCount * 120 * Math.max(1, comboRef.current);
        setScore(scoreRef.current);
      }
      return;
    }

    // 2. Check Line Gesture (Dash Thrust)
    const isStraightLine = distStartEnd / totalLen > 0.78 && totalLen > 65;
    if (isStraightLine) {
      const p = playerRef.current;
      const dirX = (end.x - start.x) / distStartEnd;
      const dirY = (end.y - start.y) / distStartEnd;

      p.thrustTimer = 0.22;
      p.thrustDirX = dirX;
      p.thrustDirY = dirY;
      p.invincibleTimer = 0.3;
      playSfx('thrust');
      setGestureFeedback('⚡ VECTOR DASH THRUST!');
      setTimeout(() => setGestureFeedback(null), 1200);

      // Pierce through line trajectory
      let thrustKills = 0;
      for (const e of enemiesRef.current) {
        const toEx = e.x - p.x;
        const toEy = e.y - p.y;
        const proj = toEx * dirX + toEy * dirY;
        const perp = Math.abs(toEx * -dirY + toEy * dirX);

        if (proj >= 0 && proj <= 240 && perp <= e.size + 20) {
          e.hp -= 120;
          thrustKills++;
          triggerParticles(e.x, e.y, '#c084fc', 20);
        }
      }

      if (thrustKills > 0) {
        comboRef.current += thrustKills;
        comboTimerRef.current = 3.5;
        setCombo(comboRef.current);
        scoreRef.current += thrustKills * 150 * Math.max(1, comboRef.current);
        setScore(scoreRef.current);
      }
    }
  }, [playSfx, triggerParticles]);

  // Dash Action
  const performDodge = useCallback(() => {
    const p = playerRef.current;
    if (p.isDashing || staminaRef.current < 25) return;

    staminaRef.current -= 25;
    setStamina(Math.floor(staminaRef.current));

    let dx = 0;
    let dy = 0;
    if (keysRef.current['w'] || keysRef.current['arrowup']) dy -= 1;
    if (keysRef.current['s'] || keysRef.current['arrowdown']) dy += 1;
    if (keysRef.current['a'] || keysRef.current['arrowleft']) dx -= 1;
    if (keysRef.current['d'] || keysRef.current['arrowright']) dx += 1;

    if (dx === 0 && dy === 0) {
      dx = Math.cos(p.angle);
      dy = Math.sin(p.angle);
    } else {
      const len = Math.hypot(dx, dy);
      dx /= len;
      dy /= len;
    }

    p.isDashing = true;
    p.dashTimer = 0.2;
    p.dashDirX = dx;
    p.dashDirY = dy;
    p.invincibleTimer = 0.3;
    playSfx('dodge');
  }, [playSfx]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPlayingRef.current || isPausedRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    isDrawingRef.current = true;
    gestureTrailRef.current = [{ x, y, time: performance.now() }];
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !isPlayingRef.current || isPausedRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    gestureTrailRef.current.push({ x, y, time: performance.now() });

    // Aim player toward pointer
    const p = playerRef.current;
    p.angle = Math.atan2(y - p.y, x - p.x);
  }, []);

  const handlePointerUp = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    evaluateGesture(gestureTrailRef.current);
    gestureTrailRef.current = [];
  }, [evaluateGesture]);

  const handleStart = useCallback((difficulty: 'easy' | 'medium' | 'hard' = 'easy') => {
    enemiesRef.current = [];
    hazardsRef.current = [];
    particlesRef.current = [];
    afterImagesRef.current = [];
    gestureTrailRef.current = [];

    hpRef.current = 100;
    staminaRef.current = 100;
    scoreRef.current = 0;
    comboRef.current = 0;
    comboTimerRef.current = 0;
    spawnTimerRef.current = 0;
    waveRef.current = 1;

    playerRef.current = {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT / 2,
      vx: 0,
      vy: 0,
      angle: 0,
      isDashing: false,
      dashTimer: 0,
      dashDirX: 0,
      dashDirY: 0,
      invincibleTimer: 0,
      whirlwindTimer: 0,
      thrustTimer: 0,
      thrustDirX: 0,
      thrustDirY: 0,
    };

    setHp(100);
    setStamina(100);
    setScore(0);
    setCombo(0);
    setGameOver(false);
    setIsPaused(false);
    setGestureFeedback(null);

    startGame(difficulty);
    isPlayingRef.current = true;
    isPausedRef.current = false;
    setIsPlaying(true);
    playSound('win');
  }, [startGame, playSound]);

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = true;
      if (e.key === ' ' || e.key === 'Shift') {
        e.preventDefault();
        performDodge();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [performDodge]);

  // Main Canvas & Simulation Loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');

      if (ctx && canvas) {
        // --- 1. RENDER ARENA ---
        ctx.fillStyle = '#060911';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Isometric perspective grid lines
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.06)';
        ctx.lineWidth = 1;
        for (let x = 0; x <= CANVAS_WIDTH; x += 32) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, CANVAS_HEIGHT);
          ctx.stroke();
        }
        for (let y = 0; y <= CANVAS_HEIGHT; y += 32) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(CANVAS_WIDTH, y);
          ctx.stroke();
        }

        // --- 2. GAMEPLAY UPDATE ---
        if (isPlayingRef.current && !isPausedRef.current) {
          const p = playerRef.current;

          // Stamina regen
          staminaRef.current = Math.min(100, staminaRef.current + dt * 28);
          setStamina(Math.floor(staminaRef.current));

          // Combo timer decrement
          if (comboTimerRef.current > 0) {
            comboTimerRef.current -= dt;
            if (comboTimerRef.current <= 0) {
              comboRef.current = 0;
              setCombo(0);
            }
          }

          // Player Movement Update
          if (p.whirlwindTimer > 0) {
            p.whirlwindTimer -= dt;
          } else if (p.thrustTimer > 0) {
            p.thrustTimer -= dt;
            p.x += p.thrustDirX * 800 * dt;
            p.y += p.thrustDirY * 800 * dt;
            afterImagesRef.current.push({ x: p.x, y: p.y, angle: p.angle, alpha: 0.7 });
          } else if (p.isDashing) {
            p.dashTimer -= dt;
            p.x += p.dashDirX * 520 * dt;
            p.y += p.dashDirY * 520 * dt;
            afterImagesRef.current.push({ x: p.x, y: p.y, angle: p.angle, alpha: 0.6 });
            if (p.dashTimer <= 0) p.isDashing = false;
          } else {
            let mx = 0;
            let my = 0;
            if (keysRef.current['w'] || keysRef.current['arrowup']) my -= 1;
            if (keysRef.current['s'] || keysRef.current['arrowdown']) my += 1;
            if (keysRef.current['a'] || keysRef.current['arrowleft']) mx -= 1;
            if (keysRef.current['d'] || keysRef.current['arrowright']) mx += 1;

            if (mx !== 0 || my !== 0) {
              const len = Math.hypot(mx, my);
              mx /= len;
              my /= len;
              p.x += mx * 180 * dt;
              p.y += my * 180 * dt;
              p.angle = Math.atan2(my, mx);
            }
          }

          // Boundary clamp
          p.x = Math.max(20, Math.min(CANVAS_WIDTH - 20, p.x));
          p.y = Math.max(20, Math.min(CANVAS_HEIGHT - 20, p.y));

          if (p.invincibleTimer > 0) {
            p.invincibleTimer -= dt;
          }

          // Spawn Enemies
          spawnTimerRef.current += dt;
          if (spawnTimerRef.current > Math.max(1.0, 3.2 - waveRef.current * 0.2)) {
            spawnTimerRef.current = 0;
            const isGolem = Math.random() < 0.25;
            const edge = Math.floor(Math.random() * 4);
            let ex = 0;
            let ey = 0;
            if (edge === 0) { ex = Math.random() * CANVAS_WIDTH; ey = 0; }
            else if (edge === 1) { ex = CANVAS_WIDTH; ey = Math.random() * CANVAS_HEIGHT; }
            else if (edge === 2) { ex = Math.random() * CANVAS_WIDTH; ey = CANVAS_HEIGHT; }
            else { ex = 0; ey = Math.random() * CANVAS_HEIGHT; }

            enemiesRef.current.push({
              id: `enemy_${Date.now()}_${Math.random()}`,
              x: ex,
              y: ey,
              hp: isGolem ? 200 : 50,
              maxHp: isGolem ? 200 : 50,
              speed: isGolem ? 40 : 85,
              size: isGolem ? 22 : 12,
              type: isGolem ? 'golem' : 'drone',
              color: isGolem ? '#e11d48' : '#f59e0b',
              slamTimer: isGolem ? 3.0 : 0,
              slamMax: 3.0,
              slamRadius: 85,
            });
          }

          // Update Hazards (Telegraphed Golem ground slams)
          for (let i = hazardsRef.current.length - 1; i >= 0; i--) {
            const h = hazardsRef.current[i];
            h.timer -= dt;

            // Render telegraph warning zone
            const progress = 1 - h.timer / h.maxTimer;
            ctx.fillStyle = `rgba(239, 68, 68, ${0.15 + progress * 0.25})`;
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(h.x, h.y, h.radius * progress, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
            ctx.stroke();

            // Slam detonation
            if (h.timer <= 0) {
              playSfx('slam');
              triggerParticles(h.x, h.y, '#ef4444', 28);
              if (Math.hypot(p.x - h.x, p.y - h.y) <= h.radius && p.invincibleTimer <= 0) {
                hpRef.current -= 35;
                setHp(Math.max(0, hpRef.current));
                playSfx('hit');
                if (hpRef.current <= 0) handleGameOver();
              }
              hazardsRef.current.splice(i, 1);
            }
          }

          // Update Enemies
          for (const e of enemiesRef.current) {
            const dx = p.x - e.x;
            const dy = p.y - e.y;
            const dist = Math.hypot(dx, dy);

            if (e.type === 'golem') {
              if (e.slamTimer !== undefined) {
                e.slamTimer -= dt;
                if (e.slamTimer <= 0) {
                  e.slamTimer = e.slamMax;
                  hazardsRef.current.push({
                    x: p.x,
                    y: p.y,
                    radius: e.slamRadius || 85,
                    timer: 1.2,
                    maxTimer: 1.2,
                  });
                }
              }
              if (dist > 60) {
                e.x += (dx / dist) * e.speed * dt;
                e.y += (dy / dist) * e.speed * dt;
              }
            } else {
              // Drone chase
              if (dist > 1) {
                e.x += (dx / dist) * e.speed * dt;
                e.y += (dy / dist) * e.speed * dt;
              }

              // Contact damage
              if (dist <= e.size + 14 && p.invincibleTimer <= 0) {
                hpRef.current -= 12;
                setHp(Math.max(0, hpRef.current));
                playSfx('hit');
                p.invincibleTimer = 0.4;
                if (hpRef.current <= 0) handleGameOver();
              }
            }

            // Render Enemy
            ctx.save();
            ctx.translate(e.x, e.y);
            ctx.fillStyle = e.color;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;

            if (e.type === 'golem') {
              // Heavy Octagon
              ctx.beginPath();
              for (let i = 0; i < 8; i++) {
                const a = (i * Math.PI) / 4;
                const gx = Math.cos(a) * e.size;
                const gy = Math.sin(a) * e.size;
                if (i === 0) ctx.moveTo(gx, gy);
                else ctx.lineTo(gx, gy);
              }
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
            } else {
              // Sharp Triangle Drone
              const angle = Math.atan2(p.y - e.y, p.x - e.x);
              ctx.rotate(angle);
              ctx.beginPath();
              ctx.moveTo(e.size * 1.4, 0);
              ctx.lineTo(-e.size, -e.size * 0.8);
              ctx.lineTo(-e.size, e.size * 0.8);
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
            }

            // Health bar
            const hpRatio = Math.max(0, e.hp / e.maxHp);
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(-e.size, -e.size - 8, e.size * 2, 4);
            ctx.fillStyle = hpRatio > 0.5 ? '#22c55e' : '#ef4444';
            ctx.fillRect(-e.size, -e.size - 8, e.size * 2 * hpRatio, 4);

            ctx.restore();
          }

          // Clean dead enemies
          enemiesRef.current = enemiesRef.current.filter((e) => e.hp > 0);

          // Update & Render Afterimages
          for (let i = afterImagesRef.current.length - 1; i >= 0; i--) {
            const img = afterImagesRef.current[i];
            img.alpha -= dt * 3;
            ctx.save();
            ctx.translate(img.x, img.y);
            ctx.rotate(img.angle);
            ctx.fillStyle = `rgba(56, 189, 248, ${Math.max(0, img.alpha * 0.4)})`;
            ctx.beginPath();
            ctx.arc(0, 0, 14, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            if (img.alpha <= 0) afterImagesRef.current.splice(i, 1);
          }

          // Render Player Character
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.angle);

          if (p.invincibleTimer > 0 && Math.floor(now / 80) % 2 === 0) {
            ctx.globalAlpha = 0.5;
          }

          // Whirlwind Effect
          if (p.whirlwindTimer > 0) {
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 4;
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 16;
            ctx.beginPath();
            ctx.arc(0, 0, 120 * (1 - p.whirlwindTimer / 0.35), 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
          }

          // Player Hexagon Core
          ctx.fillStyle = '#0284c7';
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const a = (i * Math.PI) / 3;
            const px = Math.cos(a) * 14;
            const py = Math.sin(a) * 14;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Forward Weapon Vector
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(8, -2, 14, 4);

          ctx.restore();

          // Render Gesture Trail (Neon Blue glow line)
          if (gestureTrailRef.current.length > 1) {
            ctx.strokeStyle = '#a855f7';
            ctx.lineWidth = 3.5;
            ctx.shadowColor = '#c084fc';
            ctx.shadowBlur = 10;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(gestureTrailRef.current[0].x, gestureTrailRef.current[0].y);
            for (let i = 1; i < gestureTrailRef.current.length; i++) {
              ctx.lineTo(gestureTrailRef.current[i].x, gestureTrailRef.current[i].y);
            }
            ctx.stroke();
            ctx.shadowBlur = 0;
          }

          // Update & Render Particles
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
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [handleGameOver, playSfx, triggerParticles]);

  if (!isPlaying && !gameOver) {
    return (
      <div className="flex flex-col items-center gap-6 py-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-500 ring-1 ring-cyan-500/20">
          <Swords className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
          {t('game.vector_slash.title')}
        </h1>
        <p className="max-w-md text-sm text-gray-500 dark:text-slate-400 sm:text-base">
          {t('game.vector_slash.desc')}
        </p>

        <div className="w-full max-w-md text-left">
          <HowToPlay
            steps={[
              { emoji: '🎮', text: t('game.vector_slash.howto.1') },
              { emoji: '🛡️', text: t('game.vector_slash.howto.2') },
              { emoji: '🌀', text: t('game.vector_slash.howto.3') },
              { emoji: '⚡', text: t('game.vector_slash.howto.4') },
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
      <div className="flex w-full max-w-[640px] items-center justify-between gap-2 px-2">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 rounded-lg bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-500">
            <Shield className="h-4 w-4" />
            <span>HP: {hp}%</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-500">
            <Zap className="h-4 w-4" />
            <span>Stamina: {stamina}%</span>
          </div>
          {combo > 1 && (
            <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-1 text-xs font-extrabold text-amber-500 animate-pulse">
              <Flame className="h-4 w-4" />
              <span>COMBO x{combo}</span>
            </div>
          )}
        </div>

        <ScoreBoard score={score} />

        <button
          onClick={() => {
            isPausedRef.current = !isPaused;
            setIsPaused(!isPaused);
          }}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800"
          aria-label={t('game.pause_label')}
        >
          <Pause className="h-4 w-4" />
        </button>
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

        {/* Gesture Recognition Popup Banner */}
        {gestureFeedback && (
          <div className="animate-bounce absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-purple-600/90 px-5 py-1.5 text-xs font-black uppercase tracking-wider text-white shadow-xl">
            <Sparkles className="h-4 w-4 text-amber-300" />
            <span>{gestureFeedback}</span>
          </div>
        )}
      </div>

      {/* Mobile Dodge Button */}
      {isTouch && (
        <div className="flex w-full max-w-[640px] justify-end px-2">
          <button
            onClick={performDodge}
            disabled={stamina < 25}
            className="flex items-center gap-2 rounded-2xl bg-cyan-600 px-6 py-3 font-extrabold text-white shadow-lg active:scale-95 disabled:opacity-40"
          >
            <Move className="h-5 w-5" />
            <span>DODGE ROLL</span>
          </button>
        </div>
      )}

      {/* Result Screen Modal */}
      {gameOver && result && (
        <div className="w-full max-w-sm">
          <ResultScreen
            score={score}
            xpEarned={result.xp}
            gameSlug="vector-slash"
            gameName="Vector Slash"
            onReplay={() => handleStart('easy')}
            description={t('game.over')}
          />
        </div>
      )}

      <p className="text-xs text-gray-400">
        {isTouch ? t('game.vector_slash.touch_controls') : t('game.vector_slash.controls')}
      </p>
    </div>
  );
}

export default VectorSlash;
