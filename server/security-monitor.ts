// Server-side Security Monitor
// Tracks security events and implements automated threat response

interface SecurityEvent {
  id: string;
  timestamp: number;
  type: 'rate_limit' | 'malicious_input' | 'suspicious_pattern' | 'blocked_request';
  severity: 'low' | 'medium' | 'high' | 'critical';
  clientId: string;
  details: any;
  resolved: boolean;
}

interface SecurityMetrics {
  totalEvents: number;
  criticalEvents: number;
  blockedRequests: number;
  uniqueThreats: number;
  lastUpdate: number;
}

class SecurityMonitor {
  private events: Map<string, SecurityEvent> = new Map();
  private clientStats: Map<string, { requests: number; blocked: number; lastSeen: number }> = new Map();
  private blockedClients: Set<string> = new Set();
  
  private readonly MAX_EVENTS = 10000;
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly AUTO_BLOCK_THRESHOLD = 10;
  private readonly BLOCK_DURATION = 30 * 60 * 1000; // 30 minutes
  
  constructor() {
    // Periodic cleanup
    setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL);
  }
  
  recordEvent(type: SecurityEvent['type'], severity: SecurityEvent['severity'], clientId: string, details: any): string {
    const eventId = this.generateEventId();
    const event: SecurityEvent = {
      id: eventId,
      timestamp: Date.now(),
      type,
      severity,
      clientId,
      details,
      resolved: false
    };
    
    this.events.set(eventId, event);
    this.updateClientStats(clientId);
    
    // Log to console with appropriate level
    const logLevel = severity === 'critical' ? 'error' : severity === 'high' ? 'warn' : 'info';
    console[logLevel](`Security Event [${severity.toUpperCase()}]: ${type}`, {
      eventId,
      clientId,
      details,
      timestamp: new Date(event.timestamp).toISOString()
    });
    
    // Auto-block for critical events or repeated offenses
    if (severity === 'critical' || this.shouldAutoBlock(clientId)) {
      this.blockClient(clientId, `Auto-blocked due to ${type}`);
    }
    
    return eventId;
  }
  
  blockClient(clientId: string, reason: string): void {
    this.blockedClients.add(clientId);
    
    // Auto-unblock after duration
    setTimeout(() => {
      this.blockedClients.delete(clientId);
      console.info(`Auto-unblocked client: ${clientId}`);
    }, this.BLOCK_DURATION);
    
    console.warn(`Blocked client ${clientId}: ${reason}`);
  }
  
  isClientBlocked(clientId: string): boolean {
    return this.blockedClients.has(clientId);
  }
  
  getSecurityMetrics(): SecurityMetrics {
    const now = Date.now();
    const events = Array.from(this.events.values());
    
    return {
      totalEvents: events.length,
      criticalEvents: events.filter(e => e.severity === 'critical').length,
      blockedRequests: Array.from(this.clientStats.values()).reduce((sum, stats) => sum + stats.blocked, 0),
      uniqueThreats: new Set(events.map(e => e.type)).size,
      lastUpdate: now
    };
  }
  
  getClientEvents(clientId: string, limit: number = 50): SecurityEvent[] {
    return Array.from(this.events.values())
      .filter(event => event.clientId === clientId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }
  
  getRecentEvents(minutes: number = 60): SecurityEvent[] {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return Array.from(this.events.values())
      .filter(event => event.timestamp > cutoff)
      .sort((a, b) => b.timestamp - a.timestamp);
  }
  
  resolveEvent(eventId: string): boolean {
    const event = this.events.get(eventId);
    if (event) {
      event.resolved = true;
      console.info(`Security event resolved: ${eventId}`);
      return true;
    }
    return false;
  }
  
  private generateEventId(): string {
    return `sec_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
  
  private updateClientStats(clientId: string): void {
    const stats = this.clientStats.get(clientId) || { requests: 0, blocked: 0, lastSeen: 0 };
    stats.requests++;
    stats.lastSeen = Date.now();
    this.clientStats.set(clientId, stats);
  }
  
  private shouldAutoBlock(clientId: string): boolean {
    const events = Array.from(this.events.values()).filter(e => e.clientId === clientId);
    const recentCritical = events.filter(e => 
      e.severity === 'critical' && 
      Date.now() - e.timestamp < 10 * 60 * 1000 // Last 10 minutes
    ).length;
    
    const recentHigh = events.filter(e => 
      e.severity === 'high' && 
      Date.now() - e.timestamp < 30 * 60 * 1000 // Last 30 minutes
    ).length;
    
    return recentCritical >= 3 || recentHigh >= this.AUTO_BLOCK_THRESHOLD;
  }
  
  private cleanup(): void {
    const events = Array.from(this.events.entries());
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    
    // Remove old resolved events
    events.forEach(([id, event]) => {
      if (event.resolved && event.timestamp < cutoff) {
        this.events.delete(id);
      }
    });
    
    // Limit total events
    if (this.events.size > this.MAX_EVENTS) {
      const sortedEvents = Array.from(this.events.entries())
        .sort(([,a], [,b]) => a.timestamp - b.timestamp);
      
      const toRemove = sortedEvents.slice(0, this.events.size - this.MAX_EVENTS);
      toRemove.forEach(([id]) => this.events.delete(id));
    }
    
    // Clean up old client stats
    const clientEntries = Array.from(this.clientStats.entries());
    clientEntries.forEach(([clientId, stats]) => {
      if (Date.now() - stats.lastSeen > 7 * 24 * 60 * 60 * 1000) { // 7 days
        this.clientStats.delete(clientId);
      }
    });
    
    console.info('Security monitor cleanup completed', {
      totalEvents: this.events.size,
      trackedClients: this.clientStats.size,
      blockedClients: this.blockedClients.size
    });
  }
  
  // Security report generation
  generateSecurityReport(): {
    summary: SecurityMetrics;
    recentEvents: SecurityEvent[];
    topThreats: Array<{ type: string; count: number }>;
    clientActivity: Array<{ clientId: string; requests: number; blocked: number; lastSeen: string }>;
  } {
    const metrics = this.getSecurityMetrics();
    const recentEvents = this.getRecentEvents(60);
    
    // Top threats
    const threatCounts = new Map<string, number>();
    Array.from(this.events.values()).forEach(event => {
      const count = threatCounts.get(event.type) || 0;
      threatCounts.set(event.type, count + 1);
    });
    
    const topThreats = Array.from(threatCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // Client activity
    const clientActivity = Array.from(this.clientStats.entries())
      .map(([clientId, stats]) => ({
        clientId: clientId.substring(0, 8) + '...', // Partial ID for privacy
        requests: stats.requests,
        blocked: stats.blocked,
        lastSeen: new Date(stats.lastSeen).toISOString()
      }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 20);
    
    return {
      summary: metrics,
      recentEvents: recentEvents.slice(0, 50),
      topThreats,
      clientActivity
    };
  }
}

export const securityMonitor = new SecurityMonitor();