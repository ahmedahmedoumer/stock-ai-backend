import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../entities/product.entity.js';
import { Purchase } from '../entities/purchase.entity.js';
import { Sale } from '../entities/sale.entity.js';
import { Stock } from '../entities/stock.entity.js';
import { Warehouse } from '../entities/warehouse.entity.js';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Warehouse, Stock, Sale, Purchase]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
