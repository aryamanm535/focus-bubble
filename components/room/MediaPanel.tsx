'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Mic, MicOff, Video, VideoOff, LayoutGrid, Rows, PhoneOff, Phone, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    // Free TURN for symmetric NAT (Metered)
    {
      urls: [
        'turn:a.relay.metered.ca:80',
        'turn:a.relay.metered.ca:443',
        'turns:a.relay.metered.ca:443',
      ],
      username:   'e499b2b654f1bab9c56d16d8',
      credential: 'YQ1D+6grCjRPNvyX',
    },
  ],
}

const REANNOUNCE_MS = 7_000

interface PeerState {
  peerId:      string
  displayName: string
  stream:      MediaStream | null
  connState:   RTCPeerConnectionState
}

interface Props {
  roomId:      string
  userId:      string
  displayName: string
  mediaMode:   'audio' | 'video'
  channel:     unknown  // kept for API compat — we create our own signaling channel
}

function AudioPlayer({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLAudioElement>(null)
  useEffect(() => {
    if (!ref.current) return
    ref.current.srcObject = stream
    ref.current.play().catch(() => {})
  }, [stream])
  return <audio ref={ref} autoPlay playsInline style={{ display: 'none' }} />
}

function VideoTile({ stream, label, muted = false }: { stream: MediaStream; label: string; muted?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    if (!ref.current) return
    ref.current.srcObject = stream
    ref.current.play().catch(() => {})
  }, [stream])
  return (
    <div className="relative rounded-2xl overflow-hidden aspect-video"
         style={{ background: '#0d0d12', border: '1px solid rgba(255,255,255,0.08)', minWidth: 0 }}>
      <video ref={ref} autoPlay playsInline muted={muted} className="w-full h-full object-cover" />
      <div className="absolute bottom-2 left-2">
        <span className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(0,0,0,0.55)', color: '#fff' }}>{label}</span>
      </div>
    </div>
  )
}

