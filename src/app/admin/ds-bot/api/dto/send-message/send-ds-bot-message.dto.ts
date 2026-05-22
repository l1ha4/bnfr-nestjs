// api/dto/send-ds-bot-message.dto.ts

import {
  IsArray,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator'

export enum SendMessageBlockType {
  TEXT = 'text',
  EMBED = 'embed',
}

export class SendMessageBlockDto {
  @IsEnum(SendMessageBlockType)
  type!: SendMessageBlockType

  content!: string | Record<string, unknown>
}

export class SendDsBotMessageDto {
  @IsOptional()
  @IsString()
  connectionId?: string

  @IsOptional()
  @IsString()
  botId?: string

  @IsOptional()
  @IsString()
  guildId?: string

  @IsString()
  channelId!: string

  @IsString()
  createdById!: string

  @IsArray()
  blocks!: SendMessageBlockDto[]
}
