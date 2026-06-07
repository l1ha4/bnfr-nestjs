import 'dotenv/config'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import cookieParser from 'cookie-parser'
import { ConfigService } from '@nestjs/config'
import { ValidationPipe } from '@nestjs/common'
import session from 'express-session'
import { NestExpressApplication } from '@nestjs/platform-express'
import ms, { StringValue } from 'ms'
import { parseBoolean } from './common/utils/parse-boolean.utils'
import { RedisStore } from 'connect-redis'
import { createClient } from 'redis'
import { createSessionCookieOptions } from './common/utils/session-cookie.utils'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)

  app.set('trust proxy', 1)

  const config = app.get(ConfigService)

  app.use(cookieParser(config.getOrThrow<string>('COOKIE_SECRET')))
  const redis = createClient({
    url: config.getOrThrow<string>('REDIS_URI'),
  })

  redis.on('error', (err) => {
    console.error('Redis Client Error', err)
  })

  await redis.connect()

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  )

  const sessionCookieOptions = createSessionCookieOptions({
    domain: config.get<string>('SESSION_DOMAIN'),
    maxAge: ms(config.getOrThrow<StringValue>('SESSION_MAX_AGE')),
    httpOnly: parseBoolean(config.getOrThrow<string>('SESSION_HTTP_ONLY')),
    secure: parseBoolean(config.getOrThrow<string>('SESSION_SECURE')),
  })

  app.use(
    session({
      secret: config.getOrThrow<string>('SESSION_SECRET'),
      name: config.getOrThrow<string>('SESSION_NAME'),
      resave: true,
      saveUninitialized: false,
      cookie: sessionCookieOptions,
      store: new RedisStore({
        client: redis,
        prefix: config.getOrThrow<string>('SESSION_FOLDER'),
      }),
    }),
  )

  const allowedOrigins = config
    .getOrThrow<string>('ALLOWED_ORIGINS')
    .split(',')
    .map((origin) => origin.trim())

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true,
  })

  await app.listen(config.getOrThrow<number>('APPLICATION_PORT'))
}
bootstrap()
