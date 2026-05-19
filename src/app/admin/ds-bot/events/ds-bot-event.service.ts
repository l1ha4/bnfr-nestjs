import { Injectable } from '@nestjs/common'
import { Client } from 'discord.js'

import { DsBotGuildEventsService } from './guild/ds-bot-guild-event.service'
import { DsBotMemberEventsService } from './member/ds-bot-member-event.service'
import { DsBotRoleEventsService } from './role/ds-bot-role-event.service'
import { DsBotChannelEventsService } from './channel/ds-bot-channel-event.service'
import { DsBotVoiceEventsService } from './voice/ds-bot-voice-event.service'

@Injectable()
export class DsBotEventsService {
  constructor(
    private readonly guildEvents: DsBotGuildEventsService,
    private readonly memberEvents: DsBotMemberEventsService,
    private readonly roleEvents: DsBotRoleEventsService,
    private readonly channelEvents: DsBotChannelEventsService,
    private readonly voiceEvents: DsBotVoiceEventsService,
  ) {}

  register(botId: string, client: Client) {
    this.guildEvents.register(botId, client)
    this.memberEvents.register(botId, client)
    this.roleEvents.register(botId, client)
    this.channelEvents.register(botId, client)
    this.voiceEvents.register(botId, client)
  }
}
