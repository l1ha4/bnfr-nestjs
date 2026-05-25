import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as argon2 from 'argon2'

import { PrismaService } from '@/core/prisma/prisma.service'
import { AuthMethod, UserRole } from '@prisma/client'


@Injectable()
export class OwnerSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(OwnerSeedService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    
  ) {}

  async onApplicationBootstrap() {
    const email = this.config.getOrThrow<string>('OWNER_EMAIL')
    const password = this.config.getOrThrow<string>('OWNER_PASSWORD')
    const displayName = this.config.get<string>('OWNER_DISPLAY_NAME') ?? 'Owner'

    const existingOwner = await this.prisma.user.findFirst({
      where: {
        role: UserRole.OWNER,
      },
    })

    if (existingOwner) {
      this.logger.log('Owner already exists')
      return
    }

    const hashedPassword = await argon2.hash(password)

    await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        displayName,
        role: UserRole.OWNER,
        isVerified: true,
        method: AuthMethod.CREDENTIALS
      },
    })  

    this.logger.log(`Owner account created: ${email}`)
  }
}
