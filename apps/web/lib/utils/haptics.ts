import { useSoundStore } from '@/lib/stores/soundStore';

export const haptics = {
  light: () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      if (!useSoundStore.getState().hapticsEnabled) return;
      try {
        navigator.vibrate(10);
      } catch {}
    }
  },
  medium: () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      if (!useSoundStore.getState().hapticsEnabled) return;
      try {
        navigator.vibrate(25);
      } catch {}
    }
  },
  success: () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      if (!useSoundStore.getState().hapticsEnabled) return;
      try {
        navigator.vibrate([15, 30, 25]);
      } catch {}
    }
  },
  error: () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      if (!useSoundStore.getState().hapticsEnabled) return;
      try {
        navigator.vibrate([40, 40, 40]);
      } catch {}
    }
  },
};
