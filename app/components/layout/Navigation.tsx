'use client';
/**
 * Navigation — top bar (desktop) and bottom bar (mobile).
 * Shows "After 7" badge when in night mode.
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '../ThemeProvider';
import { LogoSymbol } from '../ui/LogoSymbol';
import { ThemeToggle } from '../ui/ThemeToggle';
import { useEffect, useState } from 'react';

export function Navigation() {
  const pathname = usePathname();
  const { isAfter7 } = useTheme();
  const [unreadCount, setUnreadCount] = useState(0);

  // Poll for unread notifications
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch('/api/activity/unread');
        if (res.ok) {
          const data = await res.json() as { count: number };
          if (!cancelled) setUnreadCount(data.count);
        }
      } catch {}
    };
    check();
    const interval = setInterval(check, 60_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  function isActive(href: string) {
    return pathname === href ? 'page' : undefined;
  }

  return (
    <>
      {/* Top navigation */}
      <nav className="nav-top" aria-label="Main navigation">
        <div className="nav-top__inner">
          <Link href="/" className="logo" aria-label="Stillhere — Home">
            <LogoSymbol />
            STILLHERE
            {isAfter7 && (
              <span className="after7-badge" aria-label="After 7 — night mode active">
                After 7
              </span>
            )}
          </Link>

          <ul className="nav-links" role="list">
            <li>
              <Link href="/" aria-current={isActive('/')}>
                Home
              </Link>
            </li>
            <li>
              <Link href="/graveyard" aria-current={isActive('/graveyard')}>
                Graveyard
              </Link>
            </li>
            <li>
              <Link href="/my-activity" aria-current={isActive('/my-activity')} style={{ position: 'relative' }}>
                My Activity
                {unreadCount > 0 && (
                  <span className="badge" style={{ position: 'absolute', top: -8, right: -12 }} aria-label={`${unreadCount} unread notifications`}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            </li>
            <li>
              <ThemeToggle />
            </li>
          </ul>
        </div>
      </nav>

      {/* Mobile bottom navigation */}
      <nav className="nav-bottom" aria-label="Mobile navigation">
        <Link href="/" className="nav-bottom__item" aria-current={isActive('/')}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          Home
        </Link>

        <Link href="/" className="nav-bottom__item nav-bottom__item--post" aria-label="Write a post">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Post
        </Link>

        <Link href="/my-activity" className="nav-bottom__item" aria-current={isActive('/my-activity')} style={{ position: 'relative' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          {unreadCount > 0 && (
            <span className="badge" style={{ position: 'absolute', top: 4, right: '50%', marginRight: -22 }} aria-hidden="true">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
          Activity
        </Link>

        <Link href="/graveyard" className="nav-bottom__item" aria-current={isActive('/graveyard')}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
            <path d="M12 8v4M12 16h.01"/>
          </svg>
          Graveyard
        </Link>
      </nav>
    </>
  );
}
