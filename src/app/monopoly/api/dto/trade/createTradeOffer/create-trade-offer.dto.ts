import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator'

export class CreateTradeOfferDto {
  @IsUUID()
  toUserId!: string

  @IsOptional()
  @IsInt()
  @Min(0)
  giveMoney?: number

  @IsOptional()
  @IsInt()
  @Min(0)
  getMoney?: number

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  giveStreetCellTemplateIds?: string[]

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  getStreetCellTemplateIds?: string[]
}