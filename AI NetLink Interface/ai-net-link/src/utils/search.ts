// src/utils/search.ts

const ARABIC_DIACRITICS = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const TATWEEL = /\u0640/g;
const ARABIC_INDIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

const SEARCH_STOP_WORDS = new Set([
  'ال', 'بن', 'ابن',
]);

const normalizeDigits = (value: string) =>
  value.replace(/[٠-٩]/g, (char) => String(ARABIC_INDIC_DIGITS.indexOf(char)));

const simplifyArabic = (value: string) =>
  value
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/[ؤ]/g, 'و')
    .replace(/[ئ]/g, 'ي')
    .replace(/[ى]/g, 'ي')
    .replace(/[ة]/g, 'ه')
    .replace(/[گ]/g, 'ك')
    .replace(/[ڤ]/g, 'ف')
    .replace(/[پ]/g, 'ب');

const simplifyLatin = (value: string) =>
  value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');

export const normalizeSearchText = (value: string = ''): string => {
  return simplifyArabic(
    simplifyLatin(
      normalizeDigits(String(value || ''))
        .toLowerCase()
        .replace(ARABIC_DIACRITICS, '')
        .replace(TATWEEL, '')
    )
  )
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const normalizeLooseToken = (value: string) => {
  const normalized = normalizeSearchText(value);
  return normalized.replace(/^ال/, '');
};

const collapseTokenSpacing = (value: string) => normalizeLooseToken(value).replace(/\s+/g, '');

const tokenize = (value: string) =>
  normalizeSearchText(value)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length > 0 && !SEARCH_STOP_WORDS.has(token));

/**
 * Calculates the Levenshtein distance between two strings with an optimized space approach.
 */
export function levenshteinDistance(s1: string, s2: string): number {
  if (s1 === s2) return 0;
  if (s1.length === 0) return s2.length;
  if (s2.length === 0) return s1.length;

  const v0 = new Array(s2.length + 1);
  const v1 = new Array(s2.length + 1);

  for (let i = 0; i <= s2.length; i++) v0[i] = i;

  for (let i = 0; i < s1.length; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < s2.length; j++) {
      const cost = s1[i] === s2[j] ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }
    for (let j = 0; j <= s2.length; j++) v0[j] = v1[j];
  }
  return v1[s2.length];
}

const similarityRatio = (a: string, b: string) => {
  if (!a || !b) return 0;
  const distance = levenshteinDistance(a, b);
  const maxLen = Math.max(a.length, b.length) || 1;
  return 1 - distance / maxLen;
};

const isNumericLike = (value: string) => /^[\d+\-.\s]+$/.test(value);

const scoreTokenMatch = (queryToken: string, targetToken: string, maxTypos: number): number => {
  if (!queryToken || !targetToken) return 0;

  const q = normalizeLooseToken(queryToken);
  const t = normalizeLooseToken(targetToken);

  if (!q || !t) return 0;
  if (q === t) return 100;
  if (t.startsWith(q)) return 92;
  if (t.includes(q) || q.includes(t)) return 82;

  const ratio = similarityRatio(q, t);
  const allowedTypos =
    q.length <= 4 ? 0 :
    q.length <= 6 ? 1 :
    maxTypos;

  if (levenshteinDistance(q, t) <= allowedTypos) {
    return Math.round(70 + ratio * 20);
  }

  if (ratio >= 0.78) {
    return Math.round(ratio * 75);
  }

  return 0;
};

export function getSmartMatchScore(query: string, target?: string | null, maxTypos: number = 2): number {
  if (!target) return 0;
  if (!query) return 1;

  const nQuery = normalizeSearchText(query);
  const nTarget = normalizeSearchText(target);
  if (!nQuery || !nTarget) return 0;

  const compactQuery = collapseTokenSpacing(query);
  const compactTarget = collapseTokenSpacing(target);

  if (nTarget === nQuery) return 1000;
  if (nTarget.startsWith(nQuery)) return 950;
  if (nTarget.includes(nQuery)) return 900;
  if (compactTarget === compactQuery) return 980;
  if (compactTarget.includes(compactQuery)) return 920;

  if (isNumericLike(nQuery)) {
    const numericQuery = nQuery.replace(/\s+/g, '');
    const numericTarget = nTarget.replace(/\s+/g, '');
    if (numericTarget === numericQuery) return 1000;
    if (numericTarget.includes(numericQuery)) return 880;
    return 0;
  }

  const queryTokens = tokenize(query);
  const targetTokens = tokenize(target);
  if (queryTokens.length === 0 || targetTokens.length === 0) return 0;

  let totalScore = 0;
  let matchedTokens = 0;

  for (const queryToken of queryTokens) {
    let bestTokenScore = 0;
    for (const targetToken of targetTokens) {
      bestTokenScore = Math.max(bestTokenScore, scoreTokenMatch(queryToken, targetToken, maxTypos));
    }

    if (bestTokenScore === 0) {
      if (queryTokens.length === 1) {
        const ratio = similarityRatio(normalizeLooseToken(queryToken), collapseTokenSpacing(target));
        const minRatio = queryToken.length <= 4 ? 0.96 : queryToken.length <= 6 ? 0.88 : 0.8;
        if (ratio >= minRatio) {
          return Math.round(ratio * 700);
        }
      }
      return 0;
    }

    matchedTokens += 1;
    totalScore += bestTokenScore;
  }

  const coverageBonus = matchedTokens === queryTokens.length ? 120 : 0;
  const phraseBonus = nTarget.includes(nQuery) ? 120 : 0;
  const orderBonus = queryTokens.every((token, index) => (targetTokens[index] || '').startsWith(normalizeLooseToken(token))) ? 40 : 0;
  const finalScore = totalScore + coverageBonus + phraseBonus + orderBonus;

  if (queryTokens.length === 1 && queryTokens[0].length <= 4 && finalScore < 300) {
    return 0;
  }

  return finalScore;
}

export function smartMatch(query: string, target?: string | null, maxTypos: number = 2): boolean {
  return getSmartMatchScore(query, target, maxTypos) > 0;
}
