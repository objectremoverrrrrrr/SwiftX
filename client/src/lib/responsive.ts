// Comprehensive Responsive Design Utilities for All Devices

import { useState, useEffect, useCallback } from 'react';

// Device breakpoints optimized for all screen sizes
export const BREAKPOINTS = {
  // Mobile devices
  xs: '0px',        // 0px and up (phones in portrait)
  sm: '640px',      // 640px and up (phones in landscape, small tablets)
  
  // Tablet devices  
  md: '768px',      // 768px and up (tablets in portrait)
  lg: '1024px',     // 1024px and up (tablets in landscape, small laptops)
  
  // Desktop devices
  xl: '1280px',     // 1280px and up (laptops, desktops)
  '2xl': '1536px',  // 1536px and up (large desktops, 4K)
  
  // Ultra-wide and specialized
  '3xl': '1920px',  // 1920px and up (ultra-wide monitors)
  '4xl': '2560px',  // 2560px and up (4K displays)
} as const;

// Device type detection
export type DeviceType = 'mobile' | 'tablet' | 'laptop' | 'desktop' | 'ultrawide';

export function getDeviceType(width: number): DeviceType {
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  if (width < 1536) return 'laptop';
  if (width < 1920) return 'desktop';
  return 'ultrawide';
}

// Touch device detection
export function isTouchDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

// Screen orientation detection
export type Orientation = 'portrait' | 'landscape';

export function getOrientation(width: number, height: number): Orientation {
  return height > width ? 'portrait' : 'landscape';
}

// Responsive hook for device detection
export function useResponsive() {
  const [screenSize, setScreenSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  });

  const updateScreenSize = useCallback(() => {
    setScreenSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });
  }, []);

  useEffect(() => {
    window.addEventListener('resize', updateScreenSize);
    return () => window.removeEventListener('resize', updateScreenSize);
  }, [updateScreenSize]);

  const { width, height } = screenSize;
  const deviceType = getDeviceType(width);
  const orientation = getOrientation(width, height);
  const isTouch = isTouchDevice();

  return {
    width,
    height,
    deviceType,
    orientation,
    isTouch,
    
    // Convenience flags
    isMobile: deviceType === 'mobile',
    isTablet: deviceType === 'tablet',
    isLaptop: deviceType === 'laptop',
    isDesktop: deviceType === 'desktop' || deviceType === 'ultrawide',
    isPortrait: orientation === 'portrait',
    isLandscape: orientation === 'landscape',
    
    // Breakpoint checks
    isXs: width >= 0,
    isSm: width >= 640,
    isMd: width >= 768,
    isLg: width >= 1024,
    isXl: width >= 1280,
    is2xl: width >= 1536,
    is3xl: width >= 1920,
    is4xl: width >= 2560,
  };
}

// Safe area detection for mobile devices
export function useSafeArea() {
  const [safeArea, setSafeArea] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  });

  useEffect(() => {
    const updateSafeArea = () => {
      // Get CSS environment variables for safe areas
      const computedStyle = getComputedStyle(document.documentElement);
      
      setSafeArea({
        top: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-top)') || '0'),
        bottom: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-bottom)') || '0'),
        left: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-left)') || '0'),
        right: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-right)') || '0'),
      });
    };

    updateSafeArea();
    window.addEventListener('resize', updateSafeArea);
    return () => window.removeEventListener('resize', updateSafeArea);
  }, []);

  return safeArea;
}

// Responsive container component props
export interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: keyof typeof BREAKPOINTS;
  padding?: {
    mobile?: string;
    tablet?: string;
    desktop?: string;
  };
}

// Responsive spacing utilities
export const RESPONSIVE_SPACING = {
  // Padding for different devices
  container: {
    mobile: 'px-4 py-4',      // 16px horizontal, 16px vertical
    tablet: 'px-6 py-6',      // 24px horizontal, 24px vertical  
    desktop: 'px-8 py-8',     // 32px horizontal, 32px vertical
  },
  
  // Margins for different devices
  section: {
    mobile: 'mb-6',           // 24px bottom
    tablet: 'mb-8',           // 32px bottom
    desktop: 'mb-12',         // 48px bottom
  },
  
  // Grid gaps
  grid: {
    mobile: 'gap-4',          // 16px gap
    tablet: 'gap-6',          // 24px gap
    desktop: 'gap-8',         // 32px gap
  },
} as const;

