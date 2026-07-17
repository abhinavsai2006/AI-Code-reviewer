'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface ReviewRecord {
  id: string;
  fileName: string;
  language: string;
  date: string;
  score: number;
  critical: number;
  warning: number;
  info: number;
}

const LANG_COLORS: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  'TypeScript': { bg: 'bg-[#3178C6]/10', border: 'border-[#3178C6]/20', text: 'text-[#3178C6]', icon: 'data_object' },
  'JavaScript': { bg: 'bg-[#F7DF1E]/10', border: 'border-[#F7DF1E]/20', text: 'text-[#F7DF1E]', icon: 'javascript' },
  'Python': { bg: 'bg-[#3776AB]/10', border: 'border-[#3776AB]/20', text: 'text-[#3776AB]', icon: 'terminal' },
  'Java': { bg: 'bg-[#ED8B00]/10', border: 'border-[#ED8B00]/20', text: 'text-[#ED8B00]', icon: 'coffee' },
  'C++': { bg: 'bg-[#00599C]/10', border: 'border-[#00599C]/20', text: 'text-[#00599C]', icon: 'memory' },
  'C#': { bg: 'bg-[#9B4F97]/10', border: 'border-[#9B4F97]/20', text: 'text-[#9B4F97]', icon: 'code' },
  'Go': { bg: 'bg-[#00ADD8]/10', border: 'border-[#00ADD8]/20', text: 'text-[#00ADD8]', icon: 'integration_instructions' },
  'Rust': { bg: 'bg-[#DEA584]/10', border: 'border-[#DEA584]/20', text: 'text-[#DEA584]', icon: 'settings_applications' },
  'PHP': { bg: 'bg-[#777BB4]/10', border: 'border-[#777BB4]/20', text: 'text-[#777BB4]', icon: 'php' },
  'Ruby': { bg: 'bg-[#CC342D]/10', border: 'border-[#CC342D]/20', text: 'text-[#CC342D]', icon: 'diamond' },
  'SQL': { bg: 'bg-[#4479A1]/10', border: 'border-[#4479A1]/20', text: 'text-[#4479A1]', icon: 'storage' },
};

