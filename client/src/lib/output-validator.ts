// Output validator and beautifier for decoded results

export interface ValidationResult {
  type: 'json' | 'xml' | 'html' | 'url' | 'jwt' | 'csv' | 'yaml' | 'base64' | 'email' | 'ip' | 'unknown';
  isValid: boolean;
  formatted?: string;
  metadata?: {
    [key: string]: any;
  };
  suggestions?: string[];
}

// JSON validation and formatting
function validateJSON(text: string): ValidationResult {
  try {
    const parsed = JSON.parse(text);
    const formatted = JSON.stringify(parsed, null, 2);
    
    return {
      type: 'json',
      isValid: true,
      formatted,
      metadata: {
        keys: Object.keys(parsed).length,
        size: text.length,
        depth: getJSONDepth(parsed)
      },
      suggestions: ['JSON is valid and formatted']
    };
  } catch (error) {
    // Try to detect partial JSON
    if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
      return {
        type: 'json',
        isValid: false,
        suggestions: ['Looks like malformed JSON - check for missing quotes, commas, or brackets']
      };
    }
    return { type: 'unknown', isValid: false };
  }
}

// XML/HTML validation
function validateXML(text: string): ValidationResult {
  const trimmedText = text.trim();
  
  // Basic HTML detection
  if (/<html|<div|<span|<p>|<body|<head|DOCTYPE html/i.test(trimmedText)) {
    return {
      type: 'html',
      isValid: true,
      formatted: formatHTML(trimmedText),
      metadata: {
        hasDoctype: /DOCTYPE/i.test(trimmedText),
        tags: (trimmedText.match(/<[^>]+>/g) || []).length
      },
      suggestions: ['HTML document detected']
    };
  }
  
  // Basic XML detection
  if (/<\?xml|<[a-zA-Z][^>]*>/.test(trimmedText) && trimmedText.includes('</')) {
    return {
      type: 'xml',
      isValid: true,
      formatted: formatXML(trimmedText),
      metadata: {
        rootElement: extractRootElement(trimmedText),
        tags: (trimmedText.match(/<[^>]+>/g) || []).length
      },
      suggestions: ['XML document detected']
    };
  }
  
  return { type: 'unknown', isValid: false };
}

// URL validation
function validateURL(text: string): ValidationResult {
  const urlPattern = /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i;
  const trimmedText = text.trim();
  
  if (urlPattern.test(trimmedText)) {
    try {
      const url = new URL(trimmedText);
      return {
        type: 'url',
        isValid: true,
        metadata: {
          protocol: url.protocol,
          hostname: url.hostname,
          pathname: url.pathname,
          search: url.search,
          hash: url.hash
        },
        suggestions: ['Valid URL detected']
      };
    } catch {
      return { type: 'unknown', isValid: false };
    }
  }
  
  return { type: 'unknown', isValid: false };
}

// JWT validation
function validateJWT(text: string): ValidationResult {
  const jwtPattern = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/;
  
  if (jwtPattern.test(text.trim())) {
    try {
      const parts = text.split('.');
      const decodeBase64Url = (str: string) => {
        str = str.replace(/-/g, '+').replace(/_/g, '/');
        while (str.length % 4) str += '=';
        return atob(str);
      };
      
      const header = JSON.parse(decodeBase64Url(parts[0]));
      const payload = JSON.parse(decodeBase64Url(parts[1]));
      
      const formatted = JSON.stringify({
        header,
        payload,
        signature: parts[2] ? '[Present]' : '[Missing]'
      }, null, 2);
      
      return {
        type: 'jwt',
        isValid: true,
        formatted,
        metadata: {
          algorithm: header.alg,
          type: header.typ,
          issuer: payload.iss,
          expiry: payload.exp ? new Date(payload.exp * 1000).toISOString() : undefined
        },
        suggestions: ['JWT token parsed successfully']
      };
    } catch {
      return { type: 'unknown', isValid: false };
    }
  }
  
  return { type: 'unknown', isValid: false };
}

// Email validation
function validateEmail(text: string): ValidationResult {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const trimmedText = text.trim();
  
  if (emailPattern.test(trimmedText)) {
    const [local, domain] = trimmedText.split('@');
    return {
      type: 'email',
      isValid: true,
      metadata: {
        local,
        domain,
        tld: domain.split('.').pop()
      },
      suggestions: ['Valid email address detected']
    };
  }
  
  return { type: 'unknown', isValid: false };
}

