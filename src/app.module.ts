import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ChatModule } from './chat/chat.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { ProductModule } from './product/product.module.js';
import { PurchaseModule } from './purchase/purchase.module.js';
import { SaleModule } from './sale/sale.module.js';
import { StockModule } from './stock/stock.module.js';
import { WarehouseModule } from './warehouse/warehouse.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

function postgresConnection() {
  const url = process.env.DATABASE_URL ?? '';
  const match = url.match(
    /^postgres(?:ql)?:\/\/([^:]+):(.+)@([^:/]+):(\d+)\/([^?]+)/,
  );
  if (match) {
    return {
      type: 'postgres' as const,
      username: decodeURIComponent(match[1]),
      password: decodeURIComponent(match[2]),
      host: match[3],
      port: Number(match[4]),
      database: match[5],
    };
  }
  return { type: 'postgres' as const, url };
}

@Module({
  imports: [
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com,
    // then run `npx @nestjs/observe link` to write your key pair into .env.
    ObserveModule.forRoot({
      appKey: process.env.OBSERVE_APP_KEY ?? 'YOUR_APP_KEY',
      appSecret: process.env.OBSERVE_APP_SECRET ?? 'YOUR_APP_SECRET',
      serviceId: 'support-backend',
    }),
    TypeOrmModule.forRoot({
      ...postgresConnection(),
      autoLoadEntities: true,
      synchronize: true,
    }),
    ChatModule,
    ProductModule,
    WarehouseModule,
    StockModule,
    SaleModule,
    PurchaseModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
