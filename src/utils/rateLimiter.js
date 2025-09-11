// Simple in-memory rate limiter for form submissions
class RateLimiter {
  constructor(maxAttempts = 5, windowMs = 60 * 60 * 1000) { // 5 attempts per hour by default
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    this.attempts = new Map(); // Store attempts by IP
    this.cleanupInterval = setInterval(() => this.cleanup(), 15 * 60 * 1000); // Cleanup every 15 minutes
  }

  // Get client IP from request
  getClientIP(request) {
    // Try different headers for IP detection
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const clientIP = request.headers.get('x-client-ip');
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    if (realIP) return realIP;
    if (clientIP) return clientIP;
    
    // Fallback to connection remote address (not always available in serverless)
    return request.headers.get('cf-connecting-ip') || 'unknown';
  }

  // Check if request is allowed
  isAllowed(request) {
    const ip = this.getClientIP(request);
    const now = Date.now();
    
    // Get or create attempt record for this IP
    if (!this.attempts.has(ip)) {
      this.attempts.set(ip, []);
    }
    
    const ipAttempts = this.attempts.get(ip);
    
    // Remove expired attempts (outside the time window)
    const validAttempts = ipAttempts.filter(timestamp => 
      now - timestamp < this.windowMs
    );
    
    // Update the attempts array
    this.attempts.set(ip, validAttempts);
    
    // Check if limit exceeded
    if (validAttempts.length >= this.maxAttempts) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: validAttempts[0] + this.windowMs
      };
    }
    
    // Record this attempt
    validAttempts.push(now);
    this.attempts.set(ip, validAttempts);
    
    return {
      allowed: true,
      remaining: this.maxAttempts - validAttempts.length,
      resetTime: now + this.windowMs
    };
  }

  // Clean up expired records to prevent memory leaks
  cleanup() {
    const now = Date.now();
    for (const [ip, attempts] of this.attempts.entries()) {
      const validAttempts = attempts.filter(timestamp => 
        now - timestamp < this.windowMs
      );
      
      if (validAttempts.length === 0) {
        this.attempts.delete(ip);
      } else {
        this.attempts.set(ip, validAttempts);
      }
    }
  }

  // Get current status for an IP
  getStatus(request) {
    const ip = this.getClientIP(request);
    const attempts = this.attempts.get(ip) || [];
    const now = Date.now();
    
    const validAttempts = attempts.filter(timestamp => 
      now - timestamp < this.windowMs
    );
    
    return {
      attempts: validAttempts.length,
      remaining: Math.max(0, this.maxAttempts - validAttempts.length),
      resetTime: validAttempts.length > 0 ? validAttempts[0] + this.windowMs : now
    };
  }

  // Cleanup on shutdown
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// Create a singleton instance
const formRateLimiter = new RateLimiter(5, 60 * 60 * 1000); // 5 attempts per hour

export default formRateLimiter;