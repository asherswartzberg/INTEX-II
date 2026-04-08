import { getApiBaseUrl } from '../apis/client'

export interface AuthSession {
  isAuthenticated: boolean
  userName: string | null
  email: string | null
  firstName: string | null
  lastName: string | null
  roles: string[]
  supporterId: number | null
  accessibleSafehouseIds: number[]
}

export interface ExternalAuthProvider {
  name: string
  displayName: string
}

const anonymousSession: AuthSession = {
  isAuthenticated: false,
  userName: null,
  email: null,
  firstName: null,
  lastName: null,
  roles: [],
  supporterId: null,
  accessibleSafehouseIds: [],
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
): Promise<void> {
  const params = new URLSearchParams()
  if (rememberMe) {
    params.set('useCookies', 'true')
  } else {
    params.set('useSessionCookies', 'true')
  }

  const res = await fetch(`${getApiBaseUrl()}/api/identity/login?${params}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  })

  if (!res.ok) {
    throw new Error(await readApiError(res, 'Invalid email or password.'))
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
