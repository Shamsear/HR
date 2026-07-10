'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useHR } from './context';

/* Persistent desktop app shell: left sidebar + content area.
   Hidden on /login and while unauthenticated; mobile uses MobileNav instead. */
export default function AppFrame({ children }) {
  const pathname = usePathname();
  const { isAuthenticated, darkMode, toggleTheme, logout } = useHR();

  const showChrome = isAuthenticated && pathname !== '/login';

  if (!showChrome) return <>{children}</>;

  const nav = [
    {
      href: '/', label: 'Dashboard', match: (p) => p === '/',
      icon: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></>,
    },
    {
      href: '/vacations', label: 'Vacations', match: (p) => p.startsWith('/vacations'),
      icon: <><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>,
    },
    {
      href: '/calendar', label: 'Calendar', match: (p) => p.startsWith('/calendar'),
      icon: <><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>,
    },
    {
      href: '/employees/add', label: 'Add Employee', match: (p) => p.startsWith('/employees/add'),
      icon: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="16" y1="11" x2="22" y2="11" /></>,
    },
  ];

  return (
    <div className="app-frame">
      <aside className="side-nav">
        <Link href="/" className="side-brand">
          <span className="side-brand-logo">HR</span>
          <span className="side-brand-text">
            <strong>HR Portal</strong>
            <small>Qatar · Vacation &amp; EOS</small>
          </span>
        </Link>

        <nav className="side-links">
          <span className="side-section">Menu</span>
          {nav.map(item => (
            <Link key={item.href} href={item.href} className={`side-link ${item.match(pathname) ? 'active' : ''}`}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{item.icon}</svg>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="side-foot">
          <button className="side-link" onClick={toggleTheme}>
            {darkMode
              ? <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></svg>
              : <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a9 9 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>}
            <span>{darkMode ? 'Light mode' : 'Dark mode'}</span>
          </button>
          <button className="side-link danger" onClick={logout}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <div className="app-content">{children}</div>
    </div>
  );
}
