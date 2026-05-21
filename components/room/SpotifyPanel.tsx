'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Music, Volume2, VolumeX, X, Loader2 } from 'lucide-react'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface TrackInfo {
  id: string | null
  name: string
  artist: string
  albumArt: string | null
  isPlaying: boolean
  previewUrl: string | null
  spotifyUrl: string
  fromUserId: string
}

interface Props {
  userId: string
  channel: RealtimeChannel | null
}

const SCOPES   = 'user-read-currently-playing user-read-playback-state user-modify-playback-state'
const TOKEN_KEY  = 'spotify_access_token'
const EXPIRY_KEY = 'spotify_token_expiry'
const POLL_MS  = 6000

function genVerifier(): string {
  const arr = new Uint8Array(32)
  crypto.getRandomValues(arr)
  return btoa(String.fromCharCode(...arr)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

async function genChallenge(v: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v))
  return btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

export default function SpotifyPanel({ userId, channel }: Props) {
  const [token,      setToken]      = useState<string | null>(null)
  const [myTrack,    setMyTrack]    = useState<TrackInfo | null>(null)
  const [theirTrack, setTheirTrack] = useState<TrackInfo | null>(null)
  const [volume,     setVolume]     = useState(60)
  const [muted,      setMuted]      = useState(false)
  const [open,       setOpen]       = useState(false)
  const [connecting, setConnecting] = useState(false)

  const audioRef    = useRef<HTMLAudioElement | null>(null)
  const pollRef     = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastId      = useRef<string | null>(null)
  const volDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Load stored token ──────────────────────────────────────────────────────
  useEffect(() => {
    const t = localStorage.getItem(TOKEN_KEY)
    const exp = Number(localStorage.getItem(EXPIRY_KEY) ?? 0)
    if (t && Date.now() < exp) setToken(t)
  }, [])

  // ── Receive remote broadcasts ──────────────────────────────────────────────
  useEffect(() => {
    if (!channel) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    channel.on('broadcast', { event: 'music' }, ({ payload }: { payload: any }) => {
      if (payload.fromUserId === userId) return
      setTheirTrack(payload as TrackInfo)
    })
  }, [channel, userId])

  // ── Drive remote preview audio ─────────────────────────────────────────────
  useEffect(() => {
    if (myTrack) return  // I'm the broadcaster; don't play their preview
    if (!theirTrack?.id || !theirTrack.isPlaying || !theirTrack.previewUrl) {
      audioRef.current?.pause()
      return
    }
    if (!audioRef.current) audioRef.current = new Audio()
    const audio = audioRef.current
    if (theirTrack.id !== lastId.current) {
      lastId.current = theirTrack.id
      audio.src = theirTrack.previewUrl
      audio.loop = true
      audio.volume = muted ? 0 : volume / 100
    }
    audio.play().catch(() => {})
  }, [theirTrack, myTrack])

  // Stop preview when I become broadcaster
  useEffect(() => {
    if (myTrack && audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      lastId.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!myTrack])

  // Cleanup on unmount
  useEffect(() => () => {
    audioRef.current?.pause()
    if (pollRef.current) clearInterval(pollRef.current)
    if (volDebounce.current) clearTimeout(volDebounce.current)
  }, [])

  // ── Poll Spotify currently-playing ─────────────────────────────────────────
  const poll = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401) { disconnect(); return }
      if (res.status === 204) {
        setMyTrack(null)
        channel?.send({ type: 'broadcast', event: 'music', payload: { fromUserId: userId, id: null, isPlaying: false, name: '', artist: '' } })
        return
      }
      const data = await res.json()
      if (!data?.item) { setMyTrack(null); return }
      const t: TrackInfo = {
        id:         data.item.id,
        name:       data.item.name,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        artist:     data.item.artists?.map((a: any) => a.name).join(', ') ?? '',
        albumArt:   data.item.album?.images?.[1]?.url ?? null,
        isPlaying:  data.is_playing,
        previewUrl: data.item.preview_url ?? null,
        spotifyUrl: data.item.external_urls?.spotify ?? '',
        fromUserId: userId,
      }
      setMyTrack(t)
      channel?.send({ type: 'broadcast', event: 'music', payload: t })
    } catch { /* network error */ }
  }, [token, channel, userId])

  useEffect(() => {
    if (!token) return
    poll()
    pollRef.current = setInterval(poll, POLL_MS)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [poll])

  // ── Volume ─────────────────────────────────────────────────────────────────
  function handleVolume(v: number) {
    setVolume(v)
    if (audioRef.current && !muted) audioRef.current.volume = v / 100
    // Broadcaster: debounce Spotify API volume update
    if (token && myTrack) {
      if (volDebounce.current) clearTimeout(volDebounce.current)
      volDebounce.current = setTimeout(() => {
        fetch(`https://api.spotify.com/v1/me/player/volume?volume_percent=${v}`, {
          method: 'PUT', headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {})
      }, 300)
    }
  }

  function toggleMute() {
    const m = !muted
    setMuted(m)
    if (audioRef.current) audioRef.current.volume = m ? 0 : volume / 100
  }

  // ── OAuth ──────────────────────────────────────────────────────────────────
  async function connect() {
    const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
    if (!clientId) { alert('Add NEXT_PUBLIC_SPOTIFY_CLIENT_ID to your environment variables.'); return }
    setConnecting(true)
    const verifier  = genVerifier()
    const challenge = await genChallenge(verifier)
    sessionStorage.setItem('spotify_verifier', verifier)
    sessionStorage.setItem('spotify_return', window.location.pathname)
    const q = new URLSearchParams({
      client_id: clientId, response_type: 'code',
      redirect_uri: `${window.location.origin}/auth/spotify/callback`,
      scope: SCOPES, code_challenge_method: 'S256', code_challenge: challenge,
    })
    window.location.href = `https://accounts.spotify.com/authorize?${q}`
  }

  function disconnect() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(EXPIRY_KEY)
    setToken(null)
    setMyTrack(null)
    if (pollRef.current) clearInterval(pollRef.current)
    channel?.send({ type: 'broadcast', event: 'music', payload: { fromUserId: userId, id: null, isPlaying: false, name: '', artist: '' } })
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const displayTrack  = myTrack ?? (theirTrack?.id ? theirTrack : null)
  const isBroadcaster = !!myTrack && !!token

  return (
    <div className="relative">
      {/* Button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="p-2 rounded-xl transition-all hover:bg-white/10 relative"
        style={{ color: displayTrack?.isPlaying ? '#1db954' : 'rgba(255,255,255,0.5)' }}
        title="Music"
      >
        <Music size={15} />
        {displayTrack?.isPlaying && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#1db954] animate-pulse" />
        )}
      </button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-72 p-4 z-50"
            style={{
              background: 'rgba(10,8,18,0.95)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 18,
              boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
                    style={{ color: 'rgba(255,255,255,0.4)' }}>
                <Music size={11} /> Music
                {isBroadcaster && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                        style={{ background: 'rgba(29,185,84,0.2)', color: '#1db954' }}>DJ</span>
                )}
              </span>
              <button onClick={() => setOpen(false)} style={{ color: 'rgba(255,255,255,0.3)' }}>
                <X size={14} />
              </button>
            </div>

            {/* Track info */}
            {displayTrack ? (
              <div className="flex items-center gap-3 mb-4">
                {displayTrack.albumArt ? (
                  <img src={displayTrack.albumArt} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0"
                       style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }} />
                ) : (
                  <div className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0"
                       style={{ background: 'rgba(29,185,84,0.12)' }}>
                    <Music size={16} style={{ color: '#1db954' }} />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate text-white">{displayTrack.name}</p>
                  <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.45)' }}>{displayTrack.artist}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full"
                         style={{ background: displayTrack.isPlaying ? '#1db954' : '#444',
                                  boxShadow: displayTrack.isPlaying ? '0 0 5px #1db954' : 'none' }} />
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.28)' }}>
                      {displayTrack.isPlaying ? 'Playing' : 'Paused'}
                      {!isBroadcaster && displayTrack.previewUrl && ' · 30s preview'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-4 py-2 text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                <Music size={13} />
                {token ? 'Nothing playing on Spotify' : 'No music in this room'}
              </div>
            )}

            {/* Volume slider */}
            <div className="flex items-center gap-2.5 mb-4">
              <button onClick={toggleMute} className="shrink-0 transition-opacity hover:opacity-70"
                      style={{ color: 'rgba(255,255,255,0.4)' }}>
                {muted || volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
              <input
                type="range"
                min={0} max={100}
                value={muted ? 0 : volume}
                onChange={e => handleVolume(Number(e.target.value))}
                className="flex-1 cursor-pointer"
                style={{ accentColor: '#1db954', height: 4 }}
              />
              <span className="text-xs w-6 text-right shrink-0 tabular-nums"
                    style={{ color: 'rgba(255,255,255,0.3)' }}>
                {muted ? 0 : volume}
              </span>
            </div>

            {/* Connect / disconnect */}
            <div className="border-t" style={{ borderColor: 'rgba(255,255,255,0.07)', paddingTop: 12 }}>
              {token ? (
                <button onClick={disconnect}
                        className="w-full py-2 rounded-xl text-xs font-medium transition-all hover:bg-white/5"
                        style={{ color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  Disconnect Spotify
                </button>
              ) : (
                <button onClick={connect} disabled={connecting}
                        className="w-full py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all hover:opacity-90 disabled:opacity-60"
                        style={{ background: '#1db954', color: '#000' }}>
                  {connecting ? <Loader2 size={12} className="animate-spin" /> : <Music size={12} />}
                  Connect Spotify
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
