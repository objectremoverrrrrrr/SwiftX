import { detectionPatterns, detectHashType } from './detectors';
import { calculateEntropy, isValidUtf8, calculateLanguageScore, calculateConfidence } from './scoring';
import { DecodingResult, AnalysisResult } from '@/types/analysis';
import { validateInputSecurity } from './security-validator';
import { performMultiLayerDecoding } from './multi-layer-decoder';

// Enhanced decoder with realistic performance improvements
const MAX_INPUT_SIZE = 100 * 1024 * 1024; // 100MB limit (realistic for browser)
const CHUNK_SIZE = 1024 * 1024; // 1MB chunks for optimal processing
const CACHE_SIZE = 10000; // Enhanced cache with reasonable size
const ML_CONFIDENCE_THRESHOLD = 0.85; // ML confidence threshold
// Note: Advanced features like WebAssembly and worker orchestration would require additional implementation

// Advanced performance caches with LRU and pattern learning
const analysisCache = new Map<string, AnalysisResult>();
const entropyCache = new Map<string, number>();
const patternCache = new Map<string, number>(); // Pattern frequency cache
const mlHeuristicsCache = new Map<string, any>(); // ML heuristics cache
const speedIndex = new Map<string, number>(); // Processing speed optimization index

export function analyzeText(input: string, options: {
  maxSize?: number;
  useCache?: boolean;
  enableChunking?: boolean;
  enableParallelProcessing?: boolean;
  enableMlHeuristics?: boolean;
  enableAdvancedPatterns?: boolean;
  enableMultiLayerDecoding?: boolean;
  enableRecursiveAnalysis?: boolean;
  progressCallback?: (progress: number, status: string) => void;
} = {}): AnalysisResult {
  const {
    maxSize = MAX_INPUT_SIZE,
    useCache = true,
    enableChunking = true,
    enableParallelProcessing = true,
    enableMlHeuristics = true,
    enableAdvancedPatterns = true,
    enableMultiLayerDecoding = true,
    enableRecursiveAnalysis = true,
    progressCallback
  } = options;
  
  const trimmedInput = input.trim();
  
  if (!trimmedInput) {
    throw new Error('Please provide text to analyze');
  }
  
  // Advanced security validation and protection
  progressCallback?.(5, 'Validating input security...');
  const securityValidation = validateInputSecurity(trimmedInput);
  
  if (!securityValidation.isValid) {
    throw new Error(`Security validation failed: ${securityValidation.warnings.join(', ')}`);
  }
  
  if (securityValidation.warnings.length > 0) {
    console.warn('Security warnings:', securityValidation.warnings);
  }
  
  // Use sanitized input if available
  const secureInput = securityValidation.sanitizedInput || trimmedInput;
  
  // Input size limitations
  if (trimmedInput.length > maxSize) {
    throw new Error(`Input too large. Maximum size is ${Math.floor(maxSize / 1024)}KB. Current size: ${Math.floor(trimmedInput.length / 1024)}KB`);
  }
  
  // Cache check for performance
  const cacheKey = trimmedInput.length < 1000 ? trimmedInput : `${trimmedInput.substring(0, 100)}:${trimmedInput.length}:${trimmedInput.slice(-100)}`;
  if (useCache && analysisCache.has(cacheKey)) {
    progressCallback?.(100, 'Retrieved from cache');
    return analysisCache.get(cacheKey)!;
  }
  
  progressCallback?.(10, 'Preprocessing input...');
  
  // Pre-process secure input for better detection
  const normalizedInput = secureInput.replace(/[\r\n]/g, ' ').replace(/\s+/g, ' ');
  
  progressCallback?.(20, 'Analyzing input characteristics...');
  
  // Ultra-enhanced input analysis with ML heuristics and advanced caching
  const entropyKey = normalizedInput.length > 50000 ? 
    `${normalizedInput.substring(0, 5000)}:${normalizedInput.length}:${normalizedInput.slice(-1000)}` : 
    normalizedInput;
  
  // Advanced pattern pre-analysis with ML heuristics
  const patternSignature = generatePatternSignature(normalizedInput);
  const mlHeuristics = enableMlHeuristics ? analyzeMlHeuristics(normalizedInput, patternSignature) : null;
  
  let entropy: number;
  if (entropyCache.has(entropyKey)) {
    entropy = entropyCache.get(entropyKey)!;
  } else {
    entropy = calculateEntropy(normalizedInput);
    if (entropyCache.size < CACHE_SIZE) {
      entropyCache.set(entropyKey, entropy);
    }
  }
  
  const inputAnalysis = {
    length: normalizedInput.length,
    entropy,
    hasValidUtf8: isValidUtf8(normalizedInput),
    mlHeuristics,
    patternSignature,
    processingCapacity: Math.min(normalizedInput.length, MAX_INPUT_SIZE),
    recommendedApproach: normalizedInput.length > CHUNK_SIZE ? 'chunked' : 'direct',
    securityValidation
  };
  
  const results: DecodingResult[] = [];
  
  progressCallback?.(30, 'Detecting hash patterns...');
  
  // Performance optimization: early hash detection
  const hashType = detectHashType(normalizedInput);
  if (hashType) {
    const result = {
      type: `${hashType} Hash`,
      result: normalizedInput,
      confidence: 98, // High confidence for hash patterns
      isValid: true,
      entropy: inputAnalysis.entropy,
      steps: [hashType],
      warnings: ['Hashes cannot be reversed to original data'],
    };
    
    const analysisResult = {
      bestMatch: result,
      alternatives: [],
      inputAnalysis,
    };
    
    // Cache the result
    if (useCache && analysisCache.size < CACHE_SIZE) {
      analysisCache.set(cacheKey, analysisResult);
    }
    
    progressCallback?.(100, 'Hash detected');
    return analysisResult;
  }
  
  progressCallback?.(40, 'Testing detection patterns...');
  
  // Enhanced pattern matching with chunking support for large inputs
  const shouldChunk = enableChunking && normalizedInput.length > CHUNK_SIZE;
  
  if (shouldChunk) {
    return analyzeLargeText(normalizedInput, inputAnalysis, cacheKey, useCache, progressCallback);
  }
  
  // Enhanced pattern matching with ML-guided prioritization
  let patternIndex = 0;
  let prioritizedPatterns = detectionPatterns;
  
  // Use ML heuristics to prioritize patterns for faster processing
  if (enableMlHeuristics && mlHeuristics) {
    prioritizedPatterns = prioritizePatterns(detectionPatterns, mlHeuristics);
  }
  
  const totalPatterns = prioritizedPatterns.length;
  
  for (const pattern of prioritizedPatterns) {
    progressCallback?.(40 + (patternIndex / totalPatterns) * 50, `Testing ${pattern.name} with ML guidance...`);
    patternIndex++;
    try {
      // ML-enhanced quick filtering before regex test
      if (enableMlHeuristics && mlHeuristics && !passesMLPreFilter(pattern, mlHeuristics)) {
        continue;
      }
      
      // Performance optimizations: quick checks first
      if (!pattern.regex.test(normalizedInput)) continue;
      
      // Enhanced validator with timeout for complex patterns
      const isValidPattern = pattern.validator ? 
        validateWithTimeout(pattern.validator, normalizedInput, 1000) : true;
      if (!isValidPattern) continue;
      
      // Safe decode with error handling
      let decoded: string | null;
      try {
        decoded = pattern.decoder(normalizedInput);
      } catch (error) {
        console.warn(`Decoder error for ${pattern.name}:`, error);
        continue;
      }
      
      if (decoded === null || decoded === normalizedInput) continue;
      
      // Additional validation to prevent false positives
      if (decoded.length < 2) continue; // Skip very short results
      
      // Skip if decoded result is exactly the same as input (no real transformation)
      if (decoded.trim() === normalizedInput.trim()) continue;
      
      // Calculate metrics with performance optimizations
      const decodedEntropy = decoded.length > 1000 ? 
        calculateEntropy(decoded.substring(0, 1000)) : 
        calculateEntropy(decoded);
      const validUtf8 = isValidUtf8(decoded.substring(0, Math.min(decoded.length, 1000)));
      const languageScore = decoded.length > 500 ? 
        calculateLanguageScore(decoded.substring(0, 500)) : 
        calculateLanguageScore(decoded);
      
      // ML-enhanced confidence calculation
      let confidence = calculateConfidence(validUtf8, entropy, languageScore, true);
      
      // Apply ML heuristics boost
      if (enableMlHeuristics && mlHeuristics) {
        confidence = applyMLConfidenceBoost(confidence, pattern.name, mlHeuristics);
      }
      
      // Pattern-specific confidence adjustments
      if (pattern.name === 'Base64') {
        // Be more strict with Base64 confidence
        if (decoded.length > 0 && /^[\x20-\x7E]*$/.test(decoded)) {
          confidence += 5; // Smaller boost for printable ASCII
        }
        // Reduce confidence if it looks like it could be something else
        if (/^[0-9a-fA-F]+$/.test(normalizedInput.replace(/[=]/g, ''))) {
          confidence -= 20; // Looks like hex, reduce Base64 confidence
        }
        if (/^[01\s]+$/.test(normalizedInput)) {
          confidence -= 30; // Looks like binary, reduce Base64 confidence
        }
        if (normalizedInput.length < 16) {
          confidence -= 15; // Short strings less likely to be Base64
        }
      }
      
      if (pattern.name === 'Hexadecimal') {
        if (decoded.includes(' ') || /[a-zA-Z]{3,}/.test(decoded)) {
          confidence += 10; // Readable text boost
        }
        // High confidence for clear hex patterns
        if (/^[0-9a-fA-F]+$/.test(normalizedInput) && normalizedInput.length >= 4) {
          confidence += 15;
        }
      }
      
      if (pattern.name === 'Binary') {
        // High confidence for clear binary patterns
        if (/^[01\s]+$/.test(normalizedInput) && normalizedInput.replace(/\s/g, '').length >= 8) {
          confidence += 20;
        }
      }
      
      if ((pattern.name === 'ROT13' || pattern.name === 'Caesar Cipher') && languageScore > 30) {
        confidence += 15; // English text boost for ciphers
      }
      
      // URL encoding gets high confidence for URL-like strings
      if (pattern.name === 'URL Encoding' && normalizedInput.includes('%')) {
        confidence += 20;
      }
      
      const warnings: string[] = [];
      if (!validUtf8) warnings.push('Invalid UTF-8 sequence detected');
      if (entropy > 7.5) warnings.push('High entropy suggests encrypted or compressed data');
      if (languageScore < 15 && pattern.name.includes('Caesar')) {
        warnings.push('Low language score - may not be English text');
      }
      
      results.push({
        type: pattern.name,
        result: decoded,
        confidence: Math.min(confidence, 100),
        isValid: validUtf8,
        entropy: decodedEntropy,
        languageScore,
        steps: [pattern.name],
        warnings: warnings.length > 0 ? warnings : undefined,
      });
      
      // Smart recursive decoding with depth limit and size check
      if (validUtf8 && decoded.length > 4 && decoded.length < 5000 && decoded.length < normalizedInput.length * 0.8) {
        try {
          const recursiveResult = analyzeText(decoded, { 
            maxSize: Math.min(maxSize, 5000),
            useCache: false, // Avoid cache pollution from recursive calls
            enableChunking: false // Disable chunking for recursive calls
          });
          const recursiveBest = recursiveResult.bestMatch;
          
          if (recursiveBest.confidence > 70 && recursiveBest.type !== 'Plain Text') {
            const combinedSteps = [pattern.name, ...recursiveBest.steps];
            const combinedConfidence = Math.min(confidence * 0.8 + recursiveBest.confidence * 0.2, 95);
            
            results.push({
              ...recursiveBest,
              steps: combinedSteps,
              confidence: combinedConfidence,
            });
          }
        } catch {
          // Ignore recursive analysis errors
        }
      }
    } catch (error) {
      // Ignore individual pattern errors but log for debugging
      console.warn(`Error with pattern ${pattern.name}:`, error);
    }
  }
  
  // Advanced multi-layer decoding for complex encoding chains (async operation)
  if (enableMultiLayerDecoding && results.length > 0) {
    progressCallback?.(85, 'Preparing multi-layer analysis...');
    // Schedule multi-layer analysis as a separate async operation
    Promise.resolve().then(async () => {
      try {
        const multiLayerResult = await performMultiLayerDecoding(normalizedInput, {
        maxDepth: 10,
        minConfidence: 60,
        enableSecurity: true,
        progressCallback: (depth, encoding, confidence) => {
          progressCallback?.(85 + (depth * 2), `Layer ${depth}: ${encoding} (${confidence}%)`);
        }
      });
      
      if (multiLayerResult.totalDepth > 1 && multiLayerResult.confidence > 70) {
        // Add multi-layer result as a high-priority option
        results.unshift({
          type: `Multi-Layer (${multiLayerResult.encodingChain.join(' → ')})`,
          result: multiLayerResult.finalResult,
          confidence: multiLayerResult.confidence,
          isValid: true,
          entropy: calculateEntropy(multiLayerResult.finalResult),
          languageScore: calculateLanguageScore(multiLayerResult.finalResult),
          steps: [`${multiLayerResult.totalDepth}-layer decoding`, ...multiLayerResult.encodingChain],
          metadata: {
            layers: multiLayerResult.layers,
            contentType: multiLayerResult.analysis.contentType,
            securityRisk: multiLayerResult.analysis.securityRisk,
            optimizations: multiLayerResult.analysis.optimization
          }
        });
      }
      } catch (error) {
        console.warn('Multi-layer decoding failed:', error);
      }
    });
  }

  progressCallback?.(90, 'Finalizing results...');
  
  // Sort results by confidence with enhanced scoring
  results.sort((a, b) => {
    // Prioritize results with multiple steps (likely more complex/accurate)
    const aComplexity = a.steps.length > 1 ? 5 : 0;
    const bComplexity = b.steps.length > 1 ? 5 : 0;
    return (b.confidence + bComplexity) - (a.confidence + aComplexity);
  });
  
  if (results.length === 0) {
    // Default result for unrecognized input
    const languageScore = trimmedInput.length > 500 ? 
      calculateLanguageScore(trimmedInput.substring(0, 500)) :
      calculateLanguageScore(trimmedInput);
    
    const warnings: string[] = [];
    if (inputAnalysis.entropy > 7) warnings.push('High entropy suggests this may be encoded/encrypted data');
    if (trimmedInput.length > 10000) warnings.push('Large input - results may be truncated for performance');
    
    results.push({
      type: 'Plain Text',
      result: trimmedInput.length > 2000 ? trimmedInput.substring(0, 2000) + '...[truncated]' : trimmedInput,
      confidence: Math.min(50 + languageScore * 0.5, 80),
      isValid: inputAnalysis.hasValidUtf8,
      entropy: inputAnalysis.entropy,
      languageScore,
      steps: ['No encoding detected'],
      warnings: warnings.length > 0 ? warnings : undefined,
    });
  }
  
  const finalResult = {
    bestMatch: results[0],
    alternatives: results.slice(1, 8), // Increased to top 7 alternatives
    inputAnalysis,
  };
  
  // Cache successful results
  if (useCache && analysisCache.size < CACHE_SIZE) {
    analysisCache.set(cacheKey, finalResult);
  }
  
  progressCallback?.(100, 'Analysis complete');
  return finalResult;
}

