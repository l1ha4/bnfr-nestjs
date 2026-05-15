import { DsBotSyncService } from './ds-bot.sync.service'
import { DsBotGuildConnectionSyncService } from './ds-bot/ds-bot-guild-connection.sync.service'
import { DsBotProfileSyncService } from './ds-bot/ds-bot-profile.sync.service'
import { DsGuildSyncService } from './guild/ds-guild.sync.service'
import { DsGuildMemberSyncService } from './member/ds-guild-member.sync.service'
import { DsUserSyncService } from './member/ds-user.sync.service'
import { DsGuildRoleSyncService } from './role/ds-guild-role.sync.service'
import { DsGuildChannelSyncService } from './channel/ds-guild-channel.sync.service'



export const dsBotSyncProviders = [
  DsBotSyncService,
  DsBotGuildConnectionSyncService,
  DsBotProfileSyncService,
  DsGuildSyncService,
  DsGuildMemberSyncService,
  DsUserSyncService,
  DsGuildRoleSyncService,
  DsGuildChannelSyncService,
]
