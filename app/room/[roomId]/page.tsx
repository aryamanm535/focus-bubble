'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Users, Eye, EyeOff, Check, Share2, Zap, Crown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import AmbientScene    from '@/components/ambient/AmbientScene'
import PomodoroTimer   from '@/components/room/PomodoroTimer'
import TaskModal       from '@/components/room/TaskModal'
import HostControls    from '@/components/room/HostControls'
import MediaPanel      from '@/components/room/MediaPanel'
import SpotifyPanel    from '@/components/room/SpotifyPanel'
import { ENVIRONMENTS, REACTIONS, STATUS_COLORS } from '@/lib/utils'
import type { Room, TimerState, PresenceUser, Reaction } from '@/types'

const AWAY_TIMEOUT_MS = 3 * 60 * 1000

interface ActivityEvent {
  id:    string
  text:  string
  emoji: string
  ts:    number
}

// ── Avatar card ────────────────────────────────────────────────────────────
function AvatarCard({ user, isSelf, isHost }: { user: PresenceUser; isSelf: boolean; isHost: boolean }) {
  const initials = (user.displayName || '?')
    .split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
  const isActive = user.status === 'active'
  const isAway   = user.status === 'away'
  const color    = STATUS_COLORS[user.status] ?? '#7a6a60'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: isAway ? 0.45 : 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.6 }}
      transition={{ type: 'spring', damping: 18, stiffness: 280 }}
      className="flex flex-col items-center gap-2 relative"
    >
      {/* Outer glow ring for active users */}
      {isActive && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ top: -4 }}>
          <div className="w-16 h-16 rounded-full animate-ping-ring"
               style={{ background: `${color}30` }} />
        </div>
      )}

      <div className="relative w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-bold overflow-hidden"
           style={{
             background: user.avatarUrl ? 'transparent' : `${color}25`,
             border: `2px solid ${isActive ? color : 'rgba(255,255,255,0.15)'}`,
             color,
             boxShadow: isActive ? `0 0 14px ${color}50` : 'none',
             transition: 'box-shadow 0.4s ease',
           }}>
        {user.avatarUrl
          ? <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
          : initials}

        {/* Break overlay */}
        {user.status === 'break' && (
          <div className="absolute inset-0 flex items-center justify-center text-lg"
               style={{ background: 'rgba(0,0,0,0.5)' }}>☕</div>
        )}

        {/* Host crown */}
        {isHost && (
          <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs leading-none"
               style={{ filter: 'drop-shadow(0 0 4px rgba(200,170,80,0.8))' }}>👑</div>
        )}
      </div>

      {/* Name */}
      <div className="text-center" style={{ maxWidth: 68 }}>
        <p className="text-xs font-semibold truncate"
           style={{ color: isSelf ? '#fff' : 'rgba(255,255,255,0.85)' }}>
          {isSelf ? 'You' : user.displayName}
        </p>
        {user.task && (
          <p className="text-xs truncate mt-0.5" title={user.task}
             style={{ color: 'rgba(255,255,255,0.38)', fontSize: 10 }}>
            {user.task}
          </p>
        )}
      </div>
    </motion.div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function RoomPage() {
  const params  = useParams()
  const roomId  = params.roomId as string
  const router  = useRouter()
  const supabase = createClient()

  const [room, setRoom]                 = useState<Room | null>(null)
  const [profile, setProfile]           = useState<{ id: string; display_name: string | null; avatar_url: string | null } | null>(null)
  const [participants, setParticipants] = useState<PresenceUser[]>([])
  const [timerState, setTimerState]     = useState<TimerState>({ status: 'idle', started_at: null, ends_at: null, round: 0 })
  const [presenceEnabled, setPresenceEnabled] = useState(true)
  const [showTaskModal, setShowTaskModal]      = useState(false)
  const [myTask, setMyTask]             = useState('')
  const [myStatus, setMyStatus]         = useState<'active' | 'away' | 'break'>('active')
  const [activity, setActivity]         = useState<ActivityEvent[]>([])
  const [floatingReactions, setFloating] = useState<{ id: string; emoji: string; x: number }[]>([])
  const [copied, setCopied]             = useState(false)
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)

  const channelRef    = useRef<RealtimeChannel | null>(null)
  const [channelState, setChannelState] = useState<RealtimeChannel | null>(null)
  const awayTimerRef  = useRef<NodeJS.Timeout | null>(null)
  const taskConfirmed = useRef(false)
  const prevCount     = useRef(0)

  function pushActivity(emoji: string, text: string) {
    const event: ActivityEvent = { id: `${Date.now()}-${Math.random()}`, text, emoji, ts: Date.now() }
    setActivity((prev) => [event, ...prev].slice(0, 12))
  }

  // ── Load room + user ────────────────────────────────────────────────────
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

  // ── Realtime presence ───────────────────────────────────────────────────
  useEffect(() => {
    if (!profile || !room) return

    // Remove stale channels for this room to prevent duplicate presence
    supabase.getChannels()
      .filter(ch => ch.topic === `realtime:room:${roomId}`)
      .forEach(ch => supabase.removeChannel(ch))

    const channel = supabase.channel(`room:${roomId}`, {
      config: { presence: { key: profile.id } },
    })
    channelRef.current = channel
    setChannelState(channel)

    channel.on('presence', { event: 'sync' }, () => {
      const raw = channel.presenceState<PresenceUser>()
      // Deduplicate: one entry per userId, keep most recent
      const map = new Map<string, PresenceUser>()
      Object.values(raw).flat().forEach((u: PresenceUser) => {
        const existing = map.get(u.userId)
        if (!existing || u.joinedAt > existing.joinedAt) map.set(u.userId, u)
      })
      const users = Array.from(map.values())

      // Detect joins for activity feed
      if (users.length > prevCount.current) {
        const joined = users.find(u => u.userId !== profile.id &&
          !Array.from(map.keys()).includes(u.userId))
        if (joined) pushActivity('👋', `${joined.displayName} joined`)
      }
      prevCount.current = users.length
      setParticipants(users)
    })

    channel.on('presence', { event: 'join' }, ({ newPresences }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      newPresences.forEach((p: any) => {
        if (p.userId !== profile.id) pushActivity('👋', `${p.displayName} joined`)
      })
    })

    channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      leftPresences.forEach((p: any) => {
        if (p.userId !== profile.id) pushActivity('🚶', `${p.displayName} left`)
      })
    })

    channel.on('broadcast', { event: 'reaction' }, ({ payload }) => {
      const r = payload as Reaction & { fromName: string }
      pushActivity(r.emoji, `${r.fromName || 'Someone'} sent ${r.emoji}`)
      const floater = { id: `${Date.now()}-${Math.random()}`, emoji: r.emoji, x: 20 + Math.random() * 60 }
      setFloating(prev => [...prev, floater])
      setTimeout(() => setFloating(prev => prev.filter(f => f.id !== floater.id)), 1800)
    })

    channel.on('broadcast', { event: 'activity' }, ({ payload }) => {
      pushActivity(payload.emoji, payload.text)
    })

    channel.on('broadcast', { event: 'end_session' }, () => {
      router.push('/dashboard')
    })

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          userId:      profile.id,
          displayName: profile.display_name ?? 'Anonymous',
          avatarUrl:   profile.avatar_url ?? null,
          status:      'active',
          task:        myTask,
          joinedAt:    new Date().toISOString(),
        })
        pushActivity('🫧', 'You joined the room')
      }
    })

    const handleUnload = () => channel.untrack()
    window.addEventListener('beforeunload', handleUnload)

    return () => {
      window.removeEventListener('beforeunload', handleUnload)
      setChannelState(null)
      channel.untrack().then(() => supabase.removeChannel(channel))
    }
  }, [profile?.id, room?.id])

  // ── Timer realtime ──────────────────────────────────────────────────────
  useEffect(() => {
    const sub = supabase.channel(`timer:${roomId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        (payload) => {
          const updated = payload.new as Room
          // Sync timer state
          const newState = updated.timer_state
          setTimerState(prev => {
            if (prev.status !== newState.status) {
              if (newState.status === 'focus')  pushActivity('🎯', 'Focus session started!')
              if (newState.status === 'break')  pushActivity('☕', 'Break time — rest up')
              if (newState.status === 'idle')   pushActivity('✅', `Round ${prev.round} complete!`)
            }
            return newState
          })
          // Sync host_id (for host transfer)
          setRoom(prev => prev ? { ...prev, host_id: updated.host_id } : prev)
        })
      .subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [roomId])

  // ── Presence detection ──────────────────────────────────────────────────
  const updateMyStatus = useCallback(async (status: 'active' | 'away' | 'break') => {
    if (myStatus === status) return
    setMyStatus(status)
    if (status === 'away')   pushActivity('💤', 'You went away')
    if (status === 'active') pushActivity('👀', 'You\'re back')
    await channelRef.current?.track({
      userId: profile?.id, displayName: profile?.display_name ?? 'Anonymous',
      avatarUrl: profile?.avatar_url ?? null, status, task: myTask,
      joinedAt: new Date().toISOString(),
    })
  }, [myStatus, profile, myTask])

  useEffect(() => {
    if (!presenceEnabled) return
    function resetAwayTimer() {
      if (myStatus === 'away') updateMyStatus('active')
      if (awayTimerRef.current) clearTimeout(awayTimerRef.current)
      awayTimerRef.current = setTimeout(() => updateMyStatus('away'), AWAY_TIMEOUT_MS)
    }
    function onVisibility() {
      if (document.visibilityState === 'hidden') updateMyStatus('away')
      else resetAwayTimer()
    }
    document.addEventListener('mousemove', resetAwayTimer)
    document.addEventListener('keydown',   resetAwayTimer)
    document.addEventListener('visibilitychange', onVisibility)
    resetAwayTimer()
    return () => {
      document.removeEventListener('mousemove', resetAwayTimer)
      document.removeEventListener('keydown',   resetAwayTimer)
      document.removeEventListener('visibilitychange', onVisibility)
      if (awayTimerRef.current) clearTimeout(awayTimerRef.current)
    }
  }, [presenceEnabled, myStatus, updateMyStatus])

  // ── Task confirm ────────────────────────────────────────────────────────
  async function handleTaskConfirm(task: string) {
    taskConfirmed.current = true
    setMyTask(task)
    setShowTaskModal(false)
    if (task) pushActivity('📝', `You're working on: ${task}`)
    await channelRef.current?.track({
      userId: profile?.id, displayName: profile?.display_name ?? 'Anonymous',
      avatarUrl: profile?.avatar_url ?? null, status: 'active',
      task, joinedAt: new Date().toISOString(),
    })
  }

  // ── Timer controls ──────────────────────────────────────────────────────
  async function handleTimerStart(mode: 'focus' | 'break') {
    if (!room) return
    const durationMs = mode === 'focus' ? room.focus_duration * 60000 : room.break_duration * 60000
    const now = new Date()
    const newState: TimerState = {
      status: mode, started_at: now.toISOString(),
      ends_at: new Date(now.getTime() + durationMs).toISOString(),
      round: mode === 'focus' ? timerState.round + 1 : timerState.round,
    }
    setTimerState(newState)
    await supabase.from('rooms').update({ timer_state: newState }).eq('id', roomId)
    updateMyStatus(mode === 'break' ? 'break' : 'active')

    await channelRef.current?.send({
      type: 'broadcast', event: 'activity',
      payload: { emoji: mode === 'focus' ? '🎯' : '☕', text: `${profile?.display_name} started ${mode}` },
    })
  }

  async function handleTimerReset() {
    const newState: TimerState = { status: 'idle', started_at: null, ends_at: null, round: 0 }
    setTimerState(newState)
    await supabase.from('rooms').update({ timer_state: newState }).eq('id', roomId)
  }

  // ── Reactions ───────────────────────────────────────────────────────────
  const [reactionCooldown, setReactionCooldown] = useState(false)
  async function handleReact(emoji: string, label: string) {
    if (reactionCooldown) return
    setReactionCooldown(true)
    setTimeout(() => setReactionCooldown(false), 1500)
    pushActivity(emoji, `You: ${label}`)
    await channelRef.current?.send({
      type: 'broadcast', event: 'reaction',
      payload: { emoji, label, fromUser: profile?.id, fromName: profile?.display_name },
    })
  }

  async function copyShareable() {
    const text = room?.is_public
      ? window.location.href
      : room?.access_key ?? window.location.href
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleEndSession() {
    await channelRef.current?.send({ type: 'broadcast', event: 'end_session', payload: {} })
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#070510' }}>
      <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
    </div>
  )
  if (error || !room) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: '#f7f4ef' }}>
      <p style={{ color: '#2a2420' }}>{error ?? 'Room not found'}</p>
      <Link href="/dashboard" style={{ color: '#7d9e84' }}>← Back</Link>
    </div>
  )

  const isHost     = profile?.id === room.host_id
  const env        = ENVIRONMENTS.find(e => e.id === room.environment)
  const activeCount = participants.filter(p => p.status === 'active').length
  const squadEnergy = participants.length > 0 ? Math.round((activeCount / participants.length) * 100) : 0
  const energyColor = squadEnergy >= 80 ? '#7d9e84' : squadEnergy >= 50 ? '#9b8dbc' : '#c86452'

  const glass = {
    background:    'rgba(0,0,0,0.45)',
    backdropFilter: 'blur(20px)',
    border:        '1px solid rgba(255,255,255,0.1)',
    borderRadius:  24,
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col" style={{ background: '#000' }}>
      <AmbientScene environment={room.environment} />

      {/* ── Top bar ── */}
      <div className="relative z-20 flex items-center justify-between px-5 py-3.5 shrink-0"
           style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-2 rounded-xl hover:bg-white/10 transition-all"
                style={{ color: 'rgba(255,255,255,0.6)' }}>
            <ArrowLeft size={17} />
          </Link>
          <div>
            <h1 className="text-sm font-semibold" style={{ color: '#fff' }}>{room.name}</h1>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{env?.emoji} {env?.label}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Squad energy badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
               style={{ background: `${energyColor}20`, color: energyColor, border: `1px solid ${energyColor}40` }}>
            <Zap size={11} fill={energyColor} />
            {squadEnergy}% energy
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs"
               style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>
            <Users size={12} />
            {participants.length}
          </div>

          <button onClick={() => setPresenceEnabled(!presenceEnabled)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all hover:bg-white/10"
                  style={{
                    background: presenceEnabled ? 'rgba(125,158,132,0.25)' : 'rgba(255,255,255,0.06)',
                    color: presenceEnabled ? '#b8d4bc' : 'rgba(255,255,255,0.35)',
                    border: `1px solid ${presenceEnabled ? 'rgba(125,158,132,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  }}>
            {presenceEnabled ? <Eye size={12} /> : <EyeOff size={12} />}
            <span className="hidden sm:inline">Presence</span>
          </button>

          <SpotifyPanel userId={profile?.id ?? ''} displayName={profile?.display_name ?? 'Anonymous'} channel={channelState} />

          <button onClick={copyShareable}
                  className="p-2 rounded-xl hover:bg-white/10 transition-all"
                  style={{ color: 'rgba(255,255,255,0.5)' }}>
            {copied ? <Check size={15} /> : <Share2 size={15} />}
          </button>

          <HostControls
            roomId={roomId}
            isHost={isHost}
            participants={participants}
            currentUserId={profile?.id ?? ''}
            onEndSession={handleEndSession}
          />
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 p-4 pb-24 min-h-0">

        {/* Left: Timer + squad */}
        <div className="flex flex-col gap-4">

          {/* Media panel (only if room has media enabled) */}
          {room.media_mode !== 'none' && profile && (
            <MediaPanel
              roomId={roomId}
              userId={profile.id}
              displayName={profile.display_name ?? 'Anonymous'}
              mediaMode={room.media_mode}
              channel={channelState}
            />
          )}

          {/* Round badge */}
          {timerState.round > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="self-start flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
              style={{ background: 'rgba(125,158,132,0.25)', color: '#b8d4bc', border: '1px solid rgba(125,158,132,0.3)' }}
            >
              🔥 Round {timerState.round}
              <span className="flex gap-0.5 ml-1">
                {Array.from({ length: Math.min(timerState.round, 4) }).map((_, i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: '#7d9e84' }} />
                ))}
              </span>
            </motion.div>
          )}

          {/* Timer panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col items-center justify-center gap-6 p-8 min-h-[280px]"
            style={glass}
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full"
                   style={{
                     background: timerState.status === 'focus' ? '#7d9e84' : timerState.status === 'break' ? '#9b8dbc' : '#555',
                     boxShadow: timerState.status !== 'idle' ? '0 0 8px currentColor' : 'none',
                   }} />
              <span className="text-xs font-bold uppercase tracking-widest"
                    style={{ color: 'rgba(255,255,255,0.4)' }}>
                {timerState.status === 'focus' ? 'Deep Work' : timerState.status === 'break' ? 'Break Time' : 'Ready'}
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

            {/* My task chip */}
            <div className="flex items-center gap-2">
              {myTask ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
                     style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
                  📝 <span className="truncate max-w-[160px]">{myTask}</span>
                  <button onClick={() => { taskConfirmed.current = false; setShowTaskModal(true) }}
                          style={{ color: 'rgba(255,255,255,0.25)' }}>✎</button>
                </div>
              ) : (
                <button onClick={() => { taskConfirmed.current = false; setShowTaskModal(true) }}
                        className="px-4 py-1.5 rounded-full text-xs transition-all hover:bg-white/10"
                        style={{ border: '1px dashed rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.35)' }}>
                  + Add your task
                </button>
              )}
            </div>
          </motion.div>

          {/* Squad grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="p-5" style={glass}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Squad · {participants.length} in room
              </span>
              {/* Energy bar */}
              {participants.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: energyColor }}
                      animate={{ width: `${squadEnergy}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                    />
                  </div>
                  <span className="text-xs font-medium" style={{ color: energyColor }}>{squadEnergy}%</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-4">
              <AnimatePresence mode="popLayout">
                {participants.map(u => (
                  <AvatarCard key={u.userId} user={u} isSelf={u.userId === profile?.id} isHost={room.host_id === u.userId} />
                ))}
              </AnimatePresence>
              {participants.length === 0 && (
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.25)' }}>Just you — invite someone!</p>
              )}
            </div>
          </motion.div>
        </div>

        {/* Right: Activity feed */}
        <motion.div
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
          className="flex flex-col p-4 overflow-hidden" style={{ ...glass, maxHeight: 'calc(100vh - 160px)' }}
        >
          <span className="text-xs font-bold uppercase tracking-wider mb-3 shrink-0"
                style={{ color: 'rgba(255,255,255,0.35)' }}>Live Activity</span>

          <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
            <AnimatePresence mode="popLayout">
              {activity.length === 0 ? (
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>Activity will appear here...</p>
              ) : activity.map(e => (
                <motion.div
                  key={e.id}
                  layout
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-start gap-2 text-xs py-1.5 px-2.5 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                >
                  <span className="text-sm shrink-0">{e.emoji}</span>
                  <span style={{ color: 'rgba(255,255,255,0.6)' }}>{e.text}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* ── Floating emoji reactions ── */}
      <div className="fixed bottom-20 right-8 pointer-events-none z-40 w-20">
        <AnimatePresence>
          {floatingReactions.map(f => (
            <motion.div key={f.id}
              initial={{ opacity: 1, y: 0, scale: 1 }}
              animate={{ opacity: 0, y: -90, scale: 0.4 }}
              transition={{ duration: 1.6, ease: 'easeOut' }}
              className="absolute text-2xl"
              style={{ left: `${f.x}%`, bottom: 0 }}
            >{f.emoji}</motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── Reactions bar (always visible) ── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-center gap-2 px-4 py-3"
           style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        {REACTIONS.map(r => (
          <motion.button
            key={r.id}
            onClick={() => handleReact(r.emoji, r.label)}
            disabled={reactionCooldown}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-sm font-medium transition-all disabled:opacity-40"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.75)',
            }}
          >
            <span className="text-base">{r.emoji}</span>
            <span className="hidden sm:inline text-xs">{r.label}</span>
          </motion.button>
        ))}
      </div>

      {/* ── Break banner ── */}
      <AnimatePresence>
        {timerState.status === 'break' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-30 px-6 py-3 rounded-full text-sm font-semibold"
            style={{ background: 'rgba(155,141,188,0.35)', backdropFilter: 'blur(16px)', color: '#e0d9f0', border: '1px solid rgba(155,141,188,0.4)' }}
          >
            ☕ Break time — you earned it
          </motion.div>
        )}
      </AnimatePresence>

      {showTaskModal && <TaskModal onConfirm={handleTaskConfirm} />}
    </div>
  )
}
