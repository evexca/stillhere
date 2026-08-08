export function shouldInsertAdAfter(zeroBasedIndex: number, every = 20): boolean {
  return (zeroBasedIndex + 1) % every === 0;
}
