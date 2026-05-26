import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
  ParseFloatPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderStatus } from '@prisma/client';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  findAll(
    @Request() req,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('status') status?: OrderStatus,
  ) {
    return this.orderService.findAll(req.user.businessId, {
      page,
      limit,
      status,
    });
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.orderService.findOne(id, req.user.businessId);
  }

  @Post()
  create(@Request() req, @Body() dto: CreateOrderDto) {
    return this.orderService.create(req.user.businessId, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.orderService.updateStatus(id, req.user.businessId, dto);
  }

  @Patch(':id/location')
  updateLocation(
    @Request() req,
    @Param('id') id: string,
    @Body('lat', ParseFloatPipe) lat: number,
    @Body('lng', ParseFloatPipe) lng: number,
  ) {
    return this.orderService.updateLocation(id, req.user.businessId, lat, lng);
  }
}
