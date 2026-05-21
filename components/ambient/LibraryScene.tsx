'use client'

import { useMemo } from 'react'

export default function LibraryScene() {
  const motes = useMemo(() => Array.from({ length: 35 }, (_, i) => ({
    id: i,
    left:     `${5 + Math.random() * 90}%`,
    bottom:   `${Math.random() * 40}%`,
    size:     1.5 + Math.random() * 2.5,
    delay:    `${Math.random() * 8}s`,
    duration: `${5 + Math.random() * 6}s`,
    opacity:  0.3 + Math.random() * 0.5,
  })), [])

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden>
      {/* Deep teal-brown library atmosphere */}
      <div className="absolute inset-0"
           style={{ background: 'linear-gradient(160deg, #1a1208 0%, #2a1f10 35%, #0e1812 100%)' }} />

      {/* Reading lamp warm cone */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2"
           style={{
             width: 600, height: 500,
             background: 'conic-gradient(from 170deg at 50% 0%, transparent 0deg, rgba(210,170,80,0.15) 20deg, transparent 40deg)',
           }} />

      {/* Bookshelf silhouettes */}
      <div className="absolute bottom-0 left-0 right-0 flex items-end gap-px opacity-20"
           style={{ height: '30%' }}>
        {Array.from({ length: 28 }, (_, i) => (
          <div key={i} className="flex-1"
               style={{
                 height: `${40 + Math.random() * 60}%`,
                 background: ['#5c3d1e','#3d2b14','#7a4f2a','#4a3420','#6b4525'][i % 5],
                 borderRadius: '2px 2px 0 0',
               }} />
        ))}
      </div>

      {/* Dust motes */}
      {motes.map((m) => (
        <div key={m.id} className="absolute rounded-full animate-dust"
             style={{
               left: m.left, bottom: m.bottom,
               width: m.size, height: m.size,
               background: `rgba(220,190,130,${m.opacity})`,
               animationDuration: m.duration,
               animationDelay: m.delay,
             }} />
      ))}

      {/* Floor warm glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2"
           style={{
             width: 700, height: 250,
             background: 'radial-gradient(ellipse at 50% 100%, rgba(180,120,40,0.1) 0%, transparent 70%)',
           }} />

      <div className="absolute inset-0 pointer-events-none"
           style={{ background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.55) 100%)' }} />
    </div>
  )
}
