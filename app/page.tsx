'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Users,
  Timer,
  Music2,
  Video,
  MessageSquare,
  Flame,
  ArrowRight,
  Circle,
} from 'lucide-react'

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const FEATURES = [
  {
    icon: Users,
    title: 'Live Focus Rooms',
    desc: "Join public or private rooms and study side-by-side with others in real time. See who's locked in.",
    accent: '#7d9e84',
    large: true,
    visual: 'rooms',
  },
  {
    icon: Timer,
    title: 'Synced Pomodoro',
    desc: 'The whole room enters focus and break together — powerful social synchronisation.',
    accent: '#9b8dbc',
    large: true,
    visual: 'timer',
  },
  {
    icon: Music2,
    title: 'Spotify DJ Mode',
    desc: 'One person queues, everyone listens. Shared music builds real ambience.',
    accent: '#c86452',
    large: false,
    visual: 'music',
  },
  {
    icon: Video,
    title: 'Voice & Video',
    desc: 'Optional face-cam grid so your room feels like a real study hall.',
    accent: '#7d9e84',
    large: false,
    visual: 'video',
  },
  {
    icon: MessageSquare,
    title: 'Text Chat',
    desc: 'Quick check-ins between Pomodoros without breaking your flow.',
    accent: '#9b8dbc',
    large: false,
    visual: 'chat',
  },
  {
    icon: Flame,
    title: 'Presence & Streaks',
    desc: 'Daily streaks, consistency tracking, and friend rankings to keep you returning.',
    accent: '#c86452',
    large: false,
    visual: 'streaks',
  },
] as const

const STEPS = [
  {
    n: '1',
    title: 'Create or join a room',
    desc: 'Public rooms are open to everyone. Private rooms use a shareable invite link.',
  },
  {
    n: '2',
    title: 'Declare your task',
    desc: 'Tell the room what you\'re working on. Accountability starts the moment you type it.',
  },
  {
    n: '3',
    title: 'Lock in together',
    desc: 'The Pomodoro syncs for the whole room. Break together, grind together.',
  },
]

const ENVIRONMENTS = [
  {
    name: 'Rainy Café',
    mood: 'Warm & cozy',
    from: '#b07d4a',
    to: '#7a4f2e',
    visual: 'rain',
  },
  {
    name: 'Library',
    mood: 'Quiet focus',
    from: '#5c7e63',
    to: '#3f5c44',
    visual: 'books',
  },
  {
    name: 'Coding Den',
    mood: 'Night mode',
    from: '#4a3d7a',
    to: '#1a1530',
    visual: 'code',
  },
  {
    name: 'Nature',
    mood: 'Calm & clear',
    from: '#4e7c5a',
    to: '#2c5038',
    visual: 'leaf',
  },
]

const TESTIMONIALS = [
  {
    initials: 'MK',
    name: 'Maya K.',
    school: 'UT Austin',
    text: 'The "8 PM study room" with my friends is non-negotiable now. I\'ve never been this consistent.',
    accent: '#7d9e84',
  },
  {
    initials: 'DP',
    name: 'Dev P.',
    school: 'UC Berkeley',
    text: 'Better than any Pomodoro app because the social pressure actually keeps me off my phone.',
    accent: '#9b8dbc',
  },
  {
    initials: 'PS',
    name: 'Priya S.',
    school: 'NYU',
    text: 'The ambient scenes make such a difference. Rainy Café hits different at midnight.',
    accent: '#c86452',
  },
]

// ─────────────────────────────────────────────
// Animation variants
// ─────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.08,
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  }),
}

const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.6 } },
}

// ─────────────────────────────────────────────
// Small sub-components
// ─────────────────────────────────────────────

