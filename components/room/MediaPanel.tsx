'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Mic, MicOff, Video, VideoOff, LayoutGrid, Rows, PhoneOff, Phone } from 'lucide-react'
import type { RealtimeChannel } from '@supabase/supabase-js'

// Include TURN so peers behind symmetric NAT can connect
const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp',
      ],
      username:   'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
}

const PEER_READY_INTERVAL_MS = 8_000  // re-announce every 8 s for late joiners

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

// Bug 1 fix: hidden audio element that explicitly calls play()
function AudioPlayer({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLAudioElement>(null)
  useEffect(() => {
    if (!ref.current) return
    ref.current.srcObject = stream
    ref.current.play().catch(() => {})
  }, [stream])
  return <audio ref={ref} autoPlay playsInline style={{ display: 'none' }} />
}

// Bug 2 fix: explicit play() so autoplay policy can't silently block the stream
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
              style={{ background: 'rgba(0,0,0,0.55)', color: '#fff' }}>
          {label}
        </span>
      </div>
    </div>
  )
}

export default function MediaPanel({ roomId, userId, displayName, mediaMode, channel }: Props) {
  const [joined,     setJoined]     = useState(false)
  const [joining,    setJoining]    = useState(false)
  const [camOn,      setCamOn]      = useState(false)
  const [micOn,      setMicOn]      = useState(false)
  const [peerStreams, setPeerStreams] = useState<PeerStream[]>([])
  const [tileView,   setTileView]   = useState<'compact' | 'expanded'>('compact')

  const localStreamRef  = useRef<MediaStream | null>(null)
  const peersRef        = useRef<Map<string, RTCPeerConnection>>(new Map())
  const joinedRef       = useRef(false)
  const announceTimer   = useRef<ReturnType<typeof setInterval> | null>(null)

  // Keep joinedRef in sync for use inside closures
  useEffect(() => { joinedRef.current = joined }, [joined])

  // ── Signaling ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!channel) return
    const ch = channel  // capture non-null ref for use inside async handler

    // Bug 6 fix: track whether this effect instance is still current
    let active = true

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async function handler({ payload }: { payload: any }) {
      if (!active) return
      const { type, from, to, sdp, candidate, name } = payload
      if (from === userId || payload.ns !== 'webrtc') return

      switch (type) {
        case 'peer_ready': {
          // Only respond if we're in voice ourselves
          if (!localStreamRef.current) return
          // Avoid re-connecting to an already-connected peer
          const existing = peersRef.current.get(from)
          if (existing?.connectionState === 'connected') return
          const pc = getOrCreatePC(from, name)
          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)
          ch.send({
            type: 'broadcast', event: 'signal',
            payload: { ns: 'webrtc', type: 'offer', from: userId, to: from, sdp: pc.localDescription, name: displayName },
          })
          break
        }
        case 'offer': {
          if (to !== userId) return
          const pc = getOrCreatePC(from, name)

          // Bug 4 fix: glare — both sides created offers simultaneously
          if (pc.signalingState === 'have-local-offer') {
            if (userId > from) {
              // Our offer wins; ignore theirs — they'll handle the rollback
              return
            }
            // Their offer wins; roll back ours and accept theirs
            await pc.setLocalDescription({ type: 'rollback' } as RTCSessionDescriptionInit)
          }

          await pc.setRemoteDescription(new RTCSessionDescription(sdp))
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          ch.send({
            type: 'broadcast', event: 'signal',
            payload: { ns: 'webrtc', type: 'answer', from: userId, to: from, sdp: pc.localDescription, name: displayName },
          })
          break
        }
        case 'answer': {
          if (to !== userId) return
          const pc = peersRef.current.get(from)
          if (pc && pc.signalingState === 'have-local-offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(sdp))
          }
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

    ch.on('broadcast', { event: 'signal' }, handler)
    return () => { active = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, userId, displayName])

  function getOrCreatePC(peerId: string, peerName: string): RTCPeerConnection {
    const existing = peersRef.current.get(peerId)
    if (existing && existing.connectionState !== 'failed' && existing.connectionState !== 'closed') {
      return existing
    }
    existing?.close()

    const pc = new RTCPeerConnection(ICE_CONFIG)
    peersRef.current.set(peerId, pc)

    localStreamRef.current?.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current!))

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        channel?.send({
          type: 'broadcast', event: 'signal',
          payload: { ns: 'webrtc', type: 'ice', from: userId, to: peerId, candidate: e.candidate.toJSON() },
        })
      }
    }

    pc.ontrack = (e) => {
      // Bug 3 fix: e.streams[0] can be missing; also guard on track presence
      let stream = e.streams[0]
      if (!stream || stream.getTracks().length === 0) {
        stream = new MediaStream([e.track])
      }
      setPeerStreams(prev => [...prev.filter(p => p.peerId !== peerId), { peerId, displayName: peerName, stream }])
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

  function broadcastReady() {
    channel?.send({
      type: 'broadcast', event: 'signal',
      payload: { ns: 'webrtc', type: 'peer_ready', from: userId, name: displayName },
    })
  }

  // ── Join / leave ───────────────────────────────────────────────────────────
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

      // Announce immediately
      broadcastReady()

      // Bug 5 fix: re-announce every 8 s so late joiners can connect
      if (announceTimer.current) clearInterval(announceTimer.current)
      announceTimer.current = setInterval(() => {
        if (joinedRef.current) broadcastReady()
      }, PEER_READY_INTERVAL_MS)
    } catch {
      alert('Could not access camera/microphone. Check your browser permissions.')
    }
    setJoining(false)
  }

  function leave() {
    if (announceTimer.current) { clearInterval(announceTimer.current); announceTimer.current = null }
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    localStreamRef.current = null
    peersRef.current.forEach(pc => pc.close())
    peersRef.current.clear()
    setPeerStreams([])
    setCamOn(false)
    setMicOn(false)
    setJoined(false)
    channel?.send({
      type: 'broadcast', event: 'signal',
      payload: { ns: 'webrtc', type: 'peer_left', from: userId },
    })
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

  useEffect(() => {
    return () => {
      if (announceTimer.current) clearInterval(announceTimer.current)
      localStreamRef.current?.getTracks().forEach(t => t.stop())
      peersRef.current.forEach(pc => pc.close())
      channel?.send({
        type: 'broadcast', event: 'signal',
        payload: { ns: 'webrtc', type: 'peer_left', from: userId },
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const allStreams = [
    ...(localStreamRef.current && joined ? [{ peerId: userId, displayName: 'You', stream: localStreamRef.current }] : []),
    ...peerStreams,
  ]

  const glass = {
    background:    'rgba(0,0,0,0.45)',
    backdropFilter: 'blur(20px)',
    border:        '1px solid rgba(255,255,255,0.1)',
    borderRadius:  20,
  }

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
        </div>
        <button onClick={join} disabled={joining}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #7d9e84, #9b8dbc)' }}>
          {joining
            ? <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            : <Phone size={14} />}
          Join
        </button>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-3 p-4" style={glass}>

      {/* Bug 1 fix: render hidden <audio> for every peer stream (covers audio mode AND audio tracks in video mode) */}
      {peerStreams.map(s => <AudioPlayer key={s.peerId} stream={s.stream} />)}

      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {mediaMode === 'video' ? 'Video' : 'Voice'} · {allStreams.length} connected
        </span>
        <div className="flex items-center gap-1.5">
          {mediaMode === 'video' && allStreams.length > 0 && (
            <button onClick={() => setTileView(v => v === 'compact' ? 'expanded' : 'compact')}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-all"
                    style={{ color: 'rgba(255,255,255,0.5)' }}>
              {tileView === 'compact' ? <LayoutGrid size={14} /> : <Rows size={14} />}
            </button>
          )}
          <button onClick={toggleMic}
                  className="p-1.5 rounded-lg transition-all"
                  style={{ background: micOn ? 'rgba(125,158,132,0.2)' : 'rgba(200,100,82,0.2)', color: micOn ? '#b8d4bc' : '#e8937f' }}>
            {micOn ? <Mic size={14} /> : <MicOff size={14} />}
          </button>
          {mediaMode === 'video' && (
            <button onClick={toggleCam}
                    className="p-1.5 rounded-lg transition-all"
                    style={{ background: camOn ? 'rgba(125,158,132,0.2)' : 'rgba(200,100,82,0.2)', color: camOn ? '#b8d4bc' : '#e8937f' }}>
              {camOn ? <Video size={14} /> : <VideoOff size={14} />}
            </button>
          )}
          <button onClick={leave}
                  className="p-1.5 rounded-lg hover:bg-red-500/20 transition-all"
                  style={{ color: '#e8937f' }}>
            <PhoneOff size={14} />
          </button>
        </div>
      </div>

      {/* Video tiles */}
      {mediaMode === 'video' && allStreams.length > 0 && (
        <div
          className={tileView === 'expanded' ? 'grid gap-2' : 'flex gap-2 overflow-x-auto pb-1'}
          style={tileView === 'expanded' ? { gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' } : {}}
        >
          {allStreams.map(s => (
            <div key={s.peerId} style={tileView === 'compact' ? { minWidth: 140, flex: '0 0 auto' } : {}}>
              <VideoTile stream={s.stream} label={s.displayName} muted={s.peerId === userId} />
            </div>
          ))}
        </div>
      )}

      {/* Audio mode: show who's connected (audio plays via hidden <audio> elements above) */}
      {mediaMode === 'audio' && (
        <div className="flex gap-2 flex-wrap">
          {allStreams.map(s => (
            <div key={s.peerId}
                 className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs"
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
