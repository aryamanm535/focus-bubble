'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Users, Timer, Zap, Music, Shield, TrendingUp } from 'lucide-react'

const FLOATING_BLOBS = [
  { size: 340, x: '10%',  y: '15%', color: '#d9eadc', delay: 0    },
  { size: 260, x: '70%',  y: '8%',  color: '#e0d9f0', delay: 1.2  },
  { size: 200, x: '85%',  y: '55%', color: '#f7d5ce', delay: 0.6  },
  { size: 180, x: '5%',   y: '65%', color: '#e0d9f0', delay: 1.8  },
  { size: 220, x: '50%',  y: '75%', color: '#d9eadc', delay: 0.9  },
]

const FEATURES = [
  {
    icon: Users,
    title: 'Live Focus Rooms',
    desc: 'Join public or private rooms and study side-by-side with others in real time.',
    color: '#7d9e84',
  },
  {
    icon: Timer,
    title: 'Synced Pomodoro',
    desc: 'The whole room enters focus and break together — powerful social synchronisation.',
    color: '#9b8dbc',
  },
  {
    icon: Shield,
    title: 'Presence Detector',
    desc: 'Optional accountability toggle. The room sees when you go away — no secrets.',
    color: '#c86452',
  },
  {
    icon: Music,
    title: 'Ambient Environments',
    desc: 'Rainy Café, Library, Late Night Code, Forest — everyone shares the same vibe.',
    color: '#a07848',
  },
  {
    icon: Zap,
    title: 'Silent Reactions',
    desc: '"Locked in 🔒", "On Fire 🔥" — lightweight nudges with no chat spam.',
    color: '#7d9e84',
  },
  {
    icon: TrendingUp,
    title: 'Focus Streaks',
    desc: 'Daily streaks, consistency tracking, and friend rankings to keep you returning.',
    color: '#9b8dbc',
  },
]

const ENVIRONMENTS = [
  { emoji: '☕', name: 'Rainy Café',     bg: '#fdf3e7' },
  { emoji: '📚', name: 'Library',        bg: '#edf2ee' },
  { emoji: '💻', name: 'Late Night Code', bg: '#1a1520' },
  { emoji: '🌿', name: 'Forest',         bg: '#e8f0e6' },
]

