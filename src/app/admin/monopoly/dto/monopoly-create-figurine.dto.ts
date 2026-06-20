import { Injectable } from '@nestjs/common'
import { IsNotEmpty, IsOptional, IsString } from 'class-validator'

@Injectable()
export class CreateMonopolyFigurineDto {
  @IsString()
  @IsNotEmpty()
  name!: string

  @IsString()
  @IsNotEmpty()
  url!: string

  @IsOptional()
  @IsString()
  collectionId?: string
}
