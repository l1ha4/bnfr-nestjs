import { CreateUserDto } from '@/app/user/dto/createUser.dto'
import { UserService } from '@/app/user/user.service'
import { PrismaService } from '@/core/prisma/prisma.service'
import { ConflictException, Injectable } from '@nestjs/common'
import { AuthMethod, UserRole } from '@prisma/client'

@Injectable()
export class AdminService {
  public constructor(
    private readonly userService: UserService,
    private readonly prisma: PrismaService,
  ) {}

  public async createUser(dto: CreateUserDto): Promise<boolean> {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        email: dto.email,
        role: UserRole.REGULAR,
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
      role: UserRole.REGULAR,
    })

    return true
  }
}
