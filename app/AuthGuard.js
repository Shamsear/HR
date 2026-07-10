'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useHR } from './context';

export default function AuthGuard({ children }) {
  const { isAuthenticated, ready } = useHR();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (ready) {
      if (!isAuthenticated && pathname !== '/login') {
        router.push('/login');
      }
    }
  }, [ready, isAuthenticated, pathname, router]);

  if (!ready) {
    return (
      <div className="app-loading-screen">
        <div className="app-loading-spinner"></div>
        <p>Loading HR Portal...</p>
      </div>
    );
  }

  if (!isAuthenticated && pathname !== '/login') {
    return null; // Prevent flicker during redirection
  }

  return children;
}
