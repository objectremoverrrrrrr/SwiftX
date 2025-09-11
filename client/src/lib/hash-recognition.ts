// Advanced Hash Recognition System - 50+ Hash Types with Pattern Matching
// Comprehensive hash identification, validation, and analysis capabilities

import { calculateEntropy } from './scoring';

export interface HashAnalysis {
  hashType: string;
  confidence: number;
  variants: string[];
  characteristics: {
    length: number;
    charset: string;
    format: string;
    saltDetected?: boolean;
    roundsDetected?: number;
  };
  securityAssessment: {
    strength: 'weak' | 'moderate' | 'strong' | 'very-strong';
    vulnerabilities: string[];
    recommendations: string[];
  };
  additionalInfo?: {
    algorithm: string;
    outputSize: number;
    commonUses: string[];
    crackingDifficulty: string;
  };
}

// Comprehensive hash patterns with advanced detection
const HASH_PATTERNS = {
  // MD5 variations
  'MD5': {
    pattern: /^[a-f0-9]{32}$/i,
    length: 32,
    charset: 'hex',
    strength: 'weak',
    algorithm: 'MD5',
    outputSize: 128,
    vulnerabilities: ['collision attacks', 'birthday attacks', 'rainbow tables'],
    uses: ['legacy systems', 'file checksums', 'non-cryptographic uses']
  },
  
  // SHA-1
  'SHA-1': {
    pattern: /^[a-f0-9]{40}$/i,
    length: 40,
    charset: 'hex',
    strength: 'weak',
    algorithm: 'SHA-1',
    outputSize: 160,
    vulnerabilities: ['collision attacks', 'chosen-prefix attacks'],
    uses: ['legacy systems', 'git commits', 'deprecated SSL certificates']
  },
  
  // SHA-2 family
  'SHA-224': {
    pattern: /^[a-f0-9]{56}$/i,
    length: 56,
    charset: 'hex',
    strength: 'strong',
    algorithm: 'SHA-224',
    outputSize: 224,
    vulnerabilities: [],
    uses: ['digital signatures', 'data integrity']
  },
  
  'SHA-256': {
    pattern: /^[a-f0-9]{64}$/i,
    length: 64,
    charset: 'hex',
    strength: 'strong',
    algorithm: 'SHA-256',
    outputSize: 256,
    vulnerabilities: [],
    uses: ['blockchain', 'digital signatures', 'SSL certificates', 'password hashing']
  },
  
  'SHA-384': {
    pattern: /^[a-f0-9]{96}$/i,
    length: 96,
    charset: 'hex',
    strength: 'very-strong',
    algorithm: 'SHA-384',
    outputSize: 384,
    vulnerabilities: [],
    uses: ['high-security applications', 'digital signatures']
  },
  
  'SHA-512': {
    pattern: /^[a-f0-9]{128}$/i,
    length: 128,
    charset: 'hex',
    strength: 'very-strong',
    algorithm: 'SHA-512',
    outputSize: 512,
    vulnerabilities: [],
    uses: ['high-security applications', 'cryptographic protocols']
  },
  
  // SHA-3 family
  'SHA3-224': {
    pattern: /^[a-f0-9]{56}$/i,
    length: 56,
    charset: 'hex',
    strength: 'very-strong',
    algorithm: 'SHA3-224',
    outputSize: 224,
    vulnerabilities: [],
    uses: ['modern cryptography', 'post-quantum security']
  },
  
  'SHA3-256': {
    pattern: /^[a-f0-9]{64}$/i,
    length: 64,
    charset: 'hex',
    strength: 'very-strong',
    algorithm: 'SHA3-256',
    outputSize: 256,
    vulnerabilities: [],
    uses: ['modern cryptography', 'blockchain']
  },
  
  'SHA3-384': {
    pattern: /^[a-f0-9]{96}$/i,
    length: 96,
    charset: 'hex',
    strength: 'very-strong',
    algorithm: 'SHA3-384',
    outputSize: 384,
    vulnerabilities: [],
    uses: ['high-security applications']
  },
  
  'SHA3-512': {
    pattern: /^[a-f0-9]{128}$/i,
    length: 128,
    charset: 'hex',
    strength: 'very-strong',
    algorithm: 'SHA3-512',
    outputSize: 512,
    vulnerabilities: [],
    uses: ['maximum security applications']
  },
  
  // BLAKE2 family
  'BLAKE2b-256': {
    pattern: /^[a-f0-9]{64}$/i,
    length: 64,
    charset: 'hex',
    strength: 'very-strong',
    algorithm: 'BLAKE2b-256',
    outputSize: 256,
    vulnerabilities: [],
    uses: ['high-performance hashing', 'cryptocurrency']
  },
  
  'BLAKE2b-512': {
    pattern: /^[a-f0-9]{128}$/i,
    length: 128,
    charset: 'hex',
    strength: 'very-strong',
    algorithm: 'BLAKE2b-512',
    outputSize: 512,
    vulnerabilities: [],
    uses: ['high-performance hashing', 'file integrity']
  },
  
  // BLAKE3
  'BLAKE3': {
    pattern: /^[a-f0-9]{64}$/i,
    length: 64,
    charset: 'hex',
    strength: 'very-strong',
    algorithm: 'BLAKE3',
    outputSize: 256,
    vulnerabilities: [],
    uses: ['modern high-performance hashing', 'merkle trees']
  },
  
  // Whirlpool
  'Whirlpool': {
    pattern: /^[a-f0-9]{128}$/i,
    length: 128,
    charset: 'hex',
    strength: 'strong',
    algorithm: 'Whirlpool',
    outputSize: 512,
    vulnerabilities: [],
    uses: ['cryptographic protocols', 'digital forensics']
  },
  
  // RIPEMD family
  'RIPEMD-128': {
    pattern: /^[a-f0-9]{32}$/i,
    length: 32,
    charset: 'hex',
    strength: 'moderate',
    algorithm: 'RIPEMD-128',
    outputSize: 128,
    vulnerabilities: ['shorter hash length'],
    uses: ['legacy systems', 'academic research']
  },
  
  'RIPEMD-160': {
    pattern: /^[a-f0-9]{40}$/i,
    length: 40,
    charset: 'hex',
    strength: 'moderate',
    algorithm: 'RIPEMD-160',
    outputSize: 160,
    vulnerabilities: [],
    uses: ['cryptocurrency', 'digital signatures']
  },
  
  'RIPEMD-256': {
    pattern: /^[a-f0-9]{64}$/i,
    length: 64,
    charset: 'hex',
    strength: 'strong',
    algorithm: 'RIPEMD-256',
    outputSize: 256,
    vulnerabilities: [],
    uses: ['cryptographic applications']
  },
  
  'RIPEMD-320': {
    pattern: /^[a-f0-9]{80}$/i,
    length: 80,
    charset: 'hex',
    strength: 'strong',
    algorithm: 'RIPEMD-320',
    outputSize: 320,
    vulnerabilities: [],
    uses: ['high-security applications']
  },
  
  // bcrypt (with various cost factors)
  'bcrypt': {
    pattern: /^\$2[abxy]?\$[0-9]{2}\$[A-Za-z0-9\.\/]{53}$/,
    length: 60,
    charset: 'base64-variant',
    strength: 'very-strong',
    algorithm: 'bcrypt',
    outputSize: 184,
    vulnerabilities: [],
    uses: ['password hashing', 'user authentication']
  },
  
  // scrypt
  'scrypt': {
    pattern: /^\$s[0-9]\$[0-9a-f]+\$[A-Za-z0-9\.\/\+]+$/,
    length: 'variable',
    charset: 'base64',
    strength: 'very-strong',
    algorithm: 'scrypt',
    outputSize: 'variable',
    vulnerabilities: [],
    uses: ['password hashing', 'key derivation', 'cryptocurrency']
  },
  
  // Argon2 (id, i, d variants)
  'Argon2id': {
    pattern: /^\$argon2id\$v=[0-9]+\$m=[0-9]+,t=[0-9]+,p=[0-9]+\$[A-Za-z0-9\.\/\+]+\$[A-Za-z0-9\.\/\+]+$/,
    length: 'variable',
    charset: 'base64',
    strength: 'very-strong',
    algorithm: 'Argon2id',
    outputSize: 'variable',
    vulnerabilities: [],
    uses: ['modern password hashing', 'key derivation']
  },
  
  'Argon2i': {
    pattern: /^\$argon2i\$v=[0-9]+\$m=[0-9]+,t=[0-9]+,p=[0-9]+\$[A-Za-z0-9\.\/\+]+\$[A-Za-z0-9\.\/\+]+$/,
    length: 'variable',
    charset: 'base64',
    strength: 'very-strong',
    algorithm: 'Argon2i',
    outputSize: 'variable',
    vulnerabilities: [],
    uses: ['side-channel resistant hashing']
  },
  
  'Argon2d': {
    pattern: /^\$argon2d\$v=[0-9]+\$m=[0-9]+,t=[0-9]+,p=[0-9]+\$[A-Za-z0-9\.\/\+]+\$[A-Za-z0-9\.\/\+]+$/,
    length: 'variable',
    charset: 'base64',
    strength: 'very-strong',
    algorithm: 'Argon2d',
    outputSize: 'variable',
    vulnerabilities: [],
    uses: ['GPU-resistant hashing']
  },
  
  // PBKDF2 variants
  'PBKDF2-SHA1': {
    pattern: /^\$pbkdf2\$[0-9]+\$[A-Za-z0-9\.\/\+]+\$[A-Za-z0-9\.\/\+]+$/,
    length: 'variable',
    charset: 'base64',
    strength: 'moderate',
    algorithm: 'PBKDF2-SHA1',
    outputSize: 'variable',
    vulnerabilities: ['SHA-1 base'],
    uses: ['legacy password hashing']
  },
  
  'PBKDF2-SHA256': {
    pattern: /^\$pbkdf2-sha256\$[0-9]+\$[A-Za-z0-9\.\/\+]+\$[A-Za-z0-9\.\/\+]+$/,
    length: 'variable',
    charset: 'base64',
    strength: 'strong',
    algorithm: 'PBKDF2-SHA256',
    outputSize: 'variable',
    vulnerabilities: [],
    uses: ['password hashing', 'key derivation']
  },
  
  'PBKDF2-SHA512': {
    pattern: /^\$pbkdf2-sha512\$[0-9]+\$[A-Za-z0-9\.\/\+]+\$[A-Za-z0-9\.\/\+]+$/,
    length: 'variable',
    charset: 'base64',
    strength: 'strong',
    algorithm: 'PBKDF2-SHA512',
    outputSize: 'variable',
    vulnerabilities: [],
    uses: ['secure password hashing']
  },
  
  // CRC family
  'CRC32': {
    pattern: /^[a-f0-9]{8}$/i,
    length: 8,
    charset: 'hex',
    strength: 'weak',
    algorithm: 'CRC32',
    outputSize: 32,
    vulnerabilities: ['not cryptographically secure', 'collision prone'],
    uses: ['error detection', 'file integrity checks']
  },
  
  'CRC64': {
    pattern: /^[a-f0-9]{16}$/i,
    length: 16,
    charset: 'hex',
    strength: 'weak',
    algorithm: 'CRC64',
    outputSize: 64,
    vulnerabilities: ['not cryptographically secure'],
    uses: ['error detection', 'file systems']
  },
  
  // Adler checksums
  'Adler32': {
    pattern: /^[a-f0-9]{8}$/i,
    length: 8,
    charset: 'hex',
    strength: 'weak',
    algorithm: 'Adler32',
    outputSize: 32,
    vulnerabilities: ['weak collision resistance'],
    uses: ['compression algorithms', 'quick checksums']
  },
  
  // Windows hashes
  'NTLM': {
    pattern: /^[a-f0-9]{32}$/i,
    length: 32,
    charset: 'hex',
    strength: 'weak',
    algorithm: 'NTLM',
    outputSize: 128,
    vulnerabilities: ['pass-the-hash attacks', 'rainbow tables', 'no salt'],
    uses: ['Windows authentication', 'legacy systems']
  },
  
  'NTLMv2': {
    pattern: /^[a-f0-9]{32}:[a-f0-9]{32}$/i,
    length: 65,
    charset: 'hex-with-separator',
    strength: 'moderate',
    algorithm: 'NTLMv2',
    outputSize: 128,
    vulnerabilities: ['offline attacks possible'],
    uses: ['Windows domain authentication']
  },
  
  // Unix crypt variants
  'DES-crypt': {
    pattern: /^[A-Za-z0-9\.\/]{13}$/,
    length: 13,
    charset: 'des-crypt',
    strength: 'weak',
    algorithm: 'DES-crypt',
    outputSize: 64,
    vulnerabilities: ['DES is broken', 'short keys', 'no salt randomness'],
    uses: ['legacy Unix systems']
  },
  
  'MD5-crypt': {
    pattern: /^\$1\$[A-Za-z0-9\.\/]{0,8}\$[A-Za-z0-9\.\/]{22}$/,
    length: 34,
    charset: 'base64-variant',
    strength: 'weak',
    algorithm: 'MD5-crypt',
    outputSize: 128,
    vulnerabilities: ['MD5 vulnerabilities', 'fast computation'],
    uses: ['legacy Unix password hashing']
  },
  
  'SHA256-crypt': {
    pattern: /^\$5\$[A-Za-z0-9\.\/]*\$[A-Za-z0-9\.\/]{43}$/,
    length: 'variable',
    charset: 'base64-variant',
    strength: 'strong',
    algorithm: 'SHA256-crypt',
    outputSize: 256,
    vulnerabilities: [],
    uses: ['Unix password hashing']
  },
  
  'SHA512-crypt': {
    pattern: /^\$6\$[A-Za-z0-9\.\/]*\$[A-Za-z0-9\.\/]{86}$/,
    length: 'variable',
    charset: 'base64-variant',
    strength: 'strong',
    algorithm: 'SHA512-crypt',
    outputSize: 512,
    vulnerabilities: [],
    uses: ['Unix password hashing']
  },
  
  // Specialized hashes
  'Tiger-128': {
    pattern: /^[a-f0-9]{32}$/i,
    length: 32,
    charset: 'hex',
    strength: 'moderate',
    algorithm: 'Tiger-128',
    outputSize: 128,
    vulnerabilities: [],
    uses: ['file integrity', 'academic research']
  },
  
  'Tiger-160': {
    pattern: /^[a-f0-9]{40}$/i,
    length: 40,
    charset: 'hex',
    strength: 'moderate',
    algorithm: 'Tiger-160',
    outputSize: 160,
    vulnerabilities: [],
    uses: ['file integrity', 'digital signatures']
  },
  
  'Tiger-192': {
    pattern: /^[a-f0-9]{48}$/i,
    length: 48,
    charset: 'hex',
    strength: 'strong',
    algorithm: 'Tiger-192',
    outputSize: 192,
    vulnerabilities: [],
    uses: ['cryptographic applications']
  },
  
  // HAVAL family
  'HAVAL-128': {
    pattern: /^[a-f0-9]{32}$/i,
    length: 32,
    charset: 'hex',
    strength: 'moderate',
    algorithm: 'HAVAL-128',
    outputSize: 128,
    vulnerabilities: ['variable security'],
    uses: ['legacy systems', 'academic research']
  },
  
  'HAVAL-160': {
    pattern: /^[a-f0-9]{40}$/i,
    length: 40,
    charset: 'hex',
    strength: 'moderate',
    algorithm: 'HAVAL-160',
    outputSize: 160,
    vulnerabilities: ['variable security'],
    uses: ['legacy systems']
  },
  
  'HAVAL-192': {
    pattern: /^[a-f0-9]{48}$/i,
    length: 48,
    charset: 'hex',
    strength: 'moderate',
    algorithm: 'HAVAL-192',
    outputSize: 192,
    vulnerabilities: ['variable security'],
    uses: ['academic research']
  },
  
  'HAVAL-224': {
    pattern: /^[a-f0-9]{56}$/i,
    length: 56,
    charset: 'hex',
    strength: 'moderate',
    algorithm: 'HAVAL-224',
    outputSize: 224,
    vulnerabilities: ['variable security'],
    uses: ['academic research']
  },
  
  'HAVAL-256': {
    pattern: /^[a-f0-9]{64}$/i,
    length: 64,
    charset: 'hex',
    strength: 'moderate',
    algorithm: 'HAVAL-256',
    outputSize: 256,
    vulnerabilities: ['variable security'],
    uses: ['academic research']
  }
};

