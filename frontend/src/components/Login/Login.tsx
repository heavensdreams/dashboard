import { useState } from 'react'
import { useUserStore } from '@/stores/userStore'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { setCurrentUser } = useUserStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Use backend login API
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Login failed' }))
        setError(errorData.error || 'Invalid email or password')
        setLoading(false)
        return
      }
      
      const user = await response.json()
      
      // Set current user (includes group_id if present)
      setCurrentUser({
        id: user.id,
        email: user.email,
        role: user.role,
        group_id: user.group_id || undefined
      })
    } catch (error) {
      console.error('Login error:', error)
      setError('Failed to connect to server. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FAFAFA] via-[#FFF8E7] to-white flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-8 sm:mb-12">
          <img 
            src="https://framerusercontent.com/images/SYXEfWLXQTVuo97yIbacWB2oOIw.png?width=581&height=440" 
            alt="Heaven's Dreams Logo" 
            className="h-16 sm:h-20 lg:h-24 w-auto object-contain mb-4"
          />
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-light text-[#2C3E1F] tracking-wide gold-text-gradient mb-2">
            Heaven's Dreams
          </h1>
          <p className="text-sm sm:text-base text-[#6B7C4A] font-light">Luxury Holiday Homes</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden border-2 border-[#D4AF37]/20">
          {/* Header with Gold Accent */}
          <div className="bg-gradient-to-r from-[#4A5D23]/10 via-[#D4AF37]/10 to-[#8B7355]/10 px-6 sm:px-8 py-6 sm:py-8 border-b-2 border-[#D4AF37]/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 sm:w-48 sm:h-48 bg-gradient-to-br from-[#D4AF37]/10 to-transparent rounded-full blur-3xl"></div>
            <div className="relative z-10">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-light text-[#2C3E1F] tracking-wide gold-text-gradient text-center">
                Welcome Back
              </h2>
              <p className="text-sm sm:text-base text-[#6B7C4A] font-light text-center mt-2">
                Sign in to access your account
              </p>
            </div>
          </div>

          {/* Form Content */}
          <div className="px-6 sm:px-8 py-6 sm:py-8">
            <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm sm:text-base font-light text-[#2C3E1F] mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  autoFocus
                  className="w-full px-4 py-3 rounded-lg border-2 border-[#D4AF37]/30 bg-white text-[#2C3E1F] placeholder:text-[#6B7C4A]/50 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 transition-all duration-300 font-light"
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm sm:text-base font-light text-[#2C3E1F] mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full px-4 py-3 rounded-lg border-2 border-[#D4AF37]/30 bg-white text-[#2C3E1F] placeholder:text-[#6B7C4A]/50 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 transition-all duration-300 font-light"
                />
              </div>

              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-lg px-4 py-3">
                  <p className="text-sm text-red-600 font-light text-center">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 sm:py-4 bg-gradient-to-r from-[#D4AF37] via-[#F4D03F] to-[#D4AF37] text-[#2C3E1F] rounded-lg font-light text-base sm:text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Logging in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            {/* Demo Credentials */}
            <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t-2 border-[#D4AF37]/20">
              <p className="text-xs sm:text-sm text-[#6B7C4A] font-light text-center mb-3">
                Demo credentials:
              </p>
              <div className="space-y-2">
                <div className="bg-gradient-to-r from-[#E8F0E0] to-[#F0F8E8] rounded-lg px-4 py-2 border border-[#D4E0C8]">
                  <p className="text-xs sm:text-sm text-[#4A5D23] font-light">
                    <span className="font-medium">Admin:</span> john.doe@example.com / password123
                  </p>
                </div>
                <div className="bg-gradient-to-r from-[#E8F0E0] to-[#F0F8E8] rounded-lg px-4 py-2 border border-[#D4E0C8]">
                  <p className="text-xs sm:text-sm text-[#4A5D23] font-light">
                    <span className="font-medium">User:</span> jane.smith@example.com / password123
                  </p>
                </div>
                <div className="bg-gradient-to-r from-[#FFF8E7] to-[#FFF4D6] rounded-lg px-4 py-2 border border-[#D4AF37]/30">
                  <p className="text-xs sm:text-sm text-[#4A5D23] font-light">
                    <span className="font-medium">Customer:</span> demo@example.com / password123
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom CSS for gold text gradient */}
      <style>{`
        .gold-text-gradient {
          background: linear-gradient(135deg, #2C3E1F 0%, #4A5D23 40%, #D4AF37 60%, #F4D03F 80%, #D4AF37 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      `}</style>
    </div>
  )
}
