import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { UserService } from '../user/user.service'
import { ConfigService } from '@nestjs/config'
import { RegisterDto } from './dto/register.dto'
import { AuthMethod, User } from '@prisma/client'
import { LoginDto } from './dto/login.dto'
import { verify } from 'argon2'
import { Request } from 'express'
import { Response } from 'express'
import { PrismaService } from '@/core/prisma/prisma.service'
import ms, { StringValue } from 'ms'
import { parseBoolean } from '@/common/utils/parse-boolean.utils'
import { createSessionCookieOptions } from '@/common/utils/session-cookie.utils'

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  private sanitizeUser<T extends { password?: string }>(
    user: T,
  ): Omit<T, 'password'> {
    const { password, ...safeUser } = user
    return safeUser
  }

  public constructor(
    private readonly prismaService: PrismaService,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {}

  private getSessionCookieOptions() {
    return createSessionCookieOptions({
      domain: this.configService.get<string>('SESSION_DOMAIN'),
      maxAge: ms(this.configService.getOrThrow<StringValue>('SESSION_MAX_AGE')),
      httpOnly: parseBoolean(
        this.configService.getOrThrow<string>('SESSION_HTTP_ONLY'),
      ),
      secure: parseBoolean(
        this.configService.getOrThrow<string>('SESSION_SECURE'),
      ),
    })
  }

  public async register(req: Request, dto: RegisterDto) {
    const authSettings = await this.prismaService.authSettings.upsert({
      where: {
        id: 'bonfire-id',
      },
      update: {},
      create: {
        id: 'bonfire-id',
        isRegistrationEnabled: false,
      },
    })

    if (!authSettings.isRegistrationEnabled) {
      throw new ForbiddenException(
        'Регистрация пользователей временно отключена',
      )
    }

    this.logger.log(`Попытка регистрации: email=${dto.email}`)

    const isExists = await this.userService.findByEmail(dto.email)

    if (isExists) {
      this.logger.warn(`Регистрация отклонена — email уже занят: ${dto.email}`)
      throw new ForbiddenException('Пользователь с таким email уже существует.')
    }

    const newUser = await this.userService.create({
      displayName: dto.name,
      email: dto.email,
      password: dto.password,
      picture: '',
      method: AuthMethod.CREDENTIALS,
      isVerified: false,
      role: 'REGULAR',
    })

    this.logger.log(
      `Пользователь зарегистрирован: id=${newUser.id}, email=${newUser.email}`,
    )
    return this.saveSession(req, newUser)
  }

  public async login(req: Request, dto: LoginDto) {
    this.logger.log(`Попытка входа: email=${dto.email}`)

    const user = await this.userService.findByEmail(dto.email)

    if (!user || !user.password) {
      this.logger.warn(
        `Вход отклонён — пользователь не найден: email=${dto.email}`,
      )
      throw new NotFoundException('Пользователь с таким email не найден.')
    }

    const isValidPassword = await verify(user.password, dto.password)

    if (!isValidPassword) {
      this.logger.warn(
        `Вход отклонён — неверный пароль: id=${user.id}, email=${user.email}`,
      )
      throw new UnauthorizedException('Неверный пароль.')
    }

    this.logger.log(`Успешный вход: id=${user.id}, email=${user.email}`)
    return this.saveSession(req, user)
  }

  public async logout(req: Request, res: Response): Promise<void> {
    const sessionId = req.session.id
    const userId = req.session.userId
    this.logger.log(
      `Выход из системы: userId=${userId}, sessionId=${sessionId}`,
    )

    return new Promise((resolve, reject) => {
      req.session.destroy((err) => {
        if (err) {
          this.logger.error(
            `Ошибка уничтожения сессии: userId=${userId}, sessionId=${sessionId}`,
            err,
          )
          return reject(
            new InternalServerErrorException('Ошибка при уничтожении сессии.'),
          )
        }
        this.logger.log(
          `Сессия уничтожена: userId=${userId}, sessionId=${sessionId}`,
        )
        res.clearCookie(
          this.configService.getOrThrow<string>('SESSION_NAME'),
          this.getSessionCookieOptions(),
        )
        resolve()
      })
    })
  }

  public clearSession(req: Request, res: Response): { success: boolean } {
    req.session?.destroy?.(() => {})
    res.clearCookie(
      this.configService.getOrThrow<string>('SESSION_NAME'),
      this.getSessionCookieOptions(),
    )
    return { success: true }
  }

  public async saveSession(req: Request, user: User) {
    return new Promise((resolve, reject) => {
      req.session.userId = user.id

      this.logger.log(
        `Сохранение сессии для пользователя: ${user.id} (${user.email})`,
      )

      req.session.save((err) => {
        if (err) {
          this.logger.error(
            `Ошибка сохранения сессии для пользователя: ${user.id}`,
            err,
          )
          return reject(
            new InternalServerErrorException(
              'Ошибка при сохранении сессии. Возможжно неверные параметры',
            ),
          )
        }

        this.logger.log(
          `Сессия успешно сохранена в Redis. Session ID: ${req.session.id}`,
        )
        resolve({ user: this.sanitizeUser(user) })
      })
    })
  }
}