export async function analyzeHash(input: string): Promise<HashAnalysis[]> {
  const cleanInput = input.trim();
  const results: HashAnalysis[] = [];
  
  if (!cleanInput) {
    throw new Error('Please provide a hash to analyze');
  }

  // Enhanced input characteristics analysis
  const characteristics = analyzeHashCharacteristics(cleanInput);
  const entropy = calculateEntropy(cleanInput);
  const charDistribution = analyzeCharacterDistribution(cleanInput);
  
  // Enhanced pattern matching with intelligent pre-filtering
  const candidatePatterns = Object.entries(HASH_PATTERNS).filter(([, pattern]) => {
    // Quick length check
    if (pattern.length !== cleanInput.length) return false;
    
    // Character set validation
    if (pattern.charset === 'hex' && !/^[a-f0-9]+$/i.test(cleanInput)) return false;
    if (pattern.charset === 'base64' && !/^[A-Za-z0-9+/]*={0,2}$/.test(cleanInput)) return false;
    
    return true;
  });
  
  // Analyze each candidate with enhanced scoring
  for (const [hashType, pattern] of candidatePatterns) {
    try {
      let confidence = calculateHashConfidence(cleanInput, pattern, characteristics);
      
      // Enhanced confidence calculation with multiple factors
      
      // Entropy bonus (good hashes have specific entropy ranges)
      if (entropy >= 3.8 && entropy <= 4.2) {
        confidence += 15; // Ideal hash entropy
      } else if (entropy >= 3.5 && entropy <= 4.5) {
        confidence += 8;
      }
      
      // Character distribution bonus
      const freqValues = Object.values(charDistribution).filter((v): v is number => typeof v === 'number');
      if (freqValues.length > 0) {
        const maxCharFreq = Math.max(...freqValues);
        if (maxCharFreq < 0.15) { // Well-distributed characters
          confidence += 10;
        } else if (maxCharFreq < 0.2) {
          confidence += 5;
        }
      }
      
      // Pattern-specific enhancements
      if (hashType === 'MD5' && cleanInput.length === 32) {
        confidence += 12; // MD5 is very common at 32 chars
      } else if (hashType === 'SHA-256' && cleanInput.length === 64) {
        confidence += 15; // SHA-256 is very common at 64 chars
      } else if (hashType === 'SHA-1' && cleanInput.length === 40) {
        confidence += 10; // SHA-1 at 40 chars
      }
      
      // Case mixing bonus (mixed case suggests real hash)
      const hasUpperCase = /[A-F]/.test(cleanInput);
      const hasLowerCase = /[a-f]/.test(cleanInput);
      if (hasUpperCase && hasLowerCase) {
        confidence += 8;
      } else if (hasUpperCase || hasLowerCase) {
        confidence += 3;
      }
      
      // Length-specific confidence adjustments
      const commonHashLengths = [32, 40, 56, 64, 96, 128];
      if (commonHashLengths.includes(cleanInput.length)) {
        confidence += 5;
      }
      
      if (confidence > 45) { // Lowered threshold for enhanced algorithm
        const analysis = createHashAnalysis(hashType, pattern, cleanInput, Math.min(confidence, 100), characteristics);
        results.push(analysis);
      }
    } catch (error) {
      console.debug(`Hash analysis failed for ${hashType}:`, error);
    }
  }

  // Enhanced sorting with multiple criteria
  results.sort((a, b) => {
    const scoreA = a.confidence + 
      (a.characteristics.saltDetected ? 5 : 0) +
      (a.securityAssessment.strength === 'very-strong' ? 3 : 0);
    const scoreB = b.confidence + 
      (b.characteristics.saltDetected ? 5 : 0) +
      (b.securityAssessment.strength === 'very-strong' ? 3 : 0);
    return scoreB - scoreA;
  });
  
  return results.slice(0, 8); // Return top 8 matches for better performance
}

