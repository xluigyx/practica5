import { Module } from '@nestjs/common';
import { InternalController } from './internal.controller';
import { OrderModule } from '../order/order.module';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [OrderModule, PaymentModule],
  controllers: [InternalController],
})
export class InternalModule {}
