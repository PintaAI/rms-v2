const SEPARATOR_PATTERN = /[\s\-_.\/()]+/;

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function compact(value: string): string {
  return normalize(value).replace(SEPARATOR_PATTERN, "");
}

function wordStartScore(query: string, target: string): number | null {
  const words = normalize(target).split(SEPARATOR_PATTERN).filter(Boolean);
  const acronym = words.map((word) => word[0]).join("");

  if (acronym.startsWith(query)) return 850 - (acronym.length - query.length);

  let wordIndex = 0;
  for (const char of query) {
    while (wordIndex < words.length && words[wordIndex][0] !== char) {
      wordIndex++;
    }
    if (wordIndex === words.length) return null;
    wordIndex++;
  }

  return 650 - (wordIndex - query.length) * 5;
}

function subsequenceScore(query: string, target: string): number | null {
  let queryIndex = 0;
  let firstMatch = -1;
  let lastMatch = -1;
  let consecutiveMatches = 0;
  let maxConsecutiveMatches = 0;

  for (let targetIndex = 0; targetIndex < target.length && queryIndex < query.length; targetIndex++) {
    if (target[targetIndex] !== query[queryIndex]) continue;

    if (firstMatch === -1) firstMatch = targetIndex;
    if (lastMatch === targetIndex - 1) {
      consecutiveMatches++;
    } else {
      consecutiveMatches = 1;
    }
    maxConsecutiveMatches = Math.max(maxConsecutiveMatches, consecutiveMatches);
    lastMatch = targetIndex;
    queryIndex++;
  }

  if (queryIndex !== query.length) return null;

  const spread = lastMatch - firstMatch + 1;
  const gapPenalty = spread - query.length;
  return 420 + maxConsecutiveMatches * 12 - gapPenalty * 8 - firstMatch * 2;
}

export function fuzzyScore(query: string, target: string): number | null {
  const normalizedQuery = compact(query);
  if (!normalizedQuery) return null;

  const normalizedTarget = normalize(target);
  const compactTarget = compact(target);
  if (!compactTarget) return null;

  if (normalizedQuery.length === 1) {
    const words = normalizedTarget.split(SEPARATOR_PATTERN).filter(Boolean);
    const hasPrefix = words.some((word) => word.startsWith(normalizedQuery));
    return hasPrefix ? 700 : null;
  }

  if (compactTarget === normalizedQuery) return 1000;

  const substringIndex = compactTarget.indexOf(normalizedQuery);
  if (substringIndex >= 0) {
    return 900 - substringIndex * 2 - (compactTarget.length - normalizedQuery.length);
  }

  const wordScore = wordStartScore(normalizedQuery, target);
  const sequenceScore = normalizedQuery.length >= 2
    ? subsequenceScore(normalizedQuery, compactTarget)
    : null;

  return Math.max(wordScore ?? -Infinity, sequenceScore ?? -Infinity) > 0
    ? Math.max(wordScore ?? 0, sequenceScore ?? 0)
    : null;
}
