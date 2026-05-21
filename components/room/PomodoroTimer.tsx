'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, RotateCcw, Coffee } from 'lucide-react'
import { formatDuration } from '@/lib/utils'
import type { TimerState } from '@/types'

interface Props {
  timerState:    TimerState
  isHost:        boolean
  focusDuration: number
  breakDuration: number
  onStart: (mode: 'focus' | 'break') => void
  onReset: () => void
}

function getSecondsLeft(timerState: TimerState): number {
  if (!timerState.ends_at) return 0
  return Math.max(0, Math.floor((new Date(timerState.ends_at).getTime() - Date.now()) / 1000))
}

export default function PomodoroTimer({ timerState, isHost, focusDuration, breakDuration, onStart, onReset }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(() => getSecondsLeft(timerState))

  useEffect(() => {
    setSecondsLeft(getSecondsLeft(timerState))
  }, [timerState])

  useEffect(() => {
    if (timerState.status === 'idle') return
    const interval = setInterval(() => {
      setSecondsLeft(getSecondsLeft(timerState))
    }, 500)
    return () => clearInterval(interval)
  }, [timerState])

  const totalSeconds = timerState.status === 'focus'
    ? focusDuration * 60
    : breakDuration * 60

  const progress = timerState.status !== 'idle' && totalSeconds > 0
    ? 1 - secondsLeft / totalSeconds
    : 0

  const radius      = 52
  const circumference = 2 * Math.PI * radius
  const dashOffset   = circumference * (1 - progress)

  const isFocus = timerState.status === 'focus'
  const isBreak = timerState.status === 'break'
  const isIdle  = timerState.status === 'idle'

  const accentColor = isFocus ? '#7d9e84' : isBreak ? '#9b8dbc' : '#dbd4c8'
  const displayTime = isIdle
    ? formatDuration(focusDuration * 60)
    : formatDuration(secondsLeft)

  return (
    <div className="flex flex-col items-center gap-5">
      {/* SVG Ring */}
      <div className="relative">
        <svg width={132} height={132} viewBox="0 0 132 132">
          {/* Track */}
          <circle cx={66} cy={66} r={radius}
                  fill="none" strokeWidth={6}
                  stroke="rgba(255,255,255,0.1)" />
          {/* Progress */}
          <motion.circle
            cx={66} cy={66} r={radius}
            fill="none" strokeWidth={6}
            stroke={accentColor}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 66 66)"
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 0.5 }}
          />
        </svg>

        {/* Time display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-2xl font-bold leading-none" style={{ color: '#fff', letterSpacing: 1 }}>
            {displayTime}
          </span>
          <span className="text-xs mt-1 font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {isFocus ? 'focus' : isBreak ? 'break' : 'ready'}
          </span>
        </div>
      </div>

      {/* Round indicator */}
      {timerState.round > 0 && (
        <div className="flex gap-1.5">
          {Array.from({ length: Math.min(timerState.round, 4) }).map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: '#7d9e84' }} />
          ))}
        </div>
      )}

      {/* Controls (host only) */}
      {isHost && (
        <div className="flex items-center gap-2">
          {isIdle && (
            <button
              onClick={() => onStart('focus')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white transition-all hover:opacity-90 hover:scale-105"
              style={{ background: '#7d9e84' }}
            >
              <Play size={14} /> Start focus
            </button>
          )}

          {isFocus && (
            <button
              onClick={() => onStart('break')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white transition-all hover:opacity-90 hover:scale-105"
              style={{ background: '#9b8dbc' }}
            >
              <Coffee size={14} /> Start break
            </button>
          )}

          {isBreak && (
            <button
              onClick={() => onStart('focus')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white transition-all hover:opacity-90 hover:scale-105"
              style={{ background: '#7d9e84' }}
            >
              <Play size={14} /> Back to focus
            </button>
          )}

          <button
            onClick={onReset}
            className="p-2.5 rounded-full transition-all hover:bg-white/10"
            style={{ color: 'rgba(255,255,255,0.5)' }}
            title="Reset timer"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      )}

      {!isHost && !isIdle && (
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Synced with room
        </p>
      )}
    </div>
  )
}
