'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        window.dispatchEvent(new Event('auth-change'));
        router.push('/dashboard/reviews');
      } else {
        setError(data.error || 'Invalid credentials.');
      }
    } catch {
      setError('Failed to contact login server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="flex-grow flex items-center justify-center px-6 py-12 z-10 relative min-h-[calc(100vh-64px)]">
      {/* Ambient gradient */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(124,58,237,0.15) 0%, rgba(34,211,238,0.05) 50%, transparent 100%)' }} />

      <div className="glass-panel w-full max-w-md rounded-xl p-8 flex flex-col gap-6 relative z-10">
        {/* Header */}
        <div className="flex flex-col items-center text-center gap-2 mb-2">
          <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center border border-outline-glass mb-2">
            <span className="material-symbols-outlined text-primary text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>terminal</span>
          </div>
          <h1 className="text-3xl font-bold text-on-surface">Welcome back</h1>
          <p className="text-sm text-on-surface-variant">Sign in to continue reviewing your code.</p>
        </div>

        {/* Social Buttons */}
        <div className="flex flex-col gap-3">
          <button className="w-full bg-surface-container-highest hover:bg-surface-bright transition-colors border border-outline-glass rounded-lg py-2.5 px-4 flex items-center justify-center gap-2 text-sm text-on-surface h-11">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
            </svg>
            Continue with GitHub
          </button>
          <button className="w-full bg-surface-container-highest hover:bg-surface-bright transition-colors border border-outline-glass rounded-lg py-2.5 px-4 flex items-center justify-center gap-2 text-sm text-on-surface h-11">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="h-px bg-outline-glass flex-grow" />
          <span className="text-outline font-mono-code text-[11px] uppercase tracking-widest">or sign in with email</span>
          <div className="h-px bg-outline-glass flex-grow" />
        </div>

        {/* Error */}
        {error && (
          <div className="bg-critical/10 border border-critical/30 text-critical text-sm rounded-lg px-4 py-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-on-surface-variant font-mono-code" htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full bg-surface-container-lowest border border-outline-glass rounded-lg py-2.5 px-4 text-on-surface placeholder:text-outline focus:outline-none focus:border-secondary focus:shadow-[0_0_0_1px_rgba(93,230,255,0.2)] h-11 transition-all"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-sm text-on-surface-variant font-mono-code" htmlFor="password">Password</label>
              <a href="#" className="text-sm text-primary hover:text-primary-fixed-dim transition-colors">Forgot password?</a>
            </div>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-surface-container-lowest border border-outline-glass rounded-lg py-2.5 px-4 text-on-surface placeholder:text-outline focus:outline-none focus:border-secondary focus:shadow-[0_0_0_1px_rgba(93,230,255,0.2)] h-11 transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-container hover:bg-inverse-primary text-white font-semibold rounded-lg py-3 px-4 h-12 transition-all mt-1 shadow-[0_0_15px_rgba(124,58,237,0.3)] hover:shadow-[0_0_25px_rgba(124,58,237,0.5)] active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Signing in…</>
            ) : 'Sign In'}
          </button>
        </form>

        {/* Footer */}
        <div className="text-center mt-1">
          <span className="text-sm text-on-surface-variant">Don&apos;t have an account? </span>
          <Link href="/signup" className="text-sm text-primary font-bold hover:text-primary-fixed-dim transition-colors">Sign up</Link>
        </div>
      </div>
    </section>
  );
}
