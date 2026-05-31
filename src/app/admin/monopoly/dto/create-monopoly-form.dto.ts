import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator'

export class CreateMonopolyFormDto {
  @IsString()
  @IsNotEmpty()
  name!: string

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string

  @IsArray()
  field!: unknown[]

  @IsArray()
  collectionsStreet!: unknown[]

  @IsArray()
  events!: unknown[]

  @IsInt()
  @Min(1)
  fieldWidthCells!: number

  @IsInt()
  @Min(1)
  fieldHeightCells!: number

  @IsInt()
  @Min(0)
  moneyPerLap!: number

  @IsInt()
  @Min(1)
  minPlayers!: number

  @IsInt()
  @Min(1)
  maxPlayers!: number

  @IsInt()
  @Min(0)
  startMoney!: number
}
