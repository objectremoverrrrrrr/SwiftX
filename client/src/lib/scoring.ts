export function calculateEntropy(text: string): number {
  const frequencies = new Map<string, number>();
  for (const char of text) {
    frequencies.set(char, (frequencies.get(char) || 0) + 1);
  }
  
  const length = text.length;
  let entropy = 0;
  
  for (const count of Array.from(frequencies.values())) {
    const probability = count / length;
    entropy -= probability * Math.log2(probability);
  }
  
  return entropy;
}

export function isValidUtf8(text: string): boolean {
  try {
    // Try to encode and decode to check for valid UTF-8
    const encoded = new TextEncoder().encode(text);
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(encoded);
    return decoded === text;
  } catch {
    return false;
  }
}

export function calculateLanguageScore(text: string): number {
  // Ultra-enhanced English language detection with multiple sophisticated metrics
  
  if (text.length === 0) return 0;
  
  // 1. Advanced letter frequency analysis with chi-squared test
  const englishFreqs = {
    'e': 12.7, 't': 9.1, 'a': 8.2, 'o': 7.5, 'i': 7.0, 'n': 6.7, 's': 6.3,
    'h': 6.1, 'r': 6.0, 'd': 4.3, 'l': 4.0, 'c': 2.8, 'u': 2.8, 'm': 2.4,
    'w': 2.4, 'f': 2.2, 'g': 2.0, 'y': 2.0, 'p': 1.9, 'b': 1.3, 'v': 1.0,
    'k': 0.8, 'j': 0.15, 'x': 0.15, 'q': 0.10, 'z': 0.07
  };
  
  const textLower = text.toLowerCase();
  const letterCounts = new Map<string, number>();
  let totalLetters = 0;
  
  for (const char of textLower) {
    if (/[a-z]/.test(char)) {
      letterCounts.set(char, (letterCounts.get(char) || 0) + 1);
      totalLetters++;
    }
  }
  
  if (totalLetters === 0) return 0;
  
  // Calculate chi-squared statistic for frequency analysis
  let chiSquared = 0;
  for (const [letter, expectedFreq] of Object.entries(englishFreqs)) {
    const actualCount = letterCounts.get(letter) || 0;
    const expectedCount = (expectedFreq / 100) * totalLetters;
    if (expectedCount > 0) {
      chiSquared += Math.pow(actualCount - expectedCount, 2) / expectedCount;
    }
  }
  
  // Convert chi-squared to a normalized score (lower chi-squared = higher score)
  const maxChiSquared = totalLetters * 2; // Rough maximum
  const freqScore = Math.max(0, 100 - (chiSquared / maxChiSquared) * 100);
  
  // 2. Enhanced common word analysis with positional weighting
  const commonWords = [
    'THE', 'AND', 'TO', 'OF', 'A', 'IN', 'IS', 'IT', 'YOU', 'THAT', 'HE', 'WAS', 
    'FOR', 'ON', 'ARE', 'AS', 'WITH', 'HIS', 'THEY', 'I', 'AT', 'BE', 'THIS', 
    'HAVE', 'FROM', 'OR', 'ONE', 'HAD', 'BY', 'WORD', 'BUT', 'NOT', 'WHAT', 
    'ALL', 'WERE', 'WE', 'WHEN', 'YOUR', 'CAN', 'SAID', 'EACH', 'WHICH', 'WILL',
    'HOW', 'THERE', 'PEOPLE', 'IF', 'UP', 'OUT', 'MANY', 'TIME', 'THEM', 'THESE',
    'SO', 'SOME', 'HER', 'WOULD', 'MAKE', 'LIKE', 'INTO', 'HIM', 'HAS', 'TWO'
  ];
  
  const words = text.toUpperCase().match(/[A-Z]+/g) || [];
  let wordScore = 0;
  
  for (const word of words) {
    if (word.length >= 2) {
      const isCommon = commonWords.includes(word);
      const lengthFactor = Math.min(word.length / 5, 1); // Prefer longer words
      if (isCommon) {
        wordScore += 10 * lengthFactor;
      } else if (word.length >= 3 && /^[A-Z]+$/.test(word)) {
        wordScore += 2 * lengthFactor; // Some credit for valid words
      }
    }
  }
  
  // Cap word score
  wordScore = Math.min(wordScore, 60);
  
  const upperText = text.toUpperCase();
  const commonBigrams = {
    'TH': 2.71, 'HE': 2.33, 'IN': 2.03, 'ER': 1.78, 'AN': 1.61, 'RE': 1.41, 
    'ED': 1.17, 'ND': 1.07, 'ON': 1.05, 'EN': 1.13, 'AT': 1.49, 'OU': 1.06,
    'IT': 1.34, 'IS': 1.06, 'OR': 1.28, 'TI': 1.34, 'HI': 1.13, 'ST': 1.25,
    'AR': 1.24, 'NE': 1.17, 'SE': 1.14, 'HA': 1.04, 'AS': 1.24, 'LE': 1.13,
    'TE': 1.20, 'TO': 1.13, 'NT': 1.05, 'ES': 1.15, 'VE': 1.13, 'AL': 1.09
  };
  
  const commonTrigrams = {
    'THE': 1.81, 'AND': 0.73, 'ING': 0.72, 'HER': 0.33, 'HAT': 0.21, 
    'HIS': 0.21, 'THA': 0.21, 'ERE': 0.17, 'FOR': 0.17, 'ENT': 0.17,
    'ION': 0.17, 'TER': 0.16, 'WAS': 0.16, 'YOU': 0.16, 'ITH': 0.15,
    'VER': 0.15, 'ALL': 0.15, 'WIT': 0.14, 'THI': 0.14, 'TIO': 0.14
  };
  
  let ngramScore = 0;
  
  // Bigram analysis
  for (let i = 0; i < upperText.length - 1; i++) {
    const bigram = upperText.substr(i, 2);
    if (commonBigrams[bigram]) {
      ngramScore += commonBigrams[bigram] * 3;
    }
  }
  
  // Trigram analysis
  for (let i = 0; i < upperText.length - 2; i++) {
    const trigram = upperText.substr(i, 3);
    if (commonTrigrams[trigram]) {
      ngramScore += commonTrigrams[trigram] * 5;
    }
  }
  
  // 4. Structural analysis - English text patterns
  let structureScore = 0;
  
  // Proper spacing ratio (English has ~15-20% spaces)
  const spaceRatio = (text.match(/\s/g) || []).length / text.length;
  if (spaceRatio >= 0.12 && spaceRatio <= 0.25) {
    structureScore += 15;
  } else if (spaceRatio >= 0.08 && spaceRatio <= 0.35) {
    structureScore += 8;
  }
  
  // Vowel to consonant ratio (English ~38% vowels)
  const vowels = (textLower.match(/[aeiou]/g) || []).length;
  const consonants = (textLower.match(/[bcdfghjklmnpqrstvwxyz]/g) || []).length;
  if (consonants > 0) {
    const vowelRatio = vowels / (vowels + consonants);
    if (vowelRatio >= 0.30 && vowelRatio <= 0.45) {
      structureScore += 12;
    } else if (vowelRatio >= 0.25 && vowelRatio <= 0.50) {
      structureScore += 6;
    }
  }
  
  // Average word length (English ~4.5 chars)
  if (words.length > 0) {
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
    if (avgWordLength >= 3.5 && avgWordLength <= 6.5) {
      structureScore += 8;
    }
  }
  
  // 5. Combine all scores with optimized weights
  const finalScore = (
    freqScore * 0.25 +           // Letter frequency
    wordScore * 0.35 +           // Common words (most important)
    Math.min(ngramScore, 40) * 0.25 +  // N-gram patterns
    structureScore * 0.15        // Text structure
  );
  
  return Math.min(100, Math.max(0, finalScore));
}

