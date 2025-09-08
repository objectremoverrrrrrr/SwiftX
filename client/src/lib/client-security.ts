// Client-Side Security Enhancement Layer
// Additional protection against browser-based attacks

export interface SecurityContext {
  sessionId: string;
  requestCount: number;
  lastActivity: number;
  suspiciousActivity: boolean;
  blockedUntil?: number;
}

// Client-side security configuration
const CLIENT_SECURITY_CONFIG = {
  maxSessionDuration: 24 * 60 * 60 * 1000, // 24 hours
  maxInactivity: 2 * 60 * 60 * 1000, // 2 hours
  maxRequestsPerSession: 10000,
  suspiciousActivityThreshold: 100,
  autoBlockDuration: 15 * 60 * 1000, // 15 minutes
  enableCSRFProtection: true,
  enableClickjackingProtection: true,
  enableInputSanitization: true
};

// Global security context
let securityContext: SecurityContext | null = null;

// Initialize security context
export function initializeClientSecurity(): void {
  // Generate unique session ID
  const sessionId = generateSecureSessionId();
  
  securityContext = {
    sessionId,
    requestCount: 0,
    lastActivity: Date.now(),
    suspiciousActivity: false
  };

  // Set up security event listeners
  setupSecurityEventListeners();
  
  // Initialize CSRF protection
  if (CLIENT_SECURITY_CONFIG.enableCSRFProtection) {
    initializeCSRFProtection();
  }
  
  // Initialize clickjacking protection
  if (CLIENT_SECURITY_CONFIG.enableClickjackingProtection) {
    initializeClickjackingProtection();
  }
  
  // Set up periodic security checks
  setInterval(performSecurityHealthCheck, 30000); // Every 30 seconds
  
  console.info('Client security initialized successfully');
}

function generateSecureSessionId(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

function setupSecurityEventListeners(): void {
  // Monitor suspicious DOM manipulation attempts
  const observer = new MutationObserver((mutations) => {
    let suspiciousCount = 0;
    
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            
            // Check for potentially malicious elements
            const dangerousTags = ['script', 'iframe', 'object', 'embed', 'form'];
            const tagName = element.tagName?.toLowerCase();
            
            if (dangerousTags.includes(tagName)) {
              suspiciousCount++;
              console.warn(`Suspicious element detected: ${tagName}`);
              
              // Remove potentially dangerous elements
              element.remove();
            }
            
            // Check for suspicious attributes
            if (element.hasAttributes()) {
              const attrs = element.attributes;
              for (let i = 0; i < attrs.length; i++) {
                const attr = attrs[i];
                if (attr.name.startsWith('on') || attr.value.includes('javascript:')) {
                  console.warn(`Suspicious attribute detected: ${attr.name}=${attr.value}`);
                  element.removeAttribute(attr.name);
                  suspiciousCount++;
                }
              }
            }
          }
        });
      }
    });
    
    if (suspiciousCount > 0) {
      recordSuspiciousActivity();
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['onclick', 'onload', 'onerror', 'onmouseover']
  });
  
  // Monitor console access attempts
  const originalConsole = { ...console };
  Object.keys(console).forEach(method => {
    if (typeof console[method as keyof Console] === 'function') {
      (console as any)[method] = function(...args: any[]) {
        // Check for suspicious console usage patterns
        const argStr = args.join(' ').toLowerCase();
        const suspiciousPatterns = ['eval(', 'function(', '__proto__', 'constructor', 'payload'];
        
        if (suspiciousPatterns.some(pattern => argStr.includes(pattern))) {
          recordSuspiciousActivity();
        }
        
        return (originalConsole as any)[method].apply(this, args);
      };
    }
  });
  
  // Monitor for developer tools usage
  let devtools = { open: false };
  setInterval(() => {
    if (window.outerHeight - window.innerHeight > 200 || 
        window.outerWidth - window.innerWidth > 200) {
      if (!devtools.open) {
        devtools.open = true;
        console.warn('Developer tools detected - enhanced monitoring active');
      }
    } else {
      devtools.open = false;
    }
  }, 1000);
}

function initializeCSRFProtection(): void {
  // Generate CSRF token
  const csrfToken = generateSecureSessionId();
  
  // Store CSRF token securely
  sessionStorage.setItem('csrf_token', csrfToken);
  
  // Add CSRF token to all fetch requests
  const originalFetch = window.fetch;
  window.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const token = sessionStorage.getItem('csrf_token');
    if (token && init) {
      init.headers = {
        ...init.headers,
        'X-CSRF-Token': token
      };
    }
    return originalFetch.call(this, input, init);
  };
}

