import { Module } from '@nestjs/common';
import { CardsController } from './cards.controller';
import { CardsService } from './cards.service';
import { CardSummaryService } from './card-summary.service';
import { DatabaseModule } from '../config/database.module';
import { MsiModule } from '../msi/msi.module';

@Module({
  imports: [DatabaseModule, MsiModule],
  controllers: [CardsController],
  providers: [CardsService, CardSummaryService],
  exports: [CardsService, CardSummaryService],
})
export class CardsModule {}
