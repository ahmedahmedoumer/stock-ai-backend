import { Body, Controller, Get, Post } from '@nestjs/common';
import { PurchaseService, type PurchaseInput } from './purchase.service.js';

@Controller('purchases')
export class PurchaseController {
  constructor(private readonly purchaseService: PurchaseService) {}

  @Get()
  findAll() {
    return this.purchaseService.findAll();
  }

  @Post()
  create(@Body() body: PurchaseInput) {
    return this.purchaseService.create(body);
  }
}
