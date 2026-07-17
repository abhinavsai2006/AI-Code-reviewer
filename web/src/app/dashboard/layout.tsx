'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    } else {
      const u = localStorage.getItem('user');
      if (u) { try { setUser(JSON.parse(u)); } catch { setUser(null); } }
      setLoading(false);
    }
  }, [router]);

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-2 border-outline-glass border-t-primary animate-spin" />
            <div className="absolute inset-3 rounded-full border border-outline-glass border-b-secondary animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
          </div>
          <p className="text-xs font-mono-code text-on-surface-variant">Checking authorization state...</p>
        </div>
      </div>
    );
  }

  const sideNavItems = [
    { label: 'Submit Code', href: '/dashboard/submit', icon: 'add_circle' },
    { label: 'Review History', href: '/dashboard/reviews', icon: 'history' },
    { label: 'Settings', href: '/dashboard/settings', icon: 'settings' },
  ];

  // For review detail pages, the detail page manages its own full-bleed layout
  const isDetailPage = pathname?.includes('/dashboard/reviews/') && pathname !== '/dashboard/reviews';

  return (
    <div className="flex-grow flex flex-col md:flex-row max-w-7xl mx-auto w-full px-4 md:px-6 gap-0 md:gap-6 py-6 relative z-10">

      {/* ── Left Sidebar (hidden on detail pages on mobile) ── */}
      <aside className={`w-full md:w-56 shrink-0 flex-col gap-3 ${isDetailPage ? 'hidden lg:flex' : 'flex'}`}>

        {/* Workspace Panel */}
        <div className="glass-panel rounded-xl p-3 flex flex-col gap-1">
          <span className="text-[10px] uppercase font-bold text-outline tracking-widest px-2 py-1 mb-1">Workspace</span>

          {sideNavItems.map(({ label, href, icon }) => {
            const isActive = href === '/dashboard/reviews'
              ? pathname?.startsWith('/dashboard/reviews')
              : pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 font-medium ${
                  isActive
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-on-surface-variant hover:bg-white/5 hover:text-on-surface border border-transparent'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]" style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>
                  {icon}
                </span>
                {label}
              </Link>
            );
          })}
        </div>

        {/* User info panel */}
        {user && (
          <div className="glass-panel rounded-xl p-3 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 border border-outline-glass flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-white text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-on-surface truncate">{user.name || 'Nexus Developer'}</p>
                <p className="text-[10px] text-on-surface-variant truncate font-mono-code">{user.email || ''}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-center font-mono-code">
              <div className="bg-surface-container-lowest/50 rounded-lg py-2 border border-outline-glass/40">
                <p className="text-white text-xs font-bold">—</p>
                <p className="text-[9px] text-on-surface-variant/60">Reviews</p>
              </div>
              <div className="bg-surface-container-lowest/50 rounded-lg py-2 border border-outline-glass/40">
                <p className="text-white text-xs font-bold">—</p>
                <p className="text-[9px] text-on-surface-variant/60">Avg Score</p>
              </div>
            </div>
          </div>
        )}

        {/* Engine status */}
        <div className="glass-panel rounded-xl p-3 flex flex-col gap-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-success text-[14px]">circle</span>
            <span className="text-[10px] uppercase font-bold text-on-surface-variant tracking-widest">Engine Status</span>
          </div>
          {[
            { name: 'NVIDIA Llama AI', ok: true },
            { name: 'Static Linter', ok: true },
            { name: 'Pipeline', ok: true },
          ].map(({ name, ok }) => (
            <div key={name} className="flex items-center justify-between text-[11px]">
              <span className="text-on-surface-variant font-mono-code">{name}</span>
              <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-success shadow-[0_0_6px_rgba(16,185,129,0.6)]' : 'bg-warning'}`} />
            </div>
          ))}
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-grow flex flex-col min-w-0 min-h-0">
        {children}
      </div>
    </div>
  );
}
