import { detectionPatterns, detectHashType } from './detectors';
import { calculateEntropy, calculateLanguageScore, calculateConfidence } from './scoring';
import { DecodingResult, AnalysisResult } from '@/types/analysis';

// Cross-check analysis using multiple strategies
export interface CrossCheckResult extends AnalysisResult {
  crossCheckConfidence: number;
  strategiesUsed: string[];
  consensusStrength: 'strong' | 'moderate' | 'weak';
}

interface DetectionStrategy {
  name: string;
  analyze: (input: string) => DecodingResult[];
}

// Helper functions
function calculateVariance(numbers: number[]): number {
  const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  return numbers.reduce((sum, n) => sum + Math.pow(n - mean, 2), 0) / numbers.length;
}

function analyzeEntropyTrend(entropies: number[]): string {
  if (entropies.length < 2) return 'stable';
  
  let increasing = 0;
  let decreasing = 0;
  
  for (let i = 1; i < entropies.length; i++) {
    if (entropies[i] > entropies[i-1]) increasing++;
    else if (entropies[i] < entropies[i-1]) decreasing++;
  }
  
  if (increasing > decreasing + 1) return 'increasing';
  if (decreasing > increasing + 1) return 'decreasing';
  return 'stable';
}

function analyzeEntropyProfile(input: string): any {
  const entropy = calculateEntropy(input);
  const chunkSize = Math.max(10, Math.floor(input.length / 10));
  const chunks = [];
  
  for (let i = 0; i < input.length; i += chunkSize) {
    chunks.push(input.substring(i, i + chunkSize));
  }
  
  const chunkEntropies = chunks.map(chunk => calculateEntropy(chunk));
  const entropyVariance = calculateVariance(chunkEntropies);
  
  return {
    globalEntropy: entropy,
    localEntropies: chunkEntropies,
    variance: entropyVariance,
    isUniform: entropyVariance < 0.5,
    entropyTrend: analyzeEntropyTrend(chunkEntropies)
  };
}

function analyzeCharacterDistribution(input: string): any {
  const charCounts = new Map<string, number>();
  for (const char of input) {
    charCounts.set(char, (charCounts.get(char) || 0) + 1);
  }
  
  const uniqueChars = charCounts.size;
  const mostFrequentChar = Math.max(...charCounts.values());
  const avgFrequency = input.length / uniqueChars;
  
  return {
    uniqueCharCount: uniqueChars,
    totalLength: input.length,
    uniqueRatio: uniqueChars / input.length,
    maxFrequency: mostFrequentChar,
    avgFrequency,
    distributionSkew: mostFrequentChar / avgFrequency,
    isBalanced: mostFrequentChar / avgFrequency < 3
  };
}

function checkBase64Compliance(input: string): number {
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  if (!base64Regex.test(input)) return 0;
  if (input.length % 4 !== 0) return 0.3;
  const padding = (input.match(/=/g) || []).length;
  if (padding > 2) return 0.2;
  return 0.9;
}

function checkHexCompliance(input: string): number {
  const hexRegex = /^[0-9a-fA-F]+$/;
  if (!hexRegex.test(input)) return 0;
  if (input.length % 2 !== 0) return 0.4;
  return 0.9;
}

function checkBinaryCompliance(input: string): number {
  const binaryRegex = /^[01]+$/;
  if (!binaryRegex.test(input)) return 0;
  if (input.length % 8 !== 0) return 0.6;
  return 0.9;
}

function checkGroupingPattern(input: string): boolean {
  return /([A-Za-z0-9]{2,}[\s\-_:.,][A-Za-z0-9]{2,}){2,}/.test(input);
}

function analyzeStructuralPatterns(input: string): any {
  return {
    base64Compliance: checkBase64Compliance(input),
    hexCompliance: checkHexCompliance(input),
    binaryCompliance: checkBinaryCompliance(input),
    hasRegularSpacing: /\s{2,}/.test(input),
    hasDelimiters: /[:\-_.,]/.test(input),
    hasGrouping: checkGroupingPattern(input)
  };
}

function calculateCharacterBalance(charTypes: any, totalChars: number): number {
  if (totalChars === 0) return 0;
  
  const ratios = {
    uppercase: charTypes.uppercase / totalChars,
    lowercase: charTypes.lowercase / totalChars,
    numbers: charTypes.numbers / totalChars,
    specials: charTypes.specials / totalChars
  };
  
  const values = Object.values(ratios);
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  
  return Math.max(0, 1 - variance * 4);
}

function calculateBase64ValidationScore(input: string, entropyProfile: any, balanceScore: number): number {
  let score = 0;
  
  if (entropyProfile.globalEntropy >= 4.5 && entropyProfile.globalEntropy <= 6.2) score += 0.3;
  if (entropyProfile.isUniform) score += 0.2;
  
  score += balanceScore * 0.3;
  
  if (input.length % 4 === 0) score += 0.2;
  
  return Math.min(1, score);
}

