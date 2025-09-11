// Advanced Multi-Layer Decoding System with Recursive Analysis
// Handles complex encoding chains with intelligent depth detection and pattern recognition

import { detectionPatterns } from './detectors';
import { calculateConfidence, calculateEntropy, calculateLanguageScore } from './scoring';
import { validateInputSecurity } from './security-validator';

export interface LayerAnalysis {
  depth: number;
  encoding: string;
  confidence: number;
  entropy: number;
  languageScore: number;
  decodedContent: string;
  detectionTime: number;
  byteSize: number;
}

export interface MultiLayerResult {
  layers: LayerAnalysis[];
  finalResult: string;
  totalDepth: number;
  encodingChain: string[];
  confidence: number;
  analysis: {
    likelyOriginalContent: boolean;
    contentType: string;
    securityRisk: string;
    optimization: string[];
  };
  processingTime: number;
}

// Advanced configuration for multi-layer analysis
const MULTI_LAYER_CONFIG = {
  maxDepth: 15, // Maximum recursive depth
  minConfidenceThreshold: 70, // Minimum confidence to continue decoding
  entropyImprovementThreshold: 0.5, // Minimum entropy reduction to continue
  languageImprovementThreshold: 10, // Minimum language score improvement
  timeoutPerLayer: 5000, // 5 seconds per layer
  enableSmartDepthDetection: true,
  enableContentTypeAnalysis: true,
  enableSecurityAnalysis: true,
  parallelAnalysis: true
};

// Pattern priorities for multi-layer analysis
const LAYER_PATTERN_PRIORITY = {
  'Base64': 100,
  'URL Encoding': 95,
  'Hexadecimal': 90,
  'Binary': 85,
  'HTML Entities': 80,
  'Unicode Escape': 75,
  'JSON Escape': 70,
  'XML Escape': 65,
  'JavaScript Escape': 60,
  'CSS Escape': 55,
  'SQL Escape': 50
};

export async function performMultiLayerDecoding(
  input: string,
  options: {
    maxDepth?: number;
    minConfidence?: number;
    enableSecurity?: boolean;
    progressCallback?: (depth: number, encoding: string, confidence: number) => void;
  } = {}
): Promise<MultiLayerResult> {
  const startTime = Date.now();
  const {
    maxDepth = MULTI_LAYER_CONFIG.maxDepth,
    minConfidence = MULTI_LAYER_CONFIG.minConfidenceThreshold,
    enableSecurity = true,
    progressCallback
  } = options;

  // Security validation
  if (enableSecurity) {
    const securityResult = validateInputSecurity(input);
    if (!securityResult.isValid) {
      throw new Error(`Multi-layer security validation failed: ${securityResult.warnings.join(', ')}`);
    }
  }

  const layers: LayerAnalysis[] = [];
  const encodingChain: string[] = [];
  let currentContent = input.trim();
  let currentDepth = 0;
  let previousEntropy = calculateEntropy(currentContent);
  let previousLanguageScore = calculateLanguageScore(currentContent);

  // Main decoding loop with intelligent depth detection
  while (currentDepth < maxDepth) {
    progressCallback?.(currentDepth, 'analyzing', 0);
    
    const layerStartTime = Date.now();
    
    // Analyze current layer with timeout protection
    const layerResult = await analyzeCurrentLayer(
      currentContent, 
      currentDepth, 
      previousEntropy, 
      previousLanguageScore,
      minConfidence
    );
    
    if (!layerResult) {
      // No more viable decodings found
      break;
    }

    layers.push(layerResult);
    encodingChain.push(layerResult.encoding);
    
    progressCallback?.(currentDepth, layerResult.encoding, layerResult.confidence);

    // Smart stopping conditions
    if (shouldStopDecoding(layerResult, previousEntropy, previousLanguageScore, layers)) {
      break;
    }

    // Prepare for next iteration
    currentContent = layerResult.decodedContent;
    currentDepth++;
    previousEntropy = layerResult.entropy;
    previousLanguageScore = layerResult.languageScore;

    // Timeout protection
    if (Date.now() - layerStartTime > MULTI_LAYER_CONFIG.timeoutPerLayer) {
      console.warn(`Layer ${currentDepth} exceeded timeout, stopping analysis`);
      break;
    }
  }

  // Final analysis and result compilation
  const finalResult = layers.length > 0 ? layers[layers.length - 1].decodedContent : input;
  const overallConfidence = calculateOverallConfidence(layers);
  const contentAnalysis = analyzeContentType(finalResult, layers);
  
  return {
    layers,
    finalResult,
    totalDepth: layers.length,
    encodingChain,
    confidence: overallConfidence,
    analysis: {
      likelyOriginalContent: isLikelyOriginalContent(finalResult, layers),
      contentType: contentAnalysis.type,
      securityRisk: contentAnalysis.securityRisk,
      optimization: generateOptimizationSuggestions(layers, encodingChain)
    },
    processingTime: Date.now() - startTime
  };
}

