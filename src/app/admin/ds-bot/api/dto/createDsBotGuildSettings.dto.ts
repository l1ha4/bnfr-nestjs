import { IsBoolean, IsOptional } from 'class-validator'

export class UpdateDsBotGuildSettingsDto {

  @IsBoolean()
  messageModuleEnabled?: boolean


  @IsBoolean()
  autoRoleEnabled?: boolean


  @IsBoolean()
  tempVoiceEnabled?: boolean


  @IsBoolean()
  voiceActivityTrackingEnabled?: boolean
}