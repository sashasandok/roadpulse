import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Vehicle } from '../../vehicles/entities/vehicle.entity';

@Entity('telemetry_points')
@Index(['vehicle', 'recordedAt'])
export class TelemetryEntry {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ type: () => Vehicle })
  @ManyToOne(() => Vehicle, { onDelete: 'CASCADE', nullable: false })
  vehicle!: Vehicle;

  @ApiProperty({ example: 50.4501 })
  @Column('decimal', { precision: 9, scale: 6 })
  latitude!: number;

  @ApiProperty({ example: 30.5234 })
  @Column('decimal', { precision: 9, scale: 6 })
  longitude!: number;

  @ApiProperty({ description: 'Speed in km/h', example: 72.5 })
  @Column('decimal', { precision: 6, scale: 2 })
  speed!: number;

  @ApiProperty({ description: 'Fuel level 0–100 %', example: 63.2 })
  @Column('decimal', { precision: 5, scale: 2 })
  fuel!: number;

  @ApiProperty({ example: true })
  @Column('boolean')
  ignition!: boolean;

  @ApiProperty({ description: 'Timestamp from the GPS device', example: '2026-09-30T11:00:00Z' })
  @Column({ name: 'recorded_at', type: 'timestamptz' })
  recordedAt!: Date;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
