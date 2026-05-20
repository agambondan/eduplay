'use client';

import { useGameStore } from '@/lib/stores/gameStore';
import { LevelUpModal } from './LevelUpModal';

export function GameLevelUpHandler() {
  const levelUp = useGameStore((s) => s.levelUp);
  const setLevelUp = useGameStore((s) => s.setLevelUp);

  if (!levelUp) return null;

  return (
    <LevelUpModal
      newLevel={levelUp.newLevel}
      onClose={() => setLevelUp(null)}
    />
  );
}
