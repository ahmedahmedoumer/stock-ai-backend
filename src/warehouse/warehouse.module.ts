import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Purchase } from '../entities/purchase.entity.js';
import { Sale } from '../entities/sale.entity.js';
import { Stock } from '../entities/stock.entity.js';
import { Warehouse } from '../entities/warehouse.entity.js';
import { WarehouseController } from './warehouse.controller.js';
import { WarehouseService } from './warehouse.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Warehouse, Stock, Sale, Purchase])],
  controllers: [WarehouseController],
  providers: [WarehouseService],
  exports: [WarehouseService],
})
export class WarehouseModule {}
