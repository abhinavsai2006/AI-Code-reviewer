'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) router.replace('/dashboard');
  }, []);

  // Mouse-tracking glow effect
  useEffect(() => {
    const glow = glowRef.current;
    if (!glow) return;
    const handler = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 30;
      const y = (e.clientY / window.innerHeight - 0.5) * 30;
      glow.style.transform = `translate(calc(-50% + ${x}px), ${y}px)`;
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  // Intersection Observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );
    document.querySelectorAll('.scroll-animate').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Counter animation
  useEffect(() => {
    const counters = document.querySelectorAll('[data-count]');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            const target = parseInt(el.dataset.count || '0');
            const suffix = el.dataset.suffix || '';
            let current = 0;
            const step = Math.ceil(target / 40);
            const timer = setInterval(() => {
              current = Math.min(current + step, target);
              el.textContent = current + suffix;
              if (current >= target) clearInterval(timer);
            }, 30);
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.5 }
    );
    counters.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

        .glass-card {
          background: rgba(31, 31, 37, 0.4);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-top-color: rgba(255, 255, 255, 0.12);
          border-left-color: rgba(255, 255, 255, 0.12);
        }
        .glass-card:hover {
          border-color: rgba(255, 255, 255, 0.15);
        }
        .gradient-text {
          background: linear-gradient(135deg, #d2bbff 0%, #22D3EE 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .primary-glow {
          box-shadow: 0 0 20px rgba(124, 58, 237, 0.4);
        }
        .primary-glow:hover {
          box-shadow: 0 0 35px rgba(124, 58, 237, 0.6);
        }
        .step-line {
          background: linear-gradient(90deg, #7c3aed 0%, #22d3ee 100%);
          height: 2px;
          width: 100%;
          position: absolute;
          top: 24px;
          left: 50%;
          z-index: 0;
        }
        @keyframes pulse-glow {
          0% { opacity: 0.4; }
          50% { opacity: 0.8; }
          100% { opacity: 0.4; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-glow {
          animation: pulse-glow 3s infinite ease-in-out;
        }
        .animate-float {
          animation: float 6s infinite ease-in-out;
        }
        .scroll-animate {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.6s ease-out, transform 0.6s ease-out;
        }
        .scroll-animate.animate-in {
          opacity: 1;
          transform: translateY(0);
        }
        .scroll-animate:nth-child(2) { transition-delay: 0.1s; }
        .scroll-animate:nth-child(3) { transition-delay: 0.2s; }
        .scroll-animate:nth-child(4) { transition-delay: 0.3s; }
        .scroll-animate:nth-child(5) { transition-delay: 0.4s; }
        .scroll-animate:nth-child(6) { transition-delay: 0.5s; }
        .code-block {
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          line-height: 1.6;
        }
        .code-keyword { color: #c084fc; }
        .code-string { color: #5de6ff; }
        .code-function { color: #fbbf24; }
        .code-comment { color: #6b7280; font-style: italic; }
        .code-number { color: #f472b6; }
        .shimmer-border {
          background: linear-gradient(90deg, transparent 0%, rgba(124,58,237,0.3) 50%, transparent 100%);
          background-size: 200% 100%;
          animation: shimmer 3s infinite;
        }
      `}</style>

      <main className="min-h-screen bg-background text-on-surface overflow-x-hidden" style={{ fontFamily: "'Geist', 'Inter', system-ui, sans-serif" }}>

        {/* ── Navigation ── */}
        <nav className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-xl border-b border-white/[0.08]" style={{ boxShadow: '0 0 30px rgba(124,58,237,0.08)' }}>
          <div className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto w-full">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary-container shadow-[0_0_8px_rgba(124,58,237,0.8)]" />
              <span className="text-xl font-extrabold text-primary tracking-tight" style={{ fontFamily: "'Geist', sans-serif" }}>Nexus AI</span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-on-surface-variant hover:text-primary transition-colors text-sm">Features</a>
              <a href="#how-it-works" className="text-on-surface-variant hover:text-primary transition-colors text-sm">How It Works</a>
              <a href="#demo" className="text-on-surface-variant hover:text-primary transition-colors text-sm">Live Demo</a>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login" className="hidden md:block text-secondary border border-secondary/40 px-4 py-2 rounded-lg hover:bg-secondary/10 transition-all text-xs font-semibold tracking-wider uppercase">
                Log In
              </Link>
              <Link href="/signup" className="bg-primary-container text-white px-4 py-2 rounded-lg text-xs font-semibold tracking-wider uppercase primary-glow transition-all active:scale-95">
                Start Free
              </Link>
            </div>
          </div>
        </nav>

        {/* ── Hero Section ── */}
        <section className="relative px-6 max-w-7xl mx-auto text-center pt-40 pb-20">
          {/* Animated Background Glow */}
          <div ref={glowRef} className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full -z-10 animate-glow pointer-events-none" style={{ background: 'radial-gradient(ellipse, rgba(124,58,237,0.15) 0%, rgba(34,211,238,0.05) 50%, transparent 70%)' }} />

          <div className="inline-flex items-center gap-2 bg-surface-container border border-white/[0.08] rounded-full px-4 py-1.5 mb-8 text-xs font-semibold tracking-wider uppercase text-secondary">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            AI + Static Analysis Engine Active
          </div>

          <h1 className="text-5xl md:text-[72px] font-extrabold mb-6 max-w-5xl mx-auto leading-[1.08] tracking-tight" style={{ fontFamily: "'Geist', sans-serif" }}>
            Automate Your Code Reviews,{' '}
            <span className="gradient-text">Ship Flawless Code</span>
          </h1>

          <p className="text-on-surface-variant text-lg max-w-2xl mx-auto mb-10 leading-relaxed" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px' }}>
            Nexus AI deeply understands your codebase. Get instant architectural insights, security audits, and performance optimizations — zero setup required.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link href="/dashboard/submit" className="bg-primary-container text-white px-10 py-4 rounded-xl font-bold primary-glow transition-all hover:-translate-y-1 active:scale-95 text-sm tracking-wide">
              Start Free Audit
            </Link>
            <a href="#demo" className="border border-secondary/40 text-secondary px-10 py-4 rounded-xl font-bold hover:bg-secondary/5 transition-all hover:-translate-y-1 text-sm tracking-wide">
              Watch Demo
            </a>
          </div>

          {/* Hero Image - Floating 3D Mockup */}
          <div className="relative group animate-float">
            <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full opacity-20 group-hover:opacity-40 transition-opacity duration-700" />
            <div className="relative rounded-2xl border border-white/[0.08] overflow-hidden" style={{ boxShadow: '0 25px 80px rgba(0,0,0,0.5), 0 0 40px rgba(124,58,237,0.1)' }}>
              {/* Simulated Code Editor Hero */}
              <div className="bg-surface-container-lowest p-1">
                {/* Window Chrome */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-critical/60" />
                    <div className="w-3 h-3 rounded-full bg-warning/60" />
                    <div className="w-3 h-3 rounded-full bg-success/60" />
                  </div>
                  <div className="flex-1 text-center text-xs text-outline font-mono-code">auth_service.py — Nexus AI Review</div>
                </div>
                {/* Code Content */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
                  <div className="lg:col-span-7 p-6 border-r border-white/[0.06]">
                    <div className="code-block text-left space-y-0.5">
                      <div><span className="text-outline mr-4 select-none">1</span><span className="code-keyword">class</span> <span className="code-function">AuthService</span>:</div>
                      <div><span className="text-outline mr-4 select-none">2</span>    <span className="code-keyword">def</span> <span className="code-function">authenticate</span>(self, token):</div>
                      <div><span className="text-outline mr-4 select-none">3</span>        <span className="code-comment"># TODO: Add rate limiting</span></div>
                      <div className="bg-critical/5 border-l-2 border-critical/60 pl-2 -ml-2 rounded-r"><span className="text-outline mr-4 select-none">4</span>        user = db.query(<span className="code-string">{`f"SELECT * FROM users WHERE token='{token}'"`}</span>)</div>
                      <div><span className="text-outline mr-4 select-none">5</span>        <span className="code-keyword">if</span> <span className="code-keyword">not</span> user:</div>
                      <div><span className="text-outline mr-4 select-none">6</span>            <span className="code-keyword">return</span> <span className="code-keyword">None</span></div>
                      <div className="bg-warning/5 border-l-2 border-warning/60 pl-2 -ml-2 rounded-r"><span className="text-outline mr-4 select-none">7</span>        session = {'{'}token: token, exp: time() + <span className="code-number">86400</span>{'}'}</div>
                      <div><span className="text-outline mr-4 select-none">8</span>        <span className="code-keyword">return</span> session</div>
                    </div>
                  </div>
                  {/* AI Review Panel */}
                  <div className="lg:col-span-5 p-6 bg-surface/50">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
                        <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                        AI Review
                      </div>
                      {/* Score Gauge */}
                      <div className="relative w-14 h-14">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                          <path d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                          <path d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="url(#gaugeGradient)" strokeWidth="3" strokeDasharray="85, 100" strokeLinecap="round" />
                          <defs>
                            <linearGradient id="gaugeGradient"><stop stopColor="#7c3aed" /><stop offset="1" stopColor="#22d3ee" /></linearGradient>
                          </defs>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-extrabold text-white">85</div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="glass-card rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-critical/20 text-critical border border-critical/30">CRITICAL</span>
                          <span className="text-xs font-bold text-white">SQL Injection Risk</span>
                        </div>
                        <p className="text-[11px] text-on-surface-variant leading-relaxed">Line 4: String interpolation in SQL query. Use parameterized queries.</p>
                      </div>
                      <div className="glass-card rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-warning/20 text-warning border border-warning/30">WARNING</span>
                          <span className="text-xs font-bold text-white">Hardcoded Expiry</span>
                        </div>
                        <p className="text-[11px] text-on-surface-variant leading-relaxed">Line 7: Session expiry of 86400s should be configurable.</p>
                      </div>
                      <div className="glass-card rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-secondary/20 text-secondary border border-secondary/30">INFO</span>
                          <span className="text-xs font-bold text-white">Missing Rate Limiter</span>
                        </div>
                        <p className="text-[11px] text-on-surface-variant leading-relaxed">Line 3: Implement exponential backoff rate limiting.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Stats Row ── */}
        <section className="border-y border-white/[0.06] bg-surface-container-lowest/50 py-16 mb-20">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-10">
            <div className="text-center">
              <div className="text-3xl font-extrabold text-primary mb-1" style={{ fontFamily: "'Geist', sans-serif" }} data-count="10000" data-suffix="+">0</div>
              <div className="text-xs font-semibold tracking-[0.1em] uppercase text-on-surface-variant">Reviews Done</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-extrabold text-secondary mb-1" style={{ fontFamily: "'Geist', sans-serif" }} data-count="99" data-suffix="%">0</div>
              <div className="text-xs font-semibold tracking-[0.1em] uppercase text-on-surface-variant">Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-extrabold text-primary mb-1" style={{ fontFamily: "'Geist', sans-serif" }} data-count="50" data-suffix="+">0</div>
              <div className="text-xs font-semibold tracking-[0.1em] uppercase text-on-surface-variant">Languages</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-extrabold text-secondary mb-1" style={{ fontFamily: "'Geist', sans-serif" }}>{'<'}3s</div>
              <div className="text-xs font-semibold tracking-[0.1em] uppercase text-on-surface-variant">Analysis Time</div>
            </div>
          </div>
        </section>

        {/* ── Features Grid ── */}
        <section id="features" className="max-w-7xl mx-auto px-6 mb-24">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4 tracking-tight" style={{ fontFamily: "'Geist', sans-serif" }}>Engineered for Excellence</h2>
            <div className="w-24 h-1 bg-gradient-to-r from-primary-container to-secondary mx-auto rounded-full" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: 'psychology', title: 'AI-Powered Analysis', desc: 'Deep semantic understanding of code logic powered by NVIDIA NIM large language models.', color: 'primary' },
              { icon: 'terminal', title: 'Static Analysis Engine', desc: 'Multi-pass rule-based linting across 50+ languages. Catches edge cases before production.', color: 'secondary' },
              { icon: 'bar_chart', title: 'Complexity Metrics', desc: 'Cyclomatic complexity scoring, cognitive load analysis, and maintainability hotspot detection.', color: 'primary' },
              { icon: 'shield', title: 'Security Scanning', desc: 'Automated OWASP Top 10 vulnerability auditing for every line of code committed.', color: 'secondary' },
              { icon: 'description', title: 'Instant Reports', desc: 'Beautifully formatted findings with fix suggestions, exportable as markdown or JSON.', color: 'primary' },
              { icon: 'integration_instructions', title: 'GitHub Integration', desc: 'Native integration with GitHub, GitLab, and Bitbucket for automated PR reviews.', color: 'secondary' },
            ].map((f, i) => (
              <div key={i} className="scroll-animate glass-card p-6 rounded-xl group hover:border-white/20 transition-all duration-300 cursor-default">
                <div className="shimmer-border h-0.5 w-full rounded-full mb-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className={`material-symbols-outlined text-${f.color} text-4xl mb-4 block`} style={{ fontVariationSettings: "'FILL' 1" }}>{f.icon}</span>
                <h3 className="text-lg font-bold text-white mb-2" style={{ fontFamily: "'Geist', sans-serif" }}>{f.title}</h3>
                <p className="text-on-surface-variant text-sm leading-relaxed" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── How It Works ── */}
        <section id="how-it-works" className="max-w-7xl mx-auto px-6 py-20 mb-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-3 tracking-tight" style={{ fontFamily: "'Geist', sans-serif" }}>Effortless Implementation</h2>
            <p className="text-on-surface-variant text-sm" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Get started in under 3 minutes</p>
          </div>
          <div className="relative flex flex-col md:flex-row justify-between gap-12">
            {[
              { n: '1', title: 'Paste Your Code', desc: 'Upload files or paste code snippets directly into the Nexus editor.', bg: 'bg-primary-container', shadow: 'shadow-[0_0_20px_rgba(124,58,237,0.5)]' },
              { n: '2', title: 'AI Analyzes', desc: 'Static linter and AI LLM run in parallel for comprehensive coverage.', bg: 'bg-secondary', shadow: 'shadow-[0_0_20px_rgba(34,211,238,0.5)]' },
              { n: '3', title: 'Get Results', desc: 'Receive detailed findings with severity ratings and suggested fixes.', bg: 'bg-primary-container', shadow: 'shadow-[0_0_20px_rgba(124,58,237,0.5)]' },
            ].map((s, i) => (
              <div key={i} className="scroll-animate relative flex-1 text-center">
                {i < 2 && <div className="hidden md:block step-line" />}
                <div className={`w-12 h-12 ${s.bg} text-white font-bold rounded-full flex items-center justify-center mx-auto mb-5 relative z-10 ${s.shadow} text-lg`} style={{ fontFamily: "'Geist', sans-serif" }}>{s.n}</div>
                <h4 className="text-lg font-bold text-white mb-2" style={{ fontFamily: "'Geist', sans-serif" }}>{s.title}</h4>
                <p className="text-on-surface-variant text-sm px-4" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Live Demo Section ── */}
        <section id="demo" className="max-w-7xl mx-auto px-6 mb-24">
          <div className="glass-card rounded-2xl overflow-hidden p-4 md:p-8 border border-white/[0.05]">
            <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
              <div>
                <h2 className="text-3xl font-extrabold mb-1 tracking-tight" style={{ fontFamily: "'Geist', sans-serif" }}>Intelligence in Action</h2>
                <p className="text-on-surface-variant text-sm" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Experience the surgical precision of Nexus AI suggestions.</p>
              </div>
              <div className="flex items-center gap-2 text-secondary bg-secondary/10 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase">
                <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                Live Feedback
              </div>
            </div>
            {/* Split Demo */}
            <div className="rounded-xl overflow-hidden bg-surface-container-lowest border border-white/[0.06]" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
              <div className="grid grid-cols-1 lg:grid-cols-2">
                {/* Code Side */}
                <div className="p-6 border-b lg:border-b-0 lg:border-r border-white/[0.06]">
                  <div className="flex items-center gap-2 mb-4 text-xs text-outline">
                    <span className="material-symbols-outlined text-sm">code</span>
                    <span className="font-mono-code">payment_handler.js</span>
                  </div>
                  <div className="code-block space-y-0.5">
                    <div><span className="text-outline mr-3 select-none"> 1</span><span className="code-keyword">async function</span> <span className="code-function">processPayment</span>(amount, card) {'{'}</div>
                    <div><span className="text-outline mr-3 select-none"> 2</span>  <span className="code-keyword">const</span> charge = <span className="code-keyword">await</span> stripe.charges.create({'{'}</div>
                    <div className="bg-warning/5 border-l-2 border-warning/50 pl-2 -ml-2 rounded-r"><span className="text-outline mr-3 select-none"> 3</span>    amount: amount,  <span className="code-comment">{'// Missing validation'}</span></div>
                    <div><span className="text-outline mr-3 select-none"> 4</span>    currency: <span className="code-string">&apos;usd&apos;</span>,</div>
                    <div className="bg-critical/5 border-l-2 border-critical/50 pl-2 -ml-2 rounded-r"><span className="text-outline mr-3 select-none"> 5</span>    source: card.number, <span className="code-comment">{'// PCI violation'}</span></div>
                    <div><span className="text-outline mr-3 select-none"> 6</span>  {'}'});</div>
                    <div><span className="text-outline mr-3 select-none"> 7</span>  console.log(<span className="code-string">&apos;Charged:&apos;</span>, charge.id);</div>
                    <div><span className="text-outline mr-3 select-none"> 8</span>  <span className="code-keyword">return</span> charge;</div>
                    <div><span className="text-outline mr-3 select-none"> 9</span>{'}'}</div>
                  </div>
                </div>
                {/* Review Side */}
                <div className="p-6 bg-surface/30">
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                      Review Summary
                    </span>
                    <span className="text-xs text-on-surface-variant font-mono-code">3 findings</span>
                  </div>
                  <div className="space-y-3">
                    <div className="glass-card rounded-lg p-3.5 border-l-2 border-critical/60">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-critical/20 text-critical">CRITICAL</span>
                        <span className="text-xs font-bold text-white">PCI Compliance Violation</span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant leading-relaxed font-mono-code">Line 5: Raw card numbers must never be passed to charge APIs. Use Stripe tokens instead.</p>
                    </div>
                    <div className="glass-card rounded-lg p-3.5 border-l-2 border-warning/60">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-warning/20 text-warning">WARNING</span>
                        <span className="text-xs font-bold text-white">No Input Validation</span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant leading-relaxed font-mono-code">Line 3: Amount should be validated as a positive integer before processing.</p>
                    </div>
                    <div className="glass-card rounded-lg p-3.5 border-l-2 border-secondary/60">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-secondary/20 text-secondary">INFO</span>
                        <span className="text-xs font-bold text-white">Add Error Handling</span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant leading-relaxed font-mono-code">Wrap charge creation in try/catch for graceful failure handling.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA Section ── */}
        <section className="max-w-7xl mx-auto px-6 py-16">
          <div className="relative rounded-3xl p-16 text-center border border-white/[0.08] overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(34,211,238,0.05) 100%)' }}>
            <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-primary-container blur-[100px] opacity-20 rounded-full" />
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-secondary blur-[100px] opacity-10 rounded-full" />
            <h2 className="text-4xl md:text-5xl font-extrabold mb-5 relative z-10 tracking-tight" style={{ fontFamily: "'Geist', sans-serif" }}>
              Ready to Elevate Your Workflow?
            </h2>
            <p className="text-on-surface-variant text-lg max-w-xl mx-auto mb-8 relative z-10">
              Join 500+ engineering teams already shipping code 4x faster with Nexus AI.
            </p>
            <Link href="/signup" className="relative z-10 inline-block bg-primary-container text-white px-10 py-4 rounded-xl font-bold primary-glow transition-all hover:scale-105 active:scale-95 text-sm tracking-wide">
              Start Your Free Audit Now
            </Link>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="bg-surface-container-lowest w-full py-16 border-t border-outline-variant mt-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 px-6 max-w-7xl mx-auto">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-primary-container shadow-[0_0_6px_rgba(124,58,237,0.6)]" />
                <span className="text-xl font-extrabold text-white" style={{ fontFamily: "'Geist', sans-serif" }}>Nexus AI</span>
              </div>
              <p className="text-on-surface-variant text-sm" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' }}>Illuminating codebases with unparalleled intelligence.</p>
            </div>
            <div>
              <h5 className="text-xs font-semibold tracking-[0.1em] uppercase text-primary mb-4">Product</h5>
              <ul className="space-y-3 text-on-surface-variant text-sm">
                <li><a className="hover:text-secondary transition-colors" href="#">Documentation</a></li>
                <li><a className="hover:text-secondary transition-colors" href="#">Changelog</a></li>
                <li><a className="hover:text-secondary transition-colors" href="#">Security</a></li>
              </ul>
            </div>
            <div>
              <h5 className="text-xs font-semibold tracking-[0.1em] uppercase text-primary mb-4">Company</h5>
              <ul className="space-y-3 text-on-surface-variant text-sm">
                <li><a className="hover:text-secondary transition-colors" href="#">About</a></li>
                <li><a className="hover:text-secondary transition-colors" href="#">Blog</a></li>
                <li><a className="hover:text-secondary transition-colors" href="#">Careers</a></li>
              </ul>
            </div>
            <div>
              <h5 className="text-xs font-semibold tracking-[0.1em] uppercase text-primary mb-4">Legal</h5>
              <ul className="space-y-3 text-on-surface-variant text-sm">
                <li><a className="hover:text-secondary transition-colors" href="#">Privacy Policy</a></li>
                <li><a className="hover:text-secondary transition-colors" href="#">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="max-w-7xl mx-auto px-6 mt-12 pt-6 border-t border-white/[0.05] text-center md:text-left text-on-surface-variant text-xs tracking-[0.1em] uppercase">
            © 2026 Nexus AI. Illuminated by Intelligence.
          </div>
        </footer>
      </main>
    </>
  );
}