export default function MediaPanel({ roomId, userId, displayName, mediaMode }: Props) {
  const [joined,    setJoined]    = useState(false)
  const [joining,   setJoining]   = useState(false)
  const [camOn,     setCamOn]     = useState(false)
  const [micOn,     setMicOn]     = useState(false)
  const [peers,     setPeers]     = useState<PeerState[]>([])
  const [tileView,  setTileView]  = useState<'compact' | 'expanded'>('compact')
  const [sigStatus, setSigStatus] = useState<'connecting' | 'ready' | 'error'>('connecting')

  const supabase       = useRef(createClient())
  const sigChannel     = useRef<ReturnType<typeof supabase.current.channel> | null>(null)
  const localStream    = useRef<MediaStream | null>(null)
  const pcs            = useRef<Map<string, RTCPeerConnection>>(new Map())
  const joinedRef      = useRef(false)
  const reannounceTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => { joinedRef.current = joined }, [joined])

  // ── Dedicated signaling channel ────────────────────────────────────────────
  useEffect(() => {
    const sb  = supabase.current
    const ch  = sb.channel(`webrtc:${roomId}`, {
      config: { broadcast: { self: false, ack: false } },
    })
    sigChannel.current = ch

    ch.on('broadcast', { event: 'sig' }, ({ payload }) => {
      handleSignal(payload).catch(err => console.error('[webrtc] signal error', err))
    })

    ch.subscribe((status) => {
      console.log('[webrtc] sig channel', status)
      setSigStatus(status === 'SUBSCRIBED' ? 'ready' : status === 'CHANNEL_ERROR' ? 'error' : 'connecting')
    })

    return () => {
      ch.unsubscribe()
      sigChannel.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId])

  // ── Signal sender helper ───────────────────────────────────────────────────
  function sendSig(payload: Record<string, unknown>) {
    console.log('[webrtc] →', payload.type, payload.to ?? 'all')
    sigChannel.current?.send({ type: 'broadcast', event: 'sig', payload })
  }

  // ── Signal dispatcher ──────────────────────────────────────────────────────
  async function handleSignal(payload: Record<string, unknown>) {
    const type = payload.type as string
    const from = payload.from as string
    const to   = payload.to   as string | undefined
    const name = payload.name as string

    if (from === userId) return  // own echo
    console.log('[webrtc] ←', type, 'from', from)

    switch (type) {
      case 'peer_ready': {
        if (!localStream.current) { console.log('[webrtc] peer_ready ignored — not joined yet'); return }
        const existing = pcs.current.get(from)
        if (existing?.connectionState === 'connected') { console.log('[webrtc] already connected to', from); return }
        await initiateOffer(from, name)
        break
      }
      case 'offer': {
        if (to !== userId) return
        const pc = getOrCreatePC(from, name)
        if (pc.signalingState === 'have-local-offer') {
          // Glare: lower userId defers
          if (userId < from) {
            console.log('[webrtc] glare — rolling back')
            await pc.setLocalDescription({ type: 'rollback' } as RTCSessionDescriptionInit)
          } else {
            console.log('[webrtc] glare — we win, ignoring their offer')
            return
          }
        }
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp as RTCSessionDescriptionInit))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        sendSig({ type: 'answer', from: userId, to: from, sdp: pc.localDescription, name: displayName })
        break
      }
      case 'answer': {
        if (to !== userId) return
        const pc = pcs.current.get(from)
        if (!pc) { console.warn('[webrtc] no PC for answer from', from); return }
        if (pc.signalingState !== 'have-local-offer') { console.warn('[webrtc] answer arrived in wrong state', pc.signalingState); return }
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp as RTCSessionDescriptionInit))
        break
      }
      case 'ice': {
        if (to !== userId) return
        const pc = pcs.current.get(from)
        if (pc && payload.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate as RTCIceCandidateInit)).catch(e => console.warn('[webrtc] ICE add failed', e))
        }
        break
      }
      case 'peer_left': {
        removePeer(from)
        break
      }
    }
  }

  async function initiateOffer(peerId: string, peerName: string) {
    console.log('[webrtc] creating offer for', peerId)
    const pc    = getOrCreatePC(peerId, peerName)
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    sendSig({ type: 'offer', from: userId, to: peerId, sdp: pc.localDescription, name: displayName })
  }

  // ── PeerConnection factory ─────────────────────────────────────────────────
  function getOrCreatePC(peerId: string, peerName: string): RTCPeerConnection {
    const existing = pcs.current.get(peerId)
    if (existing && existing.connectionState !== 'failed' && existing.connectionState !== 'closed') return existing
    existing?.close()

    console.log('[webrtc] creating PC for', peerId)
    const pc = new RTCPeerConnection(ICE_CONFIG)
    pcs.current.set(peerId, pc)

    // Add local tracks
    if (localStream.current) {
      localStream.current.getTracks().forEach(t => {
        pc.addTrack(t, localStream.current!)
        console.log('[webrtc] added local track', t.kind, 'for', peerId)
      })
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        sendSig({ type: 'ice', from: userId, to: peerId, candidate: e.candidate.toJSON() })
      } else {
        console.log('[webrtc] ICE gathering complete for', peerId)
      }
    }

    pc.onicegatheringstatechange = () => {
      console.log('[webrtc] ICE gathering state:', pc.iceGatheringState, 'for', peerId)
    }

    pc.oniceconnectionstatechange = () => {
      console.log('[webrtc] ICE connection state:', pc.iceConnectionState, 'for', peerId)
    }

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState
      console.log('[webrtc] connection state:', state, 'for', peerId)
      setPeers(prev => prev.map(p => p.peerId === peerId ? { ...p, connState: state } : p))
      if (state === 'failed' || state === 'closed') removePeer(peerId)
    }

    pc.ontrack = (e) => {
      console.log('[webrtc] ontrack fired for', peerId, 'kind:', e.track.kind, 'streams:', e.streams.length)
      let stream = e.streams[0]
      if (!stream || stream.getTracks().length === 0) stream = new MediaStream([e.track])
      setPeers(prev => {
        const existing = prev.find(p => p.peerId === peerId)
        if (existing) return prev.map(p => p.peerId === peerId ? { ...p, stream, connState: pc.connectionState } : p)
        return [...prev, { peerId, displayName: peerName, stream, connState: pc.connectionState }]
      })
    }

    // Ensure peer appears in list immediately (before tracks arrive)
    setPeers(prev => prev.some(p => p.peerId === peerId) ? prev : [...prev, { peerId, displayName: peerName, stream: null, connState: 'new' }])

    return pc
  }

  function removePeer(peerId: string) {
    console.log('[webrtc] removing peer', peerId)
    pcs.current.get(peerId)?.close()
    pcs.current.delete(peerId)
    setPeers(prev => prev.filter(p => p.peerId !== peerId))
  }

  function announce() {
    sendSig({ type: 'peer_ready', from: userId, name: displayName })
  }

  // ── Join ──────────────────────────────────────────────────────────────────
  async function join() {
    setJoining(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: mediaMode === 'video',
        audio: { echoCancellation: true, noiseSuppression: true },
      })
      console.log('[webrtc] got local stream, tracks:', stream.getTracks().map(t => t.kind))
      localStream.current = stream
      setCamOn(mediaMode === 'video')
      setMicOn(true)
      setJoined(true)
      announce()
      // Re-announce so late joiners can connect
      reannounceTimer.current = setInterval(() => {
        if (joinedRef.current) announce()
      }, REANNOUNCE_MS)
    } catch (err) {
      console.error('[webrtc] getUserMedia failed', err)
      alert('Could not access camera/microphone. Check your browser permissions.')
    }
    setJoining(false)
  }

  function leave() {
    if (reannounceTimer.current) { clearInterval(reannounceTimer.current); reannounceTimer.current = null }
    localStream.current?.getTracks().forEach(t => t.stop())
    localStream.current = null
    pcs.current.forEach(pc => pc.close())
    pcs.current.clear()
    setPeers([])
    setCamOn(false); setMicOn(false); setJoined(false)
    sendSig({ type: 'peer_left', from: userId })
  }

  function toggleMic() {
    if (!localStream.current) return
    const next = !micOn
    localStream.current.getAudioTracks().forEach(t => { t.enabled = next })
    setMicOn(next)
  }

  function toggleCam() {
    if (!localStream.current || mediaMode !== 'video') return
    const next = !camOn
    localStream.current.getVideoTracks().forEach(t => { t.enabled = next })
    setCamOn(next)
  }

  useEffect(() => () => {
    if (reannounceTimer.current) clearInterval(reannounceTimer.current)
    localStream.current?.getTracks().forEach(t => t.stop())
    pcs.current.forEach(pc => pc.close())
  }, [])

  // ── Render ────────────────────────────────────────────────────────────────
  const glass = {
    background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20,
  }

  const connectedPeers = peers.filter(p => p.stream)
  const allStreams = [
    ...(localStream.current && joined ? [{ peerId: userId, displayName: 'You', stream: localStream.current }] : []),
    ...connectedPeers.map(p => ({ peerId: p.peerId, displayName: p.displayName, stream: p.stream! })),
  ]

  if (!joined) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex items-center justify-between gap-3 p-4" style={glass}>
        <div className="flex items-center gap-2">
          {mediaMode === 'video'
            ? <Video size={16} style={{ color: '#9b8dbc' }} />
            : <Mic   size={16} style={{ color: '#9b8dbc' }} />}
          <span className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {mediaMode === 'video' ? 'Camera + mic available' : 'Voice available in this room'}
          </span>
          {sigStatus === 'error' && (
            <span className="flex items-center gap-1 text-xs" style={{ color: '#e8937f' }}>
              <AlertCircle size={11} /> signaling error
            </span>
          )}
        </div>
        <button onClick={join} disabled={joining || sigStatus !== 'ready'}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #7d9e84, #9b8dbc)' }}>
          {joining
            ? <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            : <Phone size={14} />}
          {sigStatus === 'connecting' ? 'Connecting…' : 'Join'}
        </button>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-3 p-4" style={glass}>

      {/* Hidden audio for all peer streams */}
      {peers.filter(p => p.stream).map(p => <AudioPlayer key={p.peerId} stream={p.stream!} />)}

      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {mediaMode === 'video' ? 'Video' : 'Voice'}
          {' · '}{joined ? 1 : 0} + {peers.length} peers
        </span>
        <div className="flex items-center gap-1.5">
          {mediaMode === 'video' && allStreams.length > 1 && (
            <button onClick={() => setTileView(v => v === 'compact' ? 'expanded' : 'compact')}
                    className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {tileView === 'compact' ? <LayoutGrid size={14} /> : <Rows size={14} />}
            </button>
          )}
          <button onClick={toggleMic} className="p-1.5 rounded-lg transition-all"
                  style={{ background: micOn ? 'rgba(125,158,132,0.2)' : 'rgba(200,100,82,0.2)', color: micOn ? '#b8d4bc' : '#e8937f' }}>
            {micOn ? <Mic size={14} /> : <MicOff size={14} />}
          </button>
          {mediaMode === 'video' && (
            <button onClick={toggleCam} className="p-1.5 rounded-lg transition-all"
                    style={{ background: camOn ? 'rgba(125,158,132,0.2)' : 'rgba(200,100,82,0.2)', color: camOn ? '#b8d4bc' : '#e8937f' }}>
              {camOn ? <Video size={14} /> : <VideoOff size={14} />}
            </button>
          )}
          <button onClick={leave} className="p-1.5 rounded-lg hover:bg-red-500/20" style={{ color: '#e8937f' }}>
            <PhoneOff size={14} />
          </button>
        </div>
      </div>

      {/* Peer connection states (non-connected peers) */}
      {peers.filter(p => !p.stream).map(p => (
        <div key={p.peerId} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-xl"
             style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)' }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#9b8dbc', flexShrink: 0 }} />
          Connecting to {p.displayName}… ({p.connState})
        </div>
      ))}

      {/* Video tiles */}
      {mediaMode === 'video' && allStreams.length > 0 && (
        <div className={tileView === 'expanded' ? 'grid gap-2' : 'flex gap-2 overflow-x-auto pb-1'}
             style={tileView === 'expanded' ? { gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' } : {}}>
          {allStreams.map(s => (
            <div key={s.peerId} style={tileView === 'compact' ? { minWidth: 140, flex: '0 0 auto' } : {}}>
              <VideoTile stream={s.stream} label={s.displayName} muted={s.peerId === userId} />
            </div>
          ))}
        </div>
      )}

      {/* Audio mode: show connected peers */}
      {mediaMode === 'audio' && (
        <div className="flex gap-2 flex-wrap">
          {allStreams.map(s => (
            <div key={s.peerId} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs"
                 style={{ background: 'rgba(125,158,132,0.15)', color: '#b8d4bc', border: '1px solid rgba(125,158,132,0.3)' }}>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#7d9e84' }} />
              {s.displayName}
            </div>
          ))}
          {peers.length === 0 && (
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>Waiting for others to join voice…</p>
          )}
        </div>
      )}
    </motion.div>
  )
}
