'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SoundState {
  soundEnabled: boolean;
  musicEnabled: boolean;
  toggleSound: () => void;
  toggleMusic: () => void;
  playSound: (type: 'win' | 'lose' | 'click' | 'pop' | 'correct' | 'wrong') => void;
}

export const useSoundStore = create<SoundState>()(
  persist(
    (set, get) => ({
      soundEnabled: true,
      musicEnabled: true,
      toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
      toggleMusic: () => set((state) => ({ musicEnabled: !state.musicEnabled })),
      playSound: (type) => {
        if (!get().soundEnabled) return;

        try {
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          if (!AudioContext) return;

          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();

          osc.connect(gainNode);
          gainNode.connect(ctx.destination);

          switch (type) {
            case 'click':
              osc.type = 'sine';
              osc.frequency.setValueAtTime(600, ctx.currentTime);
              osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
              gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
              gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
              osc.start();
              osc.stop(ctx.currentTime + 0.1);
              break;
            case 'pop':
              osc.type = 'square';
              osc.frequency.setValueAtTime(400, ctx.currentTime);
              osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1);
              gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
              gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
              osc.start();
              osc.stop(ctx.currentTime + 0.1);
              break;
            case 'win':
              osc.type = 'triangle';
              osc.frequency.setValueAtTime(400, ctx.currentTime);
              osc.frequency.setValueAtTime(600, ctx.currentTime + 0.1);
              osc.frequency.setValueAtTime(800, ctx.currentTime + 0.2);
              gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
              gainNode.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.3);
              gainNode.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.4);
              osc.start();
              osc.stop(ctx.currentTime + 0.4);
              break;
            case 'lose':
              osc.type = 'sawtooth';
              osc.frequency.setValueAtTime(300, ctx.currentTime);
              osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);
              gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
              gainNode.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.3);
              osc.start();
              osc.stop(ctx.currentTime + 0.3);
              break;
            case 'correct':
              osc.type = 'triangle';
              osc.frequency.setValueAtTime(523.25, ctx.currentTime);
              osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08);
              osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16);
              gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
              gainNode.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.25);
              osc.start();
              osc.stop(ctx.currentTime + 0.25);
              break;
            case 'wrong':
              osc.type = 'sawtooth';
              osc.frequency.setValueAtTime(200, ctx.currentTime);
              osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.2);
              gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
              gainNode.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.2);
              osc.start();
              osc.stop(ctx.currentTime + 0.2);
              break;
          }
        } catch {
          // Silent catch for browsers blocking AudioContext without interaction
        }
      },
    }),
    {
      name: 'sound-storage',
    }
  )
);