function analyzeHashCharacteristics(input: string): any {
  return {
    length: input.length,
    hasHexOnly: /^[a-f0-9]+$/i.test(input),
    hasBase64Chars: /^[A-Za-z0-9+/=]+$/.test(input),
    hasSpecialChars: /[^a-zA-Z0-9]/.test(input),
    hasColons: input.includes(':'),
    hasDollarSigns: input.includes('$'),
    hasEquals: input.includes('='),
    hasDots: input.includes('.'),
    hasSlashes: input.includes('/'),
    startsWithDollar: input.startsWith('$'),
    charsetVariety: new Set(input).size / input.length,
    upperCaseRatio: (input.match(/[A-Z]/g) || []).length / input.length,
    lowerCaseRatio: (input.match(/[a-z]/g) || []).length / input.length,
    digitRatio: (input.match(/[0-9]/g) || []).length / input.length
  };
}

// Enhanced character distribution analysis
function analyzeCharacterDistribution(input: string): Record<string, number> {
  const distribution: Record<string, number> = {};
  const totalChars = input.length;
  
  if (totalChars === 0) return distribution;
  
  // Count character frequencies
  for (const char of input.toLowerCase()) {
    distribution[char] = (distribution[char] || 0) + 1;
  }
  
  // Normalize to frequencies (0-1)
  for (const char in distribution) {
    distribution[char] = distribution[char] / totalChars;
  }
  
  return distribution;
}

