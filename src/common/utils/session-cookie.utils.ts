import { CookieOptions } from 'express'

type SessionCookieConfig = {
  domain?: string
  maxAge: number
  httpOnly: boolean
  secure: boolean
}

const isLocalSessionDomain = (domain?: string) => {
  if (!domain) {
    return true
  }

  return ['localhost', '127.0.0.1', '::1'].includes(domain)
}

export const createSessionCookieOptions = ({
  domain,
  maxAge,
  httpOnly,
  secure,
}: SessionCookieConfig): CookieOptions => {
  const normalizedDomain = domain?.trim()
  const useHostOnlyCookie = isLocalSessionDomain(normalizedDomain)

  return {
    path: '/',
    maxAge,
    httpOnly,
    secure,
    sameSite: secure ? 'none' : 'lax',
    domain: useHostOnlyCookie ? undefined : normalizedDomain,
  }
}
