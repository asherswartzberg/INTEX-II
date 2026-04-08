import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useCookieConsent } from './CookieConsentContext'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const COOKIE_NAME = 'theme_preference'

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { consent } = useCookieConsent()

  const [theme, setTheme] = useState<Theme>(() => {
    // Read from cookie first (if user previously consented), then localStorage fallback
    const fromCookie = getCookie(COOKIE_NAME)
    if (fromCookie === 'dark' || fromCookie === 'light') return fromCookie
    try {
      const fromStorage = localStorage.getItem(COOKIE_NAME)
      if (fromStorage === 'dark') return 'dark'
    } catch {}
    return 'light'
  })

  useEffect(() => {
    if (consent === 'accepted') {
      // User consented — persist preference in a browser-accessible cookie
      setCookie(COOKIE_NAME, theme, 365)
    } else {
      // No consent or declined — remove cookie, use localStorage only
      deleteCookie(COOKIE_NAME)
      try { localStorage.setItem(COOKIE_NAME, theme) } catch {}
    }
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme, consent])

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'))

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider.')
  return ctx
}
