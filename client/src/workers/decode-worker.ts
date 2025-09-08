// High-Performance Web Worker for Parallel Text Decoding
// Handles massive text processing with multi-threading support

import { detectionPatterns } from '../lib/detectors';
import { calculateEntropy, calculateLanguageScore, calculateConfidence } from '../lib/scoring';

// Worker message types
interface WorkerMessage {
  id: string;
  type: 'decode' | 'analyze' | 'chunk-process';
  data: {
    input: string;
    patterns?: string[];
    chunkIndex?: number;
    totalChunks?: number;
  };
}

interface WorkerResponse {
  id: string;
  type: 'result' | 'progress' | 'error';
  data: any;
}

// High-performance parallel processing queue
const processingQueue = new Map<string, any>();

// Advanced caching for worker
const workerCache = new Map<string, any>();
const WORKER_CACHE_SIZE = 10000;

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { id, type, data } = event.data;
  
  try {
    switch (type) {
      case 'decode':
        await processDecoding(id, data.input, data.patterns);
        break;
      case 'analyze':
        await processAnalysis(id, data.input);
        break;
      case 'chunk-process':
        await processChunk(id, data.input, data.chunkIndex, data.totalChunks);
        break;
      default:
        throw new Error(`Unknown worker task type: ${type}`);
    }
  } catch (error) {
    postMessage({
      id,
      type: 'error',
      data: { error: error instanceof Error ? error.message : 'Unknown error' }
    } as WorkerResponse);
  }
};

async function processDecoding(id: string, input: string, patterns?: string[]) {
  postMessage({
    id,
    type: 'progress',
    data: { progress: 10, status: 'Starting parallel decoding...' }
  } as WorkerResponse);

  const cacheKey = generateCacheKey(input);
  
  // Check cache first
  if (workerCache.has(cacheKey)) {
    postMessage({
      id,
      type: 'result',
      data: workerCache.get(cacheKey)
    } as WorkerResponse);
    return;
  }

  const results = [];
  const targetPatterns = patterns ? 
    detectionPatterns.filter(p => patterns.includes(p.name)) : 
    detectionPatterns;

  let processedCount = 0;
  
  for (const pattern of targetPatterns) {
    try {
      postMessage({
        id,
        type: 'progress',
        data: { 
          progress: 10 + (processedCount / targetPatterns.length) * 80, 
          status: `Processing ${pattern.name}...` 
        }
      } as WorkerResponse);

      if (pattern.regex.test(input)) {
        const isValid = pattern.validator ? pattern.validator(input) : true;
        
        if (isValid) {
          const decoded = pattern.decoder(input);
          
          if (decoded && decoded !== input) {
            const confidence = calculateConfidence(
              true, 
              calculateEntropy(decoded), 
              calculateLanguageScore(decoded), 
              true
            );

            results.push({
              type: pattern.name,
              result: decoded,
              confidence,
              entropy: calculateEntropy(decoded),
              languageScore: calculateLanguageScore(decoded),
              steps: [pattern.name],
              processingTime: Date.now()
            });
          }
        }
      }
      
      processedCount++;
    } catch (error) {
      console.warn(`Worker error processing ${pattern.name}:`, error);
    }
  }

  // Sort by confidence
  results.sort((a, b) => b.confidence - a.confidence);

  const finalResult = {
    bestMatch: results[0] || {
      type: 'Plain Text',
      result: input.length > 1000 ? input.substring(0, 1000) + '...' : input,
      confidence: 50,
      entropy: calculateEntropy(input),
      languageScore: calculateLanguageScore(input),
      steps: ['No encoding detected'],
      processingTime: Date.now()
    },
    alternatives: results.slice(1, 5),
    totalProcessed: processedCount,
    processingTime: Date.now()
  };

  // Cache result
  if (workerCache.size < WORKER_CACHE_SIZE) {
    workerCache.set(cacheKey, finalResult);
  }

  postMessage({
    id,
    type: 'progress',
    data: { progress: 100, status: 'Parallel processing complete!' }
  } as WorkerResponse);

  postMessage({
    id,
    type: 'result',
    data: finalResult
  } as WorkerResponse);
}

async function processAnalysis(id: string, input: string) {
  postMessage({
    id,
    type: 'progress',
    data: { progress: 15, status: 'Analyzing input characteristics...' }
  } as WorkerResponse);

  const analysis = {
    length: input.length,
    entropy: calculateEntropy(input),
    languageScore: calculateLanguageScore(input),
    complexity: calculateComplexityScore(input),
    patterns: detectPatterns(input),
    estimatedType: estimateType(input),
    processingTime: Date.now()
  };

  postMessage({
    id,
    type: 'result',
    data: analysis
  } as WorkerResponse);
}

