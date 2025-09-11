// Advanced Security Validation and Protection System
// Protects against malicious inputs, implements rate limiting, and ensures data integrity

export interface SecurityValidationResult {
  isValid: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  warnings: string[];
  sanitizedInput?: string;
  detectedThreats: string[];
}

export interface RateLimitInfo {
  requestCount: number;
  windowStart: number;
  remaining: number;
  resetTime: number;
}

// Security configuration
const SECURITY_CONFIG = {
  maxInputLength: 1024 * 1024 * 1024, // 1GB
  maxRequestsPerMinute: 100,
  maxRequestsPerHour: 1000,
  suspiciousPatternThreshold: 0.7,
  enableAdvancedThreatDetection: true,
  enableInputSanitization: true,
  enableRateLimiting: true
};

// Rate limiting storage
const rateLimitStorage = new Map<string, RateLimitInfo>();
const suspiciousActivityLog = new Map<string, number>();

// Advanced threat detection patterns
const THREAT_PATTERNS = {
  sqlInjection: [
    /('|(\\x27)|(\\x2D)|(\\x5C)|(\\x22)|(\\x5C\\x5C))\s*(union|select|insert|delete|update|drop|create|alter|exec|execute)/gi,
    /(select|insert|update|delete|drop|create|alter|exec|execute)\s+.*?\s+(from|into|set|where|values)/gi,
    /(\bor\b|\band\b)\s+['"]?\w+['"]?\s*=\s*['"]?\w+['"]?/gi
  ],
  xssAttack: [
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi,
    /javascript\s*:/gi,
    /on\w+\s*=\s*["'][^"']*["']/gi,
    /<\s*\/?\s*(script|iframe|object|embed|applet|meta|link|style)/gi
  ],
  codeInjection: [
    /eval\s*\(/gi,
    /function\s*\([^)]*\)\s*\{/gi,
    /new\s+Function\s*\(/gi,
    /setTimeout\s*\(/gi,
    /setInterval\s*\(/gi,
    /require\s*\(/gi,
    /__proto__/gi,
    /constructor\s*\(/gi
  ],
  pathTraversal: [
    /\.\./g,
    /\/\.\./g,
    /\\\.\.\\?/g,
    /%2e%2e/gi,
    /%252e%252e/gi,
    /\.%2f/gi,
    /\/%2e/gi
  ],
  commandInjection: [
    /[;&|`${}]/g,
    /\$\([^)]*\)/g,
    /`[^`]*`/g,
    /\|\s*(cat|ls|ps|pwd|whoami|id|uname)/gi,
    /&&\s*(rm|del|format|shutdown|reboot)/gi
  ],
  dataExfiltration: [
    /data:[\w\/]+;base64,/gi,
    /http[s]?:\/\/[^\s]+/gi,
    /ftp:\/\/[^\s]+/gi,
    /file:\/\/[^\s]+/gi,
    /mailto:[^\s]+/gi
  ]
};

// Suspicious content patterns
const SUSPICIOUS_PATTERNS = {
  repetitiveContent: /(.{10,})\1{5,}/g,
  excessiveSpecialChars: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{20,}/g,
  unusualEncodingChains: /(base64|hex|url|binary)\s*(encode|decode)\s*(base64|hex|url|binary)/gi,
  potentialPayload: /payload|exploit|shell|backdoor|malware|virus/gi,
  suspiciousKeywords: /password|secret|token|key|admin|root|debug|test|hack/gi
};

export function validateInputSecurity(input: string, clientId?: string): SecurityValidationResult {
  const result: SecurityValidationResult = {
    isValid: true,
    riskLevel: 'low',
    warnings: [],
    detectedThreats: [],
    sanitizedInput: input
  };

  try {
    // 1. Basic validation
    if (!input || typeof input !== 'string') {
      result.isValid = false;
      result.riskLevel = 'high';
      result.warnings.push('Invalid input type');
      return result;
    }

    // 2. Size validation
    if (input.length > SECURITY_CONFIG.maxInputLength) {
      result.isValid = false;
      result.riskLevel = 'high';
      result.warnings.push(`Input exceeds maximum allowed size (${Math.floor(SECURITY_CONFIG.maxInputLength / (1024 * 1024))}MB)`);
      return result;
    }

    // 3. Rate limiting check
    if (SECURITY_CONFIG.enableRateLimiting && clientId) {
      const rateLimitResult = checkRateLimit(clientId);
      if (!rateLimitResult.allowed) {
        result.isValid = false;
        result.riskLevel = 'high';
        result.warnings.push('Rate limit exceeded. Please slow down your requests.');
        return result;
      }
    }

    // 4. Threat detection
    if (SECURITY_CONFIG.enableAdvancedThreatDetection) {
      const threats = detectThreats(input);
      result.detectedThreats = threats;
      
      if (threats.length > 0) {
        result.riskLevel = calculateRiskLevel(threats);
        result.warnings.push(`Detected potential security threats: ${threats.join(', ')}`);
        
        if (result.riskLevel === 'critical') {
          result.isValid = false;
          logSuspiciousActivity(clientId || 'anonymous', threats);
          return result;
        }
      }
    }

    // 5. Suspicious pattern analysis
    const suspiciousScore = analyzeSuspiciousPatterns(input);
    if (suspiciousScore > SECURITY_CONFIG.suspiciousPatternThreshold) {
      result.riskLevel = suspiciousScore > 0.9 ? 'high' : 'medium';
      result.warnings.push('Input contains suspicious patterns');
      
      if (suspiciousScore > 0.9) {
        logSuspiciousActivity(clientId || 'anonymous', ['suspicious-patterns']);
      }
    }

    // 6. Input sanitization
    if (SECURITY_CONFIG.enableInputSanitization && result.detectedThreats.length > 0) {
      result.sanitizedInput = sanitizeInput(input, result.detectedThreats);
      result.warnings.push('Input has been sanitized for security');
    }

    // 7. Final risk assessment
    if (result.warnings.length > 3) {
      result.riskLevel = 'high';
    } else if (result.warnings.length > 1) {
      result.riskLevel = 'medium';
    }

  } catch (error) {
    result.isValid = false;
    result.riskLevel = 'critical';
    result.warnings.push('Security validation failed due to unexpected error');
    console.error('Security validation error:', error);
  }

  return result;
}

function detectThreats(input: string): string[] {
  const threats: string[] = [];

  // Check each threat category
  Object.entries(THREAT_PATTERNS).forEach(([threatType, patterns]) => {
    for (const pattern of patterns) {
      if (pattern.test(input)) {
        threats.push(threatType);
        break; // Only add each threat type once
      }
    }
  });

  return threats;
}

function calculateRiskLevel(threats: string[]): 'low' | 'medium' | 'high' | 'critical' {
  const criticalThreats = ['sqlInjection', 'codeInjection', 'commandInjection'];
  const highThreats = ['xssAttack', 'dataExfiltration'];
  
  if (threats.some(threat => criticalThreats.includes(threat))) {
    return 'critical';
  }
  
  if (threats.some(threat => highThreats.includes(threat))) {
    return 'high';
  }
  
  if (threats.length > 2) {
    return 'high';
  }
  
  if (threats.length > 0) {
    return 'medium';
  }
  
  return 'low';
}

function analyzeSuspiciousPatterns(input: string): number {
  let suspiciousScore = 0;
  let totalChecks = 0;

  Object.entries(SUSPICIOUS_PATTERNS).forEach(([patternType, pattern]) => {
    totalChecks++;
    if (pattern.test(input)) {
      suspiciousScore += 0.2; // Each suspicious pattern adds 20% to score
    }
  });

  // Additional heuristics
  const entropy = calculateStringEntropy(input);
  const charVariety = new Set(input).size / input.length;
  const specialCharRatio = (input.match(/[^a-zA-Z0-9\s]/g) || []).length / input.length;

  // High entropy might indicate encrypted/obfuscated content
  if (entropy > 7.5) suspiciousScore += 0.1;
  
  // Very low character variety might indicate padding attacks
  if (charVariety < 0.1) suspiciousScore += 0.1;
  
  // Very high special character ratio might indicate payload
  if (specialCharRatio > 0.5) suspiciousScore += 0.2;

  return Math.min(suspiciousScore, 1.0);
}

function calculateStringEntropy(str: string): number {
  const freq = new Map<string, number>();
  
  for (const char of str) {
    freq.set(char, (freq.get(char) || 0) + 1);
  }
  
  let entropy = 0;
  for (const count of freq.values()) {
    const p = count / str.length;
    entropy -= p * Math.log2(p);
  }
  
  return entropy;
}

function sanitizeInput(input: string, threats: string[]): string {
  let sanitized = input;

  // Remove or escape dangerous patterns based on detected threats
  if (threats.includes('sqlInjection')) {
    sanitized = sanitized.replace(/['";\\]/g, '');
    sanitized = sanitized.replace(/\b(union|select|insert|delete|update|drop|create|alter|exec|execute)\b/gi, '');
  }

  if (threats.includes('xssAttack')) {
    sanitized = sanitized.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
    sanitized = sanitized.replace(/<[^>]*>/g, '');
    sanitized = sanitized.replace(/javascript:/gi, '');
  }

  if (threats.includes('codeInjection')) {
    sanitized = sanitized.replace(/eval\s*\(/gi, '');
    sanitized = sanitized.replace(/function\s*\(/gi, '');
    sanitized = sanitized.replace(/new\s+Function/gi, '');
  }

  if (threats.includes('commandInjection')) {
    sanitized = sanitized.replace(/[;&|`${}]/g, '');
    sanitized = sanitized.replace(/\$\([^)]*\)/g, '');
  }

  if (threats.includes('pathTraversal')) {
    sanitized = sanitized.replace(/\.\./g, '');
    sanitized = sanitized.replace(/[\\\/]/g, '');
  }

  return sanitized;
}

function checkRateLimit(clientId: string): { allowed: boolean; info: RateLimitInfo } {
  const now = Date.now();
  const windowSize = 60 * 1000; // 1 minute window
  
  let info = rateLimitStorage.get(clientId);
  
  if (!info || (now - info.windowStart) > windowSize) {
    // New window
    info = {
      requestCount: 1,
      windowStart: now,
      remaining: SECURITY_CONFIG.maxRequestsPerMinute - 1,
      resetTime: now + windowSize
    };
  } else {
    // Within current window
    info.requestCount++;
    info.remaining = Math.max(0, SECURITY_CONFIG.maxRequestsPerMinute - info.requestCount);
  }
  
  rateLimitStorage.set(clientId, info);
  
  return {
    allowed: info.requestCount <= SECURITY_CONFIG.maxRequestsPerMinute,
    info
  };
}

function logSuspiciousActivity(clientId: string, threats: string[]): void {
  const currentCount = suspiciousActivityLog.get(clientId) || 0;
  suspiciousActivityLog.set(clientId, currentCount + 1);
  
  console.warn(`Suspicious activity detected for client ${clientId}:`, {
    threats,
    totalSuspiciousRequests: currentCount + 1,
    timestamp: new Date().toISOString()
  });
  
  // Clean up old entries periodically
  if (suspiciousActivityLog.size > 1000) {
    const entries = Array.from(suspiciousActivityLog.entries());
    entries.slice(0, 500).forEach(([key]) => suspiciousActivityLog.delete(key));
  }
}

// Public utility functions
export function getRateLimitInfo(clientId: string): RateLimitInfo | null {
  return rateLimitStorage.get(clientId) || null;
}

export function clearRateLimit(clientId: string): void {
  rateLimitStorage.delete(clientId);
}

export function getSuspiciousActivityCount(clientId: string): number {
  return suspiciousActivityLog.get(clientId) || 0;
}

export function updateSecurityConfig(updates: Partial<typeof SECURITY_CONFIG>): void {
  Object.assign(SECURITY_CONFIG, updates);
}

export function getSecurityStats(): {
  rateLimitedClients: number;
  suspiciousClients: number;
  totalValidations: number;
} {
  return {
    rateLimitedClients: rateLimitStorage.size,
    suspiciousClients: suspiciousActivityLog.size,
    totalValidations: rateLimitStorage.size + suspiciousActivityLog.size
  };
}