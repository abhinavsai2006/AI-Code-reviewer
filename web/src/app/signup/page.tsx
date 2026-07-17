'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        window.dispatchEvent(new Event('auth-change'));
        router.push('/dashboard/submit');
      } else {
        setError(data.error || 'Registration failed.');
      }
    } catch (err: any) {
      setError('Failed to contact signup server.');
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
          <h1 className="text-3xl font-bold text-on-surface">Create account</h1>
          <p className="text-sm text-on-surface-variant">Register an account to start code audits.</p>
        </div>

        {error && (
          <div className="bg-critical/10 border border-critical/30 text-critical text-sm rounded-lg px-4 py-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-on-surface-variant font-mono-code" htmlFor="name">Your Full Name</label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="John Doe"
              className="w-full bg-surface-container-lowest border border-outline-glass rounded-lg py-2.5 px-4 text-on-surface placeholder:text-outline/50 focus:outline-none focus:border-secondary focus:shadow-[0_0_0_1px_rgba(93,230,255,0.2)] h-11 text-sm transition-all"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-on-surface-variant font-mono-code" htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full bg-surface-container-lowest border border-outline-glass rounded-lg py-2.5 px-4 text-on-surface placeholder:text-outline/50 focus:outline-none focus:border-secondary focus:shadow-[0_0_0_1px_rgba(93,230,255,0.2)] h-11 text-sm transition-all"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-on-surface-variant font-mono-code" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-surface-container-lowest border border-outline-glass rounded-lg py-2.5 px-4 text-on-surface placeholder:text-outline/50 focus:outline-none focus:border-secondary focus:shadow-[0_0_0_1px_rgba(93,230,255,0.2)] h-11 text-sm transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-container hover:bg-inverse-primary text-white font-semibold rounded-lg py-3 px-4 h-12 transition-all mt-2 shadow-[0_0_15px_rgba(124,58,237,0.3)] hover:shadow-[0_0_25px_rgba(124,58,237,0.5)] active:scale-95 text-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Creating Account…</>
            ) : 'Sign Up'}
          </button>
        </form>

        <div className="text-center mt-2">
          <span className="text-sm text-on-surface-variant">Already have an account? </span>
          <Link href="/login" className="text-sm text-primary font-bold hover:text-primary-fixed-dim transition-colors">
            Sign in
          </Link>
        </div>
      </div>
    </section>
  );
}