async function analyzeCurrentLayer(
  content: string,
  depth: number,
  previousEntropy: number,
  previousLanguageScore: number,
  minConfidence: number
): Promise<LayerAnalysis | null> {
  
  // Get prioritized patterns for this layer
  const prioritizedPatterns = getPrioritizedPatterns(content, depth);
  
  let bestMatch: LayerAnalysis | null = null;
  let bestScore = 0;

  for (const pattern of prioritizedPatterns) {
    try {
      // Quick pattern matching first
      if (!pattern.regex.test(content)) continue;

      // Validate pattern if validator exists
      if (pattern.validator && !pattern.validator(content)) continue;

      // Attempt decoding
      const decoded = pattern.decoder(content);
      if (!decoded || decoded === content) continue;

      // Calculate metrics
      const entropy = calculateEntropy(decoded);
      const languageScore = calculateLanguageScore(decoded);
      const confidence = calculateLayerConfidence(
        pattern.name,
        content,
        decoded,
        entropy,
        languageScore,
        previousEntropy,
        previousLanguageScore
      );

      // Skip if confidence too low
      if (confidence < minConfidence) continue;

      // Calculate composite score for best match selection
      const entropyImprovement = Math.max(0, previousEntropy - entropy);
      const languageImprovement = Math.max(0, languageScore - previousLanguageScore);
      const score = confidence + (entropyImprovement * 10) + (languageImprovement * 2);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = {
          depth,
          encoding: pattern.name,
          confidence,
          entropy,
          languageScore,
          decodedContent: decoded,
          detectionTime: Date.now(),
          byteSize: decoded.length
        };
      }

    } catch (error) {
      // Skip failed decodings
      console.debug(`Layer analysis failed for ${pattern.name}:`, error);
    }
  }

  return bestMatch;
}

function getPrioritizedPatterns(content: string, depth: number): any[] {
  // Smart pattern prioritization based on content characteristics and depth
  const contentHints = analyzeContentHints(content);
  
  let patterns = [...detectionPatterns];
  
  // Sort by priority score
  patterns.sort((a, b) => {
    const scoreA = calculatePatternPriority(a, contentHints, depth);
    const scoreB = calculatePatternPriority(b, contentHints, depth);
    return scoreB - scoreA;
  });

  // Limit to top patterns for performance
  return patterns.slice(0, 15);
}

