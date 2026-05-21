'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Mail, Lock, User, Briefcase, Eye, EyeOff, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep]                 = useState<1 | 2>(1)
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [displayName, setDisplayName]   = useState('')
  const [schoolOrJob, setSchoolOrJob]   = useState('')
  const [showPwd, setShowPwd]           = useState(false)
  const [loading, setLoading]           = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError]               = useState<string | null>(null)

  async function handleGoogleSignup() {
    setGoogleLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      setError(error.message)
      setGoogleLoading(false)
    }
  }

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault()
    if (step === 1) { setStep(2); return }

    setLoading(true)
    setError(null)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: displayName } },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (data.user && schoolOrJob) {
      await supabase.from('profiles').update({ school_or_job: schoolOrJob, display_name: displayName })
                                     .eq('id', data.user.id)
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
         style={{ background: '#f7f4ef' }}>

      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute rounded-full blur-3xl opacity-50 animate-bob"
             style={{ width: 300, height: 300, top: '-8%', left: '5%', background: '#d9eadc', animationDuration: '5.5s' }} />
        <div className="absolute rounded-full blur-3xl opacity-40 animate-bob"
             style={{ width: 350, height: 350, bottom: '-10%', right: '-5%', background: '#f7d5ce', animationDuration: '6.5s', animationDelay: '0.8s' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="rounded-3xl p-8 sm:p-10"
             style={{ background: '#fdfaf6', border: '1px solid #ece8e1', boxShadow: '0 8px 40px rgba(61,46,35,0.08)' }}>

          <div className="text-center mb-8">
            <div className="text-4xl mb-3">🫧</div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: 'Lora, Georgia, serif', color: '#2a2420' }}>
              {step === 1 ? 'Create your account' : 'Almost there!'}
            </h1>
            <p className="text-sm mt-1" style={{ color: '#7a6a60' }}>
              {step === 1 ? 'Join the community of deep workers.' : 'Tell us a bit about yourself.'}
            </p>
          </div>

          {/* Step indicator */}
          <div className="flex gap-2 mb-6">
            {[1, 2].map((s) => (
              <div key={s} className="h-1 flex-1 rounded-full transition-all"
                   style={{ background: s <= step ? '#9b8dbc' : '#ece8e1' }} />
            ))}
          </div>

          {step === 1 && (
            <>
              {/* Google */}
              <button
                onClick={handleGoogleSignup}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 py-3 rounded-2xl text-sm font-medium transition-all hover:shadow-md hover:-translate-y-0.5 disabled:opacity-60"
                style={{ background: '#fff', border: '1.5px solid #dbd4c8', color: '#3d2e23' }}
              >
                {googleLoading ? <Loader2 size={18} className="animate-spin" /> : (
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/>
                    <path fill="#34A853" d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.615 24 12.255 24z"/>
                    <path fill="#FBBC05" d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 0 0 0 10.76l3.98-3.09z"/>
                    <path fill="#EA4335" d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.64 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/>
                  </svg>
                )}
                Continue with Google
              </button>

              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px" style={{ background: '#ece8e1' }} />
                <span className="text-xs" style={{ color: '#b8a89a' }}>or email</span>
                <div className="flex-1 h-px" style={{ background: '#ece8e1' }} />
              </div>
            </>
          )}

          <form onSubmit={handleCreateAccount} className="flex flex-col gap-4">
            {step === 1 && (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium" style={{ color: '#7a6a60' }}>Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#b8a89a' }} />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                           placeholder="you@university.edu" required
                           className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all"
                           style={{ background: '#f0ede6', border: '1.5px solid #dbd4c8', color: '#2a2420' }}
                           onFocus={(e) => { e.target.style.borderColor = '#9b8dbc'; e.target.style.background = '#fff' }}
                           onBlur={(e)  => { e.target.style.borderColor = '#dbd4c8'; e.target.style.background = '#f0ede6' }} />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium" style={{ color: '#7a6a60' }}>Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#b8a89a' }} />
                    <input type={showPwd ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                           placeholder="Min. 8 characters" minLength={8} required
                           className="w-full pl-10 pr-10 py-3 rounded-xl text-sm outline-none transition-all"
                           style={{ background: '#f0ede6', border: '1.5px solid #dbd4c8', color: '#2a2420' }}
                           onFocus={(e) => { e.target.style.borderColor = '#9b8dbc'; e.target.style.background = '#fff' }}
                           onBlur={(e)  => { e.target.style.borderColor = '#dbd4c8'; e.target.style.background = '#f0ede6' }} />
                    <button type="button" onClick={() => setShowPwd(!showPwd)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: '#b8a89a' }}>
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium" style={{ color: '#7a6a60' }}>Your name</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#b8a89a' }} />
                    <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                           placeholder="What should we call you?" required
                           className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all"
                           style={{ background: '#f0ede6', border: '1.5px solid #dbd4c8', color: '#2a2420' }}
                           onFocus={(e) => { e.target.style.borderColor = '#9b8dbc'; e.target.style.background = '#fff' }}
                           onBlur={(e)  => { e.target.style.borderColor = '#dbd4c8'; e.target.style.background = '#f0ede6' }} />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium" style={{ color: '#7a6a60' }}>
                    School or job <span style={{ color: '#b8a89a' }}>(optional)</span>
                  </label>
                  <div className="relative">
                    <Briefcase size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#b8a89a' }} />
                    <input type="text" value={schoolOrJob} onChange={(e) => setSchoolOrJob(e.target.value)}
                           placeholder="e.g. UT Austin, Google, Freelance"
                           className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all"
                           style={{ background: '#f0ede6', border: '1.5px solid #dbd4c8', color: '#2a2420' }}
                           onFocus={(e) => { e.target.style.borderColor = '#9b8dbc'; e.target.style.background = '#fff' }}
                           onBlur={(e)  => { e.target.style.borderColor = '#dbd4c8'; e.target.style.background = '#f0ede6' }} />
                  </div>
                </div>
              </>
            )}

            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="text-xs px-3 py-2 rounded-lg"
                        style={{ background: '#fdf3f1', color: '#c86452', border: '1px solid #f7d5ce' }}>
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full py-3 rounded-2xl text-sm font-semibold text-white transition-all hover:opacity-90 hover:-translate-y-0.5 disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #7d9e84, #9b8dbc)' }}
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {step === 1 ? 'Continue →' : 'Create account'}
            </button>

            {step === 2 && (
              <button type="button" onClick={() => setStep(1)}
                      className="text-sm text-center hover:underline" style={{ color: '#7a6a60' }}>
                ← Back
              </button>
            )}
          </form>

          <p className="text-center text-sm mt-6" style={{ color: '#7a6a60' }}>
            Have an account?{' '}
            <Link href="/login" className="font-semibold hover:underline" style={{ color: '#7d9e84' }}>
              Sign in
            </Link>
          </p>
        </div>

        <Link href="/" className="block text-center text-sm mt-6 hover:underline" style={{ color: '#b8a89a' }}>
          ← Back to home
        </Link>
      </motion.div>
    </div>
  )
}
