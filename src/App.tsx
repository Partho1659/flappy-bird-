/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import FlappyBirdGame from './components/FlappyBirdGame';
import { Copy, Check, Download, ExternalLink, Gamepad2, Volume2, Trophy } from 'lucide-react';

export default function App() {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    try {
      const res = await fetch('/flappy-bird.html');
      const htmlText = await res.text();
      await navigator.clipboard.writeText(htmlText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      setCopied(false);
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = '/flappy-bird.html';
    link.download = 'flappy-bird.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-between p-4 sm:p-6 font-sans antialiased selection:bg-amber-400 selection:text-slate-950">
      {/* Top Header */}
      <header className="w-full max-w-lg flex items-center justify-between py-2 border-b border-slate-800/80 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-black">
            <Gamepad2 className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              Flappy Bird
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/20">
                Arcade
              </span>
            </h1>
            <p className="text-xs text-slate-400">Pure Canvas • 60 FPS Physics • Procedural Audio</p>
          </div>
        </div>

        {/* Action Buttons for Standalone HTML */}
        <div className="flex items-center gap-2">
          <button
            id="copy-html-btn"
            onClick={handleCopyCode}
            title="Copy standalone single-file HTML code"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-medium text-slate-300 hover:text-white transition-all active:scale-95 shadow-sm"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Copied HTML</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy HTML</span>
              </>
            )}
          </button>

          <button
            id="download-html-btn"
            onClick={handleDownload}
            title="Download single-file flappy-bird.html"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all active:scale-95 shadow-md shadow-amber-500/15"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Download</span>
          </button>
        </div>
      </header>

      {/* Main Flappy Bird Game Component */}
      <section className="flex-1 flex flex-col items-center justify-center w-full my-auto">
        <FlappyBirdGame />
      </section>

      {/* Footer Info */}
      <footer className="w-full max-w-lg mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Volume2 className="w-3.5 h-3.5 text-slate-400" /> Web Audio API
          </span>
          <span className="flex items-center gap-1">
            <Trophy className="w-3.5 h-3.5 text-amber-500" /> Local Storage High Score
          </span>
        </div>
        <a
          href="/flappy-bird.html"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-slate-400 hover:text-amber-400 transition-colors"
        >
          <span>Open Standalone File</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </footer>
    </main>
  );
}
