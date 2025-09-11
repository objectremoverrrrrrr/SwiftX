// Advanced Cipher Breaking System with Frequency Analysis and Cryptanalysis
// Implements sophisticated techniques for breaking classical and modern ciphers

import { calculateEntropy, calculateLanguageScore } from './scoring';

export interface CipherAnalysis {
  cipherType: string;
  confidence: number;
  method: string;
  keyCandidate?: string;
  plaintext?: string;
  analysis: {
    frequencyAnalysis: FrequencyAnalysis;
    indexOfCoincidence: number;
    entropy: number;
    patternMatches: string[];
  };
}

export interface FrequencyAnalysis {
  letterFrequency: { [key: string]: number };
  bigramFrequency: { [key: string]: number };
  trigramFrequency: { [key: string]: number };
  mostCommon: string[];
  leastCommon: string[];
  chiSquared: number;
}

// Standard English letter frequencies (%)
const ENGLISH_FREQUENCIES = {
  'e': 12.7, 't': 9.1, 'a': 8.2, 'o': 7.5, 'i': 7.0, 'n': 6.7, 's': 6.3, 'h': 6.1,
  'r': 6.0, 'd': 4.3, 'l': 4.0, 'c': 2.8, 'u': 2.8, 'm': 2.4, 'w': 2.4, 'f': 2.2,
  'g': 2.0, 'y': 2.0, 'p': 1.9, 'b': 1.3, 'v': 1.0, 'k': 0.8, 'j': 0.15, 'x': 0.15,
  'q': 0.10, 'z': 0.07
};

// Common English bigrams and trigrams
const COMMON_BIGRAMS = ['th', 'he', 'in', 'er', 'an', 're', 'ed', 'nd', 'on', 'en', 'at', 'ou', 'it', 'is', 'or', 'ti', 'hi', 'st', 'es', 'ng'];
const COMMON_TRIGRAMS = ['the', 'and', 'ing', 'her', 'hat', 'his', 'tha', 'ere', 'for', 'ent', 'ion', 'ter', 'was', 'you', 'ith', 'ver', 'all', 'wit', 'thi', 'tio'];

export async function performCipherAnalysis(input: string): Promise<CipherAnalysis[]> {
  const cleanInput = input.replace(/[^a-zA-Z]/g, '').toLowerCase();
  if (cleanInput.length < 10) {
    throw new Error('Input too short for cipher analysis (minimum 10 letters)');
  }

  const results: CipherAnalysis[] = [];
  
  // Perform frequency analysis
  const freqAnalysis = performFrequencyAnalysis(cleanInput);
  const ioc = calculateIndexOfCoincidence(cleanInput);
  const entropy = calculateEntropy(cleanInput);

  // Try different cipher breaking techniques
  await Promise.all([
    analyzeCaesarCipher(cleanInput, freqAnalysis),
    analyzeVigenereCipher(cleanInput, freqAnalysis, ioc),
    analyzeSubstitutionCipher(cleanInput, freqAnalysis),
    analyzeTranspositionCipher(cleanInput, freqAnalysis),
    analyzeRailFenceCipher(cleanInput),
    analyzeAtbashCipher(cleanInput, freqAnalysis),
    analyzePlayfairCipher(cleanInput),
    analyzeHillCipher(cleanInput),
    analyzeRotCiphers(cleanInput)
  ].map(promise => promise.then(result => {
    if (result) results.push(result);
  }).catch(error => {
    console.debug('Cipher analysis failed:', error);
  })));

  // Sort by confidence
  results.sort((a, b) => b.confidence - a.confidence);
  
  return results;
}