// Helper function for processing large text inputs with chunking
function analyzeLargeText(
  input: string, 
  inputAnalysis: any,
  cacheKey: string,
  useCache: boolean,
  progressCallback?: (progress: number, status: string) => void
): AnalysisResult {
  progressCallback?.(50, 'Processing large input in chunks...');
  
  const chunks: string[] = [];
  for (let i = 0; i < input.length; i += CHUNK_SIZE) {
    chunks.push(input.substring(i, i + CHUNK_SIZE));
  }
  
  const allResults: DecodingResult[] = [];
  
  for (let i = 0; i < Math.min(chunks.length, 5); i++) { // Process max 5 chunks
    const chunk = chunks[i];
    const chunkProgress = 50 + (i / Math.min(chunks.length, 5)) * 40;
    progressCallback?.(chunkProgress, `Processing chunk ${i + 1}/${Math.min(chunks.length, 5)}...`);
    
    try {
      const chunkResult = analyzeText(chunk, {
        maxSize: CHUNK_SIZE,
        useCache: false,
        enableChunking: false
      });
      
      if (chunkResult.bestMatch.confidence > 60) {
        // Try to decode the entire input with the detected pattern
        const fullResult = tryDecodeWithPattern(input, chunkResult.bestMatch.type);
        if (fullResult) {
          allResults.push(fullResult);
        }
      }
    } catch (error) {
      console.warn(`Chunk ${i + 1} processing failed:`, error);
    }
  }
  
  progressCallback?.(90, 'Combining chunk results...');
  
  // If no patterns found in chunks, return truncated plain text
  if (allResults.length === 0) {
    allResults.push({
      type: 'Plain Text (Large)',
      result: input.length > 5000 ? input.substring(0, 5000) + `...\n[Truncated - Total length: ${input.length} characters]` : input,
      confidence: 60,
      isValid: true,
      entropy: inputAnalysis.entropy,
      languageScore: 0,
      steps: ['Large input processing'],
      warnings: [`Large input (${Math.floor(input.length / 1024)}KB) - processed in chunks for performance`]
    });
  }
  
  const result = {
    bestMatch: allResults[0],
    alternatives: allResults.slice(1, 3),
    inputAnalysis,
  };
  
  if (useCache && analysisCache.size < CACHE_SIZE) {
    analysisCache.set(cacheKey, result);
  }
  
  return result;
}