function FeatureVisual({ kind, accent }: { kind: string; accent: string }) {
  if (kind === 'rooms') {
    return (
      <div className="absolute bottom-5 right-5 flex flex-wrap gap-1.5 w-28">
        {['A', 'B', 'C', 'D', 'E', 'F'].map((l) => (
          <div
            key={l}
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: `${accent}30`, color: accent, border: `1px solid ${accent}50` }}
          >
            {l}
          </div>
        ))}
      </div>
    )
  }
  if (kind === 'timer') {
    return (
      <div
        className="absolute bottom-5 right-5 flex flex-col items-center gap-1 p-3 rounded-xl"
        style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}
      >
        <div className="text-2xl font-bold tabular-nums" style={{ color: accent, fontFamily: 'monospace' }}>
          24:58
        </div>
        <div className="text-xs" style={{ color: `${accent}99` }}>
          focus mode
        </div>
        <div className="flex gap-1 mt-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: i < 3 ? accent : `${accent}30` }}
            />
          ))}
        </div>
      </div>
    )
  }
  if (kind === 'music') {
    return (
      <div className="absolute bottom-4 right-4 flex items-end gap-0.5">
        {[3, 6, 4, 8, 5, 7, 3].map((h, i) => (
          <div
            key={i}
            className="w-1.5 rounded-t-sm"
            style={{
              height: h * 3,
              background: accent,
              opacity: i === 3 ? 1 : 0.4,
            }}
          />
        ))}
      </div>
    )
  }
  if (kind === 'video') {
    return (
      <div className="absolute bottom-4 right-4 grid grid-cols-2 gap-1">
        {['#7d9e8440', '#9b8dbc40', '#c8645240', '#7d9e8440'].map((bg, i) => (
          <div key={i} className="w-7 h-5 rounded" style={{ background: bg }} />
        ))}
      </div>
    )
  }
  if (kind === 'chat') {
    return (
      <div className="absolute bottom-4 right-4 flex flex-col gap-1 w-24">
        <div className="h-2 rounded-full" style={{ background: `${accent}30`, width: '70%' }} />
        <div className="h-2 rounded-full self-end" style={{ background: `${accent}50`, width: '55%' }} />
        <div className="h-2 rounded-full" style={{ background: `${accent}30`, width: '80%' }} />
      </div>
    )
  }
  if (kind === 'streaks') {
    return (
      <div className="absolute bottom-4 right-4 flex gap-1 items-end">
        {[2, 4, 3, 5, 4, 6, 5].map((h, i) => (
          <div
            key={i}
            className="w-2 rounded-sm"
            style={{
              height: h * 4,
              background: i === 6 ? accent : `${accent}40`,
            }}
          />
        ))}
      </div>
    )
  }
  return null
}

