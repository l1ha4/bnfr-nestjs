import { CreateUserDto } from '@/app/user/dto/createUser.dto'
import { UserService } from '@/app/user/user.service'
import { PrismaService } from '@/core/prisma/prisma.service'
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { AuthMethod, UserRole } from '@prisma/client'
import e from 'express'

@Injectable()
export class AdminService {
  public constructor(
    private readonly userService: UserService,
    private readonly prisma: PrismaService,
  ) {}

  async loginAdmin(
    userId: string,
    req: e.Request,
  ): Promise<{
    id: string
    username: string
    picture: string | null
  }> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
        role: {
          in: [UserRole.ADMIN, UserRole.OWNER],
        },
      },
    })
    if (!user) {
      throw new NotFoundException('Пользователь не найден')
    }

    req.session.userId = user.id

    return {
      id: user.id,
      username: user.displayName,
      picture: user.picture,
    }
  }

  async logoutAdmin(req: e.Request): Promise<boolean> {
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

  async findByIdAdmin(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    })
    if (!user) {
      throw new NotFoundException('Пользователь не найден')
    }
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Пользователь не является администратором')
    }

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
    }
  }
}
