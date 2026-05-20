'use client';

import { useEffect, useRef } from 'react';

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    size: number;
    rotation: number;
    rotationSpeed: number;
    opacity: number;
}

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

function createParticle(canvasWidth: number): Particle {
    return {
        x: Math.random() * canvasWidth,
        y: -10,
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 3 + 2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: Math.random() * 8 + 4,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        opacity: 1,
    };
}

interface ConfettiCanvasProps {
    active: boolean;
    duration?: number;
    particleCount?: number;
    onDone?: () => void;
}

export function ConfettiCanvas({ active, duration = 2500, particleCount = 80, onDone }: ConfettiCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animRef = useRef<number>(0);
    const startRef = useRef<number>(0);

    useEffect(() => {
        if (!active) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        const particles: Particle[] = Array.from({ length: particleCount }, () =>
            createParticle(canvas.width),
        );

        startRef.current = performance.now();

        const animate = (now: number) => {
            const elapsed = now - startRef.current;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            for (const p of particles) {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.08; // gravity
                p.rotation += p.rotationSpeed;
                p.opacity = Math.max(0, 1 - elapsed / duration);

                ctx.save();
                ctx.globalAlpha = p.opacity;
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
                ctx.restore();
            }

            if (elapsed < duration) {
                animRef.current = requestAnimationFrame(animate);
            } else {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                onDone?.();
            }
        };

        animRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animRef.current);
    }, [active, duration, particleCount, onDone]);

    if (!active) return null;

    return (
        <canvas
            ref={canvasRef}
            className='pointer-events-none fixed inset-0 z-40 h-full w-full'
            aria-hidden='true'
        />
    );
}