function performFrequencyAnalysis(text: string): FrequencyAnalysis {
  const length = text.length;
  const letterCount: { [key: string]: number } = {};
  const bigramCount: { [key: string]: number } = {};
  const trigramCount: { [key: string]: number } = {};

  // Count letter frequencies
  for (const char of text) {
    if (char >= 'a' && char <= 'z') {
      letterCount[char] = (letterCount[char] || 0) + 1;
    }
  }

  // Count bigram frequencies
  for (let i = 0; i < text.length - 1; i++) {
    const bigram = text.substring(i, i + 2);
    if (bigram.match(/^[a-z]{2}$/)) {
      bigramCount[bigram] = (bigramCount[bigram] || 0) + 1;
    }
  }

  // Count trigram frequencies
  for (let i = 0; i < text.length - 2; i++) {
    const trigram = text.substring(i, i + 3);
    if (trigram.match(/^[a-z]{3}$/)) {
      trigramCount[trigram] = (trigramCount[trigram] || 0) + 1;
    }
  }

  // Convert to percentages
  const letterFrequency: { [key: string]: number } = {};
  for (const [letter, count] of Object.entries(letterCount)) {
    letterFrequency[letter] = (count / length) * 100;
  }

  // Calculate chi-squared statistic
  let chiSquared = 0;
  for (const letter of 'abcdefghijklmnopqrstuvwxyz') {
    const observed = letterFrequency[letter] || 0;
    const expected = ENGLISH_FREQUENCIES[letter as keyof typeof ENGLISH_FREQUENCIES] || 0;
    if (expected > 0) {
      chiSquared += Math.pow(observed - expected, 2) / expected;
    }
  }

  const sortedLetters = Object.entries(letterFrequency)
    .sort(([,a], [,b]) => b - a)
    .map(([letter]) => letter);

  return {
    letterFrequency,
    bigramFrequency: bigramCount,
    trigramFrequency: trigramCount,
    mostCommon: sortedLetters.slice(0, 10),
    leastCommon: sortedLetters.slice(-10).reverse(),
    chiSquared
  };
}

function calculateIndexOfCoincidence(text: string): number {
  const frequencies: { [key: string]: number } = {};
  let n = 0;

  for (const char of text) {
    if (char >= 'a' && char <= 'z') {
      frequencies[char] = (frequencies[char] || 0) + 1;
      n++;
    }
  }

  let ic = 0;
  for (const count of Object.values(frequencies)) {
    ic += count * (count - 1);
  }

  return n > 1 ? ic / (n * (n - 1)) : 0;
}

function calculateEntropy(text: string): number {
  const frequencies: { [key: string]: number } = {};
  for (const char of text) {
    frequencies[char] = (frequencies[char] || 0) + 1;
  }

  let entropy = 0;
  const length = text.length;
  for (const count of Object.values(frequencies)) {
    const p = count / length;
    entropy -= p * Math.log2(p);
  }

  return entropy;
}

async function analyzeCaesarCipher(text: string, freqAnalysis: FrequencyAnalysis): Promise<CipherAnalysis | null> {
  let bestShift = 0;
  let bestScore = 0;
  let bestPlaintext = '';
  let bestLanguageScore = 0;

  // Enhanced Caesar analysis with multiple scoring methods
  const candidates = [];

  for (let shift = 1; shift < 26; shift++) {
    const decrypted = caesarShift(text, shift);
    const englishScore = calculateEnglishScore(decrypted);
    const languageScore = calculateLanguageScore(decrypted);
    const entropy = calculateEntropy(decrypted);
    
    // Composite scoring with multiple factors
    const compositeScore = (
      englishScore * 0.4 +        // Word-based scoring
      languageScore * 0.4 +       // Statistical language analysis
      (entropy >= 3.5 && entropy <= 5.5 ? 20 : 0) * 0.2  // Entropy bonus
    );
    
    candidates.push({
      shift,
      decrypted,
      score: compositeScore,
      englishScore,
      languageScore,
      entropy
    });

    if (compositeScore > bestScore) {
      bestScore = compositeScore;
      bestShift = shift;
      bestPlaintext = decrypted;
      bestLanguageScore = languageScore;
    }
  }

  // Sort candidates by composite score for analysis
  candidates.sort((a, b) => b.score - a.score);
  
  // Enhanced confidence calculation
  let confidence = bestScore;
  
  // Boost confidence for high-quality results
  if (bestLanguageScore > 60) confidence += 15;
  if (bestScore > 70 && bestLanguageScore > 40) confidence += 10;
  
  // Check for common Caesar patterns
  if (bestShift === 13) confidence += 5; // ROT13 is common
  if ([1, 2, 3, 25, 24, 23].includes(bestShift)) confidence += 3; // Common simple shifts

  // Reduce confidence if top candidates are very close (ambiguous)
  if (candidates.length >= 2 && candidates[1].score > bestScore * 0.9) {
    confidence -= 10;
  }

  if (bestScore > 40) {
    return {
      cipherType: 'Caesar Cipher',
      confidence: Math.min(confidence, 95),
      method: `Caesar shift with key ${bestShift} (${bestShift === 13 ? 'ROT13' : `+${bestShift} positions`})`,
      keyCandidate: bestShift.toString(),
      plaintext: bestPlaintext,
      analysis: {
        frequencyAnalysis: freqAnalysis,
        indexOfCoincidence: calculateIndexOfCoincidence(bestPlaintext),
        entropy: calculateEntropy(bestPlaintext),
        patternMatches: findCommonWords(bestPlaintext)
      }
    };
  }

  return null;
}

