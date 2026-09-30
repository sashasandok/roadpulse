import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class CreateVehicleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @Matches(/^[A-Z0-9 -]+$/i, {
    message: 'number must contain only letters, digits, spaces or dashes',
  })
  number!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  model!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  driver!: string;
}
