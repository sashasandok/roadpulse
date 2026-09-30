import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Vehicle } from '../../vehicles/entities/vehicle.entity';

@Entity('telemetry_entries')
@Index(['vehicle', 'recordedAt'])
export class TelemetryEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Vehicle, { onDelete: 'CASCADE', nullable: false })
  vehicle!: Vehicle;

  @Column('decimal', { precision: 9, scale: 6 })
  latitude!: number;

  @Column('decimal', { precision: 9, scale: 6 })
  longitude!: number;

  /** Speed in km/h */
  @Column('decimal', { precision: 6, scale: 2 })
  speed!: number;

  /** Fuel level 0–100 % */
  @Column('decimal', { precision: 5, scale: 2 })
  fuel!: number;

  @Column('boolean')
  ignition!: boolean;

  /** Timestamp from the GPS device; defaults to server receive time */
  @Column({ name: 'recorded_at', type: 'timestamptz' })
  recordedAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
