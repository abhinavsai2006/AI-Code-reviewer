'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({ total: 0, avgScore: 0, findings: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        setUser({ name: 'Nexus Developer' });
      }
    }

    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/reviews', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const list = await res.json();
          let scoreSum = 0;
          let findingsSum = 0;
          list.forEach((r: any) => {
            scoreSum += r.score || 0;
            findingsSum += (r.critical || 0) + (r.warning || 0) + (r.info || 0);
          });
          setStats({
            total: list.length,
            avgScore: list.length ? Math.round(scoreSum / list.length) : 0,
            findings: findingsSum
          });
        }
      } catch (e) {
        console.error('Error loading dashboard stats:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (!user) return null;

  return (
    <div className="flex flex-col gap-6 w-full relative z-10">
      {/* Header Banner */}
      <header className="glass-panel rounded-xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 10% 20%, rgba(124,58,237,0.1) 0%, transparent 40%)' }} />
        <div className="flex flex-col gap-1 relative z-10">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">{user.name || 'Developer'}</span>
          </h1>
          <p className="text-on-surface-variant text-sm">Automate your code reviews, identify complexity hot-spots, and generate docs instantly.</p>
        </div>
        <Link
          href="/dashboard/submit"
          className="bg-primary-container text-white px-6 py-2.5 rounded-lg text-xs font-semibold tracking-widest uppercase shadow-[0_0_15px_rgba(124,58,237,0.3)] hover:shadow-[0_0_25px_rgba(124,58,237,0.5)] transition-all active:scale-95 flex items-center gap-2 relative z-10"
        >
          <span className="material-symbols-outlined text-sm">add_circle</span>
          Run New Audit
        </Link>
      </header>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric 1 */}
        <div className="glass-panel rounded-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[24px]">history</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-outline tracking-wider">Total Code Audits</span>
            <span className="text-2xl font-extrabold text-white">{loading ? '...' : stats.total}</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="glass-panel rounded-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-secondary/10 border border-secondary/20 flex items-center justify-center text-secondary">
            <span className="material-symbols-outlined text-[24px]">leaderboard</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-outline tracking-wider">Average Quality Score</span>
            <span className="text-2xl font-extrabold text-white">{loading ? '...' : `${stats.avgScore}/100`}</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="glass-panel rounded-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-critical/10 border border-critical/20 flex items-center justify-center text-critical">
            <span className="material-symbols-outlined text-[24px]">bug_report</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-outline tracking-wider">Identified Findings</span>
            <span className="text-2xl font-extrabold text-white">{loading ? '...' : stats.findings}</span>
          </div>
        </div>
      </div>

      {/* Actions / Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Onboarding Checklist */}
        <div className="lg:col-span-8 glass-panel rounded-xl p-6 flex flex-col gap-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[18px]">verified</span>
            Workspace Checklist
          </h2>

          <div className="flex flex-col gap-3 text-sm">
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
              <span className="material-symbols-outlined text-success">check_circle</span>
              <div className="flex flex-col">
                <span className="font-semibold text-white">Create Account & Active Session</span>
                <span className="text-xs text-on-surface-variant">Logged in successfully using secure authentication credentials.</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
              <span className="material-symbols-outlined text-success">check_circle</span>
              <div className="flex flex-col">
                <span className="font-semibold text-white">Connected Prisma Postgres Storage</span>
                <span className="text-xs text-on-surface-variant">Database migrations have run and schema models are active in production.</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
              <span className={`material-symbols-outlined ${stats.total > 0 ? 'text-success' : 'text-outline-glass'}`}>
                {stats.total > 0 ? 'check_circle' : 'radio_button_unchecked'}
              </span>
              <div className="flex flex-col">
                <span className="font-semibold text-white">Submit your first code snippet</span>
                <span className="text-xs text-on-surface-variant">Go to the submission page, select a programming language, and run the review engine.</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
              <span className="material-symbols-outlined text-outline-glass">radio_button_unchecked</span>
              <div className="flex flex-col">
                <span className="font-semibold text-white">Analyze Review Findings</span>
                <span className="text-xs text-on-surface-variant">Navigate to review history, view detailed reports, and apply refactoring solutions.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links Card */}
        <div className="lg:col-span-4 glass-panel rounded-xl p-5 flex flex-col gap-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[18px]">launch</span>
            Quick Navigation Links
          </h2>
          <div className="flex flex-col gap-2">
            <Link href="/dashboard/submit" className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container hover:bg-surface-bright transition-all text-xs font-semibold text-white border border-outline-glass/30">
              <span>Submit Code Snippet</span>
              <span className="material-symbols-outlined text-xs">arrow_forward</span>
            </Link>
            <Link href="/dashboard/reviews" className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container hover:bg-surface-bright transition-all text-xs font-semibold text-white border border-outline-glass/30">
              <span>Audits & Reviews History</span>
              <span className="material-symbols-outlined text-xs">arrow_forward</span>
            </Link>
            <Link href="/dashboard/settings" className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container hover:bg-surface-bright transition-all text-xs font-semibold text-white border border-outline-glass/30">
              <span>Account Preferences</span>
              <span className="material-symbols-outlined text-xs">arrow_forward</span>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
