import { GoogleLogin } from '@react-oauth/google'
import { useAuth, ALLOWED_DOMAIN } from '@/contexts/AuthContext'

function decodeJwt(token: string) {
  try {
    return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
  } catch { return null }
}

export function LoginPage() {
  const { setUser, setDenied, denied } = useAuth()

  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{
        background: 'linear-gradient(rgba(10,10,10,0.82), rgba(10,10,10,0.82)), url(/assets/background.jpg) center/cover fixed',
      }}
    >
      <div className="w-full max-w-md px-4">
        {/* Card */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-10 shadow-2xl flex flex-col items-center gap-7">

          {/* Logo + title */}
          <div className="flex flex-col items-center gap-4">
            <img src="/assets/logo.png" alt="Tractian" className="h-10 object-contain brightness-200" />
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white tracking-tight">All Results</h1>
              <p className="text-sm text-white/50 mt-1">Quality & Debugging Platform</p>
            </div>
          </div>

          {/* Divider */}
          <div className="w-full border-t border-white/10" />

          {/* Error */}
          {denied && (
            <div className="w-full px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 text-center">
              Acesso negado — use sua conta <span className="font-semibold">@{ALLOWED_DOMAIN}</span>
            </div>
          )}

          {/* Sign in label */}
          <p className="text-sm text-white/40 -mb-2">Acesso restrito a colaboradores Tractian</p>

          {/* Google button */}
          <GoogleLogin
            onSuccess={credentialResponse => {
              const payload = decodeJwt(credentialResponse.credential ?? '')
              if (!payload) return
              if (!payload.email?.endsWith(`@${ALLOWED_DOMAIN}`)) {
                setDenied(true)
                return
              }
              setUser({ email: payload.email, name: payload.name, picture: payload.picture })
            }}
            onError={() => setDenied(true)}
            text="signin_with"
            shape="rectangular"
            size="large"
            width="300"
            theme="filled_black"
          />

          {/* Footer */}
          <p className="text-xs text-white/20 mt-2">
            &copy; {new Date().getFullYear()} Tractian · Internal Tool
          </p>
        </div>
      </div>
    </div>
  )
}
