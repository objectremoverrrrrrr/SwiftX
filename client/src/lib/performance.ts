// Advanced Performance Optimizations for 240Hz Smooth Experience

import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { debounce, throttle } from 'lodash-es';

// High refresh rate optimizations
export const PERFORMANCE_CONFIG = {
  HIGH_REFRESH_RATE: 240, // Target 240Hz
  ANIMATION_DURATION: 150, // Optimized for high refresh rates
  DEBOUNCE_DELAY: 100,    // Reduced for responsiveness
  THROTTLE_DELAY: 16,     // ~240fps = 4.16ms, using 16ms for safety
  CHUNK_SIZE: 1000,       // Process data in chunks
  MAX_RENDER_ITEMS: 100,  // Virtual scrolling limit
};

// Optimized debounced hook
export function useOptimizedDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = PERFORMANCE_CONFIG.DEBOUNCE_DELAY
): T {
  const debouncedCallback = useRef<ReturnType<typeof debounce>>();
  
  useEffect(() => {
    debouncedCallback.current = debounce(callback, delay, {
      leading: false,
      trailing: true,
    });
    
    return () => {
      debouncedCallback.current?.cancel();
    };
  }, [callback, delay]);
  
  return useCallback((...args: Parameters<T>) => {
    debouncedCallback.current?.(...args);
  }, []) as T;
}

// High-performance throttled hook
export function useOptimizedThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = PERFORMANCE_CONFIG.THROTTLE_DELAY
): T {
  const throttledCallback = useRef<ReturnType<typeof throttle>>();
  
  useEffect(() => {
    throttledCallback.current = throttle(callback, delay, {
      leading: true,
      trailing: true,
    });
    
    return () => {
      throttledCallback.current?.cancel();
    };
  }, [callback, delay]);
  
  return useCallback((...args: Parameters<T>) => {
    throttledCallback.current?.(...args);
  }, []) as T;
}

// Virtual scrolling hook for large datasets
export function useVirtualScrolling<T>(
  items: T[],
  containerHeight: number = 400,
  itemHeight: number = 50
) {
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleItems = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 5, // Buffer items
      items.length
    );
    
    return {
      startIndex,
      endIndex,
      visibleItems: items.slice(startIndex, endIndex),
      totalHeight: items.length * itemHeight,
      offsetY: startIndex * itemHeight,
    };
  }, [items, scrollTop, itemHeight, containerHeight]);
  
  const handleScroll = useOptimizedThrottle((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  });
  
  return { ...visibleItems, handleScroll };
}

// Performance monitoring hook
export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState({
    fps: 0,
    renderTime: 0,
    memoryUsage: 0,
  });
  
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const observer = useRef<PerformanceObserver | null>(null);
  
  useEffect(() => {
    // FPS tracking
    const measureFPS = () => {
      frameCount.current++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime.current >= 1000) {
        const fps = Math.round((frameCount.current * 1000) / (currentTime - lastTime.current));
        frameCount.current = 0;
        lastTime.current = currentTime;
        
        setMetrics(prev => ({
          ...prev,
          fps,
          memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
        }));
      }
      
      requestAnimationFrame(measureFPS);
    };
    
    // Performance observer for render timing
    if ('PerformanceObserver' in window) {
      observer.current = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const renderTime = entries.reduce((sum, entry) => sum + entry.duration, 0) / entries.length;
        
        setMetrics(prev => ({ ...prev, renderTime }));
      });
      
      observer.current.observe({ entryTypes: ['measure'] });
    }
    
    const animationId = requestAnimationFrame(measureFPS);
    
    return () => {
      cancelAnimationFrame(animationId);
      observer.current?.disconnect();
    };
  }, []);
  
  return metrics;
}

// Memory cleanup hook
export function useMemoryCleanup() {
  const cleanup = useCallback(() => {
    // Force garbage collection if available
    if ('gc' in window) {
      (window as any).gc();
    }
    
    // Clear any lingering timers
    const highestTimeoutId = window.setTimeout(() => {}, 0);
    for (let i = 0; i < highestTimeoutId; i++) {
      window.clearTimeout(i);
    }
    
    // Clear intervals
    const highestIntervalId = window.setInterval(() => {}, 0);
    for (let i = 0; i < highestIntervalId; i++) {
      window.clearInterval(i);
    }
  }, []);
  
  useEffect(() => {
    return cleanup;
  }, [cleanup]);
  
  return cleanup;
}

