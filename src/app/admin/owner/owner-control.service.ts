import { CreateUserDto } from '@/app/user/dto/createUser.dto'
import { UserService } from '@/app/user/user.service'
import { PrismaService } from '@/core/prisma/prisma.service'
import { Injectable } from '@nestjs/common'
import { AuthMethod } from '@prisma/client'
import e from 'express'

@Injectable()
export class OwnerControlService {
  public constructor(
    private readonly userService: UserService,
    private readonly prisma: PrismaService,
  ) {}

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
    const existingUser = await this.userService.findByEmail(dto.email)
    if (existingUser) {
      throw new Error('Пользователь с таким email уже существует')
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
    const user = await this.userService.findById(userId)
    if (!user) {
      throw new Error('Пользователь не найден')
    }

    if (user.role !== 'ADMIN') {
      throw new Error('Пользователь не является администратором')
    }

    await this.prisma.user.delete({
      where: {
        id: userId,
      },
    })

    return true
  }
}
