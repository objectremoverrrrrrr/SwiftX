import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cors from "cors";
import { securityMonitor } from "./security-monitor";

const app = express();

// Security middleware - MUST come first
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: "same-origin" }
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : true, // Allow all origins in dev
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400 // 24 hours
}));

// Global rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for static assets in development
    return process.env.NODE_ENV === 'development' && !req.path.startsWith('/api');
  },
  handler: (req, res) => {
    const clientId = req.ip || 'unknown';
    securityMonitor.recordEvent('rate_limit', 'medium', clientId, {
      path: req.path,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
    res.status(429).json({
      error: "Too many requests from this IP, please try again later.",
      retryAfter: 15 * 60
    });
  }
});

// API rate limiting (more strict)
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 API requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const clientId = req.ip || 'unknown';
    securityMonitor.recordEvent('rate_limit', 'high', clientId, {
      path: req.path,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      rateLimitType: 'api'
    });
    res.status(429).json({
      error: "Too many API requests, please slow down.",
      retryAfter: 60
    });
  }
});

app.use(globalLimiter);
app.use('/api', apiLimiter);

// Body parsing with size limits
app.use(express.json({ 
  limit: '10mb',
  verify: (req: any, res: Response, buf: Buffer, encoding: string) => {
    // Additional security check for JSON parsing
    if (buf && buf.length) {
      const bodyStr = buf.toString(encoding as BufferEncoding || 'utf8');
      // Check for potentially malicious patterns in raw body
      const suspiciousPatterns = [
        /__proto__/,
        /constructor/,
        /prototype/,
        /eval\(/,
        /Function\(/,
        /setTimeout\(/,
        /setInterval\(/
      ];
      
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(bodyStr)) {
          const clientId = req.ip || 'unknown';
          securityMonitor.recordEvent('malicious_input', 'critical', clientId, {
            path: req.path,
            pattern: pattern.source,
            userAgent: req.get('User-Agent')
          });
          res.status(400).json({ error: 'Potentially malicious content detected' });
          return;
        }
      }
    }
  }
}));

app.use(express.urlencoded({ 
  extended: false, 
  limit: '10mb',
  parameterLimit: 100 // Limit number of parameters
}));

// Additional security headers
app.use((req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions policy (disable potentially dangerous features)
  res.setHeader('Permissions-Policy', 
    'geolocation=(), microphone=(), camera=(), magnetometer=(), gyroscope=(), payment=()');
  
  // Remove server signature
  res.removeHeader('X-Powered-By');
  
  next();
});

// Security check middleware
app.use((req, res, next) => {
  const clientId = req.ip || 'unknown';
  
  // Check if client is blocked
  if (securityMonitor.isClientBlocked(clientId)) {
    securityMonitor.recordEvent('blocked_request', 'high', clientId, {
      path: req.path,
      userAgent: req.get('User-Agent')
    });
    return res.status(429).json({ 
      error: 'Access temporarily blocked due to suspicious activity',
      retryAfter: 1800 // 30 minutes
    });
  }
  
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
