import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../entities/product.entity.js';
import { Purchase } from '../entities/purchase.entity.js';
import { Sale } from '../entities/sale.entity.js';
import { Stock } from '../entities/stock.entity.js';
import { ProductController } from './product.controller.js';
import { ProductService } from './product.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Stock, Sale, Purchase])],
  controllers: [ProductController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}
