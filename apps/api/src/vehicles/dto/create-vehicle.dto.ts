import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class CreateVehicleDto {
  @ApiProperty({ example: 'AA 1234 BB', maxLength: 20 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @Matches(/^[A-Z0-9 -]+$/i, {
    message: 'number must contain only letters, digits, spaces or dashes',
  })
  number!: string;

  @ApiProperty({ example: 'Mercedes Sprinter', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  model!: string;

  @ApiProperty({ example: 'John Doe', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  driver!: string;
}