// IP address validation
function validateIP(text: string): ValidationResult {
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Pattern = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  const trimmedText = text.trim();
  
  if (ipv4Pattern.test(trimmedText)) {
    const octets = trimmedText.split('.').map(Number);
    const isValid = octets.every(octet => octet >= 0 && octet <= 255);
    
    if (isValid) {
      return {
        type: 'ip',
        isValid: true,
        metadata: {
          version: 'IPv4',
          octets,
          isPrivate: isPrivateIP(trimmedText)
        },
        suggestions: ['Valid IPv4 address detected']
      };
    }
  }
  
  if (ipv6Pattern.test(trimmedText)) {
    return {
      type: 'ip',
      isValid: true,
      metadata: {
        version: 'IPv6'
      },
      suggestions: ['Valid IPv6 address detected']
    };
  }
  
  return { type: 'unknown', isValid: false };
}

// CSV validation
function validateCSV(text: string): ValidationResult {
  const lines = text.trim().split('\n');
  if (lines.length > 1) {
    const firstLineCommas = (lines[0].match(/,/g) || []).length;
    const isConsistent = lines.every(line => (line.match(/,/g) || []).length === firstLineCommas);
    
    if (firstLineCommas > 0 && isConsistent) {
      return {
        type: 'csv',
        isValid: true,
        metadata: {
          rows: lines.length,
          columns: firstLineCommas + 1,
          hasHeader: /^[a-zA-Z]/.test(lines[0])
        },
        suggestions: ['CSV data detected with consistent structure']
      };
    }
  }
  
  return { type: 'unknown', isValid: false };
}

// Base64 validation
function validateBase64(text: string): ValidationResult {
  const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/;
  const trimmedText = text.trim();
  
  if (base64Pattern.test(trimmedText) && trimmedText.length % 4 === 0 && trimmedText.length > 4) {
    try {
      const decoded = atob(trimmedText);
      return {
        type: 'base64',
        isValid: true,
        formatted: decoded,
        metadata: {
          originalLength: trimmedText.length,
          decodedLength: decoded.length,
          efficiency: Math.round((decoded.length / trimmedText.length) * 100)
        },
        suggestions: ['Base64 encoded data detected and decoded']
      };
    } catch {
      return { type: 'unknown', isValid: false };
    }
  }
  
  return { type: 'unknown', isValid: false };
}

// Main validation function
export function validateAndBeautifyOutput(text: string): ValidationResult {
  if (!text || !text.trim()) {
    return { type: 'unknown', isValid: false };
  }
  
  // Run validators in order of specificity
  const validators = [
    validateJWT,
    validateJSON,
    validateXML,
    validateURL,
    validateEmail,
    validateIP,
    validateCSV,
    validateBase64
  ];
  
  for (const validator of validators) {
    const result = validator(text);
    if (result.isValid) {
      return result;
    }
  }
  
  return { type: 'unknown', isValid: false };
}

// Helper functions
function getJSONDepth(obj: any, depth: number = 0): number {
  if (typeof obj !== 'object' || obj === null) return depth;
  
  let maxDepth = depth;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      maxDepth = Math.max(maxDepth, getJSONDepth(obj[key], depth + 1));
    }
  }
  return maxDepth;
}

function formatHTML(html: string): string {
  // Basic HTML formatting (simplified)
  return html
    .replace(/></g, '>\\n<')
    .replace(/\n\s*\n/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');
}

function formatXML(xml: string): string {
  // Basic XML formatting (simplified)
  return xml
    .replace(/></g, '>\\n<')
    .replace(/\n\s*\n/g, '\n')
    .split('\n')
    .map((line, index) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('</')) return '  '.repeat(Math.max(0, index - 1)) + trimmed;
      return '  '.repeat(index) + trimmed;
    })
    .join('\n');
}

function extractRootElement(xml: string): string | undefined {
  const match = xml.match(/<([a-zA-Z][^>\s]*)/);
  return match ? match[1] : undefined;
}

function isPrivateIP(ip: string): boolean {
  const octets = ip.split('.').map(Number);
  
  // 10.0.0.0/8
  if (octets[0] === 10) return true;
  
  // 172.16.0.0/12
  if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return true;
  
  // 192.168.0.0/16
  if (octets[0] === 192 && octets[1] === 168) return true;
  
  return false;
}