function initializeClickjackingProtection(): void {
  // Detect if running in an iframe
  if (window !== window.top) {
    console.error('Clickjacking attempt detected - application cannot run in iframe');
    document.body.innerHTML = '<div style="padding: 20px; text-align: center; color: red; font-size: 18px;">Security Error: This application cannot be embedded in frames for security reasons.</div>';
    return;
  }
  
  // Prevent the page from being embedded in frames
  if (window.self !== window.top) {
    window.top!.location = window.location;
  }
}

export function sanitizeUserInput(input: string): string {
  if (!CLIENT_SECURITY_CONFIG.enableInputSanitization) {
    return input;
  }
  
  // HTML entity encoding
  const div = document.createElement('div');
  div.textContent = input;
  let sanitized = div.innerHTML;
  
  // Additional sanitization patterns
  sanitized = sanitized
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  
  return sanitized;
}

export function validateSecureRequest(): boolean {
  if (!securityContext) {
    console.error('Security context not initialized');
    return false;
  }
  
  const now = Date.now();
  
  // Check if blocked
  if (securityContext.blockedUntil && now < securityContext.blockedUntil) {
    console.warn('Request blocked due to suspicious activity');
    return false;
  }
  
  // Check session duration
  if (now - securityContext.lastActivity > CLIENT_SECURITY_CONFIG.maxInactivity) {
    console.warn('Session expired due to inactivity');
    resetSecurityContext();
    return false;
  }
  
  // Update activity tracking
  securityContext.requestCount++;
  securityContext.lastActivity = now;
  
  // Check request limits
  if (securityContext.requestCount > CLIENT_SECURITY_CONFIG.maxRequestsPerSession) {
    console.warn('Session request limit exceeded');
    blockTemporarily();
    return false;
  }
  
  return true;
}

function recordSuspiciousActivity(): void {
  if (!securityContext) return;
  
  securityContext.suspiciousActivity = true;
  
  console.warn('Suspicious activity recorded', {
    sessionId: securityContext.sessionId,
    timestamp: new Date().toISOString()
  });
  
  // Auto-block after threshold
  if (securityContext.requestCount > CLIENT_SECURITY_CONFIG.suspiciousActivityThreshold) {
    blockTemporarily();
  }
}

function blockTemporarily(): void {
  if (!securityContext) return;
  
  securityContext.blockedUntil = Date.now() + CLIENT_SECURITY_CONFIG.autoBlockDuration;
  
  console.error('Temporarily blocked due to suspicious activity', {
    sessionId: securityContext.sessionId,
    blockedUntil: new Date(securityContext.blockedUntil).toISOString()
  });
}

function resetSecurityContext(): void {
  securityContext = null;
  sessionStorage.removeItem('csrf_token');
  initializeClientSecurity();
}

function performSecurityHealthCheck(): void {
  if (!securityContext) return;
  
  const now = Date.now();
  
  // Check for tampering with security context
  if (!securityContext.sessionId || securityContext.sessionId.length !== 64) {
    console.error('Security context tampering detected');
    resetSecurityContext();
    return;
  }
  
  // Verify CSRF token integrity
  const csrfToken = sessionStorage.getItem('csrf_token');
  if (!csrfToken || csrfToken.length !== 64) {
    console.warn('CSRF token integrity check failed');
    initializeCSRFProtection();
  }
  
  // Clean up expired blocked status
  if (securityContext.blockedUntil && now > securityContext.blockedUntil) {
    delete securityContext.blockedUntil;
    console.info('Temporary block expired');
  }
}

// Secure local storage wrapper
export const SecureStorage = {
  setItem(key: string, value: string): boolean {
    try {
      if (!validateSecureRequest()) return false;
      
      // Encrypt sensitive data (simplified)
      const encryptedValue = btoa(encodeURIComponent(value));
      localStorage.setItem(`secure_${key}`, encryptedValue);
      return true;
    } catch (error) {
      console.error('Secure storage error:', error);
      return false;
    }
  },
  
  getItem(key: string): string | null {
    try {
      if (!validateSecureRequest()) return null;
      
      const encryptedValue = localStorage.getItem(`secure_${key}`);
      if (!encryptedValue) return null;
      
      // Decrypt data (simplified)
      return decodeURIComponent(atob(encryptedValue));
    } catch (error) {
      console.error('Secure storage retrieval error:', error);
      return null;
    }
  },
  
  removeItem(key: string): boolean {
    try {
      localStorage.removeItem(`secure_${key}`);
      return true;
    } catch (error) {
      console.error('Secure storage removal error:', error);
      return false;
    }
  }
};

// Export security context getter (read-only)
export function getSecurityContext(): Readonly<SecurityContext> | null {
  return securityContext;
}

// Initialize when module loads
if (typeof window !== 'undefined' && document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeClientSecurity);
} else if (typeof window !== 'undefined') {
  // DOM is already loaded
  initializeClientSecurity();
}