function EnvVisual({ kind }: { kind: string }) {
  if (kind === 'rain') {
    return (
      <div className="absolute inset-0 overflow-hidden opacity-30 pointer-events-none">
        {[15, 32, 52, 68, 83].map((l, i) => (
          <div
            key={i}
            className="absolute w-px bg-white/80 rounded"
            style={{
              left: `${l}%`,
              top: '-10%',
              height: '30%',
              transform: 'rotate(15deg)',
              animation: `rain-fall ${1.2 + i * 0.3}s linear infinite`,
              animationDelay: `${i * 0.25}s`,
            }}
          />
        ))}
      </div>
    )
  }
  if (kind === 'books') {
    return (
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex items-end gap-0.5 opacity-40">
        {[28, 36, 24, 40, 30, 34].map((h, i) => (
          <div
            key={i}
            className="w-3 rounded-t-sm"
            style={{
              height: h,
              background: ['#d4c4a0', '#a8c4a0', '#c4a0a0', '#a0b4c4', '#c4b0a0', '#b4a0c4'][i],
            }}
          />
        ))}
      </div>
    )
  }
  if (kind === 'code') {
    return (
      <div
        className="absolute inset-0 flex items-center justify-center opacity-30 select-none pointer-events-none"
        style={{ fontFamily: 'monospace', fontSize: 28, color: '#a0c4ff', fontWeight: 700 }}
      >
        {'{ }'}
      </div>
    )
  }
  if (kind === 'leaf') {
    return (
      <div className="absolute bottom-4 right-4 opacity-40">
        <div
          className="w-10 h-10"
          style={{
            background: '#a0d4a0',
            borderRadius: '0% 60% 0% 60%',
            transform: 'rotate(-20deg)',
          }}
        />
      </div>
    )
  }
  return null
}

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: '#070510', color: '#f0edf8' }}>

      {/* ══════════════════════════════════════════
          NAV
      ══════════════════════════════════════════ */}
      <nav
        className="sticky top-0 z-50 flex items-center justify-between px-6 py-4"
        style={{
          background: 'rgba(7,5,16,0.80)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(155,141,188,0.12)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <span
            className="text-xl leading-none select-none"
            aria-hidden="true"
          >
            🫧
          </span>
          <span
            className="text-lg font-semibold tracking-tight"
            style={{ fontFamily: 'Lora, Georgia, serif', color: '#f0edf8' }}
          >
            Focus Bubble
          </span>
        </div>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-6 text-sm" style={{ color: 'rgba(240,237,248,0.55)' }}>
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#how" className="hover:text-white transition-colors">How it works</a>
          <a href="#environments" className="hover:text-white transition-colors">Environments</a>
        </div>

        {/* CTAs */}
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden sm:block px-4 py-2 text-sm font-medium rounded-full transition-colors hover:bg-white/8"
            style={{ color: 'rgba(240,237,248,0.65)' }}
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="px-5 py-2 text-sm font-semibold rounded-full transition-all hover:opacity-90 hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg, #7d9e84 0%, #9b8dbc 100%)', color: '#fff' }}
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* ══════════════════════════════════════════
          HERO
      ══════════════════════════════════════════ */}
      <section
        className="relative flex flex-col items-center text-center px-6 pt-24 pb-0 overflow-hidden"
        style={{ background: '#070510' }}
      >
        {/* Glow orbs */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: '-10%',
            left: '20%',
            width: 560,
            height: 560,
            background: 'radial-gradient(circle, rgba(125,158,132,0.22) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        <div
          className="absolute pointer-events-none"
          style={{
            top: '5%',
            right: '10%',
            width: 480,
            height: 480,
            background: 'radial-gradient(circle, rgba(155,141,188,0.20) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        <div
          className="absolute pointer-events-none"
          style={{
            top: '30%',
            left: '5%',
            width: 320,
            height: 320,
            background: 'radial-gradient(circle, rgba(200,100,82,0.12) 0%, transparent 70%)',
            filter: 'blur(50px)',
          }}
        />

        {/* Headline copy */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 max-w-4xl"
        >
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide mb-8"
            style={{
              background: 'rgba(125,158,132,0.12)',
              border: '1px solid rgba(125,158,132,0.30)',
              color: '#7d9e84',
              letterSpacing: '0.05em',
            }}
          >
            <Circle size={6} fill="#7d9e84" strokeWidth={0} />
            LIVE STUDY SESSIONS HAPPENING NOW
          </div>

          <h1
            className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.08] mb-6 tracking-tight"
            style={{ fontFamily: 'Lora, Georgia, serif', color: '#f0edf8' }}
          >
            Deep work is better
            <br />
            <span
              style={{
                background: 'linear-gradient(135deg, #7d9e84 0%, #9b8dbc 55%, #c86452 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              when you're not alone.
            </span>
          </h1>

          <p
            className="text-base sm:text-lg leading-relaxed mb-10 max-w-xl mx-auto"
            style={{ color: 'rgba(240,237,248,0.55)' }}
          >
            Join live focus rooms, sync your Pomodoro with real people, and
            get more done than you ever would by yourself.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-sm font-semibold text-white transition-all hover:opacity-90 hover:scale-[1.02] hover:shadow-2xl"
              style={{ background: 'linear-gradient(135deg, #7d9e84 0%, #9b8dbc 100%)' }}
            >
              Start for free
              <ArrowRight size={15} />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-sm font-semibold transition-all hover:bg-white/8"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.10)',
                color: 'rgba(240,237,248,0.75)',
              }}
            >
              Browse rooms
            </Link>
          </div>

          <p className="mt-5 text-xs" style={{ color: 'rgba(240,237,248,0.28)' }}>
            No credit card required · Free to join rooms
          </p>
        </motion.div>

        {/* ── Browser Mockup ── */}
        <motion.div
          initial={{ opacity: 0, y: 56, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 w-full max-w-4xl mt-16"
          style={{ perspective: 1000 }}
        >
          {/* Glow behind mockup */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse 80% 50% at 50% 60%, rgba(155,141,188,0.18) 0%, transparent 70%)',
              filter: 'blur(30px)',
              transform: 'translateY(30px)',
            }}
          />

          {/* Browser chrome */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              border: '1px solid rgba(255,255,255,0.09)',
              background: '#0f0d1a',
              boxShadow: '0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
            }}
          >
            {/* Title bar */}
            <div
              className="flex items-center gap-3 px-4 py-3"
              style={{
                background: '#0a0818',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {/* Traffic lights */}
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ background: '#ff5f57' }} />
                <div className="w-3 h-3 rounded-full" style={{ background: '#febc2e' }} />
                <div className="w-3 h-3 rounded-full" style={{ background: '#28c840' }} />
              </div>
              {/* URL bar */}
              <div
                className="flex-1 mx-4 px-3 py-1 rounded-md text-xs text-center"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  color: 'rgba(240,237,248,0.35)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  maxWidth: 240,
                  marginLeft: 'auto',
                  marginRight: 'auto',
                }}
              >
                focusbubble.app/rooms/evening-grind
              </div>
              <div className="w-14" />
            </div>

            {/* App UI */}
            <div className="flex" style={{ height: 440 }}>
              {/* Sidebar */}
              <div
                className="flex flex-col gap-0 py-4 px-3"
                style={{
                  width: 200,
                  background: '#0c0a19',
                  borderRight: '1px solid rgba(255,255,255,0.05)',
                  flexShrink: 0,
                }}
              >
                {/* Room name */}
                <div className="px-2 mb-4">
                  <div className="text-xs font-semibold mb-1" style={{ color: 'rgba(240,237,248,0.35)', letterSpacing: '0.08em' }}>ACTIVE ROOM</div>
                  <div className="text-sm font-semibold" style={{ color: '#f0edf8' }}>Evening Grind</div>
                  <div className="text-xs mt-0.5" style={{ color: '#7d9e84' }}>● 6 members online</div>
                </div>

                {/* Pomodoro display */}
                <div
                  className="mx-2 mb-5 p-3 rounded-xl text-center"
                  style={{ background: 'rgba(155,141,188,0.10)', border: '1px solid rgba(155,141,188,0.18)' }}
                >
                  <div className="text-2xl font-bold tabular-nums" style={{ fontFamily: 'monospace', color: '#c4b8e0' }}>
                    25:00
                  </div>
                  <div className="text-xs mt-1" style={{ color: 'rgba(196,184,224,0.55)' }}>focus session</div>
                  <div
                    className="mt-2 py-1 px-3 rounded-full text-xs font-semibold mx-auto w-fit"
                    style={{ background: '#7d9e84', color: '#fff' }}
                  >
                    Start
                  </div>
                </div>

                {/* Member list */}
                <div className="px-2">
                  <div className="text-xs mb-2 font-semibold" style={{ color: 'rgba(240,237,248,0.28)', letterSpacing: '0.08em' }}>MEMBERS</div>
                  {[
                    { initials: 'MK', task: 'Linear algebra hw', color: '#7d9e84' },
                    { initials: 'DP', task: 'CS project', color: '#9b8dbc' },
                    { initials: 'PS', task: 'Essay draft', color: '#c86452' },
                    { initials: 'JL', task: 'Reading + notes', color: '#7d9e84' },
                    { initials: 'AR', task: 'Side project', color: '#9b8dbc' },
                    { initials: 'TC', task: 'Job applications', color: '#c86452' },
                  ].map((m) => (
                    <div key={m.initials} className="flex items-center gap-2 py-1.5">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ background: `${m.color}25`, color: m.color, border: `1px solid ${m.color}40` }}
                      >
                        {m.initials}
                      </div>
                      <div className="text-xs truncate" style={{ color: 'rgba(240,237,248,0.5)' }}>{m.task}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Main area */}
              <div className="flex-1 flex flex-col" style={{ background: '#0f0d1a' }}>
                {/* Top bar */}
                <div
                  className="flex items-center justify-between px-5 py-3"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <div className="text-sm font-medium" style={{ color: 'rgba(240,237,248,0.6)' }}>Evening Grind · Rainy Café</div>
                  <div className="flex items-center gap-2">
                    <div
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
                      style={{ background: 'rgba(125,158,132,0.12)', color: '#7d9e84', border: '1px solid rgba(125,158,132,0.2)' }}
                    >
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#7d9e84' }} />
                      Live
                    </div>
                  </div>
                </div>

                {/* Avatar grid */}
                <div className="flex-1 grid grid-cols-3 gap-3 p-5">
                  {[
                    { initials: 'MK', color: '#7d9e84', name: 'Maya K.', status: 'locked in' },
                    { initials: 'DP', color: '#9b8dbc', name: 'Dev P.', status: 'locked in' },
                    { initials: 'PS', color: '#c86452', name: 'Priya S.', status: 'on break' },
                    { initials: 'JL', color: '#7d9e84', name: 'Jake L.', status: 'locked in' },
                    { initials: 'AR', color: '#9b8dbc', name: 'Ari R.', status: 'locked in' },
                    { initials: 'TC', color: '#c86452', name: 'Tara C.', status: 'locked in' },
                  ].map((u) => (
                    <div
                      key={u.initials}
                      className="flex flex-col items-center justify-center gap-2 rounded-xl py-4"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.055)',
                      }}
                    >
                      {/* Avatar bubble */}
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold"
                        style={{
                          background: `${u.color}20`,
                          color: u.color,
                          border: `2px solid ${u.color}50`,
                          boxShadow: `0 0 16px ${u.color}30`,
                        }}
                      >
                        {u.initials}
                      </div>
                      <div className="text-xs font-medium" style={{ color: 'rgba(240,237,248,0.7)' }}>{u.name}</div>
                      <div
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          background: u.status === 'locked in' ? 'rgba(125,158,132,0.15)' : 'rgba(200,100,82,0.12)',
                          color: u.status === 'locked in' ? '#7d9e84' : '#c86452',
                        }}
                      >
                        {u.status}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Ambient bar at bottom */}
                <div
                  className="px-5 py-3 flex items-center justify-between"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <div className="flex items-center gap-2 text-xs" style={{ color: 'rgba(240,237,248,0.35)' }}>
                    <Music2 size={12} />
                    <span>lo-fi hip hop · chill beats</span>
                  </div>
                  <div className="flex items-end gap-0.5">
                    {[3, 5, 4, 7, 5, 6, 4].map((h, i) => (
                      <div
                        key={i}
                        className="w-1 rounded-t-sm"
                        style={{
                          height: h * 2.5,
                          background: i === 3 ? '#9b8dbc' : 'rgba(155,141,188,0.25)',
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Gradient fade into next section */}
        <div
          className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, transparent, #070510)',
          }}
        />
      </section>

      {/* ══════════════════════════════════════════
          FEATURES BENTO GRID
      ══════════════════════════════════════════ */}
      <section id="features" className="px-6 py-28" style={{ background: '#070510' }}>
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            className="text-center mb-16"
          >
            <motion.p
              variants={fadeUp}
              custom={0}
              className="text-xs font-semibold tracking-widest mb-4"
              style={{ color: '#7d9e84', letterSpacing: '0.12em' }}
            >
              EVERYTHING YOU NEED
            </motion.p>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="text-4xl sm:text-5xl font-bold mb-4 tracking-tight"
              style={{ fontFamily: 'Lora, Georgia, serif', color: '#f0edf8' }}
            >
              Built for serious focus.
            </motion.h2>
            <motion.p
              variants={fadeUp}
              custom={2}
              className="text-base max-w-lg mx-auto"
              style={{ color: 'rgba(240,237,248,0.45)' }}
            >
              Not a productivity app. A social deep-work platform.
            </motion.p>
          </motion.div>

          {/* Bento grid — 2 large + 4 small */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[200px]">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ delay: i * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className={`relative overflow-hidden rounded-2xl p-5 flex flex-col ${
                  f.large ? 'sm:col-span-2 lg:col-span-2 lg:row-span-2' : ''
                }`}
                style={{
                  background: '#0f0d1a',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {/* Icon */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: `${f.accent}18`, border: `1px solid ${f.accent}25` }}
                >
                  <f.icon size={16} style={{ color: f.accent }} />
                </div>
                {/* Text */}
                <h3
                  className="font-semibold text-base mb-2 leading-snug"
                  style={{ color: '#f0edf8', fontFamily: f.large ? 'Lora, Georgia, serif' : 'inherit', fontSize: f.large ? '1.2rem' : undefined }}
                >
                  {f.title}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: 'rgba(240,237,248,0.45)' }}
                >
                  {f.desc}
                </p>
                {/* Abstract visual */}
                <FeatureVisual kind={f.visual} accent={f.accent} />
                {/* Subtle gradient bottom glow */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none"
                  style={{
                    background: `linear-gradient(to top, ${f.accent}08, transparent)`,
                  }}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════ */}
      <section id="how" className="px-6 py-28" style={{ background: '#0a0818' }}>
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            className="text-center mb-20"
          >
            <motion.p
              variants={fadeUp}
              custom={0}
              className="text-xs font-semibold tracking-widest mb-4"
              style={{ color: '#9b8dbc', letterSpacing: '0.12em' }}
            >
              THREE STEPS
            </motion.p>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="text-4xl sm:text-5xl font-bold tracking-tight"
              style={{ fontFamily: 'Lora, Georgia, serif', color: '#f0edf8' }}
            >
              How it works
            </motion.h2>
          </motion.div>

          {/* Steps with connecting lines */}
          <div className="relative flex flex-col sm:flex-row gap-12 sm:gap-0 justify-between items-start">
            {/* Connecting line (desktop) */}
            <div
              className="hidden sm:block absolute top-6 left-[16%] right-[16%]"
              style={{ height: 1, background: 'linear-gradient(to right, rgba(125,158,132,0.5), rgba(155,141,188,0.5), rgba(200,100,82,0.5))' }}
            />

            {STEPS.map((step, i) => (
              <motion.div
                key={step.n}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className="relative flex flex-col items-center text-center sm:w-1/3"
              >
                {/* Number circle */}
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold mb-5 relative z-10"
                  style={{
                    background: '#0a0818',
                    border: '1.5px solid',
                    borderColor: ['#7d9e84', '#9b8dbc', '#c86452'][i],
                    color: ['#7d9e84', '#9b8dbc', '#c86452'][i],
                    boxShadow: `0 0 20px ${['rgba(125,158,132,0.25)', 'rgba(155,141,188,0.25)', 'rgba(200,100,82,0.25)'][i]}`,
                  }}
                >
                  {step.n}
                </div>
                <h3
                  className="font-semibold text-base mb-2"
                  style={{ color: '#f0edf8' }}
                >
                  {step.title}
                </h3>
                <p
                  className="text-sm leading-relaxed max-w-[200px]"
                  style={{ color: 'rgba(240,237,248,0.45)' }}
                >
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          ENVIRONMENTS SHOWCASE
      ══════════════════════════════════════════ */}
      <section id="environments" className="px-6 py-28" style={{ background: '#070510' }}>
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            className="text-center mb-16"
          >
            <motion.p
              variants={fadeUp}
              custom={0}
              className="text-xs font-semibold tracking-widest mb-4"
              style={{ color: '#c86452', letterSpacing: '0.12em' }}
            >
              AMBIENT ENVIRONMENTS
            </motion.p>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="text-4xl sm:text-5xl font-bold tracking-tight"
              style={{ fontFamily: 'Lora, Georgia, serif', color: '#f0edf8' }}
            >
              Set the scene.
            </motion.h2>
            <motion.p
              variants={fadeUp}
              custom={2}
              className="text-base mt-4 max-w-md mx-auto"
              style={{ color: 'rgba(240,237,248,0.45)' }}
            >
              Every room shares the same ambient environment. Pick the vibe that helps everyone lock in.
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ENVIRONMENTS.map((env, i) => (
              <motion.div
                key={env.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="relative overflow-hidden rounded-2xl cursor-default"
                style={{
                  height: 200,
                  background: `linear-gradient(145deg, ${env.from}, ${env.to})`,
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                {/* Abstract environment illustration */}
                <EnvVisual kind={env.visual} />

                {/* Text overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55), transparent)' }}>
                  <div className="text-sm font-semibold" style={{ color: '#fff' }}>{env.name}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>{env.mood}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          TESTIMONIALS
      ══════════════════════════════════════════ */}
      <section className="px-6 py-28" style={{ background: '#0a0818' }}>
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            className="text-center mb-16"
          >
            <motion.p
              variants={fadeUp}
              custom={0}
              className="text-xs font-semibold tracking-widest mb-4"
              style={{ color: '#7d9e84', letterSpacing: '0.12em' }}
            >
              FROM REAL STUDENTS
            </motion.p>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="text-4xl font-bold tracking-tight"
              style={{ fontFamily: 'Lora, Georgia, serif', color: '#f0edf8' }}
            >
              They locked in. You can too.
            </motion.h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="p-6 rounded-2xl flex flex-col gap-5"
                style={{
                  background: '#0f0d1a',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {/* Quote */}
                <p
                  className="text-sm leading-relaxed italic flex-1"
                  style={{ color: 'rgba(240,237,248,0.6)' }}
                >
                  &ldquo;{t.text}&rdquo;
                </p>
                {/* Author */}
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{
                      background: `${t.accent}20`,
                      color: t.accent,
                      border: `1.5px solid ${t.accent}40`,
                    }}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: '#f0edf8' }}>{t.name}</div>
                    <div className="text-xs" style={{ color: 'rgba(240,237,248,0.35)' }}>{t.school}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          CTA
      ══════════════════════════════════════════ */}
      <section
        className="relative px-6 py-32 text-center overflow-hidden"
        style={{ background: '#070510' }}
      >
        {/* Background glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(155,141,188,0.14) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 40% 40% at 50% 50%, rgba(125,158,132,0.08) 0%, transparent 70%)',
          }}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 max-w-2xl mx-auto"
        >
          <h2
            className="text-4xl sm:text-5xl font-bold mb-5 tracking-tight"
            style={{ fontFamily: 'Lora, Georgia, serif', color: '#f0edf8' }}
          >
            Join the study session.
          </h2>
          <p
            className="text-base mb-10"
            style={{ color: 'rgba(240,237,248,0.45)' }}
          >
            Thousands of students are locking in right now. Don't study alone.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-full text-sm font-semibold text-white transition-all hover:opacity-90 hover:scale-[1.02] hover:shadow-2xl"
              style={{ background: 'linear-gradient(135deg, #7d9e84 0%, #9b8dbc 100%)' }}
            >
              Create your free account
              <ArrowRight size={15} />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-10 py-4 rounded-full text-sm font-semibold transition-all hover:bg-white/8"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.09)',
                color: 'rgba(240,237,248,0.65)',
              }}
            >
              Sign in
            </Link>
          </div>
          <p className="mt-6 text-xs" style={{ color: 'rgba(240,237,248,0.22)' }}>
            Free forever for students · No credit card needed
          </p>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════ */}
      <footer
        className="px-6 py-10"
        style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          background: '#070510',
        }}
      >
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm" style={{ color: 'rgba(240,237,248,0.28)' }}>
          {/* Logo */}
          <div className="flex items-center gap-2">
            <span className="text-base" aria-hidden="true">🫧</span>
            <span style={{ fontFamily: 'Lora, Georgia, serif', color: 'rgba(240,237,248,0.45)' }}>
              Focus Bubble
            </span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-xs">
            <a href="#features" className="hover:text-white/60 transition-colors">Features</a>
            <a href="#how" className="hover:text-white/60 transition-colors">How it works</a>
            <a href="#environments" className="hover:text-white/60 transition-colors">Environments</a>
            <Link href="/login" className="hover:text-white/60 transition-colors">Sign in</Link>
          </div>

          <p className="text-xs">
            Study together, go further.
          </p>
        </div>
      </footer>

      {/* Global styles (keyframes needed for rain) */}
      <style>{`
        @keyframes rain-fall {
          from { transform: translateY(-20px) rotate(15deg); opacity: 0.6; }
          to   { transform: translateY(200px)  rotate(15deg); opacity: 0.6; }
        }
      `}</style>
    </div>
  )
}
