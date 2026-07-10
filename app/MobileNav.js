'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useHR } from './context';

export default function MobileNav() {
  const [isStandalone, setIsStandalone] = useState(false);
  const pathname = usePathname();
  const { notifications, drawerOpen, setDrawerOpen, markAllRead } = useHR();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isMqlStandalone = window.matchMedia('(display-mode: standalone)').matches 
        || window.navigator.standalone 
        || document.referrer.includes('android-app://');
      setIsStandalone(!!isMqlStandalone);
    }
  }, []);

  const unreadCount = notifications ? notifications.filter(n => !n.isRead).length : 0;

  const toggleNotifications = () => {
    if (drawerOpen) {
      setDrawerOpen(false);
    } else {
      setDrawerOpen(true);
      markAllRead();
    }
  };

  return (
    <nav 
      className="mobile-bottom-nav"
      style={{
        bottom: isStandalone 
          ? 'max(1.5rem, env(safe-area-inset-bottom, 24px))' 
          : 'max(0.5rem, env(safe-area-inset-bottom, 0px))',
      }}
    >
      {/* Dashboard Link */}
      <Link href="/" className={`mobile-nav-item ${pathname === '/' ? 'active' : ''}`}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        <span>Dashboard</span>
      </Link>

      {/* Add Employee Button (Center) */}
      <Link href="/employees/add" className="mobile-nav-center-btn" title="Add Employee">
        <div className="center-btn-gradient">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </div>
      </Link>

      {/* Notifications Button */}
      <button onClick={toggleNotifications} className={`mobile-nav-item ${drawerOpen ? 'active' : ''}`}>
        <div className="notif-icon-wrapper">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
        </div>
        <span>Alerts</span>
      </button>
    </nav>
  );
}
