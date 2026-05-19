// events/voice/ds-bot-voice-event.service.ts

import { Injectable } from '@nestjs/common'
import { Client, Events } from 'discord.js'

import { DsBotVoiceActivityManager } from '@/app/admin/ds-bot/manager/voice-activity/ds-bot-voice-activity.manager.service'

@Injectable()
export class DsBotVoiceEventsService {
  constructor(
    private readonly voiceActivityManager: DsBotVoiceActivityManager,
  ) {}

  register(botId: string, client: Client) {
    client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
      await this.voiceActivityManager.handleVoiceStateUpdate(oldState, newState)
    })
  }
}
