'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ClipboardList } from 'lucide-react'

interface Props {
  onConfirm: (task: string) => void
}

export default function TaskModal({ onConfirm }: Props) {
  const [task, setTask] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    onConfirm(task.trim())
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 flex items-center justify-center px-4"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="w-full max-w-sm rounded-3xl p-8 text-center"
          style={{ background: '#fdfaf6', border: '1px solid #ece8e1', boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}
        >
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
               style={{ background: '#e0d9f0' }}>
            <ClipboardList size={26} style={{ color: '#9b8dbc' }} />
          </div>

          <h2 className="text-xl font-bold mb-2"
              style={{ fontFamily: 'Lora, Georgia, serif', color: '#2a2420' }}>
            What are you working on?
          </h2>
          <p className="text-sm mb-6" style={{ color: '#7a6a60' }}>
            Share your task with the room. It keeps you accountable.
          </p>

          <form onSubmit={submit} className="flex flex-col gap-4">
            <input
              type="text"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="e.g. CS 314 problem set, side project..."
              maxLength={80}
              autoFocus
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all text-center"
              style={{ background: '#f0ede6', border: '1.5px solid #dbd4c8', color: '#2a2420' }}
              onFocus={(e) => { e.target.style.borderColor = '#9b8dbc'; e.target.style.background = '#fff' }}
              onBlur={(e)  => { e.target.style.borderColor = '#dbd4c8'; e.target.style.background = '#f0ede6' }}
            />
            <button
              type="submit"
              className="w-full py-3 rounded-2xl text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #7d9e84, #9b8dbc)' }}
            >
              Lock in →
            </button>
            <button
              type="button"
              onClick={() => onConfirm('')}
              className="text-sm hover:underline"
              style={{ color: '#b8a89a' }}
            >
              Skip for now
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
