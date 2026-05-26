import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common'
import { DsBotService } from './ds-bot.service'
import { CreateDsBotDto } from './dto/createBot/createDsBot.dto'
import { SetDsBotEnabledDto } from './dto/enabled/setDsBotEnabled.dto'
import { UpdateDsBotGuildSettingsDto } from './dto/patchSettings/createDsBotGuildSettings.dto'
import { SendDsBotMessageDto } from './dto/send-message/send-ds-bot-message.dto'
import { Authorization } from '@/app/auth/decorators/auth.decorators'
import { UserRole } from '@prisma/client'

@Controller()
export class DsBotController {
  constructor(private readonly dsBotService: DsBotService) {}

  @Post('messages/send')
  sendMessage(@Body() dto: SendDsBotMessageDto) {
    return this.dsBotService.sendMessage(dto)
  }

  @Get('all-text-channels/:botId/:guildId')
  allTextChannels(
    @Param('botId') botId: string,
    @Param('guildId') guildId: string,
  ) {
    return this.dsBotService.findAllTextChannelsGuild(botId, guildId)
  }

  @Get('all-members/:botId/:guildId')
  allMembers(@Param('botId') botId: string, @Param('guildId') guildId: string) {
    return this.dsBotService.findAllGuildMembers(botId, guildId)
  }

  @Get('all-guilds/:id')
  allGuilds(@Param('id') id: string) {
    return this.dsBotService.findAllGuilds(id)
  }

  @Patch('settings/:connectionId')
  updateGuildSettings(
    @Param('connectionId') connectionId: string,
    @Body() dto: UpdateDsBotGuildSettingsDto,
  ) {
    return this.dsBotService.updateGuildSettingsByConnectionId(
      connectionId,
      dto,
    )
  }

  @Get('settings/:connectionId')
  getGuildSettings(@Param('connectionId') connectionId: string) {
    return this.dsBotService.getGuildSettingsByConnectionId(connectionId)
  }

  @Get('message-logs/:connectionId')
  getMessageLogHistory(@Param('connectionId') connectionId: string) {
    return this.dsBotService.getMessageLogHistoryByConnectionId(connectionId)
  }

  @Get('all')
  all() {
    return this.dsBotService.findAll()
  }

  @Authorization(UserRole.OWNER)
  @Post('add')
  add(@Body() dto: CreateDsBotDto) {
    return this.dsBotService.add(dto)
  }

  @Get('enabled/:id')
  getEnabled(@Param('id') id: string) {
    return this.dsBotService.getEnabled(id)
  }

  @Patch('enabled/:id')
  setEnabled(@Param('id') id: string, @Body() dto: SetDsBotEnabledDto) {
    return this.dsBotService.setEnabled(id, dto.isEnabled)
  }

  @Delete('delete/:id')
  delete(@Param('id') id: string) {
    return this.dsBotService.delete(id)
  }
}
