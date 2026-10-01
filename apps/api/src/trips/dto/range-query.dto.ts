import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class RangeQueryDto {
  @ApiProperty({ example: '2026-10-01T00:00:00Z' })
  @IsDateString()
  from!: string;

  @ApiProperty({ example: '2026-10-02T00:00:00Z' })
  @IsDateString()
  to!: string;
}