function analyzeContentHints(content: string): any {
  return {
    hasBase64Chars: /^[A-Za-z0-9+/]*={0,2}$/.test(content),
    hasHexChars: /^[0-9a-fA-F\s:.-]*$/.test(content),
    hasBinaryChars: /^[01\s]*$/.test(content),
    hasUrlChars: /%[0-9a-fA-F]{2}/.test(content),
    hasHtmlEntities: /&[a-zA-Z0-9#]+;/.test(content),
    hasUnicodeEscape: /\\u[0-9a-fA-F]{4}/.test(content),
    hasJsonEscape: /\\["\\/bfnrt]/.test(content),
    length: content.length,
    entropy: calculateEntropy(content),
    specialCharRatio: (content.match(/[^a-zA-Z0-9\s]/g) || []).length / content.length
  };
}

function calculatePatternPriority(pattern: any, hints: any, depth: number): number {
  let priority = LAYER_PATTERN_PRIORITY[pattern.name as keyof typeof LAYER_PATTERN_PRIORITY] || 30;
  
  // Enhanced pattern-specific priority calculation
  const patternBoosts = {
    'Base64': calculateBase64Priority(hints, depth),
    'Hexadecimal': calculateHexPriority(hints, depth),
    'Binary': calculateBinaryPriority(hints, depth),
    'URL Encoding': calculateUrlPriority(hints, depth),
    'HTML Entities': calculateHtmlPriority(hints, depth),
    'Unicode Escape': calculateUnicodePriority(hints, depth),
    'Caesar Cipher': calculateCaesarPriority(hints, depth),
    'ROT13': calculateRotPriority(hints, depth),
    'Atbash': calculateAtbashPriority(hints, depth),
    'Base32': calculateBase32Priority(hints, depth),
    'JSON Escape': calculateJsonPriority(hints, depth)
  };
  
  const boost = patternBoosts[pattern.name as keyof typeof patternBoosts] || 0;
  priority += boost;
  
  // Depth-based priority adjustments with sophisticated logic
  const depthAdjustments = calculateDepthAdjustments(pattern.name, depth, hints);
  priority += depthAdjustments;
  
  // Content characteristic bonuses with multi-factor analysis
  priority += calculateContentCharacteristicBonus(pattern.name, hints);
  
  // Conflict resolution - reduce priority if multiple patterns match equally
  priority += calculateConflictResolutionAdjustment(pattern.name, hints);
  
  // Machine learning heuristics (if available)
  if (hints.likelyMultiLayerEncoding) {
    priority += getMLEnhancedPriority(pattern.name, hints, depth);
  }
  
  return Math.max(0, priority);
}

// Enhanced pattern-specific priority calculators
function calculateBase64Priority(hints: any, depth: number): number {
  let boost = 0;
  
  if (hints.hasBase64Chars) boost += 25;
  if (hints.isPaddedCorrectly) boost += 15;
  if (hints.hasValidLength && hints.length % 4 === 0) boost += 10;
  if (hints.entropy >= 4.8 && hints.entropy <= 6.2) boost += 12;
  if (hints.uniqueCharRatio > 0.25 && hints.uniqueCharRatio < 0.7) boost += 8;
  
  // Reduce if looks like hex
  if (hints.hasHexChars && hints.digitRatio > 0.4) boost -= 15;
  
  // Reduce if too repetitive
  if (hints.repeatedCharRatio > 0.7) boost -= 10;
  
  return boost;
}

function calculateHexPriority(hints: any, depth: number): number {
  let boost = 0;
  
  if (hints.hasHexChars) boost += 20;
  if (hints.likelyHashValue) boost += 25;
  if (hints.digitRatio > 0.3 && hints.letterRatio > 0.3) boost += 10;
  if ([32, 40, 64, 128].includes(hints.length)) boost += 15; // Common hash lengths
  
  // Coordinated case suggests intentional hex encoding
  if (hints.hasCoordinatedCase) boost += 8;
  
  // Reduce if looks more like Base64
  if (hints.hasBase64Chars && hints.specialCharRatio > 0.1) boost -= 12;
  
  return boost;
}

function calculateBinaryPriority(hints: any, depth: number): number {
  let boost = 0;
  
  if (hints.hasBinaryChars) boost += 20;
  if (hints.digitRatio > 0.95) boost += 15; // Almost all digits
  if (hints.hasRegularSpacing) boost += 10; // Often space-separated
  
  // Must be reasonable length for binary
  if (hints.length < 8 || hints.length > 1000) boost -= 15;
  
  return boost;
}

function calculateUrlPriority(hints: any, depth: number): number {
  let boost = 0;
  
  if (hints.hasUrlChars) boost += 20;
  if (hints.specialCharRatio > 0.1 && hints.specialCharRatio < 0.5) boost += 10;
  if (hints.hasValidChecksums) boost += 5; // URL encoding often has hex sequences
  
  return boost;
}

function calculateHtmlPriority(hints: any, depth: number): number {
  let boost = 0;
  
  if (hints.hasHtmlEntities) boost += 20;
  if (hints.hasCommonDelimiters) boost += 8;
  if (hints.likelyProgrammingCode) boost += 5;
  
  return boost;
}

function calculateUnicodePriority(hints: any, depth: number): number {
  let boost = 0;
  
  if (hints.hasUnicodeEscape) boost += 20;
  if (hints.hasRegularSpacing) boost += 10;
  if (hints.likelyProgrammingCode) boost += 8;
  
  return boost;
}

function calculateCaesarPriority(hints: any, depth: number): number {
  let boost = 0;
  
  if (hints.hasCaesarPattern) boost += 15;
  if (hints.likelyEncryptedText) boost += 12;
  if (hints.letterRatio > 0.8 && hints.whitespaceRatio > 0.1) boost += 10;
  if (hints.hasCoordinatedCase) boost += 8;
  
  // Reduce if looks like Base64 or hex
  if (hints.hasBase64Chars || hints.hasHexChars) boost -= 10;
  
  return boost;
}

function calculateRotPriority(hints: any, depth: number): number {
  let boost = 0;
  
  if (hints.hasRotPattern) boost += 15;
  if (hints.likelyEncryptedText) boost += 10;
  if (hints.letterRatio > 0.9) boost += 12; // Almost all letters
  
  return boost;
}

function calculateAtbashPriority(hints: any, depth: number): number {
  let boost = 0;
  
  if (hints.hasAtbashPattern) boost += 15;
  if (hints.likelyEncryptedText) boost += 10;
  if (hints.letterRatio > 0.95) boost += 8; // All letters
  
  return boost;
}

function calculateBase32Priority(hints: any, depth: number): number {
  let boost = 0;
  
  if (hints.hasBase32Chars) boost += 20;
  if (hints.hasValidLength && hints.length % 8 === 0) boost += 15;
  if (hints.upperCaseRatio > 0.8) boost += 10; // Usually uppercase
  
  return boost;
}

function calculateJsonPriority(hints: any, depth: number): number {
  let boost = 0;
  
  if (hints.hasJsonEscape) boost += 20;
  if (hints.likelyProgrammingCode) boost += 10;
  if (hints.hasCommonDelimiters) boost += 5;
  
  return boost;
}

function calculateDepthAdjustments(patternName: string, depth: number, hints: any): number {
  let adjustment = 0;
  
  // Layer 0: Outer encoding preferences
  if (depth === 0) {
    if (['Base64', 'URL Encoding', 'Hexadecimal', 'Base32'].includes(patternName)) {
      adjustment += 12;
    }
    
    // Hash detection at top level
    if (patternName === 'Hexadecimal' && hints.likelyHashValue) {
      adjustment += 15;
    }
  }
  
  // Layer 1: Common nested encodings
  else if (depth === 1) {
    if (['HTML Entities', 'Unicode Escape', 'JSON Escape'].includes(patternName)) {
      adjustment += 10;
    }
    
    // Ciphers more common at layer 1
    if (['Caesar Cipher', 'ROT13', 'Atbash'].includes(patternName)) {
      adjustment += 8;
    }
  }
  
  // Layer 2+: Deeper analysis patterns
  else if (depth >= 2) {
    if (['Caesar Cipher', 'ROT13', 'Atbash'].includes(patternName)) {
      adjustment += 12; // Ciphers often discovered deeper
    }
    
    // Reduce priority for complex encodings at deep levels
    if (['Base64', 'Base32'].includes(patternName)) {
      adjustment -= 5;
    }
  }
  
  return adjustment;
}

function calculateContentCharacteristicBonus(patternName: string, hints: any): number {
  let bonus = 0;
  
  // Entropy-based bonuses
  if (hints.entropy > 7 && ['Base64', 'Base32'].includes(patternName)) {
    bonus += 15;
  } else if (hints.entropy < 4 && ['Caesar Cipher', 'ROT13', 'Atbash'].includes(patternName)) {
    bonus += 12;
  }
  
  // Character distribution bonuses
  if (hints.specialCharRatio > 0.3 && patternName === 'URL Encoding') {
    bonus += 10;
  }
  
  if (hints.uniqueCharRatio < 0.1 && ['Binary', 'Hexadecimal'].includes(patternName)) {
    bonus += 8; // Low diversity suggests simple encoding
  }
  
  // Length-based bonuses
  if (hints.length > 100 && ['Base64', 'Hexadecimal'].includes(patternName)) {
    bonus += 5; // Longer content more likely to be these formats
  }
  
  return bonus;
}

function calculateConflictResolutionAdjustment(patternName: string, hints: any): number {
  let adjustment = 0;
  
  // Resolve Base64 vs Hex conflicts
  if (patternName === 'Base64' && hints.hasHexChars) {
    if (hints.hasBase64Chars && !hints.likelyHashValue) {
      adjustment += 5; // Favor Base64 if not obviously a hash
    } else {
      adjustment -= 8; // Favor hex if looks like hash
    }
  }
  
  if (patternName === 'Hexadecimal' && hints.hasBase64Chars) {
    if (hints.likelyHashValue) {
      adjustment += 8; // Favor hex for hash-like content
    } else {
      adjustment -= 5; // Favor Base64 otherwise
    }
  }
  
  // Resolve cipher conflicts
  const ciphers = ['Caesar Cipher', 'ROT13', 'Atbash'];
  if (ciphers.includes(patternName) && hints.likelyEncryptedText) {
    // Give slight preference to more common ciphers
    if (patternName === 'ROT13') adjustment += 3;
    if (patternName === 'Caesar Cipher') adjustment += 2;
  }
  
  return adjustment;
}

function getMLEnhancedPriority(patternName: string, hints: any, depth: number): number {
  // Machine learning-inspired heuristics for multi-layer content
  let mlBonus = 0;
  
  // Pattern sequence learning
  if (depth > 0) {
    const commonSequences = {
      'Base64': ['URL Encoding', 'HTML Entities'],
      'Hexadecimal': ['Base64', 'URL Encoding'],
      'URL Encoding': ['Base64', 'HTML Entities'],
      'Caesar Cipher': ['Base64', 'Hexadecimal']
    };
    
    if (commonSequences[patternName as keyof typeof commonSequences]) {
      mlBonus += 5;
    }
  }
  
  // Content similarity analysis
  if (hints.contextHints) {
    if (hints.likelyCompressedData && ['Base64', 'Base32'].includes(patternName)) {
      mlBonus += 8;
    }
    
    if (hints.likelyNaturalLanguage && ['Caesar Cipher', 'ROT13', 'Atbash'].includes(patternName)) {
      mlBonus += 10;
    }
  }
  
  return mlBonus;
}

function calculateLayerConfidence(
  encoding: string,
  original: string,
  decoded: string,
  entropy: number,
  languageScore: number,
  previousEntropy: number,
  previousLanguageScore: number
): number {
  let confidence = calculateConfidence(true, entropy, languageScore, true);
  
  // Boost confidence based on entropy improvement
  const entropyImprovement = previousEntropy - entropy;
  if (entropyImprovement > 1) confidence += Math.min(entropyImprovement * 10, 20);
  
  // Boost confidence based on language score improvement
  const languageImprovement = languageScore - previousLanguageScore;
  if (languageImprovement > 5) confidence += Math.min(languageImprovement, 15);
  
  // Encoding-specific adjustments
  if (encoding === 'Base64' && original.length % 4 === 0) confidence += 10;
  if (encoding === 'Hexadecimal' && original.length % 2 === 0) confidence += 10;
  if (encoding === 'Binary' && original.length % 8 === 0) confidence += 10;
  
  // Content length reasonableness
  const lengthRatio = decoded.length / original.length;
  if (lengthRatio > 0.5 && lengthRatio < 2) confidence += 5;
  
  return Math.min(confidence, 100);
}

function shouldStopDecoding(
  currentLayer: LayerAnalysis,
  previousEntropy: number,
  previousLanguageScore: number,
  allLayers: LayerAnalysis[]
): boolean {
  // Stop if confidence is too low
  if (currentLayer.confidence < MULTI_LAYER_CONFIG.minConfidenceThreshold) {
    return true;
  }
  
  // Stop if entropy isn't improving significantly
  const entropyImprovement = previousEntropy - currentLayer.entropy;
  if (entropyImprovement < MULTI_LAYER_CONFIG.entropyImprovementThreshold) {
    return true;
  }
  
  // Stop if language score indicates we've reached readable content
  if (currentLayer.languageScore > 80) {
    return true;
  }
  
  // Stop if we detect a cyclic pattern (same encoding used twice in a row)
  if (allLayers.length >= 2) {
    const lastTwo = allLayers.slice(-2);
    if (lastTwo[0].encoding === lastTwo[1].encoding) {
      return true;
    }
  }
  
  // Stop if content is getting too small (might be over-decoded)
  if (currentLayer.decodedContent.length < 10) {
    return true;
  }
  
  return false;
}

function calculateOverallConfidence(layers: LayerAnalysis[]): number {
  if (layers.length === 0) return 0;
  
  // Weight recent layers more heavily
  let totalWeightedConfidence = 0;
  let totalWeight = 0;
  
  layers.forEach((layer, index) => {
    const weight = Math.pow(1.2, index); // Exponential weighting favoring later layers
    totalWeightedConfidence += layer.confidence * weight;
    totalWeight += weight;
  });
  
  return Math.round(totalWeightedConfidence / totalWeight);
}

function analyzeContentType(content: string, layers: LayerAnalysis[]): { type: string; securityRisk: string } {
  // Analyze final content to determine likely type
  if (content.match(/^[\x20-\x7E\s]*$/)) {
    if (content.includes('<') && content.includes('>')) {
      return { type: 'HTML/XML', securityRisk: layers.some(l => l.encoding.includes('Script')) ? 'High' : 'Low' };
    }
    if (content.startsWith('{') || content.startsWith('[')) {
      return { type: 'JSON', securityRisk: 'Low' };
    }
    if (content.includes('function') || content.includes('var ') || content.includes('const ')) {
      return { type: 'JavaScript', securityRisk: 'High' };
    }
    return { type: 'Plain Text', securityRisk: 'Low' };
  }
  
  return { type: 'Binary/Encoded', securityRisk: 'Medium' };
}

function isLikelyOriginalContent(content: string, layers: LayerAnalysis[]): boolean {
  if (layers.length === 0) return true;
  
  const finalLayer = layers[layers.length - 1];
  return finalLayer.languageScore > 60 && finalLayer.entropy < 6;
}

function generateOptimizationSuggestions(layers: LayerAnalysis[], encodingChain: string[]): string[] {
  const suggestions: string[] = [];
  
  if (layers.length > 5) {
    suggestions.push('Consider reducing encoding chain complexity for better performance');
  }
  
  if (encodingChain.includes('Base64') && encodingChain.includes('URL Encoding')) {
    suggestions.push('Base64 and URL encoding combination detected - consider using only one');
  }
  
  if (layers.some(l => l.confidence < 80)) {
    suggestions.push('Some layers have low confidence - manual verification recommended');
  }
  
  const avgConfidence = layers.reduce((sum, l) => sum + l.confidence, 0) / layers.length;
  if (avgConfidence > 90) {
    suggestions.push('High confidence decoding chain - result likely accurate');
  }
  
  return suggestions;
}