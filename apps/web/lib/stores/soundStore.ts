'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { playTone } from '@/lib/utils/audioSynth';

interface SoundState {
  soundEnabled: boolean;
  musicEnabled: boolean;
  volume: number;
  hapticsEnabled: boolean;
  toggleSound: () => void;
  toggleMusic: () => void;
  setVolume: (volume: number) => void;
  toggleHaptics: () => void;
  playSound: (type: 'win' | 'lose' | 'click' | 'pop' | 'correct' | 'wrong') => void;
}

export const useSoundStore = create<SoundState>()(
  persist(
    (set, get) => ({
      soundEnabled: true,
      musicEnabled: true,
      volume: 0.8,
      hapticsEnabled: true,
      toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
      toggleMusic: () => set((state) => ({ musicEnabled: !state.musicEnabled })),
      setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),
      toggleHaptics: () => set((state) => ({ hapticsEnabled: !state.hapticsEnabled })),
      playSound: (type) => {
        const { soundEnabled, volume } = get();
        const rampFloor = Math.max(0.0001, 0.01 * volume);

        playTone(soundEnabled, volume, (ctx, osc, gainNode, now) => {
          switch (type) {
            case 'click':
              osc.type = 'sine';
              osc.frequency.setValueAtTime(600, now);
              osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
              gainNode.gain.setValueAtTime(0.1 * volume, now);
              gainNode.gain.exponentialRampToValueAtTime(rampFloor, now + 0.1);
              osc.start(now);
              osc.stop(now + 0.1);
              break;
            case 'pop':
              osc.type = 'square';
              osc.frequency.setValueAtTime(400, now);
              osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
              gainNode.gain.setValueAtTime(0.2 * volume, now);
              gainNode.gain.exponentialRampToValueAtTime(rampFloor, now + 0.1);
              osc.start(now);
              osc.stop(now + 0.1);
              break;
            case 'win':
              osc.type = 'triangle';
              osc.frequency.setValueAtTime(400, now);
              osc.frequency.setValueAtTime(600, now + 0.1);
              osc.frequency.setValueAtTime(800, now + 0.2);
              gainNode.gain.setValueAtTime(0.1 * volume, now);
              gainNode.gain.linearRampToValueAtTime(0.1 * volume, now + 0.3);
              gainNode.gain.linearRampToValueAtTime(rampFloor, now + 0.4);
              osc.start(now);
              osc.stop(now + 0.4);
              break;
            case 'lose':
              osc.type = 'sawtooth';
              osc.frequency.setValueAtTime(300, now);
              osc.frequency.exponentialRampToValueAtTime(100, now + 0.3);
              gainNode.gain.setValueAtTime(0.2 * volume, now);
              gainNode.gain.linearRampToValueAtTime(rampFloor, now + 0.3);
              osc.start(now);
              osc.stop(now + 0.3);
              break;
            case 'correct':
              osc.type = 'triangle';
              osc.frequency.setValueAtTime(523.25, now);
              osc.frequency.setValueAtTime(659.25, now + 0.08);
              osc.frequency.setValueAtTime(783.99, now + 0.16);
              gainNode.gain.setValueAtTime(0.15 * volume, now);
              gainNode.gain.linearRampToValueAtTime(rampFloor, now + 0.25);
              osc.start(now);
              osc.stop(now + 0.25);
              break;
            case 'wrong':
              osc.type = 'sawtooth';
              osc.frequency.setValueAtTime(200, now);
              osc.frequency.exponentialRampToValueAtTime(120, now + 0.2);
              gainNode.gain.setValueAtTime(0.2 * volume, now);
              gainNode.gain.linearRampToValueAtTime(rampFloor, now + 0.2);
              osc.start(now);
              osc.stop(now + 0.2);
              break;
          }
        });
      },
    }),
    {
      name: 'sound-storage',
    }
  )
);
