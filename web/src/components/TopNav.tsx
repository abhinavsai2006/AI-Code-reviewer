'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

export default function TopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const isLanding = pathname === '/' || pathname === '/login' || pathname === '/signup';

  const checkUser = () => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      try { setUser(JSON.parse(storedUser)); }
      catch { setUser({ email: 'developer@nexus.ai' }); }
    } else {
      setUser(null);
    }
  };

  useEffect(() => {
    checkUser();
    window.addEventListener('storage', checkUser);
    window.addEventListener('auth-change', checkUser);
    return () => {
      window.removeEventListener('storage', checkUser);
      window.removeEventListener('auth-change', checkUser);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.dispatchEvent(new Event('auth-change'));
    router.push('/');
  };

  // Landing nav links (not logged in)
  const landingLinks = [
    { label: 'Product', href: '#' },
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '#' },
    { label: 'Docs', href: '#' },
  ];

  // Dashboard nav links (logged in)
  const dashLinks = [
    { label: 'Home', href: '/' },
    { label: 'Submit Code', href: '/dashboard/submit' },
    { label: 'History', href: '/dashboard/reviews' },
  ];

  const activeLinks = user ? dashLinks : landingLinks;

  return (
    <nav className="fixed top-0 w-full z-50 bg-[#0A0A0F]/70 backdrop-blur-xl border-b border-outline-glass shadow-2xl">
      <div className="flex justify-between items-center h-16 px-6 max-w-7xl mx-auto w-full">

        {/* Brand */}
        <Link href={user ? '/dashboard/reviews' : '/'} className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>terminal</span>
          </div>
          <span className="font-sans text-[17px] font-bold text-primary tracking-tighter">Nexus.AI</span>
        </Link>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex gap-1 items-center h-full">
          {activeLinks.map(link => {
            const isActive = pathname === link.href && link.href !== '#' && link.href !== '#features';
            return (
              <Link
                key={link.label}
                href={link.href}
                className={`relative px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'text-primary'
                    : 'text-on-surface-variant hover:text-secondary hover:bg-white/5'
                }`}
              >
                {link.label}
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-primary rounded-full" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Right: Auth Actions */}
        <div className="flex gap-3 items-center">
          {user ? (
            <>
              {/* Notifications */}
              <button className="text-on-surface-variant hover:text-on-surface transition-colors hover:bg-white/5 p-1.5 rounded-full hidden md:flex">
                <span className="material-symbols-outlined text-[20px]">notifications</span>
              </button>
              {/* Settings */}
              <Link href="/dashboard/settings" className="text-on-surface-variant hover:text-on-surface transition-colors hover:bg-white/5 p-1.5 rounded-full hidden md:flex">
                <span className="material-symbols-outlined text-[20px]">settings</span>
              </Link>

              {/* Username */}
              <span className="hidden lg:inline text-xs text-on-surface-variant font-mono-code truncate max-w-[120px]">
                {user.name || user.email?.split('@')[0] || 'Nexus Developer'}
              </span>

              {/* Sign Out */}
              <button
                onClick={handleLogout}
                className="text-xs text-on-surface-variant hover:text-white transition-colors border border-outline-glass hover:border-white/20 px-3 py-1.5 rounded-lg hover:bg-white/5 active:scale-95"
              >
                Sign Out
              </button>

              {/* Avatar */}
              <Link href="/dashboard/reviews"
                className="w-8 h-8 rounded-full overflow-hidden border-2 border-outline-glass hover:border-primary transition-colors cursor-pointer flex-shrink-0">
                <div className="w-full h-full bg-gradient-to-br from-primary/40 to-secondary/40 flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                </div>
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-on-surface text-sm hover:text-primary transition-colors hidden md:block font-medium"
              >
                Sign In
              </Link>
              <Link
                href="/dashboard/submit"
                className="bg-primary-container text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-[0_0_15px_rgba(124,58,237,0.3)] hover:shadow-[0_0_25px_rgba(124,58,237,0.5)] transition-all active:scale-95"
              >
                Get Started
              </Link>
            </>
          )}

          {/* Mobile menu toggle */}
          <button
            className="md:hidden text-on-surface-variant hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span className="material-symbols-outlined text-[22px]">{menuOpen ? 'close' : 'menu'}</span>
          </button>
        </div>
      </div>

      {/* Mobile Dropdown */}
      {menuOpen && (
        <div className="md:hidden bg-[#0d0d13]/95 backdrop-blur-xl border-t border-outline-glass px-4 py-3 flex flex-col gap-1">
          {activeLinks.map(link => (
            <Link key={link.label} href={link.href}
              onClick={() => setMenuOpen(false)}
              className="px-3 py-2.5 rounded-lg text-sm text-on-surface-variant hover:text-white hover:bg-white/5 transition-colors">
              {link.label}
            </Link>
          ))}
          {user ? (
            <button onClick={handleLogout}
              className="mt-1 text-left px-3 py-2.5 rounded-lg text-sm text-critical hover:bg-critical/10 transition-colors">
              Sign Out
            </button>
          ) : (
            <Link href="/login" onClick={() => setMenuOpen(false)}
              className="mt-1 px-3 py-2.5 rounded-lg text-sm text-primary hover:bg-primary/10 transition-colors">
              Sign In
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
