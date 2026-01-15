import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { FilterTransactionDto } from './dto/filter-transaction.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from '../users/models/user.model';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  create(
    @GetUser() user: User,
    @Body() createTransactionDto: CreateTransactionDto,
  ) {
    return this.transactionsService.create(user.id, createTransactionDto);
  }

  @Get()
  findAll(@GetUser() user: User, @Query() filters: FilterTransactionDto) {
    return this.transactionsService.findAll(user.id, filters);
  }

  @Get('summary')
  getSummary(@GetUser() user: User) {
    return this.transactionsService.getSummary(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @GetUser() user: User) {
    return this.transactionsService.findOne(id, user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @GetUser() user: User,
    @Body() updateTransactionDto: UpdateTransactionDto,
  ) {
    return this.transactionsService.update(id, user.id, updateTransactionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @GetUser() user: User) {
    return this.transactionsService.remove(id, user.id);
  }

  @Get(':id/msi-group')
  getMsiGroup(@Param('id') id: string, @GetUser() user: User) {
    return this.transactionsService.getMsiGroup(id, user.id);
  }

  @Post(':id/cancel-msi')
  cancelMsi(@Param('id') id: string, @GetUser() user: User) {
    return this.transactionsService.cancelMsi(id, user.id);
  }

  @Patch(':id/msi-group')
  updateMsiGroup(
    @Param('id') id: string,
    @GetUser() user: User,
    @Body() updates: { description?: string; notes?: string; categoryId?: string },
  ) {
    return this.transactionsService.updateMsiGroup(id, user.id, updates);
  }
}

