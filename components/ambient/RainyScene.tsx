'use client'

import { useMemo } from 'react'

export default function RainyScene() {
  const drops = useMemo(() => Array.from({ length: 60 }, (_, i) => ({
    id: i,
    left:     `${Math.random() * 100}%`,
    delay:    `${Math.random() * 4}s`,
    duration: `${0.6 + Math.random() * 0.6}s`,
    opacity:  0.2 + Math.random() * 0.4,
    height:   8 + Math.floor(Math.random() * 14),
  })), [])

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden>
      {/* Warm amber gradient base */}
      <div className="absolute inset-0"
           style={{ background: 'linear-gradient(160deg, #2c1e0f 0%, #3d2a18 40%, #1e140a 100%)' }} />

      {/* Window glow */}
      <div className="absolute inset-0 opacity-20"
           style={{
             background: 'radial-gradient(ellipse 70% 50% at 50% 30%, #d4954a 0%, transparent 70%)',
           }} />

      {/* Desk lamp warm pool */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2"
           style={{
             width: 500, height: 400,
             background: 'radial-gradient(ellipse at 50% 100%, rgba(210,140,60,0.18) 0%, transparent 70%)',
           }} />

      {/* Rain drops */}
      {drops.map((d) => (
        <div
          key={d.id}
          className="absolute animate-rain"
          style={{
            left: d.left,
            top: '-20px',
            width: 1.5,
            height: d.height,
            background: `rgba(180,210,230,${d.opacity})`,
            borderRadius: 1,
            animationDuration: d.duration,
            animationDelay: d.delay,
          }}
        />
      ))}

      {/* Window pane lines */}
      <div className="absolute inset-x-0 top-0 h-full opacity-5"
           style={{
             backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)',
             backgroundSize: '120px 180px',
           }} />

      {/* Subtle vignette */}
      <div className="absolute inset-0 pointer-events-none"
           style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 100%)' }} />
    </div>
  )
}