export default function ReviewHistoryPage() {
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [language, setLanguage] = useState('all');
  const [scoreFilter, setScoreFilter] = useState('all');

  const getHeaders = () => ({ 'Authorization': `Bearer ${localStorage.getItem('token')}` });

  const loadHistory = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/reviews', { headers: getHeaders() });
      if (res.ok) setReviews(await res.json());
      else setError('Failed to fetch review logs.');
    } catch { setError('Connection error loading history logs.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadHistory(); }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this review report from archives?')) return;
    try {
      const res = await fetch(`/api/reviews/${id}`, { method: 'DELETE', headers: getHeaders() });
      if (res.ok) setReviews(prev => prev.filter(r => r.id !== id));
      else alert('Failed to delete review report.');
    } catch { alert('Network error deleting review report.'); }
  };

  const filteredReviews = reviews.filter(rev => {
    const matchSearch = (rev.fileName || '').toLowerCase().includes(search.toLowerCase());
    const matchLang = language === 'all' || rev.language === language;
    const matchScore = scoreFilter === 'all' ||
      (scoreFilter === '80' && rev.score >= 80) ||
      (scoreFilter === '50' && rev.score >= 50 && rev.score < 80) ||
      (scoreFilter === '0' && rev.score < 50);
    return matchSearch && matchLang && matchScore;
  });

  const getScoreStyle = (score: number) => {
    if (score >= 80) return 'border-success text-success bg-success/5';
    if (score >= 50) return 'border-warning text-warning bg-warning/5';
    return 'border-critical text-critical bg-critical/5';
  };

  const getLangIcon = (lang: string) => LANG_COLORS[lang] || { bg: 'bg-primary/10', border: 'border-primary/20', text: 'text-primary', icon: 'code' };

  return (
    <div className="flex flex-col gap-6 w-full relative">
      {/* Ambient left glow */}
      <div className="fixed top-0 left-0 w-[40vw] h-screen pointer-events-none z-0"
        style={{ background: 'radial-gradient(ellipse at left, rgba(124,58,237,0.12) 0%, rgba(93,230,255,0.04) 50%, transparent 70%)' }} />

      {/* Header */}
      <header className="relative z-10 flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-white tracking-tight">Review History</h1>
        <p className="text-on-surface-variant">Track and search all previous automated and AI code audits. Click any file to view details.</p>
      </header>

      {/* Search & Filter */}
      <div className="glass-panel rounded-xl p-3 flex flex-col md:flex-row gap-3 items-center justify-between relative z-10">
        <div className="relative w-full md:w-96 flex-shrink-0">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
          <input
            type="text"
            placeholder="Search by file name or keywords..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#0e0e13] border border-outline-glass rounded-lg pl-10 pr-4 py-2 text-sm text-on-surface placeholder:text-outline/50 focus:outline-none focus:border-secondary focus:shadow-[0_0_0_1px_rgba(93,230,255,0.2)] transition-all"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
          <div className="relative">
            <select value={language} onChange={e => setLanguage(e.target.value)}
              className="bg-[#0e0e13] border border-outline-glass text-on-surface rounded-lg pl-4 pr-8 py-2 text-sm appearance-none cursor-pointer focus:outline-none focus:border-secondary w-40">
              <option value="all">Language (All)</option>
              {Object.keys(LANG_COLORS).map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-sm">arrow_drop_down</span>
          </div>
          <div className="relative">
            <select value={scoreFilter} onChange={e => setScoreFilter(e.target.value)}
              className="bg-[#0e0e13] border border-outline-glass text-on-surface rounded-lg pl-4 pr-8 py-2 text-sm appearance-none cursor-pointer focus:outline-none focus:border-secondary w-36">
              <option value="all">Score (All)</option>
              <option value="80">80+</option>
              <option value="50">50–79</option>
              <option value="0">&lt;50</option>
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-sm">arrow_drop_down</span>
          </div>
          <button onClick={() => { setSearch(''); setLanguage('all'); setScoreFilter('all'); }}
            className="px-4 py-2 rounded-lg text-on-surface-variant hover:text-white hover:bg-white/5 border border-outline-glass transition-colors text-sm font-medium whitespace-nowrap active:scale-95">
            Reset Filters
          </button>
          <button onClick={loadHistory}
            className="p-2 rounded-lg text-on-surface-variant hover:text-white hover:bg-white/5 border border-outline-glass transition-colors active:scale-95">
            <span className="material-symbols-outlined text-sm">refresh</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel rounded-xl overflow-hidden mb-6 relative z-10">
        {loading ? (
          <div className="py-16 text-center font-mono-code text-xs text-on-surface-variant/40 flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-outline-glass border-t-secondary animate-spin" />
            Loading history logs...
          </div>
        ) : error ? (
          <div className="py-16 text-center text-xs text-critical font-mono-code">{error}</div>
        ) : filteredReviews.length === 0 ? (
          <div className="py-16 text-center flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-on-surface-variant/30 text-[48px]">history</span>
            <p className="text-xs text-on-surface-variant/40 font-mono-code">No logs saved matching current filters.</p>
            <Link href="/dashboard/submit" className="text-xs text-primary hover:underline mt-1">Submit your first review →</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-glass bg-surface-container-low/50">
                  <th className="py-4 px-6 text-[11px] font-semibold text-on-surface-variant uppercase tracking-widest">File Name</th>
                  <th className="py-4 px-6 text-[11px] font-semibold text-on-surface-variant uppercase tracking-widest">Language</th>
                  <th className="py-4 px-6 text-[11px] font-semibold text-on-surface-variant uppercase tracking-widest">Analysis Date</th>
                  <th className="py-4 px-6 text-[11px] font-semibold text-on-surface-variant uppercase tracking-widest">Findings</th>
                  <th className="py-4 px-6 text-[11px] font-semibold text-on-surface-variant uppercase tracking-widest text-center">Score</th>
                  <th className="py-4 px-6 text-[11px] font-semibold text-on-surface-variant uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-glass">
                {filteredReviews.map(rev => {
                  const lc = getLangIcon(rev.language);
                  return (
                    <tr key={rev.id} className="hover:bg-white/[0.025] transition-colors group cursor-pointer">
                      <td className="py-4 px-6">
                        <Link href={`/dashboard/reviews/${rev.id}`} className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded ${lc.bg} flex items-center justify-center border ${lc.border} shrink-0`}>
                            <span className={`material-symbols-outlined ${lc.text} text-sm`}>{lc.icon}</span>
                          </div>
                          <span className="font-mono-code text-white text-sm">{rev.fileName || 'untitled'}</span>
                        </Link>
                      </td>
                      <td className="py-4 px-6 text-on-surface-variant text-sm">{rev.language || '—'}</td>
                      <td className="py-4 px-6 font-mono-code text-on-surface-variant/80 text-[12px]">{rev.date || '—'}</td>
                      <td className="py-4 px-6">
                        <div className="flex flex-wrap gap-1.5">
                          {rev.critical > 0 && (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-critical/10 text-critical text-[11px] font-semibold border border-critical/20">
                              <span className="material-symbols-outlined text-[12px]">error</span> {rev.critical}
                            </span>
                          )}
                          {rev.warning > 0 && (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-warning/10 text-warning text-[11px] font-semibold border border-warning/20">
                              <span className="material-symbols-outlined text-[12px]">warning</span> {rev.warning}
                            </span>
                          )}
                          {rev.info > 0 && (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-secondary/10 text-secondary text-[11px] font-semibold border border-secondary/20">
                              <span className="material-symbols-outlined text-[12px]">info</span> {rev.info}
                            </span>
                          )}
                          {rev.critical === 0 && rev.warning === 0 && rev.info === 0 && (
                            <span className="inline-flex items-center gap-1 text-success text-[11px] font-semibold">
                              <span className="material-symbols-outlined text-[14px]">check_circle</span> Clean
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full border font-mono-code text-[12px] font-bold ${getScoreStyle(rev.score)}`}>
                          {rev.score}%
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link href={`/dashboard/reviews/${rev.id}`}
                            className="bg-primary-container text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-inverse-primary transition-colors">
                            View Details
                          </Link>
                          <button onClick={e => handleDelete(rev.id, e)}
                            className="bg-critical/10 hover:bg-critical/20 text-critical border border-critical/20 px-2 py-1.5 rounded-lg transition-colors flex items-center">
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
