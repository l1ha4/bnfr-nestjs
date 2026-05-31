import { IsBoolean } from "class-validator";

export class UpdateRegistrationSettingsDto {
  @IsBoolean()
  isRegistrationEnabled!: boolean
}