import { AuthMethod } from '@prisma/client'
import { IsBoolean, IsNotEmpty, IsString } from 'class-validator'

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  email!: string

  @IsString()
  @IsNotEmpty()
  password!: string

  @IsString()
  @IsNotEmpty()
  displayName!: string

  @IsString()
  @IsNotEmpty()
  picture!: string

  @IsString()
  @IsNotEmpty()
  method!: AuthMethod

  @IsBoolean()
  isVerified!: boolean
}
