'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Finding {
  id: string;
  source: 'static_analysis' | 'ai_review';
  severity: 'critical' | 'warning' | 'info';
  category: string;
  issue: string;
  explanation: string;
  suggested_fix: string;
  line_number: number;
}

interface ReviewDetail {
  review: {
    id: string;
    fileName: string;
    language: string;
    overall_score: number;
    summary: string;
    created_at: string;
  };
  findings: Finding[];
  code: { num: number; content: string; status: string; annotation: string | null }[];
  metrics: { loc: number; complexity: number };
}

export default function ReviewDetailPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const [data, setData] = useState<ReviewDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [expandedFinding, setExpandedFinding] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  const getHeaders = () => ({ 'Authorization': `Bearer ${localStorage.getItem('token')}` });

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  };

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/reviews/${id}`, { headers: getHeaders() })
      .then(r => r.ok ? r.json() : Promise.reject('Not found'))
      .then(d => setData(d))
      .catch(() => setError('Review report not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex-grow flex items-center justify-center min-h-[500px]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-outline-glass border-t-secondary animate-spin" />
          <div className="absolute inset-2 rounded-full border border-outline-glass border-b-primary animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
        </div>
        <p className="text-sm font-mono-code text-on-surface-variant">Parsing static analysis &amp; AI audit data...</p>
      </div>
    </div>
  );

  if (error || !data) return (
    <div className="flex-grow flex items-center justify-center min-h-[500px]">
      <div className="text-center flex flex-col gap-4 max-w-sm">
        <span className="material-symbols-outlined text-critical mx-auto" style={{ fontSize: '48px' }}>error</span>
        <h2 className="text-lg font-bold text-white">Failed to load report</h2>
        <p className="text-xs text-on-surface-variant leading-relaxed">{error || 'Unable to fetch audit logs.'}</p>
        <Link href="/dashboard/reviews" className="mt-2 bg-surface-container border border-outline-glass py-2 px-4 rounded-lg text-xs font-semibold text-white hover:bg-surface-variant transition-colors">
          ← Return to Archives
        </Link>
      </div>
    </div>
  );

  const { review, findings, code, metrics } = data;
  const criticalCount = findings.filter(f => f.severity === 'critical').length;
  const warningCount = findings.filter(f => f.severity === 'warning').length;
  const infoCount = findings.filter(f => f.severity === 'info').length;
  const filteredFindings = findings.filter(f => activeFilter === 'all' || f.severity === activeFilter);

  const scoreOffset = 283 - (283 * Math.min(review.overall_score, 100)) / 100;
  const scoreColor = review.overall_score >= 80 ? '#10B981' : review.overall_score >= 50 ? '#F59E0B' : '#EF4444';
  const scoreLabel = review.overall_score >= 80 ? 'Good condition' : review.overall_score >= 50 ? 'Needs work' : 'Poor quality';

  const severityColor = (s: string) => s === 'critical' ? '#EF4444' : s === 'warning' ? '#F59E0B' : '#5de6ff';
  const severityBg = (s: string) => s === 'critical' ? 'bg-critical/10 text-critical border-critical/20' : s === 'warning' ? 'bg-warning/10 text-warning border-warning/20' : 'bg-secondary/10 text-secondary border-secondary/20';
  const severityIcon = (s: string) => s === 'critical' ? 'error' : s === 'warning' ? 'warning' : 'info';

  // Build annotated code lines with finding info
  const findingsByLine = new Map<number, Finding[]>();
  findings.forEach(f => {
    if (!findingsByLine.has(f.line_number)) findingsByLine.set(f.line_number, []);
    findingsByLine.get(f.line_number)!.push(f);
  });

  return (
    <div className="flex flex-col gap-0 w-full relative z-10 -m-6" style={{ margin: 0 }}>

      {/* ── Context Header ── */}
      <header className="px-6 py-4 border-b border-outline-glass flex justify-between items-center bg-surface-container-lowest/50 backdrop-blur-sm">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/dashboard/reviews" className="text-on-surface-variant hover:text-white transition-colors shrink-0">
            <span className="material-symbols-outlined text-base">arrow_back</span>
          </Link>
          <div className="flex items-center gap-2 text-on-surface-variant text-sm min-w-0">
            <span className="material-symbols-outlined text-base text-secondary">description</span>
            <h1 className="text-white font-semibold truncate">{review.fileName}</h1>
            <span className="bg-surface-variant px-2 py-0.5 rounded-full text-[10px] text-on-surface border border-outline-glass shrink-0">{review.language}</span>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => router.push('/dashboard/submit')}
            className="border border-outline-glass px-3 py-1.5 rounded-lg text-on-surface hover:bg-white/5 transition-colors flex items-center gap-1.5 text-sm">
            <span className="material-symbols-outlined text-[16px]">add</span> New Review
          </button>
          <button onClick={handleShare}
            className="bg-primary-container text-white px-3 py-1.5 rounded-lg font-medium hover:bg-inverse-primary transition-colors shadow-[0_0_15px_rgba(124,58,237,0.3)] flex items-center gap-1.5 text-sm">
            <span className="material-symbols-outlined text-[16px]">{shareCopied ? 'check' : 'share'}</span> {shareCopied ? 'Link Copied!' : 'Share Report'}
          </button>
        </div>
      </header>

      {/* ── Stats Row ── */}
      <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Health Score */}
        <div className="glass-panel rounded-xl p-4 flex items-center gap-4">
          <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" fill="none" r="45" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
              <circle cx="50" cy="50" fill="none" r="45" stroke={scoreColor} strokeLinecap="round" strokeWidth="7"
                strokeDasharray="283" strokeDashoffset={scoreOffset} className="transition-all duration-1000" />
            </svg>
            <span className="absolute text-sm font-bold text-white">{review.overall_score}<span className="text-[9px] text-on-surface-variant">%</span></span>
          </div>
          <div>
            <h3 className="text-xs text-on-surface-variant mb-1">Code Health</h3>
            <p className="text-sm font-semibold" style={{ color: scoreColor }}>{scoreLabel}</p>
            <p className="text-[10px] text-on-surface-variant/60 font-mono-code mt-0.5">{new Date(review.created_at).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Findings Summary */}
        <div className="glass-panel rounded-xl p-4 flex flex-col justify-center">
          <h3 className="text-xs text-on-surface-variant mb-3">Found Issues</h3>
          <div className="flex gap-4">
            {[
              { count: criticalCount, color: '#EF4444', label: 'Critical', glow: 'rgba(239,68,68,0.6)' },
              { count: warningCount, color: '#F59E0B', label: 'Warning', glow: 'rgba(245,158,11,0.6)' },
              { count: infoCount, color: '#5de6ff', label: 'Info', glow: 'rgba(93,230,255,0.6)' },
            ].map(({ count, color, label, glow }) => (
              <div key={label} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color, boxShadow: `0 0 8px ${glow}` }} />
                <div>
                  <div className="font-mono-code font-bold text-white text-sm">{count}</div>
                  <div className="text-[9px] text-on-surface-variant">{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Metrics */}
        <div className="glass-panel rounded-xl p-4 flex flex-col justify-center gap-2">
          <h3 className="text-xs text-on-surface-variant mb-1">Metrics</h3>
          <div className="flex justify-between items-center text-sm">
            <span className="text-on-surface-variant">Lines of Code</span>
            <span className="text-white font-mono-code">{metrics.loc}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-on-surface-variant">Complexity</span>
            <span className="font-mono-code flex items-center gap-1" style={{ color: metrics.complexity > 15 ? '#EF4444' : metrics.complexity > 8 ? '#F59E0B' : '#10B981' }}>
              {metrics.complexity} <span className="text-xs text-on-surface-variant">({metrics.complexity > 15 ? 'High' : metrics.complexity > 8 ? 'Moderate' : 'Low'})</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── Summary ── */}
      {review.summary && (
        <div className="px-6 pb-2">
          <div className="glass-panel rounded-xl p-4 flex gap-3 items-start">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-primary text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
            </div>
            <div>
              <p className="text-xs text-on-surface-variant mb-0.5 font-semibold uppercase tracking-widest">AI Summary</p>
              <p className="text-sm text-on-surface leading-relaxed">{review.summary}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Split View ── */}
      <div className="flex flex-col lg:flex-row gap-4 px-6 pb-6 flex-1" style={{ minHeight: '500px' }}>

        {/* Left: Code View */}
        <div className="w-full lg:w-[58%] glass-panel rounded-xl flex flex-col overflow-hidden border border-outline-glass">
          <div className="bg-surface-container-highest px-4 py-2 border-b border-outline-glass flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-on-surface-variant font-mono-code">
              <span>{review.language}</span>
              <span className="text-outline-variant">|</span>
              <span>UTF-8</span>
              <span className="text-outline-variant">|</span>
              <span>{metrics.loc} lines</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-critical" />
              <div className="w-2.5 h-2.5 rounded-full bg-warning" />
              <div className="w-2.5 h-2.5 rounded-full bg-success" />
            </div>
          </div>
          <div className="flex-1 overflow-auto bg-[#0d0d12] font-mono-code text-[12px] leading-relaxed select-text">
            {code.map((line) => {
              const lineFindings = findingsByLine.get(line.num) || [];
              const topFinding = lineFindings[0];
              const isActive = selectedLine === line.num;
              const isCrit = lineFindings.some(f => f.severity === 'critical');
              const isWarn = !isCrit && lineFindings.some(f => f.severity === 'warning');
              return (
                <div key={line.num}
                  className={`flex group relative ${isCrit ? 'bg-critical/8 border-l-2 border-critical' : isWarn ? 'bg-warning/8 border-l-2 border-warning' : 'border-l-2 border-transparent'} ${isActive ? 'ring-1 ring-inset ring-primary/40' : ''}`}
                  onClick={() => topFinding && setSelectedLine(line.num)}
                >
                  <div className={`w-12 text-right pr-3 select-none border-r border-outline-glass mr-3 py-0.5 flex items-center justify-end gap-1 ${isCrit ? 'text-critical' : isWarn ? 'text-warning' : 'text-on-surface-variant/40'}`}>
                    {(isCrit || isWarn) && <span className="material-symbols-outlined text-[11px]">{isCrit ? 'error' : 'warning'}</span>}
                    {line.num}
                  </div>
                  <div className={`whitespace-pre py-0.5 pr-4 flex-1 ${topFinding ? 'cursor-pointer' : ''}`}
                    style={{ color: '#A6ACCD' }}>
                    {line.content}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Findings */}
        <div className="w-full lg:w-[42%] flex flex-col gap-3">
          {/* Filter Buttons */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[
              { key: 'all', label: `All (${findings.length})`, cls: activeFilter === 'all' ? 'bg-white/10 text-white border-outline-glass' : 'bg-surface-container text-on-surface-variant border-outline-glass hover:bg-white/5' },
              { key: 'critical', label: `Critical (${criticalCount})`, cls: activeFilter === 'critical' ? 'bg-critical/20 text-critical border-critical/30' : 'bg-surface-container text-on-surface-variant border-outline-glass hover:bg-white/5' },
              { key: 'warning', label: `Warning (${warningCount})`, cls: activeFilter === 'warning' ? 'bg-warning/20 text-warning border-warning/30' : 'bg-surface-container text-on-surface-variant border-outline-glass hover:bg-white/5' },
              { key: 'info', label: `Info (${infoCount})`, cls: activeFilter === 'info' ? 'bg-secondary/20 text-secondary border-secondary/30' : 'bg-surface-container text-on-surface-variant border-outline-glass hover:bg-white/5' },
            ].map(({ key, label, cls }) => (
              <button key={key} onClick={() => setActiveFilter(key)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border whitespace-nowrap transition-colors ${cls}`}>
                {label}
              </button>
            ))}
          </div>

          {/* Findings Scroll Area */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1" style={{ maxHeight: '580px' }}>
            {filteredFindings.length === 0 ? (
              <div className="py-12 text-center text-xs text-on-surface-variant/40 font-mono-code">
                No {activeFilter === 'all' ? '' : activeFilter} findings found.
              </div>
            ) : filteredFindings.map(finding => {
              const isExpanded = expandedFinding === finding.id;
              return (
                <div key={finding.id}
                  className={`glass-panel rounded-xl p-4 border border-outline-glass relative overflow-hidden transition-all cursor-pointer ${selectedLine === finding.line_number ? 'border-primary/50 shadow-[0_0_12px_rgba(124,58,237,0.2)]' : 'hover:bg-white/[0.02]'}`}
                  onClick={() => { setSelectedLine(finding.line_number); setExpandedFinding(isExpanded ? null : finding.id); }}
                >
                  {/* Left severity bar */}
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl" style={{ backgroundColor: severityColor(finding.severity) }} />

                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${severityBg(finding.severity)}`}>
                        <span className="material-symbols-outlined text-[12px]">{severityIcon(finding.severity)}</span>
                        {finding.severity.charAt(0).toUpperCase() + finding.severity.slice(1)}
                      </span>
                      <span className="text-[10px] text-on-surface-variant font-mono-code">Line {finding.line_number}</span>
                    </div>
                    <span className="material-symbols-outlined text-on-surface-variant text-[18px] transition-transform"
                      style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>expand_more</span>
                  </div>

                  <h4 className="text-sm font-semibold text-white mb-1">{finding.issue}</h4>

                  {isExpanded && (
                    <>
                      <p className="text-xs text-on-surface-variant mb-3 leading-relaxed">{finding.explanation}</p>

                      {finding.suggested_fix && (
                        <div className="rounded-lg overflow-hidden border border-outline-glass font-mono-code text-[11px] bg-[#0d0d12] mb-3">
                          <div className="bg-surface-container-highest px-3 py-1.5 text-[9px] text-on-surface-variant/50 uppercase tracking-wider font-bold flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[11px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
                            AI Suggested Fix
                          </div>
                          <div className="bg-success/10 px-3 py-2 flex gap-2 text-on-surface leading-relaxed">
                            <span className="text-success select-none shrink-0">+</span>
                            <pre className="whitespace-pre-wrap break-all">{finding.suggested_fix}</pre>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 mt-1">
                        <button className="px-3 py-1.5 bg-surface-container-highest text-on-surface rounded text-xs hover:bg-white/10 transition-colors">
                          Ignore
                        </button>
                        <button className="px-3 py-1.5 bg-primary/20 text-primary border border-primary/30 rounded text-xs hover:bg-primary/30 transition-colors flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">check</span> Mark Resolved
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
