import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Product } from '../entities/product.entity.js';
import { Purchase } from '../entities/purchase.entity.js';
import { Warehouse } from '../entities/warehouse.entity.js';
import { StockService } from '../stock/stock.service.js';

export type PurchaseInput = {
  productId?: number;
  warehouseId?: number;
  quantity?: number;
  unitCost?: number;
  supplierName?: string;
};

@Injectable()
export class PurchaseService {
  constructor(
    @InjectRepository(Purchase)
    private readonly purchases: Repository<Purchase>,
    private readonly dataSource: DataSource,
    private readonly stockService: StockService,
  ) {}

  findAll() {
    return this.purchases.find({
      relations: ['product', 'warehouse'],
      order: { createdAt: 'DESC' },
    });
  }

  async create(input: PurchaseInput) {
    const productId = Number(input.productId);
    const warehouseId = Number(input.warehouseId);
    const quantity = Number(input.quantity);
    if (!productId || !warehouseId) {
      throw new BadRequestException('Product and warehouse are required');
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new BadRequestException('Quantity must be a positive whole number');
    }

    const purchaseId = await this.dataSource.transaction(async (manager) => {
      const product = await manager.findOne(Product, { where: { id: productId } });
      if (!product) throw new NotFoundException('Product not found');
      const warehouse = await manager.findOne(Warehouse, {
        where: { id: warehouseId },
      });
      if (!warehouse) throw new NotFoundException('Warehouse not found');

      await this.stockService.adjust(manager, productId, warehouseId, quantity);

      const unitCost =
        input.unitCost === undefined || input.unitCost === null
          ? product.costPrice
          : Number(input.unitCost);
      const purchase = manager.create(Purchase, {
        productId,
        warehouseId,
        quantity,
        unitCost,
        total: unitCost * quantity,
        supplierName: input.supplierName?.trim() ?? '',
      });
      const saved = await manager.save(purchase);
      return saved.id;
    });

    return this.purchases.findOne({
      where: { id: purchaseId },
      relations: ['product', 'warehouse'],
    });
  }
}
