import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BusinessService } from './business.service';

@ApiTags('business')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('business')
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Get()
  getMyBusiness(@Request() req) {
    return this.businessService.findOne(req.user.businessId);
  }

  @Patch()
  updateBusiness(
    @Request() req,
    @Body() body: { name?: string; configJson?: any },
  ) {
    return this.businessService.update(
      req.user.businessId,
      req.user.businessId,
      body,
    );
  }

  @Get('deliverers')
  getDeliverers(@Request() req) {
    return this.businessService.getDeliverers(req.user.businessId);
  }

  @Post('deliverers')
  addDeliverer(@Request() req, @Body() body: { phone: string; name: string }) {
    return this.businessService.addDeliverer(
      req.user.businessId,
      body.phone,
      body.name,
    );
  }

  @Delete('deliverers/:id')
  removeDeliverer(@Request() req, @Param('id') id: string) {
    return this.businessService.removeDeliverer(req.user.businessId, id);
  }
}
