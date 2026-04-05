// src/utils/search.ts

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

/**
 * A highly robust, typo-forgiving search utility.
 * - Handles Out-of-Order word searches (e.g. "Ahmed Kareem" will match "Kareem Ahmed").
 * - Avoids false positives on phone numbers and IDs by remaining strictly numeric.
 * - Allows minor typos based on `maxTypos` for long alphabetic words.
 */
export function smartMatch(query: string, target?: string | null, maxTypos: number = 2): boolean {
  if (!target) return false;
  if (!query) return true;

  const nQuery = query.toLowerCase().trim();
  const nTarget = target.toLowerCase();

  // 1. Instant perfect substring match
  if (nTarget.includes(nQuery)) return true;

  // 2. Strict Numeric Match: If the query is mostly digits (phone, ID), bypass fuzzy
  const isNumeric = /^[\d\+\-\.\s]+$/.test(nQuery);
  if (isNumeric) {
     const noSpaceQuery = nQuery.replace(/\s+/g, '');
     const noSpaceTarget = nTarget.replace(/\s+/g, '');
     return noSpaceTarget.includes(noSpaceQuery);
  }

  // 3. Fuzzy Logic Fallback: Split query into discrete words and verify EVERY query word exists!
  const queryWords = nQuery.split(/\s+/).filter(w => w.length > 0);
  const targetWords = nTarget.split(/\s+/).filter(w => w.length > 0);

  if (targetWords.length === 0) return false;

  for (const qw of queryWords) {
      if (qw.length < 3) {
          // For very short query fragments, enforce strict substring
          if (!nTarget.includes(qw)) return false;
          continue;
      }

      // Dynamic maxTypos based on query word length
      // 3-4 letters: 0 typos (too risky, "احمد" maps to "محمد" with 1 typo)
      // 5-6 letters: 1 typo
      // 7+ letters: maxTypos (default 2)
      let currentMaxTypos = 0;
      if (qw.length >= 5 && qw.length <= 6) currentMaxTypos = 1;
      if (qw.length > 6) currentMaxTypos = maxTypos;

      let wordMatched = false;
      for (const tw of targetWords) {
          // Does the target word perfectly contain the query word?
          if (tw.includes(qw) || qw.includes(tw)) {
              wordMatched = true;
              break;
          }
          // If not, does the target word resemble the query word within the dynamic allowed edit distance?
          if (levenshteinDistance(qw, tw) <= currentMaxTypos) {
              wordMatched = true;
              break;
          }
      }

      // If ANY SINGLE query word completely fails to match the target, discard the entire result!
      if (!wordMatched) return false; 
  }

  return true;
}
