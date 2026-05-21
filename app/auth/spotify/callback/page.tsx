'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SpotifyCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    async function exchange() {
      const params   = new URLSearchParams(window.location.search)
      const code     = params.get('code')
      const returnTo = sessionStorage.getItem('spotify_return') ?? '/dashboard'
      const verifier = sessionStorage.getItem('spotify_verifier')
      const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID

      if (!code || !verifier || !clientId) { router.push(returnTo); return }

      const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id:     clientId,
          grant_type:    'authorization_code',
          code,
          redirect_uri:  `${window.location.origin}/auth/spotify/callback`,
          code_verifier: verifier,
        }),
      })
      const data = await res.json()

      if (data.access_token) {
        localStorage.setItem('spotify_access_token', data.access_token)
        localStorage.setItem('spotify_token_expiry', String(Date.now() + data.expires_in * 1000))
        sessionStorage.removeItem('spotify_verifier')
        sessionStorage.removeItem('spotify_return')
      }

      router.push(returnTo)
    }
    exchange()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#070510' }}>
      <div className="flex items-center gap-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
        <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
             style={{ borderColor: '#1db954', borderTopColor: 'transparent' }} />
        Connecting Spotify…
      </div>
    </div>
  )
}