// Responsive typography classes
export const RESPONSIVE_TEXT = {
  // Headings that scale with screen size
  h1: {
    mobile: 'text-2xl font-bold',      // 24px
    tablet: 'text-3xl font-bold',      // 30px
    desktop: 'text-4xl font-bold',     // 36px
  },
  
  h2: {
    mobile: 'text-xl font-semibold',   // 20px
    tablet: 'text-2xl font-semibold',  // 24px
    desktop: 'text-3xl font-semibold', // 30px
  },
  
  h3: {
    mobile: 'text-lg font-medium',     // 18px
    tablet: 'text-xl font-medium',     // 20px
    desktop: 'text-2xl font-medium',   // 24px
  },
  
  // Body text
  body: {
    mobile: 'text-sm',                 // 14px
    tablet: 'text-base',               // 16px
    desktop: 'text-lg',                // 18px
  },
  
  // Small text (captions, labels)
  small: {
    mobile: 'text-xs',                 // 12px
    tablet: 'text-sm',                 // 14px
    desktop: 'text-base',              // 16px
  },
} as const;

// Touch-friendly button sizes
export const RESPONSIVE_BUTTONS = {
  // Minimum touch target: 44x44px (iOS), 48x48px (Android)
  small: {
    mobile: 'h-12 px-4 text-sm',      // 48px height, good touch target
    tablet: 'h-10 px-3 text-sm',      // 40px height  
    desktop: 'h-9 px-3 text-sm',      // 36px height
  },
  
  medium: {
    mobile: 'h-14 px-6 text-base',    // 56px height, excellent touch target
    tablet: 'h-12 px-5 text-base',    // 48px height
    desktop: 'h-10 px-4 text-base',   // 40px height
  },
  
  large: {
    mobile: 'h-16 px-8 text-lg',      // 64px height, premium touch target
    tablet: 'h-14 px-7 text-lg',      // 56px height
    desktop: 'h-12 px-6 text-lg',     // 48px height
  },
} as const;

// Input field responsive sizing
export const RESPONSIVE_INPUTS = {
  // Text inputs with good touch targets
  text: {
    mobile: 'h-12 px-4 text-base',    // 48px height, 16px text (no zoom on iOS)
    tablet: 'h-11 px-4 text-base',    // 44px height
    desktop: 'h-10 px-3 text-sm',     // 40px height, 14px text
  },
  
  // Textarea sizing
  textarea: {
    mobile: 'min-h-24 p-4 text-base', // 96px minimum height
    tablet: 'min-h-20 p-3 text-base', // 80px minimum height
    desktop: 'min-h-16 p-3 text-sm',  // 64px minimum height
  },
} as const;

// Grid responsive patterns
export const RESPONSIVE_GRIDS = {
  // Auto-fit columns with min widths
  cards: {
    mobile: 'grid-cols-1',                    // 1 column
    tablet: 'grid-cols-2',                    // 2 columns
    desktop: 'grid-cols-3 xl:grid-cols-4',    // 3-4 columns
  },
  
  // Feature lists
  features: {
    mobile: 'grid-cols-1',                    // 1 column
    tablet: 'grid-cols-2',                    // 2 columns  
    desktop: 'grid-cols-3',                   // 3 columns
  },
  
  // Stats or metrics
  stats: {
    mobile: 'grid-cols-2',                    // 2 columns
    tablet: 'grid-cols-4',                    // 4 columns
    desktop: 'grid-cols-4 xl:grid-cols-6',    // 4-6 columns
  },
} as const;

// Responsive utility functions
export function getResponsiveClass<T extends Record<string, Record<string, string>>>(
  config: T,
  key: keyof T,
  deviceType: DeviceType
): string {
  const styles = config[key];
  
  if (deviceType === 'mobile') return styles.mobile || '';
  if (deviceType === 'tablet') return styles.tablet || styles.mobile || '';
  
  // Desktop includes laptop, desktop, and ultrawide
  return styles.desktop || styles.tablet || styles.mobile || '';
}

// Create responsive className string
export function createResponsiveClass(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

// Responsive image utilities
export const RESPONSIVE_IMAGES = {
  // Aspect ratios for different devices
  hero: {
    mobile: 'aspect-[4/3]',      // 4:3 ratio for mobile
    tablet: 'aspect-[3/2]',      // 3:2 ratio for tablet
    desktop: 'aspect-[21/9]',    // 21:9 ratio for desktop
  },
  
  card: {
    mobile: 'aspect-square',     // 1:1 ratio
    tablet: 'aspect-[4/3]',     // 4:3 ratio
    desktop: 'aspect-[3/2]',    // 3:2 ratio
  },
  
  thumbnail: {
    mobile: 'aspect-square',     // 1:1 ratio for all devices
    tablet: 'aspect-square',
    desktop: 'aspect-square',
  },
} as const;

export default {
  BREAKPOINTS,
  getDeviceType,
  isTouchDevice,
  getOrientation,
  useResponsive,
  useSafeArea,
  RESPONSIVE_SPACING,
  RESPONSIVE_TEXT,
  RESPONSIVE_BUTTONS,
  RESPONSIVE_INPUTS,
  RESPONSIVE_GRIDS,
  RESPONSIVE_IMAGES,
  getResponsiveClass,
  createResponsiveClass,
};