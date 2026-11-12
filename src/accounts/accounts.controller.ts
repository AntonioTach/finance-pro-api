import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { BalancesQueryDto } from './dto/balances-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from '../users/models/user.model';

@Controller('accounts')
@UseGuards(JwtAuthGuard)
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  findAll(@GetUser() user: User) {
    return this.accountsService.findAll(user.id);
  }

  @Get('balances')
  getBalances(@GetUser() user: User, @Query() query: BalancesQueryDto) {
    return this.accountsService.getBalances(user.id, query.asOf);
  }

  @Get('transfers')
  findTransfers(@GetUser() user: User, @Query('accountId') accountId?: string) {
    return this.accountsService.findTransfers(user.id, accountId);
  }

  @Post('transfers')
  createTransfer(@GetUser() user: User, @Body() dto: CreateTransferDto) {
    return this.accountsService.createTransfer(user.id, dto);
  }

  @Delete('transfers/:id')
  removeTransfer(@Param('id') id: string, @GetUser() user: User) {
    return this.accountsService.removeTransfer(id, user.id);
  }

  @Post()
  create(@GetUser() user: User, @Body() dto: CreateAccountDto) {
    return this.accountsService.create(user.id, dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @GetUser() user: User) {
    return this.accountsService.findOne(id, user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @GetUser() user: User, @Body() dto: UpdateAccountDto) {
    return this.accountsService.update(id, user.id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @GetUser() user: User) {
    return this.accountsService.remove(id, user.id);
  }
}
