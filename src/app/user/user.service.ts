import { PrismaService } from '@/core/prisma/prisma.service'
import { Injectable } from '@nestjs/common'
import { CreateUserDto } from './dto/createUser.dto'
import { hash } from 'argon2'

@Injectable()
export class UserService {
  public constructor(private readonly prisma: PrismaService) {}

  public async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id,
      },
      include: {
        accounts: true,
      },
    })
    if (!user) {
      throw new Error(`Пользователь не найден`)
    }

    const { password, ...result } = user
    return result
  }

  public async findByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
      include: {
        accounts: true,
      },
    })

    return user
  }

  public async create(dto: CreateUserDto) {
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: dto.password ? await hash(dto.password) : '',
        displayName: dto.displayName,
        picture: dto.picture,
        method: dto.method,
        isVerified: dto.isVerified,
        role: dto.role ? dto.role : 'REGULAR',
      },
      include: {
        accounts: true,
      },
    })

    return user
  }
}
