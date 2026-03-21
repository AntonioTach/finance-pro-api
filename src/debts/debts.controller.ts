import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { DebtsService } from './debts.service';
import { CreateDebtDto } from './dto/create-debt.dto';
import { UpdateDebtDto } from './dto/update-debt.dto';
import { CreateDebtPaymentDto } from './dto/create-debt-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from '../users/models/user.model';

@Controller('debts')
@UseGuards(JwtAuthGuard)
export class DebtsController {
  constructor(private readonly debtsService: DebtsService) {}

  @Post()
  create(@GetUser() user: User, @Body() dto: CreateDebtDto) {
    return this.debtsService.create(user.id, dto);
  }

  @Get()
  findAll(@GetUser() user: User) {
    return this.debtsService.findAll(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @GetUser() user: User) {
    return this.debtsService.findOne(id, user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @GetUser() user: User,
    @Body() dto: UpdateDebtDto,
  ) {
    return this.debtsService.update(id, user.id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @GetUser() user: User) {
    return this.debtsService.remove(id, user.id);
  }

  @Post(':id/payments')
  addPayment(
    @Param('id') id: string,
    @GetUser() user: User,
    @Body() dto: CreateDebtPaymentDto,
  ) {
    return this.debtsService.addPayment(id, user.id, dto);
  }

  @Delete(':id/payments/:paymentId')
  removePayment(
    @Param('id') id: string,
    @Param('paymentId') paymentId: string,
    @GetUser() user: User,
  ) {
    return this.debtsService.removePayment(id, paymentId, user.id);
  }
}
