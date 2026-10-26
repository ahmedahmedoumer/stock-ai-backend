import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Stock } from '../entities/stock.entity.js';

@Injectable()
export class StockService {
  constructor(
    @InjectRepository(Stock)
    private readonly stocks: Repository<Stock>,
  ) {}

  findAll() {
    return this.stocks.find({
      relations: ['product', 'warehouse'],
      order: { id: 'ASC' },
    });
  }

  async adjust(
    manager: EntityManager,
    productId: number,
    warehouseId: number,
    delta: number,
  ) {
    let stock = await manager.findOne(Stock, {
      where: { productId, warehouseId },
    });
    if (!stock) {
      stock = manager.create(Stock, { productId, warehouseId, quantity: 0 });
    }
    const next = stock.quantity + delta;
    if (next < 0) {
      return { ok: false as const, stock };
    }
    stock.quantity = next;
    await manager.save(stock);
    return { ok: true as const, stock };
  }
}
