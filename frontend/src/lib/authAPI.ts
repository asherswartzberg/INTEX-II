import { getApiBaseUrl } from '../apis/client'

export interface AuthSession {
  isAuthenticated: boolean
  userName: string | null
  email: string | null
  firstName: string | null
  lastName: string | null
  roles: string[]
  supporterId: number | null
}

export interface ExternalAuthProvider {
  name: string
  displayName: string
}

export interface TwoFactorStatus {
  sharedKey: string | null
  recoveryCodesLeft: number
  recoveryCodes: string[] | null
  isTwoFactorEnabled: boolean
  isMachineRemembered: boolean
}

export class TwoFactorRequiredError extends Error {
  constructor() {
    super('Two-factor authentication is required.')
    this.name = 'TwoFactorRequiredError'
  }
}

const anonymousSession: AuthSession = {
  isAuthenticated: false,
  userName: null,
  email: null,
  firstName: null,
  lastName: null,
  roles: [],
  supporterId: null,
}

async function readApiError(response: Response, fallback: string): Promise<string> {
  const ct = response.headers.get('content-type') ?? ''
  if (!ct.includes('application/json')) return fallback

  const data = await response.json()

  if (typeof data?.detail === 'string' && data.detail.length > 0) return data.detail
  if (typeof data?.title === 'string' && data.title.length > 0) return data.title

  if (data?.errors && typeof data.errors === 'object') {
    const first = Object.values(data.errors)
      .flat()
      .find((v): v is string => typeof v === 'string')
    if (first) return first
  }

  if (typeof data?.message === 'string' && data.message.length > 0) return data.message
  return fallback
}

export async function getAuthSession(): Promise<AuthSession> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/auth/me`, {
      credentials: 'include',
    })
    if (!res.ok) return anonymousSession
    return await res.json()
  } catch {
    return anonymousSession
  }
}

export async function loginUser(
  email: string,
  password: string,
  rememberMe: boolean,
  twoFactorCode?: string,
  twoFactorRecoveryCode?: string,
): Promise<void> {
  const params = new URLSearchParams()
  if (rememberMe) {
    params.set('useCookies', 'true')
  } else {
    params.set('useSessionCookies', 'true')
  }

  const body: Record<string, string> = { email, password }
  if (twoFactorCode) body.twoFactorCode = twoFactorCode
  if (twoFactorRecoveryCode) body.twoFactorRecoveryCode = twoFactorRecoveryCode

  const res = await fetch(`${getApiBaseUrl()}/api/identity/login?${params}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    if (text.includes('RequiresTwoFactor') || text.includes('requiresTwoFactor')) {
      throw new TwoFactorRequiredError()
    }
    // Try to parse a friendly error from the response
    let msg = 'Invalid email or password.'
    try {
      const data = JSON.parse(text)
      msg = data?.detail ?? data?.title ?? data?.message ?? msg
    } catch { /* not JSON */ }
    throw new Error(msg)
  }
}

export async function registerUser(email: string, password: string, firstName?: string, lastName?: string, supporterType?: string): Promise<void> {
  const res = await fetch(`${getApiBaseUrl()}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password, firstName: firstName ?? '', lastName: lastName ?? '', supporterType: supporterType ?? 'MonetaryDonor' }),
  })

  if (!res.ok) {
    throw new Error(await readApiError(res, 'Unable to register the account.'))
  }
}

export async function logoutUser(): Promise<void> {
  const res = await fetch(`${getApiBaseUrl()}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  })

  if (!res.ok) {
    throw new Error(await readApiError(res, 'Unable to log out.'))
  }
}

export async function getExternalProviders(): Promise<ExternalAuthProvider[]> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/auth/providers`, {
      credentials: 'include',
    })
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

export function buildExternalLoginUrl(provider: string, returnPath = '/admin'): string {
  const params = new URLSearchParams({ provider, returnPath })
  return `${getApiBaseUrl()}/api/auth/external-login?${params}`
}

// ── Two-Factor Authentication ────────────────────────────

async function postTwoFactorRequest(payload: object): Promise<TwoFactorStatus> {
  const res = await fetch(`${getApiBaseUrl()}/api/identity/manage/2fa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    throw new Error(await readApiError(res, 'Unable to update MFA settings.'))
  }

  return res.json()
}

export async function getTwoFactorStatus(): Promise<TwoFactorStatus> {
  return postTwoFactorRequest({})
}

export async function enableTwoFactor(twoFactorCode: string): Promise<TwoFactorStatus> {
  return postTwoFactorRequest({
    enable: true,
    twoFactorCode,
    resetRecoveryCodes: true,
  })
}

export async function disableTwoFactor(): Promise<TwoFactorStatus> {
  return postTwoFactorRequest({ enable: false })
}

export async function resetRecoveryCodes(): Promise<TwoFactorStatus> {
  return postTwoFactorRequest({ resetRecoveryCodes: true })
}
