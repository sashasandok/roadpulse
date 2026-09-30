import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Vehicle } from '../../vehicles/entities/vehicle.entity';

export enum AlertType {
  SPEEDING = 'SPEEDING',
  GEOFENCE = 'GEOFENCE',
  IDLE_ENGINE = 'IDLE_ENGINE',
  LOW_FUEL = 'LOW_FUEL',
}

@Entity('alerts')
@Index(['vehicle', 'createdAt'])
export class Alert {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Vehicle, { onDelete: 'CASCADE' })
  vehicle!: Vehicle;

  @Column({ type: 'varchar', length: 20 })
  type!: AlertType;

  @Column({ type: 'text' })
  message!: string;

  @Column({ default: false })
  isRead!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
