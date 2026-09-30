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
  @IsUUID()
  @IsNotEmpty()
  vehicleId!: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  /** Speed in km/h */
  @IsNumber()
  @Min(0)
  @Max(500)
  speed!: number;

  /** Fuel level 0–100 % */
  @IsNumber()
  @Min(0)
  @Max(100)
  fuel!: number;

  @IsBoolean()
  ignition!: boolean;

  /** ISO 8601 timestamp from the device; falls back to server time if omitted */
  @IsOptional()
  @IsDateString()
  recordedAt?: string;
}
