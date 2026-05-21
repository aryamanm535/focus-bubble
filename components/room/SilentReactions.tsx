'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { REACTIONS } from '@/lib/utils'
import type { Reaction } from '@/types'

interface Props {
  onReact:          (reactionId: string, emoji: string) => void
  incomingReaction: Reaction | null
}

interface FloatingEmoji {
  id:    string
  emoji: string
  x:     number
  label: string
}

export default function SilentReactions({ onReact, incomingReaction }: Props) {
  const [floaters, setFloaters] = useState<FloatingEmoji[]>([])
  const [expanded, setExpanded] = useState(false)
  const [cooldown, setCooldown] = useState(false)

  const addFloater = useCallback((emoji: string, label: string) => {
    const floater: FloatingEmoji = {
      id:    `${Date.now()}-${Math.random()}`,
      emoji,
      x:     30 + Math.random() * 40,
      label,
    }
    setFloaters((prev) => [...prev, floater])
    setTimeout(() => {
      setFloaters((prev) => prev.filter((f) => f.id !== floater.id))
    }, 1800)
  }, [])

  useEffect(() => {
    if (incomingReaction) {
      addFloater(incomingReaction.emoji, incomingReaction.label)
    }
  }, [incomingReaction, addFloater])

  function handleReact(r: typeof REACTIONS[number]) {
    if (cooldown) return
    onReact(r.id, r.emoji)
    addFloater(r.emoji, r.label)
    setCooldown(true)
    setTimeout(() => setCooldown(false), 1500)
    setExpanded(false)
  }

  return (
    <>
      {/* Floating emojis */}
      <div className="fixed bottom-28 right-8 pointer-events-none z-40 w-20">
        <AnimatePresence>
          {floaters.map((f) => (
            <motion.div
              key={f.id}
              initial={{ opacity: 1, y: 0, scale: 1 }}
              animate={{ opacity: 0, y: -90, scale: 0.5 }}
              transition={{ duration: 1.6, ease: 'easeOut' }}
              className="absolute text-2xl"
              style={{ left: `${f.x}%`, bottom: 0 }}
            >
              {f.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Reaction panel */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 10 }}
              className="flex flex-col gap-1.5 p-2 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              {REACTIONS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => handleReact(r)}
                  disabled={cooldown}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all hover:bg-white/10 disabled:opacity-50 group"
                  style={{ color: 'rgba(255,255,255,0.85)' }}
                >
                  <span className="text-lg group-hover:scale-110 transition-transform">{r.emoji}</span>
                  <span className="whitespace-nowrap">{r.label}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          onClick={() => setExpanded(!expanded)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-12 h-12 rounded-full text-xl flex items-center justify-center transition-all shadow-lg"
          style={{
            background: expanded ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.12)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.2)',
          }}
        >
          {expanded ? '✕' : '✨'}
        </motion.button>
      </div>
    </>
  )
}
