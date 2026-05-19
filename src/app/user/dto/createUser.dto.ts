import { AuthMethod, UserRole } from '@prisma/client'
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator'

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

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  picture!: string

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  method!: AuthMethod

  @IsOptional()
  @IsBoolean()
  isVerified!: boolean

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  role!: UserRole
}
