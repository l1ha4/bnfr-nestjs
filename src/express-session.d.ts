import 'express-session'
import type { Prisma } from '@prisma/client'

type RequestUser = Omit<
  Prisma.UserGetPayload<{
    include: { accounts: true }
  }>,
  'password'
>

declare global {
  namespace Express {
    interface Request {
      session: import('express-session').Session &
        Partial<import('express-session').SessionData>
      user?: RequestUser
    }
  }
}

declare module 'express-session' {
  interface SessionData {
    userId?: string
  }
}

export {}
