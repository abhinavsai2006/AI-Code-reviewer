'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function SubmitCodePage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('auto');
  const [fileName, setFileName] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const [scanDeep, setScanDeep] = useState(true);
  const [scanStrict, setScanStrict] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('Uploading submission to sandbox...');
  const [progress, setProgress] = useState(0);
  const [detectedLang, setDetectedLang] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  });

  const getLangLabel = (val: string) => {
    if (val === 'auto' && detectedLang) return `🔍 ${detectedLang} (auto-detected)`;
    const map: Record<string, string> = {
      auto: '✨ Auto-Detect', ts: 'TypeScript', js: 'JavaScript', py: 'Python',
      java: 'Java', cpp: 'C++', cs: 'C#', go: 'Go', rs: 'Rust', php: 'PHP', rb: 'Ruby', sql: 'SQL',
    };
    return map[val] || 'Auto-Detect';
  };

  const processFile = (file: File) => {
    setFileName(file.name);
    setUploadStatus(`Loaded: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
    const reader = new FileReader();
    reader.onload = (evt) => setCode(evt.target?.result as string || '');
    reader.readAsText(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleSubmit = async () => {
    if (!code.trim()) {
      alert('Please paste code or drag a file to analyze.');
      return;
    }
    setLoading(true);
    setProgress(10);
    setLoadingStep('Uploading submission to sandbox...');

    try {
      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          language: language === 'auto' ? 'auto' : getLangLabel(language),
          raw_code: code,
          fileName: fileName || `code_snippet.${language === 'auto' ? 'txt' : language}`
        })
      });
      const data = await response.json();

      if (response.ok) {
        const reviewId = data.review_id;
        const eventSource = new EventSource(`/api/reviews/${reviewId}/stream`);

        eventSource.onmessage = async (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.status === 'pending') {
              setProgress(25);
              setLoadingStep('Pipeline worker initialised...');
            } else if (payload.status === 'running') {
              setProgress(60);
              setLoadingStep('Running static linter + NVIDIA Llama AI...');
            } else if (payload.status === 'completed') {
              setProgress(100);
              setLoadingStep('Analysis complete — loading report...');
              eventSource.close();
              if (language === 'auto') {
                try {
                  const r = await fetch(`/api/reviews/${reviewId}`, { headers: getHeaders() });
                  if (r.ok) {
                    const d = await r.json();
                    const detected = d.review?.language || d.language || '';
                    if (detected) setDetectedLang(detected);
                  }
                } catch (_) {}
              }
              setTimeout(() => { setLoading(false); router.push(`/dashboard/reviews/${reviewId}`); }, 800);
            } else if (payload.status === 'failed') {
              eventSource.close();
              setLoading(false);
              alert(`Pipeline error: ${payload.error || 'Unknown analysis error'}`);
            }
          } catch (e) { console.error('SSE parse error:', e); }
        };

        eventSource.onerror = () => {
          eventSource.close();
          // Polling fallback
          const interval = setInterval(async () => {
            try {
              const res = await fetch(`/api/reviews/${reviewId}`, { headers: getHeaders() });
              const d = await res.json();
              if (res.ok && d.review) {
                if (d.review.status === 'completed') {
                  clearInterval(interval);
                  setLoading(false);
                  router.push(`/dashboard/reviews/${reviewId}`);
                } else if (d.review.status === 'failed') {
                  clearInterval(interval);
                  setLoading(false);
                  alert(`Review failed: ${d.review.error_message || 'Internal pipeline error'}`);
                }
              }
            } catch { clearInterval(interval); setLoading(false); }
          }, 1500);
        };
      } else {
        setLoading(false);
        alert(`Error: ${data.error}`);
      }
    } catch {
      setLoading(false);
      alert('Network error submitting review.');
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full relative">

      {/* Header */}
      <div className="flex flex-col gap-1 max-w-3xl">
        <h1 className="text-3xl font-bold text-white tracking-tight">Submit Your Code for Review</h1>
        <p className="text-on-surface-variant text-base">
          Paste your source code snippet or drop local files below. Our review engine automatically detects the language and runs static + AI audits.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">

        {/* ── Left: Submission Panel ── */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="glass-panel rounded-xl overflow-hidden flex flex-col">

            {/* Panel Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-outline-glass bg-surface-container-lowest/50">
              <div className="flex items-center gap-2 bg-surface-variant px-3 py-1 rounded-full border border-outline-glass">
                <span className="w-2 h-2 rounded-full bg-success shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
                <span className="font-mono-code text-xs text-on-surface font-semibold">{getLangLabel(language)}</span>
              </div>
              <select
                value={language}
                onChange={e => setLanguage(e.target.value)}
                className="bg-transparent border-none text-on-surface-variant hover:text-on-surface text-sm cursor-pointer focus:ring-0 focus:outline-none"
              >
                <option value="auto" className="bg-[#0A0A0F]">✨ Auto-Detect Language</option>
                <option disabled className="bg-[#0A0A0F] text-outline">── Common ──</option>
                <option value="ts" className="bg-[#0A0A0F]">TypeScript (.ts)</option>
                <option value="js" className="bg-[#0A0A0F]">JavaScript (.js)</option>
                <option value="py" className="bg-[#0A0A0F]">Python (.py)</option>
                <option value="java" className="bg-[#0A0A0F]">Java (.java)</option>
                <option disabled className="bg-[#0A0A0F] text-outline">── Systems ──</option>
                <option value="cpp" className="bg-[#0A0A0F]">C++ (.cpp)</option>
                <option value="cs" className="bg-[#0A0A0F]">C# (.cs)</option>
                <option value="rs" className="bg-[#0A0A0F]">Rust (.rs)</option>
                <option value="go" className="bg-[#0A0A0F]">Go (.go)</option>
                <option disabled className="bg-[#0A0A0F] text-outline">── Web / Data ──</option>
                <option value="php" className="bg-[#0A0A0F]">PHP (.php)</option>
                <option value="rb" className="bg-[#0A0A0F]">Ruby (.rb)</option>
                <option value="sql" className="bg-[#0A0A0F]">SQL (.sql)</option>
              </select>
            </div>

            {/* Code Textarea */}
            <div className="bg-surface-container-lowest flex font-mono-code text-[13px] min-h-[320px]">
              {/* Line numbers */}
              <div className="text-right pr-3 text-outline select-none border-r border-outline-glass py-3 min-w-[40px]"
                style={{ background: 'rgba(0,0,0,0.2)' }}>
                {(code || ' ').split('\n').map((_, i) => (
                  <div key={i} className="leading-relaxed px-2">{i + 1}</div>
                ))}
              </div>
              {/* Editor */}
              <textarea
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder={'// Paste your code here...\n// All languages supported — AI auto-detects\n\nfunction example() {\n  return "Hello World";\n}'}
                spellCheck={false}
                className="flex-1 bg-transparent text-on-surface-variant p-3 resize-none focus:outline-none leading-relaxed placeholder:text-outline/40 font-mono-code text-[13px]"
              />
            </div>

            {/* Divider */}
            <div className="relative flex py-2 items-center px-4">
              <div className="flex-grow border-t border-outline-glass" />
              <span className="flex-shrink-0 mx-4 text-[11px] font-mono-code text-on-surface-variant uppercase tracking-widest">OR</span>
              <div className="flex-grow border-t border-outline-glass" />
            </div>

            {/* Drop Zone */}
            <div
              className={`mx-4 mb-0 border-2 border-dashed rounded-lg bg-surface-container-low/50 p-8 flex flex-col items-center justify-center text-center cursor-pointer group transition-colors ${
                isDragging ? 'border-secondary bg-secondary/5' : 'border-outline-variant hover:border-secondary'
              }`}
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                accept=".js,.ts,.py,.go,.rs,.java,.cpp,.cs,.php,.rb,.sql"
              />
              <div className="p-2 bg-surface-variant rounded-full mb-2 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-secondary" style={{ fontSize: '32px' }}>folder_open</span>
              </div>
              <p className="text-on-surface font-semibold mb-1">
                {uploadStatus ? <span className="text-primary">{uploadStatus}</span> : <>Drag &amp; drop files here, or <span className="text-secondary hover:underline">browse local files</span></>}
              </p>
              <p className="text-on-surface-variant text-xs opacity-75">Supported: .js, .ts, .py, .java, .cpp, .cs, .go, .rs, .php, .rb, .sql (Max 5MB)</p>
            </div>

            {/* Footer */}
            <div className="bg-surface-container-lowest/80 border-t border-outline-glass p-4 flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
              <div className="flex flex-col gap-2 w-full sm:w-auto">
                <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors text-sm text-on-surface-variant">
                  <input type="checkbox" checked={scanDeep} onChange={e => setScanDeep(e.target.checked)}
                    className="rounded border-outline bg-transparent text-secondary focus:ring-0 accent-secondary" />
                  Enable AI deep-scan
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors text-sm text-on-surface-variant">
                  <input type="checkbox" checked={scanStrict} onChange={e => setScanStrict(e.target.checked)}
                    className="rounded border-outline bg-transparent text-secondary focus:ring-0 accent-secondary" />
                  Enable strict static rules
                </label>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  onClick={() => { setCode(''); setFileName(''); setUploadStatus(''); setDetectedLang(''); }}
                  className="px-4 py-2 rounded-lg border border-outline-glass text-on-surface hover:bg-surface-variant transition-colors text-xs font-semibold tracking-widest uppercase"
                >Clear</button>
                <button
                  onClick={handleSubmit}
                  className="px-6 py-2 rounded-lg bg-primary-container text-white text-xs font-semibold tracking-widest uppercase shadow-[0_0_15px_rgba(124,58,237,0.3)] hover:shadow-[0_0_25px_rgba(124,58,237,0.5)] transition-all active:scale-95 flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">play_arrow</span>
                  Run Code Review
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: Side Cards ── */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Security Card */}
          <div className="glass-panel rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-success/10 rounded-full blur-xl animate-pulse pointer-events-none" />
            <div className="flex items-center gap-2 text-success mb-1">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>security</span>
              <h3 className="font-semibold text-on-surface text-sm">Security First</h3>
            </div>
            <p className="text-on-surface-variant text-xs leading-relaxed">
              Your code is analyzed in isolated environments and never stored without permission. We adhere to strict zero-retention policies for all submitted source code.
            </p>
          </div>

          {/* Engines Card */}
          <div className="glass-panel rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-secondary mb-1">
              <span className="material-symbols-outlined">memory</span>
              <h3 className="font-semibold text-on-surface text-sm">Supported Engines</h3>
            </div>
            <ul className="flex flex-col gap-1 font-mono-code text-[11px] text-on-surface-variant">
              {[
                { name: 'ESLint / TSLint', status: 'success' },
                { name: 'Pylint / Black', status: 'success' },
                { name: 'Cargo Clippy', status: 'success' },
                { name: 'NVIDIA Llama AI', status: 'success' },
                { name: 'SonarQube Core', status: 'warning' },
              ].map(({ name, status }) => (
                <li key={name} className="flex items-center justify-between p-1.5 rounded bg-surface-container-lowest/50 border border-outline-glass/50 hover:border-outline-glass transition-colors">
                  <span className="text-on-surface">{name}</span>
                  <span className={`w-2 h-2 rounded-full bg-${status}`} />
                </li>
              ))}
            </ul>
          </div>

          {/* Stats Card */}
          <div className="glass-panel rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-primary mb-1">
              <span className="material-symbols-outlined">bar_chart</span>
              <h3 className="font-semibold text-on-surface text-sm">Session Stats</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Reviews Done', value: '—', icon: 'check_circle' },
                { label: 'Issues Found', value: '—', icon: 'bug_report' },
                { label: 'Avg Score', value: '—', icon: 'grade' },
                { label: 'Files Scanned', value: '—', icon: 'description' },
              ].map(({ label, value, icon }) => (
                <div key={label} className="bg-surface-container-lowest/50 border border-outline-glass/50 rounded-lg p-2.5 flex flex-col gap-1">
                  <span className="material-symbols-outlined text-on-surface-variant text-sm">{icon}</span>
                  <span className="text-white font-mono-code text-sm font-bold">{value}</span>
                  <span className="text-on-surface-variant text-[10px]">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══ Premium Loading Overlay ══ */}
      {loading && (
        <div className="fixed inset-0 z-50 bg-[#06060C]/97 backdrop-blur-2xl flex flex-col items-center justify-center gap-8 overflow-hidden">
          {/* Ambient orbs */}
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/8 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-secondary/8 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1.2s' }} />

          {/* Orbital animation */}
          <div className="relative flex items-center justify-center" style={{ width: 160, height: 160 }}>
            {/* Rings */}
            <div className="absolute inset-0 rounded-full border border-primary/15 animate-spin" style={{ animationDuration: '12s' }} />
            <div className="absolute rounded-full border-2 border-transparent border-t-primary border-r-secondary/70 animate-spin" style={{ inset: 10, animationDuration: '3.5s' }} />
            <div className="absolute rounded-full border border-secondary/20 animate-spin" style={{ inset: 22, animationDuration: '6s', animationDirection: 'reverse' }} />
            <div className="absolute rounded-full border border-primary/10 animate-spin" style={{ inset: 34, animationDuration: '9s' }} />
            {/* Pulsing core */}
            <div className="absolute rounded-full bg-gradient-to-br from-primary/15 to-secondary/15 animate-pulse" style={{ inset: 42 }} />
            {/* Orbiting dot 1 */}
            <div className="absolute w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_10px_rgba(210,187,255,0.9)] animate-spin"
              style={{ top: 6, left: '50%', marginLeft: -5, animationDuration: '3.5s', transformOrigin: '5px 74px' }} />
            {/* Orbiting dot 2 */}
            <div className="absolute w-2 h-2 rounded-full bg-secondary shadow-[0_0_8px_rgba(93,230,255,0.9)] animate-spin"
              style={{ top: 16, left: '50%', marginLeft: -4, animationDuration: '6s', animationDirection: 'reverse', transformOrigin: '4px 64px' }} />
            {/* AI Icon */}
            <span className="material-symbols-outlined text-primary text-[44px] z-10 drop-shadow-[0_0_16px_rgba(210,187,255,0.9)]"
              style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
          </div>

          {/* Title */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Nexus AI Engine Running</h2>
            <p className="text-secondary font-mono-code text-sm">{loadingStep}</p>
          </div>

          {/* Terminal log */}
          <div className="font-mono-code text-[11px] text-on-surface-variant/60 flex flex-col gap-1.5 text-left w-80 bg-surface-container-lowest/40 rounded-lg p-4 border border-outline-glass/30">
            <div className={`flex gap-2 transition-opacity duration-500 ${progress >= 10 ? 'opacity-100' : 'opacity-0'}`}>
              <span className="text-success shrink-0">✓</span><span>Submission received — sandbox allocated</span>
            </div>
            <div className={`flex gap-2 transition-opacity duration-700 ${progress >= 25 ? 'opacity-100' : 'opacity-0'}`}>
              <span className="text-success shrink-0">✓</span><span>Pipeline worker initialised</span>
            </div>
            <div className={`flex gap-2 transition-opacity duration-700 ${progress >= 60 ? 'opacity-100' : 'opacity-0'}`}>
              <span className="text-secondary animate-pulse shrink-0">⟳</span><span>Running static linter + NVIDIA Llama AI…</span>
            </div>
            <div className={`flex gap-2 transition-opacity duration-700 ${progress >= 100 ? 'opacity-100' : 'opacity-0'}`}>
              <span className="text-success shrink-0">✓</span><span>Analysis complete — loading your report</span>
            </div>
          </div>

          {/* Progress */}
          <div className="w-80 flex flex-col gap-2">
            <div className="flex justify-between text-[10px] text-on-surface-variant/50 font-mono-code">
              <span>Processing…</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full h-1 bg-outline-glass rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, #7c3aed, #5de6ff, #7c3aed)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 2s linear infinite'
                }}
              />
            </div>
          </div>

          <style>{`@keyframes shimmer { 0%{background-position:100% 0} 100%{background-position:-100% 0} }`}</style>
        </div>
      )}
    </div>
  );
}
