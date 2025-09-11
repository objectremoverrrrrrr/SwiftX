import { DetectionPattern } from '@/types/analysis';
import { extendedDetectionPatterns } from './extended-detectors';
import { calculateEntropy, calculateLanguageScore, isValidUtf8 } from './scoring';

// Helper function for English scoring (used by Caesar cipher)
const calculateEnglishScore = calculateLanguageScore;

// Helper function for letter frequency analysis
function calculateLetterFrequency(text: string): Record<string, number> {
  const freq: Record<string, number> = {};
  const letters = text.toLowerCase().replace(/[^a-z]/g, '');
  const totalLetters = letters.length;
  
  if (totalLetters === 0) return freq;
  
  for (const letter of letters) {
    freq[letter] = (freq[letter] || 0) + 1;
  }
  
  // Normalize to frequencies (0-1)
  for (const letter in freq) {
    freq[letter] = freq[letter] / totalLetters;
  }
  
  return freq;
}

// JWT Token detection and decoding (NEW FORMAT)
export const jwtPattern: DetectionPattern = {
  name: 'JWT Token',
  regex: /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/,
  validator: (text: string) => {
    const parts = text.split('.');
    if (parts.length !== 3) return false;
    
    // Validate each part as Base64URL
    return parts.every(part => {
      if (!part) return false;
      // Base64URL uses - and _ instead of + and /
      return /^[A-Za-z0-9_-]*$/.test(part) && part.length % 4 !== 1;
    });
  },
  decoder: (text: string) => {
    try {
      const parts = text.split('.');
      
      // Proper Base64URL decoding with padding
      const decodeBase64Url = (str: string) => {
        // Replace URL-safe characters
        str = str.replace(/-/g, '+').replace(/_/g, '/');
        // Add proper padding
        while (str.length % 4) {
          str += '=';
        }
        return atob(str);
      };
      
      const header = JSON.parse(decodeBase64Url(parts[0]));
      const payload = JSON.parse(decodeBase64Url(parts[1]));
      
      return JSON.stringify({
        header,
        payload,
        signature: parts[2] || 'No signature'
      }, null, 2);
    } catch (error) {
      return null;
    }
  }
};

