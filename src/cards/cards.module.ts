import { Module } from '@nestjs/common';
import { CardsController } from './cards.controller';
import { CardsService } from './cards.service';
import { CardSummaryService } from './card-summary.service';
import { DatabaseModule } from '../config/database.module';
import { MsiModule } from '../msi/msi.module';
import { AccountsModule } from '../accounts/accounts.module';

@Module({
  imports: [DatabaseModule, MsiModule, AccountsModule],
  controllers: [CardsController],
  providers: [CardsService, CardSummaryService],
  exports: [CardsService, CardSummaryService],
})
export class CardsModule {}
