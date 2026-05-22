'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { LogOut, Crown, UserCheck, X, Loader2, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { PresenceUser } from '@/types'

interface Props {
  roomId:       string
  isHost:       boolean
  participants: PresenceUser[]
  currentUserId: string
  onEndSession: () => void  // broadcasts end to all users
}

export default function HostControls({ roomId, isHost, participants, currentUserId, onEndSession }: Props) {
  const router   = useRouter()
  const supabase = createClient()

  const [modal, setModal]     = useState<'leave' | 'end' | null>(null)
  const [loading, setLoading] = useState(false)
  const [transferTo, setTransferTo] = useState<string | null>(null)

  const others = participants.filter(p => p.userId !== currentUserId)

  async function doTransferAndLeave() {
    if (!transferTo) return
    setLoading(true)
    await supabase.from('rooms').update({ host_id: transferTo }).eq('id', roomId)
    setLoading(false)
    router.push('/dashboard')
  }

  async function doLeaveWithoutTransfer() {
    router.push('/dashboard')
  }

  async function doEndSession() {
    setLoading(true)
    onEndSession()
    // Small delay for broadcast to propagate before deleting
    await new Promise(r => setTimeout(r, 400))
    await supabase.from('rooms').delete().eq('id', roomId)
    router.push('/dashboard')
  }

  const glassModal = {
    background: '#1a1620',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 24,
    boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
  }

  return (
    <>
      {/* Leave / End buttons */}
      <div className="flex items-center gap-1.5">
        {isHost && (
          <button
            onClick={() => setModal('end')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:bg-red-500/20"
            style={{ background: 'rgba(200,100,82,0.15)', color: '#e8937f', border: '1px solid rgba(200,100,82,0.3)' }}
          >
            <AlertTriangle size={12} /> End session
          </button>
        )}
        <button
          onClick={() => isHost ? setModal('leave') : router.push('/dashboard')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:bg-white/10"
          style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <LogOut size={12} /> Leave
        </button>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {modal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setModal(null) }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 22, stiffness: 320 }}
              className="w-full max-w-sm p-6"
              style={glassModal}
            >
              {/* End session modal */}
              {modal === 'end' && (
                <>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-base font-bold text-white">End session?</h3>
                      <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
                        Everyone will be redirected to the dashboard.
                      </p>
                    </div>
                    <button onClick={() => setModal(null)} style={{ color: 'rgba(255,255,255,0.4)' }}>
                      <X size={18} />
                    </button>
                  </div>
                  <div className="flex gap-2 mt-5">
                    <button onClick={() => setModal(null)}
                            className="flex-1 py-2.5 rounded-xl text-sm transition-all hover:bg-white/10"
                            style={{ border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.55)' }}>
                      Cancel
                    </button>
                    <button onClick={doEndSession} disabled={loading}
                            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 flex items-center justify-center gap-1.5"
                            style={{ background: '#c86452', color: '#fff' }}>
                      {loading ? <Loader2 size={14} className="animate-spin" /> : <AlertTriangle size={14} />}
                      End for everyone
                    </button>
                  </div>
                </>
              )}

              {/* Leave modal (host) */}
              {modal === 'leave' && (
                <>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-base font-bold text-white">You're the host</h3>
                      <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
                        Transfer your host role before leaving, or just go.
                      </p>
                    </div>
                    <button onClick={() => setModal(null)} style={{ color: 'rgba(255,255,255,0.4)' }}>
                      <X size={18} />
                    </button>
                  </div>

                  {others.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-medium mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        Transfer host to:
                      </p>
                      <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                        {others.map(u => (
                          <button key={u.userId}
                                  onClick={() => setTransferTo(prev => prev === u.userId ? null : u.userId)}
                                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
                                  style={{
                                    background: transferTo === u.userId ? 'rgba(155,141,188,0.25)' : 'rgba(255,255,255,0.05)',
                                    border: `1px solid ${transferTo === u.userId ? 'rgba(155,141,188,0.5)' : 'rgba(255,255,255,0.08)'}`,
                                  }}>
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold"
                                 style={{ background: 'rgba(155,141,188,0.2)', color: '#c4b8e0' }}>
                              {(u.displayName || '?')[0].toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white truncate">{u.displayName}</p>
                              {u.task && <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>{u.task}</p>}
                            </div>
                            {transferTo === u.userId && <Crown size={14} style={{ color: '#c4b8e0' }} />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button onClick={() => setModal(null)}
                            className="flex-1 py-2.5 rounded-xl text-sm transition-all hover:bg-white/10"
                            style={{ border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.4)' }}>
                      Cancel
                    </button>
                    {transferTo ? (
                      <button onClick={doTransferAndLeave} disabled={loading}
                              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 flex items-center justify-center gap-1.5"
                              style={{ background: 'linear-gradient(135deg, #7d9e84, #9b8dbc)', color: '#fff' }}>
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
                        Transfer & leave
                      </button>
                    ) : (
                      <button onClick={doLeaveWithoutTransfer}
                              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                              style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
                        Just leave
                      </button>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