async function processChunk(id: string, chunk: string, chunkIndex?: number, totalChunks?: number) {
  const progress = chunkIndex && totalChunks ? 
    Math.round((chunkIndex / totalChunks) * 100) : 50;
  
  postMessage({
    id,
    type: 'progress',
    data: { 
      progress, 
      status: `Processing chunk ${chunkIndex || 1}/${totalChunks || 1}...` 
    }
  } as WorkerResponse);

  // Enhanced chunk processing with intelligent pattern selection
  const results = [];
  const chunkEntropy = calculateEntropy(chunk);
  const chunkLength = chunk.length;
  
  // Priority patterns based on chunk characteristics
  const priorityPatterns: any[] = [];
  
  // Select patterns based on entropy and length characteristics
  if (chunkEntropy > 5 && chunkEntropy < 6.5) {
    // High entropy suggests encoded data
    priorityPatterns.push(...detectionPatterns.filter(p => 
      ['Base64', 'Hexadecimal', 'ASCII85'].includes(p.name)
    ));
  } else if (chunkEntropy < 2) {
    // Low entropy suggests simple transformations
    priorityPatterns.push(...detectionPatterns.filter(p => 
      ['Binary', 'ROT13', 'Caesar Cipher'].includes(p.name)
    ));
  } else {
    // Medium entropy - try common patterns
    priorityPatterns.push(...detectionPatterns.filter(p => 
      ['URL Encoding', 'HTML Entity', 'Unicode Escape'].includes(p.name)
    ));
  }
  
  // Add remaining top patterns
  const remainingPatterns = detectionPatterns.filter(p => !priorityPatterns.includes(p)).slice(0, 5);
  const selectedPatterns = [...priorityPatterns, ...remainingPatterns].slice(0, 12);
  
  for (const pattern of selectedPatterns) {
    try {
      // Quick pre-check to avoid expensive operations
      if (!pattern.regex.test(chunk)) continue;
      
      // Enhanced validation for chunks
      const isValid = pattern.validator ? 
        validateChunkWithTimeout(pattern.validator, chunk, 500) : true;
      if (!isValid) continue;
      
      const decoded = pattern.decoder(chunk);
      if (!decoded || decoded === chunk || decoded.length < 1) continue;
      
      // Calculate more accurate confidence for chunks
      const decodedEntropy = calculateEntropy(decoded);
      const languageScore = calculateLanguageScore(decoded.substring(0, Math.min(decoded.length, 300)));
      
      let confidence = calculateConfidence(true, decodedEntropy, languageScore, true);
      
      // Boost confidence for patterns that work well on chunks
      if (['Base64', 'Hexadecimal', 'URL Encoding'].includes(pattern.name)) {
        confidence += 5;
      }
      
      // Quality checks for chunk results
      if (decoded.length >= chunk.length * 0.5 && decoded.length <= chunk.length * 2) {
        confidence += 3; // Reasonable length transformation
      }
      
      results.push({
        type: pattern.name,
        confidence,
        sample: decoded.substring(0, 250),
        chunkIndex,
        entropy: decodedEntropy,
        languageScore,
        originalLength: chunk.length,
        decodedLength: decoded.length
      });
    } catch (error) {
      // Ignore chunk processing errors but log for debugging
      console.debug(`Chunk processing error for ${pattern.name}:`, error);
    }
  }

  // Sort results by confidence and quality
  results.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));

  postMessage({
    id,
    type: 'result',
    data: { 
      chunkResults: results.slice(0, 8), // Top 8 results per chunk
      chunkIndex,
      chunkMetrics: {
        entropy: chunkEntropy,
        length: chunkLength,
        processedPatterns: selectedPatterns.length,
        successfulDecodings: results.length
      }
    }
  } as WorkerResponse);
}

// Enhanced validation with timeout for chunks
function validateChunkWithTimeout(validator: Function, input: string, timeoutMs: number): boolean {
  try {
    // For chunks, use a simpler timeout mechanism
    const startTime = Date.now();
    const result = validator(input);
    const elapsed = Date.now() - startTime;
    
    // If validation takes too long, assume it's not a good match
    return result && elapsed < timeoutMs;
  } catch (error) {
    return false;
  }
}

// Helper functions
function generateCacheKey(input: string): string {
  // Enhanced cache key generation for better hit rates
  if (input.length < 500) return input;
  
  // Use hash-like approach for longer strings
  const entropy = calculateEntropy(input.substring(0, 200));
  const charDistribution = getCharacterDistribution(input.substring(0, 200));
  return `${input.substring(0, 100)}:${input.length}:${input.slice(-100)}:${entropy.toFixed(2)}:${charDistribution}`;
}

function getCharacterDistribution(text: string): string {
  // Generate a character distribution signature for cache differentiation
  const counts = {
    letters: (text.match(/[a-zA-Z]/g) || []).length,
    numbers: (text.match(/[0-9]/g) || []).length,
    specials: (text.match(/[^a-zA-Z0-9\s]/g) || []).length,
    spaces: (text.match(/\s/g) || []).length
  };
  return `${counts.letters}-${counts.numbers}-${counts.specials}-${counts.spaces}`;
}

function calculateComplexityScore(input: string): number {
  const uniqueChars = new Set(input).size;
  const entropy = calculateEntropy(input);
  const lengthFactor = Math.min(input.length / 1000, 1);
  return (uniqueChars / 256 + entropy / 8 + lengthFactor) / 3;
}

function detectPatterns(input: string): string[] {
  const patterns = [];
  
  if (/^[A-Za-z0-9+/]*={0,2}$/.test(input)) patterns.push('base64-like');
  if (/^[0-9a-fA-F\s:.-]*$/.test(input)) patterns.push('hex-like');
  if (/^[01\s]*$/.test(input)) patterns.push('binary-like');
  if (/%[0-9a-fA-F]{2}/.test(input)) patterns.push('url-encoded');
  if (/^[0-9a-fA-F]{32,128}$/.test(input)) patterns.push('hash-like');
  
  return patterns;
}

function estimateType(input: string): string {
  const patterns = detectPatterns(input);
  if (patterns.length > 0) return patterns[0];
  
  const entropy = calculateEntropy(input);
  if (entropy > 7) return 'encrypted-or-compressed';
  if (entropy < 3) return 'repetitive-text';
  return 'natural-text';
}

// Export for TypeScript (won't execute in worker)
export {};