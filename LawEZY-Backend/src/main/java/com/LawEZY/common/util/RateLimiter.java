package com.LawEZY.common.util;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.stereotype.Component;

/**
 * Institutional Rate Limiter (Tactical In-Memory implementation)
 * Prevents brute-force attacks on sensitive endpoints like Login/Signup.
 */
@Component
public class RateLimiter {
    private final ConcurrentHashMap<String, RateInfo> cache = new ConcurrentHashMap<>();

    private static class RateInfo {
        AtomicInteger count = new AtomicInteger(0);
        long lastReset = System.currentTimeMillis();
    }

    /**
     * Checks if the given identifier (IP or Email) has exceeded the limit.
     * @param key Unique identifier for the rate limit bucket.
     * @param limit Max attempts allowed within the window.
     * @param windowMs Time window in milliseconds.
     * @return true if allowed, false if limited.
     */
    public boolean isAllowed(String key, int limit, long windowMs) {
        RateInfo info = cache.computeIfAbsent(key, k -> new RateInfo());
        
        long now = System.currentTimeMillis();
        if (now - info.lastReset > windowMs) {
            info.count.set(0);
            info.lastReset = now;
        }

        return info.count.incrementAndGet() <= limit;
    }

    /**
     * Resets the limit for a key (e.g., after a successful login).
     */
    public void reset(String key) {
        cache.remove(key);
    }
}
