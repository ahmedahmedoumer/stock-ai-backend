import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Purchase } from '../entities/purchase.entity.js';
import { StockModule } from '../stock/stock.module.js';
import { PurchaseController } from './purchase.controller.js';
import { PurchaseService } from './purchase.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Purchase]), StockModule],
  controllers: [PurchaseController],
  providers: [PurchaseService],
  exports: [PurchaseService],
})
export class PurchaseModule {}
