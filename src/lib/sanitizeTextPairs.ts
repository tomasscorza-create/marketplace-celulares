export function sanitizeTrimmedPairs(
  pairs: [string, string][],
  limit: number,
): [string, string][] {
  return pairs
    .map(([first, second]) => [first.trim(), second.trim()] as [string, string])
    .filter(([first, second]) => first.length > 0 && second.length > 0)
    .slice(0, limit);
}
