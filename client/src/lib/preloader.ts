// Preloader for critical resources
export const preloadCriticalResources = () => {
  // Preload critical components that are likely to be used
  const preloadComponents = [
    () => import('@/components/text-encoder'),
    () => import('@/lib/decoder'),
    () => import('@/lib/encoder')
  ];

  // Only preload on idle or after user interaction
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      preloadComponents.forEach(loader => loader().catch(() => {}));
    });
  } else {
    // Fallback for older browsers
    setTimeout(() => {
      preloadComponents.forEach(loader => loader().catch(() => {}));
    }, 2000);
  }
};

// Preload critical fonts and assets
export const preloadAssets = () => {
  // Only preload if fonts exist, otherwise skip to avoid 404s
  if (document.querySelector('link[href*="font"]')) {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'font';
    link.crossOrigin = 'anonymous';
    link.href = '/fonts/critical-font.woff2';
    document.head.appendChild(link);
  }
};