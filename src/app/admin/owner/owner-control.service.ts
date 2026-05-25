import { CreateUserDto } from '@/app/user/dto/createUser.dto'
import { UserService } from '@/app/user/user.service'
import { PrismaService } from '@/core/prisma/prisma.service'
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { AuthMethod } from '@prisma/client'

import { AuthAdminService } from '../authAdmin/auth-admin.service'
import * as argon2 from 'argon2'
import { ResetPasswordDto } from './dto/resetPassword.dto'
@Injectable()
export class OwnerControlService {
  public constructor(
    private readonly userService: UserService,
    private readonly prisma: PrismaService,
    private readonly authAdminService: AuthAdminService,
  ) {}

  async resetPasswordAdmin(id: string, dto: ResetPasswordDto): Promise<boolean> {
    const { newPassword } = dto

    const user = await this.prisma.user.findFirst({
      where: {
        id,
        role: 'ADMIN',
      },
    })

    if (!user) {
      throw new NotFoundException('Администратор не найден')
    }

    const hashedPassword = await argon2.hash(newPassword)

    await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        password: hashedPassword,
      },
    })

    return true
  }

  async resetPasswordOwner(dto: ResetPasswordDto): Promise<boolean> {
    const { newPassword } = dto

    const user = await this.prisma.user.findFirst({
      where: {
        role: 'OWNER',
      },
    })

    if (!user) {
      throw new NotFoundException('Владелец не найден')
    }

    const hashedPassword = await argon2.hash(newPassword)

    await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        password: hashedPassword,
      },
    })

    return true
  }

  async findAllAdmins() {
    return this.prisma.user.findMany({
      where: {
        role: 'ADMIN',
      },
      select: {
        id: true,
        email: true,
        displayName: true,
      },
    })
  }

  async createAdminUser(dto: CreateUserDto): Promise<boolean> {
    const existingUser = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    })
    if (existingUser) {
      throw new ConflictException('Пользователь с таким email уже существует')
    }

    await this.userService.create({
      displayName: dto.displayName,
      email: dto.email,
      password: dto.password,
      picture: '',
      method: AuthMethod.CREDENTIALS,
      isVerified: true,
      role: 'ADMIN',
    })

    return true
  }

  async deleteAdminUser(userId: string): Promise<boolean> {
    const user = await this.authAdminService.findByIdAdmin(userId)
    if (!user) {
      throw new NotFoundException('Пользователь не найден')
    }

    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('Пользователь не является администратором')
    }

    await this.prisma.user.delete({
      where: {
        id: userId,
      },
    })

    return true
  }
}