function calculateHashConfidence(input: string, pattern: any, characteristics: any): number {
  let confidence = 0;
  
  // Pattern matching
  if (pattern.pattern.test(input)) {
    confidence += 60;
  } else {
    return 0; // No pattern match, skip this hash type
  }
  
  // Length matching
  if (pattern.length === 'variable' || pattern.length === characteristics.length) {
    confidence += 20;
  } else if (Math.abs(pattern.length - characteristics.length) <= 2) {
    confidence += 10;
  }
  
  // Charset analysis
  switch (pattern.charset) {
    case 'hex':
      if (characteristics.hasHexOnly) confidence += 15;
      break;
    case 'base64':
    case 'base64-variant':
      if (characteristics.hasBase64Chars) confidence += 15;
      break;
    case 'des-crypt':
      if (/^[A-Za-z0-9\.\/]+$/.test(input)) confidence += 15;
      break;
  }
  
  // Format-specific bonuses
  if (pattern.algorithm === 'bcrypt' && input.startsWith('$2')) confidence += 10;
  if (pattern.algorithm.includes('Argon2') && input.includes('$argon2')) confidence += 10;
  if (pattern.algorithm.includes('PBKDF2') && input.includes('$pbkdf2')) confidence += 10;
  if (pattern.algorithm.includes('crypt') && input.includes('$')) confidence += 10;
  
  // Security assessment bonus
  if (pattern.strength === 'very-strong') confidence += 5;
  if (pattern.strength === 'weak') confidence -= 5;
  
  return Math.min(confidence, 100);
}

