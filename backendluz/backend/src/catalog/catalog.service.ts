import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class CatalogService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;
  private readonly aiAgentUrl: string;
  private readonly internalToken: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${config.getOrThrow('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.getOrThrow('R2_ACCESS_KEY_ID'),
        secretAccessKey: config.getOrThrow('R2_SECRET_ACCESS_KEY'),
      },
    });
    this.bucket = config.getOrThrow('R2_BUCKET_NAME');
    this.publicUrl = config.getOrThrow('R2_PUBLIC_URL');
    this.aiAgentUrl = config.get('AI_AGENT_URL') ?? 'http://ai-agent:8000';
    this.internalToken = config.get('INTERNAL_TOKEN') ?? 'token_interno_seguro';
  }

  async findAll(
    businessId: string,
    opts: { page: number; limit: number; category?: string },
  ) {
    const where = {
      businessId,
      ...(opts.category ? { category: opts.category } : {}),
    };
    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: (opts.page - 1) * opts.limit,
        take: opts.limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          description: true,
          priceBs: true,
          stock: true,
          category: true,
          imageUrl: true,
          available: true,
          createdAt: true,
        },
      }),
      this.prisma.product.count({ where }),
    ]);
    return { products, total, page: opts.page, limit: opts.limit };
  }

  async findOne(id: string, businessId: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Producto no encontrado');
    if (product.businessId !== businessId) throw new ForbiddenException();
    return product;
  }

  async create(businessId: string, dto: CreateProductDto) {
    return this.prisma.product.create({
      data: { ...dto, businessId },
    });
  }

  async update(id: string, businessId: string, dto: UpdateProductDto) {
    await this.findOne(id, businessId);
    return this.prisma.product.update({ where: { id }, data: dto });
  }

  async remove(id: string, businessId: string) {
    const product = await this.findOne(id, businessId);
    if (product.imageUrl) {
      const key = product.imageUrl.replace(`${this.publicUrl}/`, '');
      await this.s3.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    }
    await this.prisma.product.delete({ where: { id } });
    return { deleted: true };
  }

  async uploadImage(id: string, businessId: string, file: Express.Multer.File) {
    await this.findOne(id, businessId);
    const ext = file.originalname.split('.').pop();
    const key = `products/${businessId}/${randomUUID()}.${ext}`;
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );
    const imageUrl = `${this.publicUrl}/${key}`;
    return this.prisma.product.update({ where: { id }, data: { imageUrl } });
  }

  async toggleAvailability(id: string, businessId: string) {
    const product = await this.findOne(id, businessId);
    return this.prisma.product.update({
      where: { id },
      data: { available: !product.available },
    });
  }

  async analyzeImage(file: Express.Multer.File): Promise<{
    image_url: string;
    suggested: { name: string; description: string; category: string };
  }> {
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Solo se aceptan imágenes JPEG, PNG o WebP',
      );
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('La imagen no debe superar 5 MB');
    }

    // Upload to R2 first to get a public URL for the AI agent
    const ext = file.originalname.split('.').pop()?.toLowerCase() ?? 'jpg';
    const key = `products/tmp/${randomUUID()}.${ext}`;
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );
    const imageUrl = `${this.publicUrl}/${key}`;

    // Call AI agent for vision analysis
    const { data } = await axios.post<{
      name: string;
      description: string;
      category: string;
    }>(
      `${this.aiAgentUrl}/ai/analyze-product-image`,
      { image_url: imageUrl },
      { headers: { 'x-internal-token': this.internalToken } },
    );

    return { image_url: imageUrl, suggested: data };
  }
}
