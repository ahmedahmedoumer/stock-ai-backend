import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Product } from '../entities/product.entity.js';
import { Sale } from '../entities/sale.entity.js';
import { Warehouse } from '../entities/warehouse.entity.js';
import { StockService } from '../stock/stock.service.js';

export type SaleInput = {
  productId?: number;
  warehouseId?: number;
  quantity?: number;
  unitPrice?: number;
  customerName?: string;
};

@Injectable()
export class SaleService {
  constructor(
    @InjectRepository(Sale)
    private readonly sales: Repository<Sale>,
    private readonly dataSource: DataSource,
    private readonly stockService: StockService,
  ) {}

  findAll() {
    return this.sales.find({
      relations: ['product', 'warehouse'],
      order: { createdAt: 'DESC' },
    });
  }

  async create(input: SaleInput) {
    const productId = Number(input.productId);
    const warehouseId = Number(input.warehouseId);
    const quantity = Number(input.quantity);
    if (!productId || !warehouseId) {
      throw new BadRequestException('Product and warehouse are required');
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new BadRequestException('Quantity must be a positive whole number');
    }

    const saleId = await this.dataSource.transaction(async (manager) => {
      const product = await manager.findOne(Product, { where: { id: productId } });
      if (!product) throw new NotFoundException('Product not found');
      const warehouse = await manager.findOne(Warehouse, {
        where: { id: warehouseId },
      });
      if (!warehouse) throw new NotFoundException('Warehouse not found');

      const adjusted = await this.stockService.adjust(
        manager,
        productId,
        warehouseId,
        -quantity,
      );
      if (!adjusted.ok) {
        throw new BadRequestException(
          'Not enough stock in this warehouse for that quantity',
        );
      }

      const unitPrice =
        input.unitPrice === undefined || input.unitPrice === null
          ? product.unitPrice
          : Number(input.unitPrice);
      const sale = manager.create(Sale, {
        productId,
        warehouseId,
        quantity,
        unitPrice,
        total: unitPrice * quantity,
        customerName: input.customerName?.trim() ?? '',
      });
      const saved = await manager.save(sale);
      return saved.id;
    });

    return this.sales.findOne({
      where: { id: saleId },
      relations: ['product', 'warehouse'],
    });
  }
}
