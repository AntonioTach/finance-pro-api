import { Module } from '@nestjs/common';
import { MsiController } from './msi.controller';
import { MsiService } from './msi.service';

@Module({
  controllers: [MsiController],
  providers: [MsiService],
  exports: [MsiService],
})
export class MsiModule {}
