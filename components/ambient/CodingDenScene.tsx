'use client'

import { useMemo } from 'react'

const CHARS = '01アイウエオカキクケコサシスセソタチツテトナニヌネノ{}[]<>/\\;:='.split('')

export default function CodingDenScene() {
  const columns = useMemo(() => Array.from({ length: 20 }, (_, i) => ({
    id: i,
    chars: Array.from({ length: 18 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]),
    left:  `${(i / 20) * 100 + Math.random() * 4}%`,
    delay: `${Math.random() * 6}s`,
    duration: `${3.5 + Math.random() * 3}s`,
    opacity: 0.08 + Math.random() * 0.18,
    fontSize: 10 + Math.floor(Math.random() * 6),
    color: Math.random() > 0.7 ? '#a78bfa' : '#34d399',
  })), [])

  const glowOrbs = useMemo(() => [
    { cx: '20%',  cy: '30%', r: 200, color: '#6d28d9', o: 0.15 },
    { cx: '80%',  cy: '60%', r: 250, color: '#0891b2', o: 0.12 },
    { cx: '50%',  cy: '90%', r: 180, color: '#9333ea', o: 0.10 },
  ], [])

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0" style={{ background: '#070510' }} />

      {/* Neon glow orbs */}
      {glowOrbs.map((g, i) => (
        <div key={i} className="absolute rounded-full animate-glow-pulse"
             style={{
               left: g.cx, top: g.cy,
               width: g.r * 2, height: g.r * 2,
               transform: 'translate(-50%, -50%)',
               background: `radial-gradient(circle, ${g.color}${Math.round(g.o * 255).toString(16).padStart(2,'0')} 0%, transparent 70%)`,
               animationDuration: `${3 + i}s`,
               animationDelay: `${i * 0.8}s`,
             }} />
      ))}

      {/* Matrix columns */}
      {columns.map((col) => (
        <div key={col.id} className="absolute top-0 flex flex-col gap-0.5 animate-code-drop font-mono"
             style={{
               left: col.left,
               animationDuration: col.duration,
               animationDelay: col.delay,
               opacity: col.opacity,
               fontSize: col.fontSize,
               color: col.color,
               letterSpacing: 1,
               lineHeight: 1.4,
             }}>
          {col.chars.map((c, j) => (
            <span key={j} style={{ opacity: 1 - j * 0.05 }}>{c}</span>
          ))}
        </div>
      ))}

      {/* Monitor glow from below */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2"
           style={{
             width: 800, height: 300,
             background: 'radial-gradient(ellipse at 50% 100%, rgba(109,40,217,0.12) 0%, rgba(8,145,178,0.08) 40%, transparent 70%)',
           }} />

      {/* Horizontal scan line */}
      <div className="absolute inset-x-0 h-px opacity-5 animate-glow-pulse"
           style={{ top: '33%', background: 'linear-gradient(90deg, transparent, #34d399, transparent)' }} />

      <div className="absolute inset-0 pointer-events-none"
           style={{ background: 'radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.7) 100%)' }} />
    </div>
  )
}