async function analyzeVigenereCipher(text: string, freqAnalysis: FrequencyAnalysis, ioc: number): Promise<CipherAnalysis | null> {
  // Vigenère cipher typically has IC around 0.038-0.045 for English
  if (ioc > 0.050 || ioc < 0.030) return null;

  const keyLengths = findLikelyKeyLengths(text, 2, 15);
  let bestResult: any = null;
  let bestScore = 0;

  for (const keyLength of keyLengths.slice(0, 5)) {
    try {
      const key = findVigenereKey(text, keyLength);
      if (key) {
        const decrypted = vigenereDecrypt(text, key);
        const score = calculateEnglishScore(decrypted);
        
        if (score > bestScore) {
          bestScore = score;
          bestResult = {
            key,
            plaintext: decrypted,
            keyLength
          };
        }
      }
    } catch (error) {
      continue;
    }
  }

  if (bestResult && bestScore > 40) {
    return {
      cipherType: 'Vigenère Cipher',
      confidence: Math.min(bestScore, 90),
      method: `Vigenère cipher with key length ${bestResult.keyLength}`,
      keyCandidate: bestResult.key,
      plaintext: bestResult.plaintext,
      analysis: {
        frequencyAnalysis: freqAnalysis,
        indexOfCoincidence: ioc,
        entropy: calculateEntropy(bestResult.plaintext),
        patternMatches: findCommonWords(bestResult.plaintext)
      }
    };
  }

  return null;
}

async function analyzeSubstitutionCipher(text: string, freqAnalysis: FrequencyAnalysis): Promise<CipherAnalysis | null> {
  // Simple substitution cipher frequency analysis
  const substitutionMap: { [key: string]: string } = {};
  const englishLetters = 'etaoinshrdlcumwfgypbvkjxqz'.split('');
  
  // Map most frequent cipher letters to most frequent English letters
  for (let i = 0; i < Math.min(freqAnalysis.mostCommon.length, englishLetters.length); i++) {
    substitutionMap[freqAnalysis.mostCommon[i]] = englishLetters[i];
  }

  let plaintext = '';
  for (const char of text) {
    plaintext += substitutionMap[char] || char;
  }

  const score = calculateEnglishScore(plaintext);
  
  if (score > 30) {
    return {
      cipherType: 'Simple Substitution Cipher',
      confidence: Math.min(score + 10, 85),
      method: 'Frequency analysis substitution',
      keyCandidate: JSON.stringify(substitutionMap),
      plaintext,
      analysis: {
        frequencyAnalysis: freqAnalysis,
        indexOfCoincidence: calculateIndexOfCoincidence(plaintext),
        entropy: calculateEntropy(plaintext),
        patternMatches: findCommonWords(plaintext)
      }
    };
  }

  return null;
}

async function analyzeTranspositionCipher(text: string, freqAnalysis: FrequencyAnalysis): Promise<CipherAnalysis | null> {
  // Try different columnar transposition key lengths
  for (let keyLength = 2; keyLength <= Math.min(text.length / 3, 20); keyLength++) {
    const decrypted = columnarTranspositionDecrypt(text, keyLength);
    const score = calculateEnglishScore(decrypted);
    
    if (score > 50) {
      return {
        cipherType: 'Columnar Transposition',
        confidence: Math.min(score, 80),
        method: `Columnar transposition with ${keyLength} columns`,
        keyCandidate: keyLength.toString(),
        plaintext: decrypted,
        analysis: {
          frequencyAnalysis: freqAnalysis,
          indexOfCoincidence: calculateIndexOfCoincidence(decrypted),
          entropy: calculateEntropy(decrypted),
          patternMatches: findCommonWords(decrypted)
        }
      };
    }
  }

  return null;
}

async function analyzeRailFenceCipher(text: string): Promise<CipherAnalysis | null> {
  for (let rails = 2; rails <= Math.min(text.length / 2, 10); rails++) {
    const decrypted = railFenceDecrypt(text, rails);
    const score = calculateEnglishScore(decrypted);
    
    if (score > 50) {
      return {
        cipherType: 'Rail Fence Cipher',
        confidence: Math.min(score, 80),
        method: `Rail fence cipher with ${rails} rails`,
        keyCandidate: rails.toString(),
        plaintext: decrypted,
        analysis: {
          frequencyAnalysis: performFrequencyAnalysis(decrypted),
          indexOfCoincidence: calculateIndexOfCoincidence(decrypted),
          entropy: calculateEntropy(decrypted),
          patternMatches: findCommonWords(decrypted)
        }
      };
    }
  }

  return null;
}

