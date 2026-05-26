import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
  IsPositive,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty({ example: 25.5 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  priceBs: number;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  stock: number;

  @ApiProperty()
  @IsString()
  category: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  imageUrl?: string;
}
