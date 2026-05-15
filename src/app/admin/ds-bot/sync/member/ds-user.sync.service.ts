import { Injectable } from '@nestjs/common'
import { User } from 'discord.js'

import { PrismaService } from '@/core/prisma/prisma.service'

@Injectable()
export class DsUserSyncService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertUser(user: User) {
    return this.prisma.dsUser.upsert({
      where: {
        userId: user.id,
      },
      update: {
        username: user.username,
        globalName: user.globalName,
        avatarUrl: user.displayAvatarURL({
          extension: 'png',
          size: 256,
        }),
        isBot: user.bot,
      },
      create: {
        userId: user.id,
        username: user.username,
        globalName: user.globalName,
        avatarUrl: user.displayAvatarURL({
          extension: 'png',
          size: 256,
        }),
        isBot: user.bot,
      },
    })
  }
}