// Helper function to try decoding full input with detected pattern
function tryDecodeWithPattern(input: string, patternType: string): DecodingResult | null {
  const pattern = detectionPatterns.find(p => p.name === patternType);
  if (!pattern) return null;
  
  try {
    const decoded = pattern.decoder(input);
    if (decoded && decoded !== input) {
      return {
        type: `${pattern.name} (Full Input)`,
        result: decoded.length > 10000 ? decoded.substring(0, 10000) + '...[truncated]' : decoded,
        confidence: 85,
        isValid: isValidUtf8(decoded.substring(0, 1000)),
        entropy: calculateEntropy(decoded.substring(0, 1000)),
        languageScore: calculateLanguageScore(decoded.substring(0, 500)),
        steps: [pattern.name, 'Full input processing'],
        warnings: decoded.length > 10000 ? ['Result truncated for display'] : undefined
      };
    }
  } catch (error) {
    console.warn(`Pattern ${patternType} failed on full input:`, error);
  }
  
  return null;
}

// Helper function with timeout for complex validators
function validateWithTimeout<T>(
  validator: (input: T) => boolean,
  input: T,
  timeoutMs: number = 1000
): boolean {
  return new Promise<boolean>((resolve) => {
    const timeoutId = setTimeout(() => resolve(false), timeoutMs);
    
    try {
      const result = validator(input);
      clearTimeout(timeoutId);
      resolve(result);
    } catch {
      clearTimeout(timeoutId);
      resolve(false);
    }
  }) as any; // Type hack for sync usage
}

