import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { Vehicle } from './entities/vehicle.entity';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehiclesRepo: Repository<Vehicle>,
  ) {}

  async create(dto: CreateVehicleDto): Promise<Vehicle> {
    const existing = await this.vehiclesRepo.findOneBy({ number: dto.number });
    if (existing) {
      throw new ConflictException(
        `Vehicle with number "${dto.number}" already exists`,
      );
    }

    const vehicle = this.vehiclesRepo.create(dto);
    return this.vehiclesRepo.save(vehicle);
  }

  findAll(): Promise<Vehicle[]> {
    return this.vehiclesRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Vehicle> {
    const vehicle = await this.vehiclesRepo.findOneBy({ id });
    if (!vehicle) {
      throw new NotFoundException(`Vehicle #${id} not found`);
    }
    return vehicle;
  }

  async update(id: string, dto: UpdateVehicleDto): Promise<Vehicle> {
    const vehicle = await this.findOne(id);

    if (dto.number && dto.number !== vehicle.number) {
      const conflict = await this.vehiclesRepo.findOneBy({ number: dto.number });
      if (conflict) {
        throw new ConflictException(
          `Vehicle with number "${dto.number}" already exists`,
        );
      }
    }

    Object.assign(vehicle, dto);
    return this.vehiclesRepo.save(vehicle);
  }

  async remove(id: string): Promise<void> {
    const vehicle = await this.findOne(id);
    await this.vehiclesRepo.remove(vehicle);
  }
}
