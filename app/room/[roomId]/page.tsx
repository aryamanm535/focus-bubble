'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Users, Eye, EyeOff, Copy, Check,
  Settings, Loader2, Share2
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import AmbientScene    from '@/components/ambient/AmbientScene'
import PomodoroTimer   from '@/components/room/PomodoroTimer'
import PresenceGrid    from '@/components/room/PresenceGrid'
import SilentReactions from '@/components/room/SilentReactions'
import TaskModal       from '@/components/room/TaskModal'
import { ENVIRONMENTS, STATUS_COLORS } from '@/lib/utils'
import type { Room, TimerState, PresenceUser, Reaction } from '@/types'

const AWAY_TIMEOUT_MS = 3 * 60 * 1000

export default function RoomPage() {
  const params = useParams()
  const roomId = params.roomId as string
  const router = useRouter()
  const supabase = createClient()

  const [room, setRoom]                 = useState<Room | null>(null)
  const [profile, setProfile]           = useState<{ id: string; display_name: string | null; avatar_url: string | null } | null>(null)
  const [participants, setParticipants] = useState<PresenceUser[]>([])
  const [timerState, setTimerState]     = useState<TimerState>({ status: 'idle', started_at: null, ends_at: null, round: 0 })
  const [presenceEnabled, setPresenceEnabled] = useState(true)
  const [showTaskModal, setShowTaskModal]      = useState(false)
  const [myTask, setMyTask]             = useState('')
  const [myStatus, setMyStatus]         = useState<'active' | 'away' | 'break'>('active')
  const [incomingReaction, setIncomingReaction] = useState<Reaction | null>(null)
  const [copied, setCopied]             = useState(false)
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)

  const channelRef     = useRef<RealtimeChannel | null>(null)
  const awayTimerRef   = useRef<NodeJS.Timeout | null>(null)
  const lastActiveRef  = useRef<number>(Date.now())
  const taskConfirmed  = useRef(false)

  // ── Load room + user ──────────────────────────────────────────────
  useEffect(() => {
    let mounted = true
    async function init() {
      const [{ data: userData }, { data: roomData, error: roomErr }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('rooms').select('*').eq('id', roomId).single(),
      ])

      if (!mounted) return
      if (!userData.user) { router.push('/login'); return }
      if (roomErr || !roomData) { setError('Room not found.'); setLoading(false); return }

      const { data: prof } = await supabase.from('profiles')
        .select('id, display_name, avatar_url').eq('id', userData.user.id).single()

      if (!mounted) return
      setRoom(roomData as Room)
      setProfile(prof)
      setTimerState(roomData.timer_state as TimerState)
      setLoading(false)

      if (!taskConfirmed.current) setShowTaskModal(true)
    }
    init()
    return () => { mounted = false }
  }, [roomId])

  // ── Supabase Realtime: presence + broadcast ────────────────────────
  useEffect(() => {
    if (!profile || !room) return

    const channel = supabase.channel(`room:${roomId}`, {
      config: { presence: { key: profile.id } },
    })
    channelRef.current = channel

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<PresenceUser>()
      const users = Object.values(state).flat() as PresenceUser[]
      setParticipants(users)
    })

    channel.on('broadcast', { event: 'reaction' }, ({ payload }) => {
      setIncomingReaction({ ...payload, timestamp: Date.now() })
      setTimeout(() => setIncomingReaction(null), 100)
    })

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          userId:      profile.id,
          displayName: profile.display_name ?? 'Anonymous',
          avatarUrl:   profile.avatar_url ?? null,
          status:      'active',
          task:        '',
          joinedAt:    new Date().toISOString(),
        })
      }
    })

    return () => {
      channel.untrack()
      supabase.removeChannel(channel)
    }
  }, [profile?.id, room?.id])

  // ── Supabase Realtime: timer (postgres changes) ───────────────────
  useEffect(() => {
    const sub = supabase.channel(`timer:${roomId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'rooms',
        filter: `id=eq.${roomId}`,
      }, (payload) => {
        const updated = payload.new as Room
        setTimerState(updated.timer_state)
      })
      .subscribe()

    return () => { supabase.removeChannel(sub) }
  }, [roomId])

  // ── Presence detection ────────────────────────────────────────────
  const updateMyStatus = useCallback(async (status: 'active' | 'away' | 'break') => {
    if (myStatus === status) return
    setMyStatus(status)
    await channelRef.current?.track({
      userId:      profile?.id,
      displayName: profile?.display_name ?? 'Anonymous',
      avatarUrl:   profile?.avatar_url ?? null,
      status,
      task:        myTask,
      joinedAt:    new Date().toISOString(),
    })
  }, [myStatus, profile, myTask])

  useEffect(() => {
    if (!presenceEnabled) return

    function resetAwayTimer() {
      lastActiveRef.current = Date.now()
      if (myStatus === 'away') updateMyStatus('active')
      if (awayTimerRef.current) clearTimeout(awayTimerRef.current)
      awayTimerRef.current = setTimeout(() => updateMyStatus('away'), AWAY_TIMEOUT_MS)
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        updateMyStatus('away')
      } else {
        resetAwayTimer()
      }
    }

    document.addEventListener('mousemove', resetAwayTimer)
    document.addEventListener('keydown',   resetAwayTimer)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    resetAwayTimer()

    return () => {
      document.removeEventListener('mousemove', resetAwayTimer)
      document.removeEventListener('keydown',   resetAwayTimer)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (awayTimerRef.current) clearTimeout(awayTimerRef.current)
    }
  }, [presenceEnabled, myStatus, updateMyStatus])

  // ── Task confirmation ─────────────────────────────────────────────
  async function handleTaskConfirm(task: string) {
    taskConfirmed.current = true
    setMyTask(task)
    setShowTaskModal(false)
    await channelRef.current?.track({
      userId:      profile?.id,
      displayName: profile?.display_name ?? 'Anonymous',
      avatarUrl:   profile?.avatar_url ?? null,
      status:      'active',
      task,
      joinedAt:    new Date().toISOString(),
    })
  }

  // ── Timer controls (host only) ────────────────────────────────────
  async function handleTimerStart(mode: 'focus' | 'break') {
    if (!room) return
    const durationMs = mode === 'focus'
      ? room.focus_duration * 60 * 1000
      : room.break_duration * 60 * 1000
    const now     = new Date()
    const endsAt  = new Date(now.getTime() + durationMs)
    const newState: TimerState = {
      status:     mode,
      started_at: now.toISOString(),
      ends_at:    endsAt.toISOString(),
      round:      mode === 'focus' ? timerState.round + 1 : timerState.round,
    }
    setTimerState(newState)
    await supabase.from('rooms').update({ timer_state: newState }).eq('id', roomId)

    if (mode === 'break') {
      updateMyStatus('break')
    } else {
      updateMyStatus('active')
    }
  }

  async function handleTimerReset() {
    const newState: TimerState = { status: 'idle', started_at: null, ends_at: null, round: 0 }
    setTimerState(newState)
    await supabase.from('rooms').update({ timer_state: newState }).eq('id', roomId)
  }

  // ── Reactions ─────────────────────────────────────────────────────
  async function handleReact(reactionId: string, emoji: string) {
    const reaction = { id: reactionId, emoji, label: reactionId, fromUser: profile?.id ?? '' }
    await channelRef.current?.send({ type: 'broadcast', event: 'reaction', payload: reaction })
  }

  // ── Copy room key ─────────────────────────────────────────────────
  async function copyKey() {
    if (!room?.access_key) return
    await navigator.clipboard.writeText(room.access_key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Copy room link ────────────────────────────────────────────────
  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#070510' }}>
        <Loader2 size={28} className="animate-spin" style={{ color: '#9b8dbc' }} />
      </div>
    )
  }

  if (error || !room) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: '#f7f4ef' }}>
        <p className="text-lg font-semibold" style={{ color: '#2a2420' }}>{error ?? 'Room not found'}</p>
        <Link href="/dashboard" className="text-sm hover:underline" style={{ color: '#7d9e84' }}>← Back to rooms</Link>
      </div>
    )
  }

  const isHost = profile?.id === room.host_id
  const env    = ENVIRONMENTS.find((e) => e.id === room.environment)

  const panelStyle = {
    background:    'rgba(0,0,0,0.45)',
    backdropFilter: 'blur(16px)',
    border:        '1px solid rgba(255,255,255,0.1)',
    borderRadius:  20,
  }

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: '#000' }}>
      {/* Ambient background scene */}
      <AmbientScene environment={room.environment} />

      {/* ── Top bar ── */}
      <div className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-5 py-3.5"
           style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3">
          <Link href="/dashboard"
                className="p-2 rounded-xl transition-all hover:bg-white/10"
                style={{ color: 'rgba(255,255,255,0.7)' }}>
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-sm font-semibold leading-tight" style={{ color: '#fff' }}>{room.name}</h1>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {env?.emoji} {env?.label}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Participant count */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
               style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
            <Users size={13} />
            {participants.length} in room
          </div>

          {/* Presence toggle */}
          <button
            onClick={() => setPresenceEnabled(!presenceEnabled)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:bg-white/10"
            style={{
              background: presenceEnabled ? 'rgba(125,158,132,0.3)' : 'rgba(255,255,255,0.08)',
              color: presenceEnabled ? '#b8d4bc' : 'rgba(255,255,255,0.45)',
              border: `1px solid ${presenceEnabled ? 'rgba(125,158,132,0.5)' : 'rgba(255,255,255,0.1)'}`,
            }}
            title={presenceEnabled ? 'Presence tracking on' : 'Presence tracking off'}
          >
            {presenceEnabled ? <Eye size={13} /> : <EyeOff size={13} />}
            <span className="hidden sm:inline">Presence</span>
          </button>

          {/* Share / key */}
          {room.is_public ? (
            <button onClick={copyLink}
                    className="p-2 rounded-xl transition-all hover:bg-white/10"
                    style={{ color: 'rgba(255,255,255,0.6)' }}
                    title="Copy link">
              {copied ? <Check size={16} /> : <Share2 size={16} />}
            </button>
          ) : (
            <button onClick={copyKey}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-medium transition-all hover:bg-white/10"
                    style={{ background: 'rgba(155,141,188,0.2)', color: '#c4b8e0', border: '1px solid rgba(155,141,188,0.3)' }}>
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {room.access_key}
            </button>
          )}
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen pt-20 pb-24 px-4 gap-8">

        {/* Timer panel */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-7 flex flex-col items-center gap-4 w-full max-w-xs"
          style={panelStyle}
        >
          {/* Room status label */}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full"
                 style={{
                   background: timerState.status === 'focus' ? '#7d9e84'
                             : timerState.status === 'break'  ? '#9b8dbc'
                             : '#dbd4c8',
                   boxShadow: timerState.status !== 'idle' ? `0 0 8px currentColor` : 'none',
                 }} />
            <span className="text-xs font-medium uppercase tracking-wider"
                  style={{ color: 'rgba(255,255,255,0.5)' }}>
              {timerState.status === 'focus' ? 'Deep Work'
               : timerState.status === 'break' ? 'Break Time'
               : 'Ready'}
            </span>
          </div>

          <PomodoroTimer
            timerState={timerState}
            isHost={isHost}
            focusDuration={room.focus_duration}
            breakDuration={room.break_duration}
            onStart={handleTimerStart}
            onReset={handleTimerReset}
          />

          {/* My task display */}
          {myTask && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
                 style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.55)' }}>
              <span>📝</span>
              <span className="truncate max-w-[140px]">{myTask}</span>
              <button onClick={() => { taskConfirmed.current = false; setShowTaskModal(true) }}
                      style={{ color: 'rgba(255,255,255,0.3)' }} title="Edit task">✎</button>
            </div>
          )}
        </motion.div>

        {/* Presence grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="p-6 w-full max-w-2xl"
          style={panelStyle}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium uppercase tracking-wider"
                  style={{ color: 'rgba(255,255,255,0.4)' }}>
              In this room
            </span>
            {!presenceEnabled && (
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Presence off — others can't see your status
              </span>
            )}
          </div>
          <PresenceGrid users={participants} currentUser={profile?.id ?? ''} />
        </motion.div>

        {/* Break banner */}
        <AnimatePresence>
          {timerState.status === 'break' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed bottom-24 left-1/2 -translate-x-1/2 z-30 px-6 py-3 rounded-full text-sm font-medium"
              style={{
                background: 'rgba(155,141,188,0.4)', backdropFilter: 'blur(12px)',
                color: '#e0d9f0', border: '1px solid rgba(155,141,188,0.4)',
              }}
            >
              ☕ Break time — rest up, back soon
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Reactions */}
      <SilentReactions onReact={handleReact} incomingReaction={incomingReaction} />

      {/* Task modal */}
      {showTaskModal && <TaskModal onConfirm={handleTaskConfirm} />}
    </div>
  )
}
