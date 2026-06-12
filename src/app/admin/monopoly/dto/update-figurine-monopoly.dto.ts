import { Injectable } from '@nestjs/common'
import { IsNotEmpty, IsOptional, IsString } from 'class-validator'

@Injectable()
export class UpdateMonopolyFigurineDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  url?: string

  @IsOptional()
  @IsString()
  collectionId?: string
}