function calculateDecodingQualityBonus(decoded: string, entropy: number, languageScore: number): number {
  let bonus = 0;
  
  if (languageScore > 70) bonus += 15;
  else if (languageScore > 50) bonus += 10;
  else if (languageScore > 30) bonus += 5;
  
  if (entropy >= 3.5 && entropy <= 5.5) bonus += 8;
  else if (entropy >= 2.5 && entropy <= 6.5) bonus += 4;
  
  if (decoded.length > 10 && decoded.length < 10000) bonus += 3;
  
  return bonus;
}

// Strategy 1: Regex-based pattern matching
const regexStrategy: DetectionStrategy = {
  name: 'Regex Patterns',
  analyze: (input: string) => {
    const results: DecodingResult[] = [];
    
    for (const pattern of detectionPatterns) {
      try {
        if (!pattern.regex.test(input)) continue;
        
        const isValid = pattern.validator ? pattern.validator(input) : true;
        if (!isValid) continue;
        
        const decoded = pattern.decoder(input);
        if (!decoded || decoded === input) continue;
        
        const confidence = calculateConfidence(
          true,
          calculateEntropy(decoded),
          calculateLanguageScore(decoded),
          true
        );
        
        results.push({
          type: pattern.name,
          result: decoded,
          confidence: Math.min(confidence, 95),
          isValid: true,
          entropy: calculateEntropy(decoded),
          languageScore: calculateLanguageScore(decoded),
          steps: [pattern.name],
        });
      } catch (error) {
        continue;
      }
    }
    
    return results.slice(0, 5);
  }
};

// Strategy 2: Entropy-based analysis
const entropyStrategy: DetectionStrategy = {
  name: 'Entropy Analysis',
  analyze: (input: string) => {
    const results: DecodingResult[] = [];
    const entropy = calculateEntropy(input);
    const length = input.length;
    
    const entropyProfile = analyzeEntropyProfile(input);
    const charDistribution = analyzeCharacterDistribution(input);
    const structuralHints = analyzeStructuralPatterns(input);
    
    // Base64 detection
    if (entropy >= 4.5 && entropy <= 6.5) {
      if (/^[A-Za-z0-9+/]*={0,2}$/.test(input) && length % 4 === 0 && length >= 8) {
        try {
          const charTypes = {
            uppercase: (input.match(/[A-Z]/g) || []).length,
            lowercase: (input.match(/[a-z]/g) || []).length,
            numbers: (input.match(/[0-9]/g) || []).length,
            specials: (input.match(/[+/]/g) || []).length
          };
          
          const totalChars = input.replace(/=/g, '').length;
          const balanceScore = calculateCharacterBalance(charTypes, totalChars);
          const validationScore = calculateBase64ValidationScore(input, entropyProfile, balanceScore);
          
          if (validationScore > 0.6) {
            const decoded = atob(input);
            const decodedEntropy = calculateEntropy(decoded);
            const languageScore = calculateLanguageScore(decoded);
            
            let confidence = 75 + (validationScore * 20);
            confidence += calculateDecodingQualityBonus(decoded, decodedEntropy, languageScore);
            
            results.push({
              type: 'Base64 (Advanced Entropy)',
              result: decoded,
              confidence: Math.min(98, confidence),
              isValid: true,
              entropy: decodedEntropy,
              languageScore,
              steps: ['Advanced Entropy Analysis', 'Base64 Validation', 'Base64 Decoding'],
              analysisMetrics: {
                originalEntropy: entropy,
                validationScore,
                balanceScore
              }
            });
          }
        } catch {}
      }
    }
    
    return results.slice(0, 8);
  }
};

const strategies: DetectionStrategy[] = [
  regexStrategy,
  entropyStrategy
];

export async function performCrossCheckAnalysis(input: string): Promise<CrossCheckResult> {
  const allResults: DecodingResult[] = [];
  const strategiesUsed: string[] = [];
  
  for (const strategy of strategies) {
    try {
      const results = strategy.analyze(input);
      allResults.push(...results);
      strategiesUsed.push(strategy.name);
    } catch (error) {
      console.warn(`Strategy ${strategy.name} failed:`, error);
    }
  }
  
  // Sort by confidence
  allResults.sort((a, b) => b.confidence - a.confidence);
  
  const bestMatch = allResults[0] || {
    type: 'Unknown',
    result: input,
    confidence: 0,
    isValid: false,
    steps: ['No detection strategies succeeded']
  };
  
  const crossCheckConfidence = allResults.length > 1 ? 
    Math.min(bestMatch.confidence + 10, 100) : bestMatch.confidence;
  
  return {
    bestMatch,
    alternatives: allResults.slice(1, 10),
    inputAnalysis: {
      length: input.length,
      entropy: calculateEntropy(input),
      hasValidUtf8: true
    },
    crossCheckConfidence,
    strategiesUsed,
    consensusStrength: allResults.length > 3 ? 'strong' : allResults.length > 1 ? 'moderate' : 'weak'
  };
}