import { IsBoolean } from 'class-validator'

export class SetDsBotEnabledDto {
  @IsBoolean()
  isEnabled!: boolean
}
