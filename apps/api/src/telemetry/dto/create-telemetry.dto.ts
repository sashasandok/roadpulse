import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateTelemetryDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsUUID()
  @IsNotEmpty()
  vehicleId!: string;

  @ApiProperty({ example: 50.4501, minimum: -90, maximum: 90 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @ApiProperty({ example: 30.5234, minimum: -180, maximum: 180 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @ApiProperty({ description: 'Speed in km/h', example: 72.5, minimum: 0, maximum: 500 })
  @IsNumber()
  @Min(0)
  @Max(500)
  speed!: number;

  @ApiProperty({ description: 'Fuel level 0–100 %', example: 63.2, minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  fuel!: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  ignition!: boolean;

  @ApiPropertyOptional({
    description: 'ISO 8601 device timestamp; defaults to server receive time',
    example: '2026-09-30T11:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  recordedAt?: string;
}
