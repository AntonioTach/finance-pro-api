import { Module } from '@nestjs/common';
import { ReconciliationsController } from './reconciliations.controller';
import { ReconciliationsService } from './reconciliations.service';
import { DatabaseModule } from '../config/database.module';
import { AccountsModule } from '../accounts/accounts.module';

@Module({
  imports: [DatabaseModule, AccountsModule],
  controllers: [ReconciliationsController],
  providers: [ReconciliationsService],
})
export class ReconciliationsModule {}
