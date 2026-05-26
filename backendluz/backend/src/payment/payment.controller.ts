import { Controller, Post, Body, Headers, HttpCode } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PaymentService } from './payment.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('bcb/webhook')
  @HttpCode(200)
  async bcbWebhook(
    @Body() body: any,
    @Headers('x-bcb-signature') signature: string,
  ) {
    await this.paymentService.handlePaymentWebhook(body, signature);
    return { received: true };
  }
}