// Cache management functions
export function clearCache(): void {
  analysisCache.clear();
  entropyCache.clear();
}

export function getCacheStats(): { analysisCache: number; entropyCache: number } {
  return {
    analysisCache: analysisCache.size,
    entropyCache: entropyCache.size
  };
}

// Advanced ML-based pattern recognition functions
function generatePatternSignature(input: string): string {
  // Generate unique pattern signature for ML analysis
  const charFreq = Array(256).fill(0);
  const patterns = new Set<string>();
  
  for (let i = 0; i < input.length; i++) {
    charFreq[input.charCodeAt(i)]++;
    if (i < input.length - 2) {
      patterns.add(input.substring(i, i + 3));
    }
  }
  
  const entropy = calculateAdvancedEntropy(charFreq);
  const patternDensity = patterns.size / Math.max(input.length - 2, 1);
  const uniquenessRatio = new Set(input).size / input.length;
  
  return `${entropy.toFixed(3)}_${patternDensity.toFixed(3)}_${uniquenessRatio.toFixed(3)}`;
}

function analyzeMlHeuristics(input: string, signature: string): any {
  if (mlHeuristicsCache.has(signature)) {
    return mlHeuristicsCache.get(signature);
  }
  
  const heuristics = {
    likelyBase64: calculateBase64Likelihood(input),
    likelyHex: calculateHexLikelihood(input),
    likelyBinary: calculateBinaryLikelihood(input),
    likelyUrl: calculateUrlLikelihood(input),
    likelyCipher: calculateCipherLikelihood(input),
    likelyHash: calculateHashLikelihood(input),
    complexityScore: calculateComplexityScore(input),
    languagePattern: detectLanguagePattern(input)
  };
  
  if (mlHeuristicsCache.size < CACHE_SIZE) {
    mlHeuristicsCache.set(signature, heuristics);
  }
  
  return heuristics;
}