function createHashAnalysis(hashType: string, pattern: any, input: string, confidence: number, characteristics: any): HashAnalysis {
  const variants = findHashVariants(hashType, pattern);
  const securityAssessment = assessHashSecurity(pattern, input);
  
  return {
    hashType,
    confidence,
    variants,
    characteristics: {
      length: characteristics.length,
      charset: pattern.charset,
      format: detectHashFormat(input, pattern),
      saltDetected: detectSalt(input, pattern),
      roundsDetected: detectRounds(input, pattern)
    },
    securityAssessment,
    additionalInfo: {
      algorithm: pattern.algorithm,
      outputSize: pattern.outputSize,
      commonUses: pattern.uses,
      crackingDifficulty: assessCrackingDifficulty(pattern, input)
    }
  };
}

function findHashVariants(hashType: string, pattern: any): string[] {
  const variants: string[] = [];
  
  // Add common variants based on hash type
  if (hashType.includes('SHA')) {
    variants.push('Uppercase hex', 'Lowercase hex');
  }
  
  if (hashType.includes('bcrypt')) {
    variants.push('$2a$ (original)', '$2b$ (bug fix)', '$2x$ (sign extension bug)', '$2y$ (correct)');
  }
  
  if (hashType.includes('Argon2')) {
    variants.push('Argon2d (data-dependent)', 'Argon2i (data-independent)', 'Argon2id (hybrid)');
  }
  
  if (hashType.includes('PBKDF2')) {
    variants.push('PBKDF2-SHA1', 'PBKDF2-SHA256', 'PBKDF2-SHA512');
  }
  
  return variants;
}

