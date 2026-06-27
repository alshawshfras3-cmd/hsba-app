import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function usePwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Detect standalone mode (already installed)
  const checkIsInstalled = () => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIosStandalone = (window.navigator as any).standalone === true;
    return isStandalone || isIosStandalone;
  };

  useEffect(() => {
    // Initial check for installation status
    setIsInstalled(checkIsInstalled());

    // Check localStorage dismissed timestamp
    try {
      const dismissedAt = localStorage.getItem('hesba_pwa_dismissed_at');
      if (dismissedAt) {
        const dismissTime = parseInt(dismissedAt, 10);
        const isStillDismissed = Date.now() - dismissTime < 7 * 24 * 60 * 60 * 1000; // 7 days
        setIsDismissed(isStillDismissed);
      }
    } catch (e) {
      console.warn('Failed to read hesba_pwa_dismissed_at from localStorage:', e);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setCanInstall(false);
      try {
        localStorage.setItem('hesba_pwa_installed', 'true');
      } catch (e) {
        console.warn('Failed to save hesba_pwa_installed in localStorage:', e);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Watch for display mode changes (standalone vs browser)
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      setIsInstalled(e.matches);
    };
    mediaQuery.addEventListener('change', handleMediaChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      mediaQuery.removeEventListener('change', handleMediaChange);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return false;

    deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    
    if (choiceResult.outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setCanInstall(false);
      return true;
    } else {
      // If user dismissed browser prompt, also count as dismissed for 7 days
      dismissInstallPrompt();
      return false;
    }
  };

  const dismissInstallPrompt = () => {
    try {
      localStorage.setItem('hesba_pwa_dismissed_at', Date.now().toString());
    } catch (e) {
      console.warn('Failed to save hesba_pwa_dismissed_at in localStorage:', e);
    }
    setIsDismissed(true);
  };

  // Safe manual trigger to reset dismissal for settings trigger
  const resetDismissalAndPrompt = () => {
    try {
      localStorage.removeItem('hesba_pwa_dismissed_at');
    } catch (e) {
      console.warn('Failed to remove hesba_pwa_dismissed_at from localStorage:', e);
    }
    setIsDismissed(false);
  };

  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isIosSafari = isIos && isSafari;

  const shouldShowPrompt = !isInstalled && !isDismissed && (canInstall || isIosSafari);

  return {
    canInstall,
    isInstalled,
    isIosSafari,
    promptInstall,
    dismissInstallPrompt,
    shouldShowPrompt,
    resetDismissalAndPrompt,
  };
}
