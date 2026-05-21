'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Video, VideoOff, LayoutGrid, Rows, PhoneOff, Phone } from 'lucide-react'
import type { RealtimeChannel } from '@supabase/supabase-js'

const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
}

interface PeerStream {
  peerId:      string
  displayName: string
  stream:      MediaStream
}

interface Props {
  roomId:       string
  userId:       string
  displayName:  string
  mediaMode:    'audio' | 'video'
  channel:      RealtimeChannel | null
}

function VideoTile({ stream, label, muted = false }: { stream: MediaStream; label: string; muted?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream
  }, [stream])

  return (
    <div className="relative rounded-2xl overflow-hidden aspect-video"
         style={{ background: '#0d0d12', border: '1px solid rgba(255,255,255,0.08)', minWidth: 0 }}>
      <video ref={videoRef} autoPlay playsInline muted={muted}
             className="w-full h-full object-cover" />
      <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between">
        <span className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(0,0,0,0.55)', color: '#fff' }}>
          {label}
        </span>
      </div>
    </div>
  )
}

export default function MediaPanel({ roomId, userId, displayName, mediaMode, channel }: Props) {
  const [joined,      setJoined]      = useState(false)
  const [joining,     setJoining]     = useState(false)
  const [camOn,       setCamOn]       = useState(false)
  const [micOn,       setMicOn]       = useState(false)
  const [peerStreams,  setPeerStreams]  = useState<PeerStream[]>([])
  const [tileView,    setTileView]    = useState<'compact' | 'expanded'>('compact')

  const localStreamRef = useRef<MediaStream | null>(null)
  const peersRef       = useRef<Map<string, RTCPeerConnection>>(new Map())

  // ── Signaling ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!channel) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = async ({ payload }: { payload: any }) => {
      const { type, from, to, sdp, candidate, name } = payload
      if (from === userId || payload.ns !== 'webrtc') return

      switch (type) {
        case 'peer_ready': {
          if (!localStreamRef.current) return
          const pc = getOrCreatePC(from, name)
          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)
          channel.send({ type: 'broadcast', event: 'signal', payload: { ns: 'webrtc', type: 'offer', from: userId, to: from, sdp: pc.localDescription, name: displayName } })
          break
        }
        case 'offer': {
          if (to !== userId) return
          const pc = getOrCreatePC(from, name)
          await pc.setRemoteDescription(new RTCSessionDescription(sdp))
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          channel.send({ type: 'broadcast', event: 'signal', payload: { ns: 'webrtc', type: 'answer', from: userId, to: from, sdp: pc.localDescription, name: displayName } })
          break
        }
        case 'answer': {
          if (to !== userId) return
          const pc = peersRef.current.get(from)
          if (pc) await pc.setRemoteDescription(new RTCSessionDescription(sdp))
          break
        }
        case 'ice': {
          if (to !== userId) return
          const pc = peersRef.current.get(from)
          if (pc && candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {})
          break
        }
        case 'peer_left': {
          removePeer(from)
          break
        }
      }
    }

    channel.on('broadcast', { event: 'signal' }, handler)
    // no cleanup needed — channel is managed by parent
  }, [channel, userId, displayName])

  function getOrCreatePC(peerId: string, peerName: string): RTCPeerConnection {
    if (peersRef.current.has(peerId)) {
      const existing = peersRef.current.get(peerId)!
      if (existing.connectionState !== 'failed' && existing.connectionState !== 'closed') return existing
      existing.close()
    }

    const pc = new RTCPeerConnection(ICE_CONFIG)
    peersRef.current.set(peerId, pc)

    // Add local tracks to this connection
    localStreamRef.current?.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current!))

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        channel?.send({ type: 'broadcast', event: 'signal', payload: { ns: 'webrtc', type: 'ice', from: userId, to: peerId, candidate: e.candidate.toJSON() } })
      }
    }

    pc.ontrack = (e) => {
      const stream = e.streams[0]
      if (!stream) return
      setPeerStreams(prev => {
        const filtered = prev.filter(p => p.peerId !== peerId)
        return [...filtered, { peerId, displayName: peerName, stream }]
      })
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') removePeer(peerId)
    }

    return pc
  }

  function removePeer(peerId: string) {
    peersRef.current.get(peerId)?.close()
    peersRef.current.delete(peerId)
    setPeerStreams(prev => prev.filter(p => p.peerId !== peerId))
  }

  // ── Join / leave ──────────────────────────────────────────────────────────
  async function join() {
    setJoining(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: mediaMode === 'video',
        audio: true,
      })
      localStreamRef.current = stream
      setCamOn(mediaMode === 'video')
      setMicOn(true)
      setJoined(true)

      channel?.send({ type: 'broadcast', event: 'signal', payload: { ns: 'webrtc', type: 'peer_ready', from: userId, name: displayName } })
    } catch {
      alert('Could not access camera/microphone. Check your browser permissions.')
    }
    setJoining(false)
  }

  function leave() {
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    localStreamRef.current = null
    peersRef.current.forEach(pc => pc.close())
    peersRef.current.clear()
    setPeerStreams([])
    setCamOn(false)
    setMicOn(false)
    setJoined(false)
    channel?.send({ type: 'broadcast', event: 'signal', payload: { ns: 'webrtc', type: 'peer_left', from: userId } })
  }

  function toggleMic() {
    if (!localStreamRef.current) return
    const enabled = !micOn
    localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = enabled })
    setMicOn(enabled)
  }

  function toggleCam() {
    if (!localStreamRef.current || mediaMode !== 'video') return
    const enabled = !camOn
    localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = enabled })
    setCamOn(enabled)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach(t => t.stop())
      peersRef.current.forEach(pc => pc.close())
      channel?.send({ type: 'broadcast', event: 'signal', payload: { ns: 'webrtc', type: 'peer_left', from: userId } })
    }
  }, [])

  const allStreams = [
    ...(localStreamRef.current && joined ? [{ peerId: userId, displayName: 'You', stream: localStreamRef.current }] : []),
    ...peerStreams,
  ]

  const glass = {
    background: 'rgba(0,0,0,0.45)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 20,
  }

  if (!joined) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex items-center justify-between gap-3 p-4"
                  style={glass}>
        <div className="flex items-center gap-2">
          {mediaMode === 'video' ? <Video size={16} style={{ color: '#9b8dbc' }} /> : <Mic size={16} style={{ color: '#9b8dbc' }} />}
          <span className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {mediaMode === 'video' ? 'Camera + mic available' : 'Voice available in this room'}
          </span>
        </div>
        <button onClick={join} disabled={joining}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #7d9e84, #9b8dbc)' }}>
          {joining ? <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                   : <Phone size={14} />}
          Join
        </button>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-3 p-4" style={glass}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {mediaMode === 'video' ? '📹 Video' : '🎙️ Voice'} · {allStreams.length} connected
        </span>
        <div className="flex items-center gap-1.5">
          {/* View toggle */}
          {mediaMode === 'video' && allStreams.length > 0 && (
            <button onClick={() => setTileView(v => v === 'compact' ? 'expanded' : 'compact')}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-all"
                    style={{ color: 'rgba(255,255,255,0.5)' }}>
              {tileView === 'compact' ? <LayoutGrid size={14} /> : <Rows size={14} />}
            </button>
          )}
          {/* Mic toggle */}
          <button onClick={toggleMic}
                  className="p-1.5 rounded-lg transition-all"
                  style={{
                    background: micOn ? 'rgba(125,158,132,0.2)' : 'rgba(200,100,82,0.2)',
                    color: micOn ? '#b8d4bc' : '#e8937f',
                  }}>
            {micOn ? <Mic size={14} /> : <MicOff size={14} />}
          </button>
          {/* Cam toggle (video only) */}
          {mediaMode === 'video' && (
            <button onClick={toggleCam}
                    className="p-1.5 rounded-lg transition-all"
                    style={{
                      background: camOn ? 'rgba(125,158,132,0.2)' : 'rgba(200,100,82,0.2)',
                      color: camOn ? '#b8d4bc' : '#e8937f',
                    }}>
              {camOn ? <Video size={14} /> : <VideoOff size={14} />}
            </button>
          )}
          {/* Leave */}
          <button onClick={leave}
                  className="p-1.5 rounded-lg hover:bg-red-500/20 transition-all"
                  style={{ color: '#e8937f' }}>
            <PhoneOff size={14} />
          </button>
        </div>
      </div>

      {/* Video tiles (video mode only) */}
      {mediaMode === 'video' && allStreams.length > 0 && (
        <div className={tileView === 'expanded'
          ? 'grid gap-2'
          : 'flex gap-2 overflow-x-auto pb-1'}
          style={tileView === 'expanded' ? { gridTemplateColumns: `repeat(auto-fill, minmax(160px, 1fr))` } : {}}>
          {allStreams.map(s => (
            <div key={s.peerId}
                 style={tileView === 'compact' ? { minWidth: 140, flex: '0 0 auto' } : {}}>
              <VideoTile stream={s.stream} label={s.displayName} muted={s.peerId === userId} />
            </div>
          ))}
        </div>
      )}

      {/* Audio mode: just show connected avatars */}
      {mediaMode === 'audio' && (
        <div className="flex gap-2 flex-wrap">
          {allStreams.map(s => (
            <div key={s.peerId} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs"
                 style={{ background: 'rgba(125,158,132,0.15)', color: '#b8d4bc', border: '1px solid rgba(125,158,132,0.3)' }}>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#7d9e84' }} />
              {s.displayName}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}
