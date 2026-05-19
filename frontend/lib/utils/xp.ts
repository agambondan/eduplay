export const xpUtils = {
  calculateNextLevelXP: (level: number) => {
    if (level < 1) return 100;
    // Level 1: 0, Level 2: 100, Level 3: 300, Level 4: 600...
    return level < 2 ? 100 : (level - 1) * 200 + (level - 1) * level;
  },

  getLevelProgress: (xp: number) => {
    let level = 1;
    let currentThreshold = 100;
    let prevThreshold = 0;

    while (xp >= currentThreshold) {
      prevThreshold = currentThreshold;
      level++;
      currentThreshold = prevThreshold + (level - 1) * 200;
    }

    return {
      level,
      xpInLevel: xp - prevThreshold,
      nextLevelXP: currentThreshold - prevThreshold,
      totalXP: xp,
    };
  },
};
