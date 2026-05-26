import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CatalogService } from './catalog.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@ApiTags('catalog')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('products')
  findAll(
    @Request() req,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('category') category?: string,
  ) {
    return this.catalogService.findAll(req.user.businessId, {
      page,
      limit,
      category,
    });
  }

  @Get('products/:id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.catalogService.findOne(id, req.user.businessId);
  }

  @Post('products')
  create(@Request() req, @Body() dto: CreateProductDto) {
    return this.catalogService.create(req.user.businessId, dto);
  }

  @Patch('products/:id')
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.catalogService.update(id, req.user.businessId, dto);
  }

  @Delete('products/:id')
  remove(@Request() req, @Param('id') id: string) {
    return this.catalogService.remove(id, req.user.businessId);
  }

  @Post('products/:id/image')
  @UseInterceptors(
    FileInterceptor('image', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  uploadImage(
    @Request() req,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.catalogService.uploadImage(id, req.user.businessId, file);
  }

  @Patch('products/:id/toggle')
  toggleAvailability(@Request() req, @Param('id') id: string) {
    return this.catalogService.toggleAvailability(id, req.user.businessId);
  }

  @Post('analyze-image')
  @UseInterceptors(
    FileInterceptor('image', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  analyzeImage(@UploadedFile() file: Express.Multer.File) {
    return this.catalogService.analyzeImage(file);
  }
}
