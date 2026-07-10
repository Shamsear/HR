'use client';

import { useEffect, useState } from 'react';

export default function PWARegistry() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [swRegistration, setSwRegistration] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          setSwRegistration(reg);

          // Check if an update has completed loading in background
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setUpdateAvailable(true); // Staged and waiting
                }
              });
            }
          });
        })
        .catch((err) => {
          console.error('[PWA] Service Worker registration failed:', err);
        });
    }
  }, []);

  const refreshServiceWorker = () => {
    if (swRegistration && swRegistration.waiting) {
      // Send message to SW to activate new cache files
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  };

  return updateAvailable ? (
    <div className="pwa-update-banner">
      <span>A new version of the app is available!</span>
      <button onClick={refreshServiceWorker} className="btn btn-primary btn-pwa-refresh">
        Refresh
      </button>
    </div>
  ) : null;
}
