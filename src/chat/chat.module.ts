import { Module } from '@nestjs/common';
import { DashboardModule } from '../dashboard/dashboard.module.js';
import { ProductModule } from '../product/product.module.js';
import { PurchaseModule } from '../purchase/purchase.module.js';
import { SaleModule } from '../sale/sale.module.js';
import { StockModule } from '../stock/stock.module.js';
import { WarehouseModule } from '../warehouse/warehouse.module.js';
import { ChatController } from './chat.controller.js';
import { ChatService } from './chat.service.js';

@Module({
  imports: [
    ProductModule,
    WarehouseModule,
    StockModule,
    SaleModule,
    PurchaseModule,
    DashboardModule,
  ],
  providers: [ChatService],
  controllers: [ChatController],
})
export class ChatModule {}