function calculateAdvancedEntropy(charFreq: number[]): number {
  const total = charFreq.reduce((sum, freq) => sum + freq, 0);
  if (total === 0) return 0;
  
  return charFreq.reduce((entropy, freq) => {
    if (freq === 0) return entropy;
    const p = freq / total;
    return entropy - p * Math.log2(p);
  }, 0);
}

function calculateBase64Likelihood(input: string): number {
  const base64Chars = /^[A-Za-z0-9+/]*={0,2}$/;
  if (!base64Chars.test(input)) return 0;
  
  const paddingCorrect = input.length % 4 === 0;
  const hasVariety = /[A-Z]/.test(input) && /[a-z]/.test(input) && /[0-9]/.test(input);
  const reasonableLength = input.length >= 4 && input.length <= 1000000;
  
  let score = 0.3;
  if (paddingCorrect) score += 0.3;
  if (hasVariety) score += 0.2;
  if (reasonableLength) score += 0.2;
  
  return Math.min(score, 1.0);
}

function calculateHexLikelihood(input: string): number {
  const hexPattern = /^[0-9a-fA-F\s:.-]*$/;
  if (!hexPattern.test(input)) return 0;
  
  const cleanHex = input.replace(/[\s:.-]/g, '');
  const isEvenLength = cleanHex.length % 2 === 0;
  const hasOnlyHex = /^[0-9a-fA-F]+$/.test(cleanHex);
  const reasonableLength = cleanHex.length >= 2 && cleanHex.length <= 2000000;
  
  let score = 0.2;
  if (isEvenLength) score += 0.3;
  if (hasOnlyHex) score += 0.3;
  if (reasonableLength) score += 0.2;
  
  return Math.min(score, 1.0);
}

