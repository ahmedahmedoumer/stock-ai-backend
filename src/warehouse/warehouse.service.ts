import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Purchase } from '../entities/purchase.entity.js';
import { Sale } from '../entities/sale.entity.js';
import { Stock } from '../entities/stock.entity.js';
import { Warehouse } from '../entities/warehouse.entity.js';

export type WarehouseInput = {
  name?: string;
  location?: string;
};

@Injectable()
export class WarehouseService {
  constructor(
    @InjectRepository(Warehouse)
    private readonly warehouses: Repository<Warehouse>,
    @InjectRepository(Stock)
    private readonly stocks: Repository<Stock>,
    @InjectRepository(Sale)
    private readonly sales: Repository<Sale>,
    @InjectRepository(Purchase)
    private readonly purchases: Repository<Purchase>,
  ) {}

  async findAll() {
    const [items, stocks] = await Promise.all([
      this.warehouses.find({ order: { name: 'ASC' } }),
      this.stocks.find(),
    ]);
    return items.map((warehouse) => ({
      ...warehouse,
      totalQuantity: stocks
        .filter((row) => row.warehouseId === warehouse.id)
        .reduce((sum, row) => sum + row.quantity, 0),
    }));
  }

  async findOne(id: number) {
    const warehouse = await this.warehouses.findOne({ where: { id } });
    if (!warehouse) throw new NotFoundException('Warehouse not found');
    const rows = await this.stocks.find({
      where: { warehouseId: id },
      relations: ['product'],
    });
    const totalQuantity = rows.reduce((sum, row) => sum + row.quantity, 0);
    return { ...warehouse, totalQuantity, stocks: rows };
  }

  async create(input: WarehouseInput) {
    const name = input.name?.trim();
    if (!name) throw new BadRequestException('Name is required');
    const warehouse = this.warehouses.create({
      name,
      location: input.location?.trim() ?? '',
    });
    return this.warehouses.save(warehouse);
  }

  async update(id: number, input: WarehouseInput) {
    const warehouse = await this.warehouses.findOne({ where: { id } });
    if (!warehouse) throw new NotFoundException('Warehouse not found');
    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) throw new BadRequestException('Name is required');
      warehouse.name = name;
    }
    if (input.location !== undefined) {
      warehouse.location = input.location.trim();
    }
    return this.warehouses.save(warehouse);
  }

  async remove(id: number) {
    const warehouse = await this.warehouses.findOne({ where: { id } });
    if (!warehouse) throw new NotFoundException('Warehouse not found');
    const [saleCount, purchaseCount] = await Promise.all([
      this.sales.count({ where: { warehouseId: id } }),
      this.purchases.count({ where: { warehouseId: id } }),
    ]);
    if (saleCount > 0 || purchaseCount > 0) {
      throw new BadRequestException(
        'Cannot delete a warehouse that already has sales or purchases',
      );
    }
    await this.stocks.delete({ warehouseId: id });
    await this.warehouses.delete(id);
    return { ok: true };
  }
}
