'use client'

import { useMemo } from 'react'

export default function NatureScene() {
  const leaves = useMemo(() => Array.from({ length: 22 }, (_, i) => ({
    id: i,
    left:     `${5 + Math.random() * 90}%`,
    size:     10 + Math.floor(Math.random() * 14),
    delay:    `${Math.random() * 8}s`,
    duration: `${6 + Math.random() * 6}s`,
    rotate:   Math.floor(Math.random() * 360),
    color:    ['#5a8a4a','#7ab060','#4a7a38','#8cc070','#3d6630'][Math.floor(Math.random() * 5)],
  })), [])

  const rays = useMemo(() => Array.from({ length: 8 }, (_, i) => ({
    id: i,
    angle: -20 + i * 8,
    opacity: 0.04 + Math.random() * 0.06,
    width: 40 + Math.random() * 60,
  })), [])

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden>
      {/* Forest gradient */}
      <div className="absolute inset-0"
           style={{ background: 'linear-gradient(180deg, #0a2010 0%, #0f2e18 30%, #162e12 70%, #0c1e0a 100%)' }} />

      {/* Sky light at top */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2"
           style={{
             width: 600, height: 300,
             background: 'radial-gradient(ellipse at 50% 0%, rgba(120,180,80,0.2) 0%, transparent 70%)',
           }} />

      {/* God rays */}
      <div className="absolute top-0 left-0 right-0 h-full opacity-30">
        {rays.map((r) => (
          <div key={r.id} className="absolute top-0"
               style={{
                 left: `${15 + r.id * 9}%`,
                 width: r.width,
                 height: '80%',
                 background: `linear-gradient(180deg, rgba(180,230,120,${r.opacity * 3}) 0%, transparent 100%)`,
                 transform: `rotate(${r.angle}deg)`,
                 transformOrigin: 'top center',
               }} />
        ))}
      </div>

      {/* Tree silhouettes */}
      <div className="absolute bottom-0 left-0 right-0 flex items-end" style={{ height: '45%' }}>
        {Array.from({ length: 14 }, (_, i) => {
          const h = 50 + Math.random() * 50
          const w = 6 + Math.random() * 8
          return (
            <div key={i} className="relative flex-1 flex flex-col items-center justify-end">
              {/* Canopy */}
              <div style={{
                width: `${w * 5}%`, height: `${h * 0.7}%`,
                background: ['#1a3d12','#143010','#1e4516'][i % 3],
                clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
                alignSelf: 'center',
              }} />
              {/* Trunk */}
              <div style={{ width: 6, height: `${h * 0.3}%`, background: '#2a1a08' }} />
            </div>
          )
        })}
      </div>

      {/* Falling leaves */}
      {leaves.map((l) => (
        <div key={l.id} className="absolute animate-leaf"
             style={{
               left: l.left, top: '-20px',
               width: l.size, height: l.size,
               animationDuration: l.duration,
               animationDelay: l.delay,
             }}>
          <svg viewBox="0 0 20 20" fill={l.color} style={{ transform: `rotate(${l.rotate}deg)` }}>
            <path d="M10 2C6 2 2 6 2 10s3 8 8 8 8-4 8-8-4-8-8-8zm0 14c-3.3 0-6-2.7-6-6s2.7-6 6-6 6 2.7 6 6-2.7 6-6 6z"/>
            <ellipse cx="10" cy="10" rx="3" ry="5" fill={l.color} />
          </svg>
        </div>
      ))}

      {/* Forest floor glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2"
           style={{
             width: 700, height: 200,
             background: 'radial-gradient(ellipse at 50% 100%, rgba(60,120,40,0.15) 0%, transparent 70%)',
           }} />

      <div className="absolute inset-0 pointer-events-none"
           style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)' }} />
    </div>
  )
}
