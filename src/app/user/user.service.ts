import { PrismaService } from '@/core/prisma/prisma.service'
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { CreateUserDto } from './dto/createUser.dto'
import { hash } from 'argon2'
import { UserRole } from '@prisma/client'

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
      throw new NotFoundException(`Пользователь не найден`)
    }
    if (user.role !== UserRole.REGULAR) {
      throw new ForbiddenException('Пользователь не является REGULAR')
    }

    const { password, ...result } = user
    return result
  }

  public async findByEmail(email: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        email,
        role: UserRole.REGULAR,
      },
      include: {
        accounts: true,
      },
    })

    if (user?.role !== UserRole.REGULAR) {
      throw new ForbiddenException('Пользователь не является REGULAR')
    }

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
        role: dto.role ? dto.role : UserRole.REGULAR,
      },
      include: {
        accounts: true,
      },
    })

    return user
  }
}
