import { Injectable, Logger } from '@nestjs/common'
import { Guild, GuildMember } from 'discord.js'

import { PrismaService } from '@/core/prisma/prisma.service'
import { DsUserSyncService } from './ds-user.sync.service'

@Injectable()
export class DsGuildMemberSyncService {
  private readonly logger = new Logger(DsGuildMemberSyncService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly userSync: DsUserSyncService,
  ) {}

  async syncGuildMembers(guildDbId: string, guild: Guild) {
    const members = await guild.members.fetch()

    this.logger.log(`Sync ${members.size} members from guild: ${guild.name}`)

    for (const member of members.values()) {
      await this.upsertGuildMember(guildDbId, member)
    }
  }

  async upsertGuildMember(guildDbId: string, member: GuildMember) {
  const userRecord = await this.userSync.upsertUser(member.user)

  const memberRecord = await this.prisma.dsGuildMember.upsert({
    where: {
      guildDbId_userDbId: {
        guildDbId,
        userDbId: userRecord.id,
      },
    },
    update: {
      displayName: member.displayName,
      isActive: true,
      joinedAt: member.joinedAt,
    },
    create: {
      guildDbId,
      userDbId: userRecord.id,
      displayName: member.displayName,
      isActive: true,
      joinedAt: member.joinedAt,
    },
  })

  const roleIds = member.roles.cache
    .filter(role => role.id !== member.guild.id)
    .map(role => role.id)

  await this.syncMemberRoles(
    memberRecord.id,
    guildDbId,
    roleIds,
  )

  return memberRecord
}

  async markGuildMemberAsInactive(guildDbId: string, userId: string) {
    const userRecord = await this.prisma.dsUser.findUnique({
      where: {
        userId,
      },
    })

    if (!userRecord) return null

    return this.prisma.dsGuildMember.update({
      where: {
        guildDbId_userDbId: {
          guildDbId,
          userDbId: userRecord.id,
        },
      },
      data: {
        isActive: false,
      },
    })
  }

  async syncMemberRoles(memberDbId: string, guildDbId: string, discordRoleIds: string[]) {
  const roles = await this.prisma.dsGuildRole.findMany({
    where: {
      guildDbId,
      roleId: {
        in: discordRoleIds,
      },
      isActive: true,
    },
  })

  await this.prisma.dsGuildMemberRole.deleteMany({
    where: {
      memberId: memberDbId,
    },
  })

  if (!roles.length) return

  await this.prisma.dsGuildMemberRole.createMany({
    data: roles.map(role => ({
      memberId: memberDbId,
      roleId: role.id,
    })),
    skipDuplicates: true,
  })
}
}