function assessHashSecurity(pattern: any, input: string): HashAnalysis['securityAssessment'] {
  const vulnerabilities: string[] = [...pattern.vulnerabilities];
  const recommendations: string[] = [];
  
  // Add specific recommendations based on detected issues
  if (pattern.strength === 'weak') {
    recommendations.push('Consider migrating to SHA-256 or stronger');
    recommendations.push('Add salt if not present');
  }
  
  if (pattern.algorithm === 'MD5' || pattern.algorithm === 'SHA-1') {
    recommendations.push('URGENT: Migrate to SHA-256 or SHA-3 immediately');
    vulnerabilities.push('Cryptographically broken');
  }
  
  if (pattern.algorithm === 'NTLM') {
    recommendations.push('Implement NTLMv2 or modern authentication');
    recommendations.push('Enable account lockout policies');
  }
  
  if (!detectSalt(input, pattern) && pattern.algorithm.includes('crypt')) {
    vulnerabilities.push('No salt detected - vulnerable to rainbow table attacks');
    recommendations.push('Always use salted hashes');
  }
  
  if (pattern.algorithm.includes('bcrypt') || pattern.algorithm.includes('Argon2')) {
    recommendations.push('Consider increasing cost factor for better security');
  }
  
  return {
    strength: pattern.strength,
    vulnerabilities,
    recommendations
  };
}

