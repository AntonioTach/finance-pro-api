import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SubscriptionAutoChargeService } from '../subscriptions/subscription-auto-charge.service';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const service = app.get(SubscriptionAutoChargeService);
  await service.handleDailyAutoCharge();
  await app.close();
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
