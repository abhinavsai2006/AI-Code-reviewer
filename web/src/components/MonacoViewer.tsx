'use client';

import React, { useEffect, useRef } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';

interface Finding {
  id: string;
  line_number: number;
  severity: 'critical' | 'warning' | 'info';
  issue: string;
  suggested_fix?: string;
}

interface MonacoViewerProps {
  code: string;
  language: string;
  findings: Finding[];
  selectedLine?: number | null;
}

export default function MonacoViewer({ code, language, findings, selectedLine }: MonacoViewerProps) {
  const editorRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);

  // Map user readable language name to Monaco internal language identifier
  const getMonacoLang = (lang: string) => {
    const l = lang.toLowerCase();
    if (l.includes('typescript') || l.includes('ts') || l.includes('javascript') || l.includes('js')) return 'typescript';
    if (l.includes('python') || l.includes('py')) return 'python';
    if (l.includes('go')) return 'go';
    if (l.includes('rust') || l.includes('rs')) return 'rust';
    return 'plaintext';
  };

  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor;

    // Define custom VS-Dark theme variations
    monaco.editor.defineTheme('nexus-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '546E7A', fontStyle: 'italic' },
        { token: 'keyword', foreground: '89DDFF' },
        { token: 'string', foreground: 'C3E88D' },
        { token: 'number', foreground: 'F78C6C' },
        { token: 'regexp', foreground: '89DDFF' },
        { token: 'type', foreground: 'FFCB6B' }
      ],
      colors: {
        'editor.background': '#111118',
        'editorGutter.background': '#0e0e13',
        'editorLineNumber.foreground': '#958da140',
        'editorLineNumber.activeForeground': '#d2bbff',
        'editor.lineHighlightBackground': '#1b1b2030'
      }
    });

    monaco.editor.setTheme('nexus-dark');

    // Add inline linter decorations
    applyDecorations(editor, monaco);
  };

  const applyDecorations = (editor: any, monaco: Monaco) => {
    if (!editor || !monaco) return;

    // Create decoration list
    const newDecorations = findings.map(finding => {
      const severityColor = finding.severity === 'critical' 
        ? 'rgba(239, 68, 68, 0.15)' 
        : finding.severity === 'warning' 
          ? 'rgba(245, 158, 11, 0.15)' 
          : 'rgba(93, 230, 255, 0.15)';

      const borderLeft = finding.severity === 'critical'
        ? '2px solid #EF4444'
        : finding.severity === 'warning'
          ? '2px solid #F59E0B'
          : '2px solid #22D3EE';

      return {
        range: new monaco.Range(finding.line_number, 1, finding.line_number, 1),
        options: {
          isWholeLine: true,
          className: `monaco-line-${finding.severity}`,
          inlineClassName: `monaco-inline-${finding.severity}`,
          glyphMarginClassName: `monaco-glyph-${finding.severity} material-symbols-outlined`,
          glyphMarginHoverMessage: { value: `**[${finding.severity.toUpperCase()}]** ${finding.issue}` }
        }
      };
    });

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);
  };

  // Re-apply decorations if findings list changes
  useEffect(() => {
    if (editorRef.current) {
      // Access monaco instance from editor
      const monaco = (window as any).monaco;
      if (monaco) {
        applyDecorations(editorRef.current, monaco);
      }
    }
  }, [findings]);

  // Center line view if line selected on card list
  useEffect(() => {
    if (editorRef.current && selectedLine) {
      editorRef.current.revealLineInCenter(selectedLine);
      editorRef.current.setPosition({ lineNumber: selectedLine, column: 1 });
      editorRef.current.focus();
    }
  }, [selectedLine]);

  return (
    <div className="w-full h-full border border-outline-glass rounded-xl overflow-hidden shadow-2xl relative">
      {/* Styles for Monaco line highlights injected dynamically */}
      <style jsx global>{`
        .monaco-line-critical {
          background-color: rgba(239, 68, 68, 0.08) !important;
          border-left: 3px solid #EF4444 !important;
        }
        .monaco-line-warning {
          background-color: rgba(245, 158, 11, 0.08) !important;
          border-left: 3px solid #F59E0B !important;
        }
        .monaco-line-info {
          background-color: rgba(93, 230, 255, 0.08) !important;
          border-left: 3px solid #22D3EE !important;
        }
        
        /* Gutter glyph icon styles */
        .monaco-glyph-critical::before {
          content: 'error';
          color: #EF4444;
          font-size: 14px;
        }
        .monaco-glyph-warning::before {
          content: 'warning';
          color: #F59E0B;
          font-size: 14px;
        }
        .monaco-glyph-info::before {
          content: 'info';
          color: #22D3EE;
          font-size: 14px;
        }
      `}</style>
      <Editor
        height="100%"
        width="100%"
        language={getMonacoLang(language)}
        value={code}
        onMount={handleEditorDidMount}
        options={{
          readOnly: true,
          minimap: { enabled: false },
          fontSize: 13,
          fontFamily: 'JetBrains Mono',
          lineNumbers: 'on',
          glyphMargin: true,
          scrollBeyondLastLine: false,
          scrollbar: {
            vertical: 'visible',
            horizontal: 'visible',
            useShadows: false
          }
        }}
      />
    </div>
  );
}
