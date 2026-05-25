import { IsBoolean, IsOptional } from 'class-validator'

export class UpdateDsBotGuildSettingsDto {
  @IsOptional()
  @IsBoolean()
  messageModuleEnabled?: boolean

  @IsOptional()
  @IsBoolean()
  autoRoleEnabled?: boolean

  @IsOptional()
  @IsBoolean()
  tempVoiceEnabled?: boolean

  @IsOptional()
  @IsBoolean()
  voiceActivityTrackingEnabled?: boolean
}