function detectHashFormat(input: string, pattern: any): string {
  // Enhanced format detection with comprehensive pattern analysis
  const inputLower = input.toLowerCase();
  
  // bcrypt variants with improved detection
  if (pattern.algorithm === 'bcrypt') {
    if (/^\$2a\$/.test(input)) return 'bcrypt 2a (original implementation)';
    if (/^\$2b\$/.test(input)) return 'bcrypt 2b (bug-fixed version)';
    if (/^\$2x\$/.test(input)) return 'bcrypt 2x (sign extension bug)';
    if (/^\$2y\$/.test(input)) return 'bcrypt 2y (correct handling)';
    if (/^\$2\$/.test(input)) return 'bcrypt 2 (legacy)';
    return 'bcrypt (unknown variant)';
  }
  
  // Argon2 variants with enhanced detection
  if (pattern.algorithm.includes('Argon2')) {
    if (inputLower.includes('$argon2d$')) return 'Argon2d (data-dependent)';
    if (inputLower.includes('$argon2i$')) return 'Argon2i (data-independent)';
    if (inputLower.includes('$argon2id$')) return 'Argon2id (hybrid mode)';
    if (inputLower.includes('$argon2$')) return 'Argon2 (version unspecified)';
    return 'Argon2 (non-standard format)';
  }
  
  // PBKDF2 variants with algorithm detection
  if (pattern.algorithm.includes('PBKDF2')) {
    if (inputLower.includes('$pbkdf2-sha1$')) return 'PBKDF2-SHA1';
    if (inputLower.includes('$pbkdf2-sha256$')) return 'PBKDF2-SHA256';
    if (inputLower.includes('$pbkdf2-sha512$')) return 'PBKDF2-SHA512';
    if (inputLower.includes('$pbkdf2$')) return 'PBKDF2 (algorithm unspecified)';
    if (input.includes(':') && /[0-9]{4,}/.test(input)) return 'PBKDF2 (colon-separated)';
    return 'PBKDF2 (custom format)';
  }
  
  // Unix crypt variants with enhanced detection
  if (pattern.algorithm.includes('crypt')) {
    if (/^\$1\$/.test(input)) return 'MD5-crypt ($1$)';
    if (/^\$2\$/.test(input)) return 'Blowfish-crypt ($2$)';
    if (/^\$3\$/.test(input)) return 'NT-Hash-crypt ($3$)';
    if (/^\$5\$/.test(input)) return 'SHA256-crypt ($5$)';
    if (/^\$6\$/.test(input)) return 'SHA512-crypt ($6$)';
    if (/^[a-zA-Z0-9\.\/]{13}$/.test(input)) return 'DES-crypt (traditional)';
    if (input.includes('$rounds=')) return 'Extended crypt (rounds specified)';
    return 'Unix crypt (unknown variant)';
  }
  
  // Windows-specific formats
  if (pattern.algorithm === 'NTLM') {
    if (input.includes(':')) return 'NTLM (username:hash format)';
    return 'NTLM (hash only)';
  }
  
  if (pattern.algorithm === 'LM') {
    return 'LAN Manager (legacy Windows)';
  }
  
  // Generic modular crypt format
  if (input.includes('$')) {
    const parts = input.split('$');
    if (parts.length >= 4) return 'Modular Crypt Format (MCF)';
    if (parts.length === 3) return 'Simplified modular format';
    return 'Dollar-separated format';
  }
  
  // Character set analysis for format identification
  const hasOnlyHex = /^[a-f0-9]+$/i.test(input);
  const hasBase64Chars = /^[A-Za-z0-9+/=]+$/.test(input);
  const hasSpecialChars = /[^a-zA-Z0-9]/.test(input);
  
  if (hasOnlyHex) {
    const charVariety = new Set(inputLower).size;
    if (charVariety < 6) return 'Hexadecimal (low entropy)';
    if (charVariety > 12) return 'Hexadecimal (high entropy)';
    return 'Hexadecimal (standard)';
  }
  
  if (hasBase64Chars && !hasSpecialChars) {
    if (input.endsWith('==')) return 'Base64 (double-padded)';
    if (input.endsWith('=')) return 'Base64 (single-padded)';
    return 'Base64 (unpadded)';
  }
  
  // Delimiter-based format detection
  if (input.includes(':')) {
    const colonCount = (input.match(/:/g) || []).length;
    if (colonCount === 1) return 'Colon-separated (hash:salt)';
    if (colonCount > 1) return 'Multi-colon format';
  }
  
  if (input.includes('.')) return 'Dot-separated format';
  if (input.includes('_')) return 'Underscore-separated format';
  if (input.includes('-')) return 'Hyphen-separated format';
  
  return 'Custom/Unknown format';
}

