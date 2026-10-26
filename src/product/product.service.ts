import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../entities/product.entity.js';
import { Purchase } from '../entities/purchase.entity.js';
import { Sale } from '../entities/sale.entity.js';
import { Stock } from '../entities/stock.entity.js';

export type ProductInput = {
  sku?: string;
  name?: string;
  description?: string;
  unitPrice?: number;
  costPrice?: number;
};

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly products: Repository<Product>,
    @InjectRepository(Stock)
    private readonly stocks: Repository<Stock>,
    @InjectRepository(Sale)
    private readonly sales: Repository<Sale>,
    @InjectRepository(Purchase)
    private readonly purchases: Repository<Purchase>,
  ) {}

  async findAll() {
    const [items, stocks] = await Promise.all([
      this.products.find({ order: { name: 'ASC' } }),
      this.stocks.find(),
    ]);
    return items.map((product) => ({
      ...product,
      totalQuantity: stocks
        .filter((row) => row.productId === product.id)
        .reduce((sum, row) => sum + row.quantity, 0),
    }));
  }

  async findOne(id: number) {
    const product = await this.products.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    const rows = await this.stocks.find({
      where: { productId: id },
      relations: ['warehouse'],
    });
    const totalQuantity = rows.reduce((sum, row) => sum + row.quantity, 0);
    return { ...product, totalQuantity, stocks: rows };
  }

  async create(input: ProductInput) {
    const sku = input.sku?.trim();
    const name = input.name?.trim();
    if (!sku || !name) {
      throw new BadRequestException('SKU and name are required');
    }
    const existing = await this.products.findOne({ where: { sku } });
    if (existing) {
      throw new BadRequestException('A product with this SKU already exists');
    }
    const product = this.products.create({
      sku,
      name,
      description: input.description?.trim() ?? '',
      unitPrice: Number(input.unitPrice ?? 0),
      costPrice: Number(input.costPrice ?? 0),
    });
    return this.products.save(product);
  }

  async update(id: number, input: ProductInput) {
    const product = await this.products.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    if (input.sku !== undefined) {
      const sku = input.sku.trim();
      if (!sku) throw new BadRequestException('SKU is required');
      const existing = await this.products.findOne({ where: { sku } });
      if (existing && existing.id !== id) {
        throw new BadRequestException('A product with this SKU already exists');
      }
      product.sku = sku;
    }
    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) throw new BadRequestException('Name is required');
      product.name = name;
    }
    if (input.description !== undefined) {
      product.description = input.description.trim();
    }
    if (input.unitPrice !== undefined) product.unitPrice = Number(input.unitPrice);
    if (input.costPrice !== undefined) product.costPrice = Number(input.costPrice);
    return this.products.save(product);
  }

  async remove(id: number) {
    const product = await this.products.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    const [saleCount, purchaseCount] = await Promise.all([
      this.sales.count({ where: { productId: id } }),
      this.purchases.count({ where: { productId: id } }),
    ]);
    if (saleCount > 0 || purchaseCount > 0) {
      throw new BadRequestException(
        'Cannot delete a product that already has sales or purchases',
      );
    }
    await this.stocks.delete({ productId: id });
    await this.products.delete(id);
    return { ok: true };
  }
}
