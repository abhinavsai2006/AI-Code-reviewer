import React, { useState, useEffect, useRef } from 'react';

// Icons using Material Symbols
const Icon = ({ name, className = '', fill = false }) => (
  <span 
    className={`material-symbols-outlined select-none ${className}`}
    style={{ fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' 400` }}
  >
    {name}
  </span>
);

export default function App() {
  const [currentPage, setCurrentPage] = useState('landing');
  const [user, setUser] = useState(null);
  const [history, setHistory] = useState([
    { id: '1', fileName: 'PaymentProcessor.ts', language: 'TypeScript', date: '2026-07-16 14:32', critical: 1, warning: 2, info: 1, score: 82 },
    { id: '2', fileName: 'auth_helper.py', language: 'Python', date: '2026-07-15 09:12', critical: 0, warning: 1, info: 1, score: 94 },
    { id: '3', fileName: 'db_pool.go', language: 'Go', date: '2026-07-10 18:45', critical: 2, warning: 1, info: 0, score: 45 },
    { id: '4', fileName: 'string_utils.rs', language: 'Rust', date: '2026-07-05 11:20', critical: 0, warning: 0, info: 3, score: 98 }
  ]);
  const [activeReview, setActiveReview] = useState({
    fileName: 'PaymentProcessor.ts',
    language: 'TypeScript',
    score: 82,
    metrics: { loc: 142, complexity: '12 (Moderate)' },
    findings: [
      {
        id: 'f1',
        severity: 'critical',
        line: 12,
        title: 'SQL Injection Risk in query string',
        desc: 'Using string concatenation to build SQL queries allows arbitrary SQL execution. Secure the query execution parameter.',
        diff: {
          removed: '- const query = `SELECT * FROM users WHERE id = ${userId}`;',
          added: '+ const query = \'SELECT * FROM users WHERE id = ?\';'
        }
      },
      {
        id: 'f2',
        severity: 'warning',
        line: 18,
        title: 'Unused variable response',
        desc: 'Variable response is declared and fetched from paymentGateway.charge(amount) but is never read or used in follow-up instructions.',
        diff: {
          removed: '- const response = await paymentGateway.charge(amount);',
          added: '+ await paymentGateway.charge(amount);'
        }
      },
      {
        id: 'f3',
        severity: 'info',
        line: 22,
        title: 'Improve naming clarity',
        desc: 'The naming convention of processPayment represents a generic function scope. Ensure more descriptive parameters are passed.',
        diff: null
      }
    ],
    code: [
      { num: 10, content: 'export class PaymentProcessor {', status: 'normal' },
      { num: 11, content: '  async processPayment(userId: string, amount: number) {', status: 'normal' },
      { num: 12, content: '    const query = `SELECT * FROM users WHERE id = ${userId}`;', status: 'critical', annotation: 'AI Suggestion: Parameterize SQL query to prevent SQL Injection.' },
      { num: 13, content: '    const user = await db.execute(query);', status: 'normal' },
      { num: 14, content: '    if (!user) throw new Error(\'User not found\');', status: 'normal' },
      { num: 15, content: '    ', status: 'normal' },
      { num: 16, content: '    // Process transaction', status: 'normal' },
      { num: 17, content: '    // Trigger payment authorization hook', status: 'normal' },
      { num: 18, content: '    const response = await paymentGateway.charge(amount);', status: 'warning' },
      { num: 19, content: '    ', status: 'normal' },
      { num: 20, content: '    return { success: true };', status: 'normal' },
      { num: 21, content: '  }', status: 'normal' },
      { num: 22, content: '}' }
    ]
  });

  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Mesh Gradient WebGL Background Effect
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return;

    const vs = `
      attribute vec2 a_position;
      varying vec2 v_texCoord;
      void main() {
        v_texCoord = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const fs = `
      precision highp float;
      varying vec2 v_texCoord;
      uniform float u_time;
      uniform vec2 u_resolution;

      void main() {
        vec2 uv = v_texCoord;
        float t = u_time * 0.15;
        vec3 color1 = vec3(0.486, 0.227, 0.929); // #7C3AED (Violet)
        vec3 color2 = vec3(0.133, 0.827, 0.933); // #22D3EE (Cyan)
        vec3 bg = vec3(0.039, 0.039, 0.059);    // #0A0A0F (Onyx Background)
        
        float w1 = sin(uv.x * 2.2 + t) * 0.5 + 0.5;
        float w2 = cos(uv.y * 2.8 - t * 1.2) * 0.5 + 0.5;
        float w3 = sin((uv.x + uv.y) * 1.2 + t * 0.7) * 0.5 + 0.5;
        
        vec3 mixed = mix(color1, color2, w1 * w2);
        mixed = mix(mixed, bg, 1.0 - (w3 * 0.18));
        
        float dist = distance(uv, vec2(0.5));
        float vignette = smoothstep(0.9, 0.1, dist);
        
        gl_FragColor = vec4(mixed * vignette * 0.25, 1.0);
      }
    `;

    const cs = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };

    const prog = gl.createProgram();
    gl.attachShader(prog, cs(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, cs(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);

    const pos = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uRes = gl.getUniformLocation(prog, 'u_resolution');

    let animId;
    const render = (t) => {
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (uTime) gl.uniform1f(uTime, t * 0.001);
      if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animId = requestAnimationFrame(render);
    };
    render(0);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
    };
  }, []);

  // Handlers
  const handleStartReview = (fileName, language, codeContent) => {
    setIsLoading(true);
    setLoadingProgress(0);
    setLoadingStep('Booting isolated container...');

    const steps = [
      { text: 'Booting isolated container...', delay: 800, progress: 20 },
      { text: 'Parsing AST and syntax tree...', delay: 1600, progress: 45 },
      { text: 'Running linter & styling checks...', delay: 2400, progress: 70 },
      { text: 'Applying Neural Security rules...', delay: 3200, progress: 90 },
      { text: 'Compiling review metrics...', delay: 3800, progress: 100 }
    ];

    steps.forEach(step => {
      setTimeout(() => {
        setLoadingStep(step.text);
        setLoadingProgress(step.progress);

        if (step.progress === 100) {
          setTimeout(() => {
            setIsLoading(false);
            
            // Add custom review to state
            const newId = String(history.length + 1);
            const dateStr = new Date().toISOString().slice(0, 16).replace('T', ' ');
            
            setHistory(prev => [
              { id: newId, fileName, language, date: dateStr, critical: 0, warning: 1, info: 0, score: 76 },
              ...prev
            ]);

            setActiveReview({
              fileName,
              language,
              score: 76,
              metrics: { loc: codeContent.split('\n').length || 12, complexity: '4 (Low)' },
              findings: [
                {
                  id: 'f_custom_' + newId,
                  severity: 'warning',
                  line: 3,
                  title: 'String concat injection hazard',
                  desc: 'Ensure query builders use parameters instead of string concatenation templates.',
                  diff: null
                }
              ],
              code: codeContent.split('\n').map((line, idx) => ({
                num: idx + 1,
                content: line,
                status: line.includes('${') ? 'warning' : 'normal',
                annotation: line.includes('${') ? 'Security Risk: Parameter validation.' : null
              }))
            });

            setCurrentPage('results');
          }, 400);
        }
      }, step.delay);
    });
  };

  return (
    <div className="min-h-screen flex flex-col relative text-on-surface font-sans antialiased overflow-x-hidden">
      {/* Background WebGL mesh */}
      <div className="fixed inset-0 z-[-2] w-screen h-screen">
        <canvas ref={canvasRef} className="w-full h-full opacity-50" />
      </div>
      <div className="fixed inset-0 z-[-1] bg-gradient-to-b from-transparent via-[#0A0A0F]/80 to-[#0A0A0F] pointer-events-none" />

      {/* Shared Navigation Header */}
      <nav className="fixed top-0 w-full z-50 bg-[#0A0A0F]/65 backdrop-blur-xl border-b border-outline-glass shadow-2xl">
        <div className="flex justify-between items-center h-16 px-lg max-w-container-max mx-auto">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentPage('landing')}>
            <Icon name="terminal" className="text-primary text-[28px] font-bold" />
            <span className="text-lg font-bold text-primary tracking-tight">Nexus.AI</span>
          </div>

          <div className="hidden md:flex gap-lg items-center h-full">
            <button 
              onClick={() => setCurrentPage('landing')} 
              className={`py-1 text-sm font-medium transition-all ${currentPage === 'landing' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-secondary'}`}
            >
              Home
            </button>
            <button 
              onClick={() => setCurrentPage('submit')} 
              className={`py-1 text-sm font-medium transition-all ${currentPage === 'submit' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-secondary'}`}
            >
              Submit Code
            </button>
            <button 
              onClick={() => setCurrentPage('results')} 
              className={`py-1 text-sm font-medium transition-all ${currentPage === 'results' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-secondary'}`}
            >
              Results
            </button>
            <button 
              onClick={() => setCurrentPage('history')} 
              className={`py-1 text-sm font-medium transition-all ${currentPage === 'history' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-secondary'}`}
            >
              History
            </button>
          </div>

          <div className="flex gap-md items-center">
            {!user ? (
              <button onClick={() => setCurrentPage('auth')} className="text-on-surface text-sm hover:text-primary transition-colors hidden md:block">Sign In</button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-on-surface-variant font-mono">{user.email}</span>
                <button className="w-8 h-8 rounded-full overflow-hidden border border-outline-glass" onClick={() => setCurrentPage('history')}>
                  <img alt="Profile" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCzL4jfXQtrLw2NyNltEGwRFU9htMd9_l9cd-Zlkx-wafLLlbJkgeKGwRmJL4jM7sokgerzRIsMQGWWr6_5crU9zNcHINy6Dnsj1EXl1qhS_2gJugyymos-PXj0E6GS_q0E_F65tX_1AkJIEIrCohJxo-HkdxUntw0tkcd7nJ2XKIPPjmYi8akIBL9ztffESIru8pkSnudiINfl9wv-MzAuYP9ppMATaXynDYnqTNIRvrm0HcO3D6w9B-Ueb4WBNuqkyY37F3v_FhU" />
                </button>
              </div>
            )}
            <button onClick={() => setCurrentPage('submit')} className="bg-primary-container text-white px-md py-sm rounded-lg text-xs font-semibold shadow-[0_0_15px_rgba(124,58,237,0.3)] hover:shadow-[0_0_25px_rgba(124,58,237,0.5)] transition-all active:scale-95">Get Started</button>
          </div>
        </div>
      </nav>

      {/* Main Routed Area */}
      <main className="flex-grow pt-24 pb-xl z-10 relative">
        {currentPage === 'landing' && <LandingView onStart={() => setCurrentPage('submit')} />}
        {currentPage === 'submit' && <SubmitView onRunReview={handleStartReview} />}
        {currentPage === 'results' && <ResultsView review={activeReview} setReview={setActiveReview} />}
        {currentPage === 'history' && <HistoryView history={history} onViewItem={(item) => {
          if (item.fileName === 'PaymentProcessor.ts') {
            // Restore default values
            setActiveReview(prev => ({ ...prev, fileName: item.fileName, score: item.score }));
          } else {
            setActiveReview({
              fileName: item.fileName,
              language: item.language,
              score: item.score,
              metrics: { loc: 45, complexity: '2 (Low)' },
              findings: [{ id: 'f_hist_1', severity: 'warning', line: 4, title: 'Variable naming structure', desc: 'Confirm strict variable naming patterns.', diff: null }],
              code: [
                { num: 1, content: '// Audited file: ' + item.fileName },
                { num: 2, content: 'export function process() {' },
                { num: 3, content: '  let variableToken = "KEY_VAL";' },
                { num: 4, content: '  return variableToken;', status: 'warning', annotation: 'Recommended rename.' }
              ]
            });
          }
          setCurrentPage('results');
        }} />}
        {currentPage === 'auth' && <AuthView onLogin={(email) => { setUser({ email }); setCurrentPage('submit'); }} />}
      </main>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-[100] bg-[#0A0A0F]/90 backdrop-blur-md flex flex-col items-center justify-center gap-lg">
          <div className="relative w-24 h-24 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-outline-glass"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-secondary border-r-primary border-transparent animate-spin"></div>
            <Icon name="smart_toy" className="text-primary text-[36px]" fill />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-white mb-2">Nexus Review Engine Running...</h2>
            <p className="text-on-surface-variant text-sm font-mono h-6">{loadingStep}</p>
          </div>
          <div className="w-64 h-1.5 bg-outline-glass rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-300" style={{ width: `${loadingProgress}%` }}></div>
          </div>
        </div>
      )}

      {/* Shared Footer */}
      <footer className="w-full py-lg bg-[#0e0e13] border-t border-outline-glass mt-auto">
        <div className="max-w-container-max mx-auto px-lg flex flex-col md:flex-row justify-between items-center gap-md">
          <div className="text-xs text-on-surface-variant font-mono">
            © 2026 Nexus AI Systems. Precision Code Auditing.
          </div>
          <div className="flex gap-lg text-xs text-on-surface-variant font-mono">
            <a className="opacity-60 hover:opacity-100 hover:text-secondary transition-colors" href="#privacy">Privacy</a>
            <a class="opacity-60 hover:opacity-100 hover:text-secondary transition-colors" href="#terms">Terms</a>
            <a className="opacity-60 hover:opacity-100 hover:text-secondary transition-colors" href="#security">Security Policy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// 1. Landing View
function LandingView({ onStart }) {
  return (
    <div className="max-w-container-max mx-auto px-lg w-full flex flex-col items-center">
      <div className="text-center mt-12 mb-20 max-w-4xl">
        <h1 className="text-5xl md:text-6xl font-extrabold text-on-surface mb-6 text-glow leading-tight tracking-tight">
          Automate Your Code Reviews.<br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Ship Flawless Code.</span>
        </h1>
        <p className="text-lg text-on-surface-variant mb-8 max-w-2xl mx-auto">
          Paste your code snippet or drag files to receive immediate, AI-powered + static-analysis reviews. Zero setup, no repository URL needed.
        </p>
        <div className="flex gap-md justify-center">
          <button onClick={onStart} className="bg-primary-container text-white px-lg py-md rounded-lg font-semibold shadow-[0_0_20px_rgba(124,58,237,0.4)] hover:shadow-[0_0_30px_rgba(124,58,237,0.6)] transition-all flex items-center gap-2 active:scale-95">
            <Icon name="rocket_launch" className="text-white" fill />
            Start Reviewing
          </button>
          <a href="#features-grid" className="glass-panel text-on-surface px-lg py-md rounded-lg font-semibold hover:bg-surface-variant transition-colors flex items-center gap-2">
            <Icon name="explore" />
            Explore Features
          </a>
        </div>
      </div>

      {/* Editor Mockup (Hero Showcase) */}
      <div className="glass-panel rounded-xl overflow-hidden flex flex-col md:flex-row relative mb-24 max-w-4xl w-full">
        <div className="absolute top-0 left-0 w-full h-8 bg-surface-container-lowest/80 border-b border-outline-glass flex items-center px-sm gap-sm z-20">
          <div className="w-3 h-3 rounded-full bg-critical"></div>
          <div className="w-3 h-3 rounded-full bg-warning"></div>
          <div className="w-3 h-3 rounded-full bg-success"></div>
          <span className="text-on-surface-variant font-mono text-xs ml-sm opacity-50">src/services/queryBuilder.ts</span>
        </div>

        <div className="w-full md:w-2/3 bg-[#111118]/90 pt-10 pb-4 overflow-x-auto relative border-r border-outline-glass flex font-mono text-[13px] leading-relaxed">
          <div className="w-12 text-right pr-4 text-outline select-none border-r border-outline-glass mr-4 opacity-40">
            <div>1</div><div>2</div><div>3</div><div>4</div>
            <div className="text-critical bg-critical/20 relative -left-[1px] border-l-2 border-critical pl-[1px]">5</div>
            <div>6</div><div>7</div>
          </div>
          <div className="pl-2 w-full relative">
            <pre><code className="language-typescript">
{`import { db } from '@/config/db';

export async function getUser(id: string) {
  const query = \`SELECT * FROM users WHERE id = \${id}\`;
  const result = await db.query(query);
  return result.rows[0];
}`}
            </code></pre>
            <div className="absolute top-[80px] left-4 right-4 bg-[#12121A]/95 rounded-lg p-3 border border-outline-glass shadow-xl z-20 flex gap-2 items-start animate-pulse">
              <Icon name="error" className="text-critical" fill />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-critical/10 text-critical text-[10px] font-bold uppercase tracking-wider px-2 py-[2px] rounded-full border border-critical/20">Critical</span>
                  <span className="text-on-surface font-semibold text-xs">SQL Injection Risk</span>
                </div>
                <p className="text-on-surface-variant text-xs">Direct dynamic concatenation detected. Parameterize queries.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full md:w-1/3 p-lg pt-12 flex flex-col justify-center items-center bg-surface-container-lowest">
          <div className="mb-6 relative w-36 h-36 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" fill="none" r="45" stroke="rgba(255,255,255,0.05)" stroke-width="4"></circle>
              <circle cx="50" cy="50" fill="none" r="45" stroke="#F59E0B" stroke-dasharray="283" stroke-dashoffset="65" stroke-linecap="round" stroke-width="4"></circle>
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-3xl font-bold text-on-surface font-mono">78%</span>
              <span className="text-[10px] text-on-surface-variant uppercase tracking-widest mt-1">Score</span>
            </div>
          </div>
          <div className="w-full space-y-sm">
            <div className="flex justify-between items-center p-2 rounded bg-surface-variant/30 border border-outline-glass text-xs">
              <span className="text-on-surface-variant flex items-center gap-1"><Icon name="account_tree" className="text-sm" /> Complexity</span>
              <span className="text-success font-semibold">Low (4)</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded bg-surface-variant/30 border border-outline-glass text-xs">
              <span className="text-on-surface-variant flex items-center gap-1"><Icon name="bug_report" className="text-sm" /> Findings</span>
              <span className="text-warning font-semibold">2 warnings</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <section id="features-grid" className="w-full py-12 border-t border-outline-glass">
        <h2 className="text-2xl font-bold text-center mb-8">Features Built for Teams</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
          <div className="glass-panel p-lg rounded-xl flex flex-col gap-2">
            <Icon name="rule" className="text-primary text-[32px]" fill />
            <h3 className="text-lg font-semibold text-white">Static Linter Engines</h3>
            <p className="text-on-surface-variant text-xs leading-relaxed">Integrated analyzers scan styles, variables, naming patterns, and complex standard protocols in milliseconds.</p>
          </div>
          <div className="glass-panel p-lg rounded-xl flex flex-col gap-2">
            <Icon name="psychology" className="text-secondary text-[32px]" fill />
            <h3 className="text-lg font-semibold text-white">AI-Powered Audits</h3>
            <p className="text-on-surface-variant text-xs leading-relaxed">Deep context analysis describing architectural warnings, code smells, complexity levels, and refactor suggestions.</p>
          </div>
          <div className="glass-panel p-lg rounded-xl flex flex-col gap-2">
            <Icon name="speed" className="text-tertiary text-[32px]" fill />
            <h3 className="text-lg font-semibold text-white">Metrics Inspector</h3>
            <p className="text-on-surface-variant text-xs leading-relaxed">Analyzes LOC indexes, parameter weight distribution, and cyclomatic counts before commits are signed off.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

// 2. Submit View
function SubmitView({ onRunReview }) {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('ts');
  const [detectedLang, setDetectedLang] = useState('TypeScript');
  const [fileName, setFileName] = useState('PaymentProcessor.ts');

  const handleTextChange = (e) => {
    const val = e.target.value;
    setCode(val);
    
    if (val.startsWith('import') || val.includes('export')) {
      setDetectedLang('TypeScript');
      setLanguage('ts');
    } else if (val.startsWith('def ') || val.includes('import os')) {
      setDetectedLang('Python');
      setLanguage('py');
    } else if (val.startsWith('package ') || val.includes('func main()')) {
      setDetectedLang('Go');
      setLanguage('go');
    }
  };

  const triggerReview = () => {
    const finalCode = code.trim() || `export class CustomService {
  async runTask() {
    const response = await db.query("SELECT * FROM log");
    return response;
  }
}`;
    const finalFileName = fileName || 'custom_code.ts';
    const finalLangName = detectedLang;
    onRunReview(finalFileName, finalLangName, finalCode);
  };

  return (
    <div className="max-w-container-max mx-auto px-lg w-full flex flex-col">
      <div className="flex flex-col gap-sm max-w-3xl mb-lg">
        <h1 class="text-3xl font-bold text-white">Submit Code for Audit</h1>
        <p class="text-on-surface-variant">Paste your script snippet or select local files. Zero repository setup required.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg items-start">
        <div className="lg:col-span-8 flex flex-col gap-md">
          <div className="glass-panel rounded-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-md py-sm border-b border-outline-glass bg-surface-container-lowest/50">
              <div className="flex items-center gap-sm bg-surface-variant px-sm py-xs rounded-full border border-outline-glass">
                <span className="w-2 h-2 rounded-full bg-success shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></span>
                <span className="font-label-caps text-xs text-on-surface font-semibold">{detectedLang}</span>
              </div>
              <select 
                value={language} 
                onChange={(e) => {
                  setLanguage(e.target.value);
                  const labels = { ts: 'TypeScript', py: 'Python', go: 'Go', rs: 'Rust' };
                  setDetectedLang(labels[e.target.value]);
                }} 
                className="bg-transparent border-none text-on-surface-variant hover:text-on-surface text-sm cursor-pointer focus:ring-0"
              >
                <option value="ts" className="bg-[#0A0A0F]">TypeScript (.ts)</option>
                <option value="py" className="bg-[#0A0A0F]">Python (.py)</option>
                <option value="go" className="bg-[#0A0A0F]">Go (.go)</option>
                <option value="rs" className="bg-[#0A0A0F]">Rust (.rs)</option>
              </select>
            </div>

            <div className="bg-surface-container-lowest flex font-mono text-[13px] min-h-[300px]">
              <div className="w-12 text-right pr-4 text-outline select-none border-r border-outline-glass pt-4 flex flex-col gap-1 opacity-40">
                <div>1</div><div>2</div><div>3</div><div>4</div><div>5</div><div>6</div><div>7</div>
              </div>
              <textarea 
                value={code} 
                onChange={handleTextChange}
                className="flex-grow bg-transparent border-none focus:ring-0 text-on-surface-variant p-4 font-mono focus:text-white leading-relaxed placeholder-outline/50 resize-none min-h-[300px]" 
                placeholder={`// Paste your source code here...
export class OrderService {
  async checkout(cartId: string) {
    const cart = await db.query(\`SELECT * FROM carts WHERE id = \${cartId}\`);
    return cart;
  }
}`}
              />
            </div>

            <div className="relative py-md flex items-center px-md">
              <div className="flex-grow border-t border-outline-glass"></div>
              <span className="flex-shrink-0 mx-4 text-xs text-on-surface-variant uppercase font-semibold">OR</span>
              <div className="flex-grow border-t border-outline-glass"></div>
            </div>

            <div className="m-md mt-0 border-2 border-dashed border-outline-variant hover:border-secondary transition-colors rounded-lg bg-surface-container-low/50 p-lg flex flex-col items-center justify-center text-center cursor-pointer group">
              <div className="p-sm bg-surface-variant rounded-full mb-sm group-hover:scale-110 transition-transform">
                <Icon name="folder_open" className="text-secondary text-[32px]" />
              </div>
              <p className="text-on-surface font-semibold mb-xs">Drag & drop files here, or <span className="text-secondary hover:underline">browse local files</span></p>
              <p className="text-on-surface-variant text-xs opacity-75">Supported: .js, .ts, .py, .go, .rs (Max 5MB)</p>
            </div>

            <div className="bg-surface-container-lowest/80 border-t border-outline-glass p-md flex flex-col sm:flex-row items-center justify-between gap-md">
              <div className="flex flex-col gap-sm">
                <label className="flex items-center gap-sm cursor-pointer hover:text-white transition-colors">
                  <input type="checkbox" defaultChecked className="rounded border-outline bg-transparent text-secondary focus:ring-0" />
                  <span className="text-xs">Enable deep AI analysis</span>
                </label>
              </div>
              <div className="flex gap-sm">
                <button onClick={() => setCode('')} className="px-md py-sm rounded-lg border border-outline-glass text-on-surface hover:bg-surface-variant text-xs font-semibold">Clear</button>
                <button onClick={triggerReview} className="px-lg py-sm rounded bg-primary-container text-white text-xs font-semibold shadow-[0_0_15px_rgba(124,58,237,0.4)] hover:bg-inverse-primary transition-all flex items-center gap-2">
                  <Icon name="play_arrow" className="text-white text-sm" /> Run Review
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-md">
          <div className="glass-panel rounded-xl p-md flex flex-col gap-2 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-success/10 rounded-full blur-xl"></div>
            <div className="flex items-center gap-2 text-success">
              <Icon name="security" />
              <h3 className="font-semibold text-on-surface">Secure Sandbox</h3>
            </div>
            <p className="text-on-surface-variant text-xs leading-relaxed">
              Your source code is analyzed locally inside secure memory processes and completely destroyed after reviews finish.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// 3. Results View
function ResultsView({ review, setReview }) {
  const [filter, setFilter] = useState('all');
  
  const handleApplyFix = (findingId) => {
    alert(`Applying fix: ${findingId}`);
    setReview(prev => {
      const updatedFindings = prev.findings.filter(f => f.id !== findingId);
      const updatedCode = prev.code.map(line => {
        if (findingId === 'f1' && line.num === 12) {
          return { ...line, status: 'normal', annotation: null };
        }
        if (findingId === 'f2' && line.num === 18) {
          return { ...line, status: 'normal' };
        }
        return line;
      });
      return {
        ...prev,
        score: Math.min(100, prev.score + 7),
        findings: updatedFindings,
        code: updatedCode
      };
    });
  };

  const filteredFindings = review.findings.filter(f => {
    if (filter === 'all') return true;
    return f.severity === filter;
  });

  return (
    <div className="max-w-container-max mx-auto px-lg w-full flex flex-col">
      <header className="mb-md flex flex-col md:flex-row justify-between items-start md:items-center gap-md bg-surface-container-lowest/50 backdrop-blur-sm p-md rounded-xl border border-outline-glass">
        <div className="flex items-center gap-3">
          <Icon name="description" className="text-secondary text-[28px]" />
          <div>
            <h1 className="text-xl font-bold text-on-surface">{review.fileName}</h1>
            <p className="text-xs text-on-surface-variant mt-0.5">Audit complete: {review.language} format</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="border border-outline-glass px-md py-sm rounded-lg text-on-surface text-xs hover:bg-white/5 transition-colors flex items-center gap-2">
            <Icon name="refresh" className="text-sm" /> Re-run Review
          </button>
          <button onClick={() => alert('Copied report link!')} className="bg-primary-container text-white px-md py-sm rounded-lg text-xs font-semibold hover:bg-primary-container/90 transition-colors shadow-[0_0_15px_rgba(124,58,237,0.3)] flex items-center gap-2 active:scale-95">
            <Icon name="share" className="text-sm" /> Share Report
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-md mb-lg">
        <div className="glass-card rounded-xl p-md flex items-center gap-4">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" fill="none" r="45" stroke="rgba(255,255,255,0.05)" stroke-width="6"></circle>
              <circle cx="50" cy="50" fill="none" r="45" stroke="#10B981" stroke-dasharray="283" stroke-dashoffset={283 - (283 * review.score / 100)} stroke-linecap="round" stroke-width="6"></circle>
            </svg>
            <span className="absolute font-mono text-base font-bold text-on-surface">{review.score}%</span>
          </div>
          <div>
            <h3 className="text-on-surface-variant text-xs">Code Health Score</h3>
            <p className="text-xs text-success mt-0.5">{review.score >= 80 ? 'Good' : 'Needs improvement'}</p>
          </div>
        </div>

        <div className="glass-card rounded-xl p-md flex flex-col justify-center">
          <h3 className="text-on-surface-variant text-xs mb-2">Findings Summary</h3>
          <div className="flex gap-4 text-xs font-mono">
            <span className="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-critical"></span> Critical ({review.findings.filter(f=>f.severity==='critical').length})</span>
            <span className="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-warning"></span> Warning ({review.findings.filter(f=>f.severity==='warning').length})</span>
          </div>
        </div>

        <div className="glass-card rounded-xl p-md flex flex-col justify-center gap-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-on-surface-variant">Lines of Code</span>
            <span className="font-mono text-on-surface">{review.metrics.loc}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-on-surface-variant">Complexity Index</span>
            <span className="text-warning font-mono">{review.metrics.complexity}</span>
          </div>
        </div>
      </div>

      {/* Editor Split Workspace */}
      <div className="flex flex-col lg:flex-row gap-lg min-h-[500px]">
        {/* Editor */}
        <div className="w-full lg:w-3/5 glass-panel rounded-xl flex flex-col overflow-hidden">
          <div className="bg-surface-container-highest px-4 py-2 border-b border-outline-glass flex items-center gap-2 text-xs font-mono">
            <span>TypeScript File Viewer</span>
          </div>
          <div className="flex-1 overflow-auto bg-[#0d0d12] font-mono text-[13px] leading-relaxed py-4">
            {review.code.map(line => (
              <div key={line.num} className={`flex group relative ${line.status === 'critical' ? 'code-line-critical' : line.status === 'warning' ? 'code-line-warning' : ''}`}>
                <div className="w-12 text-right pr-4 text-on-surface-variant/40 border-r border-outline-glass mr-4 select-none">
                  {line.num}
                </div>
                <div className="text-on-surface whitespace-pre pr-2">{line.content}</div>
                
                {line.annotation && (
                  <div className="absolute left-16 top-full mt-1 z-20 mini-glass p-3 rounded-lg max-w-[360px]">
                    <div className="flex gap-2">
                      <Icon name="smart_toy" className="text-primary text-sm" fill />
                      <p className="text-xs text-white"><span className="text-primary font-bold">AI recommendation:</span> {line.annotation}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Findings side list */}
        <div className="w-full lg:w-2/5 flex flex-col gap-md">
          {/* Tabs */}
          <div className="flex gap-2 pb-1">
            {['all', 'critical', 'warning', 'info'].map(sev => (
              <button 
                key={sev} 
                onClick={() => setFilter(sev)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border capitalize transition-all ${filter === sev ? 'bg-white/10 text-white border-outline-glass' : 'bg-surface-container text-on-surface-variant border-transparent hover:bg-white/5'}`}
              >
                {sev}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 max-h-[500px]">
            {filteredFindings.length === 0 ? (
              <p className="text-center text-xs text-on-surface-variant/50 py-lg">No findings in this category.</p>
            ) : (
              filteredFindings.map(f => (
                <div key={f.id} className="glass-panel rounded-xl p-4 border border-outline-glass relative overflow-hidden flex flex-col gap-2">
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${f.severity === 'critical' ? 'bg-critical' : f.severity === 'warning' ? 'bg-warning' : 'bg-secondary'}`} />
                  <div className="flex justify-between items-center text-xs">
                    <span className="capitalize font-bold text-on-surface flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${f.severity === 'critical' ? 'bg-critical' : f.severity === 'warning' ? 'bg-warning' : 'bg-secondary'}`} />
                      {f.severity}
                    </span>
                    <span className="text-on-surface-variant font-mono">Line {f.line}</span>
                  </div>
                  <h4 className="font-semibold text-white text-sm">{f.title}</h4>
                  <p className="text-xs text-on-surface-variant leading-relaxed">{f.desc}</p>
                  
                  {f.diff && (
                    <div className="rounded-lg overflow-hidden border border-outline-glass font-mono text-[11px] bg-[#0d0d12] my-1">
                      <div className="bg-critical/15 px-3 py-1 text-critical font-medium">{f.diff.removed}</div>
                      <div className="bg-success/15 px-3 py-1 text-success font-medium">{f.diff.added}</div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 mt-2">
                    <button className="px-2 py-1 bg-surface-container-highest text-on-surface rounded text-[11px] hover:bg-white/10">Ignore</button>
                    <button onClick={() => handleApplyFix(f.id)} className="px-2 py-1 bg-primary/20 text-primary border border-primary/30 rounded text-[11px] hover:bg-primary/30 font-semibold">Apply Fix</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// 4. History View
function HistoryView({ history, onViewItem }) {
  const [search, setSearch] = useState('');
  const [langFilter, setLangFilter] = useState('all');

  const filteredHistory = history.filter(item => {
    const matchSearch = item.fileName.toLowerCase().includes(search.toLowerCase());
    const matchLang = langFilter === 'all' || item.language === langFilter;
    return matchSearch && matchLang;
  });

  return (
    <div className="max-w-container-max mx-auto px-lg w-full">
      <header className="mb-lg">
        <h1 className="text-3xl font-bold text-white mb-2">Review History</h1>
        <p className="text-on-surface-variant">Archived list of historical automated audits.</p>
      </header>

      {/* Toolbar */}
      <div className="glass-panel rounded-xl p-sm mb-lg flex flex-col md:flex-row gap-sm items-center justify-between">
        <div className="relative w-full md:w-96">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm" />
          <input 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="glass-input w-full text-on-surface rounded-lg pl-10 pr-4 py-2 text-sm bg-transparent border border-outline-glass focus:outline-none focus:ring-0 focus:border-secondary" 
            placeholder="Search by file name..." 
            type="text"
          />
        </div>
        
        <select 
          value={langFilter} 
          onChange={(e) => setLangFilter(e.target.value)} 
          className="glass-input text-on-surface rounded-lg px-4 py-2 text-sm bg-surface border border-outline-glass focus:ring-0"
        >
          <option value="all">Language (All)</option>
          <option value="TypeScript">TypeScript</option>
          <option value="Python">Python</option>
          <option value="Go">Go</option>
          <option value="Rust">Rust</option>
        </select>
      </div>

      {/* Table */}
      <div className="glass-panel rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-outline-glass bg-surface-container-low/50 text-xs uppercase font-semibold text-on-surface-variant">
              <th className="py-4 px-6">File Name</th>
              <th className="py-4 px-6">Language</th>
              <th className="py-4 px-6">Date Scanned</th>
              <th className="py-4 px-6">Findings Summary</th>
              <th className="py-4 px-6 text-center">Quality Score</th>
              <th className="py-4 px-6 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-glass">
            {filteredHistory.map(item => (
              <tr key={item.id} onClick={() => onViewItem(item)} className="hover:bg-white/[0.02] transition-all group cursor-pointer">
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <Icon name="data_object" className="text-secondary" />
                    <span className="font-mono text-white font-semibold">{item.fileName}</span>
                  </div>
                </td>
                <td className="py-4 px-6 text-on-surface-variant font-medium">{item.language}</td>
                <td className="py-4 px-6 text-xs font-mono text-on-surface-variant/80">{item.date}</td>
                <td className="py-4 px-6">
                  <div className="flex gap-2">
                    {item.critical > 0 && <span class="bg-critical/10 text-critical text-[10px] px-2 py-0.5 rounded border border-critical/20 font-bold font-mono">Crit {item.critical}</span>}
                    {item.warning > 0 && <span class="bg-warning/10 text-warning text-[10px] px-2 py-0.5 rounded border border-warning/20 font-bold font-mono">Warn {item.warning}</span>}
                  </div>
                </td>
                <td className="py-4 px-6 text-center">
                  <span className={`score-pill ${item.score >= 70 ? 'score-good' : 'score-bad'} font-mono text-xs font-bold px-2.5 py-1 rounded-full border`}>
                    {item.score}%
                  </span>
                </td>
                <td className="py-4 px-6 text-right">
                  <button className="bg-primary text-black font-semibold text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 5. Auth View
function AuthView({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email) {
      onLogin(email);
    }
  };

  return (
    <div className="max-w-container-max mx-auto px-lg w-full flex items-center justify-center py-12">
      <div className="glass-panel w-full max-w-md rounded-xl p-xl flex flex-col gap-6">
        <div className="flex flex-col items-center text-center gap-sm">
          <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center border border-outline-glass mb-2">
            <Icon name="terminal" className="text-primary text-[28px]" fill />
          </div>
          <h1 className="text-2xl font-bold text-white">{isLogin ? 'Welcome back' : 'Create account'}</h1>
          <p className="text-xs text-on-surface-variant">{isLogin ? 'Sign in to review code snippets.' : 'Register to save audit history.'}</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-on-surface-variant font-mono">Email address</label>
            <input 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#0A0A0F]/60 border border-outline-glass rounded-lg py-2 px-3 text-sm focus:border-secondary focus:ring-0" 
              placeholder="name@company.com" 
              required 
              type="email"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-on-surface-variant font-mono">Password</label>
            <input 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#0A0A0F]/60 border border-outline-glass rounded-lg py-2 px-3 text-sm focus:border-secondary focus:ring-0" 
              placeholder="••••••••" 
              required 
              type="password"
            />
          </div>
          <button className="w-full bg-primary-container text-white font-semibold rounded-lg py-2 text-sm shadow-[0_0_15px_rgba(124,58,237,0.3)] hover:bg-inverse-primary transition-all mt-2 active:scale-95" type="submit">
            {isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <div className="text-center text-xs text-on-surface-variant">
          <span>{isLogin ? "Don't have an account? " : "Already have an account? "}</span>
          <button onClick={() => setIsLogin(!isLogin)} className="text-primary font-bold hover:underline bg-transparent border-none">
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
