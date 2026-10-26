import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../entities/product.entity.js';
import { Purchase } from '../entities/purchase.entity.js';
import { Sale } from '../entities/sale.entity.js';
import { Stock } from '../entities/stock.entity.js';
import { Warehouse } from '../entities/warehouse.entity.js';

const LOW_STOCK_THRESHOLD = 5;

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Product)
    private readonly products: Repository<Product>,
    @InjectRepository(Warehouse)
    private readonly warehouses: Repository<Warehouse>,
    @InjectRepository(Stock)
    private readonly stocks: Repository<Stock>,
    @InjectRepository(Sale)
    private readonly sales: Repository<Sale>,
    @InjectRepository(Purchase)
    private readonly purchases: Repository<Purchase>,
  ) {}

  async summary() {
    const [
      productCount,
      warehouseCount,
      stocks,
      recentSales,
      recentPurchases,
      salesSum,
      purchaseSum,
    ] = await Promise.all([
      this.products.count(),
      this.warehouses.count(),
      this.stocks.find({ relations: ['product', 'warehouse'] }),
      this.sales.find({
        relations: ['product', 'warehouse'],
        order: { createdAt: 'DESC' },
        take: 5,
      }),
      this.purchases.find({
        relations: ['product', 'warehouse'],
        order: { createdAt: 'DESC' },
        take: 5,
      }),
      this.sales
        .createQueryBuilder('sale')
        .select('COALESCE(SUM(sale.total), 0)', 'sum')
        .getRawOne<{ sum: string }>(),
      this.purchases
        .createQueryBuilder('purchase')
        .select('COALESCE(SUM(purchase.total), 0)', 'sum')
        .getRawOne<{ sum: string }>(),
    ]);

    const unitsOnHand = stocks.reduce((sum, row) => sum + row.quantity, 0);
    const lowStock = stocks
      .filter((row) => row.quantity < LOW_STOCK_THRESHOLD)
      .sort((a, b) => a.quantity - b.quantity);

    return {
      productCount,
      warehouseCount,
      unitsOnHand,
      lowStockCount: lowStock.length,
      salesTotal: Number(salesSum?.sum ?? 0),
      purchaseTotal: Number(purchaseSum?.sum ?? 0),
      lowStock,
      recentSales,
      recentPurchases,
    };
  }
}
