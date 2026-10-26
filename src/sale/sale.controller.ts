import { Body, Controller, Get, Post } from '@nestjs/common';
import { SaleService, type SaleInput } from './sale.service.js';

@Controller('sales')
export class SaleController {
  constructor(private readonly saleService: SaleService) {}

  @Get()
  findAll() {
    return this.saleService.findAll();
  }

  @Post()
  create(@Body() body: SaleInput) {
    return this.saleService.create(body);
  }
}
