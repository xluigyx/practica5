import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  getDashboard(@Request() req) {
    return this.analyticsService.getDashboardMetrics(req.user.businessId);
  }

  @Get('sales')
  getSales(
    @Request() req,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.analyticsService.getSalesReport(
      req.user.businessId,
      new Date(from),
      new Date(to),
    );
  }
}
