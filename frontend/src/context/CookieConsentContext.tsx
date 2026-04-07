import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'

type ConsentStatus = 'pending' | 'accepted' | 'declined'

interface CookieConsentValue {
  consent: ConsentStatus
  accept: () => void
  decline: () => void
}

const STORAGE_KEY = 'cookie_consent'

function readStoredConsent(): ConsentStatus {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'accepted' || v === 'declined') return v
  } catch { /* localStorage unavailable */ }
  return 'pending'
}

const CookieConsentContext = createContext<CookieConsentValue | undefined>(undefined)

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<ConsentStatus>(readStoredConsent)

  const accept = useCallback(() => {
    setConsent('accepted')
    try { localStorage.setItem(STORAGE_KEY, 'accepted') } catch {}
  }, [])

  const decline = useCallback(() => {
    setConsent('declined')
    try { localStorage.setItem(STORAGE_KEY, 'declined') } catch {}
  }, [])

  return (
    <CookieConsentContext.Provider value={{ consent, accept, decline }}>
      {children}
    </CookieConsentContext.Provider>
  )
}

export function useCookieConsent() {
  const ctx = useContext(CookieConsentContext)
  if (!ctx) throw new Error('useCookieConsent must be used within CookieConsentProvider.')
  return ctx
}
