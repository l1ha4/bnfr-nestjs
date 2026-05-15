import { DsBotChannelEventsService } from './channel/ds-bot-channel-event.service'
import { DsBotEventsService } from './ds-bot-event.service'
import { DsBotGuildEventsService } from './guild/ds-bot-guild-event.service'
import { DsBotMemberEventsService } from './member/ds-bot-member-event.service'
import { DsBotRoleEventsService } from './role/ds-bot-role-event.service'

export const dsBotEventProviders = [
  DsBotEventsService,
  DsBotGuildEventsService,
  DsBotMemberEventsService,
  DsBotRoleEventsService,
  DsBotChannelEventsService,
]
