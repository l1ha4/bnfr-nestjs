import { Injectable } from '@nestjs/common'
import { IsNotEmpty, IsString, Matches } from 'class-validator'

@Injectable()
export class CreateMonopolyPlayerColorDto {
  @IsString()
  @IsNotEmpty()
  name!: string

  @IsString()
  @Matches(/^#([A-Fa-f0-9]{6})$/, {
    message: 'hexCode must be a valid HEX color like #RRGGBB',
  })
  hexCode!: string
}
