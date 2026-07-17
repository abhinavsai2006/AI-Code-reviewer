'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();

  // Redirect logged-in users straight to dashboard
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) router.replace('/dashboard/reviews');
  }, []);

  return (
    <main className="flex-grow pt-24 pb-16 relative z-10">

      {/* ── Hero Section ── */}
      <section className="text-center mt-8 mb-[120px] max-w-4xl mx-auto px-6 flex flex-col items-center">
        <div className="inline-flex items-center gap-2 bg-surface-container border border-outline-glass rounded-full px-4 py-1.5 mb-8 text-xs font-mono-code text-secondary">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          AI + Static Analysis Engine Active
        </div>

        <h1 className="font-sans text-5xl md:text-[64px] font-extrabold text-on-surface mb-6 text-glow leading-tight tracking-tight hidden md:block">
          Automate Your Code Reviews.<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
            Ship Flawless Code.
          </span>
        </h1>
        <h1 className="font-sans text-4xl font-extrabold text-on-surface mb-6 text-glow leading-tight md:hidden">
          Automate Your Code Reviews. Ship Flawless Code.
        </h1>

        <p className="text-lg text-on-surface-variant mb-10 max-w-2xl mx-auto leading-relaxed">
          Paste your code snippet or drag files to receive immediate, AI-powered + static-analysis reviews.
          Zero setup, no repository URL needed.
        </p>

        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href="/dashboard/submit"
            className="bg-primary-container text-white px-8 py-3.5 rounded-lg font-semibold shadow-[0_0_20px_rgba(124,58,237,0.4)] hover:shadow-[0_0_30px_rgba(124,58,237,0.6)] transition-all flex items-center gap-2 active:scale-95"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>rocket_launch</span>
            Start Reviewing
          </Link>
          <Link
            href="/login"
            className="glass-panel text-on-surface px-8 py-3.5 rounded-lg font-semibold hover:bg-surface-variant transition-colors flex items-center gap-2 active:scale-95"
          >
            <span className="material-symbols-outlined">login</span>
            Sign In
          </Link>
        </div>
      </section>

      {/* ── Split-Screen Code Preview ── */}
      <section className="mb-[120px] max-w-7xl mx-auto px-6">
        <div className="glass-panel rounded-xl overflow-hidden flex flex-col md:flex-row relative transition-transform duration-500 hover:scale-[1.005]">
          {/* Window Controls */}
          <div className="absolute top-0 left-0 w-full h-8 bg-surface-container-lowest/80 border-b border-outline-glass flex items-center px-4 gap-2 z-20">
            <div className="w-3 h-3 rounded-full bg-critical" />
            <div className="w-3 h-3 rounded-full bg-warning" />
            <div className="w-3 h-3 rounded-full bg-success" />
            <span className="text-on-surface-variant font-mono-code text-xs ml-2 opacity-50">src/services/queryBuilder.ts</span>
          </div>

          {/* Code Pane */}
          <div className="w-full md:w-2/3 bg-[#111118]/90 pt-10 pb-4 overflow-x-auto relative z-10 border-r border-b md:border-b-0 border-outline-glass flex">
            <div className="w-10 text-right pr-3 text-outline font-mono-code text-[13px] select-none border-r border-outline-glass pt-3" style={{ background: 'rgba(0,0,0,0.2)' }}>
              {[1,2,3,4,5,6,7,8,9,10,11].map(n => <div key={n}>{n}</div>)}
              <div className="text-critical bg-critical/20 relative -left-px border-l-2 border-critical pl-px">12</div>
              {[13,14,15].map(n => <div key={n}>{n}</div>)}
            </div>
            <div className="pl-4 pt-3 font-mono-code text-[13px] text-[#A6ACCD] w-full relative">
              <pre><code>
{`import `}<span className="text-[#89DDFF]">{'{'}</span>{` db `}<span className="text-[#89DDFF]">{'}'}</span>{` from `}<span className="text-[#C3E88D]">'@/config/database'</span>{`;

`}<span className="text-[#89DDFF]">export</span>{` `}<span className="text-[#89DDFF]">async function</span>{` `}<span className="text-[#82AAFF]">getUserData</span>{`(reqId: `}<span className="text-[#FFCB6B]">string</span>{`) {
  const id = reqId;

  `}<span className="text-[#546E7A] italic">{'// Fetch user profile securely?'}</span>{`
  `}<span className="text-[#89DDFF]">const</span>{` query = `}<span className="text-[#C3E88D]">{"`SELECT * FROM users WHERE id = ${'{'}id{'}'}`"}</span>{`;

  `}<span className="text-[#89DDFF]">try</span>{` {
    `}<span className="text-[#89DDFF]">const</span>{` result = `}<span className="text-[#89DDFF]">await</span>{` db.`}<span className="text-[#82AAFF]">execute</span>{`(query);
    `}<span className="text-[#89DDFF]">return</span>{` result.rows;
  } `}<span className="text-[#89DDFF]">catch</span>{` (e) {
    console.`}<span className="text-[#82AAFF]">error</span>{`(e);
  }
}`}
              </code></pre>

              {/* Inline AI Comment */}
              <div className="absolute top-[155px] left-4 right-4 bg-surface-bright/95 backdrop-blur-md rounded-lg p-3 border border-outline-glass shadow-lg z-20 flex gap-2 items-start">
                <span className="material-symbols-outlined text-critical mt-0.5" style={{ fontVariationSettings: "'FILL' 1", fontSize: '18px' }}>error</span>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-critical/10 text-critical text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-critical/20">Critical</span>
                    <span className="text-on-surface text-sm font-semibold">SQL Injection Risk</span>
                  </div>
                  <p className="text-on-surface-variant text-xs">Potential SQL Injection. Avoid string concatenation in queries. Use parameterized queries instead.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Metrics Pane */}
          <div className="w-full md:w-1/3 p-6 pt-12 flex flex-col justify-center items-center bg-surface-container-lowest relative z-10">
            <div className="mb-6 relative w-44 h-44 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90 drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]" viewBox="0 0 100 100">
                <circle cx="50" cy="50" fill="none" r="45" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                <circle cx="50" cy="50" fill="none" r="45" stroke="url(#sg)" strokeDasharray="283" strokeDashoffset="37" strokeLinecap="round" strokeWidth="4" />
                <defs>
                  <linearGradient id="sg" x1="0%" x2="100%" y1="0%" y2="0%">
                    <stop offset="0%" stopColor="#F59E0B" />
                    <stop offset="100%" stopColor="#10B981" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-bold text-on-surface text-glow">87<span className="text-xl text-on-surface-variant">%</span></span>
                <span className="text-[11px] text-on-surface-variant uppercase tracking-widest mt-1">Score</span>
              </div>
            </div>
            <div className="w-full space-y-3">
              {[
                { icon: 'account_tree', label: 'Complexity', value: 'Low (3)', color: 'text-success' },
                { icon: 'bug_report', label: 'Issues', value: '3 Found', color: 'text-warning' },
                { icon: 'security', label: 'Security', value: 'Failed (1)', color: 'text-critical' },
              ].map(({ icon, label, value, color }) => (
                <div key={label} className="flex justify-between items-center p-2 rounded bg-surface-variant/30 border border-outline-glass">
                  <span className="text-on-surface-variant text-sm flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base">{icon}</span>{label}
                  </span>
                  <span className={`${color} font-semibold text-sm`}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section className="max-w-7xl mx-auto px-6 mb-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-on-surface">Deep Analysis Engine</h2>
          <p className="text-on-surface-variant text-lg mt-2">Beyond basic linting. Understand context, architecture, and intent.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { icon: 'rule', color: 'text-primary', title: 'Static Analysis', desc: 'Instant detection of styling errors, unused variables, and complex antipatterns via integrated rulesets.', tags: [{ label: 'Critical', cls: 'bg-critical/10 text-critical border-critical/20' }, { label: 'Warning', cls: 'bg-warning/10 text-warning border-warning/20' }] },
            { icon: 'psychology', color: 'text-secondary', title: 'AI-Powered Review', desc: 'Context-aware bug explanations and intelligent auto-refactoring suggestions that align with your codebase style.', tags: [] },
            { icon: 'speed', color: 'text-tertiary', title: 'Complexity Metrics', desc: 'Track cyclomatic complexity, Lines of Code (LOC), and maintainability index before you merge.', tags: [] },
            { icon: 'groups', color: 'text-success', title: 'Review History', desc: 'Share detailed findings securely. Track review resolution progress across your engineering organization.', tags: [] },
          ].map(({ icon, color, title, desc, tags }) => (
            <div key={title} className="glass-panel p-6 rounded-xl group cursor-default transition-transform hover:-translate-y-1 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className={`w-12 h-12 rounded-lg bg-surface-container-high flex items-center justify-center mb-4 border border-outline-glass group-hover:border-current/30 transition-colors ${color}`}>
                <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
              </div>
              <h3 className="text-xl font-semibold text-on-surface mb-2">{title}</h3>
              <p className="text-on-surface-variant text-sm leading-relaxed mb-4">{desc}</p>
              {tags.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {tags.map(t => (
                    <span key={t.label} className={`text-[11px] font-bold uppercase px-2 py-1 rounded-full border ${t.cls}`}>{t.label}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

    </main>
  );
}