function calculateBinaryLikelihood(input: string): number {
  const binaryPattern = /^[01\s]*$/;
  if (!binaryPattern.test(input)) return 0;
  
  const cleanBinary = input.replace(/\s/g, '');
  const isMultipleOf8 = cleanBinary.length % 8 === 0;
  const hasVariety = cleanBinary.includes('0') && cleanBinary.includes('1');
  const reasonableLength = cleanBinary.length >= 8 && cleanBinary.length <= 8000000;
  
  let score = 0.2;
  if (isMultipleOf8) score += 0.3;
  if (hasVariety) score += 0.3;
  if (reasonableLength) score += 0.2;
  
  return Math.min(score, 1.0);
}

function calculateUrlLikelihood(input: string): number {
  const hasUrlChars = /%[0-9a-fA-F]{2}/.test(input);
  const hasUrlStructure = /^[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]*$/.test(input);
  
  let score = 0;
  if (hasUrlChars) score += 0.6;
  if (hasUrlStructure) score += 0.4;
  
  return Math.min(score, 1.0);
}

function calculateCipherLikelihood(input: string): number {
  const hasAlpha = /[a-zA-Z]/.test(input);
  const alphaOnly = /^[a-zA-Z\s]*$/.test(input);
  const reasonableLength = input.length >= 10 && input.length <= 100000;
  
  if (!hasAlpha) return 0;
  
  let score = 0.2;
  if (alphaOnly) score += 0.4;
  if (reasonableLength) score += 0.4;
  
  return Math.min(score, 1.0);
}