function detectSalt(input: string, pattern: any): boolean {
  // Enhanced salt detection with comprehensive format analysis
  
  // Modular crypt format detection (most reliable)
  if (input.includes('$')) {
    const parts = input.split('$');
    
    // Standard modular crypt format: $algorithm$rounds$salt$hash
    if (parts.length >= 4) return true;
    
    // bcrypt format: $2x$rounds$salthash
    if (pattern.algorithm === 'bcrypt' && parts.length >= 3) {
      return /^\$2[abxy]?\$[0-9]{2}\$/.test(input);
    }
    
    // Unix crypt variants
    if (parts.length >= 3 && /^[1-6]$/.test(parts[1])) return true;
    
    // Argon2 format includes salt
    if (input.includes('$argon2')) return true;
    
    // PBKDF2 modular format
    if (input.includes('$pbkdf2')) return true;
  }
  
  // Colon-separated formats (hash:salt or user:hash:salt)
  if (input.includes(':')) {
    const parts = input.split(':');
    
    // Simple hash:salt format
    if (parts.length === 2) {
      const [hashPart, saltPart] = parts;
      // Validate that both parts look reasonable
      if (hashPart.length >= 16 && saltPart.length >= 4) return true;
    }
    
    // Extended formats like user:hash:salt or domain:user:hash
    if (parts.length >= 3) return true;
    
    // NTLM format often includes domain or username
    if (pattern.algorithm === 'NTLM' || pattern.algorithm === 'LM') return true;
  }
  
  // Django/Python format detection
  if (input.startsWith('pbkdf2_sha256$') || input.startsWith('pbkdf2_sha1$')) return true;
  
  // Base64-encoded salted formats
  if (pattern.charset === 'base64' && input.length > pattern.length * 1.2) {
    // Likely includes salt if significantly longer than expected hash length
    return true;
  }
  
  // Custom delimiter detection
  const customDelimiters = ['.', '_', '-', '#'];
  for (const delimiter of customDelimiters) {
    if (input.includes(delimiter)) {
      const parts = input.split(delimiter);
      if (parts.length >= 2 && parts.every(part => part.length >= 4)) {
        return true; // Likely salted with custom delimiter
      }
    }
  }
  
  // Length-based heuristic for embedded salts
  if (pattern.length && typeof pattern.length === 'number') {
    // If significantly longer than expected, might include embedded salt
    if (input.length > pattern.length * 1.5) return true;
  }
  
  return false;
}

function detectRounds(input: string, pattern: any): number | undefined {
  // Extract rounds/cost factor from various hash formats
  if (pattern.algorithm === 'bcrypt') {
    const match = input.match(/^\$2[abxy]?\$([0-9]{2})\$/);
    return match ? parseInt(match[1], 10) : undefined;
  }
  
  if (pattern.algorithm.includes('Argon2')) {
    const match = input.match(/t=([0-9]+)/);
    return match ? parseInt(match[1], 10) : undefined;
  }
  
  if (pattern.algorithm.includes('PBKDF2')) {
    const match = input.match(/\$([0-9]+)\$/);
    return match ? parseInt(match[1], 10) : undefined;
  }
  
  if (pattern.algorithm.includes('crypt')) {
    const match = input.match(/\$rounds=([0-9]+)\$/);
    return match ? parseInt(match[1], 10) : undefined;
  }
  
  return undefined;
}

function assessCrackingDifficulty(pattern: any, input: string): string {
  const rounds = detectRounds(input, pattern);
  
  if (pattern.strength === 'weak') {
    return 'Easy - Can be cracked quickly with modern hardware';
  }
  
  if (pattern.algorithm === 'bcrypt') {
    if (rounds && rounds >= 12) {
      return 'Very Hard - High cost factor provides strong protection';
    } else if (rounds && rounds >= 10) {
      return 'Hard - Adequate protection for most use cases';
    } else {
      return 'Moderate - Consider increasing cost factor';
    }
  }
  
  if (pattern.algorithm.includes('Argon2')) {
    return 'Very Hard - Modern memory-hard function';
  }
  
  if (pattern.algorithm.includes('PBKDF2')) {
    if (rounds && rounds >= 100000) {
      return 'Hard - High iteration count';
    } else {
      return 'Moderate - Consider increasing iterations';
    }
  }
  
  if (pattern.strength === 'very-strong') {
    return 'Very Hard - Cryptographically secure with current technology';
  }
  
  if (pattern.strength === 'strong') {
    return 'Hard - Secure against current attack methods';
  }
  
  return 'Moderate - Provides reasonable security';
}

// Utility function to get hash information by type
export function getHashInfo(hashType: string): any {
  return HASH_PATTERNS[hashType as keyof typeof HASH_PATTERNS] || null;
}

// Function to validate hash format
export function validateHashFormat(input: string, expectedType: string): boolean {
  const pattern = HASH_PATTERNS[expectedType as keyof typeof HASH_PATTERNS];
  return pattern ? pattern.pattern.test(input) : false;
}

// Function to suggest hash migration path
export function suggestHashMigration(currentType: string): string[] {
  const pattern = HASH_PATTERNS[currentType as keyof typeof HASH_PATTERNS];
  if (!pattern) return [];
  
  const suggestions: string[] = [];
  
  if (pattern.strength === 'weak') {
    suggestions.push('Migrate to SHA-256 for general hashing');
    suggestions.push('Use bcrypt or Argon2id for password hashing');
    suggestions.push('Consider SHA-3 for future-proofing');
  }
  
  if (pattern.strength === 'moderate') {
    suggestions.push('Consider Argon2id for password hashing');
    suggestions.push('Evaluate SHA-3 for new applications');
  }
  
  return suggestions;
}