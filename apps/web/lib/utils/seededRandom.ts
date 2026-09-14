export function getDailySeed(dateStr?: string): number {
  const date = dateStr || new Date().toISOString().slice(0, 10);
  let hash = 0;
  for (let i = 0; i < date.length; i++) {
    hash = (hash << 5) - hash + date.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function createSeededRNG(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function next(): number {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function getDailyItem<T>(arr: T[], dateStr?: string): T {
  if (arr.length === 0) throw new Error('Array must not be empty');
  const seed = getDailySeed(dateStr);
  return arr[seed % arr.length];
}
