// sync/role/ds-guild-role.sync.service.ts

import { Injectable, Logger } from '@nestjs/common'
import { Guild, Role } from 'discord.js'

import { PrismaService } from '@/core/prisma/prisma.service'

@Injectable()
export class DsGuildRoleSyncService {
  private readonly logger = new Logger(DsGuildRoleSyncService.name)

  constructor(private readonly prisma: PrismaService) {}

  async syncGuildRoles(guildDbId: string, guild: Guild) {
    const roles = await guild.roles.fetch()

    this.logger.log(`Sync ${roles.size} roles from guild: ${guild.name}`)

    for (const role of roles.values()) {
      await this.upsertGuildRole(guildDbId, role)
    }
  }

  async upsertGuildRole(guildDbId: string, role: Role) {
    return this.prisma.dsGuildRole.upsert({
      where: {
        guildDbId_roleId: {
          guildDbId,
          roleId: role.id,
        },
      },
      update: {
        name: role.name,
        color: role.color,
        position: role.position,
        isManaged: role.managed,
        isActive: true,
      },
      create: {
        guildDbId,
        roleId: role.id,
        name: role.name,
        color: role.color,
        position: role.position,
        isManaged: role.managed,
        isActive: true,
      },
    })
  }

  async markGuildRoleAsInactive(guildDbId: string, roleId: string) {
    return this.prisma.dsGuildRole.update({
      where: {
        guildDbId_roleId: {
          guildDbId,
          roleId,
        },
      },
      data: {
        isActive: false,
      },
    })
  }
}