// src\app\admin\ds-bot\api\dto\message\edit-ds-bot-message-log.dto.ts

import { IsEnum, IsNotEmpty } from 'class-validator'
import { SendMessageBlockType } from './send-ds-bot-message.dto'

export { SendMessageBlockType as EditMessageBlockType }

export class EditDsBotMessageLogDto {
  @IsEnum(SendMessageBlockType)
  type!: SendMessageBlockType

  @IsNotEmpty()
  content!: string | Record<string, unknown>
}
