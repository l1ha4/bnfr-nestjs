import { PrismaService } from '@/core/prisma/prisma.service'
import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { UserRole } from '@prisma/client'
import { Request } from 'express'
import { LoginDto } from '../../auth/dto/login.dto'
import { verify } from 'argon2'
import { AuthService } from '../../auth/auth.service'

@Injectable()
export class AuthAdminService {
  private readonly logger = new Logger(AuthAdminService.name)

  public constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  public async loginAdmin(req: Request, dto: LoginDto) {
    this.logger.log(`Попытка входа: email=${dto.email}`)

    const user = await this.findByEmailAdmin({
      email: dto.email,
      includePassword: true,
    })

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
    return this.authService.saveSession(req, user)
  }

  public async logoutAdmin(req: Request): Promise<boolean> {
    return new Promise((resolve, reject) => {
      req.session.destroy((err) => {
        if (err) {
          reject(err)
        } else {
          resolve(true)
        }
      })
    })
  }

  public async findByIdAdmin(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    })
    if (!user) {
      throw new NotFoundException('Пользователь не найден')
    }
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.OWNER) {
      throw new ForbiddenException('Пользователь не является администратором')
    }

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    }
  }

  public async findByEmailAdmin({
    email,
    includePassword = false,
  }: {
    email: string
    includePassword?: boolean
  }) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      throw new NotFoundException('Пользователь не найден')
    }
    
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.OWNER) {
      throw new ForbiddenException('Пользователь не является администратором')
    }

    return {
      ...user,
      password: includePassword ? user.password : '',
    }
  }
}
