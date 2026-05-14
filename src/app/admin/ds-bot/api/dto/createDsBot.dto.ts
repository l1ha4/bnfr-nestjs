import { IsNotEmpty, IsString } from 'class-validator'

export class CreateDsBotDto {
  @IsString()
  @IsNotEmpty()
  secretTokenBot!: string
}
