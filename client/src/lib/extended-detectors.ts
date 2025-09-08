import { DetectionPattern } from '@/types/analysis';
import { isValidUtf8 } from './scoring';

// Character Encoding Detectors
export const utf16Pattern: DetectionPattern = {
  name: 'UTF-16',
  regex: /^(\xFF\xFE|\xFE\xFF)/,
  validator: (text: string) => {
    // Enhanced UTF-16 detection with better BOM and pattern recognition
    const bytes = new TextEncoder().encode(text);
    if (bytes.length < 4) return false; // Too short for meaningful UTF-16
    
    // Check for BOM markers (most reliable)
    const hasBOM = (bytes[0] === 0xFF && bytes[1] === 0xFE) || (bytes[0] === 0xFE && bytes[1] === 0xFF);
    if (hasBOM) return true;
    
    // Check for typical UTF-16 patterns (every other byte is often 0 for ASCII-range characters)
    if (bytes.length % 2 !== 0) return false;
    
    let nullBytePattern = 0;
    for (let i = 1; i < Math.min(bytes.length, 100); i += 2) {
      if (bytes[i] === 0) nullBytePattern++;
    }
    
    // If more than 30% of odd-indexed bytes are null, likely UTF-16BE
    // But avoid false positives with binary data that happens to have null bytes
    const nullRatio = nullBytePattern / (Math.min(bytes.length, 100) / 2);
    if (nullRatio > 0.3 && nullRatio < 0.9) {
      // Additional check: make sure it's not random binary data
      const possibleChars = [];
      for (let i = 0; i < Math.min(bytes.length - 1, 20); i += 2) {
        const charCode = (bytes[i] << 8) | bytes[i + 1];
        if (charCode > 0 && charCode < 127) possibleChars.push(charCode);
      }
      return possibleChars.length > 3; // At least some recognizable ASCII chars
    }
    
    return false;
  },
  decoder: (text: string) => {
    try {
      const bytes = new TextEncoder().encode(text);
      
      // Handle BOM-prefixed UTF-16
      if (bytes[0] === 0xFF && bytes[1] === 0xFE) {
        // Little endian BOM
        return new TextDecoder('utf-16le').decode(bytes.slice(2));
      } else if (bytes[0] === 0xFE && bytes[1] === 0xFF) {
        // Big endian BOM
        return new TextDecoder('utf-16be').decode(bytes.slice(2));
      }
      
      // Try to detect endianness from null byte patterns
      let nullAtOdd = 0, nullAtEven = 0;
      for (let i = 0; i < Math.min(bytes.length - 1, 20); i += 2) {
        if (bytes[i] === 0) nullAtEven++;
        if (bytes[i + 1] === 0) nullAtOdd++;
      }
      
      if (nullAtOdd > nullAtEven && nullAtOdd > 2) {
        // Likely UTF-16BE (null bytes at odd positions)
        return new TextDecoder('utf-16be').decode(bytes);
      } else if (nullAtEven > nullAtOdd && nullAtEven > 2) {
        // Likely UTF-16LE (null bytes at even positions)
        return new TextDecoder('utf-16le').decode(bytes);
      }
      
      return null;
    } catch (error) {
      console.warn('UTF-16 decoding failed:', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }
};

export const iso88591Pattern: DetectionPattern = {
  name: 'ISO-8859-1',
  regex: /[\x80-\xFF]/,
  validator: (text: string) => {
    // Enhanced validation to avoid UTF-8 misidentification
    if (!/[\x80-\xFF]/.test(text) || text.length === 0) return false;
    
    // Check if it's already valid UTF-8 - if so, probably not ISO-8859-1
    if (isValidUtf8(text)) return false;
    
    // Look for typical ISO-8859-1 patterns vs UTF-8 patterns
    const extendedBytes = Array.from(text).filter(char => char.charCodeAt(0) >= 0x80);
    const totalExtended = extendedBytes.length;
    
    // If most extended characters appear to be UTF-8 sequences, likely not ISO-8859-1
    const possibleUtf8Sequences = text.match(/[\xC0-\xDF][\x80-\xBF]|[\xE0-\xEF][\x80-\xBF]{2}|[\xF0-\xF7][\x80-\xBF]{3}/g);
    if (possibleUtf8Sequences && possibleUtf8Sequences.length > totalExtended * 0.3) {
      return false;
    }
    
    return true;
  },
  decoder: (text: string) => {
    try {
      // Convert ISO-8859-1 to UTF-8
      const bytes = Array.from(text).map(char => char.charCodeAt(0));
      const decoded = new TextDecoder('iso-8859-1').decode(new Uint8Array(bytes));
      
      // Validate that decoding actually improved the text
      if (decoded === text) return null; // No change means it wasn't ISO-8859-1
      
      return decoded;
    } catch (error) {
      console.warn('ISO-8859-1 decoding failed:', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }
};

export const windows1252Pattern: DetectionPattern = {
  name: 'Windows-1252',
  regex: /[\x80-\x9F]/,
  validator: (text: string) => {
    // Enhanced Windows-1252 validation
    if (!/[\x80-\x9F]/.test(text) || text.length === 0) return false;
    
    // Check if it's already valid UTF-8 - if so, probably not Windows-1252
    if (isValidUtf8(text)) return false;
    
    // Look for specific Windows-1252 characters that are different from ISO-8859-1
    const win1252SpecificChars = /[\x80\x82\x83\x84\x85\x86\x87\x88\x89\x8A\x8B\x8C\x8E\x91\x92\x93\x94\x95\x96\x97\x98\x99\x9A\x9B\x9C\x9E\x9F]/;
    const hasWin1252Chars = win1252SpecificChars.test(text);
    
    // Also check for common Windows-1252 patterns (smart quotes, em dashes, etc.)
    const commonWin1252 = /[""''–—…]/;
    const hasCommonWin1252 = commonWin1252.test(text);
    
    return hasWin1252Chars || hasCommonWin1252;
  },
  decoder: (text: string) => {
    try {
      const bytes = Array.from(text).map(char => char.charCodeAt(0));
      const decoded = new TextDecoder('windows-1252').decode(new Uint8Array(bytes));
      
      // Validate that decoding actually improved the text
      if (decoded === text) return null; // No change means it wasn't Windows-1252
      
      // Check if the decoded text makes more sense (has more readable characters)
      const originalReadableChars = text.replace(/[\x00-\x1F\x80-\x9F]/g, '').length;
      const decodedReadableChars = decoded.replace(/[\x00-\x1F]/g, '').length;
      
      if (decodedReadableChars <= originalReadableChars && decoded.length > 10) {
        return null; // Decoding didn't improve readability
      }
      
      return decoded;
    } catch (error) {
      console.warn('Windows-1252 decoding failed:', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }
};

// Advanced Base-N Encodings
export const base91Pattern: DetectionPattern = {
  name: 'Base91',
  regex: /^[A-Za-z0-9!#$%&()*+,./:;<=>?@[\]^_`{|}~"]+$/,
  validator: (text: string) => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!#$%&()*+,./:;<=>?@[]^_`{|}~"';
    return text.length > 0 && text.split('').every(char => alphabet.includes(char));
  },
  decoder: (text: string) => {
    try {
      // Basic Base91 decoder implementation
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!#$%&()*+,./:;<=>?@[]^_`{|}~"';
      let v = -1, b = 0, n = 0;
      const output: number[] = [];
      
      for (const c of text) {
        const p = alphabet.indexOf(c);
        if (p === -1) return null;
        
        if (v < 0) {
          if (p < 0) return null;
          v = p;
          continue;
        }
        
        v += (p + 1) * 91;
        b |= ((v << n) & 255);
        
        if (v > 88) {
          n += 13;
        } else {
          n += 14;
        }
        
        v = Math.floor(v / 91);
        
        while (n > 7) {
          output.push(b & 255);
          b >>= 8;
          n -= 8;
        }
      }
      
      if (v >= 0) {
        output.push((b | v << n) & 255);
      }
      
      return String.fromCharCode(...output);
    } catch (error) {
      console.warn('Base91 decoding failed:', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }
};

export const uuencodePattern: DetectionPattern = {
  name: 'UUEncode',
  regex: /^begin \d{3} .+$/m,
  validator: (text: string) => {
    return /^begin \d{3} .+$/m.test(text) && text.includes('`') && text.includes('end');
  },
  decoder: (text: string) => {
    try {
      const lines = text.split('\n');
      let inData = false;
      let result = '';
      
      for (const line of lines) {
        if (line.startsWith('begin ')) {
          inData = true;
          continue;
        }
        if (line === 'end') break;
        if (!inData) continue;
        
        if (line.length === 0) continue;
        const length = line.charCodeAt(0) - 32;
        if (length <= 0) continue;
        
        let decoded = '';
        for (let i = 1; i < line.length; i += 4) {
          const chunk = line.substr(i, 4);
          if (chunk.length < 4) break;
          
          const a = (chunk.charCodeAt(0) - 32) & 63;
          const b = (chunk.charCodeAt(1) - 32) & 63;
          const c = (chunk.charCodeAt(2) - 32) & 63;
          const d = (chunk.charCodeAt(3) - 32) & 63;
          
          decoded += String.fromCharCode((a << 2) | (b >> 4));
          if (decoded.length < length) {
            decoded += String.fromCharCode(((b & 15) << 4) | (c >> 2));
          }
          if (decoded.length < length) {
            decoded += String.fromCharCode(((c & 3) << 6) | d);
          }
        }
        result += decoded.substr(0, length);
      }
      
      return result || null;
    } catch (error) {
      console.warn('UUEncode decoding failed:', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }
};

export const yencPattern: DetectionPattern = {
  name: 'yEnc',
  regex: /=ybegin/,
  validator: (text: string) => {
    return text.includes('=ybegin') && text.includes('=yend');
  },
  decoder: (text: string) => {
    try {
      const lines = text.split('\n');
      let inData = false;
      let result = '';
      
      for (const line of lines) {
        if (line.startsWith('=ybegin')) {
          inData = true;
          continue;
        }
        if (line.startsWith('=yend')) break;
        if (!inData) continue;
        if (line.startsWith('=ypart')) continue;
        
        let decoded = '';
        for (let i = 0; i < line.length; i++) {
          let char = line.charCodeAt(i);
          if (char === 61) { // '=' escape character
            i++;
            if (i < line.length) {
              char = line.charCodeAt(i) - 64;
            }
          } else {
            char -= 42;
          }
          decoded += String.fromCharCode(char & 255);
        }
        result += decoded;
      }
      
      return result || null;
    } catch (error) {
      console.warn('yEnc decoding failed:', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }
};

export const quotedPrintablePattern: DetectionPattern = {
  name: 'Quoted-Printable',
  regex: /=([0-9A-F]{2}|$)/,
  validator: (text: string) => {
    return /=([0-9A-F]{2}|$)/.test(text) && text.length > 0;
  },
  decoder: (text: string) => {
    try {
      return text.replace(/=([0-9A-F]{2})/gi, (match, hex) => {
        return String.fromCharCode(parseInt(hex, 16));
      }).replace(/=\r?\n/g, '');
    } catch (error) {
      console.warn('Quoted-Printable decoding failed:', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }
};

// Structured Data Format Detectors
export const jsonPattern: DetectionPattern = {
  name: 'JSON',
  regex: /^\s*[\[{]/,
  validator: (text: string) => {
    try {
      JSON.parse(text.trim());
      return true;
    } catch (error) {
      console.warn('JSON validation failed:', error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  },
  decoder: (text: string) => {
    try {
      const parsed = JSON.parse(text.trim());
      return JSON.stringify(parsed, null, 2);
    } catch (error) {
      console.warn('JSON decoding failed:', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }
};

export const xmlPattern: DetectionPattern = {
  name: 'XML',
  regex: /^\s*<\?xml|^\s*</,
  validator: (text: string) => {
    const trimmed = text.trim();
    return (trimmed.startsWith('<?xml') || trimmed.startsWith('<')) && 
           trimmed.includes('>') && !trimmed.startsWith('<!DOCTYPE html');
  },
  decoder: (text: string) => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/xml');
      const serializer = new XMLSerializer();
      return serializer.serializeToString(doc);
    } catch (error) {
      console.warn('XML decoding failed:', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }
};

export const yamlPattern: DetectionPattern = {
  name: 'YAML',
  regex: /^[a-zA-Z_][a-zA-Z0-9_]*:\s/m,
  validator: (text: string) => {
    // Basic YAML structure detection
    return /^[a-zA-Z_][a-zA-Z0-9_]*:\s/m.test(text) || 
           text.includes('---') ||
           /^\s*-\s/.test(text);
  },
  decoder: (text: string) => {
    // Return formatted YAML (basic formatting)
    return text.split('\n').map(line => line.trimRight()).join('\n');
  }
};

export const csvPattern: DetectionPattern = {
  name: 'CSV',
  regex: /^[^,\n]*,[^,\n]*$/m,
  validator: (text: string) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return false;
    
    const firstLineCommas = (lines[0].match(/,/g) || []).length;
    return firstLineCommas > 0 && lines.slice(1, 3).every(line => 
      (line.match(/,/g) || []).length === firstLineCommas
    );
  },
  decoder: (text: string) => {
    try {
      // Basic CSV formatting
      const lines = text.split('\n');
      return lines.map(line => {
        const cells = line.split(',').map(cell => cell.trim());
        return cells.join('\t'); // Convert to tab-separated for readability
      }).join('\n');
    } catch (error) {
      console.warn('CSV decoding failed:', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }
};

// PEM and Data URL Formats
export const pemPattern: DetectionPattern = {
  name: 'PEM',
  regex: /-----BEGIN [A-Z ]+-----/,
  validator: (text: string) => {
    return /-----BEGIN [A-Z ]+-----/.test(text) && /-----END [A-Z ]+-----/.test(text);
  },
  decoder: (text: string) => {
    try {
      const match = text.match(/-----BEGIN ([A-Z ]+)-----([\s\S]*?)-----END \1-----/);
      if (match) {
        const type = match[1];
        const content = match[2].replace(/\s/g, '');
        const decoded = atob(content);
        return `PEM ${type}:\n${decoded}`;
      }
      return null;
    } catch (error) {
      console.warn('PEM decoding failed:', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }
};

export const dataUrlPattern: DetectionPattern = {
  name: 'Data URL',
  regex: /^data:[^;]+;base64,/,
  validator: (text: string) => {
    return /^data:[^;]+;base64,/.test(text);
  },
  decoder: (text: string) => {
    try {
      const match = text.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        const mimeType = match[1];
        const data = match[2];
        const decoded = atob(data);
        return `Data URL (${mimeType}):\n${decoded.substring(0, 500)}${decoded.length > 500 ? '...' : ''}`;
      }
      return null;
    } catch (error) {
      console.warn('Data URL decoding failed:', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }
};

// Container Format Detection (metadata only)
export const zipPattern: DetectionPattern = {
  name: 'ZIP Archive',
  regex: /^PK[\x03\x04\x05\x06]/,
  validator: (text: string) => {
    const bytes = new TextEncoder().encode(text);
    return bytes.length >= 4 && 
           bytes[0] === 0x50 && bytes[1] === 0x4B && 
           (bytes[2] === 0x03 || bytes[2] === 0x05) && 
           (bytes[3] === 0x04 || bytes[3] === 0x06);
  },
  decoder: (text: string) => {
    return 'ZIP Archive detected - cannot extract in browser environment';
  }
};

export const tarPattern: DetectionPattern = {
  name: 'TAR Archive',
  regex: /ustar/,
  validator: (text: string) => {
    // Check for TAR magic number at offset 257
    return text.length > 262 && text.substring(257, 262) === 'ustar';
  },
  decoder: (text: string) => {
    return 'TAR Archive detected - cannot extract in browser environment';
  }
};

// Compression Format Detection (metadata only)
export const gzipPattern: DetectionPattern = {
  name: 'GZIP',
  regex: /^\x1f\x8b/,
  validator: (text: string) => {
    const bytes = new TextEncoder().encode(text);
    return bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
  },
  decoder: (text: string) => {
    return 'GZIP compressed data detected - decompression not supported in browser';
  }
};

export const zlibPattern: DetectionPattern = {
  name: 'ZLIB',
  regex: /^\x78[\x01\x9c\xda]/,
  validator: (text: string) => {
    const bytes = new TextEncoder().encode(text);
    return bytes.length >= 2 && bytes[0] === 0x78 && 
           (bytes[1] === 0x01 || bytes[1] === 0x9c || bytes[1] === 0xda);
  },
  decoder: (text: string) => {
    return 'ZLIB compressed data detected - decompression not supported in browser';
  }
};

export const brotliPattern: DetectionPattern = {
  name: 'Brotli',
  regex: /^\x8b\x08/,
  validator: (text: string) => {
    // Brotli detection is complex, simplified here
    return text.length > 10 && /[\x80-\xFF]{3,}/.test(text.substring(0, 10));
  },
  decoder: (text: string) => {
    return 'Brotli compressed data detected - decompression not supported in browser';
  }
};

// All extended patterns for export
export const extendedDetectionPatterns: DetectionPattern[] = [
  // Character encodings
  utf16Pattern,
  iso88591Pattern,
  windows1252Pattern,
  
  // Advanced Base-N encodings
  base91Pattern,
  uuencodePattern,
  yencPattern,
  quotedPrintablePattern,
  
  // Structured data formats
  jsonPattern,
  xmlPattern,
  yamlPattern,
  csvPattern,
  
  // PEM and Data URLs
  pemPattern,
  dataUrlPattern,
  
  // Container formats (detection only)
  zipPattern,
  tarPattern,
  
  // Compression formats (detection only)
  gzipPattern,
  zlibPattern,
  brotliPattern,
];