async function analyzeAtbashCipher(text: string, freqAnalysis: FrequencyAnalysis): Promise<CipherAnalysis | null> {
  const decrypted = atbashDecrypt(text);
  const score = calculateEnglishScore(decrypted);
  
  if (score > 40) {
    return {
      cipherType: 'Atbash Cipher',
      confidence: Math.min(score + 15, 90),
      method: 'Atbash substitution (A↔Z, B↔Y, etc.)',
      keyCandidate: 'ZYXWVUTSRQPONMLKJIHGFEDCBA',
      plaintext: decrypted,
      analysis: {
        frequencyAnalysis: freqAnalysis,
        indexOfCoincidence: calculateIndexOfCoincidence(decrypted),
        entropy: calculateEntropy(decrypted),
        patternMatches: findCommonWords(decrypted)
      }
    };
  }

  return null;
}

async function analyzePlayfairCipher(text: string): Promise<CipherAnalysis | null> {
  // Playfair typically requires known plaintext or extensive analysis
  // This is a simplified approach
  const score = text.length > 20 ? 20 : 0; // Basic heuristic
  
  if (score > 15) {
    return {
      cipherType: 'Possible Playfair Cipher',
      confidence: score,
      method: 'Pattern analysis suggests Playfair',
      plaintext: '[Playfair decryption requires key]',
      analysis: {
        frequencyAnalysis: performFrequencyAnalysis(text),
        indexOfCoincidence: calculateIndexOfCoincidence(text),
        entropy: calculateEntropy(text),
        patternMatches: []
      }
    };
  }

  return null;
}

async function analyzeHillCipher(text: string): Promise<CipherAnalysis | null> {
  // Hill cipher analysis is complex and typically requires matrix operations
  const ioc = calculateIndexOfCoincidence(text);
  
  if (ioc > 0.030 && ioc < 0.050) {
    return {
      cipherType: 'Possible Hill Cipher',
      confidence: 25,
      method: 'Statistical analysis suggests Hill cipher',
      plaintext: '[Hill cipher decryption requires key matrix]',
      analysis: {
        frequencyAnalysis: performFrequencyAnalysis(text),
        indexOfCoincidence: ioc,
        entropy: calculateEntropy(text),
        patternMatches: []
      }
    };
  }

  return null;
}

async function analyzeRotCiphers(text: string): Promise<CipherAnalysis | null> {
  // Try ROT5, ROT13, ROT18, ROT47
  const rotations = [5, 13, 18, 47];
  
  for (const rot of rotations) {
    const decrypted = rotDecrypt(text, rot);
    const score = calculateEnglishScore(decrypted);
    
    if (score > 40) {
      return {
        cipherType: `ROT${rot} Cipher`,
        confidence: Math.min(score + 10, 90),
        method: `ROT${rot} rotation cipher`,
        keyCandidate: rot.toString(),
        plaintext: decrypted,
        analysis: {
          frequencyAnalysis: performFrequencyAnalysis(decrypted),
          indexOfCoincidence: calculateIndexOfCoincidence(decrypted),
          entropy: calculateEntropy(decrypted),
          patternMatches: findCommonWords(decrypted)
        }
      };
    }
  }

  return null;
}

// Utility functions for cipher operations
function caesarShift(text: string, shift: number): string {
  return text.replace(/[a-z]/g, char => 
    String.fromCharCode(((char.charCodeAt(0) - 97 + shift) % 26) + 97)
  );
}

function vigenereDecrypt(text: string, key: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const keyChar = key[i % key.length];
    const shift = keyChar.charCodeAt(0) - 97;
    result += String.fromCharCode(((char.charCodeAt(0) - 97 - shift + 26) % 26) + 97);
  }
  return result;
}

function atbashDecrypt(text: string): string {
  return text.replace(/[a-zA-Z]/g, char => {
    const isUpperCase = char >= 'A' && char <= 'Z';
    const charCode = char.toUpperCase().charCodeAt(0);
    const atbashed = 90 - (charCode - 65) + 65; // Z=90, A=65
    const result = String.fromCharCode(atbashed);
    return isUpperCase ? result : result.toLowerCase();
  });
}