export function calculateConfidence(
  isValid: boolean,
  entropy: number,
  languageScore: number,
  patternMatch: boolean
): number {
  let confidence = 0;
  
  // Pattern match is most important (higher weight for strict patterns)
  if (patternMatch) confidence += 40;
  
  // Valid UTF-8 output is crucial for text-based decodings
  if (isValid) confidence += 30;
  
  // Enhanced entropy scoring - different ranges for different types
  if (entropy >= 3.5 && entropy <= 5.5) {
    // Optimal entropy range for natural language
    confidence += 25;
  } else if (entropy >= 2.0 && entropy <= 7.0) {
    // Acceptable entropy range
    confidence += 15;
  } else if (entropy >= 1.0 && entropy <= 8.0) {
    // Wide acceptable range
    confidence += 8;
  }
  
  // Enhanced language score contribution
  if (languageScore >= 70) {
    confidence += 15; // Very high language score
  } else if (languageScore >= 50) {
    confidence += 12; // Good language score
  } else if (languageScore >= 30) {
    confidence += 8;  // Moderate language score
  } else if (languageScore >= 15) {
    confidence += 4;  // Low but meaningful language score
  }
  
  // Bonus for combinations indicating high-quality decoding
  if (isValid && patternMatch && languageScore > 40) {
    confidence += 10; // Synergy bonus
  }
  
  // Penalty for suspicious combinations
  if (!isValid && entropy > 7.5) {
    confidence -= 15; // Likely binary data or noise
  }
  
  return Math.min(100, Math.max(0, confidence));
}

export function getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence >= 70) return 'high';
  if (confidence >= 40) return 'medium';
  return 'low';
}