// Optimized intersection observer for lazy loading
export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const elementRef = useRef<HTMLElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  
  useEffect(() => {
    if (!elementRef.current) return;
    
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options,
      }
    );
    
    observerRef.current.observe(elementRef.current);
    
    return () => {
      observerRef.current?.disconnect();
    };
  }, [options]);
  
  return [elementRef, isIntersecting] as const;
}

// Smooth animation helper
export function createSmoothAnimation(
  element: HTMLElement,
  property: string,
  from: string | number,
  to: string | number,
  duration: number = PERFORMANCE_CONFIG.ANIMATION_DURATION
): Promise<void> {
  return new Promise((resolve) => {
    const startTime = performance.now();
    const startValue = typeof from === 'number' ? from : parseFloat(from as string);
    const endValue = typeof to === 'number' ? to : parseFloat(to as string);
    const change = endValue - startValue;
    
    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Smooth easing function optimized for 240Hz
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (change * easeProgress);
      
      (element.style as any)[property] = typeof to === 'number' 
        ? `${currentValue}px`
        : `${currentValue}${typeof to === 'string' ? to.replace(/[0-9.-]/g, '') : 'px'}`;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        resolve();
      }
    }
    
    requestAnimationFrame(animate);
  });
}

// Batch DOM updates for better performance
export function useBatchedUpdates() {
  const updates = useRef<(() => void)[]>([]);
  const frameId = useRef<number>();
  
  const batchUpdate = useCallback((update: () => void) => {
    updates.current.push(update);
    
    if (!frameId.current) {
      frameId.current = requestAnimationFrame(() => {
        updates.current.forEach(update => update());
        updates.current = [];
        frameId.current = undefined;
      });
    }
  }, []);
  
  useEffect(() => {
    return () => {
      if (frameId.current) {
        cancelAnimationFrame(frameId.current);
      }
    };
  }, []);
  
  return batchUpdate;
}

// CSS-in-JS optimization for critical styles
export const CRITICAL_STYLES = {
  smoothScrolling: {
    scrollBehavior: 'smooth',
    WebkitOverflowScrolling: 'touch',
    overflowScrolling: 'touch',
  },
  gpuAcceleration: {
    transform: 'translateZ(0)',
    willChange: 'transform, opacity',
    backfaceVisibility: 'hidden' as const,
    perspective: '1000px',
  },
  optimizedAnimation: {
    animationFillMode: 'both' as const,
    animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
    transitionProperty: 'transform, opacity, filter',
    transitionDuration: `${PERFORMANCE_CONFIG.ANIMATION_DURATION}ms`,
    transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  highDPI: {
    imageRendering: 'crisp-edges' as const,
    textRendering: 'optimizeLegibility' as const,
  },
} as const;

// High-performance component wrapper  
export function withPerformanceOptimization<T extends Record<string, any>>(
  Component: React.ComponentType<T>
) {
  const MemoizedComponent = React.memo(
    React.forwardRef<any, T>((props, ref) => {
      const memoizedProps = useMemo(() => props, [props]);
      return React.createElement(Component, { ...memoizedProps, ref } as any);
    }),
    (prevProps: any, nextProps: any) => {
      // Shallow comparison optimized for common cases
      const prevKeys = Object.keys(prevProps);
      const nextKeys = Object.keys(nextProps);
      
      if (prevKeys.length !== nextKeys.length) {
        return false;
      }
      
      for (const key of prevKeys) {
        if (prevProps[key] !== nextProps[key]) {
          // Deep comparison for arrays if needed
          if (Array.isArray(prevProps[key]) && Array.isArray(nextProps[key])) {
            if (JSON.stringify(prevProps[key]) !== JSON.stringify(nextProps[key])) {
              return false;
            }
          } else {
            return false;
          }
        }
      }
      
      return true;
    }
  );
  
  MemoizedComponent.displayName = `withPerformanceOptimization(${Component.displayName || Component.name})`;
  return MemoizedComponent;
}

export default {
  PERFORMANCE_CONFIG,
  useOptimizedDebounce,
  useOptimizedThrottle,
  useVirtualScrolling,
  usePerformanceMonitor,
  useMemoryCleanup,
  useIntersectionObserver,
  createSmoothAnimation,
  useBatchedUpdates,
  CRITICAL_STYLES,
  withPerformanceOptimization,
};