function rotDecrypt(text: string, rotation: number): string {
  return text.replace(/[a-zA-Z]/g, char => {
    const isUpperCase = char >= 'A' && char <= 'Z';
    const charCode = char.toUpperCase().charCodeAt(0);
    const rotated = ((charCode - 65 + rotation) % 26) + 65;
    const result = String.fromCharCode(rotated);
    return isUpperCase ? result : result.toLowerCase();
  });
}

function railFenceDecrypt(text: string, rails: number): string {
  if (rails === 1) return text;
  
  const fence: string[][] = Array(rails).fill(null).map(() => []);
  let rail = 0;
  let direction = 1;
  
  // Calculate fence structure
  for (let i = 0; i < text.length; i++) {
    fence[rail].push('*');
    rail += direction;
    if (rail === rails - 1 || rail === 0) direction = -direction;
  }
  
  // Fill with actual characters
  let index = 0;
  for (let i = 0; i < rails; i++) {
    for (let j = 0; j < fence[i].length; j++) {
      fence[i][j] = text[index++];
    }
  }
  
  // Read off the fence
  let result = '';
  rail = 0;
  direction = 1;
  const pos = Array(rails).fill(0);
  
  for (let i = 0; i < text.length; i++) {
    result += fence[rail][pos[rail]++];
    rail += direction;
    if (rail === rails - 1 || rail === 0) direction = -direction;
  }
  
  return result;
}

function columnarTranspositionDecrypt(text: string, keyLength: number): string {
  const rows = Math.ceil(text.length / keyLength);
  const grid: string[][] = Array(rows).fill(null).map(() => Array(keyLength).fill(''));
  
  // Fill grid column by column
  let index = 0;
  for (let col = 0; col < keyLength; col++) {
    for (let row = 0; row < rows; row++) {
      if (index < text.length) {
        grid[row][col] = text[index++];
      }
    }
  }
  
  // Read row by row
  return grid.map(row => row.join('')).join('');
}

function findLikelyKeyLengths(text: string, minLength: number, maxLength: number): number[] {
  const keyLengths: { length: number; score: number }[] = [];
  
  for (let keyLength = minLength; keyLength <= maxLength; keyLength++) {
    let totalIC = 0;
    let validGroups = 0;
    
    for (let offset = 0; offset < keyLength; offset++) {
      const group = text.split('').filter((_, i) => i % keyLength === offset).join('');
      if (group.length > 1) {
        totalIC += calculateIndexOfCoincidence(group);
        validGroups++;
      }
    }
    
    if (validGroups > 0) {
      const avgIC = totalIC / validGroups;
      keyLengths.push({ length: keyLength, score: avgIC });
    }
  }
  
  return keyLengths
    .sort((a, b) => Math.abs(b.score - 0.067) - Math.abs(a.score - 0.067)) // 0.067 is English IC
    .map(item => item.length);
}

function findVigenereKey(text: string, keyLength: number): string | null {
  let key = '';
  
  for (let offset = 0; offset < keyLength; offset++) {
    const group = text.split('').filter((_, i) => i % keyLength === offset).join('');
    const freqAnalysis = performFrequencyAnalysis(group);
    
    // Find best shift for this position
    let bestShift = 0;
    let bestScore = 0;
    
    for (let shift = 0; shift < 26; shift++) {
      const shifted = caesarShift(group, shift);
      const score = calculateEnglishScore(shifted);
      if (score > bestScore) {
        bestScore = score;
        bestShift = shift;
      }
    }
    
    key += String.fromCharCode(97 + bestShift);
  }
  
  return key;
}

function calculateEnglishScore(text: string): number {
  const words = text.split(/\s+/);
  const commonWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'man', 'run', 'too'];
  
  let score = 0;
  let wordCount = 0;
  
  for (const word of words) {
    if (word.length >= 2) {
      wordCount++;
      if (commonWords.includes(word.toLowerCase())) {
        score += 2;
      } else if (word.match(/^[a-z]+$/i)) {
        score += 1;
      }
    }
  }
  
  // Calculate letter frequency score
  const freqAnalysis = performFrequencyAnalysis(text);
  const frequencyScore = 100 - freqAnalysis.chiSquared; // Lower chi-squared is better
  
  return wordCount > 0 ? (score / wordCount * 50) + (frequencyScore * 0.5) : 0;
}

function findCommonWords(text: string): string[] {
  const words = text.split(/\s+/);
  const commonWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who'];
  
  return words.filter(word => commonWords.includes(word.toLowerCase())).slice(0, 10);
}