const TESTIMONIALS = [
  { name: 'Maya K.', school: 'UT Austin', text: 'I\'ve never been this consistent. The "8 PM study room" with my friends is a non-negotiable now.' },
  { name: 'Dev P.',  school: 'UC Berkeley', text: 'Better than any Pomodoro app because the social pressure actually keeps me off my phone.' },
  { name: 'Priya S.', school: 'NYU',      text: 'The ambient scenes make such a difference. Rainy café hits different at midnight.' },
]

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
}

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden" style={{ background: '#f7f4ef', color: '#3d2e23' }}>

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 backdrop-blur-md"
           style={{ background: 'rgba(247,244,239,0.88)', borderBottom: '1px solid #ece8e1' }}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">🫧</span>
          <span className="font-display text-xl font-semibold" style={{ fontFamily: 'Lora, Georgia, serif' }}>
            Focus Bubble
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login"
                className="px-4 py-2 rounded-full text-sm font-medium transition-colors hover:bg-black/5"
                style={{ color: '#7a6a60' }}>
            Sign in
          </Link>
          <Link href="/signup"
                className="px-5 py-2 rounded-full text-sm font-semibold text-white transition-all hover:opacity-90 hover:scale-[1.02]"
                style={{ background: '#7d9e84' }}>
            Get started
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative flex flex-col items-center text-center px-6 pt-20 pb-28 overflow-hidden">
        {/* Background blobs */}
        {FLOATING_BLOBS.map((b, i) => (
          <div
            key={i}
            className="absolute rounded-full blur-3xl opacity-60 pointer-events-none animate-bob"
            style={{
              width: b.size, height: b.size,
              left: b.x, top: b.y,
              background: b.color,
              animationDelay: `${b.delay}s`,
              animationDuration: `${4 + i * 0.7}s`,
            }}
          />
        ))}

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 max-w-3xl"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-8"
               style={{ background: '#e8f0e6', color: '#5c7e63', border: '1px solid #b8d4bc' }}>
            <span className="text-base">🌱</span> Built for students, makers, and deep workers
          </div>

          <h1 className="text-5xl sm:text-7xl font-display font-bold leading-tight mb-6"
              style={{ fontFamily: 'Lora, Georgia, serif', letterSpacing: '-0.02em', color: '#2a2420' }}>
            Your digital<br />
            <span style={{
              background: 'linear-gradient(135deg, #7d9e84 0%, #9b8dbc 50%, #c86452 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              study home.
            </span>
          </h1>

          <p className="text-lg sm:text-xl leading-relaxed mb-10 max-w-xl mx-auto" style={{ color: '#7a6a60' }}>
            Join live focus rooms where everyone is locked in. Synced timers,
            ambient environments, and just enough social pressure to keep you off your phone.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup"
                  className="px-8 py-3.5 rounded-full text-base font-semibold text-white transition-all hover:opacity-90 hover:scale-[1.02] hover:shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #7d9e84, #9b8dbc)' }}>
              Start for free →
            </Link>
            <Link href="/dashboard"
                  className="px-8 py-3.5 rounded-full text-base font-semibold transition-all hover:bg-black/5"
                  style={{ background: '#f0ede6', color: '#3d2e23', border: '1px solid #dbd4c8' }}>
              Browse rooms
            </Link>
          </div>

          <p className="mt-5 text-sm" style={{ color: '#b8a89a' }}>No credit card. Free to join rooms.</p>
        </motion.div>

        {/* Floating ambient cards */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 mt-16 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg w-full"
        >
          {ENVIRONMENTS.map((env) => (
            <div key={env.name}
                 className="flex flex-col items-center gap-2 p-4 rounded-2xl text-sm font-medium transition-transform hover:scale-105 cursor-default"
                 style={{ background: env.bg, border: '1px solid rgba(0,0,0,0.06)',
                          color: env.name === 'Late Night Code' ? '#c4b8e0' : '#3d2e23' }}>
              <span className="text-2xl">{env.emoji}</span>
              {env.name}
            </div>
          ))}
        </motion.div>
      </section>

      {/* ── Features ── */}
      <section className="px-6 py-24 max-w-6xl mx-auto">
        <motion.div
          initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}
          className="text-center mb-16"
        >
          <motion.h2 variants={fadeUp} custom={0}
                     className="text-4xl font-display font-bold mb-4"
                     style={{ fontFamily: 'Lora, Georgia, serif', color: '#2a2420' }}>
            Everything you need to stay locked in.
          </motion.h2>
          <motion.p variants={fadeUp} custom={1} className="text-lg max-w-xl mx-auto" style={{ color: '#7a6a60' }}>
            Not a productivity app. A social deep-work platform.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title} variants={fadeUp} custom={i}
              className="p-6 rounded-2xl transition-all hover:shadow-md hover:-translate-y-0.5"
              style={{ background: '#fdfaf6', border: '1px solid #ece8e1' }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                   style={{ background: `${f.color}20` }}>
                <f.icon size={20} style={{ color: f.color }} />
              </div>
              <h3 className="font-semibold text-base mb-2" style={{ color: '#2a2420' }}>{f.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#7a6a60' }}>{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── How it works ── */}
      <section className="px-6 py-24" style={{ background: '#ede9e0' }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-display font-bold mb-4"
              style={{ fontFamily: 'Lora, Georgia, serif', color: '#2a2420' }}>
            How it works
          </h2>
          <p className="text-base mb-16" style={{ color: '#7a6a60' }}>Three steps to your next focus session.</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Create or join a room', desc: 'Public rooms are open to all. Private rooms use a shareable key.', emoji: '🚪' },
              { step: '02', title: 'Declare your task', desc: "Tell the room what you're working on. Accountability starts here.", emoji: '📝' },
              { step: '03', title: 'Lock in together', desc: 'The Pomodoro syncs for everyone. Break together, grind together.', emoji: '🔒' },
            ].map((item) => (
              <div key={item.step} className="flex flex-col items-center gap-3">
                <div className="text-4xl mb-1">{item.emoji}</div>
                <div className="text-xs font-bold tracking-widest" style={{ color: '#b8a89a' }}>{item.step}</div>
                <h3 className="font-semibold text-base" style={{ color: '#2a2420' }}>{item.title}</h3>
                <p className="text-sm text-center" style={{ color: '#7a6a60' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="px-6 py-24 max-w-5xl mx-auto">
        <h2 className="text-3xl font-display font-bold text-center mb-12"
            style={{ fontFamily: 'Lora, Georgia, serif', color: '#2a2420' }}>
          From real students
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t) => (
            <motion.div key={t.name}
                        initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }} transition={{ duration: 0.5 }}
                        className="p-6 rounded-2xl"
                        style={{ background: '#fdfaf6', border: '1px solid #ece8e1' }}>
              <p className="text-sm leading-relaxed mb-4 italic" style={{ color: '#7a6a60' }}>"{t.text}"</p>
              <div>
                <div className="text-sm font-semibold" style={{ color: '#2a2420' }}>{t.name}</div>
                <div className="text-xs" style={{ color: '#b8a89a' }}>{t.school}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-6 py-24 text-center"
               style={{ background: 'linear-gradient(135deg, #e8f0e6 0%, #ede9f8 50%, #fdf0ee 100%)' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}
        >
          <div className="text-5xl mb-6">🫧</div>
          <h2 className="text-4xl font-display font-bold mb-4"
              style={{ fontFamily: 'Lora, Georgia, serif', color: '#2a2420' }}>
            Ready to lock in?
          </h2>
          <p className="text-lg mb-8" style={{ color: '#7a6a60' }}>
            Join thousands of students and makers studying together right now.
          </p>
          <Link href="/signup"
                className="inline-block px-10 py-4 rounded-full text-base font-semibold text-white transition-all hover:opacity-90 hover:scale-[1.02] hover:shadow-xl"
                style={{ background: 'linear-gradient(135deg, #7d9e84, #9b8dbc)' }}>
            Create your free account →
          </Link>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="px-6 py-10 text-center text-sm" style={{ color: '#b8a89a', borderTop: '1px solid #ece8e1' }}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <span>🫧</span>
          <span className="font-display" style={{ fontFamily: 'Lora, Georgia, serif' }}>Focus Bubble</span>
        </div>
        <p>Study together, go further.</p>
      </footer>
    </div>
  )
}
