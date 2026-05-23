import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  UseGuards,
  Request,
  Query,
  Body,
  DefaultValuePipe,
  ParseIntPipe,
  ParseBoolPipe,
  Optional,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConversationsService } from './conversations.service';

@ApiTags('conversations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'escalated', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @Request() req,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('escalated') escalated?: string,
    @Query('search') search?: string,
  ) {
    return this.conversationsService.findAll(req.user.businessId, {
      page,
      limit: Math.min(limit, 100),
      escalated: escalated !== undefined ? escalated === 'true' : undefined,
      search,
    });
  }

  @Get('stats')
  async getStats(@Request() req) {
    return this.conversationsService.getStats(req.user.businessId);
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    return this.conversationsService.findOne(id, req.user.businessId);
  }

  @Patch(':id/escalate')
  async escalate(@Request() req, @Param('id') id: string) {
    return this.conversationsService.setEscalated(
      id,
      req.user.businessId,
      true,
    );
  }

  @Patch(':id/deescalate')
  async deescalate(@Request() req, @Param('id') id: string) {
    return this.conversationsService.setEscalated(
      id,
      req.user.businessId,
      false,
    );
  }

  @Delete(':id/messages')
  @HttpCode(204)
  async clearMessages(@Request() req, @Param('id') id: string) {
    await this.conversationsService.clearMessages(id, req.user.businessId);
  }

  @Post(':id/feedback')
  async saveFeedback(
    @Request() req,
    @Param('id') id: string,
    @Body()
    body: {
      resolved: boolean;
      resolution_note?: string;
      was_ai_mistake: boolean;
    },
  ) {
    return this.conversationsService.saveFeedback(id, req.user.businessId, {
      resolved: body.resolved,
      resolutionNote: body.resolution_note,
      wasAiMistake: body.was_ai_mistake,
    });
  }
}
