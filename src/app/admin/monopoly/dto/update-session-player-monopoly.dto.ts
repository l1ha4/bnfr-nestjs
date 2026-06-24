import { IsArray, IsInt, IsString, Min } from 'class-validator'

export class UpdateSessionPlayerMonopolyDto {
  @IsInt()
  @Min(0)
  money!: number

  @IsArray()
  @IsString({ each: true })
  ownedStreetCellTemplateIds!: string[]
}
