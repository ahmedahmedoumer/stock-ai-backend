import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sale } from '../entities/sale.entity.js';
import { StockModule } from '../stock/stock.module.js';
import { SaleController } from './sale.controller.js';
import { SaleService } from './sale.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Sale]), StockModule],
  controllers: [SaleController],
  providers: [SaleService],
  exports: [SaleService],
})
export class SaleModule {}
