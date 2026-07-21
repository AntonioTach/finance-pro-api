import { Module } from '@nestjs/common';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionAutoChargeService } from './subscription-auto-charge.service';
import { DatabaseModule } from '../config/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, SubscriptionAutoChargeService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
