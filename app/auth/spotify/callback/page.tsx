'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SpotifyCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function exchange() {
      const params   = new URLSearchParams(window.location.search)
      const code     = params.get('code')
      const errParam = params.get('error')
      const returnTo = sessionStorage.getItem('spotify_return') ?? '/dashboard'
      const verifier = sessionStorage.getItem('spotify_verifier')
      const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID

      if (errParam) {
        setError(`Spotify denied access: ${errParam}`)
        return
      }
      if (!clientId) {
        setError('NEXT_PUBLIC_SPOTIFY_CLIENT_ID is not set. Add it to Vercel environment variables and redeploy.')
        return
      }
      if (!code || !verifier) {
        setError('Missing OAuth code or verifier. Try connecting again.')
        return
      }

      const res  = await fetch('https://accounts.spotify.com/api/token', {
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

      if (!data.access_token) {
        setError(
          data.error_description
            ?? `Token exchange failed (${data.error ?? res.status}). Make sure "${window.location.origin}/auth/spotify/callback" is in your Spotify app's Redirect URIs.`
        )
        return
      }

      // Popup mode: send token back to the opener tab and close
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({
          type:   'spotify_connected',
          token:  data.access_token,
          expiry: Date.now() + data.expires_in * 1000,
        }, window.location.origin)
        window.close()
        return
      }
      // Redirect mode fallback
      localStorage.setItem('spotify_access_token', data.access_token)
      localStorage.setItem('spotify_token_expiry', String(Date.now() + data.expires_in * 1000))
      sessionStorage.removeItem('spotify_verifier')
      sessionStorage.removeItem('spotify_return')
      router.push(returnTo)
    }
    exchange()
  }, [])

  if (error) return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#070510' }}>
      <div className="max-w-md text-center">
        <div className="text-3xl mb-4">⚠️</div>
        <p className="text-sm font-semibold mb-2" style={{ color: '#e8937f' }}>Spotify connection failed</p>
        <p className="text-xs leading-relaxed mb-6" style={{ color: 'rgba(255,255,255,0.45)' }}>{error}</p>
        <button onClick={() => history.back()}
                className="px-5 py-2 rounded-xl text-sm font-medium"
                style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
          Go back
        </button>
      </div>
    </div>
  )

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
