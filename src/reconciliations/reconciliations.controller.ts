import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ReconciliationsService } from './reconciliations.service';
import { CreateReconciliationDto } from './dto/create-reconciliation.dto';
import { PreviewReconciliationQueryDto } from './dto/preview-reconciliation-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from '../users/models/user.model';

@Controller('reconciliations')
@UseGuards(JwtAuthGuard)
export class ReconciliationsController {
  constructor(private readonly reconciliationsService: ReconciliationsService) {}

  @Get('preview')
  preview(@GetUser() user: User, @Query() query: PreviewReconciliationQueryDto) {
    return this.reconciliationsService.preview(user.id, query.date);
  }

  @Get()
  findAll(@GetUser() user: User) {
    return this.reconciliationsService.findAll(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @GetUser() user: User) {
    return this.reconciliationsService.findOne(id, user.id);
  }

  @Post()
  create(@GetUser() user: User, @Body() dto: CreateReconciliationDto) {
    return this.reconciliationsService.create(user.id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @GetUser() user: User) {
    return this.reconciliationsService.remove(id, user.id);
  }
}
