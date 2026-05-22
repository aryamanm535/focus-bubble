'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Music, Volume2, VolumeX, X, Loader2, ChevronDown,
  SkipBack, SkipForward, Play, Pause, ListMusic,
} from 'lucide-react'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface TrackInfo {
  id: string | null
  name: string
  artist: string
  albumArt: string | null
  isPlaying: boolean
  previewUrl: string | null
  spotifyUrl: string
  trackUri: string | null
  progressMs: number
  fromUserId: string
}

interface QueueItem {
  id: string
  name: string
  artist: string
  albumArt: string | null
  uri: string
  durationMs: number
}

interface Props {
  userId: string
  displayName: string
  channel: RealtimeChannel | null
}

const SCOPES     = 'user-read-currently-playing user-read-playback-state user-modify-playback-state'
const TOKEN_KEY  = 'spotify_access_token'
const EXPIRY_KEY = 'spotify_token_expiry'
const POLL_MS    = 6000

function genVerifier(): string {
  const arr = new Uint8Array(32)
  crypto.getRandomValues(arr)
  return btoa(String.fromCharCode(...arr)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

async function genChallenge(v: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v))
  return btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function formatMs(ms: number): string {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

async function spotifyVolume(token: string, pct: number) {
  await fetch(`https://api.spotify.com/v1/me/player/volume?volume_percent=${pct}`, {
    method: 'PUT', headers: { Authorization: `Bearer ${token}` },
  }).catch(() => {})
}

export default function SpotifyPanel({ userId, displayName, channel }: Props) {
  const [token,          setToken]          = useState<string | null>(null)
  const [djUserId,       setDjUserId]       = useState<string | null>(null)
  const [theirTrack,     setTheirTrack]     = useState<TrackInfo | null>(null)
  const [myTrack,        setMyTrack]        = useState<TrackInfo | null>(null)
  const [spotifyPeers,   setSpotifyPeers]   = useState<Map<string, string>>(new Map())
  const [listeningAlong, setListeningAlong] = useState(false)
  const [volume,         setVolume]         = useState(60)
  const [muted,          setMuted]          = useState(false)
  const [open,           setOpen]           = useState(false)
  const [connecting,     setConnecting]     = useState(false)
  const [showHandoff,    setShowHandoff]    = useState(false)
  const [queue,          setQueue]          = useState<QueueItem[]>([])
  const [showQueue,      setShowQueue]      = useState(false)
  const [loadingQueue,   setLoadingQueue]   = useState(false)

  const audioRef    = useRef<HTMLAudioElement | null>(null)
  const pollRef     = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastId      = useRef<string | null>(null)
  const volDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const djUserIdRef          = useRef<string | null>(null)
  const myTrackRef           = useRef<TrackInfo | null>(null)
  const theirTrackRef        = useRef<TrackInfo | null>(null)
  const theirTrackReceivedAt = useRef<number>(0)
  const amDj                 = token !== null && djUserId === userId

  // ── Token ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const t   = localStorage.getItem(TOKEN_KEY)
    const exp = Number(localStorage.getItem(EXPIRY_KEY) ?? 0)
    if (t && Date.now() < exp) setToken(t)
  }, [])

  // ── Realtime ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!channel) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    channel.on('broadcast', { event: 'music' }, ({ payload }: { payload: any }) => {
      if (payload.fromUserId === userId) return
      setDjUserId(payload.fromUserId)  // always track DJ identity; cleared via music_presence disconnect
      setTheirTrack(payload as TrackInfo)
      theirTrackRef.current        = payload as TrackInfo
      theirTrackReceivedAt.current = Date.now()
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    channel.on('broadcast', { event: 'music_presence' }, ({ payload }: { payload: any }) => {
      if (payload.userId === userId) return
      setSpotifyPeers(prev => {
        const next = new Map(prev)
        if (payload.connected) next.set(payload.userId, payload.displayName)
        else next.delete(payload.userId)
        return next
      })
      // If the DJ disconnected, clear their slot so the next person can claim it
      if (!payload.connected && djUserIdRef.current === payload.userId) {
        setDjUserId(null)
      }
      // If I'm already DJ and someone new connects, immediately announce so they
      // receive the current track before their 2.5 s claim-timer fires
      if (payload.connected && djUserIdRef.current === userId) {
        const t = localStorage.getItem(TOKEN_KEY)
        if (t) {
          channel.send({
            type: 'broadcast', event: 'music',
            payload: myTrackRef.current ?? {
              fromUserId: userId, id: null, isPlaying: false,
              name: '', artist: '', albumArt: null,
              previewUrl: null, spotifyUrl: '', trackUri: null, progressMs: 0,
            },
          })
        }
      }
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    channel.on('broadcast', { event: 'music_handoff' }, ({ payload }: { payload: any }) => {
      if (payload.toUserId !== userId) return
      setDjUserId(userId)  // effect 3 starts polling automatically
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, userId])

  // ── Listen-along ───────────────────────────────────────────────────────────
  // Fires on new track OR play/pause change from DJ
  useEffect(() => {
    if (!token || amDj) return
    if (!theirTrack?.trackUri || !theirTrack.id) return
    const t = localStorage.getItem(TOKEN_KEY)
    if (!t) return

    const elapsed          = theirTrackReceivedAt.current > 0 ? Date.now() - theirTrackReceivedAt.current : 0
    const estimatedProgress = Math.max(0, theirTrack.progressMs + (theirTrack.isPlaying ? elapsed : 0))

    // Same track — only sync play/pause without seeking (avoids jarring seek)
    if (theirTrack.id === lastId.current) {
      const endpoint = theirTrack.isPlaying ? 'play' : 'pause'
      fetch(`https://api.spotify.com/v1/me/player/${endpoint}`, {
        method: 'PUT', headers: { Authorization: `Bearer ${t}` },
      }).catch(() => {
        if (!theirTrack.isPlaying) { audioRef.current?.pause() }
        else if (audioRef.current?.src) { audioRef.current.play().catch(() => {}) }
      })
      return
    }

    // New track
    lastId.current = theirTrack.id
    audioRef.current?.pause()
    if (audioRef.current) audioRef.current.src = ''

    fetch('https://api.spotify.com/v1/me/player/play', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ uris: [theirTrack.trackUri], position_ms: estimatedProgress }),
    })
      .then(r => {
        if (!r.ok && r.status !== 204) throw new Error(`${r.status}`)
        setListeningAlong(true)
        // If DJ is paused, immediately pause after seeking to lock position
        if (!theirTrack.isPlaying) {
          fetch('https://api.spotify.com/v1/me/player/pause', {
            method: 'PUT', headers: { Authorization: `Bearer ${t}` },
          }).catch(() => {})
        }
      })
      .catch(() => {
        // No active device (404) or no Premium (403) — fall back to 30 s preview
        setListeningAlong(false)
        if (theirTrack.previewUrl) {
          if (!audioRef.current) audioRef.current = new Audio()
          audioRef.current.src    = theirTrack.previewUrl
          audioRef.current.loop   = true
          audioRef.current.volume = muted ? 0 : volume / 100
          if (theirTrack.isPlaying) audioRef.current.play().catch(() => {})
        }
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theirTrack?.id, theirTrack?.isPlaying, token, amDj])

  // ── Preview fallback (no token) ────────────────────────────────────────────
  useEffect(() => {
    if (token || amDj) return
    if (!theirTrack?.id || !theirTrack.previewUrl) { audioRef.current?.pause(); return }
    if (!audioRef.current) audioRef.current = new Audio()
    if (theirTrack.id !== lastId.current) {
      lastId.current = theirTrack.id
      audioRef.current.src   = theirTrack.previewUrl
      audioRef.current.loop  = true
      audioRef.current.volume = muted ? 0 : volume / 100
    }
    theirTrack.isPlaying ? audioRef.current.play().catch(() => {}) : audioRef.current.pause()
  }, [theirTrack, token, amDj])

  // Stop preview when becoming DJ
  useEffect(() => {
    if (amDj && audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      lastId.current = null
      setListeningAlong(false)
    }
  }, [amDj])

  useEffect(() => { djUserIdRef.current = djUserId }, [djUserId])
  useEffect(() => { myTrackRef.current  = myTrack  }, [myTrack])

  // ── Listener lock-in polling ───────────────────────────────────────────────
  // Every 4 s, verify the listener is still on the DJ's track.
  // Catches manual overrides and play-state drift without needing the DJ
  // to send a new broadcast.
  useEffect(() => {
    if (!token || amDj) return

    async function listenerSync() {
      const t = localStorage.getItem(TOKEN_KEY)
      if (!t) return
      const djTrack = theirTrackRef.current
      if (!djTrack?.id || !djTrack.trackUri) return

      const elapsed           = theirTrackReceivedAt.current > 0 ? Date.now() - theirTrackReceivedAt.current : 0
      const estimatedProgress = Math.max(0, djTrack.progressMs + (djTrack.isPlaying ? elapsed : 0))

      try {
        const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
          headers: { Authorization: `Bearer ${t}` },
        })
        if (res.status === 401) {
          localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(EXPIRY_KEY)
          setToken(null); return
        }
        if (res.status === 204) {
          // No active device — try to start if DJ is playing
          if (djTrack.isPlaying) {
            const r = await fetch('https://api.spotify.com/v1/me/player/play', {
              method: 'PUT',
              headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ uris: [djTrack.trackUri], position_ms: estimatedProgress }),
            }).catch(() => null)
            if (r && (r.ok || r.status === 204)) setListeningAlong(true)
          }
          return
        }
        const data = await res.json()
        if (!data?.item) return

        const uriMismatch  = data.item.uri !== djTrack.trackUri
        const bigDrift     = Math.abs((data.progress_ms ?? 0) - estimatedProgress) > 8000
        const playMismatch = data.is_playing !== djTrack.isPlaying

        if (uriMismatch || bigDrift) {
          // Force back onto DJ's track at current estimated position
          const playRes = await fetch('https://api.spotify.com/v1/me/player/play', {
            method: 'PUT',
            headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ uris: [djTrack.trackUri], position_ms: estimatedProgress }),
          }).catch(() => null)
          if (playRes && (playRes.ok || playRes.status === 204)) {
            if (!djTrack.isPlaying) {
              await fetch('https://api.spotify.com/v1/me/player/pause', {
                method: 'PUT', headers: { Authorization: `Bearer ${t}` },
              }).catch(() => {})
            }
            setListeningAlong(true)
          }
        } else if (playMismatch) {
          const endpoint = djTrack.isPlaying ? 'play' : 'pause'
          const r = await fetch(`https://api.spotify.com/v1/me/player/${endpoint}`, {
            method: 'PUT', headers: { Authorization: `Bearer ${t}` },
          }).catch(() => null)
          if (r && (r.ok || r.status === 204)) setListeningAlong(true)
        }
      } catch { /* network */ }
    }

    const id = setInterval(listenerSync, 4000)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, amDj])

  useEffect(() => () => {
    audioRef.current?.pause()
    if (pollRef.current)     clearInterval(pollRef.current)
    if (volDebounce.current) clearTimeout(volDebounce.current)
  }, [])

  // ── Polling ────────────────────────────────────────────────────────────────
  const poll = useCallback(async () => {
    const t = localStorage.getItem(TOKEN_KEY)
    if (!t) return
    try {
      const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: { Authorization: `Bearer ${t}` },
      })
      if (res.status === 401) { disconnect(); return }
      if (res.status === 204) {
        setMyTrack(null)
        channel?.send({ type: 'broadcast', event: 'music',
          payload: { fromUserId: userId, id: null, isPlaying: false, name: '', artist: '', trackUri: null, progressMs: 0 } })
        return
      }
      const data = await res.json()
      if (!data?.item) { setMyTrack(null); return }
      const track: TrackInfo = {
        id:         data.item.id,
        name:       data.item.name,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        artist:     data.item.artists?.map((a: any) => a.name).join(', ') ?? '',
        albumArt:   data.item.album?.images?.[1]?.url ?? null,
        isPlaying:  data.is_playing,
        previewUrl: data.item.preview_url ?? null,
        spotifyUrl: data.item.external_urls?.spotify ?? '',
        trackUri:   data.item.uri ?? null,
        progressMs: data.progress_ms ?? 0,
        fromUserId: userId,
      }
      setMyTrack(track)
      channel?.send({ type: 'broadcast', event: 'music', payload: track })
    } catch { /* network error */ }
  }, [channel, userId])

  function startPolling() {
    if (pollRef.current) clearInterval(pollRef.current)
    poll()
    pollRef.current = setInterval(poll, POLL_MS)
  }

  function stopPolling() {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = null
    setMyTrack(null)
  }

  // Poll immediately after a control action so listeners see the change fast
  function pollSoon() { setTimeout(poll, 700) }

  // ── Playback controls (DJ only) ────────────────────────────────────────────
  async function togglePlayPause() {
    if (!token) return
    const playing = displayTrack?.isPlaying ?? false
    await fetch(`https://api.spotify.com/v1/me/player/${playing ? 'pause' : 'play'}`, {
      method: 'PUT', headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {})
    pollSoon()
  }

  async function skipNext() {
    if (!token) return
    await fetch('https://api.spotify.com/v1/me/player/next', {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {})
    setQueue([])  // stale after skip
    pollSoon()
  }

  async function skipPrevious() {
    if (!token) return
    await fetch('https://api.spotify.com/v1/me/player/previous', {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {})
    setQueue([])
    pollSoon()
  }

  // ── Queue ──────────────────────────────────────────────────────────────────
  async function fetchQueue() {
    if (!token) return
    setLoadingQueue(true)
    try {
      const res = await fetch('https://api.spotify.com/v1/me/player/queue', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) { setLoadingQueue(false); return }
      const data = await res.json()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items: QueueItem[] = (data.queue ?? []).slice(0, 12).map((item: any) => ({
        id:         item.id,
        name:       item.name,
        artist:     item.artists?.map((a: any) => a.name).join(', ') ?? '',
        albumArt:   item.album?.images?.[2]?.url ?? null,
        uri:        item.uri,
        durationMs: item.duration_ms ?? 0,
      }))
      setQueue(items)
    } catch { /* ignore */ }
    setLoadingQueue(false)
  }

  async function playFromQueue(uri: string) {
    if (!token) return
    await fetch('https://api.spotify.com/v1/me/player/play', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ uris: [uri] }),
    }).catch(() => {})
    setQueue([])
    pollSoon()
  }

  function toggleQueue() {
    const next = !showQueue
    setShowQueue(next)
    if (next && token) fetchQueue()
  }

  // ── Volume ─────────────────────────────────────────────────────────────────
  function handleVolume(v: number) {
    setVolume(v)
    if (audioRef.current && !muted) audioRef.current.volume = v / 100
    if (token && (amDj || listeningAlong)) {
      if (volDebounce.current) clearTimeout(volDebounce.current)
      volDebounce.current = setTimeout(() => spotifyVolume(token, v), 300)
    }
  }

  function toggleMute() {
    const m = !muted
    setMuted(m)
    if (audioRef.current) audioRef.current.volume = m ? 0 : volume / 100
    if (token && (amDj || listeningAlong)) spotifyVolume(token, m ? 0 : volume)
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

  // 1. Claim DJ after a delay — but only once the channel is live so the
  //    music_presence exchange with the existing DJ can complete first.
  //    Functional update: only claim if nobody else has already.
  useEffect(() => {
    if (!token || !channel) return
    const t = setTimeout(() => setDjUserId(prev => prev ?? userId), 3000)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!token, !!channel])

  // 2. Announce Spotify presence when channel is ready
  useEffect(() => {
    if (!token || !channel) return
    channel.send({ type: 'broadcast', event: 'music_presence',
      payload: { userId, displayName, connected: true } })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!token, !!channel])

  // 3. Start / stop polling whenever DJ status or channel availability changes
  useEffect(() => {
    if (!token) return
    const isDj = djUserId === userId
    if (isDj && channel) { startPolling(); return () => stopPolling() }
    if (!isDj) stopPolling()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [djUserId, !!channel, !!token])

  function disconnect() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(EXPIRY_KEY)
    channel?.send({ type: 'broadcast', event: 'music_presence', payload: { userId, connected: false } })
    stopPolling()
    setToken(null); setMyTrack(null)
    setDjUserId(prev => prev === userId ? null : prev)
    setListeningAlong(false); setQueue([]); setShowQueue(false)
    lastId.current = null
  }

  async function handOffDj(toUserId: string) {
    setShowHandoff(false)
    channel?.send({ type: 'broadcast', event: 'music_handoff', payload: { toUserId } })
    stopPolling()
    setDjUserId(toUserId)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const displayTrack = myTrack ?? (theirTrack?.id ? theirTrack : null)
  const isListener   = !!token && !amDj && !!theirTrack?.id
  const handoffPeers = Array.from(spotifyPeers.entries())

  return (
    <div className="relative">
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

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 z-50"
            style={{
              background: 'rgba(10,8,18,0.97)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 18,
              boxShadow: '0 16px 48px rgba(0,0,0,0.65)',
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
                    style={{ color: 'rgba(255,255,255,0.4)' }}>
                <Music size={11} /> Music
                {amDj && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                        style={{ background: 'rgba(29,185,84,0.2)', color: '#1db954' }}>DJ</span>
                )}
                {isListener && listeningAlong && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                        style={{ background: 'rgba(29,185,84,0.12)', color: '#1db954' }}>listening along</span>
                )}
              </span>
              <button onClick={() => setOpen(false)} style={{ color: 'rgba(255,255,255,0.3)' }}>
                <X size={14} />
              </button>
            </div>

            {/* ── Track info ── */}
            <div className="px-4">
              {displayTrack ? (
                <div className="flex items-center gap-3 mb-4">
                  {displayTrack.albumArt ? (
                    <img src={displayTrack.albumArt} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0"
                         style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.5)' }} />
                  ) : (
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
                         style={{ background: 'rgba(29,185,84,0.12)' }}>
                      <Music size={18} style={{ color: '#1db954' }} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate text-white leading-tight">{displayTrack.name}</p>
                    <p className="text-xs truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>{displayTrack.artist}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="w-1.5 h-1.5 rounded-full"
                           style={{ background: displayTrack.isPlaying ? '#1db954' : '#444',
                                    boxShadow: displayTrack.isPlaying ? '0 0 5px #1db954' : 'none' }} />
                      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                        {displayTrack.isPlaying ? 'Playing' : 'Paused'}
                        {isListener && !listeningAlong && displayTrack.previewUrl && ' · preview'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-4 py-2 text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  <Music size={13} />
                  {djUserId ? 'Nothing playing' : 'No music in this room'}
                </div>
              )}

              {/* ── Playback controls (DJ only) ── */}
              {amDj && (
                <div className="flex items-center justify-center gap-5 mb-4">
                  <button onClick={skipPrevious}
                          className="p-1.5 rounded-full transition-all hover:bg-white/10"
                          style={{ color: 'rgba(255,255,255,0.6)' }}>
                    <SkipBack size={18} />
                  </button>
                  <button onClick={togglePlayPause}
                          className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105"
                          style={{ background: '#1db954', color: '#000' }}>
                    {displayTrack?.isPlaying
                      ? <Pause size={16} fill="currentColor" />
                      : <Play  size={16} fill="currentColor" style={{ marginLeft: 2 }} />}
                  </button>
                  <button onClick={skipNext}
                          className="p-1.5 rounded-full transition-all hover:bg-white/10"
                          style={{ color: 'rgba(255,255,255,0.6)' }}>
                    <SkipForward size={18} />
                  </button>
                </div>
              )}

              {/* ── Volume ── */}
              <div className="flex items-center gap-2.5 mb-4">
                <button onClick={toggleMute} className="shrink-0 hover:opacity-70 transition-opacity"
                        style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {muted || volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
                </button>
                <input
                  type="range" min={0} max={100}
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
            </div>

            {/* ── Queue (DJ only) ── */}
            {amDj && (
              <div className="border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                <button
                  onClick={toggleQueue}
                  className="w-full flex items-center justify-between px-4 py-3 text-xs transition-all hover:bg-white/5"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                >
                  <span className="flex items-center gap-1.5">
                    <ListMusic size={12} /> Queue
                    {queue.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px]"
                            style={{ background: 'rgba(255,255,255,0.1)' }}>{queue.length}</span>
                    )}
                  </span>
                  {loadingQueue
                    ? <Loader2 size={12} className="animate-spin" />
                    : <ChevronDown size={12} style={{ transform: showQueue ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />}
                </button>

                <AnimatePresence>
                  {showQueue && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      {queue.length === 0 && !loadingQueue ? (
                        <p className="px-4 pb-3 text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>Queue is empty</p>
                      ) : (
                        <div className="flex flex-col pb-1">
                          {queue.map((item, i) => (
                            <button
                              key={`${item.id}-${i}`}
                              onClick={() => playFromQueue(item.uri)}
                              disabled={!token}
                              className="flex items-center gap-2.5 px-4 py-2 text-left transition-all"
                              style={{
                                cursor: token ? 'pointer' : 'default',
                                opacity: token ? 1 : 0.7,
                              }}
                              onMouseEnter={e => { if (amDj) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)' }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                            >
                              <span className="text-xs shrink-0 w-4 text-right tabular-nums"
                                    style={{ color: 'rgba(255,255,255,0.2)' }}>{i + 1}</span>
                              {item.albumArt ? (
                                <img src={item.albumArt} alt="" className="w-8 h-8 rounded shrink-0 object-cover" />
                              ) : (
                                <div className="w-8 h-8 rounded shrink-0 flex items-center justify-center"
                                     style={{ background: 'rgba(29,185,84,0.1)' }}>
                                  <Music size={10} style={{ color: '#1db954' }} />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium truncate text-white">{item.name}</p>
                                <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>{item.artist}</p>
                              </div>
                              <span className="text-xs shrink-0 tabular-nums"
                                    style={{ color: 'rgba(255,255,255,0.25)' }}>{formatMs(item.durationMs)}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* ── DJ handoff ── */}
            {amDj && handoffPeers.length > 0 && (
              <div className="border-t px-4 py-3" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                <button
                  onClick={() => setShowHandoff(v => !v)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all hover:bg-white/5"
                  style={{ border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}
                >
                  Hand off DJ
                  <ChevronDown size={12} style={{ transform: showHandoff ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                </button>
                <AnimatePresence>
                  {showHandoff && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className="flex flex-col gap-1 mt-1.5">
                        {handoffPeers.map(([peerId, peerName]) => (
                          <button key={peerId} onClick={() => handOffDj(peerId)}
                                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-left transition-all hover:bg-white/5"
                                  style={{ background: 'rgba(29,185,84,0.07)', color: '#b8d4bc' }}>
                            <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                                 style={{ background: 'rgba(29,185,84,0.2)', color: '#1db954' }}>
                              {peerName[0].toUpperCase()}
                            </div>
                            {peerName}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* ── Connect / disconnect ── */}
            <div className="border-t px-4 py-3" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              {token ? (
                <button onClick={disconnect}
                        className="w-full py-2 rounded-xl text-xs font-medium transition-all hover:bg-white/5"
                        style={{ color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  Disconnect Spotify
                </button>
              ) : (
                <>
                  <button onClick={connect} disabled={connecting}
                          className="w-full py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all hover:opacity-90 disabled:opacity-60"
                          style={{ background: '#1db954', color: '#000' }}>
                    {connecting ? <Loader2 size={12} className="animate-spin" /> : <Music size={12} />}
                    {djUserId && djUserId !== userId ? 'Connect to listen along' : 'Connect Spotify'}
                  </button>
                  {djUserId && djUserId !== userId && (
                    <p className="text-center text-xs mt-2" style={{ color: 'rgba(255,255,255,0.2)' }}>
                      Requires Spotify Premium + open Spotify app
                    </p>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