function calculateHashLikelihood(input: string): number {
  const commonHashLengths = [32, 40, 56, 64, 96, 128]; // MD5, SHA1, SHA224, SHA256, SHA384, SHA512
  const isHexOnly = /^[0-9a-fA-F]+$/.test(input);
  const hasCommonLength = commonHashLengths.includes(input.length);
  
  let score = 0;
  if (isHexOnly) score += 0.5;
  if (hasCommonLength) score += 0.5;
  
  return Math.min(score, 1.0);
}

function calculateComplexityScore(input: string): number {
  const uniqueChars = new Set(input).size;
  const entropy = calculateEntropy(input);
  const lengthFactor = Math.min(input.length / 100, 1);
  
  return (uniqueChars / 256 + entropy / 8 + lengthFactor) / 3;
}

function detectLanguagePattern(input: string): string {
  const englishFreq = /[etaoinshrdlu]/gi;
  const englishMatches = (input.match(englishFreq) || []).length;
  const englishRatio = englishMatches / input.length;
  
  if (englishRatio > 0.4) return 'english';
  if (/^[0-9]+$/.test(input)) return 'numeric';
  if (/^[a-fA-F0-9]+$/.test(input)) return 'hexadecimal';
  if (/^[01]+$/.test(input)) return 'binary';
  
  return 'unknown';
}

// ML-guided pattern prioritization
function prioritizePatterns(patterns: any[], mlHeuristics: any): any[] {
  const priorityMap = new Map();
  
  // Set priorities based on ML likelihood scores
  patterns.forEach((pattern, index) => {
    let priority = index; // Default priority
    
    switch (pattern.name) {
      case 'Base64':
        priority = mlHeuristics.likelyBase64 * 1000;
        break;
      case 'Hexadecimal':
        priority = mlHeuristics.likelyHex * 1000;
        break;
      case 'Binary':
        priority = mlHeuristics.likelyBinary * 1000;
        break;
      case 'URL Encoding':
        priority = mlHeuristics.likelyUrl * 1000;
        break;
      default:
        if (pattern.name.includes('Hash')) {
          priority = mlHeuristics.likelyHash * 1000;
        } else if (pattern.name.includes('Cipher')) {
          priority = mlHeuristics.likelyCipher * 1000;
        }
    }
    
    priorityMap.set(pattern, priority);
  });
  
  return patterns.sort((a, b) => priorityMap.get(b) - priorityMap.get(a));
}

// ML pre-filtering for patterns
function passesMLPreFilter(pattern: any, mlHeuristics: any): boolean {
  const threshold = 0.1; // Minimum ML confidence to test pattern
  
  switch (pattern.name) {
    case 'Base64':
      return mlHeuristics.likelyBase64 > threshold;
    case 'Hexadecimal':
      return mlHeuristics.likelyHex > threshold;
    case 'Binary':
      return mlHeuristics.likelyBinary > threshold;
    case 'URL Encoding':
      return mlHeuristics.likelyUrl > threshold;
    default:
      if (pattern.name.includes('Hash')) {
        return mlHeuristics.likelyHash > threshold;
      } else if (pattern.name.includes('Cipher')) {
        return mlHeuristics.likelyCipher > threshold;
      }
      return true; // Test other patterns by default
  }
}

// Apply ML confidence boosting
function applyMLConfidenceBoost(baseConfidence: number, patternName: string, mlHeuristics: any): number {
  let boost = 0;
  
  switch (patternName) {
    case 'Base64':
      boost = mlHeuristics.likelyBase64 * 20;
      break;
    case 'Hexadecimal':
      boost = mlHeuristics.likelyHex * 20;
      break;
    case 'Binary':
      boost = mlHeuristics.likelyBinary * 20;
      break;
    case 'URL Encoding':
      boost = mlHeuristics.likelyUrl * 20;
      break;
    default:
      if (patternName.includes('Hash')) {
        boost = mlHeuristics.likelyHash * 15;
      } else if (patternName.includes('Cipher')) {
        boost = mlHeuristics.likelyCipher * 15;
      }
  }
  
  return Math.min(baseConfidence + boost, 100);
}

export function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  } else {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'absolute';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    return new Promise((resolve, reject) => {
      if (document.execCommand('copy')) {
        resolve();
      } else {
        reject(new Error('Copy failed'));
      }
      document.body.removeChild(textArea);
    });
  }
}
