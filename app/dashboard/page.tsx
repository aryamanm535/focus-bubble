'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, LogOut, Users, Clock, Lock, Globe, Coffee, BookOpen, Laptop, Leaf, X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ENVIRONMENTS, generateRoomKey } from '@/lib/utils'
import type { Room, Profile } from '@/types'

const ENV_ICONS: Record<string, typeof Coffee> = {
  'rainy-cafe':  Coffee,
  'library':     BookOpen,
  'coding-den':  Laptop,
  'nature':      Leaf,
}

const ENV_COLORS: Record<string, string> = {
  'rainy-cafe': '#a07848',
  'library':    '#5c7e63',
  'coding-den': '#7a6d9e',
  'nature':     '#5a8a4a',
}

function RoomCard({ room, onJoin }: { room: Room; onJoin: (id: string, isPublic: boolean) => void }) {
  const Icon = ENV_ICONS[room.environment] ?? Coffee
  const color = ENV_COLORS[room.environment] ?? '#7a6a60'
  const env = ENVIRONMENTS.find((e) => e.id === room.environment)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="group p-5 rounded-2xl cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1"
      style={{ background: '#fdfaf6', border: '1px solid #ece8e1' }}
      onClick={() => onJoin(room.id, room.is_public)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
             style={{ background: `${color}18` }}>
          <Icon size={20} style={{ color }} />
        </div>
        {room.is_public
          ? <div className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full" style={{ background: '#e8f0e6', color: '#5c7e63' }}><Globe size={10} /> Public</div>
          : <div className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full" style={{ background: '#f5f3fa', color: '#7a6d9e' }}><Lock size={10} /> Private</div>
        }
      </div>

      <h3 className="font-semibold text-base mb-1 group-hover:text-sage-600 transition-colors" style={{ color: '#2a2420' }}>
        {room.name}
      </h3>
      {room.description && (
        <p className="text-xs mb-3 line-clamp-2" style={{ color: '#7a6a60' }}>{room.description}</p>
      )}

      <div className="flex items-center justify-between text-xs" style={{ color: '#b8a89a' }}>
        <div className="flex items-center gap-1">
          <Users size={12} />
          <span>{room.participant_count ?? 0} in room</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock size={12} />
          <span>{env?.emoji} {env?.label}</span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t" style={{ borderColor: '#ece8e1' }}>
        <div className="flex items-center gap-1 text-xs" style={{ color: '#b8a89a' }}>
          <Clock size={11} />
          {room.focus_duration}m focus / {room.break_duration}m break
        </div>
      </div>
    </motion.div>
  )
}

function CreateRoomModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const supabase = createClient()
  const [name, setName]           = useState('')
  const [description, setDesc]    = useState('')
  const [environment, setEnv]     = useState<string>('rainy-cafe')
  const [isPublic, setPublic]     = useState(true)
  const [focusMins, setFocus]     = useState(25)
  const [breakMins, setBreak]     = useState(5)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not authenticated'); setLoading(false); return }

    const { data, error: err } = await supabase.from('rooms').insert({
      name: name.trim(),
      description: description.trim() || null,
      environment,
      is_public: isPublic,
      access_key: isPublic ? null : generateRoomKey(),
      host_id: user.id,
      focus_duration: focusMins,
      break_duration: breakMins,
    }).select().single()

    if (err || !data) {
      setError(err?.message ?? 'Failed to create room')
      setLoading(false)
    } else {
      onCreated(data.id)
    }
  }

  const inputStyle = {
    background: '#f0ede6', border: '1.5px solid #dbd4c8', color: '#2a2420',
    borderRadius: 12, padding: '10px 14px', fontSize: 14, outline: 'none', width: '100%',
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 flex items-center justify-center px-4"
        style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 22, stiffness: 320 }}
          className="w-full max-w-md rounded-3xl p-7 max-h-[90vh] overflow-y-auto"
          style={{ background: '#fdfaf6', border: '1px solid #ece8e1', boxShadow: '0 24px 60px rgba(0,0,0,0.2)' }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold" style={{ fontFamily: 'Lora, Georgia, serif', color: '#2a2420' }}>
              Create a room
            </h2>
            <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-black/5" style={{ color: '#7a6a60' }}>
              <X size={18} />
            </button>
          </div>

          <form onSubmit={create} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: '#7a6a60' }}>Room name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Finals week grind"
                     required maxLength={50} style={inputStyle}
                     onFocus={(e) => { e.target.style.borderColor = '#9b8dbc'; e.target.style.background = '#fff' }}
                     onBlur={(e)  => { e.target.style.borderColor = '#dbd4c8'; e.target.style.background = '#f0ede6' }} />
            </div>

            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: '#7a6a60' }}>Description <span style={{ color: '#b8a89a' }}>(optional)</span></label>
              <input value={description} onChange={(e) => setDesc(e.target.value)} placeholder="What's the vibe?"
                     maxLength={120} style={inputStyle}
                     onFocus={(e) => { e.target.style.borderColor = '#9b8dbc'; e.target.style.background = '#fff' }}
                     onBlur={(e)  => { e.target.style.borderColor = '#dbd4c8'; e.target.style.background = '#f0ede6' }} />
            </div>

            <div>
              <label className="text-xs font-medium block mb-2" style={{ color: '#7a6a60' }}>Ambient environment</label>
              <div className="grid grid-cols-4 gap-2">
                {ENVIRONMENTS.map((env) => (
                  <button type="button" key={env.id} onClick={() => setEnv(env.id)}
                          className="flex flex-col items-center gap-1 p-2.5 rounded-xl text-xs transition-all"
                          style={{
                            background: environment === env.id ? '#e0d9f0' : '#f0ede6',
                            border: `1.5px solid ${environment === env.id ? '#9b8dbc' : 'transparent'}`,
                            color: '#3d2e23',
                          }}>
                    <span className="text-xl">{env.emoji}</span>
                    <span className="text-center leading-tight" style={{ fontSize: 10 }}>{env.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: '#7a6a60' }}>Focus (min)</label>
                <select value={focusMins} onChange={(e) => setFocus(Number(e.target.value))} style={inputStyle}>
                  {[15, 20, 25, 30, 45, 50, 60].map((m) => <option key={m} value={m}>{m} min</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: '#7a6a60' }}>Break (min)</label>
                <select value={breakMins} onChange={(e) => setBreak(Number(e.target.value))} style={inputStyle}>
                  {[5, 10, 15, 20].map((m) => <option key={m} value={m}>{m} min</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium block mb-2" style={{ color: '#7a6a60' }}>Visibility</label>
              <div className="flex gap-2">
                {[
                  { v: true,  icon: Globe, label: 'Public',  desc: 'Anyone can join' },
                  { v: false, icon: Lock,  label: 'Private', desc: 'Invite with key' },
                ].map(({ v, icon: Icon, label, desc }) => (
                  <button type="button" key={label} onClick={() => setPublic(v)}
                          className="flex-1 flex flex-col items-center gap-1 p-3 rounded-xl transition-all"
                          style={{
                            background: isPublic === v ? (v ? '#e8f0e6' : '#f5f3fa') : '#f0ede6',
                            border: `1.5px solid ${isPublic === v ? (v ? '#7d9e84' : '#9b8dbc') : 'transparent'}`,
                          }}>
                    <Icon size={16} style={{ color: isPublic === v ? (v ? '#5c7e63' : '#7a6d9e') : '#b8a89a' }} />
                    <span className="text-xs font-medium" style={{ color: '#3d2e23' }}>{label}</span>
                    <span className="text-xs" style={{ color: '#7a6a60' }}>{desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-xs p-3 rounded-xl" style={{ background: '#fdf3f1', color: '#c86452' }}>{error}</p>}

            <button type="submit" disabled={loading}
                    className="w-full py-3 rounded-2xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #7d9e84, #9b8dbc)' }}>
              {loading && <Loader2 size={16} className="animate-spin" />}
              Create room
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile]         = useState<Profile | null>(null)
  const [rooms, setRooms]             = useState<Room[]>([])
  const [loading, setLoading]         = useState(true)
  const [showCreate, setShowCreate]   = useState(false)
  const [joinKey, setJoinKey]         = useState('')
  const [keyError, setKeyError]       = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [{ data: prof }, { data: roomData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('rooms').select('*').eq('is_public', true).order('created_at', { ascending: false }).limit(24),
      ])

      if (!mounted) return
      setProfile(prof)
      setRooms((roomData ?? []) as Room[])
      setLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  async function joinByKey(e: React.FormEvent) {
    e.preventDefault()
    setKeyError(null)
    const { data, error } = await supabase.from('rooms')
      .select('id').eq('access_key', joinKey.trim().toUpperCase()).single()
    if (error || !data) { setKeyError('Room not found.'); return }
    router.push(`/room/${data.id}`)
  }

  function handleJoin(id: string, isPublic: boolean) {
    router.push(`/room/${id}`)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f7f4ef' }}>
      <Loader2 size={28} className="animate-spin" style={{ color: '#9b8dbc' }} />
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: '#f7f4ef', color: '#3d2e23' }}>
      {/* Nav */}
      <nav className="sticky top-0 z-40 flex items-center justify-between px-6 py-4"
           style={{ background: 'rgba(247,244,239,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #ece8e1' }}>
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl">🫧</span>
          <span className="font-display text-lg font-semibold" style={{ fontFamily: 'Lora, Georgia, serif' }}>Focus Bubble</span>
        </Link>
        <div className="flex items-center gap-3">
          {profile && (
            <div className="hidden sm:flex items-center gap-2 text-sm" style={{ color: '#7a6a60' }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold"
                   style={{ background: '#e0d9f0', color: '#7a6d9e' }}>
                {(profile.display_name ?? 'U')[0].toUpperCase()}
              </div>
              <span>{profile.display_name}</span>
              {profile.streak_days > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: '#fdf3f1', color: '#c86452' }}>
                  🔥 {profile.streak_days}
                </span>
              )}
            </div>
          )}
          <button onClick={signOut} className="p-2 rounded-xl hover:bg-black/5 transition-colors"
                  style={{ color: '#7a6a60' }} title="Sign out">
            <LogOut size={18} />
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-5 py-10">
        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold" style={{ fontFamily: 'Lora, Georgia, serif', color: '#2a2420' }}>
              Focus rooms
            </h1>
            <p className="text-sm mt-1" style={{ color: '#7a6a60' }}>
              Join a live session or create your own space.
            </p>
          </div>

          <div className="flex gap-2">
            {/* Join by key */}
            <form onSubmit={joinByKey} className="flex gap-2">
              <div className="relative">
                <input
                  value={joinKey} onChange={(e) => setJoinKey(e.target.value)}
                  placeholder="Room key (ABC123)"
                  maxLength={8}
                  className="px-4 py-2.5 rounded-xl text-sm outline-none transition-all uppercase"
                  style={{ background: '#fff', border: '1.5px solid #dbd4c8', color: '#2a2420', width: 160 }}
                  onFocus={(e) => { e.target.style.borderColor = '#9b8dbc' }}
                  onBlur={(e)  => { e.target.style.borderColor = '#dbd4c8' }}
                />
              </div>
              <button type="submit" className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-black/5"
                      style={{ background: '#f0ede6', color: '#3d2e23', border: '1px solid #dbd4c8' }}>
                Join
              </button>
            </form>

            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-md"
              style={{ background: 'linear-gradient(135deg, #7d9e84, #9b8dbc)' }}
            >
              <Plus size={16} /> Create room
            </button>
          </div>
        </div>

        {keyError && (
          <p className="text-sm mb-4 px-4 py-2 rounded-xl" style={{ background: '#fdf3f1', color: '#c86452' }}>
            {keyError}
          </p>
        )}

        {/* Room grid */}
        {rooms.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🫧</div>
            <p className="text-lg font-semibold mb-2" style={{ color: '#2a2420' }}>No rooms yet.</p>
            <p className="text-sm mb-6" style={{ color: '#7a6a60' }}>Be the first to create a space.</p>
            <button onClick={() => setShowCreate(true)}
                    className="px-6 py-3 rounded-full text-sm font-semibold text-white"
                    style={{ background: 'linear-gradient(135deg, #7d9e84, #9b8dbc)' }}>
              Create the first room →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {rooms.map((room) => (
              <RoomCard key={room.id} room={room} onJoin={handleJoin} />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateRoomModal
          onClose={() => setShowCreate(false)}
          onCreated={(id) => { setShowCreate(false); router.push(`/room/${id}`) }}
        />
      )}
    </div>
  )
}