// Unicode Escape Sequences (NEW FORMAT)
export const unicodeEscapePattern: DetectionPattern = {
  name: 'Unicode Escape',
  regex: new RegExp('\\\\u[0-9a-fA-F]{4}|\\\\U[0-9a-fA-F]{8}|\\\\x[0-9a-fA-F]{2}'),
  validator: (text: string) => {
    const escapeCount = (text.match(/\\[uUx][0-9a-fA-F]+/g) || []).length;
    return escapeCount >= 1 && escapeCount / text.length > 0.05;
  },
  decoder: (text: string) => {
    try {
      return text
        .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
        .replace(/\\U([0-9a-fA-F]{8})/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
        .replace(/\\x([0-9a-fA-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    } catch (error) {
      return null;
    }
  }
};

// Punycode Domain Detection (NEW FORMAT)
export const punycodePattern: DetectionPattern = {
  name: 'Punycode Domain',
  regex: /xn--[a-z0-9-]+/i,
  validator: (text: string) => {
    return /^(https?:\/\/)?(www\.)?[a-z0-9-]*xn--[a-z0-9-]+\.[a-z]{2,}(\/.*)?$/i.test(text) ||
           /^xn--[a-z0-9-]+$/.test(text);
  },
  decoder: (text: string) => {
    try {
      // Extract punycode part
      const punycodeMatch = text.match(/xn--[a-z0-9-]+/i);
      if (!punycodeMatch) return null;
      
      const punycode = punycodeMatch[0];
      
      // Simplified punycode decoding (basic implementation)
      // Full punycode requires complex algorithm, this provides basic detection
      try {
        // Try to use built-in URL decoding as fallback for common cases
        const testUrl = `http://${punycode}.com`;
        const decoded = new URL(testUrl).hostname;
        if (decoded !== punycode + '.com') {
          return `Punycode decoded: ${decoded.replace('.com', '')} (original: ${punycode})`;
        }
      } catch {
        // Fallback to detection message
      }
      
      return `Punycode domain detected: ${punycode} (international domain encoding)`;
    } catch (error) {
      return null;
    }
  }
};

// MIME Encoded Strings (NEW FORMAT)
export const mimeEncodedPattern: DetectionPattern = {
  name: 'MIME Encoded',
  regex: /=\?[^?]+\?[BbQq]\?[^?]+\?=/,
  validator: (text: string) => {
    return /=\?[a-z0-9-]+\?[BbQq]\?[A-Za-z0-9+/=_-]+\?=/i.test(text);
  },
  decoder: (text: string) => {
    try {
      const matches = text.match(/=\?([^?]+)\?([BbQq])\?([^?]+)\?=/g);
      if (!matches) return null;
      
      let result = text;
      matches.forEach(match => {
        const parts = match.match(/=\?([^?]+)\?([BbQq])\?([^?]+)\?=/);
        if (parts) {
          const charset = parts[1].toLowerCase();
          const encoding = parts[2].toUpperCase();
          const encoded = parts[3];
          
          let decoded = '';
          try {
            if (encoding === 'B') {
              const bytes = atob(encoded);
              // Handle charset-aware decoding
              if (charset === 'utf-8' || charset === 'utf8') {
                // Convert Latin-1 bytes to UTF-8
                const uint8Array = new Uint8Array(bytes.length);
                for (let i = 0; i < bytes.length; i++) {
                  uint8Array[i] = bytes.charCodeAt(i);
                }
                decoded = new TextDecoder('utf-8').decode(uint8Array);
              } else {
                decoded = bytes; // Fallback to Latin-1
              }
            } else if (encoding === 'Q') {
              decoded = encoded.replace(/_/g, ' ').replace(/=([0-9A-F]{2})/g, (_, hex) => 
                String.fromCharCode(parseInt(hex, 16))
              );
            }
            result = result.replace(match, decoded);
          } catch {
            // If decoding fails, keep original
            result = result.replace(match, `[MIME: ${charset}/${encoding} - decode error]`);
          }
        }
      });
      return result !== text ? result : null;
    } catch (error) {
      return null;
    }
  }
};

// Enhanced Base64 detection and decoding
export const base64Pattern: DetectionPattern = {
  name: 'Base64',
  regex: /^[A-Za-z0-9+/]*={0,2}$/,
  validator: (text: string) => {
    // Enhanced Base64 validation with comprehensive checks
    const cleanText = text.trim();
    
    // Length requirements - must be multiple of 4 after padding
    if (cleanText.length < 8 || cleanText.length % 4 !== 0) return false;
    
    // Padding validation - stricter rules
    const paddingCount = (cleanText.match(/=/g) || []).length;
    if (paddingCount > 2) return false;
    
    // Padding can only occur at the end
    const paddingIndex = cleanText.indexOf('=');
    if (paddingIndex !== -1 && paddingIndex !== cleanText.length - paddingCount) {
      return false;
    }
    
    // Check for valid Base64 alphabet
    const withoutPadding = cleanText.replace(/=+$/, '');
    if (!/^[A-Za-z0-9+/]*$/.test(withoutPadding)) return false;
    
    // Character distribution analysis for better detection
    const chars = withoutPadding;
    const charCounts = {
      uppercase: (chars.match(/[A-Z]/g) || []).length,
      lowercase: (chars.match(/[a-z]/g) || []).length,
      numbers: (chars.match(/[0-9]/g) || []).length,
      specials: (chars.match(/[+/]/g) || []).length
    };
    
    const totalChars = chars.length;
    const uniqueChars = new Set(chars).size;
    
    // Statistical checks for Base64 characteristics
    if (chars.length > 16) {
      // Base64 should have reasonable character diversity
      const diversity = uniqueChars / totalChars;
      if (diversity < 0.25) return false; // Too repetitive
      
      // Check character distribution balance
      const distributions = Object.values(charCounts).map(count => count / totalChars);
      const maxDistribution = Math.max(...distributions);
      if (maxDistribution > 0.8) return false; // Too skewed to one character type
      
      // Require at least 2 character types for longer strings
      const typeCount = Object.values(charCounts).filter(count => count > 0).length;
      if (typeCount < 2) return false;
    }
    
    // Exclude patterns that are clearly other formats
    if (/^[0-9a-fA-F]+$/.test(chars) && chars.length % 2 === 0) return false; // Hex
    if (/^[01]+$/.test(chars) && chars.length % 8 === 0) return false; // Binary
    if (/^[A-Z2-7]+=*$/.test(cleanText)) return false; // Base32
    if (/^[1-9A-HJ-NP-Za-km-z]+$/.test(chars)) return false; // Base58
    if (/^\w+$/.test(chars) && chars.length < 50 && uniqueChars < 5) return false; // Regular word
    
    // Additional entropy check for longer strings
    if (chars.length > 32) {
      const entropy = calculateEntropy(chars);
      if (entropy < 2.5 || entropy > 7.0) return false; // Outside reasonable entropy range
    }
    
    return true;
  },
  decoder: (text: string) => {
    try {
      const result = atob(text);
      // Additional validation: result should not be empty and have reasonable content
      if (result.length === 0) return null;
      
      // Enhanced result validation - handle both text and binary data
      const printableChars = result.split('').filter(c => {
        const code = c.charCodeAt(0);
        return (code >= 32 && code <= 126) || code === 9 || code === 10 || code === 13;
      }).length;
      
      // More flexible validation - consider UTF-8 characters and binary data
      const isLikelyText = printableChars / result.length >= 0.5;
      const hasValidUtf8 = isValidUtf8(result);
      
      // Accept if it's likely text, has valid UTF-8, or appears to be structured binary data
      if (result.length > 10 && !isLikelyText && !hasValidUtf8) {
        // Check for structured binary patterns (JSON, XML, etc.)
        const startsWithStructure = /^[\s]*[{\[<]/.test(result) || /^[\s]*[a-zA-Z0-9_-]+[:=]/.test(result);
        if (!startsWithStructure) {
          return null;
        }
      }
      
      return result;
    } catch (error) {
      console.warn('Base64 decoding failed:', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }
};

// Enhanced Hexadecimal detection and decoding
export const hexPattern: DetectionPattern = {
  name: 'Hexadecimal',
  regex: /^[0-9a-fA-F\s:.-]*$/,
  validator: (text: string) => {
    const cleaned = text.replace(/[\s:.-]/g, ''); // Remove common separators
    // Must be even length and at least 2 chars
    if (cleaned.length < 2 || cleaned.length % 2 !== 0) return false;
    if (!/^[0-9a-fA-F]+$/.test(cleaned)) return false;
    
    // Additional heuristics - hex should have both numbers and letters for longer strings
    if (cleaned.length > 20) {
      const hasNumbers = /[0-9]/.test(cleaned);
      const hasLetters = /[a-fA-F]/.test(cleaned);
      // Require both numbers and letters for longer hex strings
      if (!hasNumbers || !hasLetters) return false;
    }
    
    // Check that it's not just all the same character repeated
    const uniqueChars = new Set(cleaned.toLowerCase()).size;
    if (uniqueChars < 2 && cleaned.length > 4) return false;
    
    return true;
  },
  decoder: (text: string) => {
    try {
      const cleaned = text.replace(/[\s:.-]/g, ''); // Remove separators
      const bytes = cleaned.match(/.{1,2}/g);
      if (!bytes) return null;
      
      const result = bytes.map(byte => {
        const charCode = parseInt(byte, 16);
        return charCode >= 0 && charCode <= 255 ? String.fromCharCode(charCode) : null;
      });
      
      if (result.includes(null)) return null;
      const decoded = result.join('');
      
      // Validate that the result makes sense
      if (decoded.length === 0) return null;
      
      return decoded;
    } catch (error) {
      console.warn('Hexadecimal decoding failed:', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }
};

// Enhanced Binary detection and decoding
export const binaryPattern: DetectionPattern = {
  name: 'Binary',
  regex: /^[01\s]+$/,
  validator: (text: string) => {
    const cleaned = text.replace(/[\s.-]/g, ''); // Remove separators
    // Must be multiple of 8 and at least 8 chars
    if (cleaned.length < 8 || cleaned.length % 8 !== 0) return false;
    return /^[01]+$/.test(cleaned);
  },
  decoder: (text: string) => {
    try {
      const cleaned = text.replace(/[\s.-]/g, '');
      const bytes = cleaned.match(/.{1,8}/g);
      if (!bytes) return null;
      
      const result = bytes.map(byte => {
        const charCode = parseInt(byte, 2);
        return charCode >= 0 && charCode <= 255 ? String.fromCharCode(charCode) : null;
      });
      
      if (result.includes(null)) return null;
      return result.join('');
    } catch (error) {
      console.warn('Binary decoding failed:', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }
};

// Enhanced URL encoding detection and decoding
export const urlPattern: DetectionPattern = {
  name: 'URL Encoding',
  regex: /%[0-9a-fA-F]{2}/,
  validator: (text: string) => {
    // Must contain proper URL encoding patterns
    const percentCount = (text.match(/%/g) || []).length;
    const validPatterns = (text.match(/%[0-9a-fA-F]{2}/g) || []).length;
    return percentCount === validPatterns && percentCount > 0;
  },
  decoder: (text: string) => {
    try {
      const decoded = decodeURIComponent(text);
      // Ensure decoding actually changed something
      return decoded !== text ? decoded : null;
    } catch (error) {
      console.warn('URL decoding failed:', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }
};

// ASCII85 (Base85) detection and decoding
export const ascii85Pattern: DetectionPattern = {
  name: 'ASCII85',
  regex: /^<~.*~>$/,
  validator: (text: string) => {
    if (!text.startsWith('<~') || !text.endsWith('~>')) return false;
    const content = text.slice(2, -2);
    return /^[!-u]+$/.test(content) && content.length > 0;
  },
  decoder: (text: string) => {
    try {
      // Simplified ASCII85 decoder
      const content = text.slice(2, -2);
      let result = '';
      
      for (let i = 0; i < content.length; i += 5) {
        const chunk = content.substr(i, 5).padEnd(5, 'u');
        let value = 0;
        
        for (let j = 0; j < 5; j++) {
          value = value * 85 + (chunk.charCodeAt(j) - 33);
        }
        
        for (let j = 3; j >= 0; j--) {
          result += String.fromCharCode((value >> (j * 8)) & 0xFF);
        }
      }
      
      return result.replace(/\0+$/, '');
    } catch (error) {
      console.warn('ASCII85 decoding failed:', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }
};

// Base32 detection and decoding
export const base32Pattern: DetectionPattern = {
  name: 'Base32',
  regex: /^[A-Z2-7]+=*$/,
  validator: (text: string) => {
    if (text.length < 8) return false;
    const withoutPadding = text.replace(/=+$/, '');
    return /^[A-Z2-7]+$/.test(withoutPadding) && text.length % 8 === 0;
  },
  decoder: (text: string) => {
    try {
      // Simplified Base32 decoder
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
      const withoutPadding = text.replace(/=+$/, '');
      let bits = '';
      
      for (const char of withoutPadding) {
        const index = alphabet.indexOf(char);
        if (index === -1) return null;
        bits += index.toString(2).padStart(5, '0');
      }
      
      let result = '';
      for (let i = 0; i < bits.length - 7; i += 8) {
        const byte = bits.substr(i, 8);
        if (byte.length === 8) {
          result += String.fromCharCode(parseInt(byte, 2));
        }
      }
      
      return result;
    } catch (error) {
      console.warn('Base32 decoding failed:', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }
};

// ROT13 detection and decoding
export const rot13Pattern: DetectionPattern = {
  name: 'ROT13',
  regex: /^[a-zA-Z\s\.,;:!?\-'"()[\]{}0-9]*$/,
  validator: (text: string) => {
    // Enhanced validation for ROT13 with better pattern detection
    if (text.length < 3) return false;
    
    // Must have some alphabetic characters
    const alphaCount = (text.match(/[a-zA-Z]/g) || []).length;
    if (alphaCount < 3) return false;
    
    // Check if it looks like encoded text (statistical analysis)
    const letterFreq = calculateLetterFrequency(text);
    const commonLetters = ['e', 't', 'a', 'o', 'i', 'n', 's', 'h', 'r'];
    const encodedLetters = ['r', 'g', 'n', 'b', 'v', 'a', 'f', 'u', 'e']; // ROT13 of common letters
    
    let encodedCount = 0;
    for (const letter of encodedLetters) {
      if (letterFreq[letter] > 0) encodedCount++;
    }
    
    // If it has many "encoded" frequent letters, it might be ROT13
    return encodedCount >= 3 || alphaCount / text.length > 0.7;
  },
  decoder: (text: string) => {
    return text.replace(/[a-zA-Z]/g, (char) => {
      const isUpperCase = char >= 'A' && char <= 'Z';
      const charCode = char.toUpperCase().charCodeAt(0);
      const rotated = ((charCode - 65 + 13) % 26) + 65;
      const result = String.fromCharCode(rotated);
      return isUpperCase ? result : result.toLowerCase();
    });
  }
};

// Caesar cipher detection (try all shifts)
export const caesarPattern: DetectionPattern = {
  name: 'Caesar Cipher', 
  regex: /^[a-zA-Z\s\.,;:!?\-'"()[\]{}0-9]*$/,
  validator: (text: string) => {
    if (text.length < 4) return false;
    
    // Must have sufficient alphabetic content
    const alphaCount = (text.match(/[a-zA-Z]/g) || []).length;
    if (alphaCount < 4) return false;
    
    // Enhanced validation - check if it looks like shifted text
    const letterFreq = calculateLetterFrequency(text);
    const entropy = calculateEntropy(text);
    
    // Should have reasonable entropy but not too high (not random)
    if (entropy < 2.0 || entropy > 6.0) return false;
    
    // Look for signs of substitution cipher (unnatural letter distribution)
    const commonLetters = ['e', 't', 'a', 'o', 'i', 'n', 's', 'h', 'r'];
    let commonCount = 0;
    for (const letter of commonLetters) {
      if (letterFreq[letter] > 0.05) commonCount++; // 5% threshold
    }
    
    // If too many common letters are frequent, it's probably not encoded
    return commonCount < 4;
  },
  decoder: (text: string) => {
    // Enhanced Caesar decoder with better scoring
    let bestResult = '';
    let bestScore = 0;
    let bestShift = 0;
    
    for (let shift = 1; shift <= 25; shift++) {
      const result = text.replace(/[a-zA-Z]/g, (char) => {
        const isUpperCase = char >= 'A' && char <= 'Z';
        const charCode = char.toUpperCase().charCodeAt(0);
        const shifted = ((charCode - 65 + shift) % 26) + 65;
        const shiftedChar = String.fromCharCode(shifted);
        return isUpperCase ? shiftedChar : shiftedChar.toLowerCase();
      });
      
      // Enhanced scoring combining multiple factors
      const englishScore = calculateEnglishScore(result);
      const languageScore = calculateLanguageScore(result);
      const entropy = calculateEntropy(result);
      
      // Composite score with entropy bonus for readable text
      const compositeScore = englishScore * 0.5 + languageScore * 0.3 + 
                            (entropy >= 3.5 && entropy <= 5.5 ? 20 : 0) * 0.2;
      
      if (compositeScore > bestScore) {
        bestScore = compositeScore;
        bestResult = result;
        bestShift = shift;
      }
    }
    
    // Only return if we found a reasonable decryption
    return bestScore > 30 ? bestResult : null;
  }
};

// Base58 (Bitcoin/Cryptocurrency) detection and decoding
export const base58Pattern: DetectionPattern = {
  name: 'Base58',
  regex: /^[1-9A-HJ-NP-Za-km-z]+$/,
  validator: (text: string) => {
    // Base58 alphabet excludes 0, O, I, l to avoid confusion
    if (text.length < 4) return false;
    return /^[1-9A-HJ-NP-Za-km-z]+$/.test(text);
  },
  decoder: (text: string) => {
    try {
      const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
      let decoded = BigInt(0);
      let multi = 1n;
      const s = text.split('').reverse().join('');
      
      for (const char of s) {
        const index = alphabet.indexOf(char);
        if (index === -1) return null;
        decoded += BigInt(index) * multi;
        multi *= BigInt(58);
      }
      
      let result = '';
      while (decoded > BigInt(0)) {
        result = String.fromCharCode(Number(decoded % BigInt(256))) + result;
        decoded = decoded / BigInt(256);
      }
      
      // Handle leading 1s (zeros)
      for (const char of text) {
        if (char === '1') result = '\x00' + result;
        else break;
      }
      
      return result.replace(/\x00/g, '');
    } catch {
      return null;
    }
  }
};

// Morse Code detection and decoding
export const morsePattern: DetectionPattern = {
  name: 'Morse Code',
  regex: /^[.-\s\/]+$/,
  validator: (text: string) => {
    // Must contain dots, dashes, and separators
    return /^[.-\s\/]+$/.test(text) && /[.-]/.test(text) && text.length > 2;
  },
  decoder: (text: string) => {
    const morseMap: { [key: string]: string } = {
      '.-': 'A', '-...': 'B', '-.-.': 'C', '-..': 'D', '.': 'E',
      '..-.': 'F', '--.': 'G', '....': 'H', '..': 'I', '.---': 'J',
      '-.-': 'K', '.-..': 'L', '--': 'M', '-.': 'N', '---': 'O',
      '.--.': 'P', '--.-': 'Q', '.-.': 'R', '...': 'S', '-': 'T',
      '..-': 'U', '...-': 'V', '.--': 'W', '-..-': 'X', '-.--': 'Y',
      '--..': 'Z', '.----': '1', '..---': '2', '...--': '3',
      '....-': '4', '.....': '5', '-....': '6', '--...': '7',
      '---..': '8', '----.': '9', '-----': '0', '--..--': ',',
      '.-.-.-': '.', '..--..': '?', '.----.': "'", '-.-.--': '!',
      '-..-.': '/', '-.--.': '(', '-.--.-': ')', '.-...': '&',
      '---...': ':', '-.-.-.': ';', '-...-': '=', '.-.-.': '+',
      '-....-': '-', '..--.-': '_', '.-..-.': '"', '...-..-': '$',
      '.--.-.': '@', '...---...': 'SOS'
    };
    
    try {
      const words = text.split(/\s{3,}|\//);
      let result = '';
      
      for (let word of words) {
        const letters = word.trim().split(/\s+/);
        for (let morse of letters) {
          if (morse && morseMap[morse]) {
            result += morseMap[morse];
          } else if (morse.trim()) {
            return null; // Unknown morse code
          }
        }
        result += ' ';
      }
      
      return result.trim() || null;
    } catch {
      return null;
    }
  }
};

// Atbash Cipher detection and decoding
export const atbashPattern: DetectionPattern = {
  name: 'Atbash Cipher',
  regex: /^[a-zA-Z\s\.,;:!?\-'"()[\]{}0-9]*$/,
  validator: (text: string) => {
    if (text.length < 4) return false;
    
    // Must have sufficient alphabetic content
    const alphaCount = (text.match(/[a-zA-Z]/g) || []).length;
    if (alphaCount < 4) return false;
    
    // Enhanced validation for Atbash patterns
    const letterFreq = calculateLetterFrequency(text);
    
    // Check for inverted frequency patterns (common letters should be rare in Atbash)
    const commonLetters = ['e', 't', 'a', 'o', 'i'];
    const rareLetters = ['v', 'g', 'z', 'l', 'r']; // Atbash equivalents
    
    let suspiciousPatterns = 0;
    for (let i = 0; i < commonLetters.length; i++) {
      if (letterFreq[rareLetters[i]] > letterFreq[commonLetters[i]]) {
        suspiciousPatterns++;
      }
    }
    
    // If multiple frequency inversions detected, might be Atbash
    return suspiciousPatterns >= 2 || alphaCount / text.length > 0.8;
  },
  decoder: (text: string) => {
    const result = text.replace(/[a-zA-Z]/g, (char) => {
      const isUpper = char === char.toUpperCase();
      const charCode = char.toLowerCase().charCodeAt(0);
      const reversed = 122 - charCode + 97; // 'z' = 122, 'a' = 97
      const reversedChar = String.fromCharCode(reversed);
      return isUpper ? reversedChar.toUpperCase() : reversedChar;
    });
    
    // Validate that the result makes more sense than the original
    const originalScore = calculateEnglishScore(text);
    const decodedScore = calculateEnglishScore(result);
    
    return decodedScore > originalScore + 10 ? result : null;
  }
};

// A1Z26 (A=1, B=2, etc.) detection and decoding
export const a1z26Pattern: DetectionPattern = {
  name: 'A1Z26 (Numbers to Letters)',
  regex: /^[0-9\s,-]+$/,
  validator: (text: string) => {
    const numbers = text.split(/[\s,-]+/).filter(n => n);
    if (numbers.length < 2) return false;
    return numbers.every(n => {
      const num = parseInt(n);
      return num >= 1 && num <= 26;
    });
  },
  decoder: (text: string) => {
    try {
      const numbers = text.split(/[\s,-]+/).filter(n => n);
      let result = '';
      
      for (const numStr of numbers) {
        const num = parseInt(numStr);
        if (num >= 1 && num <= 26) {
          result += String.fromCharCode(64 + num); // A=65
        } else {
          return null;
        }
      }
      
      return result || null;
    } catch {
      return null;
    }
  }
};

// HTML Entities decoding
export const htmlEntityPattern: DetectionPattern = {
  name: 'HTML Entities',
  regex: /&[a-zA-Z0-9#]+;/,
  validator: (text: string) => {
    return /&[a-zA-Z0-9#]+;/.test(text);
  },
  decoder: (text: string) => {
    const entityMap: { [key: string]: string } = {
      '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'",
      '&nbsp;': ' ', '&copy;': '©', '&reg;': '®', '&trade;': '™',
      '&mdash;': '—', '&ndash;': '–', '&hellip;': '…', '&laquo;': '«',
      '&raquo;': '»', '&bull;': '•', '&deg;': '°', '&plusmn;': '±'
    };
    
    let result = text;
    
    // Replace named entities
    for (const [entity, char] of Object.entries(entityMap)) {
      result = result.replace(new RegExp(entity, 'g'), char);
    }
    
    // Replace numeric entities (&#123; and &#x1A;)
    result = result.replace(/&#(\d+);/g, (_, num) => {
      const code = parseInt(num);
      return code >= 32 && code <= 126 ? String.fromCharCode(code) : _;
    });
    
    result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      const code = parseInt(hex, 16);
      return code >= 32 && code <= 126 ? String.fromCharCode(code) : _;
    });
    
    return result !== text ? result : null;
  }
};

// Duplicate patterns removed - using the enhanced versions above

// Rail Fence Cipher (basic 2-rail)
export const railFencePattern: DetectionPattern = {
  name: 'Rail Fence Cipher (2-Rail)',
  regex: /^[a-zA-Z\s]+$/,
  validator: (text: string) => {
    return /^[a-zA-Z\s]+$/.test(text) && text.length > 4 && text.length % 2 === 0;
  },
  decoder: (text: string) => {
    try {
      const cleaned = text.replace(/\s/g, '');
      if (cleaned.length % 2 !== 0) return null;
      
      const mid = Math.ceil(cleaned.length / 2);
      const rail1 = cleaned.slice(0, mid);
      const rail2 = cleaned.slice(mid);
      
      let result = '';
      for (let i = 0; i < rail1.length; i++) {
        result += rail1[i];
        if (i < rail2.length) result += rail2[i];
      }
      
      return result;
    } catch {
      return null;
    }
  }
};

// Bacon Cipher detection and decoding
export const baconPattern: DetectionPattern = {
  name: 'Bacon Cipher',
  regex: /^[AB\s]+$/i,
  validator: (text: string) => {
    const cleaned = text.replace(/\s/g, '').toUpperCase();
    return /^[AB]+$/.test(cleaned) && cleaned.length >= 5 && cleaned.length % 5 === 0;
  },
  decoder: (text: string) => {
    const baconMap: { [key: string]: string } = {
      'AAAAA': 'A', 'AAAAB': 'B', 'AAABA': 'C', 'AAABB': 'D', 'AABAA': 'E',
      'AABAB': 'F', 'AABBA': 'G', 'AABBB': 'H', 'ABAAA': 'I', 'ABAAB': 'J',
      'ABABA': 'K', 'ABABB': 'L', 'ABBAA': 'M', 'ABBAB': 'N', 'ABBBA': 'O',
      'ABBBB': 'P', 'BAAAA': 'Q', 'BAAAB': 'R', 'BAABA': 'S', 'BAABB': 'T',
      'BABAA': 'U', 'BABAB': 'V', 'BABBA': 'W', 'BABBB': 'X', 'BBAAA': 'Y',
      'BBAAB': 'Z'
    };
    
    try {
      const cleaned = text.replace(/\s/g, '').toUpperCase();
      let result = '';
      
      for (let i = 0; i < cleaned.length; i += 5) {
        const chunk = cleaned.substr(i, 5);
        if (chunk.length === 5 && baconMap[chunk]) {
          result += baconMap[chunk];
        } else {
          return null;
        }
      }
      
      return result || null;
    } catch {
      return null;
    }
  }
};

// Polybius Square detection and decoding
export const polybiusPattern: DetectionPattern = {
  name: 'Polybius Square',
  regex: /^[1-5\s]+$/,
  validator: (text: string) => {
    const numbers = text.replace(/\s/g, '');
    return /^[1-5]+$/.test(numbers) && numbers.length >= 2 && numbers.length % 2 === 0;
  },
  decoder: (text: string) => {
    const polybiusGrid = [
      ['A', 'B', 'C', 'D', 'E'],
      ['F', 'G', 'H', 'I', 'K'], // J and K share the same position
      ['L', 'M', 'N', 'O', 'P'],
      ['Q', 'R', 'S', 'T', 'U'],
      ['V', 'W', 'X', 'Y', 'Z']
    ];
    
    try {
      const numbers = text.replace(/\s/g, '');
      let result = '';
      
      for (let i = 0; i < numbers.length; i += 2) {
        const row = parseInt(numbers[i]) - 1;
        const col = parseInt(numbers[i + 1]) - 1;
        
        if (row >= 0 && row < 5 && col >= 0 && col < 5) {
          result += polybiusGrid[row][col];
        } else {
          return null;
        }
      }
      
      return result || null;
    } catch {
      return null;
    }
  }
};

// Comprehensive hash pattern detection (for identification only)
export const hashPatterns = {
  'MD5': /^[a-f0-9]{32}$/i,
  'SHA-1': /^[a-f0-9]{40}$/i,
  'SHA-224': /^[a-f0-9]{56}$/i,
  'SHA-256': /^[a-f0-9]{64}$/i,
  'SHA-384': /^[a-f0-9]{96}$/i,
  'SHA-512': /^[a-f0-9]{128}$/i,
  'SHA-3-224': /^[a-f0-9]{56}$/i,
  'SHA-3-256': /^[a-f0-9]{64}$/i,
  'SHA-3-384': /^[a-f0-9]{96}$/i,
  'SHA-3-512': /^[a-f0-9]{128}$/i,
  'RIPEMD-160': /^[a-f0-9]{40}$/i,
  'Blake2b-256': /^[a-f0-9]{64}$/i,
  'Blake2b-512': /^[a-f0-9]{128}$/i,
  'NTLM Hash': /^[a-f0-9]{32}$/i,
  'CRC32': /^[a-f0-9]{8}$/i,
  'Adler32': /^[a-f0-9]{8}$/i,
  'Whirlpool': /^[a-f0-9]{128}$/i
};

export const detectionPatterns: DetectionPattern[] = [
  // Extended format patterns (highest priority for specific formats)
  ...extendedDetectionPatterns,
  
  // NEW ENHANCED PATTERNS (highest priority for accurate detection)
  mimeEncodedPattern,    // MIME encoded strings =?charset?encoding?data?=
  punycodePattern,       // Punycode domains xn--
  
  // Highly specific patterns first (least likely to have false positives)
  jwtPattern,            // Very specific 3-part format
  urlPattern,            // Clear URL structure
  htmlEntityPattern, // Distinct &xxx; format
  morsePattern,      // Dots and dashes only
  
  // Binary and hex (distinct character sets)
  binaryPattern,     // Only 0s and 1s
  hexPattern,        // Hex chars only
  
  // Base encodings (more restrictive first)
  base32Pattern,     // Limited character set
  base58Pattern,     // Bitcoin-style encoding
  ascii85Pattern,    // Adobe encoding
  
  // Unicode and escapes
  unicodeEscapePattern,
  
  // Classical ciphers
  rot13Pattern,
  caesarPattern,
  atbashPattern,
  a1z26Pattern,
  baconPattern,
  polybiusPattern,
  railFencePattern,
  
  // Base64 LAST (most permissive pattern)
  base64Pattern,     // Most general - check last to avoid false positives
];


export function detectHashType(text: string): string | null {
  for (const [type, pattern] of Object.entries(hashPatterns)) {
    if (pattern.test(text)) {
      return type;
    }
  }
  return null;
}
