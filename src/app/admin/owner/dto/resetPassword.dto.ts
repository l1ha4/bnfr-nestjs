import { IsNotEmpty, IsString } from 'class-validator'

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  ownerPassword!: string
  @IsString()
  @IsNotEmpty()
  newPassword!: string
}
