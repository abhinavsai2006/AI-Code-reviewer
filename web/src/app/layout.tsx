import type { Metadata } from 'next';
import './globals.css';
import TopNav from '@/components/TopNav';

export const metadata: Metadata = {
  title: 'Nexus.AI - Code Review Assistant',
  description: 'Automate your code audits. Receive instant AI code quality scoring and linter inspections.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@400;700&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased min-h-screen flex flex-col relative overflow-x-hidden selection:bg-primary-container selection:text-on-primary-container">
        {/* Shader Background Canvas */}
        <div className="mesh-gradient">
          <canvas id="shader-canvas" className="absolute inset-0 w-full h-full opacity-60" style={{ display: 'block' }} suppressHydrationWarning></canvas>
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0A0A0F]/80 to-[#0A0A0F] pointer-events-none z-0"></div>

        {/* Global Nav */}
        <TopNav />

        {/* Main Content Router Wrapper */}
        <div className="flex-grow flex flex-col pt-16 z-10 relative">
          {children}
        </div>

        {/* Global Footer */}
        <footer className="w-full py-6 mt-12 bg-[#0e0e13] border-t border-outline-glass z-20 relative">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-xs text-on-surface-variant font-mono-code">
              © 2026 Nexus AI Systems. Precision Code Auditing.
            </div>
            <div className="flex gap-6 text-xs text-on-surface-variant font-mono-code">
              <a className="opacity-60 hover:opacity-100 hover:text-secondary transition-colors" href="#">Privacy Policy</a>
              <a className="opacity-60 hover:opacity-100 hover:text-secondary transition-colors" href="#">Terms of Service</a>
              <a className="opacity-60 hover:opacity-100 hover:text-secondary transition-colors" href="#">Security Policy</a>
              <a className="opacity-60 hover:opacity-100 hover:text-secondary transition-colors" href="#">Status Page</a>
            </div>
          </div>
        </footer>

        {/* WebGL Canvas Shader Script (loads globally) */}
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              const canvas = document.getElementById('shader-canvas');
              if(!canvas) return;
              function syncSize() {
                  const w = window.innerWidth;
                  const h = window.innerHeight;
                  if (canvas.width !== w || canvas.height !== h) {
                      canvas.width  = w;
                      canvas.height = h;
                  }
              }
              window.addEventListener('resize', syncSize);
              syncSize();

              const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
              if (!gl) return;
              const vs = "attribute vec2 a_position; varying vec2 v_texCoord; void main() { v_texCoord = a_position * 0.5 + 0.5; gl_Position = vec4(a_position, 0.0, 1.0); }";
              const fs = "precision highp float; varying vec2 v_texCoord; uniform float u_time; uniform vec2 u_resolution; void main() { vec2 uv = v_texCoord; float t = u_time * 0.15; vec3 color1 = vec3(0.486, 0.227, 0.929); vec3 color2 = vec3(0.133, 0.827, 0.933); vec3 bg = vec3(0.039, 0.039, 0.059); float w1 = sin(uv.x * 2.2 + t) * 0.5 + 0.5; float w2 = cos(uv.y * 2.8 - t * 1.2) * 0.5 + 0.5; float w3 = sin((uv.x + uv.y) * 1.2 + t * 0.7) * 0.5 + 0.5; vec3 mixed = mix(color1, color2, w1 * w2); mixed = mix(mixed, bg, 1.0 - (w3 * 0.18)); float dist = distance(uv, vec2(0.5)); float vignette = smoothstep(0.9, 0.1, dist); gl_FragColor = vec4(mixed * vignette * 0.25, 1.0); }";
              function cs(type, src) {
                  const s = gl.createShader(type);
                  gl.shaderSource(s, src);
                  gl.compileShader(s);
                  return s;
              }
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

              function render(t) {
                  gl.viewport(0, 0, canvas.width, canvas.height);
                  if (uTime) gl.uniform1f(uTime, t * 0.001);
                  if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
                  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
                  requestAnimationFrame(render);
              }
              render(0);
            })();
          `
        }} />
      </body>
    </html>
  );
}
